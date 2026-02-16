import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://167.234.242.205:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "sua-senha-secreta";
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

export async function POST(req: Request) {
    console.log("📨 API Check-Notifications iniciada...");

    try {
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { userId, bills, forceSend } = await req.json(); // Adicionado forceSend para testes

        if (!userId || !bills || bills.length === 0) {
            return NextResponse.json({ error: "Dados inválidos ou lista vazia" });
        }

        const { data: settings } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', userId)
            .single();

        if (!settings) return NextResponse.json({ error: "Configuração não encontrada" });
        if (!settings.notify_whatsapp) return NextResponse.json({ status: "skipped", reason: "User disabled notifications" });
        if (!settings.whatsapp_phone) return NextResponse.json({ status: "skipped", reason: "No phone number" });

        // 2. Trava de Data (Só pula se NÃO for um envio forçado)
        if (settings.last_whatsapp_notification && !forceSend) {
            const lastDate = new Date(settings.last_whatsapp_notification).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            const todayDate = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

            if (lastDate === todayDate) {
                console.log(`📅 Já enviado hoje (${todayDate}).`);
                return NextResponse.json({ status: "skipped", reason: "Already sent today" });
            }
        }

        // 3. Monta a mensagem - Garantindo que trate Strings do banco como Números
        const totalValue = bills.reduce((acc: number, item: any) => {
            const val = item.amount || item.value || item.value_per_month || 0;
            return acc + Number(val);
        }, 0);
        
        const totalFmt = totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const billsList = bills.map((b: any) => `• *${b.title}*`).join('\n');

        const message = `🔔 *Lembrete: Contas de Hoje* 🔔\n\nOlá! Você tem *${bills.length} contas* para pagar hoje, totalizando *${totalFmt}*.\n\n${billsList}\n\nAcesse o sistema para marcar como pago! 🚀`;

        // 4. Envio Evolution
        const cleanPhone = settings.whatsapp_phone.replace(/\D/g, '');
        const finalJid = `${cleanPhone}@s.whatsapp.net`;

        const evoResponse = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: finalJid, text: message })
        });

        if (evoResponse.ok) {
            // 5. Atualiza o banco APENAS se o envio deu certo
            await supabase.from('user_settings').update({ last_whatsapp_notification: new Date() }).eq('user_id', userId);
            return NextResponse.json({ success: true });
        } else {
            const errData = await evoResponse.json();
            throw new Error(errData.message || "Erro na Evolution API");
        }

    } catch (error: any) {
        console.error("❌ Erro:", error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}