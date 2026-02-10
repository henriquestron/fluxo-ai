import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Configurações (apenas constantes de texto, sem iniciar conexões ainda)
const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://167.234.242.205:8080"; 
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "sua-senha-secreta-muda-isso-aqui";
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

// Função auxiliar para baixar imagem
async function fetchMediaFromEvolution(messageObject: any) {
    try {
        const response = await fetch(`${EVOLUTION_URL}/chat/getBase64FromMediaMessage/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: {
                'apikey': EVOLUTION_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: messageObject,
                convertToMp4: false
            })
        });

        const data = await response.json();
        return data.base64;
    } catch (error) {
        console.error("Erro ao baixar mídia:", error);
        return null;
    }
}

// Função para responder no WhatsApp
async function sendWhatsAppMessage(jid: string, text: string) {
    await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
        method: 'POST',
        headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: jid, text })
    });
}

export async function POST(req: Request) {
    try {
        // --- MUDANÇA AQUI: Inicia as conexões DENTRO da função ---
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.GEMINI_API_KEY) {
            console.error("Variáveis de ambiente faltando!");
            return NextResponse.json({ error: "Configuração de servidor incompleta" }, { status: 500 });
        }

        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // ---------------------------------------------------------

        const body = await req.json();

        // 0. IGNORAR MENSAGENS DO PRÓPRIO ROBÔ
        if (body.data?.key?.fromMe) {
            return NextResponse.json({ status: 'Ignored (From Me)' });
        }

        // 1. MAPEAMENTO DE DADOS
        const remoteJid = body.data?.key?.remoteJid; 
        const senderPhone = remoteJid?.split('@')[0];
        const message = body.data?.message;

        if (!message) return NextResponse.json({ status: 'No message content' });

        const isImage = !!message?.imageMessage;
        const textContent = message?.conversation || message?.extendedTextMessage?.text || message?.imageMessage?.caption || "";

        // 2. BUSCAR USUÁRIO NO SUPABASE
        const { data: userSettings } = await supabase
            .from('user_settings')
            .select('user_id')
            .eq('whatsapp_phone', senderPhone)
            .single();

        if (!userSettings) {
            // Opcional: Avisar que não tem cadastro
            // await sendWhatsAppMessage(remoteJid, "Olá! Seu número não está cadastrado no sistema.");
            return NextResponse.json({ error: "Telefone não vinculado" });
        }

        // 3. PREPARAR GEMINI
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        let mediaData: any[] = [];
        let prompt = `Analise a entrada. Texto do usuário: "${textContent}".`;

        if (isImage) {
            const base64Data = await fetchMediaFromEvolution(message);
            if (base64Data) {
                mediaData = [{ inlineData: { data: base64Data, mimeType: "image/jpeg" } }];
                prompt += " Analise este comprovante fiscal/recibo.";
            }
        }

        const systemPrompt = `
        Você é uma IA Financeira.
        Responda ESTRITAMENTE este JSON (sem markdown):
        [
            {
                "action": "add",
                "table": "transactions",
                "data": {
                    "description": "Descrição curta",
                    "amount": 0.00,
                    "type": "expense",
                    "date": "YYYY-MM-DD",
                    "category": "Outros" 
                }
            }
        ]
        `;

        const result = await model.generateContent([systemPrompt, prompt, ...mediaData]);
        const responseText = result.response.text();

        // 4. PROCESSAR JSON E SALVAR
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '');
        const jsonMatch = cleanJson.match(/\[[\s\S]*\]/);

        if (jsonMatch) {
            const commands = JSON.parse(jsonMatch[0]);
            for (const cmd of commands) {
                if (cmd.action === 'add') {
                    await supabase.from(cmd.table).insert([{ 
                        ...cmd.data, 
                        user_id: userSettings.user_id,
                        created_at: new Date()
                    }]);
                    
                    const valorFormatado = cmd.data.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    await sendWhatsAppMessage(remoteJid, `✅ *Lançado!* \n📝 ${cmd.data.description}\n💰 ${valorFormatado}`);
                }
            }
        }

        return NextResponse.json({ success: true });

    } catch (e) {
        console.error("Erro Webhook:", e);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}