import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://167.234.242.205:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "sua-senha-secreta";
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

// Função de Envio (Sempre manda para o Real)
async function sendWhatsAppMessage(phone: string, text: string) {
    // Garante sufixo de número real
    const finalJid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
    
    console.log(`📤 Respondendo para: ${finalJid}`);
    
    try {
        await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: finalJid, text, delay: 1200 })
        });
    } catch (e) {
        console.error("❌ Erro Envio:", e);
    }
}

export async function POST(req: Request) {
    try {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "Configuração incompleta" }, { status: 500 });
        }

        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const body = await req.json();

        // 1. QUEM MANDOU? (Pega o ID cru, seja LID ou Real)
        const remoteJid = body.data?.key?.remoteJid;
        if (!remoteJid || body.data?.key?.fromMe) return NextResponse.json({ status: 'Ignored' });

        const senderId = remoteJid.split('@')[0]; // Ex: 129... ou 5562...
        console.log(`📩 Recebido de: ${senderId}`);

        // 2. BUSCA DINÂMICA (A Mágica Acontece Aqui)
        // Procura alguém que tenha esse número no 'whatsapp_phone' OU no 'whatsapp_id'
        const { data: userSettings } = await supabase
            .from('user_settings')
            .select('user_id, whatsapp_phone, whatsapp_id')
            .or(`whatsapp_phone.eq.${senderId},whatsapp_id.eq.${senderId}`) 
            .maybeSingle();

        if (!userSettings) {
            console.log("❌ Usuário não encontrado.");
            // Tenta avisar (arriscado se for LID, mas tentamos)
            await sendWhatsAppMessage(senderId, `⚠️ Bot: ID ${senderId} não vinculado. Cadastre-o no painel.`);
            return NextResponse.json({ error: "User not found" });
        }

        // Define o alvo da resposta: Sempre prefira o whatsapp_phone (Real) se existir
        // Se não tiver, tenta o ID que mandou
        const targetPhone = userSettings.whatsapp_phone || senderId;

        console.log(`✅ Usuário identificado! Respondendo para: ${targetPhone}`);

        // 3. BUSCA WORKSPACE
        const { data: workspace } = await supabase
            .from('workspaces')
            .select('id')
            .eq('user_id', userSettings.user_id)
            .limit(1)
            .single();

        // 4. IA GEMINI (1.5 Flash)
        const messageContent = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        
        const systemPrompt = `
        Hoje: ${new Date().toISOString().split('T')[0]}. Identifique gastos.
        Retorne JSON: [{"action":"add", "table":"transactions", "data":{ "title": "...", "amount": 0, "type": "expense", "date": "YYYY-MM-DD", "category": "Outros" }}]
        Senão: {"reply": "Olá"}
        `;

        const result = await model.generateContent([systemPrompt, messageContent]);
        const cleanJson = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonMatch = cleanJson.match(/\[[\s\S]*\]/) || cleanJson.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            let commands = JSON.parse(jsonMatch[0]);
            if (!Array.isArray(commands)) commands = [commands];
            const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

            for (const cmd of commands) {
                if (cmd.reply) {
                    await sendWhatsAppMessage(targetPhone, cmd.reply);
                } else if (cmd.action === 'add') {
                    const d = new Date(cmd.data.date);
                    const mesNome = months[d.getUTCMonth()]; 

                    await supabase.from('transactions').insert([{
                        ...cmd.data,
                        user_id: userSettings.user_id,
                        context: workspace?.id,
                        target_month: mesNome,
                        created_at: new Date()
                    }]);
                    
                    const valor = cmd.data.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    await sendWhatsAppMessage(targetPhone, `✅ Lançado: ${cmd.data.title} (${valor})`);
                }
            }
        } else {
            await sendWhatsAppMessage(targetPhone, result.response.text());
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("ERRO:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}