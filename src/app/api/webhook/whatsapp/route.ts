import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Tente ler as variáveis, ou use valores padrão para teste
const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://167.234.242.205:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "sua-senha-secreta-muda-isso-aqui";
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

// Função para responder no WhatsApp (Com logs de erro)
async function sendWhatsAppMessage(jid: string, text: string) {
    console.log(`📤 Tentando enviar para ${jid}: ${text}`);
    try {
        const res = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: jid, text })
        });
        const data = await res.json();
        console.log("RESPOSTA EVOLUTION:", data);
    } catch (e) {
        console.error("ERRO AO RESPONDER:", e);
    }
}

export async function POST(req: Request) {
    try {
        // Verifica chaves críticas
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
            console.error("❌ ERRO: SUPABASE_SERVICE_ROLE_KEY faltando!");
            return NextResponse.json({ error: "Configuração de servidor incompleta" }, { status: 500 });
        }

        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

        const body = await req.json();

        // 1. QUEM MANDOU?
        const remoteJid = body.data?.key?.remoteJid; // Ex: 556299999999@s.whatsapp.net
        if (!remoteJid) return NextResponse.json({ status: 'Ignored (No JID)' });
        
        // Ignora mensagens do próprio robô
        if (body.data?.key?.fromMe) return NextResponse.json({ status: 'Ignored (From Me)' });

        const senderPhone = remoteJid.split('@')[0]; // O número puro
        const messageContent = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "Imagem/Outro";

        console.log(`📩 MENSAGEM RECEBIDA DE: ${senderPhone}`);

        // 2. BUSCA INTELIGENTE DO USUÁRIO (Tenta com e sem o 9º dígito)
        // O Brasil é bagunçado. Às vezes vem 55629..., às vezes 5562...
        // Vamos testar as variações.
        
        const possibleNumbers = [
            senderPhone, // Como veio
            senderPhone.length > 12 ? senderPhone.replace('9', '') : senderPhone, // Tenta tirar o 9 (se for longo)
            senderPhone.length < 13 ? senderPhone.slice(0, 4) + '9' + senderPhone.slice(4) : senderPhone // Tenta por o 9 (se for curto)
        ];

        // Remove duplicatas
        const uniqueNumbers = [...new Set(possibleNumbers)];
        
        console.log("🔍 Procurando por:", uniqueNumbers);

        let { data: userSettings } = await supabase
            .from('user_settings')
            .select('user_id')
            .in('whatsapp_phone', uniqueNumbers) // Busca qualquer um dos formatos
            .maybeSingle();

        // --- MODO DEBUG ATIVADO ---
        // Se não achar o usuário, o robô VAI AVISAR no WhatsApp.
        if (!userSettings) {
            console.log("❌ Usuário não encontrado no banco.");
            await sendWhatsAppMessage(remoteJid, `⚠️ DEBUG: Não encontrei seu número no sistema.\n\nO robô leu: ${senderPhone}\nNo banco deve estar igual.\n\nVá no seu Perfil > WhatsApp e salve exatamente este número.`);
            return NextResponse.json({ error: "Usuário desconhecido" });
        }

        console.log("✅ Usuário encontrado! ID:", userSettings.user_id);

        // 3. BUSCAR WORKSPACE
        const { data: workspace } = await supabase
            .from('workspaces')
            .select('id')
            .eq('user_id', userSettings.user_id)
            .order('created_at', { ascending: true })
            .limit(1)
            .single();

        const contextId = workspace?.id;

        // 4. PROCESSAR COM IA
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const systemPrompt = `Você é um assistente financeiro. Hoje é ${new Date().toISOString().split('T')[0]}.
        Retorne JSON para: {"action": "add", "table": "transactions", "data": {"description": "...", "amount": 0.00, "type": "expense", "date": "YYYY-MM-DD", "category": "Outros"}}`;
        
        const result = await model.generateContent([systemPrompt, `Usuário disse: ${messageContent}`]);
        const responseText = result.response.text();
        
        // Tenta extrair JSON
        const jsonMatch = responseText.match(/\[[\s\S]*\]/) || responseText.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            // Se a IA gerou um comando de banco, executa
            let commands = JSON.parse(jsonMatch[0]);
            if (!Array.isArray(commands)) commands = [commands];

            for (const cmd of commands) {
                if (cmd.action === 'add') {
                    await supabase.from(cmd.table).insert([{
                        ...cmd.data,
                        user_id: userSettings.user_id,
                        context: contextId
                    }]);
                    await sendWhatsAppMessage(remoteJid, `✅ Lançado: ${cmd.data.description} R$ ${cmd.data.amount}`);
                }
            }
        } else {
            // Se não for gasto (ex: "Bom dia"), responde normal
            await sendWhatsAppMessage(remoteJid, "🤖 Entendi, mas não parece um gasto. Tente: 'Gastei 50 no Uber'.");
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error("ERRO FATAL:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}