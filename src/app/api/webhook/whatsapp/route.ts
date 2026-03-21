import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://163.176.217.228:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "sua-senha-secreta";
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

// Escudo anti-duplicidade
const processedMessages = new Set<string>();

// Gera variacoes do numero com/sem nono digito
const getPhoneVariations = (phone: string): string[] => {
    const clean = phone.replace(/\D/g, '');
    if (!clean.startsWith('55')) return [clean];
    const ddd = clean.substring(2, 4);
    const number = clean.substring(4);
    if (number.length === 9) return [clean, `55${ddd}${number.substring(1)}`];
    if (number.length === 8) return [clean, `55${ddd}9${number}`];
    return [clean];
};

// Envia mensagem tentando todas as variacoes de numero
async function sendWhatsAppMessage(jid: string, text: string, delay: number = 1200) {
    const variations = getPhoneVariations(jid.split('@')[0]);
    let success = false;
    for (const phoneAttempt of variations) {
        if (success) break;
        const finalJid = `${phoneAttempt}@s.whatsapp.net`;
        try {
            const res = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
                method: 'POST',
                headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    number: finalJid,
                    options: { delay },
                    textMessage: { text }
                })
            });
            const json = await res.json();
            if (res.ok || json?.status === 'SUCCESS' || json?.key?.id) {
                console.log(`Envio ok para ${phoneAttempt}`);
                success = true;
            } else {
                console.log(`Falha em ${phoneAttempt}:`, json?.error || 'Bad Request');
            }
        } catch (e) {
            console.error(`Erro ao enviar para ${finalJid}:`, e);
        }
    }
    if (!success) console.log("Nenhuma variacao de numero funcionou.");
}

// Baixa midia e retorna base64
async function downloadMedia(url: string): Promise<string | null> {
    try {
        const response = await fetch(url, { headers: { 'apikey': EVOLUTION_API_KEY } });
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer).toString('base64');
    } catch {
        return null;
    }
}

// Calcula contexto financeiro com efeito cascata (acumula saldo dos meses anteriores)
async function getFinancialContext(supabase: any, userId: string, workspaceId: string) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const activeMonthIdx = today.getMonth();
    const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

    const { data: transactions } = await supabase.from('transactions').select('*').eq('user_id', userId).eq('context', workspaceId);
    const { data: recurring } = await supabase.from('recurring').select('*').eq('user_id', userId).eq('context', workspaceId);
    const { data: installments } = await supabase.from('installments').select('*').eq('user_id', userId).eq('context', workspaceId);

    const getStartData = (item: any) => {
        if (item.start_date?.includes('/')) { const p = item.start_date.split('/'); return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) }; }
        if (item.date?.includes('/')) { const p = item.date.split('/'); return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) }; }
        if (item.created_at) { const d = new Date(item.created_at); return { m: d.getMonth(), y: d.getFullYear() }; }
        return { m: 0, y: currentYear };
    };

    let previousSurplus = 0;
    let computedInc = 0, computedExp = 0, computedBalance = 0;

    for (let idx = 0; idx <= activeMonthIdx; idx++) {
        const month = MONTHS[idx];
        const mCode = (idx + 1).toString().padStart(2, '0');
        const dateFilter = `/${mCode}/${currentYear}`;
        const paymentTag = `${month}/${currentYear}`;

        const inc =
            (transactions?.filter((t: any) => t.type === 'income' && t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby')
                .reduce((acc: number, i: any) => acc + Number(i.amount), 0) || 0) +
            (recurring?.filter((r: any) => {
                const { m: sM, y: sY } = getStartData(r);
                const paid = r.paid_months?.includes(paymentTag) || r.paid_months?.includes(month);
                if ((r.status === 'delayed' || r.status === 'standby' || r.standby_months?.includes(paymentTag)) && !paid) return false;
                return r.type === 'income' && (currentYear > sY || (currentYear === sY && idx >= sM)) && !r.skipped_months?.includes(month);
            }).reduce((acc: number, i: any) => acc + Number(i.value), 0) || 0);

        const exp =
            (transactions?.filter((t: any) => t.type === 'expense' && t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby')
                .reduce((acc: number, i: any) => acc + Number(i.amount), 0) || 0) +
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

        const saldoAcumulado = (inc - exp) + previousSurplus;
        if (idx === activeMonthIdx) { computedInc = inc; computedExp = exp; computedBalance = saldoAcumulado; }
        previousSurplus = saldoAcumulado;
    }

    let estado = "ESTAVEL";
    if (computedBalance < 0) estado = "CRITICO (VERMELHO)";
    else if (computedBalance < (computedInc * 0.1)) estado = "ALERTA (POUCA MARGEM)";

    const contasFixasStandby = (recurring || []).filter((r: any) => r.status === 'standby');
    const parcelamentosStandby = (installments || []).filter((i: any) => i.status === 'standby');

    return {
        saldo: computedBalance.toFixed(2),
        entradas: computedInc.toFixed(2),
        saidas: computedExp.toFixed(2),
        estado_conta: estado,
        mes_visualizado: (activeMonthIdx + 1).toString().padStart(2, '0'),
        resumo_texto: `Receitas: R$ ${computedInc.toFixed(2)} | Despesas: R$ ${computedExp.toFixed(2)} | Saldo: R$ ${computedBalance.toFixed(2)}`,
        contas_fixas_standby: contasFixasStandby.map((r: any) => ({ title: r.title, value: r.value, type: r.type })),
        parcelamentos_standby: parcelamentosStandby.map((i: any) => ({ title: i.title, value_per_month: i.value_per_month })),
    };
}

// Rota principal do webhook
export async function POST(req: Request) {
    try {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "Configuracao incompleta" }, { status: 500 });
        }

        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const body = await req.json();

        // Ignora eventos que nao sejam mensagens novas
        if (body.event && body.event !== "messages.upsert") return NextResponse.json({ status: 'Ignored Event' });
        const key = body.data?.key;
        if (!key?.remoteJid || key.fromMe) return NextResponse.json({ status: 'Ignored' });

        const messageId = key.id;

        // Anti-duplicidade
        if (processedMessages.has(messageId)) {
            console.log("Mensagem duplicada ignorada:", messageId);
            return NextResponse.json({ status: 'Ignored Duplicate' });
        }
        processedMessages.add(messageId);
        if (processedMessages.size > 1000) processedMessages.clear();

        const remoteJid = key.remoteJid;
        const senderId = remoteJid.split('@')[0];
        const messageContent =
            body.data?.message?.conversation ||
            body.data?.message?.extendedTextMessage?.text ||
            "";

        // Processa audio ou texto
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
                await sendWhatsAppMessage(remoteJid, "Nao consegui processar seu audio. Pode me mandar em texto?");
                return NextResponse.json({ status: 'Audio Failed' });
            }
        } else {
            if (!messageContent) return NextResponse.json({ status: 'No Content' });
            promptParts.push(messageContent);
        }

        // Busca usuario pelo numero de WhatsApp
        let { data: userSettings } = await supabase
            .from('user_settings')
            .select('*')
            .or(`whatsapp_phone.eq.${senderId},whatsapp_id.eq.${senderId}`)
            .maybeSingle();

        if (!userSettings) {
            const variations = getPhoneVariations(senderId);
            const { data: found } = await supabase.from('user_settings').select('*').in('whatsapp_phone', variations).maybeSingle();
            if (found) {
                userSettings = found;
                await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', found.user_id);
            }
        }

        // Tenta vincular numero caso usuario tenha enviado o proprio numero no texto
        if (!userSettings) {
            const numbersInText = messageContent.replace(/\D/g, '');
            if (numbersInText.length >= 10) {
                const possiblePhones = getPhoneVariations(numbersInText);
                const { data: userToLink } = await supabase.from('user_settings').select('*').in('whatsapp_phone', possiblePhones).maybeSingle();
                if (userToLink) {
                    await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', userToLink.user_id);
                    await sendWhatsAppMessage(remoteJid, "Vinculado! Agora voce pode usar a IA.");
                    return NextResponse.json({ success: true, action: "linked" });
                }
            }
            return NextResponse.json({ error: "User unknown" });
        }

        // Verifica plano do usuario
        // CORRECAO: a tabela profiles nao tem coluna full_name — buscamos apenas plan_tier e email
        const { data: profile } = await supabase
            .from('profiles')
            .select('plan_tier, email')
            .eq('id', userSettings.user_id)
            .single();

        const plan = profile?.plan_tier || 'free';

        // Libera pro, agent e admin — bloqueia todo o resto (free, trial, etc)
        if (!['pro', 'agent', 'admin'].includes(plan)) {
            console.log(`Bloqueado: ${senderId} — plano '${plan}'`);
            const targetForBlock = userSettings.whatsapp_phone || senderId;
            await sendWhatsAppMessage(
                targetForBlock,
                "Acesso Exclusivo PRO\n\nA IA no WhatsApp esta disponivel apenas nos planos Pro e Consultor.\n\nFaca upgrade no painel para desbloquear.",
                100
            );
            return NextResponse.json({ status: 'Blocked by Plan', plan });
        }

        // Atualiza whatsapp_id se diferente do registrado
        if (senderId !== userSettings.whatsapp_phone && userSettings.whatsapp_id !== senderId) {
            await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', userSettings.user_id);
        }

        const targetPhone = userSettings.whatsapp_phone || senderId;

        const { data: workspace } = await supabase
            .from('workspaces')
            .select('id')
            .eq('user_id', userSettings.user_id)
            .limit(1)
            .single();

        // Contexto financeiro
        let contextInfo: any = {
            saldo: "0", entradas: "0", saidas: "0",
            resumo_texto: "Sem dados", estado_conta: "Indefinido",
            mes_visualizado: (new Date().getMonth() + 1).toString().padStart(2, '0'),
            contas_fixas_standby: [],
            parcelamentos_standby: [],
        };
        if (workspace) {
            contextInfo = await getFinancialContext(supabase, userSettings.user_id, workspace.id);
        }

        // CORRECAO: profiles nao tem full_name — deriva nome do prefixo do email
        // Ex: "joao.silva@gmail.com" -> "Joao"
        const emailPrefix = (profile?.email || '').split('@')[0].replace(/[0-9._\-]/g, '');
        const userName: string = emailPrefix
            ? emailPrefix.charAt(0).toUpperCase() + emailPrefix.slice(1)
            : "voce";

        const currentYear = new Date().getFullYear();
        const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        const viewingPeriod = `${MONTHS_PT[new Date().getMonth()]} ${currentYear}`;

        // Prompt da IA
        const systemPrompt = `
IDENTIDADE: Voce e "Meu Aliado", estrategista financeiro pessoal via WhatsApp.
Tom: proximo, direto, humano. Nunca robotico.
DATA DE HOJE: ${new Date().toLocaleDateString('pt-BR')}.

CONTEXTO DO USUARIO:
Nome: ${userName}
Periodo: ${viewingPeriod}

SITUACAO FINANCEIRA DE ${viewingPeriod}:
${JSON.stringify(contextInfo, null, 2)}

REGRAS DE OURO:
1. SEMPRE chame o usuario pelo nome: ${userName}.
2. Use Markdown para destacar valores: ex: *R$ 49,90*.
3. Respostas CURTAS - WhatsApp, nao relatorio.
4. Use linguagem coloquial brasileira.
5. Datas sempre DD/MM/YYYY. Valores sempre float (ex: 49.90).
6. Data padrao para registros: DIA ATUAL/${contextInfo.mes_visualizado}/${currentYear}.

COMO AGIR EM CADA SITUACAO:

[BATE-PAPO / SALDO]
Responda com os dados acima de forma natural. Chame pelo nome.

[REGISTRO DE TRANSACAO]
Extraia titulo, valor, data e tipo. Monte o JSON.
Se faltar informacao essencial (ex: valor), pergunte antes de registrar.

[PARCELA / FIXO]
Parcela = installments. Fixo mensal = recurring.
Calcule value_per_month automaticamente se o usuario fornecer total + numero de parcelas.

[ANALISE DE STANDBY]
Use os campos "contas_fixas_standby" e "parcelamentos_standby" do contexto.
Uma conta esta em standby EXATAMENTE quando seu status e "standby".
Some o impacto: "value_per_month" (parcelamentos) ou "value" (fixas).

[ALERTA FINANCEIRO]
Status CRITICO: avise com carinho, sugira 1 acao concreta.
Status OK/BOM: motivador, sem exageros.

CATEGORIAS DISPONIVEIS:
Alimentacao | Transporte | Saude | Lazer | Moradia | Educacao | Salario | Freelance | Fixa | Outros

REGRA CRITICA DE SAIDA:
Sua resposta DEVE SER EXCLUSIVAMENTE um array JSON valido.
NUNCA escreva texto fora da estrutura JSON. NENHUM.

FORMATOS JSON PERMITIDOS:

Transacao:
{"action":"add","table":"transactions","data":{"title":"...","amount":0.00,"type":"expense|income","category":"...","icon":"shopping-cart","is_paid":true,"date":"DD/MM/YYYY","target_month":"${contextInfo.mes_visualizado}","status":"active"}}

Parcela:
{"action":"add","table":"installments","data":{"title":"...","total_value":0.00,"installments_count":1,"value_per_month":0.00,"due_day":10,"status":"active","icon":"credit-card"}}

Fixo mensal:
{"action":"add","table":"recurring","data":{"title":"...","value":0.00,"type":"expense|income","category":"Fixa","due_day":10,"status":"active","start_date":"01/${contextInfo.mes_visualizado}/${currentYear}"}}

Analise de standby:
{"action":"analyze","table":"mixed","data":{"total_impact":0.00,"items_count":0,"analysis_text":"resposta humanizada listando contas, valores e impacto no mes"}}

Resposta ao usuario (OBRIGATORIA em todo array):
{"reply":"mensagem curta, humana, com nome do usuario"}

EXEMPLO COMPLETO:
[
  {"action":"add","table":"transactions","data":{"title":"Mercado","amount":89.90,"type":"expense","category":"Alimentacao","icon":"shopping-cart","is_paid":true,"date":"21/03/${currentYear}","target_month":"${contextInfo.mes_visualizado}","status":"active"}},
  {"reply":"Anotei, ${userName}! *R$ 89,90* no mercado registrado. Saldo atualizado!"}
]
${hasAudio ? "AUDIO RECEBIDO: Interprete a fala e responda com base no que foi dito." : ""}
`;

        const finalPrompt = [systemPrompt, ...promptParts];

        // Chama a IA
        let commands: any[] = [];
        try {
            const result = await model.generateContent(finalPrompt);
            let cleanJson = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
            const arrayMatch = cleanJson.match(/\[[\s\S]*\]/);
            if (arrayMatch) cleanJson = arrayMatch[0];
            commands = JSON.parse(cleanJson);
            if (!Array.isArray(commands)) commands = [commands];
        } catch (error: any) {
            console.error("ERRO NA IA OU NO JSON:", error);
            if (error?.status === 503 || error?.message?.includes('503')) {
                await sendWhatsAppMessage(targetPhone, "A IA esta sobrecarregada agora. Tenta de novo em alguns segundos!");
            } else {
                await sendWhatsAppMessage(targetPhone, "Meu cerebro travou por um segundo. Manda de novo de um jeito mais simples?");
            }
            return NextResponse.json({ success: false, reason: 'AI/JSON Error' });
        }

        // Processa as acoes retornadas pela IA
        let replySent = false;
        const hasReplyCmd = commands.some((c: any) => c.reply);

        for (const cmd of commands) {
            if (cmd.action === 'add') {
                const payload: any = {
                    ...cmd.data,
                    user_id: userSettings.user_id,
                    context: workspace?.id || null,
                    created_at: new Date(),
                    message_id: messageId,
                };

                if (cmd.table === 'installments') {
                    payload.current_installment = 0;
                    payload.status = 'active';
                    delete payload.date;
                    delete payload.target_month;
                    const { error } = await supabase.from('installments').insert([payload]);
                    if (error?.code === '23505') { replySent = true; continue; }
                    if (!error && !hasReplyCmd) {
                        const total = Number(cmd.data.total_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                        await sendWhatsAppMessage(targetPhone, `Parcelado: ${cmd.data.title} (${total})`);
                    }

                } else if (cmd.table === 'recurring') {
                    payload.status = 'active';
                    const { error } = await supabase.from('recurring').insert([payload]);
                    if (error?.code === '23505') { replySent = true; continue; }
                    if (!error && !hasReplyCmd) {
                        await sendWhatsAppMessage(targetPhone, `Fixo registrado: ${cmd.data.title}`);
                    }

                } else if (cmd.table === 'transactions') {
                    // Garante data no fuso de Sao Paulo
                    if (!payload.date) {
                        const hoje = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
                        payload.date = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;
                    }
                    payload.is_paid = true;
                    payload.status = 'paid';
                    const { error } = await supabase.from('transactions').insert([payload]);
                    if (error?.code === '23505') { replySent = true; continue; }
                    if (!error && !hasReplyCmd) {
                        const val = Number(cmd.data.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                        await sendWhatsAppMessage(targetPhone, `Lancado: ${cmd.data.title} (${val})`);
                    }
                }

            } else if (cmd.action === 'remove') {
                const { data: items } = await supabase
                    .from(cmd.table)
                    .select('id, title')
                    .eq('user_id', userSettings.user_id)
                    .ilike('title', `%${cmd.data.title}%`)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (items?.length) {
                    await supabase.from(cmd.table).delete().eq('id', items[0].id);
                    if (!hasReplyCmd) await sendWhatsAppMessage(targetPhone, `Apagado: "${items[0].title}"`);
                } else {
                    if (!hasReplyCmd) await sendWhatsAppMessage(targetPhone, `Nao encontrei "${cmd.data.title}"`);
                }
            }
            // action === 'analyze': a resposta humanizada ja vem no campo reply abaixo

            // Envia o reply humanizado da IA (uma unica vez por mensagem)
            if (cmd.reply && !replySent) {
                await sendWhatsAppMessage(targetPhone, cmd.reply);
                replySent = true;
            }
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error("ERRO FATAL NO WEBHOOK:", e);
        // Sempre retorna 200 para evitar loop de retentativa da Evolution
        return NextResponse.json({ error: e.message, status: "Caught" }, { status: 200 });
    }
}