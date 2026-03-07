import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Precisamos usar a SERVICE_ROLE_KEY para o servidor conseguir ler os dados de TODOS os usuários ignorando o RLS (Security)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // <-- IMPORTANTE: Tem que ser a chave secreta (Service Role)
);

export async function GET(request: Request) {
    // 🔒 TRAVA DE SEGURANÇA DA VERCEL (Garante que só a Vercel pode rodar isso, e não um hacker)
    const authHeader = request.headers.get('authorization');
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    try {
        console.log("🤖 [CRON] Iniciando varredura diária de contas...");

        // 1. Busca todos os usuários que querem receber WhatsApp
        const { data: usersSettings } = await supabase
            .from('user_settings')
            .select('user_id')
            .eq('notify_whatsapp', true);

        if (!usersSettings || usersSettings.length === 0) {
            return NextResponse.json({ message: 'Nenhum usuário com WhatsApp ativo.' });
        }

        const today = new Date();
        const dayNum = today.getDate();
        const dayStr = dayNum.toString().padStart(2, '0');
        const currentYear = today.getFullYear();
        const monthMap: Record<number, string> = { 0: 'Jan', 1: 'Fev', 2: 'Mar', 3: 'Abr', 4: 'Mai', 5: 'Jun', 6: 'Jul', 7: 'Ago', 8: 'Set', 9: 'Out', 10: 'Nov', 11: 'Dez' };
        const currentMonthName = monthMap[today.getMonth()];
        const currentTag = `${currentMonthName}/${currentYear}`;

        let disparos = 0;

        // 2. Roda a verificação para cada usuário
        for (const setting of usersSettings) {
            const userId = setting.user_id;

            // Busca os dados APENAS deste usuário
            const [transRes, recRes, instRes] = await Promise.all([
                supabase.from('transactions').select('*').eq('user_id', userId).eq('type', 'expense').eq('is_paid', false),
                supabase.from('recurring').select('*').eq('user_id', userId).eq('type', 'expense').eq('due_day', dayNum),
                supabase.from('installments').select('*').eq('user_id', userId).eq('due_day', dayNum)
            ]);

            const transactions = transRes.data || [];
            const recurring = recRes.data || [];
            const installments = instRes.data || [];

            // A MESMA LÓGICA DO SEU PAGE.TSX
            const billsDueToday = [
                ...transactions.filter(t => t.status !== 'delayed' && t.status !== 'standby' && t.date?.startsWith(`${dayStr}/`) && t.date?.endsWith(`/${currentYear}`)),
                ...recurring.filter(r => r.status !== 'delayed' && r.status !== 'standby' && !r.paid_months?.includes(currentTag) && !r.paid_months?.includes(currentMonthName) && !r.standby_months?.includes(currentTag) && !r.skipped_months?.includes(currentMonthName)),
                ...installments.filter(i => i.status !== 'delayed' && i.status !== 'standby' && !i.paid_months?.includes(currentTag) && !i.standby_months?.includes(currentTag))
            ];

            // 3. Se tiver conta, chama a sua API existente do WhatsApp
            if (billsDueToday.length > 0) {
                console.log(`Disparando WhatsApp para usuário ${userId} (${billsDueToday.length} contas)`);
                
                // Reaproveita a sua rota de envio de WhatsApp que já existe!
                // ATENÇÃO: Como estamos no backend, precisamos chamar a URL completa. 
                // Coloque a URL do seu site em produção no .env (ex: NEXT_PUBLIC_SITE_URL=https://meualiado.com)
                const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://usealiado.com.br/';
                
                await fetch(`${baseUrl}/api/check-notifications`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: userId,
                        bills: billsDueToday,
                        forceSend: true // Ignora travas de repetição
                    })
                });
                disparos++;
            }
        }

        return NextResponse.json({ success: true, message: `Varredura concluída. ${disparos} mensagens enviadas.` });

    } catch (error: any) {
        console.error("❌ Erro no Cron Job:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}