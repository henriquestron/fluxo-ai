import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://167.234.242.205:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "sua-senha-secreta";
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

async function sendWhatsAppMessage(jid: string, text: string) {
    const finalJid = jid.includes('@') ? jid : `${jid}@s.whatsapp.net`;
    try {
        await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: finalJid, text, delay: 1200 })
        });
    } catch (e) { console.error("❌ Erro Envio ZAP:", e); }
}

export async function POST(req: Request) {
    try {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "Configuração incompleta" }, { status: 500 });
        }

        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const body = await req.json();

        if (body.event && body.event !== "messages.upsert") return NextResponse.json({ status: 'Ignored Event' });

        const key = body.data?.key;
        if (!key?.remoteJid || key.fromMe) return NextResponse.json({ status: 'Ignored' });

        const remoteJid = key.remoteJid;       
        const senderId = remoteJid.split('@')[0];
        const messageContent = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";

        console.log(`📩 Recebido de: ${senderId}`);

        // --- 1. BUSCA E VINCULAÇÃO ---
        let { data: userSettings } = await supabase
            .from('user_settings')
            .select('*')
            .or(`whatsapp_phone.eq.${senderId},whatsapp_id.eq.${senderId}`)
            .maybeSingle();

        if (!userSettings && senderId.length < 15) {
             const variations = [senderId, senderId.length > 12 ? senderId.replace('9', '') : senderId, senderId.length < 13 ? senderId.slice(0, 4) + '9' + senderId.slice(4) : senderId];
             const { data: found } = await supabase.from('user_settings').select('*').in('whatsapp_phone', variations).maybeSingle();
             userSettings = found;
        }

        if (!userSettings) {
            const cleanMessage = messageContent.replace(/\D/g, ''); 
            if (cleanMessage.length >= 10 && cleanMessage.length <= 13) {
                console.log(`🔍 Vinculando ${senderId} ao telefone ${cleanMessage}`);
                const possiblePhones = [cleanMessage, `55${cleanMessage}`, cleanMessage.replace(/^55/, '')];
                const { data: userToLink } = await supabase.from('user_settings').select('*').in('whatsapp_phone', possiblePhones).maybeSingle();

                if (userToLink) {
                    await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', userToLink.user_id);
                    await sendWhatsAppMessage(remoteJid, `✅ *Conta Conectada!* \nReconheci você. Pode mandar seus gastos.`);
                    return NextResponse.json({ success: true, action: "linked" });
                }
            }
            return NextResponse.json({ error: "User unknown" });
        }

        if (senderId !== userSettings.whatsapp_phone && userSettings.whatsapp_id !== senderId) {
            await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', userSettings.user_id);
            userSettings.whatsapp_id = senderId;
        }

        const targetPhone = userSettings.whatsapp_phone || senderId;

        const { data: workspace } = await supabase
            .from('workspaces')
            .select('id')
            .eq('user_id', userSettings.user_id)
            .limit(1)
            .single();

        if (!messageContent) return NextResponse.json({ status: 'No Text' });

        // --- 3. IA ---
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        // VOLTEI O PROMPT PARA O FORMATO LIMPO (SEM ETIQUETAS)
        const systemPrompt = `
        ATUE COMO: Assistente Financeiro "Meu Aliado". 
        DATA HOJE: ${new Date().toISOString().split('T')[0]}.

        REGRAS RÍGIDAS:
        1. Use 'title' para o nome do gasto.
        2. Transactions exige 'target_month' (Ex: Jan, Fev).
        3. Datas SEMPRE no formato YYYY-MM-DD.
        
        RETORNE APENAS O ARRAY JSON (SEM TEXTO EXTRA):
        
        [GASTO COMUM]
        [{"action":"add", "table":"transactions", "data":{ "title": "Almoço", "amount": 20.00, "type": "expense", "date": "2024-02-10", "category": "Alimentação" }}]
        
        [CONTA FIXA]
        [{"action":"add", "table":"recurring", "data":{ "title": "Netflix", "value": 55.90, "type": "expense", "due_day": 10, "category": "Fixa" }}]

        [PARCELADO]
        [{"action":"add", "table":"installments", "data":{ "title": "Tênis", "total_value": 500.00, "installments_count": 5, "value_per_month": 100.00, "due_day": 10 }}]

        [CONVERSA]
        {"reply": "Olá! Mande seus gastos."}
        `;

        const result = await model.generateContent([systemPrompt, messageContent]);
        let cleanJson = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        
        // GARANTIA EXTRA: Pega apenas o que está entre [ e ] ou { e }
        const arrayMatch = cleanJson.match(/\[[\s\S]*\]/);
        const objectMatch = cleanJson.match(/\{[\s\S]*\}/);
        
        if (arrayMatch) cleanJson = arrayMatch[0];
        else if (objectMatch) cleanJson = objectMatch[0];

        try {
            let commands = JSON.parse(cleanJson);
            if (!Array.isArray(commands)) commands = [commands];
            const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

            for (const cmd of commands) {
                if (cmd.reply) {
                    await sendWhatsAppMessage(targetPhone, cmd.reply);
                } else if (cmd.action === 'add') {
                    
                    let payload: any = {
                        ...cmd.data,
                        user_id: userSettings.user_id,
                        context: workspace?.id, 
                        created_at: new Date()
                    };

                    // --- CONVERSOR DE DATA MANUAL (YYYY-MM-DD -> DD/MM/YYYY) ---
                    // Isso resolve o problema do gasto não aparecer no site
                    if (cmd.data.date && cmd.data.date.includes('-')) {
                         const parts = cmd.data.date.split('-'); // [2026, 02, 10]
                         if (parts.length === 3) {
                             const year = parts[0];
                             const month = parts[1];
                             const day = parts[2];
                             
                             // Salva como DD/MM/AAAA para transactions
                             if (cmd.table === 'transactions') {
                                 payload.date = `${day}/${month}/${year}`;
                             }
                         }
                    }

                    // --- REGRAS ESPECÍFICAS ---
                    if (cmd.table === 'transactions') {
                        // Se for transactions, define o mês alvo baseado na data enviada pela IA
                        if (cmd.data.date) {
                            const d = new Date(cmd.data.date);
                            payload.target_month = months[d.getUTCMonth()];
                        }
                        payload.is_paid = true;
                        payload.status = 'paid';
                    }

                    if (cmd.table === 'installments') {
                        payload.current_installment = 1;
                        payload.status = 'active';
                    }

                    console.log(`💾 SALVANDO EM ${cmd.table}:`, JSON.stringify(payload, null, 2));

                    const { error } = await supabase.from(cmd.table).insert([payload]);

                    if (error) {
                        console.error(`❌ ERRO SUPABASE:`, error);
                        await sendWhatsAppMessage(targetPhone, `❌ Erro ao salvar: ${error.message}`);
                    } else {
                        const val = cmd.data.amount || cmd.data.value || cmd.data.total_value || 0;
                        const valorFmt = val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                        await sendWhatsAppMessage(targetPhone, `✅ Lançado: ${cmd.data.title} (${valorFmt})`);
                    }
                }
            }
        } catch (error) {
            console.error("❌ ERRO JSON:", error);
            // Se falhar o JSON, manda a resposta em texto da IA (fallback)
            await sendWhatsAppMessage(targetPhone, result.response.text());
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error("🔥 ERRO GERAL:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}