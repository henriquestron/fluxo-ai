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
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const body = await req.json();

        // 1. FILTRO DE EVENTOS E DUPLICIDADE
        if (body.event && body.event !== "messages.upsert") return NextResponse.json({ status: 'Ignored Event' });

        const key = body.data?.key;
        if (!key?.remoteJid || key.fromMe) return NextResponse.json({ status: 'Ignored' });
        
        // ID DA MENSAGEM (VACINA ANTI-DUPLICIDADE)
        const messageId = key.id; 

        const remoteJid = key.remoteJid;       
        const senderId = remoteJid.split('@')[0];
        const messageContent = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";

        console.log(`📩 Recebido de: ${senderId} | MsgID: ${messageId}`);

        // 2. BUSCA E VINCULAÇÃO DE USUÁRIO
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

        // 3. IA (GEMINI FLASH LATEST)
        const systemPrompt = `
        ATUE COMO: Assistente Financeiro "Meu Aliado". 
        MODELO: gemini-1.5-flash-latest

        REGRAS:
        1. Se for parcelado (Ex: "10x de 300"), retorne "installments".
        2. Se for gasto comum, retorne "transactions".
        3. Datas SEMPRE no formato YYYY-MM-DD.
        
        RETORNE APENAS JSON:
        [PARCELADO] [{"action":"add", "table":"installments", "data":{ "title": "PS5", "total_value": 3000.00, "installments_count": 10, "value_per_month": 300.00, "due_day": 10 }}]
        [GASTO] [{"action":"add", "table":"transactions", "data":{ "title": "Almoço", "amount": 20.00, "type": "expense", "date": "YYYY-MM-DD", "category": "Alimentação" }}]
        [CONVERSA] {"reply": "..."}
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

                    // --- PARCELADO INTELIGENTE ---
                    if (cmd.table === 'installments') {
                        payload.current_installment = 1;
                        payload.status = 'active';
                        
                        // 1. Tenta criar o contrato PAI
                        const { data: installmentData, error: instError } = await supabase
                            .from('installments')
                            .insert([payload])
                            .select()
                            .single();
                        
                        // SE DEU ERRO AQUI, É PORQUE JÁ EXISTE (DUPLICADO). PARE AGORA.
                        if (instError) {
                            console.log("⚠️ Parcelamento duplicado barrado pelo SQL:", instError.message);
                            continue; 
                        }

                        if (installmentData) {
                            const totalParcelas = cmd.data.installments_count;
                            const valorParcela = cmd.data.value_per_month;
                            const diaVenc = cmd.data.due_day || 10;
                            
                            // 2. DATA BASE: FORÇA HORÁRIO BRASILEIRO
                            // Isso garante que "Hoje" seja a data certa no Brasil, evitando cair em Janeiro por fuso horário
                            const hojeBR = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));

                            // Loop para criar as transações futuras
                            for (let i = 0; i < totalParcelas; i++) {
                                const anoAtual = hojeBR.getFullYear();
                                const mesAtual = hojeBR.getMonth(); // 0=Jan, 1=Fev

                                // Cria data: Mês Atual + i
                                // i=0 -> Mês Atual (ex: Fev)
                                let dataParcela = new Date(anoAtual, mesAtual + i, 1);
                                
                                // Ajusta dia do vencimento
                                const ultimoDiaMes = new Date(dataParcela.getFullYear(), dataParcela.getMonth() + 1, 0).getDate();
                                const diaFinal = Math.min(diaVenc, ultimoDiaMes);
                                dataParcela.setDate(diaFinal);

                                const mesNome = months[dataParcela.getMonth()];
                                const ano = dataParcela.getFullYear();
                                
                                // Formata data BR (DD/MM/AAAA)
                                const diaStr = String(diaFinal).padStart(2, '0');
                                const mesStr = String(dataParcela.getMonth() + 1).padStart(2, '0');
                                const dataFormatada = `${diaStr}/${mesStr}/${ano}`;

                                // ID único da parcela filha
                                const parcelaMessageId = `${messageId}_p${i+1}`;

                                await supabase.from('transactions').insert([{
                                    user_id: userSettings.user_id,
                                    context: workspace?.id,
                                    title: `${cmd.data.title} (${i+1}/${totalParcelas})`,
                                    amount: valorParcela,
                                    type: 'expense',
                                    date: dataFormatada,
                                    target_month: mesNome,
                                    category: 'Parcelado',
                                    is_paid: false,
                                    status: 'pending',
                                    message_id: parcelaMessageId
                                }]);
                            }
                            await sendWhatsAppMessage(targetPhone, `✅ Parcelamento criado! ${totalParcelas}x de ${valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`);
                            continue; 
                        }
                    }

                    // --- GASTO ÚNICO ---
                    if (cmd.table === 'transactions') {
                        // Data manual BR (DD/MM/AAAA)
                        if (cmd.data.date && cmd.data.date.includes('-')) {
                             const parts = cmd.data.date.split('-'); 
                             if (parts.length === 3) payload.date = `${parts[2]}/${parts[1]}/${parts[0]}`;
                        }
                        
                        const d = new Date(cmd.data.date);
                        payload.target_month = months[d.getUTCMonth()];
                        payload.is_paid = true;
                        payload.status = 'paid';
                        
                        // Tenta inserir. Se tiver o mesmo message_id, o banco bloqueia
                        const { error } = await supabase.from(cmd.table).insert([payload]);
                        
                        if (error) {
                            if (error.code === '23505') console.log("⚠️ Gasto duplicado barrado pelo SQL.");
                            else console.error("❌ Erro Supabase:", error);
                        } else {
                            const val = cmd.data.amount || 0;
                            const valorFmt = val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                            await sendWhatsAppMessage(targetPhone, `✅ Lançado: ${cmd.data.title} (${valorFmt})`);
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