// app/api/webhook/whatsapp/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Configurações de Ambiente
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

const EVOLUTION_URL = "http://167.234.242.205:8080"; 
const EVOLUTION_API_KEY = "sua-senha-secreta-muda-isso-aqui"; // Mesma do docker-compose
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE"; // Ou o nome que você criou (ZAP_NOVO)

// Função auxiliar para baixar imagem via Evolution API v2
async function fetchMediaFromEvolution(messageObject: any) {
    try {
        const response = await fetch(`${EVOLUTION_URL}/chat/getBase64FromMediaMessage/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: {
                'apikey': EVOLUTION_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: messageObject, // Envia o objeto da mensagem completo
                convertToMp4: false
            })
        });

        const data = await response.json();
        return data.base64; // Retorna a string base64 limpa
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
        const body = await req.json();

        // 0. IGNORAR MENSAGENS DO PRÓPRIO ROBÔ (Evita Loop Infinito)
        if (body.data?.key?.fromMe) {
            return NextResponse.json({ status: 'Ignored (From Me)' });
        }

        // 1. MAPEAMENTO DE DADOS
        const remoteJid = body.data?.key?.remoteJid; 
        const senderPhone = remoteJid?.split('@')[0];
        const message = body.data?.message;

        if (!message) return NextResponse.json({ status: 'No message content' });

        // Identificar conteúdo
        const isImage = !!message?.imageMessage;
        // Pega texto de legenda (imagem) ou texto puro
        const textContent = message?.conversation || message?.extendedTextMessage?.text || message?.imageMessage?.caption || "";

        console.log(`📩 Recebido de ${senderPhone}: ${isImage ? '[IMAGEM]' : '[TEXTO]'} "${textContent}"`);

        // 2. BUSCAR USUÁRIO NO SUPABASE
        const { data: userSettings } = await supabase
            .from('user_settings')
            .select('user_id')
            .eq('whatsapp_phone', senderPhone)
            .single();

        // Se não achar usuário, ignora (ou manda mensagem pedindo cadastro)
        if (!userSettings) {
            console.log("Usuário não encontrado:", senderPhone);
            return NextResponse.json({ error: "Telefone não vinculado" });
        }

        // 3. PREPARAR GEMINI
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        let mediaData: any[] = [];
        let prompt = `Analise a entrada. Texto do usuário: "${textContent}".`;

        if (isImage) {
            console.log("🔍 Baixando imagem...");
            const base64Data = await fetchMediaFromEvolution(message); // Passa o objeto message inteiro
            
            if (base64Data) {
                mediaData = [{ inlineData: { data: base64Data, mimeType: "image/jpeg" } }];
                prompt += " Analise este comprovante fiscal/recibo.";
            } else {
                await sendWhatsAppMessage(remoteJid, "❌ Não consegui baixar a imagem. Tente de novo.");
                return NextResponse.json({ error: "Falha download imagem" });
            }
        }

        // Prompt de Sistema: Define a personalidade e o formato de saída
        const systemPrompt = `
        Você é uma IA Financeira que alimenta um banco de dados Supabase.
        Analise o texto e/ou imagem e extraia os dados da transação.
        
        Regras:
        1. Se for gasto/compra -> type: "expense"
        2. Se for recebimento/salário -> type: "income"
        3. Se não tiver valor claro, ignore.
        4. Converta a data para formato ISO (YYYY-MM-DD) se encontrar, senão use null (o banco põe hoje).
        
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

        // 4. CHAMAR A IA
        const result = await model.generateContent([systemPrompt, prompt, ...mediaData]);
        const responseText = result.response.text();
        
        console.log("🤖 Resposta Gemini:", responseText);

        // 5. PROCESSAR JSON E SALVAR NO BANCO
        // Limpa possíveis blocos de código ```json ... ```
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '');
        const jsonMatch = cleanJson.match(/\[[\s\S]*\]/);

        if (jsonMatch) {
            const commands = JSON.parse(jsonMatch[0]);
            
            for (const cmd of commands) {
                if (cmd.action === 'add') {
                    // Insere no Supabase
                    const { error } = await supabase
                        .from(cmd.table)
                        .insert([{ 
                            ...cmd.data, 
                            user_id: userSettings.user_id,
                            created_at: new Date() // Garante data de criação
                        }]);

                    if (error) {
                        console.error("Erro Supabase:", error);
                        await sendWhatsAppMessage(remoteJid, "⚠️ Erro ao salvar no banco.");
                    } else {
                        const valorFormatado = cmd.data.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                        await sendWhatsAppMessage(remoteJid, `✅ *Lançado!* \n📝 ${cmd.data.description}\n💰 ${valorFormatado}\n📂 ${cmd.data.category}`);
                    }
                }
            }
        } else {
            // Se a IA não retornou JSON (provavelmente era só papo furado)
            // Opcional: Responder como chat normal
            // await sendWhatsAppMessage(remoteJid, responseText);
        }

        return NextResponse.json({ success: true });

    } catch (e) {
        console.error("Erro CRÍTICO no Webhook:", e);
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}