import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 🟢 1. TRAVA DE CACHE (Força a Vercel a executar o código toda vez)
export const dynamic = 'force-dynamic';

const EVOLUTION_URL = process.env.EVOLUTION_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
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

        // 🟢 MUDANÇA 1: Adicionamos o partner_phone no select
        const { data: usersSettings } = await supabase
            .from('user_settings')
            .select('user_id, whatsapp_phone, partner_phone, last_whatsapp_notification')
            .eq('notify_whatsapp', true)
            .not('whatsapp_phone', 'is', null);

        if (!usersSettings || usersSettings.length === 0) {
            return NextResponse.json({ message: 'Nenhum usuário com WhatsApp ativo.' });
        }

        // 🟢 2. TRATAMENTO DE DATAS À PROVA DE VERCEL (UTC)
        const dateOpts: any = { timeZone: "America/Sao_Paulo" };
        const hoje = new Date();
        const todayStr = hoje.toLocaleDateString('pt-BR', dateOpts); // Sai certinho: "01/04/2026"
        
        // Fatiando a string segura para não ter erro de fuso
        const [dayStr, mStr, yearStr] = todayStr.split('/');
        const dayNum = parseInt(dayStr, 10);
        const currentYear = parseInt(yearStr, 10);
        
        const monthMap: Record<number, string> = { 1: 'Jan', 2: 'Fev', 3: 'Mar', 4: 'Abr', 5: 'Mai', 6: 'Jun', 7: 'Jul', 8: 'Ago', 9: 'Set', 10: 'Out', 11: 'Nov', 12: 'Dez' };
        const currentMonthName = monthMap[parseInt(mStr, 10)];
        const currentTag = `${currentMonthName}/${currentYear}`;

        let disparos = 0;

        const processUser = async (setting: any) => {
            // 🟢 3. PROTEÇÃO INDIVIDUAL (Se esse usuário der erro, os outros continuam)
            try {
                const userId = setting.user_id;

                // Checagem de segurança pra não spammar o usuário no mesmo dia
                const lastSent = setting.last_whatsapp_notification;
                const lastStr = lastSent ? new Date(lastSent).toLocaleDateString('pt-BR', dateOpts) : null;
                if (lastStr === todayStr) return; // Já mandou hoje, pula.

                const [transRes, recRes, instRes] = await Promise.all([
                    supabase.from('transactions').select('title, amount, date, status, is_paid').eq('user_id', userId).eq('type', 'expense').eq('is_paid', false),
                    supabase.from('recurring').select('title, value, due_day, status, paid_months, standby_months, skipped_months').eq('user_id', userId).eq('type', 'expense').eq('due_day', dayNum),
                    supabase.from('installments').select('title, value_per_month, due_day, status, paid_months, standby_months').eq('user_id', userId).eq('due_day', dayNum)
                ]);

                const transactions = transRes.data || [];
                const recurring = recRes.data || [];
                const installments = instRes.data || [];

                // 🟢 4. FILTRO DE DATA CONSERTADO (Buscando o dia E o mês certos)
                const exactDateFilter = `${dayStr}/${mStr}/${currentYear}`;

                const billsDueToday = [
                    ...transactions.filter(t => t.status !== 'delayed' && t.status !== 'standby' && t.date === exactDateFilter),
                    ...recurring.filter(r => r.status !== 'delayed' && r.status !== 'standby' && !r.paid_months?.includes(currentTag) && !r.paid_months?.includes(currentMonthName) && !r.standby_months?.includes(currentTag) && !r.skipped_months?.includes(currentMonthName)),
                    ...installments.filter(i => i.status !== 'delayed' && i.status !== 'standby' && !i.paid_months?.includes(currentTag) && !i.standby_months?.includes(currentTag))
                ];

                if (billsDueToday.length > 0) {
                    const totalValue = billsDueToday.reduce((acc: number, item: any) => acc + Number(item.amount || item.value || item.value_per_month || 0), 0);
                    const totalFmt = totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    const billsList = billsDueToday.map((b: any) => `• *${b.title}*`).join('\n');
                    
                    const message = `🔔 *Lembrete: Contas de Hoje* 🔔\n\nOlá! Você tem *${billsDueToday.length} contas* pendentes para hoje, totalizando *${totalFmt}*.\n\n${billsList}\n\nAcesse o sistema para marcar como pago! 🚀`;

                    // 🟢 MUDANÇA 2: Monta um array com os telefones disponíveis e dispara pra todos
                    const phonesToNotify = [setting.whatsapp_phone, setting.partner_phone].filter(Boolean); // O .filter(Boolean) remove valores nulos/vazios
                    let successForUser = false;

                    for (const phone of phonesToNotify) {
                        const cleanPhone = phone.replace(/\D/g, '');
                        const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
                        const finalJid = `${finalPhone}@s.whatsapp.net`;

                        const evoResponse = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
                            method: 'POST',
                            headers: { 'apikey': EVOLUTION_API_KEY as string, 'Content-Type': 'application/json' },
                            body: JSON.stringify({ number: finalJid, options: { delay: 1200, presence: "composing" }, textMessage: { text: message } })
                        });

                        if (evoResponse.ok) {
                            successForUser = true;
                            disparos++;
                        }
                    }

                    // Se enviou para pelo menos um, atualiza a data de notificação
                    if (successForUser) {
                        await supabase.from('user_settings').update({ last_whatsapp_notification: new Date().toISOString() }).eq('user_id', userId);
                    }
                }
            } catch (err: any) {
                console.error(`⚠️ Erro ao processar usuário ${setting.user_id}:`, err.message || err);
            }
        };

        const BATCH_SIZE = 10;
        for (let i = 0; i < usersSettings.length; i += BATCH_SIZE) {
            const batch = usersSettings.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(setting => processUser(setting)));
        }

        return NextResponse.json({ success: true, message: `Varredura concluída. ${disparos} mensagens enviadas.` });

    } catch (error: any) {
        console.error("❌ Erro no Cron Job:", error.message || error);
        return NextResponse.json({ error: 'Erro interno no processamento do Cron.' }, { status: 500 });
    }
}