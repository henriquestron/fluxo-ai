import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://167.234.242.205:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "sua-senha-secreta";
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

export async function POST(req: Request) {
    try {
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { userId, bills } = await req.json();

        // 1. Busca configurações do usuário
        const { data: settings } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', userId)
            .single();

        // VALIDAÇÕES
        if (!settings) return NextResponse.json({ error: "Configuração não encontrada" });
        if (!settings.notify_whatsapp) return NextResponse.json({ status: "skipped", reason: "User disabled notifications" });
        if (!settings.whatsapp_phone) return NextResponse.json({ status: "skipped", reason: "No phone number linked" });

        // 2. Verifica se já mandou hoje (Evita SPAM)
        if (settings.last_whatsapp_notification) {
            const lastDate = new Date(settings.last_whatsapp_notification).toDateString();
            const todayDate = new Date().toDateString();
            if (lastDate === todayDate) {
                return NextResponse.json({ status: "skipped", reason: "Already sent today" });
            }
        }

        // 3. Monta a mensagem
        const totalValue = bills.reduce((acc: number, item: any) => acc + (item.amount || item.value || item.value_per_month || 0), 0);
        const totalFmt = totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        const message = `🔔 *Lembrete do Meu Aliado* 🔔\n\nOlá! Passando para avisar que você tem *${bills.length} contas* vencendo hoje, totalizando *${totalFmt}*.\n\nEvite juros e pague em dia! 🚀\n\n_Acesse seu painel para ver os detalhes._`;

        // 4. Envia via Evolution API
        const finalJid = settings.whatsapp_phone.includes('@') ? settings.whatsapp_phone : `${settings.whatsapp_phone}@s.whatsapp.net`;
        
        await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: finalJid, text: message })
        });

        // 5. Atualiza a data do último envio no banco
        await supabase.from('user_settings').update({ last_whatsapp_notification: new Date() }).eq('user_id', userId);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Erro Notification:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}