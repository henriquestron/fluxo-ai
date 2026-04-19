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

async function sendWhatsAppMessage(phone: string, text: string, delay: number = 1200) {
    const variations = getPhoneVariations(phone);
    let success = false;
    for (const v of variations) {
        if (success) break;
        const finalJid = `${v}@s.whatsapp.net`;
        try {
            console.log(`📤 Tentando enviar para ${finalJid}...`);
            const res = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
                method: 'POST',
                headers: { 'apikey': EVOLUTION_API_KEY as string, 'Content-Type': 'application/json' },
                body: JSON.stringify({ number: finalJid, options: { delay }, textMessage: { text } })
            });
            const json = await res.json();
            if (res.ok || json?.status === 'SUCCESS' || json?.key?.id) {
                console.log(`✅ Sucesso: ${finalJid}`);
                success = true;
            } else {
                console.log(`⚠️ Falha: ${finalJid}. Erro:`, json?.error || 'Bad Request');
            }
        } catch (e) { console.error(`❌ Erro envio para ${finalJid}:`, e); }
    }
    if (!success) console.log("🚨 Nenhuma variação funcionou.");
}

async function downloadMedia(url: string) {
    try {
        const response = await fetch(url, { headers: { 'apikey': EVOLUTION_API_KEY as string } });
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer).toString('base64');
    } catch (error) { return null; }
}


// ============================================================================
// CONTEXTO FINANCEIRO COMPLETO (Com Efeito Cascata do Painel)
// ============================================================================
async function getFinancialContext(supabase: any, userId: string, workspaceId: string) {
    const today = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentYear = today.getFullYear();
    const activeMonthIdx = today.getMonth();
    const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const currentMonthName = MONTHS[activeMonthIdx];
    const currentTag = `${currentMonthName}/${currentYear}`;

    const [transRes, recRes, instRes] = await Promise.all([
        supabase.from('transactions').select('type, amount, date, status, title, category, is_paid, target_month').eq('user_id', userId).eq('context', workspaceId),
        supabase.from('recurring').select('type, value, custom_values, start_date, created_at, status, paid_months, skipped_months, standby_months, title, category, due_day').eq('user_id', userId).eq('context', workspaceId),
        supabase.from('installments').select('value_per_month, total_value, start_date, created_at, status, paid_months, standby_months, current_installment, installments_count, title, payment_method, due_day').eq('user_id', userId).eq('context', workspaceId)
    ]);

    const transactions = transRes.data || [];
    const recurring = recRes.data || [];
    const installments = instRes.data || [];

    const getStartData = (item: any) => {
        if (item.start_date) {
            if (item.start_date.includes('-')) { const p = item.start_date.split('-'); return { m: parseInt(p[1]) - 1, y: parseInt(p[0]) }; }
            if (item.start_date.includes('/')) { const p = item.start_date.split('/'); return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) }; }
        }
        if (item.date && item.date.includes('/')) { const p = item.date.split('/'); return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) }; }
        if (item.created_at) { const d = new Date(item.created_at); return { m: d.getMonth(), y: d.getFullYear() }; }
        return { m: 0, y: currentYear };
    };

    // Leitor de datas blindado para o banco (2026-04-19 12:00) e para o app (19/04/2026)
    const isDateInMonth = (dateStr: string, mIdx: number, year: number) => {
        if (!dateStr) return false;
        if (dateStr.includes('/')) {
            const p = dateStr.split('/');
            return parseInt(p[1]) === (mIdx + 1) && parseInt(p[2]) === year;
        }
        if (dateStr.includes('-')) {
            const p = dateStr.split('-');
            return parseInt(p[1]) === (mIdx + 1) && parseInt(p[0]) === year;
        }
        return false;
    };

    const isItemInMonth = (item: any, mIdx: number, year: number) => {
        const mName = MONTHS[mIdx];
        const mTag = `${mName}/${year}`;
        if (item.target_month) return item.target_month === mName || item.target_month === mTag;
        return isDateInMonth(item.date, mIdx, year);
    };

    const getActualValue = (item: any, tag: string) => {
        if (item.custom_values && item.custom_values[tag] !== undefined) return Number(item.custom_values[tag]);
        return Number(item.value);
    };

    const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    // 🟢 MÁGICA: O Efeito Cascata Idêntico ao do Site
    let previousSurplus = 0;
    let computedInc = 0;
    let computedExp = 0;
    let computedBalance = 0;

    for (let idx = 0; idx <= activeMonthIdx; idx++) {
        const mName = MONTHS[idx];
        const pt = `${mName}/${currentYear}`;

        const inc =
            transactions.filter((t: any) => t.type === 'income' && isItemInMonth(t, idx, currentYear) && t.status !== 'delayed' && t.status !== 'standby')
                .reduce((a: number, i: any) => a + Number(i.amount), 0) +
            recurring.filter((r: any) => {
                const { m: sM, y: sY } = getStartData(r);
                const paid = r.paid_months?.includes(pt) || r.paid_months?.includes(mName);
                const standby = r.status === 'delayed' || r.status === 'standby' || (typeof r.standby_months === 'string' && (r.standby_months.includes(pt) || r.standby_months.includes(mName)));
                if (standby && !paid) return false;
                return r.type === 'income' && (currentYear > sY || (currentYear === sY && idx >= sM)) && !(typeof r.skipped_months === 'string' && (r.skipped_months.includes(mName) || r.skipped_months.includes(pt)));
            }).reduce((a: number, r: any) => a + getActualValue(r, pt), 0);

        const exp =
            transactions.filter((t: any) => t.type === 'expense' && isItemInMonth(t, idx, currentYear) && t.status !== 'delayed' && t.status !== 'standby')
                .reduce((a: number, i: any) => a + Number(i.amount), 0) +
            recurring.filter((r: any) => {
                const { m: sM, y: sY } = getStartData(r);
                const paid = r.paid_months?.includes(pt) || r.paid_months?.includes(mName);
                const standby = r.status === 'delayed' || r.status === 'standby' || (typeof r.standby_months === 'string' && (r.standby_months.includes(pt) || r.standby_months.includes(mName)));
                if (standby && !paid) return false;
                return r.type === 'expense' && (currentYear > sY || (currentYear === sY && idx >= sM)) && !(typeof r.skipped_months === 'string' && (r.skipped_months.includes(mName) || r.skipped_months.includes(pt)));
            }).reduce((a: number, r: any) => a + getActualValue(r, pt), 0) +
            installments.reduce((a: number, i: any) => {
                const paid = i.paid_months?.includes(pt) || i.paid_months?.includes(mName);
                const standby = i.status === 'delayed' || i.status === 'standby' || (typeof i.standby_months === 'string' && (i.standby_months.includes(pt) || i.standby_months.includes(mName)));
                if (standby && !paid) return a;
                const { m: sM, y: sY } = getStartData(i);
                const diff = ((currentYear - sY) * 12) + (idx - sM);
                const act = 1 + (i.current_installment || 0) + diff;
                return (act >= 1 && act <= i.installments_count) ? a + Number(i.value_per_month) : a;
            }, 0);

        const saldoMensal = inc - exp;
        const saldoAcumulado = saldoMensal + previousSurplus;

        if (idx === activeMonthIdx) {
            computedInc = inc;
            computedExp = exp;
            computedBalance = saldoAcumulado;
        }
        previousSurplus = saldoAcumulado;
    }

    // Filtros para mostrar detalhes (Pagas x Pendentes)
    const isPaid = (item: any) => item.is_paid || item.paid_months?.includes(currentTag) || item.paid_months?.includes(currentMonthName);

    const gastosTransacao = transactions.filter((t: any) => t.type === 'expense' && isItemInMonth(t, activeMonthIdx, currentYear) && t.status !== 'standby');
    const gastosFixos = recurring.filter((r: any) => {
        const { m: sM, y: sY } = getStartData(r);
        return r.type === 'expense' && (currentYear > sY || (currentYear === sY && activeMonthIdx >= sM)) && r.status !== 'standby' && !(typeof r.skipped_months === 'string' && r.skipped_months.includes(currentMonthName));
    });
    const parcelamentosDoMes = installments.filter((i: any) => {
        if (i.status === 'standby') return false;
        const { m: sM, y: sY } = getStartData(i);
        const diff = ((currentYear - sY) * 12) + (activeMonthIdx - sM);
        const act = 1 + (i.current_installment || 0) + diff;
        return act >= 1 && act <= i.installments_count;
    });

    const todasDespesas = [...gastosTransacao, ...gastosFixos, ...parcelamentosDoMes];
    const contasPagas = todasDespesas.filter(isPaid);
    const contasPendentes = todasDespesas.filter(i => !isPaid(i));
    const totalPendente = contasPendentes.reduce((a, i) => a + (Number(i.amount) || Number(i.value) || Number(i.value_per_month) || 0), 0);

    let estado = "ESTÁVEL 🟢";
    if (computedBalance < 0) estado = "CRÍTICO 🔴";
    else if (computedBalance < (computedInc * 0.1)) estado = "ALERTA 🟡";

    return {
        saldo: computedBalance.toFixed(2),
        entradas: computedInc.toFixed(2),
        saidas: computedExp.toFixed(2),
        estado_conta: estado,
        saldo_fmt: fmt(computedBalance),
        entradas_fmt: fmt(computedInc),
        saidas_fmt: fmt(computedExp),
        pendente_fmt: fmt(totalPendente),
        mes_atual: currentMonthName,
        contas_pagas: contasPagas.length,
        contas_pendentes: contasPendentes.length,
        detalhes_receitas: "", // Simplificado pro prompt ficar menor e mais rápido
        detalhes_gastos: "", 
        resumo_texto: `Receitas: ${fmt(computedInc)} | Despesas: ${fmt(computedExp)} | Saldo: ${fmt(computedBalance)}`
    };
}
// ============================================================================
// ============================================================================
// ============================================================================

export async function POST(req: Request) {
    try {
        const EVOLUTION_WEBHOOK_SECRET = process.env.EVOLUTION_WEBHOOK_SECRET;
        if (!EVOLUTION_WEBHOOK_SECRET) throw new Error('EVOLUTION_WEBHOOK_SECRET não definida');

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
        const senderRaw = remoteJid.split('@')[0].split(':')[0];
        const senderId = senderRaw.replace(/\D/g, '');
        const messageContent = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";

        // ── ETAPA 1: IDENTIFICAÇÃO ─────────────────────────────────────────────
        const variations = getPhoneVariations(senderId);
        const inQuery = variations.join(',');
        console.log(`📩 senderId: ${senderId} | variações: ${inQuery}`);

        let { data: userSettings } = await supabase
            .from('user_settings')
            .select('user_id, whatsapp_phone, whatsapp_id, partner_phone, partner_whatsapp_id')
            .or(`whatsapp_id.eq.${senderId},partner_whatsapp_id.eq.${senderId},whatsapp_phone.in.(${inQuery}),partner_phone.in.(${inQuery})`)
            .maybeSingle();

        // Fallback com senderRaw para @lid
        if (!userSettings && senderRaw !== senderId) {
            const { data: found } = await supabase
                .from('user_settings')
                .select('user_id, whatsapp_phone, whatsapp_id, partner_phone, partner_whatsapp_id')
                .or(`whatsapp_id.eq.${senderRaw},partner_whatsapp_id.eq.${senderRaw}`)
                .maybeSingle();
            if (found) {
                userSettings = found;
                console.log(`✅ Encontrado pelo fallback raw: ${senderRaw}`);
            }
        }

        // ── FLUXO DE ATIVAÇÃO ──────────────────────────────────────────────────
        if (!userSettings) {
            const numbersInText = messageContent.replace(/\D/g, '');
            if (numbersInText.length >= 10) {
                const possiblePhones = getPhoneVariations(numbersInText);
                const inQueryPossible = possiblePhones.join(',');
                const { data: userToLink } = await supabase
                    .from('user_settings')
                    .select('user_id, whatsapp_phone, partner_phone')
                    .or(`whatsapp_phone.in.(${inQueryPossible}),partner_phone.in.(${inQueryPossible})`)
                    .maybeSingle();

                if (userToLink) {
                    const partnerClean = userToLink.partner_phone?.replace(/\D/g, '') || '';
                    const isPartnerActivating = partnerClean.length >= 8 &&
                        possiblePhones.some(v => v.replace(/\D/g, '').includes(partnerClean.slice(-8)));

                    if (isPartnerActivating) {
                        await supabase.from('user_settings').update({ partner_whatsapp_id: senderId }).eq('user_id', userToLink.user_id);
                        await sendWhatsAppMessage(userToLink.partner_phone, `✅ *Parceiro vinculado!* Pode mandar seus gastos agora! 🎉`);
                    } else {
                        await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', userToLink.user_id);
                        await sendWhatsAppMessage(userToLink.whatsapp_phone, `✅ *Vinculado com sucesso!* Pode mandar seus gastos agora! 🎉`);
                    }
                    return NextResponse.json({ success: true, action: "linked" });
                }
            }
            return NextResponse.json({ error: "User unknown" });
        }

        // ── ETAPA 2: TARGET PHONE ──────────────────────────────────────────────
        const partnerClean = userSettings.partner_phone?.replace(/\D/g, '') || '';
        const isPartnerMessage =
            userSettings.partner_whatsapp_id === senderId ||
            userSettings.partner_whatsapp_id === senderRaw ||
            (partnerClean.length >= 8 && senderId.includes(partnerClean.slice(-8)));

        const targetPhone = isPartnerMessage ? userSettings.partner_phone : userSettings.whatsapp_phone;
        console.log(`👤 user: ${userSettings.user_id} | parceiro: ${isPartnerMessage} | target: ${targetPhone}`);

        // ── ETAPA 3: ANTI-DUPLICIDADE E RATE LIMIT ─────────────────────────────
        const alreadyProcessed = await redis.get(`msg:${messageId}`);
        if (alreadyProcessed) return NextResponse.json({ status: 'Ignored Duplicate' });
        await redis.set(`msg:${messageId}`, '1', { ex: 86400 });

        const { success: rateLimitSuccess } = await ratelimit.limit(targetPhone);
        if (!rateLimitSuccess) {
            await sendWhatsAppMessage(targetPhone, "⏳ Muitas mensagens! Aguarde um minuto.");
            return NextResponse.json({ status: 'Rate Limited' });
        }

        // ── ETAPA 4: DELEÇÃO PENDENTE ──────────────────────────────────────────
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
                const { data: items } = await supabase.from(cmd.table).select('id, title')
                    .eq('user_id', userSettings.user_id).ilike('title', `%${cmd.data.title}%`)
                    .order('created_at', { ascending: false }).limit(1);

                if (items?.length) {
                    await supabase.from(cmd.table).delete().eq('id', items[0].id);
                    await sendWhatsAppMessage(targetPhone, `🗑️ Apagado: "${items[0].title}"`);
                } else {
                    await sendWhatsAppMessage(targetPhone, `⚠️ Não encontrei o item.`);
                }
                await redis.del(`pending_delete:${targetPhone}`);
                return NextResponse.json({ success: true, action: "deleted_confirmed" });
            } else {
                await redis.del(`pending_delete:${targetPhone}`);
                await sendWhatsAppMessage(targetPhone, `❌ Exclusão cancelada.`);
                return NextResponse.json({ success: true, action: "deleted_cancelled" });
            }
        }

        // ── ETAPA 5: PROCESSAR MÍDIA ───────────────────────────────────────────
        let promptParts: any[] = [];
        let hasAudio = false, hasImage = false;
        const msgData = body.data?.message;
        const msgType = body.data?.messageType;

        if (msgType === "audioMessage" || msgData?.audioMessage) {
            let audioBase64 = body.data?.base64 || msgData?.audioMessage?.base64 || body.data?.message?.base64;
            if (!audioBase64) { const url = msgData?.audioMessage?.url || body.data?.mediaUrl; if (url) audioBase64 = await downloadMedia(url); }
            if (audioBase64) { hasAudio = true; promptParts.push({ inlineData: { mimeType: "audio/ogg", data: audioBase64 } }); }
            else { await sendWhatsAppMessage(targetPhone, "⚠️ Erro no áudio. Pode mandar em texto?"); return NextResponse.json({ status: 'Audio Failed' }); }
        } else if (msgType === "imageMessage" || msgData?.imageMessage) {
            let imageBase64 = body.data?.base64 || msgData?.imageMessage?.base64 || body.data?.message?.base64;
            if (!imageBase64) { const url = msgData?.imageMessage?.url || body.data?.mediaUrl; if (url) imageBase64 = await downloadMedia(url); }
            if (imageBase64) {
                hasImage = true;
                promptParts.push({ inlineData: { mimeType: msgData?.imageMessage?.mimetype || "image/jpeg", data: imageBase64 } });
                if (msgData?.imageMessage?.caption) promptParts.push(msgData.imageMessage.caption);
            } else { await sendWhatsAppMessage(targetPhone, "⚠️ Não consegui ler a imagem."); return NextResponse.json({ status: 'Image Failed' }); }
        } else {
            if (!messageContent) return NextResponse.json({ status: 'No Content' });
            promptParts.push(messageContent);
        }

        // ── ETAPA 6: VERIFICAR PLANO ───────────────────────────────────────────
        const { data: profile } = await supabase.from('profiles').select('plan_tier').eq('id', userSettings.user_id).single();
        const plan = profile?.plan_tier || 'free';
        if (!['pro', 'agent', 'admin'].includes(plan)) {
            await sendWhatsAppMessage(targetPhone, "🚫 *Acesso PRO*\n\nEsse recurso é exclusivo dos planos Pro e Consultor.", 100);
            return NextResponse.json({ status: 'Blocked by Plan', plan });
        }

        // ── ETAPA 7: CONTEXTO E WORKSPACES ────────────────────────────────────
        const { data: workspaces } = await supabase.from('workspaces').select('id, title, whatsapp_rule').eq('user_id', userSettings.user_id);
        const primaryWorkspace = workspaces?.[0];

        let ctx = {
            saldo_fmt: "R$ 0,00", entradas_fmt: "R$ 0,00", saidas_fmt: "R$ 0,00",
            pendente_fmt: "R$ 0,00", mes_atual: "Mês", estado_conta: "Indefinido",
            contas_pagas: 0, contas_pendentes: 0,
            detalhes_receitas: "", detalhes_gastos: "", resumo_texto: "Sem dados",
            saldo: "0", entradas: "0", saidas: "0"
        };
        if (primaryWorkspace) ctx = await getFinancialContext(supabase, userSettings.user_id, primaryWorkspace.id);

        let workspacesContextPrompt = "";
        if (workspaces && workspaces.length > 1) {
            workspacesContextPrompt = `\n━━━ ÁREAS DE TRABALHO ━━━\nInclua "context" no JSON com o ID correto.\n`;
            workspaces.forEach((ws) => {
                const safeRule = (ws.whatsapp_rule || 'Geral').slice(0, 200).replace(/["{}[\]]/g, '');
                workspacesContextPrompt += `- ID: "${ws.id}" | Nome: "${ws.title}" | Regra: "${safeRule}"\n`;
            });
            workspacesContextPrompt += `Se não souber, use context: "${primaryWorkspace?.id}".\n`;
        } else if (primaryWorkspace) {
            workspacesContextPrompt = `Inclua "context": "${primaryWorkspace.id}" em todos os JSONs.\n`;
        }

        const dataHojeBR = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const cartoesCadastrados = ['nubank', 'inter', 'bb', 'itau', 'santander', 'caixa', 'bradesco', 'c6'];
        if (messageContent.trim().toUpperCase() === 'DEBUG') {
            console.log("=== 🕵️‍♂️ LOG DE DEBUG FINANCEIRO ===");
            console.log(JSON.stringify(ctx, null, 2)); // Cospe o JSON inteiro na Vercel
            
            const msgDebug = `🛠️ *MODO RAIO-X ATIVADO* 🛠️\n\n` +
                             `*Mês Lida:* ${ctx.mes_atual}\n` +
                             `*Entradas no Mês:* ${ctx.entradas_fmt}\n` +
                             `*Saídas no Mês:* ${ctx.saidas_fmt}\n` +
                             `*SALDO ACUMULADO:* ${ctx.saldo_fmt}\n\n` +
                             `De onde veio isso? Acabei de imprimir o JSON completo no console da sua Vercel. Vá lá em "Logs" e veja a matemática exata!`;
            
            await sendWhatsAppMessage(targetPhone, msgDebug);
            return NextResponse.json({ success: true, debug: true });
        }
        // ── ETAPA 8: SYSTEM PROMPT ─────────────────────────────────────────────
        const systemPrompt = `
IDENTIDADE: Você é "Meu Aliado", assistente financeiro pessoal via WhatsApp.
Tom: amigável, direto, humano. Nunca robótico. Respostas curtas.
DATA DE HOJE: ${dataHojeBR} | MÊS ATUAL: ${ctx.mes_atual}

━━━ SITUAÇÃO FINANCEIRA DE ${ctx.mes_atual.toUpperCase()} ━━━
💰 Receitas:   ${ctx.entradas_fmt}
💸 Despesas:   ${ctx.saidas_fmt}
📊 Saldo:      ${ctx.saldo_fmt}
⏳ A pagar:    ${ctx.pendente_fmt} (${ctx.contas_pendentes} conta(s) pendente(s))
✅ Pagas:      ${ctx.contas_pagas} conta(s)
⚠️ Status:    ${ctx.estado_conta}
${ctx.detalhes_receitas}${ctx.detalhes_gastos}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${workspacesContextPrompt}

🧠 REGRAS DE ROTEAMENTO (FORMATOS JSON OBRIGATÓRIOS):

1. 💳 CARTÃO DE CRÉDITO (se mencionar banco, fatura ou cartão):
Bancos: ${cartoesCadastrados.join(', ')}
{"action":"add","table":"installments","context":"ID","data":{"title":"Nome","value_per_month":0.00,"installments_count":1,"payment_method":"banco","due_day":10}}

2. 🔁 GASTO FIXO (fixo, todo mês, assinatura, aluguel):
{"action":"add","table":"recurring","context":"ID","data":{"title":"Nome","value":0.00,"type":"expense","due_day":10}}

3. 💸 GASTO COMUM (débito, pix, dinheiro):
{"action":"add","table":"transactions","context":"ID","data":{"title":"Nome","amount":0.00,"type":"expense","date":"DD/MM/YYYY"}}

4. 💰 RECEITA (salário, pix recebido, freela):
{"action":"add","table":"transactions","context":"ID","data":{"title":"Nome","amount":0.00,"type":"income","date":"DD/MM/YYYY"}}

5. 🗑️ APAGAR gasto:
{"action":"remove","table":"transactions","data":{"title":"Nome aproximado"}}

6. 💬 PERGUNTAS SOBRE FINANÇAS (saldo, situação, dívidas, contas):
Use os dados acima para responder de forma humanizada.
Para falar de valores, use formato R$ X.XXX,XX.
Se perguntarem sobre situação geral, mencione saldo, pendências e dê uma dica.

REGRAS ABSOLUTAS:
✅ Retorne SEMPRE um array JSON válido. Zero texto fora do array.
✅ Valores financeiros: float com ponto (2000.00). NUNCA vírgula ou aspas em números.
✅ SEMPRE inclua {"reply": "resposta ao usuário"} no array.
✅ Para perguntas sem inserção no banco: retorne apenas [{"reply": "sua resposta"}].
✅ Pode usar emojis e \\n nas respostas de texto para organizar.

${hasAudio ? "\n⚠️ ÁUDIO: Transcreva e responda com base no que foi dito." : ""}
${hasImage ? "\n📸 IMAGEM: Extraia valor, data e estabelecimento. Identifique a forma de pagamento." : ""}
        `.trim();

        const finalPrompt = [systemPrompt, ...promptParts];

        // ── ETAPA 9: CHAMAR A IA ───────────────────────────────────────────────
        let commands: any[] = [];
        try {
            const result = await model.generateContent(finalPrompt);
            let cleanJson = result.response.text().split('```json').join('').split('```').join('').trim();
            const arrayMatch = cleanJson.match(/\[[\s\S]*\]/);
            if (arrayMatch) cleanJson = arrayMatch[0];
            commands = JSON.parse(cleanJson);
            if (!Array.isArray(commands)) commands = [commands];
        } catch (error: any) {
            console.error("❌ ERRO IA/JSON:", error);
            await sendWhatsAppMessage(targetPhone, "Tive uma travada agora. Pode mandar de novo? 🤖");
            return NextResponse.json({ success: false, reason: 'AI/JSON Error' });
        }

        // ── ETAPA 10: EXECUTAR COMANDOS ────────────────────────────────────────
        let replySent = false;
        const ALLOWED_TABLES = ['transactions', 'installments', 'recurring'];
        const validContextIds = new Set(workspaces?.map(w => w.id) || []);

        for (const cmd of commands) {
            if (cmd.table && !ALLOWED_TABLES.includes(cmd.table)) {
                console.warn(`⛔ Tabela bloqueada: ${cmd.table}`); continue;
            }

            if (cmd.action === 'add') {
                if (isPartnerMessage && cmd.data?.title && !cmd.data.title.includes('[Parceiro]')) {
                    cmd.data.title = `[Parceiro] ${cmd.data.title}`;
                }

                const targetContext = (cmd.context && validContextIds.has(cmd.context)) ? cmd.context : (primaryWorkspace?.id || null);
                const extractedValue = parseFloat(cmd.data?.amount) || parseFloat(cmd.data?.value) || parseFloat(cmd.data?.value_per_month) || parseFloat(cmd.data?.total_value) || 0;
                if (extractedValue <= 0) continue;

                let payload: any = { ...cmd.data, user_id: userSettings.user_id, context: targetContext, created_at: new Date(), message_id: messageId };

                if (cmd.table === 'installments') {
                    payload.current_installment = 0;
                    payload.status = 'active';
                    payload.due_day = parseInt(cmd.data.due_day) || 10;
                    payload.installments_count = parseInt(cmd.data.installments_count) || 1;
                    payload.payment_method = cmd.data.payment_method || 'outros';
                    payload.value_per_month = extractedValue;
                    payload.total_value = extractedValue * payload.installments_count;
                    payload.paid_months = [];
                    delete payload.date; delete payload.target_month; delete payload.is_paid; delete payload.amount; delete payload.value;

                    const { error } = await supabase.from('installments').insert([payload]);
                    if (error) { console.error("❌ SUPABASE (installments):", error); if (!replySent) { await sendWhatsAppMessage(targetPhone, `❌ Erro ao salvar no cartão.`); replySent = true; } continue; }
                }
                else if (cmd.table === 'recurring') {
                    payload.status = 'active';
                    payload.value = extractedValue;
                    payload.paid_months = [];
                    payload.due_day = parseInt(cmd.data.due_day) || 10;
                    delete payload.is_paid; delete payload.amount; delete payload.date; delete payload.value_per_month;

                    const { error } = await supabase.from('recurring').insert([payload]);
                    if (error) { console.error("❌ SUPABASE (recurring):", error); if (!replySent) { await sendWhatsAppMessage(targetPhone, `❌ Erro ao salvar conta fixa.`); replySent = true; } continue; }
                }
                else if (cmd.table === 'transactions') {
                    if (!payload.date) {
                        const hoje = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
                        payload.date = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
                    }
                    payload.amount = extractedValue;
                    payload.is_paid = payload.type !== 'income';
                    payload.status = 'active';
                    payload.target_month = ctx.mes_atual;
                    delete payload.value; delete payload.value_per_month;

                    const { error } = await supabase.from('transactions').insert([payload]);
                    if (error) { console.error("❌ SUPABASE (transactions):", error); if (!replySent) { await sendWhatsAppMessage(targetPhone, `❌ Erro ao salvar transação.`); replySent = true; } continue; }
                }
            }
            else if (cmd.action === 'remove') {
                await sendWhatsAppMessage(targetPhone, `⚠️ Apagar "${cmd.data.title}"? Responda *SIM* para confirmar.`);
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
        console.error("🔥 ERRO FATAL:", e);
        return NextResponse.json({ error: e.message, status: "Caught" }, { status: 200 });
    }
}