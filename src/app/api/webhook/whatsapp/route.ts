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
        // MODELO ATUALIZADO
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

        const body = await req.json();

        // 1. FILTRO DE EVENTOS
        if (body.event && body.event !== "messages.upsert") return NextResponse.json({ status: 'Ignored Event' });

        const key = body.data?.key;
        if (!key?.remoteJid || key.fromMe) return NextResponse.json({ status: 'Ignored' });
        
        const messageId = key.id; // <--- O CADEADO ANTI-DUPLICIDADE
        const remoteJid = key.remoteJid;       
        const senderId = remoteJid.split('@')[0];
        
        let messageContent = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";

        console.log(`📩 Recebido de: ${senderId} | MsgID: ${messageId}`);

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
            const cleanMessage = messageContent.replace(/\D/g, ''); 
            if (cleanMessage.length >= 10 && cleanMessage.length <= 13) {
                const possiblePhones = [cleanMessage, `55${cleanMessage}`, cleanMessage.replace(/^55/, '')];
                const { data: userToLink } = await supabase.from('user_settings').select('*').in('whatsapp_phone', possiblePhones).maybeSingle();

                if (userToLink) {
                    await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', userToLink.user_id);
                    await sendWhatsAppMessage(remoteJid, `✅ *Conta Conectada!* \nReconheci você.`);
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
        const { data: workspace } = await supabase.from('workspaces').select('id').eq('user_id', userSettings.user_id).limit(1).single();

        if (!messageContent) return NextResponse.json({ status: 'No Content' });

        // 3. IA - PROMPT AJUSTADO
        const systemPrompt = `
        ATUE COMO: Assistente Financeiro "Meu Aliado".
        DATA HOJE: ${new Date().toLocaleDateString('pt-BR')}.

        CLASSIFIQUE E RETORNE JSON:

        1. GASTOS À VISTA (transactions):
           JSON: [{"action":"add", "table":"transactions", "data":{ "title": "...", "amount": 0.00, "type": "expense", "date": "DD/MM/YYYY", "category": "Outros", "target_month": "Mês" }}]

        2. PARCELADOS (installments):
           JSON: [{"action":"add", "table":"installments", "data":{ "title": "...", "total_value": 0.00, "installments_count": 1, "value_per_month": 0.00, "due_day": 10, "status": "active" }}]

        3. FIXOS (recurring):
           JSON: [{"action":"add", "table":"recurring", "data":{ "title": "...", "value": 0.00, "type": "expense", "category": "Fixa", "due_day": 10, "status": "active" }}]

        [CONVERSA] {"reply": "..."}
        RETORNE APENAS O JSON.
        `;

        const result = await model.generateContent([systemPrompt, messageContent]);
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
                } else if (cmd.action === 'add') {
                    
                    let payload: any = {
                        ...cmd.data,
                        user_id: userSettings.user_id,
                        context: workspace?.id, 
                        created_at: new Date(),
                        message_id: messageId // VACINA ANTI-DUPLICIDADE
                    };

                    // --- CENÁRIO 1: PARCELADOS (installments) ---
                    if (cmd.table === 'installments') {
                        // AQUI ESTÁ O AJUSTE QUE VOCÊ PEDIU
                        payload.current_installment = 0; 
                        payload.status = 'active';
                        
                        delete payload.date;
                        delete payload.target_month;

                        // Tenta inserir. Se der erro de duplicidade, cai no catch ou no check de erro
                        const { error } = await supabase.from('installments').insert([payload]);
                        
                        if (!error) {
                            const total = cmd.data.total_value || 0;
                            const parcelas = cmd.data.installments_count || 0;
                            const valorParcela = cmd.data.value_per_month || 0;
                            
                            const msg = `✅ Parcelamento Registrado!\n${cmd.data.title}\n${parcelas}x de ${valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}\n(Total: ${total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})`;
                            await sendWhatsAppMessage(targetPhone, msg);
                        } else {
                            // Se o erro for "Duplicate Key" (23505), apenas ignora.
                            if (error.code === '23505') console.log("⚠️ Parcelamento duplicado barrado com sucesso.");
                            else console.error("❌ Erro Installments:", error);
                        }
                    }

                    // --- CENÁRIO 2: RECORRENTES (recurring) ---
                    else if (cmd.table === 'recurring') {
                        payload.status = 'active';
                        const { error } = await supabase.from('recurring').insert([payload]);
                        if (!error) {
                             const valorFmt = (cmd.data.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                             await sendWhatsAppMessage(targetPhone, `✅ Conta Fixa criada: ${cmd.data.title} (${valorFmt}) todo dia ${cmd.data.due_day}.`);
                        }
                    }

                    // --- CENÁRIO 3: GASTOS PONTUAIS (transactions) ---
                    else if (cmd.table === 'transactions') {
                        if (cmd.data.date && cmd.data.date.includes('/')) {
                             payload.date = cmd.data.date;
                        } else if (cmd.data.date && cmd.data.date.includes('-')) {
                             const parts = cmd.data.date.split('-'); 
                             if (parts.length === 3) payload.date = `${parts[2]}/${parts[1]}/${parts[0]}`;
                        } else {
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

                        payload.is_paid = true;
                        payload.status = 'paid';
                        
                        const { error } = await supabase.from('transactions').insert([payload]);
                        
                        if (!error) {
                            const val = cmd.data.amount || 0;
                            const valorFmt = val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                            await sendWhatsAppMessage(targetPhone, `✅ Lançado: ${cmd.data.title} (${valorFmt})`);
                        } else if (error.code === '23505') {
                            console.log("⚠️ Gasto duplicado barrado com sucesso.");
                        }
                    }
                }
            }
        } catch (error: any) {
            console.error("❌ ERRO JSON:", error);
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}