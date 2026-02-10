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

        // FILTRO DE EVENTOS
        if (body.event && body.event !== "messages.upsert") return NextResponse.json({ status: 'Ignored Event' });

        const key = body.data?.key;
        if (!key?.remoteJid || key.fromMe) return NextResponse.json({ status: 'Ignored' });
        
        // ID ÚNICO DA MENSAGEM (A CHAVE PARA NÃO DUPLICAR)
        const messageId = key.id; 

        const remoteJid = key.remoteJid;       
        const senderId = remoteJid.split('@')[0];
        
        let messageContent = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";

        // Verificação simples de duplicidade na memória (opcional, mas ajuda)
        // O banco fará a verificação real com o CONSTRAINT UNIQUE

        console.log(`📩 Recebido de: ${senderId} | Msg ID: ${messageId}`);

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

        // --- 3. IA ---
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const systemPrompt = `
        ATUE COMO: Assistente Financeiro "Meu Aliado". HOJE: ${new Date().toISOString().split('T')[0]}.

        SE FOR PARCELADO (Ex: "10x de 300"): 
        Retorne "installments" com "installments_count": 10.
        
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
                        message_id: messageId // <--- AQUI ESTÁ A VACINA ANTI-DUPLICIDADE
                    };

                    // --- PARCELADO INTELIGENTE (LOOP CORRIGIDO) ---
                    if (cmd.table === 'installments') {
                        payload.current_installment = 1;
                        payload.status = 'active';
                        
                        // Tenta criar o contrato pai
                        // O onConflict ignora se já existir esse message_id (evita erro)
                        const { data: installmentData, error: instError } = await supabase
                            .from('installments')
                            .insert([payload])
                            .select()
                            .single();
                        
                        // Se deu erro (provavelmente duplicado), para tudo.
                        if (instError) {
                            console.log("⚠️ Parcelamento duplicado ignorado.");
                            continue; 
                        }

                        if (installmentData) {
                            const totalParcelas = cmd.data.installments_count;
                            const valorParcela = cmd.data.value_per_month;
                            const diaVenc = cmd.data.due_day || 10;
                            const hoje = new Date(); // Data base é HOJE

                            for (let i = 0; i < totalParcelas; i++) {
                                // LÓGICA DE DATA:
                                // i=0 -> Mês Atual (Fevereiro)
                                // i=1 -> Mês Seguinte (Março)
                                const anoAtual = hoje.getFullYear();
                                const mesAtual = hoje.getMonth(); // 0=Jan, 1=Fev

                                // Cria a data no dia 1 para evitar bug de dia 30 em fevereiro
                                let dataParcela = new Date(anoAtual, mesAtual + i, 1);
                                
                                // Ajusta para o dia de vencimento correto
                                // (Se o mês tiver menos dias, tipo Fev 30, ele joga pro ultimo dia possivel)
                                const ultimoDiaMes = new Date(dataParcela.getFullYear(), dataParcela.getMonth() + 1, 0).getDate();
                                const diaFinal = Math.min(diaVenc, ultimoDiaMes);
                                dataParcela.setDate(diaFinal);

                                const mesNome = months[dataParcela.getMonth()];
                                const ano = dataParcela.getFullYear();
                                
                                // Formata data BR (DD/MM/AAAA)
                                const diaStr = String(diaFinal).padStart(2, '0');
                                const mesStr = String(dataParcela.getMonth() + 1).padStart(2, '0');
                                const dataFormatada = `${diaStr}/${mesStr}/${ano}`;

                                // ID único para cada parcela (MessageID + NumeroParcela) para evitar duplicar as filhas
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
                                    message_id: parcelaMessageId // Garante que as parcelas tb não dupliquem
                                }]);
                            }
                            await sendWhatsAppMessage(targetPhone, `✅ Parcelamento criado! ${totalParcelas}x de ${valorParcela} lançadas.`);
                            continue; 
                        }
                    }

                    // --- GASTO ÚNICO ---
                    if (cmd.table === 'transactions') {
                        // Data manual BR
                        if (cmd.data.date && cmd.data.date.includes('-')) {
                             const parts = cmd.data.date.split('-'); 
                             if (parts.length === 3) payload.date = `${parts[2]}/${parts[1]}/${parts[0]}`;
                        }
                        
                        const d = new Date(cmd.data.date);
                        payload.target_month = months[d.getUTCMonth()];
                        payload.is_paid = true;
                        payload.status = 'paid';
                        
                        // Tenta inserir. Se tiver o mesmo message_id, o banco bloqueia (erro 23505)
                        const { error } = await supabase.from(cmd.table).insert([payload]);
                        
                        if (error) {
                            // Se o erro for de duplicidade, ignora. Se for outro, avisa.
                            if (error.code === '23505') {
                                console.log("⚠️ Mensagem duplicada ignorada pelo banco.");
                            } else {
                                throw error;
                            }
                        } else {
                            const val = cmd.data.amount || 0;
                            const valorFmt = val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                            await sendWhatsAppMessage(targetPhone, `✅ Lançado: ${cmd.data.title} (${valorFmt})`);
                        }
                    }
                }
            }
        } catch (error: any) {
            console.error("❌ ERRO:", error);
            // Evita responder erro para o usuário se for erro interno de duplicação
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}