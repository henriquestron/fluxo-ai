import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const EVOLUTION_URL = process.env.EVOLUTION_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

if (!EVOLUTION_URL) throw new Error('EVOLUTION_URL não definida no .env');
if (!EVOLUTION_API_KEY) throw new Error('EVOLUTION_API_KEY não definida no .env');

const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
});

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================
const getPhoneVariations = (phone: string): string[] => {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('55')) {
        if (clean.length > 13) clean = clean.substring(0, 13);
        const ddd = clean.substring(2, 4);
        const number = clean.substring(4);
        if (number.length === 9) { return [clean, `55${ddd}${number.substring(1)}`]; }
        else if (number.length === 8) { return [clean, `55${ddd}9${number}`]; }
        return [clean];
    }
    if (clean.length === 10 || clean.length === 11) {
        return [`55${clean}`, clean];
    }
    return [clean];
};

// 🟢 ENVIADOR BLINDADO (Usa apenas os números oficiais do banco)
async function sendWhatsAppMessage(phone: string, text: string, delay: number = 1200) {
    const variations = getPhoneVariations(phone);
    let success = false;
    for (const v of variations) {
        if (success) break;
        const finalJid = `${v}@s.whatsapp.net`;
        try {
            console.log(`📤 Tentando enviar para ${finalJid} (Delay: ${delay}ms)...`);
            const res = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
                method: 'POST',
                headers: { 'apikey': EVOLUTION_API_KEY as string, 'Content-Type': 'application/json' },
                body: JSON.stringify({ number: finalJid, options: { delay: delay }, textMessage: { text: text } })
            });
            const json = await res.json();
            if (res.ok || json?.status === 'SUCCESS' || json?.key?.id) {
                console.log(`✅ Sucesso no número ${finalJid}!`);
                success = true;
            } else {
                console.log(`⚠️ Falha em ${finalJid}. Erro:`, json?.error || 'Bad Request');
            }
        } catch (e) { console.error(`❌ Erro Envio ZAP para ${finalJid}:`, e); }
    }
    if (!success) console.log("🚨 Nenhuma variação funcionou. Evolution recusou.");
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
    const today = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentYear = today.getFullYear();
    const activeMonthIdx = today.getMonth();
    const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    const [transRes, recRes, instRes] = await Promise.all([
        supabase.from('transactions').select('type, amount, date, status').eq('user_id', userId).eq('context', workspaceId),
        supabase.from('recurring').select('type, value, custom_values, start_date, created_at, status, paid_months, skipped_months, standby_months').eq('user_id', userId).eq('context', workspaceId),
        supabase.from('installments').select('value_per_month, start_date, created_at, status, paid_months, standby_months, current_installment, installments_count').eq('user_id', userId).eq('context', workspaceId)
    ]);

    const transactions = transRes.data || [];
    const recurring = recRes.data || [];
    const installments = instRes.data || [];

    const getStartData = (item: any) => {
        if (item.start_date) {
            if (item.start_date.includes('-')) {
                const p = item.start_date.split('-'); return { m: parseInt(p[1]) - 1, y: parseInt(p[0]) };
            }
            if (item.start_date.includes('/')) {
                const p = item.start_date.split('/'); return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) };
            }
        }
        if (item.date && item.date.includes('/')) {
            const p = item.date.split('/'); return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) };
        }
        if (item.created_at) {
            const d = new Date(item.created_at); return { m: d.getMonth(), y: d.getFullYear() };
        }
        return { m: 0, y: currentYear };
    };

    const getActualValue = (item: any, tag: string) => {
        if (item.custom_values && item.custom_values[tag] !== undefined) {
            return Number(item.custom_values[tag]);
        }
        return Number(item.value);
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
            }).reduce((acc: number, r: any) => acc + getActualValue(r, paymentTag), 0) || 0);

        const exp = (transactions?.filter((t: any) => t.type === 'expense' && t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby').reduce((acc: number, i: any) => acc + Number(i.amount), 0) || 0) +
            (recurring?.filter((r: any) => {
                const { m: sM, y: sY } = getStartData(r);
                const paid = r.paid_months?.includes(paymentTag) || r.paid_months?.includes(month);
                if ((r.status === 'delayed' || r.status === 'standby' || r.standby_months?.includes(paymentTag)) && !paid) return false;
                return r.type === 'expense' && (currentYear > sY || (currentYear === sY && idx >= sM)) && !r.skipped_months?.includes(month);
            }).reduce((acc: number, r: any) => acc + getActualValue(r, paymentTag), 0) || 0) +
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

export async function POST(req: Request) {
    try {
        const EVOLUTION_WEBHOOK_SECRET = process.env.EVOLUTION_WEBHOOK_SECRET;

        if (!EVOLUTION_WEBHOOK_SECRET) {
            throw new Error('ALERTA: EVOLUTION_WEBHOOK_SECRET não definida no .env');
        }

        const { searchParams } = new URL(req.url);
        const urlToken = searchParams.get('token');
        const webhookToken = req.headers.get('apikey') ?? req.headers.get('authorization')?.replace('Bearer ', '') ?? urlToken;

        if (webhookToken !== EVOLUTION_WEBHOOK_SECRET) {
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
        // Extrai o "código fantasma" ou número limpo enviado
        const senderRaw = remoteJid.split('@')[0].split(':')[0];
        const senderId = senderRaw.replace(/\D/g, '');
        const messageContent = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";

        const variations = getPhoneVariations(senderId);
        const inQuery = variations.join(',');

        // 1. TENTA ACHAR O USUÁRIO PELO NÚMERO OU CÓDIGO FANTASMA
        let { data: userSettings } = await supabase
            .from('user_settings')
            .select('*')
            .or(`whatsapp_id.eq.${senderId},partner_whatsapp_id.eq.${senderId},whatsapp_phone.in.(${inQuery}),partner_phone.in.(${inQuery})`)
            .maybeSingle();

        // 2. FLUXO DE ATIVAÇÃO (Se não achou, ele exige a palavra "Ativar")
        if (!userSettings) {
            const numbersInText = messageContent.replace(/\D/g, '');
            // Se o texto tiver um número de telefone (ex: Ativar 5562...)
            if (numbersInText.length >= 10) {
                const possiblePhones = getPhoneVariations(numbersInText);
                const inQueryPossible = possiblePhones.join(',');

                const { data: userToLink } = await supabase
                    .from('user_settings')
                    .select('*')
                    .or(`whatsapp_phone.in.(${inQueryPossible}),partner_phone.in.(${inQueryPossible})`)
                    .maybeSingle();

                if (userToLink) {
                    // 🟢 MAGIA AQUI: Ele descobre se quem está ativando é o Titular ou o Parceiro
                    const partnerClean = userToLink.partner_phone?.replace(/\D/g, '');
                    const isPartnerActivating = partnerClean && possiblePhones.some(v => partnerClean.includes(v));

                    if (isPartnerActivating) {
                        // Salva o código fantasma na gaveta do PARCEIRO
                        await supabase.from('user_settings').update({ partner_whatsapp_id: senderId }).eq('user_id', userToLink.user_id);
                        await sendWhatsAppMessage(userToLink.partner_phone, `✅ *Parceiro vinculado com sucesso!* O Aliado já reconhece o seu aparelho. Pode mandar os gastos!`);
                    } else {
                        // Salva o código fantasma na gaveta do TITULAR
                        await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', userToLink.user_id);
                        await sendWhatsAppMessage(userToLink.whatsapp_phone, `✅ *Vinculado com sucesso!* O Aliado já reconhece o seu aparelho. Pode mandar os gastos!`);
                    }
                    return NextResponse.json({ success: true, action: "linked" });
                }
            }
            return NextResponse.json({ error: "User unknown" });
        }

        // 3. SE ACHOU, DEFINE PRA QUEM A MENSAGEM DEVE VOLTAR
        const isPartnerMessage = (userSettings.partner_whatsapp_id === senderId) || variations.some(v => userSettings.partner_phone?.includes(v));
        
        const targetPhone = isPartnerMessage
            ? userSettings.partner_phone
            : userSettings.whatsapp_phone;

        // --- A PARTIR DAQUI O CÓDIGO USA O NÚMERO LIMPO (targetPhone) ---

        const alreadyProcessed = await redis.get(`msg:${messageId}`);
        if (alreadyProcessed) return NextResponse.json({ status: 'Ignored Duplicate' });
        await redis.set(`msg:${messageId}`, '1', { ex: 86400 });

        const { success: rateLimitSuccess } = await ratelimit.limit(targetPhone);
        if (!rateLimitSuccess) {
            await sendWhatsAppMessage(targetPhone, "⏳ Calma! Você está enviando mensagens muito rápido. Aguarde um minuto.");
            return NextResponse.json({ status: 'Rate Limited' });
        }

        const pendingDeleteStr = await redis.get(`pending_delete:${targetPhone}`);
        if (pendingDeleteStr) {
            const userInput = messageContent.trim().toUpperCase();
            if (userInput === 'SIM') {
                const cmd = typeof pendingDeleteStr === 'string' ? JSON.parse(pendingDeleteStr) : pendingDeleteStr;

                const ALLOWED_TABLES = ['transactions', 'installments', 'recurring'];
                if (!ALLOWED_TABLES.includes(cmd.table)) {
                    await sendWhatsAppMessage(targetPhone, '⚠️ Operação inválida.');
                    await redis.del(`pending_delete:${targetPhone}`);
                    return NextResponse.json({ status: 'Blocked' });
                }

                const { data: items } = await supabase
                    .from(cmd.table)
                    .select('id, title')
                    .eq('user_id', userSettings.user_id)
                    .ilike('title', `%${cmd.data.title}%`)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (items?.length) {
                    await supabase.from(cmd.table).delete().eq('id', items[0].id);
                    await sendWhatsAppMessage(targetPhone, `🗑️ Apagado com sucesso: "${items[0].title}"`);
                } else {
                    await sendWhatsAppMessage(targetPhone, `⚠️ Não encontrei o item para apagar.`);
                }
                await redis.del(`pending_delete:${targetPhone}`);
                return NextResponse.json({ success: true, action: "deleted_confirmed" });
            } else {
                await redis.del(`pending_delete:${targetPhone}`);
                await sendWhatsAppMessage(targetPhone, `❌ Exclusão cancelada. Sobre o que você quer falar agora?`);
                return NextResponse.json({ success: true, action: "deleted_cancelled" });
            }
        }

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
                await sendWhatsAppMessage(targetPhone, "⚠️ Ocorreu um erro ao processar o seu áudio. Pode me mandar em texto?");
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
                await sendWhatsAppMessage(targetPhone, "⚠️ Não consegui ler a imagem. Pode tentar enviar de novo?");
                return NextResponse.json({ status: 'Image Failed' });
            }
        }
        else {
            if (!messageContent) return NextResponse.json({ status: 'No Content' });
            promptParts.push(messageContent);
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('plan_tier')
            .eq('id', userSettings.user_id)
            .single();
        const plan = profile?.plan_tier || 'free';

        if (!['pro', 'agent', 'admin'].includes(plan)) {
            await sendWhatsAppMessage(targetPhone, "🚫 *Acesso Exclusivo PRO*\n\nA Inteligência Artificial no WhatsApp está disponível apenas nos planos **Pro** e **Consultor**.", 100);
            return NextResponse.json({ status: 'Blocked by Plan', plan });
        }

        const { data: workspaces } = await supabase
            .from('workspaces')
            .select('id, title, whatsapp_rule')
            .eq('user_id', userSettings.user_id);

        const primaryWorkspace = workspaces?.[0];

        let contextInfo = { saldo: "0", entradas: "0", saidas: "0", resumo_texto: "Sem dados", estado_conta: "Indefinido" };
        if (primaryWorkspace) {
            contextInfo = await getFinancialContext(supabase, userSettings.user_id, primaryWorkspace.id);
        }

        let workspacesContextPrompt = "";
        if (workspaces && workspaces.length > 1) {
            workspacesContextPrompt = `
            ━━━ ÁREAS DE TRABALHO (WORKSPACES) ━━━
            O usuário tem múltiplas contas. Inclua o campo "context" no JSON com o ID correto.
            `;
            workspaces.forEach((ws) => {
                const safeRule = (ws.whatsapp_rule || 'Geral').slice(0, 200).replace(/["{}[\]]/g, '');
                workspacesContextPrompt += `- ID: "${ws.id}" | Nome: "${ws.title}" | Regra: "${safeRule}"\n`;
            });
            workspacesContextPrompt += `
            CRITÉRIOS:
            1. Se o usuário mencionou o nome de uma conta, use o ID dela.
            2. Cruze o texto/foto com a "Regra" para deduzir a conta correta.
            3. Se impossível deduzir, use "context": "${primaryWorkspace?.id}".
            `;
        } else if (primaryWorkspace) {
            workspacesContextPrompt = `Sempre inclua "context": "${primaryWorkspace.id}" no JSON.\n`;
        }

        const dataHojeBR = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const cartoesCadastrados = ['nubank', 'inter', 'bb', 'itau', 'santander', 'caixa', 'bradesco', 'c6'];

        const systemPrompt = `
            IDENTIDADE: Você é "Meu Aliado", assistente financeiro pessoal via WhatsApp.
            Tom: amigável, direto, humano. Nunca robótico.
            DATA DE HOJE: ${dataHojeBR}.

            ━━━ SITUAÇÃO FINANCEIRA DO MÊS ━━━
            💰 Receitas:  R$ ${contextInfo.entradas}
            💸 Despesas:  R$ ${contextInfo.saidas}
            📊 Saldo:     R$ ${contextInfo.saldo}
            ⚠️  Status:   ${contextInfo.estado_conta}
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

            COMO AGIR:
            [BATE-PAPO / SALDO] → Responda naturalmente. Seja breve.
            [APAGAR/REMOVER] → Monte o JSON com action: "remove".
            [REGISTRO] → Siga as Regras de Roteamento abaixo.

            ${workspacesContextPrompt}

            🧠 REGRAS DE ROTEAMENTO:
            
            1. 💳 CARTÃO DE CRÉDITO (se mencionar banco/cartão):
            {"action":"add","table":"installments","context":"ID","data":{"title":"...","value_per_month":0.00,"installments_count":1,"payment_method":"banco"}}

            2. 🔁 GASTO FIXO (fixo, todo mês, assinatura):
            {"action":"add","table":"recurring","context":"ID","data":{"title":"...","value":0.00,"type":"expense","due_day":10}}

            3. 💸 GASTO COMUM (débito, pix, dinheiro):
            {"action":"add","table":"transactions","context":"ID","data":{"title":"...","amount":0.00,"type":"expense","date":"DD/MM/YYYY"}}

            REGRAS ABSOLUTAS:
            ✅ Saída SEMPRE como array JSON válido.
            ✅ Respostas curtas (WhatsApp).
            ✅ Valores sempre float (ex: 49.90).
            ✅ SEMPRE inclua: {"reply": "mensagem curta de confirmação"}
            ✅ Cartões disponíveis: ${cartoesCadastrados.join(', ')}

            ${hasAudio ? "\n⚠️ ÁUDIO RECEBIDO: Transcreva e responda com base no que foi dito." : ""}
            ${hasImage ? "\n📸 IMAGEM RECEBIDA: Extraia valor, data e estabelecimento. Tente identificar forma de pagamento." : ""}
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
            await sendWhatsAppMessage(targetPhone, "Desculpe, tive uma travada agora. Pode mandar de novo? 🤖");
            return NextResponse.json({ success: false, reason: 'AI/JSON Error' });
        }

        let replySent = false;
        const ALLOWED_TABLES = ['transactions', 'installments', 'recurring'];
        const validContextIds = new Set(workspaces?.map(w => w.id) || []);

        for (const cmd of commands) {
            if (cmd.table && !ALLOWED_TABLES.includes(cmd.table)) {
                console.warn(`⛔ Tabela bloqueada pela IA: ${cmd.table}`);
                continue;
            }

            if (cmd.action === 'add') {
                if (isPartnerMessage && cmd.data?.title && !cmd.data.title.includes('[Parceiro]')) {
                    cmd.data.title = `[Parceiro] ${cmd.data.title}`;
                }

                const targetContext = (cmd.context && validContextIds.has(cmd.context))
                    ? cmd.context
                    : (primaryWorkspace?.id || null);

                let payload: any = {
                    ...cmd.data,
                    user_id: userSettings.user_id,
                    context: targetContext,
                    created_at: new Date(),
                    message_id: messageId
                };

                const extractedValue = parseFloat(cmd.data?.amount)
                    || parseFloat(cmd.data?.value)
                    || parseFloat(cmd.data?.value_per_month)
                    || parseFloat(cmd.data?.total_value)
                    || 0;
                if (extractedValue <= 0) continue;

                if (cmd.table === 'installments') {
                    payload.current_installment = 0;
                    payload.status = 'active';
                    payload.due_day = cmd.data.due_day || 10;
                    if (!payload.installments_count) payload.installments_count = 1;
                    if (!payload.payment_method) payload.payment_method = 'outros';
                    delete payload.date; delete payload.target_month; delete payload.is_paid;
                    const { error } = await supabase.from('installments').insert([payload]);
                    if (error && error.code === '23505') { replySent = true; continue; }
                    if (!error && !commands.some((c: any) => c.reply)) {
                        await sendWhatsAppMessage(targetPhone, `✅ Gasto salvo no cartão: ${cmd.data.title}`);
                    }
                }
                else if (cmd.table === 'recurring') {
                    payload.status = 'active';
                    delete payload.is_paid; delete payload.amount; delete payload.date;
                    const { error } = await supabase.from('recurring').insert([payload]);
                    if (error && error.code === '23505') { replySent = true; continue; }
                    if (!error && !commands.some((c: any) => c.reply)) {
                        await sendWhatsAppMessage(targetPhone, `✅ Fixo salvo: ${cmd.data.title}`);
                    }
                }
                else if (cmd.table === 'transactions') {
                    if (!payload.date) {
                        const hoje = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
                        const dStr = String(hoje.getDate()).padStart(2, '0');
                        const mStr = String(hoje.getMonth() + 1).padStart(2, '0');
                        payload.date = `${dStr}/${mStr}/${hoje.getFullYear()}`;
                    }
                    payload.is_paid = true;
                    payload.status = 'paid';
                    const { error } = await supabase.from('transactions').insert([payload]);
                    if (error && error.code === '23505') { replySent = true; continue; }
                    if (!error && !commands.some((c: any) => c.reply)) {
                        await sendWhatsAppMessage(targetPhone, `✅ Lançado: ${cmd.data.title}`);
                    }
                }
            }
            else if (cmd.action === 'remove') {
                await sendWhatsAppMessage(targetPhone, `⚠️ Você quer apagar "${cmd.data.title}"? Responda *SIM* para confirmar.`);
                await redis.set(`pending_delete:${targetPhone}`, JSON.stringify(cmd), { ex: 300 });
                replySent = true;
            }

            if (cmd.reply && !replySent) {
                await sendWhatsAppMessage(targetPhone, cmd.reply);
                replySent = true;
            }
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error("🔥 ERRO FATAL NO WEBHOOK:", e);
        return NextResponse.json({ error: e.message, status: "Caught" }, { status: 200 });
    }
}