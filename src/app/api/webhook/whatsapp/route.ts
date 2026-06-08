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
// CONTEXTO FINANCEIRO COMPLETO 
// ============================================================================
async function getFinancialContext(supabase: any, userId: string, workspaceId: string) {
    const today = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentYear = today.getFullYear();
    const activeMonthIdx = today.getMonth();
    const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const activeTab = MONTHS[activeMonthIdx];

    const [transRes, recRes, instRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', userId).eq('context', workspaceId),
        supabase.from('recurring').select('*').eq('user_id', userId).eq('context', workspaceId),
        supabase.from('installments').select('*').eq('user_id', userId).eq('context', workspaceId)
    ]);

    const transactions = transRes.data || [];
    const recurring = recRes.data || [];
    const installments = instRes.data || [];

    const safeArray = (val: any) => {
        if (Array.isArray(val)) return val;
        if (typeof val === 'string') {
            try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
        }
        return [];
    };

    const getMonthData = (monthName: string, monthIndex: number) => {
        const monthMap: Record<string, string> = { 'Jan': '/01', 'Fev': '/02', 'Mar': '/03', 'Abr': '/04', 'Mai': '/05', 'Jun': '/06', 'Jul': '/07', 'Ago': '/08', 'Set': '/09', 'Out': '/10', 'Nov': '/11', 'Dez': '/12' };
        const dateFilter = `${monthMap[monthName]}/${currentYear}`;
        const currentPaymentTag = `${monthName}/${currentYear}`;

        const currentYYYYMM = `${currentYear}-${String(monthIndex + 1).padStart(2, '0')}`;

        const getStartData = (item: any) => {
            if (item.start_date && item.start_date.includes('/')) {
                const p = item.start_date.split('/'); return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) };
            }
            if (item.date && item.date.includes('/')) {
                const p = item.date.split('/'); return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) };
            }
            if (item.created_at) {
                const d = new Date(new Date(item.created_at).toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
                return { m: d.getMonth(), y: d.getFullYear() };
            }
            return { m: 0, y: currentYear };
        };

        const isPaid = (item: any, tag: string) => {
            if (!item.paid_months) return false;
            const arr = safeArray(item.paid_months);
            return arr.includes(tag) || arr.includes(tag.split('/')[0]);
        };

        const getCustomValue = (item: any, tag: string, baseValue: number) => {
            if (!item.custom_values) return baseValue;
            const parsedCustom = typeof item.custom_values === 'string' ? JSON.parse(item.custom_values) : item.custom_values;
            return parsedCustom[tag] !== undefined ? Number(parsedCustom[tag]) : baseValue;
        };

        const activeRecurring = recurring.filter((r: any) => {
            const paid = isPaid(r, currentPaymentTag);
            if ((r.status === 'delayed' || r.status === 'standby') && !paid) return false;
            const standbyArr = safeArray(r.standby_months);
            if (standbyArr.includes(currentPaymentTag) && !paid) return false;
            if (r.cancelled_from && currentYYYYMM >= r.cancelled_from) return false;
            const { m: startMonth, y: startYear } = getStartData(r);
            if (currentYear > startYear) return true;
            if (currentYear === startYear && monthIndex >= startMonth) return true;
            return false;
        });

        const incomeFixed = activeRecurring.filter((r: any) => r.type === 'income' && !safeArray(r.skipped_months).includes(monthName)).reduce((acc: number, curr: any) => acc + getCustomValue(curr, currentPaymentTag, Number(curr.value)), 0);
        const incomeVariable = transactions.filter((t: any) => t.type === 'income' && t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby').reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
        const incomeTotal = incomeFixed + incomeVariable;

        const expenseFixed = activeRecurring.filter((r: any) => r.type === 'expense' && !safeArray(r.skipped_months).includes(monthName)).reduce((acc: number, curr: any) => acc + getCustomValue(curr, currentPaymentTag, Number(curr.value)), 0);
        const expenseVariable = transactions.filter((t: any) => t.type === 'expense' && t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby' && !t.linked_goal_id).reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

        const installTotal = installments.reduce((acc: number, curr: any) => {
            const paid = isPaid(curr, currentPaymentTag);
            if ((curr.status === 'delayed' || curr.status === 'standby') && !paid) return acc;
            const standbyArr = safeArray(curr.standby_months);
            if (standbyArr.includes(currentPaymentTag) && !paid) return acc;
            if (curr.cancelled_from && currentYYYYMM >= curr.cancelled_from) return acc;

            const { m: startMonth, y: startYear } = getStartData(curr);
            const monthsDiff = ((currentYear - startYear) * 12) + (monthIndex - startMonth);

            let pastStandbys = 0;
            for (let i = 0; i < monthsDiff; i++) {
                const checkM = (startMonth + i) % 12;
                const checkY = startYear + Math.floor((startMonth + i) / 12);
                if (standbyArr.includes(`${MONTHS[checkM]}/${checkY}`)) pastStandbys++;
            }

            const currentInstNum = 1 + (curr.current_installment || 0) + monthsDiff - pastStandbys;

            if (currentInstNum >= 1 && currentInstNum <= curr.installments_count) {
                return acc + getCustomValue(curr, currentPaymentTag, Number(curr.value_per_month));
            }
            return acc;
        }, 0);

        const expenseTotal = expenseVariable + expenseFixed + installTotal;

        let pendingAmount = 0;
        let pendingCount = 0;
        let paidCount = 0;
        let detalhesG = "";
        let detalhesR = "";

        if (monthIndex === activeMonthIdx) {
            detalhesR = "\n📥 RECEITAS:\n";
            activeRecurring.filter((r: any) => r.type === 'income' && !safeArray(r.skipped_months).includes(monthName)).forEach((r: any) => {
                const finalVal = getCustomValue(r, currentPaymentTag, Number(r.value));
                detalhesR += ` • ${r.title}: R$ ${finalVal.toFixed(2)}\n`;
            });
            transactions.filter((t: any) => t.type === 'income' && t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby').forEach((t: any) => {
                detalhesR += ` • ${t.title}: R$ ${Number(t.amount).toFixed(2)}\n`;
            });

            detalhesG = "\n📤 DESPESAS:\n";
            activeRecurring.filter((r: any) => r.type === 'expense' && !safeArray(r.skipped_months).includes(monthName)).forEach((r: any) => {
                const pd = isPaid(r, currentPaymentTag);
                const finalVal = getCustomValue(r, currentPaymentTag, Number(r.value));
                if (!pd) { pendingCount++; pendingAmount += finalVal; } else { paidCount++; }
                detalhesG += ` ${pd ? "✅" : "⏳"} ${r.title}: R$ ${finalVal.toFixed(2)}\n`;
            });
            transactions.filter((t: any) => t.type === 'expense' && t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby' && !t.linked_goal_id).forEach((t: any) => {
                const pd = t.is_paid;
                if (!pd) { pendingCount++; pendingAmount += Number(t.amount); } else { paidCount++; }
                detalhesG += ` ${pd ? "✅" : "⏳"} ${t.title}: R$ ${Number(t.amount).toFixed(2)}\n`;
            });
            installments.forEach((curr: any) => {
                if (curr.cancelled_from && currentYYYYMM >= curr.cancelled_from) return;
                const pd = isPaid(curr, currentPaymentTag);
                const standbyArr = safeArray(curr.standby_months);
                if ((curr.status === 'delayed' || curr.status === 'standby') && !pd) return;
                if (standbyArr.includes(currentPaymentTag) && !pd) return;

                const { m: startMonth, y: startYear } = getStartData(curr);
                const monthsDiff = ((currentYear - startYear) * 12) + (monthIndex - startMonth);
                
                let pastStandbys = 0;
                for (let i = 0; i < monthsDiff; i++) {
                    const checkM = (startMonth + i) % 12;
                    const checkY = startYear + Math.floor((startMonth + i) / 12);
                    if (standbyArr.includes(`${MONTHS[checkM]}/${checkY}`)) pastStandbys++;
                }

                const currentInstNum = 1 + (curr.current_installment || 0) + monthsDiff - pastStandbys;
                
                if (currentInstNum >= 1 && currentInstNum <= curr.installments_count) {
                    const finalVal = getCustomValue(curr, currentPaymentTag, Number(curr.value_per_month));
                    if (!pd) { pendingCount++; pendingAmount += finalVal; } else { paidCount++; }
                    detalhesG += ` ${pd ? "✅" : "⏳"} ${curr.title} (${currentInstNum}/${curr.installments_count}x): R$ ${finalVal.toFixed(2)}\n`;
                }
            });
        }

        return {
            income: incomeTotal,
            expenseTotal: expenseTotal,
            balance: incomeTotal - expenseTotal,
            pendingCount, pendingAmount, paidCount, detalhesR, detalhesG
        };
    };

    let previousSurplus = 0;
    for (let i = 0; i < activeMonthIdx; i++) {
        const pastData = getMonthData(MONTHS[i], i);
        previousSurplus += pastData.balance;
    }

    const currentMonthData = getMonthData(activeTab, activeMonthIdx);
    const displayBalance = currentMonthData.balance + previousSurplus;

    const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    let estado = "ESTÁVEL 🟢";
    if (displayBalance < 0) estado = "CRÍTICO 🔴";
    else if (displayBalance < (currentMonthData.income * 0.1)) estado = "ALERTA 🟡";

    return {
        saldo: displayBalance.toFixed(2),
        entradas: currentMonthData.income.toFixed(2),
        saidas: currentMonthData.expenseTotal.toFixed(2),
        estado_conta: estado,
        saldo_fmt: fmt(displayBalance),
        entradas_fmt: fmt(currentMonthData.income),
        saidas_fmt: fmt(currentMonthData.expenseTotal),
        pendente_fmt: fmt(currentMonthData.pendingAmount),
        mes_atual: activeTab,
        contas_pagas: currentMonthData.paidCount,
        contas_pendentes: currentMonthData.pendingCount,
        detalhes_receitas: currentMonthData.detalhesR,
        detalhes_gastos: currentMonthData.detalhesG,
        resumo_texto: `Receitas: ${fmt(currentMonthData.income)} | Despesas: ${fmt(currentMonthData.expenseTotal)} | Saldo: ${fmt(displayBalance)}`
    };
}

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
        const model = genAI.getGenerativeModel({
            model: "gemini-flash-latest",
            generationConfig: { temperature: 0.8 }
        });

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
            .select('user_id, whatsapp_phone, whatsapp_id, partner_phone, partner_whatsapp_id, partner_name, bot_persona, bot_humor_level, bot_sincerity_level, bot_formality_level')
            .or(`whatsapp_id.eq.${senderId},partner_whatsapp_id.eq.${senderId},whatsapp_phone.in.(${inQuery}),partner_phone.in.(${inQuery})`)
            .maybeSingle();

        if (!userSettings && senderRaw !== senderId) {
            const { data: found } = await supabase
                .from('user_settings')
                .select('user_id, whatsapp_phone, whatsapp_id, partner_phone, partner_whatsapp_id, partner_name, bot_persona, bot_humor_level, bot_sincerity_level, bot_formality_level')
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
                    .select('user_id, whatsapp_phone, partner_phone, partner_name, bot_persona, bot_humor_level, bot_sincerity_level, bot_formality_level')
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

        // ── ETAPA 2: TARGET PHONE E QUEM ESTÁ FALANDO? ─────────────────────────
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

        // ── ETAPA 4: VERIFICAÇÃO DE MEMÓRIAS (DELETAR OU INSERIR) ──────────────
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

        // 🟢 BUSCANDO DADOS DE CONTAS PENDENTES NA MEMÓRIA
        const pendingInsertStr = await redis.get(`pending_insert:${targetPhone}`);

        // ── ETAPA 5: PROCESSAR MÍDIA E DOCUMENTOS ──────────────────────────────
        let promptParts: any[] = [];
        let hasAudio = false, hasImage = false, hasDocument = false;
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
        } else if (msgType === "documentMessage" || msgData?.documentMessage) {
            const docMsg = msgData?.documentMessage;
            if (docMsg?.mimetype === "application/pdf") {
                let pdfBase64 = body.data?.base64 || docMsg?.base64 || body.data?.message?.base64;
                if (!pdfBase64) { 
                    const url = docMsg?.url || body.data?.mediaUrl; 
                    if (url) pdfBase64 = await downloadMedia(url); 
                }
                if (pdfBase64) {
                    hasDocument = true;
                    promptParts.push({ inlineData: { mimeType: "application/pdf", data: pdfBase64 } });
                    if (docMsg?.caption) promptParts.push(docMsg.caption);
                    if (messageContent && !docMsg?.caption) promptParts.push(messageContent);
                } else { 
                    await sendWhatsAppMessage(targetPhone, "⚠️ Não consegui baixar o PDF. Pode mandar de novo?"); 
                    return NextResponse.json({ status: 'Document Failed' }); 
                }
            } else {
                if (!messageContent) return NextResponse.json({ status: 'No Content' });
                promptParts.push(messageContent);
            }
        } else {
            if (!messageContent) return NextResponse.json({ status: 'No Content' });
            promptParts.push(messageContent);
        }

        // ── ETAPA 6: VERIFICAR PLANO E NOME DO USUÁRIO ─────────────────────────
        const { data: profile } = await supabase
            .from('profiles')
            .select('plan_tier')
            .eq('id', userSettings.user_id)
            .single();
            
        const plan = profile?.plan_tier || 'free';

        const { data: authData } = await supabase.auth.admin.getUserById(userSettings.user_id);
        const fullPrimaryName = authData?.user?.user_metadata?.full_name;
        const primaryFirstName = fullPrimaryName ? fullPrimaryName.split(' ')[0] : 'chefe';

        const fullPartnerName = userSettings.partner_name || 'Parceiro';
        const partnerFirstName = fullPartnerName.split(' ')[0];

        const currentSpeakerName = isPartnerMessage ? partnerFirstName : primaryFirstName;

        if (!['pro', 'agent', 'admin'].includes(plan)) {
            await sendWhatsAppMessage(targetPhone, `🚫 *Acesso PRO*\n\nPoxa ${currentSpeakerName}, esse recurso é exclusivo dos planos Pro e Consultor.`, 100);
            return NextResponse.json({ status: 'Blocked by Plan', plan });
        }

        // ── ETAPA 7: CONTEXTO, WORKSPACES E CAIXINHAS ────────────────────────
        const { data: workspaces } = await supabase.from('workspaces').select('id, title, whatsapp_rule').eq('user_id', userSettings.user_id);
        const primaryWorkspace = workspaces?.[0];

        const { data: wallets } = await supabase.from('goals')
            .select('id, title, whatsapp_rule')
            .eq('user_id', userSettings.user_id)
            .eq('type', 'wallet')
            .eq('ai_enabled', true);

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

        let walletsContextPrompt = "";
        if (wallets && wallets.length > 0) {
            walletsContextPrompt = `\n━━━ 👛 CAIXINHAS (ORÇAMENTOS) ━━━\nSe o gasto combinar com a regra de uma das caixinhas abaixo, inclua a chave "linked_goal_id" com o ID numérico exato.\n`;
            wallets.forEach((w) => {
                const safeRule = (w.whatsapp_rule || 'Uso geral').slice(0, 200).replace(/["{}[\]]/g, '');
                walletsContextPrompt += `- ID: ${w.id} | Nome: "${w.title}" | Regra: "${safeRule}"\n`;
            });
            walletsContextPrompt += `Se o gasto NÃO combinar com nenhuma caixinha, omita a chave "linked_goal_id".\n`;
        }

        const dataHojeBR = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
        const cartoesCadastrados = ['nubank', 'inter', 'bb', 'itau', 'santander', 'caixa', 'bradesco', 'c6'];

        const humor = userSettings.bot_humor_level || 5;
        const sinceridade = userSettings.bot_sincerity_level || 5;
        const formalidade = userSettings.bot_formality_level || 5;

        const botPersona = userSettings.bot_persona || 'humorado';
        let personaPrompt = "";

        switch (botPersona) {
            case 'formal':
                personaPrompt = `Você é um assistente financeiro extremamente profissional, formal e objetivo. Foco absoluto na matemática e organização. Nunca faça piadas.`;
                break;
            case 'sincero':
                personaPrompt = `Você é sincera, estilo "puxão de orelha" rigorosa com gastos fúteis. Dê broncas curtas, diretas e irônicas se o usuário gastar com futilidades (iFood, besteiras). Mantenha o respeito, mas seja rígida.`;
                break;
            case 'personalizado':
                personaPrompt = `Aja de acordo com a seguinte personalidade em uma escala de 1 a 10:
- Nível de Humor: ${humor}/10 (1 = zero piadas, 10 = muito piadista e descontraída).
- Nível de Sinceridade/Bronca: ${sinceridade}/10 (1 = muito compreensiva, 10 = dá broncas severas e irônicas sobre gastos fúteis).
- Nível de Formalidade: ${formalidade}/10 (1 = usa gírias e fala como parceira íntima, 10 = extremamente culta e executiva).
Ajuste seu tom de fala exatamente para refletir essa combinação única em todas as suas respostas.`;
                break;
            case 'humorado':
            default:
                personaPrompt = `Você é muito descontraída, parceira e bem-humorada. Fale como se fosse uma amiga experiente ajudando. Faça piadas curtas, use emojis de forma natural e brinque levemente com as tentações de gastar dinheiro.`;
                break;
        }

        // 🟢 INSTRUÇÃO DE MEMÓRIA PARA A IA (Se houver algo pendente)
        let pendingPrompt = "";
        if (pendingInsertStr) {
            pendingPrompt = `\n⏳ MEMÓRIA DE CONTA PENDENTE:
O usuário enviou uma conta anteriormente, mas você precisou de confirmação. 
Dados extraídos anteriormente que estão na sua memória:
${pendingInsertStr}

Analise a resposta atual do usuário, combine com esses dados da memória (ajustando o mês alvo e se a conta já está paga ou pendente de acordo com o que ele falou) e retorne FINALMENTE a action "add" para salvar definitivamente!`;
        }

        const systemPrompt = `
IDENTIDADE: O seu nome é Luna. Você é a inteligência artificial oficial do sistema "Meu Aliado".
USUÁRIO ATUAL: Você está falando com ${currentSpeakerName}. Responda diretamente e o chame pelo nome de vez em quando.
PERSONALIDADE: ${personaPrompt}
${pendingPrompt}

REGRAS DE CONVERSAÇÃO:
- Suas respostas ("reply") devem ser sempre bem curtas e diretas, adequadas para leitura rápida no WhatsApp.
- Pareça o mais humana possível dentro do seu tipo de humor.

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
${walletsContextPrompt}

━━━ 🗂️ CATEGORIAS E SUBCATEGORIAS PERMITIDAS ━━━
[DESPESAS]
- Habitação: Aluguel, Condomínio, Água, Luz, Internet, Manutenção, Outros
- Alimentação: Supermercado, Restaurante, Ifood/Delivery, Padaria, Outros
- Transporte: Combustível, Uber/App, Ônibus/Metrô, Seguro, IPVA, Manutenção, Outros
- Saúde: Plano de Saúde, Farmácia, Consultas, Exames, Academia, Outros
- Educação: Faculdade, Cursos, Material Escolar, Outros
- Lazer: Assinaturas (Netflix, etc), Cinema, Shows, Viagens, Outros
- Compras: Roupas, Eletrônicos, Casa, Presentes, Pet, Outros
- Financeiro: Taxas, Juros, Impostos, Empréstimos, Seguros, Outros

[RECEITAS]
- Renda Principal: Salário, Pró-Labore, Aposentadoria, Outros
- Renda Extra: Freelance, Vendas, Aluguel Recebido, Outros
- Rendimentos: Dividendos, Juros Recebidos, Lucros, Outros

━━━ 🧱 ESTRUTURA OBRIGATÓRIA DO BANCO DE DADOS (SCHEMA LOCK) ━━━
É ESTRITAMENTE PROIBIDO inventar colunas que não estão nesta lista para cada tabela:
- Tabela "transactions": "title" (texto), "amount" (float), "type" (texto: 'income'/'expense'), "date" (DD/MM/YYYY), "category", "subcategory", "linked_goal_id" (inteiro, opcional).
- Tabela "recurring": "title" (texto), "value" (float), "type" (texto), "due_day" (inteiro), "category", "subcategory", "linked_goal_id" (inteiro, opcional).
- Tabela "installments": "title" (texto), "value_per_month" (float), "installments_count" (inteiro), "payment_method" (texto), "due_day" (inteiro), "start_date" (DD/MM/YYYY), "category", "subcategory", "linked_goal_id" (inteiro, opcional).

🧠 REGRAS DE ROTEAMENTO (FORMATOS JSON OBRIGATÓRIOS):
⚠️ CATEGORIZAÇÃO: Sempre inclua a chave "category" e "subcategory" escolhendo EXATAMENTE uma das opções da lista permitida.

1. 💳 CARTÃO DE CRÉDITO (se mencionar banco, fatura ou cartão):
Bancos: ${cartoesCadastrados.join(', ')}
{"action":"add","table":"installments","context":"ID","data":{"title":"Nome","value_per_month":0.00,"installments_count":1,"payment_method":"banco","due_day":10,"start_date":"10/MM/YYYY","category":"Alimentação","subcategory":"Ifood/Delivery"}}

2. 🔁 GASTO FIXO (fixo, todo mês, assinatura, aluguel):
{"action":"add","table":"recurring","context":"ID","data":{"title":"Nome","value":0.00,"type":"expense","due_day":10,"category":"Habitação","subcategory":"Aluguel"}}

3. 💸 GASTO COMUM (débito, pix, dinheiro):
{"action":"add","table":"transactions","context":"ID","data":{"title":"Nome","amount":0.00,"type":"expense","date":"DD/MM/YYYY","category":"Transporte","subcategory":"Uber/App"}}

4. 💰 RECEITA (salário, pix recebido, freela):
{"action":"add","table":"transactions","context":"ID","data":{"title":"Nome","amount":0.00,"type":"income","date":"DD/MM/YYYY","category":"Renda Principal","subcategory":"Salário"}}

5. 🗑️ APAGAR gasto:
{"action":"remove","table":"transactions","data":{"title":"Nome aproximado"}}

6. 💬 PERGUNTAS SOBRE FINANÇAS:
Use os dados acima para responder de forma curta e amigável.

7. ❓ PRECISAR DE CONFIRMAÇÃO (Ex: Documentos/PDFs com data passada):
MUITO IMPORTANTE: LEIA O DOCUMENTO com precisão cirúrgica. Extraia o NOME REAL e o VALOR REAL. É ESTRITAMENTE PROIBIDO INVENTAR VALORES! Preencha a chave "pending_data" usando SOMENTE as colunas exatas da tabela escolhida (veja o Schema Lock).
⚠️ REGRA DE OURO PARA PDF DE BANCO: Se o PDF for uma Fatura de Cartão de Crédito ou Banco, você DEVE usar a tabela "installments".
Exemplo para Fatura de Banco (installments):
{"action":"ask_details","pending_data":{"table":"installments","title":"[NOME DO BANCO EXTRAÍDO]","value_per_month": [VALOR REAL LIDO DO PDF],"installments_count":1,"payment_method":"banco","due_day":[DIA LIDO DO PDF],"start_date":"[DATA LIDA DD/MM/YYYY]","category":"Financeiro","subcategory":"Outros"},"reply":"Vi que essa fatura do Banco é de um mês passado! Quer que eu lance nela mesma ou no mês atual? E ela já tá paga ou deixo pendente?"}

8. ❌ CANCELAR OPERAÇÃO:
Se o usuário desistir de lançar a conta pendente.
{"action":"cancel","reply":"Tudo bem, deixei quieto e não lancei nada!"}

REGRAS ABSOLUTAS:
✅ Retorne SEMPRE um array JSON válido. Zero texto fora do array.
✅ Valores financeiros: float com ponto (Ex: 26.00). NUNCA vírgula em números. NUNCA crie dados falsos.
✅ SEMPRE inclua {"reply": "sua resposta"} no array.

${hasAudio ? "\n⚠️ ÁUDIO: Transcreva e responda com base no que foi dito." : ""}
${hasImage ? "\n📸 IMAGEM: Extraia valor, data e estabelecimento. Identifique a forma de pagamento." : ""}
${hasDocument ? "\n📄 ARQUIVO PDF: ATENÇÃO! LEIA O ARQUIVO MINUCIOSAMENTE. Extraia com exatidão matemática o VALOR TOTAL A PAGAR e o NOME/BANCO. NUNCA invente números. SE FOR UMA FATURA DE BANCO, ENCAMINHE OBRIGATORIAMENTE PARA A TABELA 'installments'." : ""}
`.trim();

        let gatilhoMotivacional = "";
        if (ctx.estado_conta === "CRÍTICO 🔴" && botPersona === "humorado") {
            gatilhoMotivacional = `
            ⚠️ INSTRUÇÃO DE EMPATIA (MUITO IMPORTANTE):
            Notei no contexto que o estado da conta atual é "CRÍTICO" (saldo negativo).
            Na sua "reply", faça uma brincadeira rápida dizendo "na volta a gente compra" para quebrar o gelo. Termine dizendo que você está ali para ajudar a organizar.
            `;
        }

        const finalPrompt = [systemPrompt, gatilhoMotivacional, ...promptParts];

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
            // 🟢 GUARDANDO NA MEMÓRIA A CONTA PENDENTE
            if (cmd.action === 'ask_details') {
                await redis.set(`pending_insert:${targetPhone}`, JSON.stringify(cmd.pending_data), { ex: 600 }); // Expira em 10 minutos
            }
            // 🟢 LIMPANDO A MEMÓRIA SE O USUÁRIO CANCELAR
            else if (cmd.action === 'cancel') {
                await redis.del(`pending_insert:${targetPhone}`);
            }

            if (cmd.table && !ALLOWED_TABLES.includes(cmd.table)) {
                console.warn(`⛔ Tabela bloqueada: ${cmd.table}`); continue;
            }

            if (cmd.action === 'add') {
                // 🟢 LIMPANDO A MEMÓRIA APÓS SALVAR COM SUCESSO
                await redis.del(`pending_insert:${targetPhone}`);

                if (isPartnerMessage && cmd.data?.title) {
                    cmd.data.title = cmd.data.title.replace(/\[Parceiro\]\s*/gi, '');
                    if (!cmd.data.title.includes(`[${partnerFirstName}]`)) {
                        cmd.data.title = `[${partnerFirstName}] ${cmd.data.title}`;
                    }
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
                    payload.is_paid = payload.type !== 'income' && payload.is_paid !== false; // Garante que Saídas sejam pagas por padrão, a menos que a IA avise que não
                    payload.status = 'active';
                    payload.target_month = payload.target_month || ctx.mes_atual; // Se a IA preencheu o mês alvo via confirmação, usa ele!

                    if (cmd.data.linked_goal_id) {
                        payload.linked_goal_id = Number(cmd.data.linked_goal_id);
                    }

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