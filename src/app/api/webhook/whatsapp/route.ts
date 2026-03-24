import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// 🔴 1. FIM DO HARDCODE (Segurança de IP e Chaves)
const EVOLUTION_URL = process.env.EVOLUTION_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

if (!EVOLUTION_URL) throw new Error('EVOLUTION_URL não definida no .env');
if (!EVOLUTION_API_KEY) throw new Error('EVOLUTION_API_KEY não definida no .env');

const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

// 🔴 2. UPSTASH INICIALIZADO (Para Duplicidades e Rate Limit)
const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 mensagens por minuto por usuário
});

// ============================================================================
// AS SUAS FUNÇÕES AUXILIARES INTACTAS (Não alterei nada aqui)
// ============================================================================
const getPhoneVariations = (phone: string): string[] => {
    const clean = phone.replace(/\D/g, '');
    if (!clean.startsWith('55')) return [clean];
    const ddd = clean.substring(2, 4);
    const number = clean.substring(4);
    if (number.length === 9) { return [clean, `55${ddd}${number.substring(1)}`]; }
    else if (number.length === 8) { return [clean, `55${ddd}9${number}`]; }
    return [clean];
};

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
                headers: { 'apikey': EVOLUTION_API_KEY as string, 'Content-Type': 'application/json' },
                body: JSON.stringify({ number: finalJid, options: { delay: delay }, textMessage: { text: text } })
            });
            const json = await res.json();
            if (res.ok || json?.status === 'SUCCESS' || json?.key?.id) {
                console.log(`✅ Status Envio Sucesso no número ${phoneAttempt}!`);
                success = true;
            } else {
                console.log(`⚠️ Falha em ${phoneAttempt}. Erro:`, json?.error || 'Bad Request');
            }
        } catch (e) { console.error(`❌ Erro Envio ZAP para ${finalJid}:`, e); }
    }
    if (!success) console.log("🚨 Nenhuma das variações funcionou. Evolution recusou o envio.");
}

async function downloadMedia(url: string) {
    try {
        const response = await fetch(url, { headers: { 'apikey': EVOLUTION_API_KEY as string } });
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer).toString('base64');
    } catch (error) { return null; }
}

async function getFinancialContext(supabase: any, userId: string, workspaceId: string) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const activeMonthIdx = today.getMonth();
    const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

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

    let previousSurplus = 0; let computedInc = 0; let computedExp = 0; let computedBalance = 0;

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
        if (idx === activeMonthIdx) { computedInc = inc; computedExp = exp; computedBalance = saldoAcumulado; }
        previousSurplus = saldoAcumulado;
    }

    let estado = "ESTÁVEL 🟢";
    if (computedBalance < 0) estado = "CRÍTICO (VERMELHO) 🔴";
    else if (computedBalance < (computedInc * 0.1)) estado = "ALERTA (POUCA MARGEM) 🟡";

    return {
        saldo: computedBalance.toFixed(2), entradas: computedInc.toFixed(2), saidas: computedExp.toFixed(2),
        estado_conta: estado, resumo_texto: `Receitas: R$ ${computedInc.toFixed(2)} | Despesas: R$ ${computedExp.toFixed(2)} | Saldo: R$ ${computedBalance.toFixed(2)}`
    };
}
// ============================================================================


// --- ROTA PRINCIPAL CORRIGIDA ---
export async function POST(req: Request) {
    console.log("Headers recebidos:", JSON.stringify(Object.fromEntries(req.headers.entries())));
    console.log("Secret esperado:", process.env.EVOLUTION_WEBHOOK_SECRET);
    
    try {
        // 🔴 3. PROTEÇÃO DO WEBHOOK (Obrigatória: Falha Segura)
        const EVOLUTION_WEBHOOK_SECRET = process.env.EVOLUTION_WEBHOOK_SECRET;

        if (!EVOLUTION_WEBHOOK_SECRET) {
            throw new Error('🔥 ALERTA DE SEGURANÇA: EVOLUTION_WEBHOOK_SECRET não definida no .env');
        }

        // 🟢 A MÁGICA DA URL ENTRA AQUI! 
        // Lemos os parâmetros da URL para buscar o '?token='
        const { searchParams } = new URL(req.url);
        const urlToken = searchParams.get('token');

        // O código tenta achar no Header (apikey/authorization). Se não achar, ele pega o urlToken!
        const webhookToken = req.headers.get('apikey') 
            ?? req.headers.get('authorization')?.replace('Bearer ', '') 
            ?? urlToken;

        if (webhookToken !== EVOLUTION_WEBHOOK_SECRET) {
            console.warn('⚠️ Webhook recusado: token inválido ou ausente. Possível tentativa de invasão.');
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const body = await req.json();

        if (body.event && body.event !== "messages.upsert") return NextResponse.json({ status: 'Ignored Event' });
        const key = body.data?.key;
        if (!key?.remoteJid || key.fromMe) return NextResponse.json({ status: 'Ignored' });

        const messageId = key.id;
        const remoteJid = key.remoteJid;
        const senderId = remoteJid.split('@')[0];
        const messageContent = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";

        // 🔴 4. ANTI-DUPLICIDADE DE VERDADE (Usando Redis)
        const alreadyProcessed = await redis.get(`msg:${messageId}`);
        if (alreadyProcessed) {
            console.log("♻️ Ignorando mensagem duplicada (Redis capturou):", messageId);
            return NextResponse.json({ status: 'Ignored Duplicate' });
        }
        await redis.set(`msg:${messageId}`, '1', { ex: 86400 }); // Expira em 24h

        // 🔴 5. RATE LIMITING (Anti-Flood por Número)
        const { success: rateLimitSuccess } = await ratelimit.limit(senderId);
        if (!rateLimitSuccess) {
            await sendWhatsAppMessage(remoteJid, "⏳ Calma! Você está enviando mensagens muito rápido. Aguarde um minuto.");
            return NextResponse.json({ status: 'Rate Limited' });
        }

        // 🔴 6. INTERCEPTADOR DE CONFIRMAÇÃO DE DELEÇÃO
        const pendingDeleteStr = await redis.get(`pending_delete:${senderId}`);
        if (pendingDeleteStr) {
            const userInput = messageContent.trim().toUpperCase();
            if (userInput === 'SIM') {
                const cmd = typeof pendingDeleteStr === 'string' ? JSON.parse(pendingDeleteStr) : pendingDeleteStr;

                // 🛡️ REVALIDAÇÃO DA WHITELIST (Defesa em Profundidade)
                const ALLOWED_TABLES = ['transactions', 'installments', 'recurring'];
                if (!ALLOWED_TABLES.includes(cmd.table)) {
                    await sendWhatsAppMessage(remoteJid, '⚠️ Operação inválida. Tabela não permitida.');
                    await redis.del(`pending_delete:${senderId}`);
                    return NextResponse.json({ status: 'Blocked' });
                }

                const { data: us } = await supabase.from('user_settings').select('user_id').eq('whatsapp_id', senderId).single();

                if (us) {
                    const { data: items } = await supabase.from(cmd.table).select('id, title').eq('user_id', us.user_id).ilike('title', `%${cmd.data.title}%`).order('created_at', { ascending: false }).limit(1);
                    if (items?.length) {
                        await supabase.from(cmd.table).delete().eq('id', items[0].id);
                        await sendWhatsAppMessage(remoteJid, `🗑️ Apagado com sucesso: "${items[0].title}"`);
                    } else {
                        await sendWhatsAppMessage(remoteJid, `⚠️ Não encontrei o item para apagar.`);
                    }
                }
                await redis.del(`pending_delete:${senderId}`);
                return NextResponse.json({ success: true, action: "deleted_confirmed" });
            } else {
                await redis.del(`pending_delete:${senderId}`);
                await sendWhatsAppMessage(remoteJid, `❌ Exclusão cancelada. Sobre o que você quer falar agora?`);
                return NextResponse.json({ success: true, action: "deleted_cancelled" });
            }
        }


        // --- PROCESSAMENTO DE ÁUDIO E IMAGEM ---
        let promptParts: any[] = [];
        let hasAudio = false;
        let hasImage = false;
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
        }
        else if (msgType === "imageMessage" || msgData?.imageMessage) {
            let imageBase64 = body.data?.base64 || msgData?.imageMessage?.base64 || body.data?.message?.base64;
            if (!imageBase64) {
                const url = msgData?.imageMessage?.url || body.data?.mediaUrl;
                if (url) imageBase64 = await downloadMedia(url);
            }
            if (imageBase64) {
                hasImage = true;
                const mime = msgData?.imageMessage?.mimetype || "image/jpeg";
                promptParts.push({ inlineData: { mimeType: mime, data: imageBase64 } });
                const caption = msgData?.imageMessage?.caption;
                if (caption) promptParts.push(caption);
            } else {
                await sendWhatsAppMessage(remoteJid, "⚠️ Não consegui ler a imagem. Pode tentar enviar de novo?");
                return NextResponse.json({ status: 'Image Failed' });
            }
        }
        else {
            if (!messageContent) return NextResponse.json({ status: 'No Content' });
            promptParts.push(messageContent);
        }

        // IDENTIFICAÇÃO DO USUÁRIO
        let { data: userSettings } = await supabase.from('user_settings').select('*').or(`whatsapp_phone.eq.${senderId},whatsapp_id.eq.${senderId}`).maybeSingle();

        if (!userSettings) {
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

        // TRAVA DE SEGURANÇA: VERIFICAÇÃO DE PLANO
        const { data: profile } = await supabase.from('profiles').select('plan_tier').eq('id', userSettings.user_id).single();
        const plan = profile?.plan_tier || 'free';

        if (!['pro', 'agent', 'admin'].includes(plan)) {
            const targetForBlock = userSettings.whatsapp_phone || senderId;
            await sendWhatsAppMessage(targetForBlock, "🚫 *Acesso Exclusivo PRO*\n\nA Inteligência Artificial no WhatsApp está disponível apenas nos planos **Pro** e **Consultor**.", 100);
            return NextResponse.json({ status: 'Blocked by Plan', plan: plan });
        }

        if (senderId !== userSettings.whatsapp_phone && userSettings.whatsapp_id !== senderId) {
            await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', userSettings.user_id);
        }

        const targetPhone = userSettings.whatsapp_phone || senderId;
        const { data: workspace } = await supabase.from('workspaces').select('id').eq('user_id', userSettings.user_id).limit(1).single();

        let contextInfo = { saldo: "0", entradas: "0", saidas: "0", resumo_texto: "Sem dados", estado_conta: "Indefinido" };
        if (workspace) contextInfo = await getFinancialContext(supabase, userSettings.user_id, workspace.id);

        const systemPrompt = `
            IDENTIDADE: Você é "Meu Aliado", assistente financeiro pessoal via WhatsApp.
            Tom: amigável, direto, humano. Nunca robótico.
            DATA DE HOJE: ${new Date().toLocaleDateString('pt-BR')}.

            ━━━ SITUAÇÃO FINANCEIRA DO MÊS ━━━
            💰 Receitas:  R$ ${contextInfo.entradas}
            💸 Despesas:  R$ ${contextInfo.saidas}
            📊 Saldo:     R$ ${contextInfo.saldo}
            ⚠️  Status:   ${contextInfo.estado_conta}
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

            COMO AGIR EM CADA SITUAÇÃO:
            [BATE-PAPO / SALDO] → Responda naturalmente com os dados acima. Seja breve e humano.
            [REGISTRO DE TRANSAÇÃO] → Extraia título, valor, data e tipo (receita/despesa). Monte o JSON. Se faltar informação essencial (ex: valor), pergunte.
            [PARCELA / FIXO] → Identifique se é gasto parcelado (installments) ou recorrente mensal (recurring).
            [APAGAR/REMOVER GASTO] → Monte o JSON com action: "remove".

            REGRAS ABSOLUTAS:
            ✅ Saída SEMPRE como array JSON válido — zero texto fora do JSON.
            ✅ Respostas curtas (WhatsApp, não romance).
            ✅ Valores sempre como número float (ex: 49.90), nunca string.

            ━━━ FORMATOS JSON PERMITIDOS ━━━
            Adicionar Transação:
            {"action": "add", "table": "transactions", "data": {"title": "...", "amount": 0.00, "type": "expense", "date": "DD/MM/YYYY", "category": "..."}}
            Remover Transação:
            {"action": "remove", "table": "transactions", "data": {"title": "..."}}
            Resposta ao usuário (OBRIGATÓRIA):
            {"reply": "mensagem curta e humana aqui"}

            ${hasAudio ? "\n⚠️ ÁUDIO RECEBIDO: Transcreva mentalmente a fala e responda com base no que foi dito." : ""}
            ${hasImage ? "\n📸 IMAGEM RECEBIDA: Extraia o valor total, a data e o nome do estabelecimento da foto/comprovante para registrar o gasto." : ""}
        `;

        const finalPrompt = [systemPrompt, ...promptParts];

        let commands: any[] = [];
        try {
            const result = await model.generateContent(finalPrompt);
            let cleanJson = result.response.text().split('```json').join('').split('```').join('').trim();
            const arrayMatch = cleanJson.match(/\[[\s\S]*\]/);
            if (arrayMatch) cleanJson = arrayMatch[0];

            commands = JSON.parse(cleanJson);
            if (!Array.isArray(commands)) commands = [commands];
        } catch (error: any) {
            console.error("❌ ERRO NA IA OU NO JSON:", error);
            await sendWhatsAppMessage(targetPhone, "Desculpe, meu cérebro (IA) deu uma travada agora. Pode me mandar a mensagem de novo? 🤖");
            return NextResponse.json({ success: false, reason: 'AI/JSON Error' });
        }

        // PROCESSAMENTO DAS AÇÕES
        let replySent = false;
        const ALLOWED_TABLES = ['transactions', 'installments', 'recurring'];

        for (const cmd of commands) {
            // Trava extra para evitar que a IA mande tabelas não permitidas
            if (cmd.table && !ALLOWED_TABLES.includes(cmd.table)) {
                console.warn(`⛔ Tabela bloqueada pela IA: ${cmd.table}`);
                continue;
            }

            if (cmd.action === 'add') {
                let payload: any = { ...cmd.data, user_id: userSettings.user_id, context: workspace?.id || null, created_at: new Date(), message_id: messageId };

                const extractedValue = parseFloat(cmd.data.amount) || parseFloat(cmd.data.value) || parseFloat(cmd.data.value_per_month) || parseFloat(cmd.data.total_value) || 0;
                if (extractedValue <= 0) continue;

                if (cmd.table === 'installments') {
                    payload.current_installment = 0; payload.status = 'active';
                    delete payload.date; delete payload.target_month; delete payload.is_paid;
                    const { error } = await supabase.from('installments').insert([payload]);
                    if (error && error.code === '23505') { replySent = true; continue; }
                    if (!error && !commands.some((c: any) => c.reply)) await sendWhatsAppMessage(targetPhone, `✅ Parcelado salvo: ${cmd.data.title}`);
                }
                else if (cmd.table === 'recurring') {
                    payload.status = 'active';
                    delete payload.is_paid; delete payload.amount; delete payload.date;
                    const { error } = await supabase.from('recurring').insert([payload]);
                    if (error && error.code === '23505') { replySent = true; continue; }
                    if (!error && !commands.some((c: any) => c.reply)) await sendWhatsAppMessage(targetPhone, `✅ Fixo salvo: ${cmd.data.title}`);
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
                    if (!error && !commands.some((c: any) => c.reply)) await sendWhatsAppMessage(targetPhone, `✅ Lançado: ${cmd.data.title}`);
                }
            }
            // 🔴 8. CONFIRMAÇÃO DE EXCLUSÃO
            else if (cmd.action === 'remove') {
                await sendWhatsAppMessage(targetPhone, `⚠️ Você quer apagar "${cmd.data.title}"? Responda *SIM* para confirmar.`);
                // Salva o comando no Redis por 5 minutos (300 segundos) aguardando a pessoa responder "SIM"
                await redis.set(`pending_delete:${senderId}`, JSON.stringify(cmd), { ex: 300 });
                replySent = true; // Para não mandar o cmd.reply padrão da IA e confundir
            }

            if (cmd.reply && !replySent) {
                await sendWhatsAppMessage(targetPhone, cmd.reply);
                replySent = true;
            }
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error("🔥 ERRO FATAL NO WEBHOOK:", e);
        return NextResponse.json({ error: e.message, status: "Caught but returning 200 to prevent retries" }, { status: 200 });
    }
}