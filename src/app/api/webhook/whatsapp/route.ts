import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://167.234.242.205:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "sua-senha-secreta";
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

// --- FUNÇÃO AUXILIAR: BAIXAR MÍDIA ---
async function downloadMedia(url: string) {
    try {
        console.log("📥 Baixando mídia:", url);
        const response = await fetch(url, {
            headers: { 
                'apikey': EVOLUTION_API_KEY 
            }
        });
        
        if (!response.ok) {
            console.error("❌ Falha download:", response.status, response.statusText);
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        console.log(`📦 Mídia baixada: ${buffer.length} bytes`);
        return buffer.toString('base64');
    } catch (error) {
        console.error("❌ Erro crítico download:", error);
        return null;
    }
}

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
        // CONFIGURAÇÕES
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "Configuração incompleta" }, { status: 500 });
        }

        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        // MODELO V2 (Melhor para Áudio)
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const body = await req.json();

        // 1. FILTROS E DADOS DA MENSAGEM
        if (body.event && body.event !== "messages.upsert") return NextResponse.json({ status: 'Ignored Event' });

        const key = body.data?.key;
        if (!key?.remoteJid || key.fromMe) return NextResponse.json({ status: 'Ignored' });
        
        const messageId = key.id; 
        const remoteJid = key.remoteJid;       
        const senderId = remoteJid.split('@')[0];
        const messageType = body.data?.messageType;
        
        // --- PROCESSAMENTO MULTIMODAL ---
        let promptParts: any[] = [];
        let hasAudio = false;

        // A. Se for Áudio
        if (messageType === "audioMessage" || body.data?.message?.audioMessage) {
            const audioUrl = body.data?.message?.audioMessage?.url || body.data?.mediaUrl;
            
            if (audioUrl) {
                const audioBase64 = await downloadMedia(audioUrl);
                if (audioBase64) {
                    hasAudio = true;
                    // Adiciona o áudio primeiro
                    promptParts.push({
                        inlineData: {
                            mimeType: "audio/ogg", // Padrão do WhatsApp
                            data: audioBase64
                        }
                    });
                } else {
                    await sendWhatsAppMessage(remoteJid, "⚠️ Não consegui baixar seu áudio. Tente escrever.");
                    return NextResponse.json({ status: 'Audio Failed' });
                }
            }
        } 
        // B. Se for Texto
        else {
            const text = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";
            if (!text) return NextResponse.json({ status: 'No Content' });
            promptParts.push(text);
        }

        console.log(`📩 Recebido de: ${senderId} | Áudio: ${hasAudio} | MsgID: ${messageId}`);

        // 2. BUSCA E VINCULAÇÃO
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
            // Lógica simplificada de vínculo (igual ao anterior)
            const msgTexto = JSON.stringify(body).replace(/\D/g, ''); // Tenta achar numero no body todo
            if (msgTexto.includes(senderId)) { 
                // Se não achar, manda erro. (Mantive simples pra focar no áudio)
            }
            return NextResponse.json({ error: "User unknown" });
        }
        
        if (senderId !== userSettings.whatsapp_phone && userSettings.whatsapp_id !== senderId) {
            await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', userSettings.user_id);
            userSettings.whatsapp_id = senderId;
        }

        const targetPhone = userSettings.whatsapp_phone || senderId;
        const { data: workspace } = await supabase.from('workspaces').select('id').eq('user_id', userSettings.user_id).limit(1).single();


        // 3. IA - PROMPT
        const systemPrompt = `
        ATUE COMO: Assistente Financeiro "Meu Aliado".
        DATA HOJE: ${new Date().toLocaleDateString('pt-BR')}.

        ${hasAudio ? "INSTRUÇÃO DE ÁUDIO: O usuário enviou um áudio. Ouça com atenção, transcreva mentalmente o que ele disse e extraia o comando financeiro." : ""}

        CLASSIFIQUE E RETORNE JSON:

        1. ADICIONAR (action: add):
           - GASTOS (transactions): [{"action":"add", "table":"transactions", "data":{ "title": "...", "amount": 0.00, "type": "expense", "date": "DD/MM/YYYY", "category": "Outros", "target_month": "Mês" }}]
           - PARCELADOS (installments): [{"action":"add", "table":"installments", "data":{ "title": "...", "total_value": 0.00, "installments_count": 1, "value_per_month": 0.00, "due_day": 10, "status": "active" }}]
           - FIXOS (recurring): [{"action":"add", "table":"recurring", "data":{ "title": "...", "value": 0.00, "type": "expense", "category": "Fixa", "due_day": 10, "status": "active" }}]

        2. EXCLUIR (action: remove):
           - Ex: "Apagar o almoço" -> [{"action":"remove", "table":"transactions", "data":{ "title": "Almoço" }}]

        [CONVERSA] {"reply": "..."}
        RETORNE APENAS O JSON.
        `;

        // Junta System Prompt + (Áudio ou Texto)
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
                if (cmd.reply) {
                    await sendWhatsAppMessage(targetPhone, cmd.reply);
                } 
                
                // --- ADICIONAR ---
                else if (cmd.action === 'add') {
                    
                    let payload: any = {
                        ...cmd.data,
                        user_id: userSettings.user_id,
                        context: workspace?.id, 
                        created_at: new Date(),
                        message_id: messageId // Vacina
                    };

                    if (cmd.table === 'installments') {
                        payload.current_installment = 0; 
                        payload.status = 'active';
                        delete payload.date; delete payload.target_month;
                        
                        const { error } = await supabase.from('installments').insert([payload]);
                        if (!error) {
                             const total = (cmd.data.total_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                             await sendWhatsAppMessage(targetPhone, `✅ Parcelamento (Áudio/Texto): ${cmd.data.title} - Total ${total}`);
                        } else if (error.code !== '23505') console.error(error);
                    }
                    else if (cmd.table === 'recurring') {
                        payload.status = 'active';
                        const { error } = await supabase.from('recurring').insert([payload]);
                        if (!error) await sendWhatsAppMessage(targetPhone, `✅ Fixo Criado: ${cmd.data.title}`);
                    }
                    else if (cmd.table === 'transactions') {
                        if (cmd.data.date && cmd.data.date.includes('/')) payload.date = cmd.data.date;
                        else {
                            const hoje = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
                            const dStr = String(hoje.getDate()).padStart(2,'0');
                            const mStr = String(hoje.getMonth()+1).padStart(2,'0');
                            payload.date = `${dStr}/${mStr}/${hoje.getFullYear()}`;
                        }
                        if (payload.date) {
                            const [dia, mes, ano] = payload.date.split('/');
                            const mesIndex = parseInt(mes) - 1;
                            if (months[mesIndex]) payload.target_month = months[mesIndex];
                        }
                        payload.is_paid = true; payload.status = 'paid';
                        
                        const { error } = await supabase.from('transactions').insert([payload]);
                        if (!error) {
                             const val = (cmd.data.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                             await sendWhatsAppMessage(targetPhone, `✅ Lançado: ${cmd.data.title} (${val})`);
                        } else if (error.code !== '23505') console.error(error);
                    }
                }

                // --- EXCLUIR ---
                else if (cmd.action === 'remove') {
                    console.log(`🗑️ Removendo: ${cmd.data.title}`);
                    const { data: itemsToDelete } = await supabase
                        .from(cmd.table)
                        .select('id, title')
                        .eq('user_id', userSettings.user_id)
                        .ilike('title', `%${cmd.data.title}%`) 
                        .order('created_at', { ascending: false }) 
                        .limit(1);

                    if (itemsToDelete && itemsToDelete.length > 0) {
                        const { error } = await supabase.from(cmd.table).delete().eq('id', itemsToDelete[0].id);
                        if (!error) await sendWhatsAppMessage(targetPhone, `🗑️ Apagado: "${itemsToDelete[0].title}"`);
                    } else {
                        await sendWhatsAppMessage(targetPhone, `⚠️ Não achei "${cmd.data.title}" para apagar.`);
                    }
                }
            }
        } catch (error: any) {
            console.error("❌ ERRO JSON:", error);
            // Se falhar o JSON com áudio, as vezes é bom avisar
            if (hasAudio) await sendWhatsAppMessage(targetPhone, "🙉 Ouvi o áudio mas não entendi os valores. Pode repetir?");
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}