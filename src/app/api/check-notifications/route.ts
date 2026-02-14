import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://167.234.242.205:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "sua-senha-secreta";
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

export async function POST(req: Request) {
    console.log("📨 API Check-Notifications iniciada...");

    try {
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { userId, bills } = await req.json();

        if (!userId || !bills || bills.length === 0) {
            console.log("❌ Dados inválidos recebidos.");
            return NextResponse.json({ error: "Dados inválidos" });
        }

        // 1. Busca configurações do usuário
        const { data: settings } = await supabase
            .from('user_settings')
            .select('*')
            .eq('user_id', userId)
            .single();

        // LOGS PARA DEBUG (Veja isso no terminal do VSCode/Vercel)
        console.log(`👤 Config do usuário ${userId}:`, settings);

        // VALIDAÇÕES
        if (!settings) return NextResponse.json({ error: "Configuração não encontrada" });
        
        // Se estiver false, ele pula. (Verifique se no banco está TRUE)
        if (!settings.notify_whatsapp) {
            console.log("🚫 Usuário desativou notificações.");
            return NextResponse.json({ status: "skipped", reason: "User disabled notifications" });
        }
        
        if (!settings.whatsapp_phone) {
            console.log("🚫 Usuário sem telefone cadastrado.");
            return NextResponse.json({ status: "skipped", reason: "No phone number linked" });
        }

        // 2. Verifica se já mandou hoje (COM FUSO HORÁRIO BRASIL) 🇧🇷
        if (settings.last_whatsapp_notification) {
            // Converte ambas as datas para o horário de Brasília antes de comparar strings
            const lastDate = new Date(settings.last_whatsapp_notification).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            const todayDate = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

            if (lastDate === todayDate) {
                console.log(`📅 Já enviado hoje (${todayDate}). Pulando.`);
                return NextResponse.json({ status: "skipped", reason: "Already sent today" });
            }
        }

        // 3. Monta a mensagem
        const totalValue = bills.reduce((acc: number, item: any) => acc + (item.amount || item.value || item.value_per_month || 0), 0);
        const totalFmt = totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        
        // Formata a lista de contas (opcional, fica bonito)
        const billsList = bills.map((b: any) => `• ${b.title}`).join('\n');

        const message = `🔔 *Lembrete do Meu Aliado* 🔔\n\nOlá! Passando para avisar que você tem *${bills.length} contas* vencendo hoje, totalizando *${totalFmt}*.\n\n${billsList}\n\nEvite juros e pague em dia! 🚀`;

        // 4. Envia via Evolution API
        const cleanPhone = settings.whatsapp_phone.replace(/\D/g, ''); // Remove caracteres não numéricos
        const finalJid = cleanPhone.includes('@') ? cleanPhone : `${cleanPhone}@s.whatsapp.net`;
        
        console.log(`🚀 Enviando para Evolution: ${finalJid}`);

        const evoResponse = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: finalJid, text: message })
        });

        const evoData = await evoResponse.json();
        console.log("📡 Resposta Evolution:", evoData);

        if (!evoResponse.ok) {
            throw new Error(`Erro Evolution: ${JSON.stringify(evoData)}`);
        }

        // 5. Atualiza a data do último envio no banco
        await supabase.from('user_settings').update({ last_whatsapp_notification: new Date() }).eq('user_id', userId);

        return NextResponse.json({ success: true, debug: evoData });

    } catch (error: any) {
        console.error("❌ Erro Crítico Notification:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}