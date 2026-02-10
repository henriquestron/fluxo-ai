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
        
        // --- MODELO MAIS ATUAL ---
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const body = await req.json();

        // 1. FILTRO DE EVENTOS
        if (body.event && body.event !== "messages.upsert") return NextResponse.json({ status: 'Ignored Event' });

        const key = body.data?.key;
        if (!key?.remoteJid || key.fromMe) return NextResponse.json({ status: 'Ignored' });
        
        const messageId = key.id; // Vacina Anti-Duplicidade
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

        // 3. IA - PROMPT ALINHADO COM O SITE
        const systemPrompt = `
        ATUE COMO: Assistente Financeiro "Meu Aliado".
        DATA HOJE: ${new Date().toISOString().split('T')[0]}.

        SUA MISSÃO É CLASSIFICAR O TEXTO EM UMA DAS 3 TABELAS ABAIXO E RETORNAR O JSON EXATO.

        1. GASTOS/GANHOS PONTUAIS (Tabela: "transactions"):
           Ex: "Uber", "Mercado", "Pix Recebido", "Gasolina".
           JSON: [{"action":"add", "table":"transactions", "data":{ "title": "...", "amount": 0.00, "type": "expense", "date": "YYYY-MM-DD", "category": "Outros", "target_month": "Mês" }}]

        2. PARCELADOS (Tabela: "installments"):
           Ex: "Comprei iPhone em 12x", "Dividi a TV em 10 vezes", "Compra parcelada".
           JSON: [{"action":"add", "table":"installments", "data":{ "title": "...", "total_value": 0.00, "installments_count": 1, "value_per_month": 0.00, "due_day": 10, "status": "active" }}]

        3. FIXOS/RECORRENTES (Tabela: "recurring"):
           Ex: "Aluguel", "Netflix", "Spotify", "Internet", "Salário fixo".
           JSON: [{"action":"add", "table":"recurring", "data":{ "title": "...", "value": 0.00, "type": "expense", "category": "Fixa", "due_day": 10, "status": "active" }}]

        [CONVERSA]
        Se não for lançamento financeiro, retorne: {"reply": "Resposta curta e útil."}

        RETORNE APENAS O JSON LIMPO. SEM MARKDOWN.
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
                        message_id: messageId // Vacina
                    };

                    // --- CENÁRIO 1: PARCELADOS (installments) ---
                    if (cmd.table === 'installments') {
                        payload.current_installment = 1;
                        payload.status = 'active';
                        
                        // 1. Insere o Contrato Pai na tabela 'installments'
                        const { data: installmentData, error: instError } = await supabase
                            .from('installments')
                            .insert([payload])
                            .select()
                            .single();
                        
                        if (instError) {
                            console.log("⚠️ Parcelamento ignorado (possível duplicidade).");
                            continue; 
                        }

                        if (installmentData) {
                            // 2. Gera as parcelas na tabela 'transactions' para o Dashboard
                            const totalParcelas = cmd.data.installments_count;
                            const valorParcela = cmd.data.value_per_month;
                            const diaVenc = cmd.data.due_day || 10;
                            const hojeBR = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));

                            for (let i = 0; i < totalParcelas; i++) {
                                const anoAtual = hojeBR.getFullYear();
                                const mesAtual = hojeBR.getMonth(); // 0=Jan

                                // Cria data: Mês Atual + i
                                let dataParcela = new Date(anoAtual, mesAtual + i, 1);
                                
                                // Ajusta dia
                                const ultimoDiaMes = new Date(dataParcela.getFullYear(), dataParcela.getMonth() + 1, 0).getDate();
                                const diaFinal = Math.min(diaVenc, ultimoDiaMes);
                                dataParcela.setDate(diaFinal);

                                const mesNome = months[dataParcela.getMonth()];
                                const ano = dataParcela.getFullYear();
                                const diaStr = String(diaFinal).padStart(2, '0');
                                const mesStr = String(dataParcela.getMonth() + 1).padStart(2, '0');
                                const dataFormatada = `${diaStr}/${mesStr}/${ano}`;

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
                            await sendWhatsAppMessage(targetPhone, `✅ Parcelamento criado: ${totalParcelas}x de ${valorParcela.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}.`);
                            continue; 
                        }
                    }

                    // --- CENÁRIO 2: RECORRENTES (recurring) ---
                    if (cmd.table === 'recurring') {
                        payload.status = 'active';
                        const { error } = await supabase.from('recurring').insert([payload]);
                        if (!error) {
                             const valorFmt = (cmd.data.value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                             await sendWhatsAppMessage(targetPhone, `✅ Conta Fixa criada: ${cmd.data.title} (${valorFmt}) todo dia ${cmd.data.due_day}.`);
                        }
                    }

                    // --- CENÁRIO 3: GASTOS PONTUAIS (transactions) ---
                    if (cmd.table === 'transactions') {
                        // Formata Data BR
                        if (cmd.data.date && cmd.data.date.includes('-')) {
                             const parts = cmd.data.date.split('-'); 
                             if (parts.length === 3) payload.date = `${parts[2]}/${parts[1]}/${parts[0]}`;
                        }
                        
                        const d = new Date(cmd.data.date);
                        payload.target_month = months[d.getUTCMonth()];
                        payload.is_paid = true;
                        payload.status = 'paid';
                        
                        const { error } = await supabase.from('transactions').insert([payload]);
                        
                        if (!error) {
                            const val = cmd.data.amount || 0;
                            const valorFmt = val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                            await sendWhatsAppMessage(targetPhone, `✅ Lançado: ${cmd.data.title} (${valorFmt})`);
                        } else if (error.code === '23505') {
                            console.log("⚠️ Duplicidade ignorada.");
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