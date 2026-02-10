import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://167.234.242.205:8080"; 
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "sua-senha-secreta-muda-isso-aqui";
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

async function fetchMediaFromEvolution(messageObject: any) {
    try {
        const response = await fetch(`${EVOLUTION_URL}/chat/getBase64FromMediaMessage/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: messageObject, convertToMp4: false })
        });
        const data = await response.json();
        return data.base64;
    } catch (error) { return null; }
}

async function sendWhatsAppMessage(jid: string, text: string) {
    await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
        method: 'POST',
        headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: jid, text })
    });
}

export async function POST(req: Request) {
    try {
        // INICIA CONEXÕES DENTRO DA FUNÇÃO (Lazy Loading para evitar erro de Build)
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "Configuração incompleta" }, { status: 500 });
        }
        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

        const body = await req.json();

        // 0. IGNORAR MENSAGENS DO PRÓPRIO ROBÔ
        if (body.data?.key?.fromMe) return NextResponse.json({ status: 'Ignored' });

        // 1. IDENTIFICAR O REMETENTE
        const remoteJid = body.data?.key?.remoteJid; 
        const senderPhone = remoteJid?.split('@')[0]; // Ex: 5562999999999
        const message = body.data?.message;

        if (!message || !senderPhone) return NextResponse.json({ status: 'No content' });

        console.log(`📩 Recebido de: ${senderPhone}`);

        // 2. BUSCAR USUÁRIO NO SUPABASE (Tenta match exato primeiro)
        let { data: userSettings } = await supabase
            .from('user_settings')
            .select('user_id')
            .eq('whatsapp_phone', senderPhone)
            .maybeSingle();

        // Se não achar, tenta sem o '9' extra (caso o Evolution mande diferente)
        /* Lógica opcional de fallback se necessário futuramente */

        if (!userSettings) {
            console.log("❌ Usuário não encontrado para o telefone:", senderPhone);
            // DICA: Comente a linha abaixo se não quiser que ele responda desconhecidos
            // await sendWhatsAppMessage(remoteJid, "Seu número não está cadastrado no sistema.");
            return NextResponse.json({ error: "Telefone não vinculado" });
        }

        // 3. --- NOVO: BUSCAR O WORKSPACE (CONTEXTO) PADRÃO DO USUÁRIO ---
        // Isso resolve o problema de "não aparecer nada no painel"
        const { data: workspace } = await supabase
            .from('workspaces')
            .select('id')
            .eq('user_id', userSettings.user_id)
            .order('created_at', { ascending: true }) // Pega o primeiro criado (Geralmente "Pessoal")
            .limit(1)
            .single();

        const contextId = workspace?.id || null;
        // ------------------------------------------------------------------

        // 4. PREPARAR GEMINI
        const isImage = !!message?.imageMessage;
        const textContent = message?.conversation || message?.extendedTextMessage?.text || message?.imageMessage?.caption || "";
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        
        let mediaData: any[] = [];
        let prompt = `Analise a entrada. Texto do usuário: "${textContent}".`;

        if (isImage) {
            const base64Data = await fetchMediaFromEvolution(message);
            if (base64Data) {
                mediaData = [{ inlineData: { data: base64Data, mimeType: "image/jpeg" } }];
                prompt += " Analise este comprovante.";
            }
        }

        // 5. PROMPT DO SISTEMA
        const systemPrompt = `
        Você é uma IA Financeira. Converta a entrada em JSON para banco de dados.
        Hoje é: ${new Date().toISOString().split('T')[0]}.
        
        Regras:
        - Se for gasto -> type: "expense"
        - Se for ganho -> type: "income"
        - Data formato YYYY-MM-DD.
        - Se não tiver data, use a de hoje.
        
        Retorne APENAS JSON:
        [
            {
                "action": "add",
                "table": "transactions",
                "data": {
                    "description": "Ex: Almoço",
                    "amount": 0.00,
                    "type": "expense",
                    "date": "YYYY-MM-DD",
                    "category": "Alimentação" 
                }
            }
        ]
        `;

        const result = await model.generateContent([systemPrompt, prompt, ...mediaData]);
        const responseText = result.response.text();
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '');
        const jsonMatch = cleanJson.match(/\[[\s\S]*\]/);

        if (jsonMatch) {
            const commands = JSON.parse(jsonMatch[0]);
            for (const cmd of commands) {
                if (cmd.action === 'add') {
                    // INSERE COM O CONTEXTO AGORA
                    await supabase.from(cmd.table).insert([{ 
                        ...cmd.data, 
                        user_id: userSettings.user_id,
                        context: contextId, // <--- O PULO DO GATO AQUI
                        created_at: new Date()
                    }]);
                    
                    const valor = cmd.data.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    await sendWhatsAppMessage(remoteJid, `✅ Lançado: ${cmd.data.description} (${valor})`);
                }
            }
        }

        return NextResponse.json({ success: true });

    } catch (e) {
        console.error("Erro Fatal:", e);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}