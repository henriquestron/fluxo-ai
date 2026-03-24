import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Variáveis da Evolution (Mesmo padrão de segurança)
const EVOLUTION_URL = process.env.EVOLUTION_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

// 🟢 SERVICE ROLE: O Cron precisa de poder total para ler todos os usuários
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
    // 🔒 TRAVA DA VERCEL (Obrigatória: Falha Segura)
    const CRON_SECRET = process.env.CRON_SECRET;

    if (!CRON_SECRET) {
        throw new Error('🔥 ALERTA DE SEGURANÇA: CRON_SECRET não definido no .env');
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${CRON_SECRET}`) {
        console.warn('⚠️ Tentativa de acesso não autorizado ao Cron.');
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
        console.log("🤖 [CRON] Iniciando varredura diária de contas em lotes...");

        if (!EVOLUTION_URL || !EVOLUTION_API_KEY) {
            console.error("🔥 Chaves da Evolution ausentes no Cron.");
            return NextResponse.json({ error: 'Configuração do servidor incompleta.' }, { status: 500 });
        }

        // 1. Busca os usuários que querem WhatsApp (Agora puxando também telefone e data)
        const { data: usersSettings } = await supabase
            .from('user_settings')
            .select('user_id, whatsapp_phone, last_whatsapp_notification')
            .eq('notify_whatsapp', true)
            .not('whatsapp_phone', 'is', null);

        if (!usersSettings || usersSettings.length === 0) {
            return NextResponse.json({ message: 'Nenhum usuário com WhatsApp ativo.' });
        }

        // Configuração de datas centralizada
        const hojeLocal = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
        const dayNum = hojeLocal.getDate();
        const dayStr = String(dayNum).padStart(2, '0');
        const currentYear = hojeLocal.getFullYear();
        const monthMap: Record<number, string> = { 0: 'Jan', 1: 'Fev', 2: 'Mar', 3: 'Abr', 4: 'Mai', 5: 'Jun', 6: 'Jul', 7: 'Ago', 8: 'Set', 9: 'Out', 10: 'Nov', 11: 'Dez' };
        const currentMonthName = monthMap[hojeLocal.getMonth()];
        const currentTag = `${currentMonthName}/${currentYear}`;
        const todayStr = hojeLocal.toLocaleDateString('pt-BR');

        let disparos = 0;

        // 🟢 FUNÇÃO ISOLADA: Processa um único usuário por vez
        const processUser = async (setting: any) => {
            const userId = setting.user_id;

            // 🔒 Trava de Data Local: Ignora se já mandou hoje
            const lastSent = setting.last_whatsapp_notification;
            const lastStr = lastSent ? new Date(lastSent).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }) : null;
            if (lastStr === todayStr) return; // Pula este usuário

            // 🟢 OTIMIZAÇÃO: Select restrito (Apenas as colunas que importam)
            const [transRes, recRes, instRes] = await Promise.all([
                supabase.from('transactions').select('title, amount, date, status, is_paid').eq('user_id', userId).eq('type', 'expense').eq('is_paid', false),
                supabase.from('recurring').select('title, value, due_day, status, paid_months, standby_months, skipped_months').eq('user_id', userId).eq('type', 'expense').eq('due_day', dayNum),
                supabase.from('installments').select('title, value_per_month, due_day, status, paid_months, standby_months').eq('user_id', userId).eq('due_day', dayNum)
            ]);

            const transactions = transRes.data || [];
            const recurring = recRes.data || [];
            const installments = instRes.data || [];

            const billsDueToday = [
                ...transactions.filter(t => t.status !== 'delayed' && t.status !== 'standby' && t.date?.startsWith(`${dayStr}/`) && t.date?.endsWith(`/${currentYear}`)),
                ...recurring.filter(r => r.status !== 'delayed' && r.status !== 'standby' && !r.paid_months?.includes(currentTag) && !r.paid_months?.includes(currentMonthName) && !r.standby_months?.includes(currentTag) && !r.skipped_months?.includes(currentMonthName)),
                ...installments.filter(i => i.status !== 'delayed' && i.status !== 'standby' && !i.paid_months?.includes(currentTag) && !i.standby_months?.includes(currentTag))
            ];

            if (billsDueToday.length > 0) {
                // Monta a mensagem
                const totalValue = billsDueToday.reduce((acc: number, item: any) => acc + Number(item.amount || item.value || item.value_per_month || 0), 0);
                const totalFmt = totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                const billsList = billsDueToday.map((b: any) => `• *${b.title}*`).join('\n');
                const message = `🔔 *Lembrete: Contas de Hoje* 🔔\n\nOlá! Você tem *${billsDueToday.length} contas* pendentes para hoje, totalizando *${totalFmt}*.\n\n${billsList}\n\nAcesse o sistema para marcar como pago! 🚀`;

                // Disparo Direto Evolution API (O Cron faz isso agora)
                const cleanPhone = setting.whatsapp_phone.replace(/\D/g, '');
                const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
                const finalJid = `${finalPhone}@s.whatsapp.net`;

                const evoResponse = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
                    method: 'POST',
                    headers: { 'apikey': EVOLUTION_API_KEY as string, 'Content-Type': 'application/json' },
                    body: JSON.stringify({ number: finalJid, options: { delay: 1200, presence: "composing" }, textMessage: { text: message } })
                });

                if (evoResponse.ok) {
                    await supabase.from('user_settings').update({ last_whatsapp_notification: new Date() }).eq('user_id', userId);
                    disparos++;
                }
            }
        };

        // 🟢 OTIMIZAÇÃO CRÍTICA: Processamento em Lotes (Batches)
        // Em vez de ir 1 por 1, ele manda 10 ao mesmo tempo. Não dá gargalo na Vercel!
        const BATCH_SIZE = 10;
        for (let i = 0; i < usersSettings.length; i += BATCH_SIZE) {
            const batch = usersSettings.slice(i, i + BATCH_SIZE);
            // Executa os 10 simultaneamente e espera terminarem antes de ir para os próximos 10
            await Promise.all(batch.map(setting => processUser(setting)));
        }

        return NextResponse.json({ success: true, message: `Varredura concluída. ${disparos} mensagens enviadas.` });

    } catch (error: any) {
        // 🔴 ERRO SILENCIOSO (Fim do vazamento da mensagem de erro)
        console.error("❌ Erro no Cron Job:", error.message || error);
        return NextResponse.json({ error: 'Erro interno no processamento do Cron.' }, { status: 500 });
    }
}