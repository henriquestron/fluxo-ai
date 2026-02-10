import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://167.234.242.205:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "sua-senha-secreta";
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

async function sendWhatsAppMessage(jid: string, text: string) {
    const finalJid = jid.includes('@') ? jid : `${jid}@s.whatsapp.net`;
    console.log(`📤 Enviando ZAP para: ${finalJid}`);
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

        // Filtro de eventos
        if (body.event && body.event !== "messages.upsert") return NextResponse.json({ status: 'Ignored Event' });

        const key = body.data?.key;
        if (!key?.remoteJid || key.fromMe) return NextResponse.json({ status: 'Ignored' });

        const remoteJid = key.remoteJid;       
        const senderId = remoteJid.split('@')[0];
        const messageContent = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";

        console.log(`\n--- 📩 MENSAGEM RECEBIDA ---`);
        console.log(`De: ${senderId}`);
        console.log(`Texto: "${messageContent}"`);

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
            // Lógica de Ativação por Link/Texto
            const cleanMessage = messageContent.replace(/\D/g, ''); 
            if (cleanMessage.length >= 10 && cleanMessage.length <= 13) {
                console.log(`🔍 Tentando vincular ${senderId} ao telefone ${cleanMessage}`);
                const possiblePhones = [cleanMessage, `55${cleanMessage}`, cleanMessage.replace(/^55/, '')];
                const { data: userToLink } = await supabase.from('user_settings').select('*').in('whatsapp_phone', possiblePhones).maybeSingle();

                if (userToLink) {
                    console.log(`✅ VINCULADO! UserID: ${userToLink.user_id}`);
                    await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', userToLink.user_id);
                    await sendWhatsAppMessage(remoteJid, `✅ *Conta Conectada!* \nReconheci você. Pode mandar seus gastos.`);
                    return NextResponse.json({ success: true, action: "linked" });
                }
            }
            console.log("⚠️ Usuário desconhecido.");
            return NextResponse.json({ error: "User unknown" });
        }

        // --- 2. PREPARAÇÃO PARA IA ---
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

        console.log(`🏢 Workspace ID: ${workspace?.id || "NÃO ENCONTRADO (Isso impede o salvamento!)"}`);

        if (!messageContent) return NextResponse.json({ status: 'No Text' });

        // --- 3. CHAMADA DA IA ---
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        
        const systemPrompt = `
        ATUE COMO: Assistente Financeiro. DATA: ${new Date().toISOString().split('T')[0]}.
        REGRAS RÍGIDAS DO BANCO DE DADOS:
        1. OBRIGATÓRIO: Use 'title' (nunca 'description').
        2. OBRIGATÓRIO: Use 'target_month' para transactions (Ex: Jan, Fev).
        3. OBRIGATÓRIO: Formato 'YYYY-MM-DD' para datas.

        RETORNE APENAS JSON:
        [GASTO COMUM]
        [{"action":"add", "table":"transactions", "data":{ "title": "...", "amount": 0.00, "type": "expense", "date": "YYYY-MM-DD", "category": "Outros", "target_month": "Mês", "status": "paid" }}]
        
        [CONTA FIXA]
        [{"action":"add", "table":"recurring", "data":{ "title": "...", "value": 0.00, "type": "expense", "due_day": 10, "category": "Fixa" }}]

        [PARCELADO]
        [{"action":"add", "table":"installments", "data":{ "title": "...", "total_value": 0.00, "installments_count": 10, "value_per_month": 0.00, "due_day": 10 }}]

        [CONVERSA]
        {"reply": "..."}
        `;

        const result = await model.generateContent([systemPrompt, messageContent]);
        const cleanJson = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        
        // --- LOG CRÍTICO DA IA ---
        console.log("🤖 RESPOSTA BRUTA DA IA:", cleanJson); 

        const jsonMatch = cleanJson.match(/\[[\s\S]*\]/) || cleanJson.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            let commands = JSON.parse(jsonMatch[0]);
            if (!Array.isArray(commands)) commands = [commands];
            const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

            for (const cmd of commands) {
                if (cmd.reply) {
                    await sendWhatsAppMessage(targetPhone, cmd.reply);
                } else if (cmd.action === 'add') {
                    
                    let payload: any = {
                        ...cmd.data,
                        user_id: userSettings.user_id,
                        context: workspace?.id, // Se isso for null, o banco rejeita
                        created_at: new Date()
                    };

                    if (cmd.table === 'transactions') {
                        const d = new Date(cmd.data.date);
                        payload.target_month = months[d.getUTCMonth()];
                        payload.status = 'paid';
                    }

                    // --- LOG CRÍTICO DO BANCO ---
                    console.log(`💾 TENTANDO SALVAR EM '${cmd.table}':`, JSON.stringify(payload, null, 2));

                    const { error } = await supabase.from(cmd.table).insert([payload]);

                    if (error) {
                        console.error(`❌ ERRO FATAL SUPABASE:`, error);
                        await sendWhatsAppMessage(targetPhone, `❌ Erro técnico: ${error.message} (Código: ${error.code})`);
                    } else {
                        console.log("✅ SUCESSO: Dados salvos no banco!");
                        const val = cmd.data.amount || cmd.data.value || cmd.data.total_value || 0;
                        const valorFmt = val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                        await sendWhatsAppMessage(targetPhone, `✅ Lançado: ${cmd.data.title} (${valorFmt})`);
                    }
                }
            }
        } else {
            console.log("⚠️ IA não retornou JSON válido.");
            await sendWhatsAppMessage(targetPhone, result.response.text());
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error("🔥 ERRO GERAL NO SERVIDOR:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}