import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://167.234.242.205:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "sua-senha-secreta";
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

// --- FUNÇÃO AUXILIAR: BAIXAR MÍDIA DA EVOLUTION ---
async function downloadMedia(url: string) {
    try {
        const response = await fetch(url, {
            headers: { 
                'apikey': EVOLUTION_API_KEY 
            }
        });
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer).toString('base64');
    } catch (error) {
        console.error("Erro ao baixar mídia:", error);
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
        
        // --- PROCESSAMENTO MULTIMODAL (TEXTO OU ÁUDIO) ---
        let promptParts: any[] = [];
        let logMsg = "Texto";

        // A. Se for Áudio
        if (messageType === "audioMessage" || body.data?.message?.audioMessage) {
            logMsg = "🎙️ Áudio";
            const audioUrl = body.data?.message?.audioMessage?.url || body.data?.mediaUrl;
            
            if (audioUrl) {
                const audioBase64 = await downloadMedia(audioUrl);
                if (audioBase64) {
                    // Adiciona o áudio para o Gemini ouvir
                    promptParts.push({
                        inlineData: {
                            mimeType: "audio/ogg", // WhatsApp geralmente usa ogg/opus
                            data: audioBase64
                        }
                    });
                }
            }
        } 
        // B. Se for Texto
        else {
            const text = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";
            if (!text) return NextResponse.json({ status: 'No Content' });
            promptParts.push(text);
        }

        console.log(`📩 Recebido de: ${senderId} | Tipo: ${logMsg} | MsgID: ${messageId}`);

        // 2. BUSCA E VINCULAÇÃO (MANTIDA IGUAL)
        let { data: userSettings } = await supabase
            .from('user_settings')
            .select('*')
            .or(`whatsapp_phone.eq.${senderId},whatsapp_id.eq.${senderId}`)
            .maybeSingle();

        // Lógica de "User Unknown" e "Vínculo" (Resumida aqui para caber, mantenha a sua lógica de vínculo se quiser)
        if (!userSettings) {
             // ... (Sua lógica de vínculo existente fica aqui, igual ao anterior)
             return NextResponse.json({ error: "User unknown" });
        }
        
        // Atualiza ID se mudou
        if (senderId !== userSettings.whatsapp_phone && userSettings.whatsapp_id !== senderId) {
            await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', userSettings.user_id);
            userSettings.whatsapp_id = senderId;
        }

        const targetPhone = userSettings.whatsapp_phone || senderId;
        const { data: workspace } = await supabase.from('workspaces').select('id').eq('user_id', userSettings.user_id).limit(1).single();


        // 3. IA - PROMPT COM EXCLUSÃO E ÁUDIO
        const systemPrompt = `
        ATUE COMO: Assistente Financeiro "Meu Aliado".
        DATA HOJE: ${new Date().toLocaleDateString('pt-BR')}.

        VOCÊ RECEBERÁ TEXTO OU ÁUDIO. "OUÇA" OU LEIA E CLASSIFIQUE.

        OPÇÕES DE AÇÃO:

        1. ADICIONAR (add):
           - GASTOS À VISTA (transactions): [{"action":"add", "table":"transactions", "data":{ "title": "...", "amount": 0.00, "type": "expense", "date": "DD/MM/YYYY", "category": "Outros", "target_month": "Mês" }}]
           - PARCELADOS (installments): [{"action":"add", "table":"installments", "data":{ "title": "...", "total_value": 0.00, "installments_count": 1, "value_per_month": 0.00, "due_day": 10, "status": "active" }}]
           - FIXOS (recurring): [{"action":"add", "table":"recurring", "data":{ "title": "...", "value": 0.00, "type": "expense", "category": "Fixa", "due_day": 10, "status": "active" }}]

        2. EXCLUIR/REMOVER (remove):
           - Se o usuário pedir para apagar/cancelar/remover algo.
           - Identifique o NOME (title) ou se é o "último".
           Ex: "Apagar o almoço" -> JSON: [{"action":"remove", "table":"transactions", "data":{ "title": "Almoço" }}]
           Ex: "Apagar a conta da Netflix" -> JSON: [{"action":"remove", "table":"recurring", "data":{ "title": "Netflix" }}]

        [CONVERSA] {"reply": "..."}
        RETORNE APENAS O JSON.
        `;

        // Adiciona o System Prompt no início do array de partes
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
                
                // --- AÇÃO: ADICIONAR ---
                else if (cmd.action === 'add') {
                    
                    let payload: any = {
                        ...cmd.data,
                        user_id: userSettings.user_id,
                        context: workspace?.id, 
                        created_at: new Date(),
                        message_id: messageId // Vacina
                    };

                    // TRATAMENTOS DE TABELA (IGUAL AO CÓDIGO ANTERIOR)
                    if (cmd.table === 'installments') {
                        payload.current_installment = 0; 
                        payload.status = 'active';
                        delete payload.date; delete payload.target_month;
                        const { error } = await supabase.from('installments').insert([payload]);
                        if (!error) await sendWhatsAppMessage(targetPhone, `✅ Parcelamento: ${cmd.data.title}`);
                    }
                    else if (cmd.table === 'recurring') {
                        payload.status = 'active';
                        const { error } = await supabase.from('recurring').insert([payload]);
                        if (!error) await sendWhatsAppMessage(targetPhone, `✅ Fixo: ${cmd.data.title}`);
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
                             const val = cmd.data.amount || 0;
                             const valorFmt = val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                             await sendWhatsAppMessage(targetPhone, `✅ Lançado: ${cmd.data.title} (${valorFmt})`);
                        }
                    }
                }

                // --- AÇÃO: EXCLUIR (NOVO) ---
                else if (cmd.action === 'remove') {
                    console.log(`🗑️ Tentando excluir: ${cmd.data.title} na tabela ${cmd.table}`);

                    // 1. Busca o item mais recente com esse nome (ILIKE para ignorar maiúsculas/minúsculas)
                    const { data: itemsToDelete } = await supabase
                        .from(cmd.table)
                        .select('id, title, created_at')
                        .eq('user_id', userSettings.user_id)
                        .ilike('title', `%${cmd.data.title}%`) // Busca parcial (Ex: "Almo" acha "Almoço")
                        .order('created_at', { ascending: false }) // Pega o último criado
                        .limit(1);

                    if (itemsToDelete && itemsToDelete.length > 0) {
                        const item = itemsToDelete[0];
                        
                        // 2. Deleta pelo ID
                        const { error } = await supabase
                            .from(cmd.table)
                            .delete()
                            .eq('id', item.id);

                        if (!error) {
                            await sendWhatsAppMessage(targetPhone, `🗑️ Apagado: "${item.title}"`);
                        } else {
                            await sendWhatsAppMessage(targetPhone, `❌ Erro ao apagar: ${error.message}`);
                        }
                    } else {
                        await sendWhatsAppMessage(targetPhone, `⚠️ Não encontrei nenhum lançamento recente com nome parecida com "${cmd.data.title}".`);
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