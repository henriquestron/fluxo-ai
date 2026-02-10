import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
// app/api/webhook/whatsapp/route.ts

// ... seus imports e configurações do supabase/gemini ...

async function fetchMediaFromEvolution(messageKey: any) {
    const response = await fetch(`http://167.234.242.205:8080/instance/fetchMedia`, {
        method: 'POST',
        headers: {
            'apikey': 'sua-senha-secreta-muda-isso-aqui',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            instanceName: "MEO_ALIADO_INSTANCE",
            messageKey: messageKey
        })
    });

    const data = await response.json();
    
    // A Evolution API retorna o base64 direto ou uma URL. 
    // Na configuração padrão do Baileys, ela costuma vir como base64.
    return data.base64 || data.mediaUrl; 
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        
        // 1. MAPEAMENTO EXATO DA EVOLUTION API
        const remoteJid = body.data?.key?.remoteJid; // Ex: 556299999999@s.whatsapp.net
        const senderPhone = remoteJid?.split('@')[0];
        const message = body.data?.message;
        
        // Identificar tipo de conteúdo
        const isText = !!message?.conversation || !!message?.extendedTextMessage?.text;
        const isImage = !!message?.imageMessage;
        const textContent = message?.conversation || message?.extendedTextMessage?.text || message?.imageMessage?.caption;

        // 2. BUSCAR USUÁRIO NO SUPABASE
        const { data: userSettings } = await supabase
            .from('user_settings')
            .select('user_id')
            .eq('whatsapp_phone', senderPhone)
            .single();

        if (!userSettings) return NextResponse.json({ success: false, error: "Telefone não vinculado" });

        // 3. PROCESSAR COM GEMINI (FLASH 2.0)
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        let prompt = `Você é o Aliado, assistente de finanças Next.js. O usuário enviou: "${textContent}".`;
        let mediaData: any[] = [];

        if (isImage) {
            // Lógica para buscar o base64 da imagem na Evolution API
            const base64Image = await fetchMediaFromEvolution(body.data.key.id);
            mediaData = [{ inlineData: { data: base64Image, mimeType: "image/jpeg" } }];
            prompt += " Analise este comprovante e extraia os dados.";
        }

        const systemPrompt = "Responda APENAS um JSON: [{\"action\":\"add\", \"table\":\"transactions\", \"data\":{\"description\":\"...\", \"amount\":number, \"type\":\"expense\"}}]";
        
        const result = await model.generateContent([systemPrompt, prompt, ...mediaData]);
        const responseText = result.response.text();

        // 4. EXECUTAR NO BANCO E RESPONDER
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const commands = JSON.parse(jsonMatch[0]);
            for (const cmd of commands) {
                await supabase.from(cmd.table).insert([{ ...cmd.data, user_id: userSettings.user_id }]);
            }
            await sendWhatsAppMessage(remoteJid, "✅ Lançamento realizado com sucesso, patrão!");
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}

// Função para responder via Evolution API
async function sendWhatsAppMessage(jid: string, text: string) {
    await fetch(`http://167.234.242.205:8080/message/sendText/MEO_ALIADO_INSTANCE`, {
        method: 'POST',
        headers: { 'apikey': 'sua-senha-secreta-muda-isso-aqui', 'Content-Type': 'application/json' },
        body: JSON.stringify({ number: jid, text })
    });
}