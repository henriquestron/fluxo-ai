import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://167.234.242.205:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "sua-senha-secreta";
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

// --- MAPA DE TRADUÇÃO (LID -> NÚMERO REAL) ---
// Adicione aqui os casos de teste que derem erro
const ID_MAP: Record<string, string> = {
    "129966213746865": "556293882931", // <--- TIREI O 9 DAQUI (Ficou 55 + 62 + 9388...)
    "76850453819597": "556293882931"
};

async function sendWhatsAppMessage(phone: string, text: string) {
    // Garante que vai mandar para o sufixo certo (@s.whatsapp.net)
    // NUNCA manda para @lid
    const finalJid = `${phone}@s.whatsapp.net`;
    
    console.log(`📤 Enviando para REAL: ${finalJid}`);
    
    try {
        const response = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: finalJid, text, delay: 1000 })
        });
        const data = await response.json();
        console.log("📡 Status Envio:", JSON.stringify(data));
    } catch (e) {
        console.error("❌ Erro Envio:", e);
    }
}

export async function POST(req: Request) {
    try {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "Chaves faltando" }, { status: 500 });
        }

        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const body = await req.json();

        const remoteJid = body.data?.key?.remoteJid;
        if (!remoteJid || body.data?.key?.fromMe) return NextResponse.json({ status: 'Ignored' });

        // 1. LIMPEZA E TRADUÇÃO DO ID
        let senderPhone = remoteJid.split('@')[0];
        
        // Se o ID estiver no nosso mapa de tradução, usa o número real
        if (ID_MAP[senderPhone]) {
            console.log(`🔄 Traduzindo LID ${senderPhone} para ${ID_MAP[senderPhone]}`);
            senderPhone = ID_MAP[senderPhone];
        }

        console.log(`📩 Processando como: ${senderPhone}`);

        // 2. BUSCA NO BANCO (Pelo número REAL)
        const { data: userSettings } = await supabase
            .from('user_settings')
            .select('user_id, whatsapp_phone')
            .eq('whatsapp_phone', senderPhone) // Busca exata agora
            .maybeSingle();

        if (!userSettings) {
            // Tenta avisar no número traduzido
            await sendWhatsAppMessage(senderPhone, `⚠️ Bot: Número ${senderPhone} não cadastrado no painel.`);
            return NextResponse.json({ error: "User not found" });
        }

        // 3. BUSCA WORKSPACE
        const { data: workspace } = await supabase
            .from('workspaces')
            .select('id')
            .eq('user_id', userSettings.user_id)
            .limit(1)
            .single();

        // 4. IA GEMINI
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

        // 5. EXECUÇÃO
        if (jsonMatch) {
            let commands = JSON.parse(jsonMatch[0]);
            if (!Array.isArray(commands)) commands = [commands];
            const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

            for (const cmd of commands) {
                if (cmd.reply) {
                    await sendWhatsAppMessage(senderPhone, cmd.reply);
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
                    await sendWhatsAppMessage(senderPhone, `✅ Lançado: ${cmd.data.title} (${valor})`);
                }
            }
        } else {
            await sendWhatsAppMessage(senderPhone, result.response.text());
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("ERRO:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}