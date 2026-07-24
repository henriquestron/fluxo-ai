import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// ============================================================================
// CONFIGURAÇÃO E VALIDAÇÃO DE ENV
// ============================================================================
const EVOLUTION_URL = process.env.EVOLUTION_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

if (!EVOLUTION_URL) throw new Error('EVOLUTION_URL não definida no .env');
if (!EVOLUTION_API_KEY) throw new Error('EVOLUTION_API_KEY não definida no .env');

const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";
const AI_TIMEOUT_MS = 9000;

const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, '1 m'),
});

const ALLOWED_TABLES = ['transactions', 'installments', 'recurring'] as const;
type AllowedTable = typeof ALLOWED_TABLES[number];

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'] as const;

// ============================================================================
// FUNÇÕES AUXILIARES
// ============================================================================
const getPhoneVariations = (phone: string): string[] => {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('55')) {
        if (clean.length > 13) clean = clean.substring(0, 13);
        const ddd = clean.substring(2, 4);
        const number = clean.substring(4);
        if (number.length === 9) return [clean, `55${ddd}${number.substring(1)}`];
        if (number.length === 8) return [clean, `55${ddd}9${number}`];
        return [clean];
    }
    if (clean.length === 10 || clean.length === 11) return [`55${clean}`, clean];
    return [clean];
};

const safeArray = (val: any): any[] => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
    }
    return [];
};

const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const sanitizeForPrompt = (str: string, maxLen = 200): string =>
    (str || '')
        .slice(0, maxLen)
        .replace(/[`"{}[\]\n\r]/g, '')
        .replace(/\b(ignore|system|instrução|prompt|jailbreak|override)\b/gi, '***');

async function sendWhatsAppMessage(phone: string, text: string, delay: number = 1200) {
    const variations = getPhoneVariations(phone);
    for (const v of variations) {
        const finalJid = `${v}@s.whatsapp.net`;
        try {
            console.log(`📤 Tentando enviar para ${finalJid}...`);
            const res = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
                method: 'POST',
                headers: { 'apikey': EVOLUTION_API_KEY as string, 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    number: finalJid, 
                    text: text,                  // Formato v2
                    delay: delay,                // Formato v2
                    options: { delay: delay },   // Formato v1
                    textMessage: { text: text }  // Formato v1
                })
            });
            
            const json = await res.json();
            if (res.ok || json?.status === 'SUCCESS' || json?.key?.id) {
                console.log(`✅ Sucesso: ${finalJid}`);
                return true;
            }
            console.log(`⚠️ Falha: ${finalJid}. Erro:`, json?.error || 'Bad Request');
        } catch (e) { 
            console.error(`❌ Erro envio para ${finalJid}:`, e); 
        }
    }
    console.log("🚨 Nenhuma variação funcionou.");
    return false;
}

async function downloadMedia(url: string): Promise<string | null> {
    try {
        const response = await fetch(url, { headers: { 'apikey': EVOLUTION_API_KEY as string } });
        if (!response.ok) return null;
        return Buffer.from(await response.arrayBuffer()).toString('base64');
    } catch { return null; }
}

// ============================================================================
// CONTEXTO FINANCEIRO
// ============================================================================
async function getFinancialContext(supabase: any, userId: string, workspaceId: string) {
    const today = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
    const currentYear = today.getFullYear();
    const activeMonthIdx = today.getMonth();
    const activeTab = MONTHS[activeMonthIdx];

    const [transRes, recRes, instRes] = await Promise.all([
        supabase.from('transactions').select('*').eq('user_id', userId).eq('context', workspaceId),
        supabase.from('recurring').select('*').eq('user_id', userId).eq('context', workspaceId),
        supabase.from('installments').select('*').eq('user_id', userId).eq('context', workspaceId)
    ]);

    const transactions = transRes.data || [];
    const recurring = recRes.data || [];
    const installments = instRes.data || [];

    const getStartData = (item: any) => {
        if (item.start_date?.includes('/')) {
            const p = item.start_date.split('/'); return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) };
        }
        if (item.date?.includes('/')) {
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
        const parsed = typeof item.custom_values === 'string' ? JSON.parse(item.custom_values) : item.custom_values;
        return parsed[tag] !== undefined ? Number(parsed[tag]) : baseValue;
    };

    const getMonthData = (monthName: string, monthIndex: number) => {
        const monthNum = String(monthIndex + 1).padStart(2, '0');
        const dateFilter = `/${monthNum}/${currentYear}`;
        const currentPaymentTag = `${monthName}/${currentYear}`;
        const currentYYYYMM = `${currentYear}-${monthNum}`;

        const activeRecurring = recurring.filter((r: any) => {
            const paid = isPaid(r, currentPaymentTag);
            if ((r.status === 'delayed' || r.status === 'standby') && !paid) return false;
            if (safeArray(r.standby_months).includes(currentPaymentTag) && !paid) return false;
            if (r.cancelled_from && currentYYYYMM >= r.cancelled_from) return false;
            const { m: startMonth, y: startYear } = getStartData(r);
            if (currentYear > startYear) return true;
            if (currentYear === startYear && monthIndex >= startMonth) return true;
            return false;
        });

        const incomeFixed = activeRecurring
            .filter((r: any) => r.type === 'income' && !safeArray(r.skipped_months).includes(monthName))
            .reduce((acc: number, curr: any) => acc + getCustomValue(curr, currentPaymentTag, Number(curr.value)), 0);

        const incomeVariable = transactions
            .filter((t: any) => t.type === 'income' && t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby')
            .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

        const incomeTotal = incomeFixed + incomeVariable;

        const expenseFixed = activeRecurring
            .filter((r: any) => r.type === 'expense' && !safeArray(r.skipped_months).includes(monthName))
            .reduce((acc: number, curr: any) => acc + getCustomValue(curr, currentPaymentTag, Number(curr.value)), 0);

        const expenseVariable = transactions
            .filter((t: any) => t.type === 'expense' && t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby' && !t.linked_goal_id)
            .reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

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

        if (monthIndex !== activeMonthIdx) {
            return { income: incomeTotal, expenseTotal, balance: incomeTotal - expenseTotal, pendingCount: 0, pendingAmount: 0, paidCount: 0, detalhesR: "", detalhesG: "" };
        }

        let pendingAmount = 0, pendingCount = 0, paidCount = 0;
        let detalhesR = "\n📥 RECEITAS:\n";
        let detalhesG = "\n📤 DESPESAS:\n";

        activeRecurring.filter((r: any) => r.type === 'income' && !safeArray(r.skipped_months).includes(monthName)).forEach((r: any) => {
            detalhesR += ` • ${r.title}: ${fmt(getCustomValue(r, currentPaymentTag, Number(r.value)))}\n`;
        });
        transactions.filter((t: any) => t.type === 'income' && t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby').forEach((t: any) => {
            detalhesR += ` • ${t.title}: ${fmt(Number(t.amount))}\n`;
        });

        activeRecurring.filter((r: any) => r.type === 'expense' && !safeArray(r.skipped_months).includes(monthName)).forEach((r: any) => {
            const pd = isPaid(r, currentPaymentTag);
            const finalVal = getCustomValue(r, currentPaymentTag, Number(r.value));
            pd ? paidCount++ : (pendingCount++, pendingAmount += finalVal);
            detalhesG += ` ${pd ? "✅" : "⏳"} ${r.title}: ${fmt(finalVal)}\n`;
        });
        transactions.filter((t: any) => t.type === 'expense' && t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby' && !t.linked_goal_id).forEach((t: any) => {
            const pd = t.is_paid;
            pd ? paidCount++ : (pendingCount++, pendingAmount += Number(t.amount));
            detalhesG += ` ${pd ? "✅" : "⏳"} ${t.title}: ${fmt(Number(t.amount))}\n`;
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
                pd ? paidCount++ : (pendingCount++, pendingAmount += finalVal);
                detalhesG += ` ${pd ? "✅" : "⏳"} ${curr.title} (${currentInstNum}/${curr.installments_count}x): ${fmt(finalVal)}\n`;
            }
        });

        return { income: incomeTotal, expenseTotal, balance: incomeTotal - expenseTotal, pendingCount, pendingAmount, paidCount, detalhesR, detalhesG };
    };

    let previousSurplus = 0;
    for (let i = 0; i < activeMonthIdx; i++) {
        previousSurplus += getMonthData(MONTHS[i], i).balance;
    }

    const currentMonthData = getMonthData(activeTab, activeMonthIdx);
    const displayBalance = currentMonthData.balance + previousSurplus;

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
// BUILDER DO PROMPT — Com Personalidade Restaurada e Mark Paid
// ============================================================================
interface LunaPromptParams {
    ctx: any;
    currentSpeakerName: string;
    botPersona: string;
    humor: number;
    sinceridade: number;
    formalidade: number;
    workspaces: any[];
    primaryWorkspaceId: string;
    wallets: any[];
    dataHojeBR: string;
    hasAudio: boolean;
    hasImage: boolean;
    hasDocument: boolean;
    isPartnerMessage: boolean;
    partnerFirstName: string;
}

function buildLunaPrompt(p: LunaPromptParams): string {
    // --- Persona Restaurada ---
    const personaMap: Record<string, string> = {
        formal: `Você é um assistente financeiro profissional, formal e objetivo. Foco absoluto em números e organização. Zero piadas. Linguagem culta e direta.`,
        sincero: `Você é direta e sincera, estilo "puxão de orelha". Dê broncas curtas e irônicas para gastos fúteis (iFood repetido, besteiras). Mantenha o respeito, mas não papei nada.`,
        personalizado: `Ajuste seu tom conforme a combinação abaixo (escala 1–10):
- Humor: ${p.humor}/10 — (1 = sério, 10 = muito piadista)
- Sinceridade/Bronca: ${p.sinceridade}/10 — (1 = compreensiva, 10 = bronca severa e irônica)
- Formalidade: ${p.formalidade}/10 — (1 = gírias e parceira íntima, 10 = linguagem executiva)
Mantenha essa combinação em TODAS as respostas.`,
        humorado: `Você é descontraída, parceira e bem-humorada. Fale como amiga experiente. Piadas rápidas, emojis naturais, brinque levemente com tentações de gastar.`,
    };
    const personaPrompt = personaMap[p.botPersona] || personaMap.humorado;

    let workspacesCtx = "";
    if (p.workspaces.length > 1) {
        workspacesCtx = `\n━━━ ÁREAS DE TRABALHO ━━━\nSempre inclua "context" no JSON com o ID correto da área.\n`;
        p.workspaces.forEach(ws => { workspacesCtx += `• ID: "${ws.id}" | Nome: "${ws.title}" | Regra: "${sanitizeForPrompt(ws.whatsapp_rule || 'Geral')}"\n`; });
        workspacesCtx += `Se não souber qual área, use o ID padrão: "${p.primaryWorkspaceId}".\n`;
    } else {
        workspacesCtx = `Inclua "context": "${p.primaryWorkspaceId}" em todos os JSONs de inserção.\n`;
    }

    let walletsCtx = "";
    if (p.wallets.length > 0) {
        walletsCtx = `\n━━━ 👛 CAIXINHAS (ORÇAMENTOS) ━━━\nSe o gasto combinar com a regra de uma caixinha, inclua "linked_goal_id" com o ID numérico exato. Se não combinar com nenhuma, omita a chave.\n`;
        p.wallets.forEach(w => { walletsCtx += `• ID: ${w.id} | Nome: "${w.title}" | Regra: "${sanitizeForPrompt(w.whatsapp_rule || 'Uso geral')}"\n`; });
    }

    // --- Gatilho Emocional Restaurado ---
    const gatilhoEmocional = (p.ctx.estado_conta === "CRÍTICO 🔴" && p.botPersona === "humorado")
        ? `\n⚠️ INSTRUÇÃO DE EMPATIA (MUITO IMPORTANTE): O saldo atual está NEGATIVO. Na sua "reply", faça uma brincadeira rápida e afetuosa usando "na volta a gente compra". Termine com uma palavra de apoio curta dizendo que organizar as contas é o primeiro passo. Mantenha tom de WhatsApp!\n`
        : "";

    const mediaCtx = [
        p.hasAudio ? "⚠️ ÁUDIO RECEBIDO: Transcreva mentalmente e responda com base no conteúdo falado." : "",
        p.hasImage ? "📸 IMAGEM RECEBIDA: Extraia valor, data e estabelecimento. Identifique a forma de pagamento pelo contexto visual." : "",
        p.hasDocument ? "📄 PDF RECEBIDO: Analise o documento (boleto, nota fiscal ou comprovante). Extraia: VALOR TOTAL, DATA DE VENCIMENTO e NOME DO ESTABELECIMENTO. Se encontrar código de barras ou linha digitável (PIX Copia e Cola), inclua na 'reply'." : "",
    ].filter(Boolean).join("\n");

    const cartoesCadastrados = ['nubank', 'inter', 'bb', 'itau', 'santander', 'caixa', 'bradesco', 'c6'];

    return `
━━━ IDENTIDADE ━━━
Seu nome é Luna. Você é a IA oficial do "Meu Aliado", assistente financeiro pessoal via WhatsApp.
Você está falando com: ${p.currentSpeakerName}. Chame pelo nome ocasionalmente — não em toda mensagem.
${p.isPartnerMessage ? `Esta mensagem veio do PARCEIRO (${p.partnerFirstName}). Trate-o como co-usuário do sistema.` : ""}

━━━ PERSONALIDADE ━━━
${personaPrompt}

REGRAS DE COMUNICAÇÃO:
• VOCÊ É HUMANA: Suas respostas (na chave "reply") DEVEM refletir fortemente sua personalidade. Use emojis, faça comentários sobre os gastos, seja expressiva!
• Evite parecer um robô que só confirma dados. Aja como a conselheira financeira do usuário.
• Se o usuário mandar mensagem fora de finanças (ex: "oi", "tudo bem"), responda com carisma e redirecione.

━━━ DATA E SITUAÇÃO FINANCEIRA (${p.ctx.mes_atual.toUpperCase()}) ━━━
📅 Hoje: ${p.dataHojeBR}

💰 Receitas:   ${p.ctx.entradas_fmt}
💸 Despesas:   ${p.ctx.saidas_fmt}
📊 Saldo:      ${p.ctx.saldo_fmt}
⏳ A pagar:    ${p.ctx.pendente_fmt} (${p.ctx.contas_pendentes} conta(s) pendente(s))
✅ Pagas:      ${p.ctx.contas_pagas} conta(s)
⚠️ Status:    ${p.ctx.estado_conta}
${p.ctx.detalhes_receitas}${p.ctx.detalhes_gastos}
${gatilhoEmocional}
${workspacesCtx}
${walletsCtx}

━━━ CATEGORIAS DISPONÍVEIS ━━━
[DESPESAS]
Habitação | Alimentação | Transporte | Saúde | Educação | Lazer | Compras | Financeiro

[RECEITAS]
Renda Principal | Renda Extra | Rendimentos

━━━ REGRAS DE ROTEAMENTO (FORMATOS JSON OBRIGATÓRIOS) ━━━
Sempre inclua "category" e "subcategory".

1️⃣ CARTÃO DE CRÉDITO (mencionar banco, fatura ou cartão)
Bancos aceitos: ${cartoesCadastrados.join(', ')}
• Se o usuário informou o mês (ex: "para junho"): inclua "start_date" no formato "10/MM/YYYY".
• Se NÃO informou o mês: lance normalmente e adicione na "reply" um lembrete no seu estilo sobre a fatura fechada.
{"action":"add","table":"installments","context":"ID","data":{"title":"Nome","value_per_month":0.00,"installments_count":1,"payment_method":"banco","due_day":10,"start_date":"10/MM/YYYY","category":"...","subcategory":"..."}}

2️⃣ GASTO FIXO (fixo, assinatura, mensalidade)
{"action":"add","table":"recurring","context":"ID","data":{"title":"Nome","value":0.00,"type":"expense","due_day":10,"category":"...","subcategory":"..."}}

3️⃣ GASTO COMUM (débito, pix, compra pontual)
{"action":"add","table":"transactions","context":"ID","data":{"title":"Nome","amount":0.00,"type":"expense","date":"DD/MM/YYYY","category":"...","subcategory":"..."}}

4️⃣ RECEITA (salário, pix recebido, freela)
{"action":"add","table":"transactions","context":"ID","data":{"title":"Nome","amount":0.00,"type":"income","date":"DD/MM/YYYY","category":"...","subcategory":"..."}}

5️⃣ APAGAR GASTO
{"action":"remove","table":"transactions","data":{"title":"Nome aproximado"}}

6️⃣ DAR BAIXA / MARCAR COMO PAGO:
Se o usuário confirmar que PAGOU uma conta existente (ex: "paguei a luz", "dei baixa no aluguel", "fatura nubank tá paga").
Descubra o NOME APROXIMADO da conta e use a action "mark_paid". Na "reply", comemore que a conta está paga!
{"action":"mark_paid","table":"[installments, recurring ou transactions]","data":{"title":"[NOME DA CONTA]"}}

7️⃣ PERGUNTAS / CONSULTAS
Use os dados financeiros do contexto acima para responder com precisão. Retorne apenas a resposta no array.
[{"reply":"sua resposta cheia de personalidade"}]

${mediaCtx ? `━━━ MÍDIA ━━━\n${mediaCtx}` : ""}

━━━ REGRAS ABSOLUTAS (NUNCA VIOLE) ━━━
✅ Retorne SEMPRE um array JSON válido. ZERO texto fora do array.
✅ Valores numéricos: float com ponto decimal (ex: 2000.00). Nunca string, nunca vírgula.
✅ SEMPRE inclua {"reply":"sua resposta carismática"} no array, mesmo quando realizar actions.
`.trim();
}

// ============================================================================
// HANDLER PRINCIPAL
// ============================================================================
export async function POST(req: Request) {
    try {
        const EVOLUTION_WEBHOOK_SECRET = process.env.EVOLUTION_WEBHOOK_SECRET;
        if (!EVOLUTION_WEBHOOK_SECRET) throw new Error('EVOLUTION_WEBHOOK_SECRET não definida');

        const { searchParams } = new URL(req.url);
        const urlToken = searchParams.get('token');
        const webhookToken =
            req.headers.get('apikey') ??
            req.headers.get('authorization')?.replace('Bearer ', '') ??
            urlToken;

        if (webhookToken !== EVOLUTION_WEBHOOK_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({
            model: "gemini-flash-latest",
            // 🟢 Temperatura restaurada para 0.8 (Criativa e Humana)
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

        const variations = getPhoneVariations(senderId);
        const inQuery = variations.join(',');

        const USER_SETTINGS_FIELDS = 'user_id, whatsapp_phone, whatsapp_id, partner_phone, partner_whatsapp_id, partner_name, bot_persona, bot_humor_level, bot_sincerity_level, bot_formality_level';

        let { data: userSettings } = await supabase
            .from('user_settings')
            .select(USER_SETTINGS_FIELDS)
            .or(`whatsapp_id.eq.${senderId},partner_whatsapp_id.eq.${senderId},whatsapp_phone.in.(${inQuery}),partner_phone.in.(${inQuery})`)
            .maybeSingle();

        if (!userSettings && senderRaw !== senderId) {
            const { data: found } = await supabase
                .from('user_settings')
                .select(USER_SETTINGS_FIELDS)
                .or(`whatsapp_id.eq.${senderRaw},partner_whatsapp_id.eq.${senderRaw}`)
                .maybeSingle();
            if (found) userSettings = found;
        }

        if (!userSettings) {
            const numbersInText = messageContent.replace(/\D/g, '');
            if (numbersInText.length >= 10) {
                const possiblePhones = getPhoneVariations(numbersInText);
                const inQueryPossible = possiblePhones.join(',');
                const { data: userToLink } = await supabase
                    .from('user_settings')
                    .select('user_id, whatsapp_phone, partner_phone, partner_name')
                    .or(`whatsapp_phone.in.(${inQueryPossible}),partner_phone.in.(${inQueryPossible})`)
                    .maybeSingle();

                if (userToLink) {
                    const partnerClean = userToLink.partner_phone?.replace(/\D/g, '') || '';
                    const isPartnerActivating = partnerClean.length >= 8 &&
                        possiblePhones.some(v => v.replace(/\D/g, '').includes(partnerClean.slice(-8)));

                    // 🟢 MENSAGEM COMPLETA DE ONBOARDING (SEM GASTAR TOKENS DA IA)
const welcomeMessage = `✨ *CONEXÃO CONCLUÍDA COM SUCESSO!* ✨

Olá! Eu sou a *Luna*, sua assistente financeira pessoal do *Meu Aliado*! 💜

A partir de agora você não precisa mais esperar chegar em casa pra organizar suas finanças. Pode mandar tudo por aqui em tempo real!

---

💡 *O QUE VOCÊ PODE MANDAR PRA MIM?*

🎙️ *Áudios:*
• _"Luna, acabei de gastar 45 reais no almoço pelo Pix"_
• _"Comprei um tênis na promoção de 3x de 80 no Nubank"_

💬 *Mensagens de Texto:*
• _"Aluguel 1200 dia 10"_ (Cadastra gasto fixo)
• _"Entrou 3000 do salário hoje"_ (Cadastra receita)
• _"Paguei a conta de luz"_ (Dá baixa no painel)

📸 *Fotos & Comprovantes:*
• Mande a foto da nota fiscal do mercado ou comprovante do Pix que eu extraio os valores!

📄 *Boletos em PDF:*
• Pode me mandar o arquivo PDF do boleto que eu leio o valor, vencimento e até a linha digitável do PIX pra você!

---

📊 *CONSULTAS RÁPIDAS:*
• Pergunta pra mim: _"Como tá meu saldo?"_, _"O que tenho pra pagar esse mês?"_ ou _"Quanto gastei com Uber?"_

⚠️ *DICA DE OURO:*
Se o gasto for no cartão de crédito, me avise o banco (ex: _"50 reais no Inter"_ ou _"100 no Nubank para o mês que vem"_) que eu organizo direto na sua fatura!

Qual é o primeiro gasto ou receita que vamos registrar hoje? 🚀`;

if (isPartnerActivating) {
    await supabase.from('user_settings').update({ partner_whatsapp_id: senderId }).eq('user_id', userToLink.user_id);
    await sendWhatsAppMessage(userToLink.partner_phone, welcomeMessage);
} else {
    await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', userToLink.user_id);
    await sendWhatsAppMessage(userToLink.whatsapp_phone, welcomeMessage);
}
                    return NextResponse.json({ success: true, action: "linked" });
                }
            }
            return NextResponse.json({ error: "User unknown" });
        }

        const partnerClean = userSettings.partner_phone?.replace(/\D/g, '') || '';
        const isPartnerMessage =
            userSettings.partner_whatsapp_id === senderId ||
            userSettings.partner_whatsapp_id === senderRaw ||
            (partnerClean.length >= 8 && senderId.includes(partnerClean.slice(-8)));

        const targetPhone = isPartnerMessage ? userSettings.partner_phone : userSettings.whatsapp_phone;

        const alreadyProcessed = await redis.get(`msg:${messageId}`);
        if (alreadyProcessed) return NextResponse.json({ status: 'Ignored Duplicate' });
        await redis.set(`msg:${messageId}`, '1', { ex: 86400 });

        const { success: rateLimitSuccess } = await ratelimit.limit(userSettings.user_id);
        if (!rateLimitSuccess) {
            await sendWhatsAppMessage(targetPhone, "⏳ Calma aí! Muitas mensagens. Aguarde um minutinho pra eu processar.");
            return NextResponse.json({ status: 'Rate Limited' });
        }

        const pendingDeleteStr = await redis.get(`pending_delete:${targetPhone}`);
        if (pendingDeleteStr) {
            const userInput = messageContent.trim().toUpperCase();

            if (userInput === 'SIM') {
                let cmd: any;
                try {
                    cmd = typeof pendingDeleteStr === 'string' ? JSON.parse(pendingDeleteStr) : pendingDeleteStr;
                } catch {
                    await sendWhatsAppMessage(targetPhone, '⚠️ Operação inválida.');
                    await redis.del(`pending_delete:${targetPhone}`);
                    return NextResponse.json({ status: 'Blocked' });
                }

                if (!ALLOWED_TABLES.includes(cmd?.table) || !cmd?.data?.title || typeof cmd.data.title !== 'string') {
                    await sendWhatsAppMessage(targetPhone, '⚠️ Operação inválida.');
                    await redis.del(`pending_delete:${targetPhone}`);
                    return NextResponse.json({ status: 'Blocked' });
                }

                const { data: items } = await supabase.from(cmd.table).select('id, title')
                    .eq('user_id', userSettings.user_id).ilike('title', `%${cmd.data.title}%`)
                    .order('created_at', { ascending: false }).limit(1);

                if (items?.length) {
                    await supabase.from(cmd.table).delete().eq('id', items[0].id);
                    await sendWhatsAppMessage(targetPhone, `🗑️ Feito! Apaguei "${items[0].title}" pra você.`);
                } else {
                    await sendWhatsAppMessage(targetPhone, `⚠️ Poxa, não encontrei o item para apagar.`);
                }
            } else {
                await sendWhatsAppMessage(targetPhone, `❌ Deixa quieto então. Exclusão cancelada!`);
            }

            await redis.del(`pending_delete:${targetPhone}`);
            return NextResponse.json({ success: true, action: userInput === 'SIM' ? "deleted_confirmed" : "deleted_cancelled" });
        }

        let promptParts: any[] = [];
        let hasAudio = false, hasImage = false, hasDocument = false;
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
                await sendWhatsAppMessage(targetPhone, "⚠️ Não consegui escutar o áudio. Pode mandar em texto?");
                return NextResponse.json({ status: 'Audio Failed' });
            }
        } else if (msgType === "imageMessage" || msgData?.imageMessage) {
            let imageBase64 = body.data?.base64 || msgData?.imageMessage?.base64 || body.data?.message?.base64;
            if (!imageBase64) {
                const url = msgData?.imageMessage?.url || body.data?.mediaUrl;
                if (url) imageBase64 = await downloadMedia(url);
            }
            if (imageBase64) {
                hasImage = true;
                promptParts.push({ inlineData: { mimeType: msgData?.imageMessage?.mimetype || "image/jpeg", data: imageBase64 } });
                if (msgData?.imageMessage?.caption) promptParts.push(msgData.imageMessage.caption);
            } else {
                await sendWhatsAppMessage(targetPhone, "⚠️ Não consegui ler a imagem. Tente de novo!");
                return NextResponse.json({ status: 'Image Failed' });
            }
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
                    else if (messageContent) promptParts.push(messageContent);
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

        const [profileRes, authRes, workspacesRes, walletsRes] = await Promise.all([
            supabase.from('profiles').select('plan_tier').eq('id', userSettings.user_id).single(),
            supabase.auth.admin.getUserById(userSettings.user_id),
            supabase.from('workspaces').select('id, title, whatsapp_rule').eq('user_id', userSettings.user_id),
            supabase.from('goals').select('id, title, whatsapp_rule')
                .eq('user_id', userSettings.user_id).eq('type', 'wallet').eq('ai_enabled', true)
        ]);

        const plan = profileRes.data?.plan_tier || 'free';
        const workspaces = workspacesRes.data || [];
        const wallets = walletsRes.data || [];
        const primaryWorkspace = workspaces[0];

        const fullPrimaryName = authRes.data?.user?.user_metadata?.full_name;
        const primaryFirstName = fullPrimaryName ? fullPrimaryName.split(' ')[0] : 'chefe';
        const partnerFirstName = (userSettings.partner_name || 'Parceiro').split(' ')[0];
        const currentSpeakerName = isPartnerMessage ? partnerFirstName : primaryFirstName;

        if (!['pro', 'agent', 'admin'].includes(plan)) {
            await sendWhatsAppMessage(targetPhone, `🚫 *Acesso PRO*\n\nPoxa ${currentSpeakerName}, esse recurso é exclusivo dos planos Pro e Consultor!`, 100);
            return NextResponse.json({ status: 'Blocked by Plan', plan });
        }

        const validContextIds = new Set(workspaces.map((w: any) => w.id));

        let ctx = {
            saldo_fmt: "R$ 0,00", entradas_fmt: "R$ 0,00", saidas_fmt: "R$ 0,00",
            pendente_fmt: "R$ 0,00", mes_atual: "Mês", estado_conta: "Indefinido",
            contas_pagas: 0, contas_pendentes: 0,
            detalhes_receitas: "", detalhes_gastos: "", resumo_texto: "Sem dados",
            saldo: "0", entradas: "0", saidas: "0"
        };
        if (primaryWorkspace) ctx = await getFinancialContext(supabase, userSettings.user_id, primaryWorkspace.id);

        const dataHojeBR = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

        const systemPrompt = buildLunaPrompt({
            ctx,
            currentSpeakerName,
            botPersona: userSettings.bot_persona || 'humorado',
            humor: userSettings.bot_humor_level || 5,
            sinceridade: userSettings.bot_sincerity_level || 5,
            formalidade: userSettings.bot_formality_level || 5,
            workspaces,
            primaryWorkspaceId: primaryWorkspace?.id || '',
            wallets,
            dataHojeBR,
            hasAudio,
            hasImage,
            hasDocument,
            isPartnerMessage,
            partnerFirstName,
        });

        const finalPrompt = [systemPrompt, ...promptParts];

        let commands: any[] = [];
        try {
            const result = await Promise.race([
                model.generateContent(finalPrompt),
                new Promise<never>((_, reject) =>
                    setTimeout(() => reject(new Error('AI Timeout')), AI_TIMEOUT_MS)
                )
            ]) as any;

            let cleanJson = result.response.text().split('```json').join('').split('```').join('').trim();
            const arrayMatch = cleanJson.match(/\[[\s\S]*\]/);
            if (arrayMatch) cleanJson = arrayMatch[0];
            commands = JSON.parse(cleanJson);
            if (!Array.isArray(commands)) commands = [commands];
        } catch (error: any) {
            const isTimeout = error.message === 'AI Timeout';
            console.error(isTimeout ? "⏱️ TIMEOUT IA:" : "❌ ERRO IA/JSON:", error);
            await sendWhatsAppMessage(targetPhone, isTimeout
                ? "⏳ Demorei demais pra pensar. Pode mandar de novo?"
                : "Tive uma travada agora. Pode mandar de novo? 🤖"
            );
            return NextResponse.json({ success: false, reason: isTimeout ? 'AI Timeout' : 'AI/JSON Error' });
        }

        const replyCmd = commands.find((c: any) => c.reply && !c.action);
        const actionCmds = commands.filter((c: any) => c.action);

        let replySent = false;

        for (const cmd of actionCmds) {
            if (cmd.table && !ALLOWED_TABLES.includes(cmd.table)) {
                console.warn(`⛔ Tabela bloqueada: ${cmd.table}`);
                continue;
            }

            // 🟢 LÓGICA DO MARK_PAID (DAR BAIXA NAS CONTAS)
            if (cmd.action === 'mark_paid') {
                const { data: items } = await supabase
                    .from(cmd.table)
                    .select('*')
                    .eq('user_id', userSettings.user_id)
                    .ilike('title', `%${cmd.data.title}%`)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (items && items.length > 0) {
                    const item = items[0];
                    if (cmd.table === 'transactions') {
                        await supabase.from('transactions').update({ is_paid: true }).eq('id', item.id);
                    } else {
                        const anoAtual = new Date().getFullYear();
                        const tag = `${ctx.mes_atual}/${anoAtual}`;
                        const currentPaid = Array.isArray(item.paid_months) ? item.paid_months : [];
                        if (!currentPaid.includes(tag)) {
                            await supabase.from(cmd.table).update({ paid_months: [...currentPaid, tag] }).eq('id', item.id);
                        }
                    }
                    if (!replySent) {
                        await sendWhatsAppMessage(targetPhone, cmd.reply || `✅ Dei baixa em "${item.title}". Menos uma conta pra gente se preocupar! 💸`);
                        replySent = true;
                    }
                } else {
                    if (!replySent) {
                        await sendWhatsAppMessage(targetPhone, cmd.reply || `🤔 Não achei nenhuma pendência parecida com "${cmd.data.title}". Pode me confirmar o nome?`);
                        replySent = true;
                    }
                }
                continue;
            }

            if (cmd.action === 'add') {
                if (isPartnerMessage && cmd.data?.title) {
                    cmd.data.title = cmd.data.title.replace(/\[Parceiro\]\s*/gi, '').trim();
                    if (!cmd.data.title.includes(`[${partnerFirstName}]`)) {
                        cmd.data.title = `[${partnerFirstName}] ${cmd.data.title}`;
                    }
                }

                const targetContext = (cmd.context && validContextIds.has(cmd.context)) ? cmd.context : (primaryWorkspace?.id || null);

                const extractedValue = parseFloat(cmd.data?.amount) || parseFloat(cmd.data?.value) || parseFloat(cmd.data?.value_per_month) || parseFloat(cmd.data?.total_value) || 0;

                if (extractedValue <= 0) {
                    if (!replySent) {
                        await sendWhatsAppMessage(targetPhone, "⚠️ Não consegui identificar o valor certinho. Pode repetir com o valor exato?");
                        replySent = true;
                    }
                    continue;
                }

                const basePayload: any = {
                    ...cmd.data, user_id: userSettings.user_id, context: targetContext,
                    created_at: new Date(), message_id: messageId,
                };

                let insertError: any = null;

                if (cmd.table === 'installments') {
                    const payload = {
                        ...basePayload, current_installment: 0, status: 'active',
                        due_day: parseInt(cmd.data.due_day) || 10,
                        installments_count: parseInt(cmd.data.installments_count) || 1,
                        payment_method: cmd.data.payment_method || 'outros',
                        value_per_month: extractedValue,
                        total_value: extractedValue * (parseInt(cmd.data.installments_count) || 1),
                        paid_months: [],
                    };
                    delete payload.date; delete payload.target_month; delete payload.is_paid; delete payload.amount; delete payload.value;
                    ({ error: insertError } = await supabase.from('installments').insert([payload]));
                } else if (cmd.table === 'recurring') {
                    const payload = {
                        ...basePayload, status: 'active', value: extractedValue, paid_months: [],
                        due_day: parseInt(cmd.data.due_day) || 10,
                    };
                    delete payload.is_paid; delete payload.amount; delete payload.date; delete payload.value_per_month;
                    ({ error: insertError } = await supabase.from('recurring').insert([payload]));
                } else if (cmd.table === 'transactions') {
                    if (!basePayload.date) {
                        const hoje = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
                        basePayload.date = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
                    }
                    const payload = {
                        ...basePayload, amount: extractedValue, is_paid: cmd.data.type !== 'income',
                        status: 'active', target_month: ctx.mes_atual,
                        ...(cmd.data.linked_goal_id ? { linked_goal_id: Number(cmd.data.linked_goal_id) } : {}),
                    };
                    delete payload.value; delete payload.value_per_month;
                    ({ error: insertError } = await supabase.from('transactions').insert([payload]));
                }

                if (insertError) {
                    console.error(`❌ SUPABASE (${cmd.table}):`, insertError);
                    if (!replySent) {
                        await sendWhatsAppMessage(targetPhone, `❌ Ops, deu erro ao salvar. Tente novamente.`);
                        replySent = true;
                    }
                }
            } else if (cmd.action === 'remove') {
                await sendWhatsAppMessage(targetPhone, `⚠️ Apagar *"${cmd.data.title}"*? Responda *SIM* para confirmar.`);
                await redis.set(`pending_delete:${targetPhone}`, JSON.stringify(cmd), { ex: 300 });
                replySent = true;
            }

            if (cmd.reply && !replySent) {
                await sendWhatsAppMessage(targetPhone, cmd.reply);
                replySent = true;
            }
        }

        if (replyCmd?.reply && !replySent) {
            await sendWhatsAppMessage(targetPhone, replyCmd.reply);
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error("🔥 ERRO FATAL:", e);
        return NextResponse.json({ error: e.message, status: "Caught" }, { status: 200 });
    }
}