import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://167.234.242.205:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "sua-senha-secreta";
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

// 1. Função de Envio com LOG DETALHADO DA EVOLUTION
async function sendWhatsAppMessage(jid: string, text: string) {
    console.log(`📤 Tentando enviar para: ${jid}`);
    try {
        const response = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                number: jid, 
                text: text,
                delay: 1200 // Pequeno delay para parecer humano e evitar bloqueio
            })
        });
        
        const data = await response.json();
        // AQUI ESTÁ O SEGREDO: Vamos ver o que a Evolution respondeu
        console.log("📡 RESPOSTA DA EVOLUTION:", JSON.stringify(data));
        
    } catch (e) {
        console.error("❌ FALHA NA CONEXÃO COM EVOLUTION:", e);
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
        
        // Pega o JID bruto (exatamente como veio)
        const remoteJid = body.data?.key?.remoteJid;
        if (!remoteJid || body.data?.key?.fromMe) return NextResponse.json({ status: 'Ignored' });

        const messageContent = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text;
        if (!messageContent) return NextResponse.json({ status: 'No Text' });

        console.log(`📩 MENSAGEM RECEBIDA (RAW): ${remoteJid}`);

        // --- 2. TRUQUE DO LID (Gambiarra temporária para funcionar seu teste) ---
        // Se o número for aquele LID gigante, vamos forçar o ID do usuário "Vitor"
        // (Isso é só para o seu teste funcionar AGORA. Depois tiramos)
        
        let userIdToUse = null;
        let userPhoneToUse = null;

        // Tenta achar pelo número exato
        const senderPhone = remoteJid.split('@')[0];
        
        const { data: userSettings } = await supabase
            .from('user_settings')
            .select('user_id, whatsapp_phone')
            .or(`whatsapp_phone.eq.${senderPhone},whatsapp_phone.eq.${remoteJid}`) // Tenta os dois
            .maybeSingle();

        if (userSettings) {
            userIdToUse = userSettings.user_id;
            userPhoneToUse = userSettings.whatsapp_phone;
        } else {
            // Se não achou, responde avisando o ID para cadastro
            await sendWhatsAppMessage(remoteJid, `⚠️ Bot: ID não cadastrado: ${senderPhone}`);
            return NextResponse.json({ error: "User not found" });
        }

        // 3. BUSCA WORKSPACE
        const { data: workspace } = await supabase
            .from('workspaces')
            .select('id')
            .eq('user_id', userIdToUse)
            .limit(1)
            .single();

        if (!workspace) {
            await sendWhatsAppMessage(remoteJid, "⚠️ Erro: Você não tem nenhum Perfil/Workspace criado no site.");
            return NextResponse.json({ error: "No workspace" });
        }

        // 4. GERAÇÃO IA (Modelo Flash 1.5)
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        
        const systemPrompt = `
        Hoje: ${new Date().toISOString().split('T')[0]}.
        Identifique gastos. 
        Retorne APENAS JSON.
        Formato: [{"action":"add", "table":"transactions", "data":{ "title": "...", "amount": 0, "type": "expense", "date": "YYYY-MM-DD", "category": "Outros" }}]
        Se não for gasto, retorne: {"reply": "Olá"}
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
                    await sendWhatsAppMessage(remoteJid, cmd.reply);
                } 
                else if (cmd.action === 'add') {
                    // CÁLCULO DO MÊS (Essencial para aparecer no site)
                    const d = new Date(cmd.data.date);
                    const mesNome = months[d.getUTCMonth()]; 

                    const { error } = await supabase.from('transactions').insert([{
                        ...cmd.data,
                        user_id: userIdToUse,
                        context: workspace.id,
                        target_month: mesNome, // <--- OBRIGATÓRIO
                        created_at: new Date()
                    }]);

                    if (error) {
                        console.error("❌ ERRO AO SALVAR NO BANCO:", error);
                        await sendWhatsAppMessage(remoteJid, `❌ Erro no banco: ${error.message}`);
                    } else {
                        const valor = cmd.data.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                        await sendWhatsAppMessage(remoteJid, `✅ Salvo: ${cmd.data.title} (${valor}) em *${mesNome}*`);
                    }
                }
            }
        } else {
            await sendWhatsAppMessage(remoteJid, result.response.text());
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error("ERRO GERAL:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}