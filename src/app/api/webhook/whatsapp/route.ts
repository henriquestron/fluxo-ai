import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://163.176.217.228:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "sua-senha-secreta";
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

// 🛡️ ESCUDO ANTI-DUPLICIDADE
const processedMessages = new Set<string>();

// 🟢 GERADOR DE MÚLTIPLAS VERSÕES DO NÚMERO BRASILEIRO (Nono Dígito)
const getPhoneVariations = (phone: string): string[] => {
    const clean = phone.replace(/\D/g, ''); // Tira tudo que não for número
    if (!clean.startsWith('55')) return [clean];
    
    const ddd = clean.substring(2, 4);
    const number = clean.substring(4);
    
    if (number.length === 9) {
        // [Versão original com 9, Versão sem o 9]
        return [clean, `55${ddd}${number.substring(1)}`];
    } else if (number.length === 8) {
        // [Versão original sem 9, Versão com o 9]
        return [clean, `55${ddd}9${number}`];
    }
    return [clean];
};

// --- FUNÇÕES AUXILIARES ---
// 🟢 ENVIO BLINDADO: Tenta todas as variações de número até o WhatsApp aceitar
// 🟢 ENVIO BLINDADO: Tenta todas as variações de número até o WhatsApp aceitar
async function sendWhatsAppMessage(jid: string, text: string, delay: number = 1200) {
    const variations = getPhoneVariations(jid.split('@')[0]);
    let success = false;

    for (const phoneAttempt of variations) {
        if (success) break;

        const finalJid = `${phoneAttempt}@s.whatsapp.net`;
        try {
            console.log(`📤 Tentando enviar para ${finalJid} (Delay: ${delay}ms)...`);
            const res = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
                method: 'POST',
                headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
                // 🔥 A CORREÇÃO FOI FEITA EXATAMENTE AQUI NESTE BODY 🔥
                body: JSON.stringify({ 
                    number: finalJid, 
                    options: { delay: delay },
                    textMessage: { text: text } 
                })
            });
            const json = await res.json();
            
            // Verifica se a Evolution aceitou (Status 200/201 ou contém ID de sucesso)
            if (res.ok || json?.status === 'SUCCESS' || json?.key?.id) {
                console.log(`✅ Status Envio Sucesso no número ${phoneAttempt}!`);
                success = true;
            } else {
                console.log(`⚠️ Falha (Provável Nono Dígito) em ${phoneAttempt}. Erro:`, json?.error || 'Bad Request');
            }
        } catch (e) { 
            console.error(`❌ Erro Envio ZAP para ${finalJid}:`, e); 
        }
    }

    if (!success) {
        console.log("🚨 Nenhuma das variações funcionou. Evolution recusou o envio.");
    }
}

async function downloadMedia(url: string) {
    try {
        console.log("📥 Tentando baixar URL:", url);
        const response = await fetch(url, { headers: { 'apikey': EVOLUTION_API_KEY } });
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer).toString('base64');
    } catch (error) { return null; }
}

// 🧠 CÁLCULO FINANCEIRO
// 🧠 CÁLCULO FINANCEIRO (Com o Efeito Cascata Oficial)
async function getFinancialContext(supabase: any, userId: string, workspaceId: string) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const activeMonthIdx = today.getMonth(); // 0 a 11

    const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const activeTab = MONTHS[activeMonthIdx];

    // 🟢 Puxa TUDO do banco para conseguir arrastar o saldo dos meses anteriores
    const { data: transactions } = await supabase.from('transactions').select('*').eq('user_id', userId).eq('context', workspaceId);
    const { data: recurring } = await supabase.from('recurring').select('*').eq('user_id', userId).eq('context', workspaceId);
    const { data: installments } = await supabase.from('installments').select('*').eq('user_id', userId).eq('context', workspaceId);

    const getStartData = (item: any) => {
        if (item.start_date && item.start_date.includes('/')) {
            const p = item.start_date.split('/'); return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) };
        }
        if (item.date && item.date.includes('/')) {
            const p = item.date.split('/'); return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) };
        }
        if (item.created_at) {
            const d = new Date(item.created_at); return { m: d.getMonth(), y: d.getFullYear() };
        }
        return { m: 0, y: currentYear };
    };

    let previousSurplus = 0;
    let computedInc = 0;
    let computedExp = 0;
    let computedBalance = 0;

    // 🟢 O MESMO LAÇO DE REPETIÇÃO DO SITE (Calcula de Jan até o Mês Atual)
    for (let idx = 0; idx <= activeMonthIdx; idx++) {
        const month = MONTHS[idx];
        const mCode = (idx + 1).toString().padStart(2, '0');
        const dateFilter = `/${mCode}/${currentYear}`;
        const paymentTag = `${month}/${currentYear}`;

        const inc = (transactions?.filter((t: any) => t.type === 'income' && t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby').reduce((acc: number, i: any) => acc + Number(i.amount), 0) || 0) +
                    (recurring?.filter((r: any) => {
                        const { m: sM, y: sY } = getStartData(r);
                        const paid = r.paid_months?.includes(paymentTag) || r.paid_months?.includes(month);
                        if ((r.status === 'delayed' || r.status === 'standby' || r.standby_months?.includes(paymentTag)) && !paid) return false;
                        return r.type === 'income' && (currentYear > sY || (currentYear === sY && idx >= sM)) && !r.skipped_months?.includes(month);
                    }).reduce((acc: number, i: any) => acc + Number(i.value), 0) || 0);

        const exp = (transactions?.filter((t: any) => t.type === 'expense' && t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby').reduce((acc: number, i: any) => acc + Number(i.amount), 0) || 0) +
                    (recurring?.filter((r: any) => {
                        const { m: sM, y: sY } = getStartData(r);
                        const paid = r.paid_months?.includes(paymentTag) || r.paid_months?.includes(month);
                        if ((r.status === 'delayed' || r.status === 'standby' || r.standby_months?.includes(paymentTag)) && !paid) return false;
                        return r.type === 'expense' && (currentYear > sY || (currentYear === sY && idx >= sM)) && !r.skipped_months?.includes(month);
                    }).reduce((acc: number, i: any) => acc + Number(i.value), 0) || 0) +
                    (installments?.reduce((acc: number, i: any) => {
                        const paid = i.paid_months?.includes(paymentTag) || i.paid_months?.includes(month);
                        if ((i.status === 'delayed' || i.status === 'standby' || i.standby_months?.includes(paymentTag)) && !paid) return acc;
                        
                        const { m: sM, y: sY } = getStartData(i);
                        const diff = ((currentYear - sY) * 12) + (idx - sM);
                        const act = 1 + (i.current_installment || 0) + diff;
                        return (act >= 1 && act <= i.installments_count) ? acc + Number(i.value_per_month) : acc;
                    }, 0) || 0);

        const saldoMensal = inc - exp;
        const saldoAcumulado = saldoMensal + previousSurplus;

        if (idx === activeMonthIdx) {
            computedInc = inc;
            computedExp = exp;
            computedBalance = saldoAcumulado;
        }

        previousSurplus = saldoAcumulado;
    }

    let estado = "ESTÁVEL 🟢";
    if (computedBalance < 0) estado = "CRÍTICO (VERMELHO) 🔴";
    else if (computedBalance < (computedInc * 0.1)) estado = "ALERTA (POUCA MARGEM) 🟡";

    return {
        saldo: computedBalance.toFixed(2),
        entradas: computedInc.toFixed(2),
        saidas: computedExp.toFixed(2),
        estado_conta: estado,
        resumo_texto: `Receitas: R$ ${computedInc.toFixed(2)} | Despesas: R$ ${computedExp.toFixed(2)} | Saldo: R$ ${computedBalance.toFixed(2)}`
    };
}

// --- ROTA PRINCIPAL ---
export async function POST(req: Request) {
    try {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "Configuração incompleta" }, { status: 500 });
        }

        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" }); 

        const body = await req.json();

        // 1. FILTROS BÁSICOS
        if (body.event && body.event !== "messages.upsert") return NextResponse.json({ status: 'Ignored Event' });
        const key = body.data?.key;
        if (!key?.remoteJid || key.fromMe) return NextResponse.json({ status: 'Ignored' });

        const messageId = key.id;
        
        // 🛡️ VERIFICAÇÃO DO ESCUDO ANTI-DUPLICIDADE
        if (processedMessages.has(messageId)) {
            console.log("♻️ Ignorando mensagem duplicada (Retentativa da Evolution):", messageId);
            return NextResponse.json({ status: 'Ignored Duplicate' });
        }
        
        processedMessages.add(messageId);
        if (processedMessages.size > 1000) processedMessages.clear(); 

        const remoteJid = key.remoteJid;
        const senderId = remoteJid.split('@')[0];
        const messageContent = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";

        // --- PROCESSAMENTO DE ÁUDIO ---
        let promptParts: any[] = [];
        let hasAudio = false;
        const msgData = body.data?.message;
        const msgType = body.data?.messageType;

        if (msgType === "audioMessage" || msgData?.audioMessage) {
            let audioBase64 = body.data?.base64 || msgData?.audioMessage?.base64 || body.data?.message?.base64;
            if (!audioBase64) {
                const url = msgData?.audioMessage?.url || body.data?.mediaUrl;
                if (url) audioBase64 = await downloadMedia(url);
            }
            if (audioBase64) {
                hasAudio = true;
                promptParts.push({ inlineData: { mimeType: "audio/ogg", data: audioBase64 } });
            } else {
                await sendWhatsAppMessage(remoteJid, "⚠️ Ocorreu um erro ao processar o seu áudio. Pode me mandar em texto?");
                return NextResponse.json({ status: 'Audio Failed' });
            }
        } else {
            if (!messageContent) return NextResponse.json({ status: 'No Content' });
            promptParts.push(messageContent);
        }

        // 2. IDENTIFICAÇÃO DO USUÁRIO
        let { data: userSettings } = await supabase.from('user_settings').select('*').or(`whatsapp_phone.eq.${senderId},whatsapp_id.eq.${senderId}`).maybeSingle();

        if (!userSettings) {
            // 🟢 Usa a nova função de variações para procurar no banco de dados!
            const variations = getPhoneVariations(senderId);
            const { data: found } = await supabase.from('user_settings').select('*').in('whatsapp_phone', variations).maybeSingle();
            if (found) {
                userSettings = found;
                await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', found.user_id);
            }
        }

        if (!userSettings) {
            const numbersInText = messageContent.replace(/\D/g, '');
            if (numbersInText.length >= 10) {
                // 🟢 Usa a nova função de variações para o vínculo!
                const possiblePhones = getPhoneVariations(numbersInText);
                const { data: userToLink } = await supabase.from('user_settings').select('*').in('whatsapp_phone', possiblePhones).maybeSingle();
                if (userToLink) {
                    await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', userToLink.user_id);
                    await sendWhatsAppMessage(remoteJid, `✅ *Vinculado!* Agora você pode usar a IA.`);
                    return NextResponse.json({ success: true, action: "linked" });
                }
            }
            return NextResponse.json({ error: "User unknown" });
        }

        // 🔒 TRAVA DE SEGURANÇA: VERIFICAÇÃO DE PLANO
        const { data: profile } = await supabase.from('profiles').select('plan_tier').eq('id', userSettings.user_id).single();
        const plan = profile?.plan_tier || 'free';

        if (!['pro', 'agent', 'admin'].includes(plan)) {
            console.log(`🚫 Bloqueado: ${senderId} é plano '${plan}' - ENVIANDO AVISO...`);
            const targetForBlock = userSettings.whatsapp_phone || senderId;
            await sendWhatsAppMessage(targetForBlock,
                "🚫 *Acesso Exclusivo PRO*\n\nA Inteligência Artificial no WhatsApp está disponível apenas nos planos **Pro** e **Consultor**.\n\nFaça o upgrade no seu painel para desbloquear: lançamentos por áudio, consultas e muito mais! 🚀",
                100
            );
            return NextResponse.json({ status: 'Blocked by Plan', plan: plan });
        }

        if (senderId !== userSettings.whatsapp_phone && userSettings.whatsapp_id !== senderId) {
            await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', userSettings.user_id);
        }

        const targetPhone = userSettings.whatsapp_phone || senderId;
        const { data: workspace } = await supabase.from('workspaces').select('id').eq('user_id', userSettings.user_id).limit(1).single();

        // 3. CONTEXTO FINANCEIRO
        let contextInfo = { saldo: "0", entradas: "0", saidas: "0", resumo_texto: "Sem dados", estado_conta: "Indefinido" };
        if (workspace) contextInfo = await getFinancialContext(supabase, userSettings.user_id, workspace.id);

        // 4. PROMPT DA IA MELHORADO E BLINDADO
        const systemPrompt = `
        ATUE COMO: "Meu Aliado", um assistente financeiro pessoal de WhatsApp. Você é educado, inteligente, prestativo e direto ao ponto.
        HOJE É: ${new Date().toLocaleDateString('pt-BR')}.

        --- SEU CONTEXTO FINANCEIRO NESTE MÊS ---
        Receitas: R$ ${contextInfo.entradas}
        Despesas: R$ ${contextInfo.saidas}
        Saldo Atual: R$ ${contextInfo.saldo}
        Situação: ${contextInfo.estado_conta}
        -----------------------------------------

        SUAS REGRAS DE COMPORTAMENTO:
        1. BATER PAPO/CONSULTA: Se o usuário perguntar como estão as contas ou pedir o saldo, responda de forma natural e amigável usando os dados acima.
        2. ADICIONAR CONTA: Entenda o valor e o título relatados pelo usuário e monte a ação no JSON.
        3. DICAS GENTIS: Se a situação estiver CRÍTICO, avise com carinho para segurar os gastos.
        4. SEJA CURTO: Ninguém lê textos gigantes no WhatsApp. Seja extremamente objetivo e claro.

        REGRA DE OURO DA PROGRAMAÇÃO:
        Sua saída DEVE ser ÚNICA E EXCLUSIVAMENTE um array JSON válido. NUNCA escreva textos normais fora da estrutura JSON.
        
        FORMATO OBRIGATÓRIO (ARRAY DE JSON):
        [
            {"action": "add", "table": "transactions", "data":{ "title": "...", "amount": 0.00, "type": "expense", "date": "DD/MM/YYYY", "category": "Outros", "target_month": "Mês" }},
            {"reply": "Sua resposta humanizada e natural para o WhatsApp aqui..."}
        ]

        Outros exemplos de JSON de Ação:
        - Parcela: {"action": "add", "table": "installments", "data":{ "title": "...", "total_value": 0.00, "installments_count": 1, "value_per_month": 0.00, "due_day": 10, "status": "active" }}
        - Fixo: {"action": "add", "table": "recurring", "data":{ "title": "...", "value": 0.00, "type": "expense", "due_day": 10, "status": "active" }}

        ${hasAudio ? "⚠️ IMPORTANTE: O usuário enviou um ÁUDIO. Entenda a voz dele e responda apropriadamente." : ""}
        `;

        const finalPrompt = [systemPrompt, ...promptParts];
        
        // 🟢 BLINDAGEM DA IA: Tratamento de erros exclusivo para o Gemini
        let commands: any[] = [];
        try {
            const result = await model.generateContent(finalPrompt);
            let cleanJson = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
            
            const arrayMatch = cleanJson.match(/\[[\s\S]*\]/);
            if (arrayMatch) cleanJson = arrayMatch[0];

            commands = JSON.parse(cleanJson);
            if (!Array.isArray(commands)) commands = [commands];
            
        } catch (error: any) {
            console.error("❌ ERRO NA IA OU NO JSON:", error);
            if (error?.status === 503 || error?.message?.includes('503')) {
                await sendWhatsAppMessage(targetPhone, "A IA está com muita demanda agora. Tente novamente em alguns segundos! ⏳");
            } else {
                await sendWhatsAppMessage(targetPhone, "Desculpe, meu cérebro (IA) deu uma travada agora. Pode me mandar a mensagem de novo de uma forma mais simples? 🤖");
            }
            return NextResponse.json({ success: false, reason: 'AI/JSON Error' });
        }

        // 5. PROCESSAMENTO DAS AÇÕES (Se a IA sobreviveu)
        let replySent = false;
        for (const cmd of commands) {
            if (cmd.action === 'add') {
                let payload: any = { ...cmd.data, user_id: userSettings.user_id, context: workspace?.id || null, created_at: new Date(), message_id: messageId };

                if (cmd.table === 'installments') {
                    payload.current_installment = 0; payload.status = 'active';
                    delete payload.date; delete payload.target_month;
                    const { error } = await supabase.from('installments').insert([payload]);

                    if (error && error.code === '23505') { replySent = true; continue; }
                    if (!error && !commands.some((c: any) => c.reply)) {
                        const total = Number(cmd.data.total_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                        await sendWhatsAppMessage(targetPhone, `✅ Parcelado: ${cmd.data.title} (${total})`);
                    }
                }
                else if (cmd.table === 'recurring') {
                    payload.status = 'active';
                    const { error } = await supabase.from('recurring').insert([payload]);

                    if (error && error.code === '23505') { replySent = true; continue; }
                    if (!error && !commands.some((c: any) => c.reply)) await sendWhatsAppMessage(targetPhone, `✅ Fixo: ${cmd.data.title}`);
                }
                else if (cmd.table === 'transactions') {
                    if (!payload.date) {
                        const hoje = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
                        const dStr = String(hoje.getDate()).padStart(2, '0');
                        const mStr = String(hoje.getMonth() + 1).padStart(2, '0');
                        payload.date = `${dStr}/${mStr}/${hoje.getFullYear()}`;
                    }
                    payload.is_paid = true; payload.status = 'paid';
                    const { error } = await supabase.from('transactions').insert([payload]);

                    if (error && error.code === '23505') { replySent = true; continue; }
                    if (!error && !commands.some((c: any) => c.reply)) {
                        const val = Number(cmd.data.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                        await sendWhatsAppMessage(targetPhone, `✅ Lançado: ${cmd.data.title} (${val})`);
                    }
                }
            }
            else if (cmd.action === 'remove') {
                const { data: items } = await supabase.from(cmd.table).select('id, title').eq('user_id', userSettings.user_id).ilike('title', `%${cmd.data.title}%`).order('created_at', { ascending: false }).limit(1);
                if (items?.length) {
                    await supabase.from(cmd.table).delete().eq('id', items[0].id);
                    if (!commands.some((c: any) => c.reply)) await sendWhatsAppMessage(targetPhone, `🗑️ Apagado: "${items[0].title}"`);
                } else {
                    if (!commands.some((c: any) => c.reply)) await sendWhatsAppMessage(targetPhone, `⚠️ Não encontrei "${cmd.data.title}"`);
                }
            }

            if (cmd.reply && !replySent) {
                await sendWhatsAppMessage(targetPhone, cmd.reply);
                replySent = true;
            }
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error("🔥 ERRO FATAL NO WEBHOOK:", e);
        // 🟢 REGRA DE OURO DO WEBHOOK: SEMPRE devolva 200, mesmo se der erro, senão a Evolution fica em loop!
        return NextResponse.json({ error: e.message, status: "Caught but returning 200 to prevent retries" }, { status: 200 });
    }
}