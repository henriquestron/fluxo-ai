import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Configurações
const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://167.234.242.205:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "sua-senha-secreta";
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

// Função para responder no WhatsApp
async function sendWhatsAppMessage(jid: string, text: string) {
    console.log(`📤 Enviando para ${jid}: ${text}`);
    try {
        await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: jid, text })
        });
    } catch (e) {
        console.error("ERRO AO RESPONDER:", e);
    }
}

export async function POST(req: Request) {
    try {
        // Verifica Chaves
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.GEMINI_API_KEY) {
            console.error("❌ ERRO: Chaves de API faltando!");
            return NextResponse.json({ error: "Configuração incompleta" }, { status: 500 });
        }

        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

        const body = await req.json();

        // 1. FILTROS DE SEGURANÇA
        const remoteJid = body.data?.key?.remoteJid;
        if (!remoteJid) return NextResponse.json({ status: 'Ignored (No JID)' });
        if (body.data?.key?.fromMe) return NextResponse.json({ status: 'Ignored (From Me)' });

        const senderPhone = remoteJid.split('@')[0];
        const messageContent = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "Imagem/Outro";

        console.log(`📩 MENSAGEM DE: ${senderPhone}`);

        // 2. BUSCA DO USUÁRIO (Lógica do 9º dígito)
        const possibleNumbers = [
            senderPhone,
            senderPhone.length > 12 ? senderPhone.replace('9', '') : senderPhone,
            senderPhone.length < 13 ? senderPhone.slice(0, 4) + '9' + senderPhone.slice(4) : senderPhone
        ];
        const uniqueNumbers = [...new Set(possibleNumbers)];

        let { data: userSettings } = await supabase
            .from('user_settings')
            .select('user_id')
            .in('whatsapp_phone', uniqueNumbers)
            .maybeSingle();

        if (!userSettings) {
            await sendWhatsAppMessage(remoteJid, `⚠️ Bot: Não achei seu número (${senderPhone}) no sistema. Cadastre-o no seu perfil.`);
            return NextResponse.json({ error: "Usuário desconhecido" });
        }

        // 3. BUSCA DO WORKSPACE
        const { data: workspace } = await supabase
            .from('workspaces')
            .select('id')
            .eq('user_id', userSettings.user_id)
            .order('created_at', { ascending: true })
            .limit(1)
            .single();

        const contextId = workspace?.id;

        // 4. PROCESSAMENTO IA (Modelo Atualizado)
        // Usando o modelo mais estável e rápido atual
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const systemPrompt = `
        Aja como um assistente financeiro pessoal.
        Data de hoje: ${new Date().toISOString().split('T')[0]}.
        
        Sua missão: Identificar gastos ou ganhos na mensagem.
        
        SE FOR GASTO/GANHO, retorne APENAS este JSON:
        [
            {
                "action": "add",
                "table": "transactions",
                "data": {
                    "description": "Descrição curta",
                    "amount": 0.00,
                    "type": "expense" (ou "income"),
                    "date": "YYYY-MM-DD",
                    "category": "Alimentação" (ou Transporte, Lazer, Casa, Outros)
                }
            }
        ]

        SE NÃO FOR GASTO (ex: "Oi", "Bom dia"), retorne APENAS:
        {"reply": "Olá! Sou seu assistente financeiro. Me mande seus gastos (ex: Almoço 30 reais)."}
        `;
        
        const result = await model.generateContent([systemPrompt, `Mensagem do usuário: "${messageContent}"`]);
        const responseText = result.response.text();
        
        // Limpeza do JSON (remove markdown ```json ... ```)
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        // Tenta processar
        try {
            // Tenta achar array ou objeto
            const jsonMatch = cleanJson.match(/\[[\s\S]*\]/) || cleanJson.match(/\{[\s\S]*\}/);
            
            if (jsonMatch) {
                let commands = JSON.parse(jsonMatch[0]);
                if (!Array.isArray(commands)) commands = [commands];

                for (const cmd of commands) {
                    if (cmd.reply) {
                        // Se a IA mandou responder texto simples
                        await sendWhatsAppMessage(remoteJid, cmd.reply);
                    } else if (cmd.action === 'add') {
                        // Se a IA mandou adicionar gasto
                        await supabase.from(cmd.table).insert([{
                            ...cmd.data,
                            user_id: userSettings.user_id,
                            context: contextId,
                            created_at: new Date()
                        }]);
                        
                        const valorFormatado = cmd.data.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                        await sendWhatsAppMessage(remoteJid, `✅ *Lançado!* \n📝 ${cmd.data.description}\n💰 ${valorFormatado}`);
                    }
                }
            } else {
                // Se a IA falou algo fora do JSON
                await sendWhatsAppMessage(remoteJid, responseText);
            }
        } catch (jsonError) {
            console.error("Erro ao ler JSON da IA:", jsonError);
            // Em último caso, não responde nada para não spamar erro
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error("ERRO CRÍTICO:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}