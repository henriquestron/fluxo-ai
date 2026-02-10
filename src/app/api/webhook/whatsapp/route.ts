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

// Função para baixar APENAS se não vier base64
async function downloadMedia(url: string) {
    try {
        console.log("📥 Tentando baixar URL:", url);
        const response = await fetch(url, { headers: { 'apikey': EVOLUTION_API_KEY } });
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer).toString('base64');
    } catch (error) { return null; }
}

export async function POST(req: Request) {
    try {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "Configuração incompleta" }, { status: 500 });
        }

        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        // MODELO V2
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const body = await req.json();

        // 1. FILTROS
        if (body.event && body.event !== "messages.upsert") return NextResponse.json({ status: 'Ignored Event' });

        const key = body.data?.key;
        if (!key?.remoteJid || key.fromMe) return NextResponse.json({ status: 'Ignored' });
        
        const messageId = key.id; 
        const remoteJid = key.remoteJid;       
        const senderId = remoteJid.split('@')[0];
        
        // --- LÓGICA DE ÁUDIO ---
        let promptParts: any[] = [];
        let hasAudio = false;

        const msgData = body.data?.message;
        const msgType = body.data?.messageType;

        // Verifica se é áudio
        if (msgType === "audioMessage" || msgData?.audioMessage) {
            console.log("🎙️ Áudio detectado.");
            
            // 1. Tenta pegar o Base64 direto (Se vc ativou na Evolution)
            let audioBase64 = body.data?.base64 || msgData?.audioMessage?.base64;

            // 2. Se não tem base64, tenta baixar da URL (Cuidado com .enc)
            if (!audioBase64) {
                const url = msgData?.audioMessage?.url || body.data?.mediaUrl;
                if (url) {
                    // Se for .enc, avisa que vai dar ruim
                    if (url.includes('.enc')) console.warn("⚠️ URL Criptografada (.enc). Ative 'Include Base64' na Evolution!");
                    audioBase64 = await downloadMedia(url);
                }
            }

            if (audioBase64) {
                hasAudio = true;
                promptParts.push({
                    inlineData: {
                        mimeType: "audio/ogg",
                        data: audioBase64
                    }
                });
            } else {
                await sendWhatsAppMessage(remoteJid, "⚠️ Não consegui ouvir o áudio. Ative a opção 'Include Base64' na sua API ou mande texto.");
                return NextResponse.json({ status: 'Audio Failed' });
            }
        } else {
            // Texto normal
            const text = msgData?.conversation || msgData?.extendedTextMessage?.text || "";
            if (!text) return NextResponse.json({ status: 'No Content' });
            promptParts.push(text);
        }

        console.log(`📩 Processando msg de: ${senderId}`);

        // 2. BUSCA USUÁRIO (Resumida)
        let { data: userSettings } = await supabase.from('user_settings').select('*').or(`whatsapp_phone.eq.${senderId},whatsapp_id.eq.${senderId}`).maybeSingle();
        
        // Se não achou ID, tenta pelo telefone (Lógica de vínculo)
        if (!userSettings && senderId.length < 15) {
             const variations = [senderId, senderId.length > 12 ? senderId.replace('9', '') : senderId, senderId.length < 13 ? senderId.slice(0, 4) + '9' + senderId.slice(4) : senderId];
             const { data: found } = await supabase.from('user_settings').select('*').in('whatsapp_phone', variations).maybeSingle();
             userSettings = found;
             if (userSettings) await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', userSettings.user_id);
        }

        if (!userSettings) return NextResponse.json({ error: "User unknown" });

        const targetPhone = userSettings.whatsapp_phone || senderId;
        const { data: workspace } = await supabase.from('workspaces').select('id').eq('user_id', userSettings.user_id).limit(1).single();

        // 3. IA
        const systemPrompt = `
        ATUE COMO: Assistente Financeiro "Meu Aliado".
        DATA HOJE: ${new Date().toLocaleDateString('pt-BR')}.

        ${hasAudio ? "O USUÁRIO MANDOU ÁUDIO. Transcreva mentalmente e extraia o comando." : ""}

        AÇÕES JSON:
        1. ADICIONAR (add):
           - GASTOS (transactions): [{"action":"add", "table":"transactions", "data":{ "title": "...", "amount": 0.00, "type": "expense", "date": "DD/MM/YYYY", "category": "Outros", "target_month": "Mês" }}]
           - PARCELADOS (installments): [{"action":"add", "table":"installments", "data":{ "title": "...", "total_value": 0.00, "installments_count": 1, "value_per_month": 0.00, "due_day": 10, "status": "active" }}]
           - FIXOS (recurring): [{"action":"add", "table":"recurring", "data":{ "title": "...", "value": 0.00, "type": "expense", "category": "Fixa", "due_day": 10, "status": "active" }}]

        2. EXCLUIR (remove):
           - [{"action":"remove", "table":"transactions", "data":{ "title": "Nome" }}]

        [CONVERSA] {"reply": "..."}
        RETORNE APENAS JSON.
        `;

        const finalPrompt = [systemPrompt, ...promptParts];
        const result = await model.generateContent(finalPrompt);
        let cleanJson = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        
        const arrayMatch = cleanJson.match(/\[[\s\S]*\]/);
        const objectMatch = cleanJson.match(/\{[\s\S]*\}/);
        if (arrayMatch) cleanJson = arrayMatch[0];
        else if (objectMatch) cleanJson = objectMatch[0];

        try {
            let commands = JSON.parse(cleanJson);
            if (!Array.isArray(commands)) commands = [commands];
            const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

            for (const cmd of commands) {
                if (cmd.reply) await sendWhatsAppMessage(targetPhone, cmd.reply);
                
                else if (cmd.action === 'add') {
                    let payload: any = { ...cmd.data, user_id: userSettings.user_id, context: workspace?.id, created_at: new Date(), message_id: messageId };

                    if (cmd.table === 'installments') {
                        payload.current_installment = 0; payload.status = 'active';
                        delete payload.date; delete payload.target_month;
                        const { error } = await supabase.from('installments').insert([payload]);
                        if (!error) {
                             const total = (cmd.data.total_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                             await sendWhatsAppMessage(targetPhone, `✅ Parcelado: ${cmd.data.title} (${total})`);
                        }
                    }
                    else if (cmd.table === 'recurring') {
                        payload.status = 'active';
                        const { error } = await supabase.from('recurring').insert([payload]);
                        if (!error) await sendWhatsAppMessage(targetPhone, `✅ Fixo: ${cmd.data.title}`);
                    }
                    else if (cmd.table === 'transactions') {
                        if (!payload.date) {
                            const hoje = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
                            const dStr = String(hoje.getDate()).padStart(2,'0');
                            const mStr = String(hoje.getMonth()+1).padStart(2,'0');
                            payload.date = `${dStr}/${mStr}/${hoje.getFullYear()}`;
                        }
                        if (payload.date) {
                             const [dia, mes] = payload.date.split('/');
                             if (months[parseInt(mes)-1]) payload.target_month = months[parseInt(mes)-1];
                        }
                        payload.is_paid = true; payload.status = 'paid';
                        const { error } = await supabase.from('transactions').insert([payload]);
                        if (!error) {
                             const val = (cmd.data.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                             await sendWhatsAppMessage(targetPhone, `✅ Lançado: ${cmd.data.title} (${val})`);
                        }
                    }
                }
                else if (cmd.action === 'remove') {
                    const { data: items } = await supabase.from(cmd.table).select('id, title').eq('user_id', userSettings.user_id).ilike('title', `%${cmd.data.title}%`).order('created_at', { ascending: false }).limit(1);
                    if (items?.length) {
                        await supabase.from(cmd.table).delete().eq('id', items[0].id);
                        await sendWhatsAppMessage(targetPhone, `🗑️ Apagado: "${items[0].title}"`);
                    } else {
                        await sendWhatsAppMessage(targetPhone, `⚠️ Não encontrei "${cmd.data.title}" para apagar.`);
                    }
                }
            }
        } catch (error) {
            console.error("❌ ERRO JSON:", error);
            // AGORA ELE AVISA SE DEU RUIM
            if (hasAudio) await sendWhatsAppMessage(targetPhone, "🙉 Ouvi barulho mas não entendi. O áudio pode estar criptografado. Ative 'Include Base64' na Evolution.");
            else await sendWhatsAppMessage(targetPhone, result.response.text());
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}