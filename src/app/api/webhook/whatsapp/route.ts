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
    if (clean.length === 10 || clean.length === 11) { return [`55${clean}`, clean]; }
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
            if (res.ok || json?.status === 'SUCCESS' || json?.key?.id) { success = true; }
        } catch (e) { console.error(`❌ Erro envio:`, e); }
    }
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
// 🧠 O NOVO PUXADOR DE DADOS DA SUA API (Single Source of Truth)
// ============================================================================
async function fetchFinancialContext(userId: string, workspaceId: string) {
    // ⚠️ ATENÇÃO: Cadastre NEXT_PUBLIC_SITE_URL nas variáveis da Vercel (Ex: https://meualiado.com)
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    try {
        const res = await fetch(`${baseUrl}/api/contexto-financeiro?userId=${userId}&workspaceId=${workspaceId}`, {
            method: 'GET',
            headers: { 'x-api-secret': process.env.EVOLUTION_WEBHOOK_SECRET as string },
            cache: 'no-store' 
        });

        if (!res.ok) throw new Error('Falha ao buscar contexto financeiro do site');
        return await res.json();
    } catch (e) {
        console.error("❌ Erro ao bater na API interna:", e);
        return {
            saldo_fmt: "R$ 0,00", entradas_fmt: "R$ 0,00", saidas_fmt: "R$ 0,00",
            pendente_fmt: "R$ 0,00", mes_atual: "Mês", estado_conta: "Indefinido",
            contas_pagas: 0, contas_pendentes: 0, detalhes_receitas: "", detalhes_gastos: ""
        };
    }
}

export async function POST(req: Request) {
    try {
        const EVOLUTION_WEBHOOK_SECRET = process.env.EVOLUTION_WEBHOOK_SECRET;
        if (!EVOLUTION_WEBHOOK_SECRET) throw new Error('EVOLUTION_WEBHOOK_SECRET não definida');

        const { searchParams } = new URL(req.url);
        const urlToken = searchParams.get('token');
        const webhookToken = req.headers.get('apikey') ?? req.headers.get('authorization')?.replace('Bearer ', '') ?? urlToken;

        if (webhookToken !== EVOLUTION_WEBHOOK_SECRET) { return NextResponse.json({ error: 'Unauthorized' }, { status: 401 }); }

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

        // IDENTIFICAÇÃO E ATIVAÇÃO ─────────────────────────────────────────────
        const variations = getPhoneVariations(senderId);
        const inQuery = variations.join(',');

        let { data: userSettings } = await supabase.from('user_settings').select('*')
            .or(`whatsapp_id.eq.${senderId},partner_whatsapp_id.eq.${senderId},whatsapp_phone.in.(${inQuery}),partner_phone.in.(${inQuery})`).maybeSingle();

        if (!userSettings && senderRaw !== senderId) {
            const { data: found } = await supabase.from('user_settings').select('*')
                .or(`whatsapp_id.eq.${senderRaw},partner_whatsapp_id.eq.${senderRaw}`).maybeSingle();
            if (found) { userSettings = found; }
        }

        if (!userSettings) {
            const numbersInText = messageContent.replace(/\D/g, '');
            if (numbersInText.length >= 10) {
                const possiblePhones = getPhoneVariations(numbersInText).join(',');
                const { data: userToLink } = await supabase.from('user_settings').select('*')
                    .or(`whatsapp_phone.in.(${possiblePhones}),partner_phone.in.(${possiblePhones})`).maybeSingle();

                if (userToLink) {
                    const isPartnerActivating = userToLink.partner_phone && getPhoneVariations(numbersInText).some(v => userToLink.partner_phone.includes(v));
                    if (isPartnerActivating) {
                        await supabase.from('user_settings').update({ partner_whatsapp_id: senderId }).eq('user_id', userToLink.user_id);
                        await sendWhatsAppMessage(userToLink.partner_phone, `✅ Parceiro vinculado!`);
                    } else {
                        await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', userToLink.user_id);
                        await sendWhatsAppMessage(userToLink.whatsapp_phone, `✅ Vinculado!`);
                    }
                    return NextResponse.json({ success: true, action: "linked" });
                }
            }
            return NextResponse.json({ error: "User unknown" });
        }

        const isPartnerMessage = userSettings.partner_whatsapp_id === senderId || userSettings.partner_whatsapp_id === senderRaw || (userSettings.partner_phone && variations.some(v => userSettings.partner_phone.includes(v)));
        const targetPhone = isPartnerMessage ? userSettings.partner_phone : userSettings.whatsapp_phone;

        // RATE LIMIT E DUPLICIDADE ─────────────────────────────────────────────
        const alreadyProcessed = await redis.get(`msg:${messageId}`);
        if (alreadyProcessed) return NextResponse.json({ status: 'Ignored Duplicate' });
        await redis.set(`msg:${messageId}`, '1', { ex: 86400 });

        const { success: rateLimitSuccess } = await ratelimit.limit(targetPhone);
        if (!rateLimitSuccess) {
            await sendWhatsAppMessage(targetPhone, "⏳ Aguarde um minuto."); return NextResponse.json({ status: 'Rate Limited' });
        }

        // DELEÇÃO PENDENTE ──────────────────────────────────────────
        // DELEÇÃO PENDENTE ──────────────────────────────────────────
        const pendingDeleteStr = await redis.get(`pending_delete:${targetPhone}`);
        if (pendingDeleteStr) {
            if (messageContent.trim().toUpperCase() === 'SIM') {
                
                // 🟢 A CORREÇÃO ESTÁ AQUI: Checa se já é um objeto antes de tentar converter
                const cmd = typeof pendingDeleteStr === 'string' ? JSON.parse(pendingDeleteStr) : pendingDeleteStr;
                
                const { data: items } = await supabase.from(cmd.table).select('id, title').eq('user_id', userSettings.user_id).ilike('title', `%${cmd.data.title}%`).order('created_at', { ascending: false }).limit(1);
                if (items?.length) {
                    await supabase.from(cmd.table).delete().eq('id', items[0].id);
                    await sendWhatsAppMessage(targetPhone, `🗑️ Apagado: "${items[0].title}"`);
                }
                await redis.del(`pending_delete:${targetPhone}`);
                return NextResponse.json({ success: true });
            } else {
                await redis.del(`pending_delete:${targetPhone}`);
                await sendWhatsAppMessage(targetPhone, `❌ Exclusão cancelada.`);
                return NextResponse.json({ success: true });
            }
        }

        // PROCESSAR MÍDIA ───────────────────────────────────────────
        let promptParts: any[] = [];
        let hasAudio = false, hasImage = false;
        const msgData = body.data?.message;
        const msgType = body.data?.messageType;

        if (msgType === "audioMessage" || msgData?.audioMessage) {
            let audioBase64 = body.data?.base64 || msgData?.audioMessage?.base64 || body.data?.message?.base64;
            if (!audioBase64) { const url = msgData?.audioMessage?.url || body.data?.mediaUrl; if (url) audioBase64 = await downloadMedia(url); }
            if (audioBase64) { hasAudio = true; promptParts.push({ inlineData: { mimeType: "audio/ogg", data: audioBase64 } }); }
            else { await sendWhatsAppMessage(targetPhone, "⚠️ Erro no áudio."); return NextResponse.json({ status: 'Audio Failed' }); }
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

        // ── VERIFICAR PLANO E PUXAR CONTEXTO ────────────────────────────────────
        const { data: profile } = await supabase.from('profiles').select('plan_tier').eq('id', userSettings.user_id).single();
        if (!['pro', 'agent', 'admin'].includes(profile?.plan_tier || 'free')) {
            await sendWhatsAppMessage(targetPhone, "🚫 Recurso Pro exclusivo.", 100); return NextResponse.json({ status: 'Blocked by Plan' });
        }

        const { data: workspaces } = await supabase.from('workspaces').select('id, title, whatsapp_rule').eq('user_id', userSettings.user_id);
        const primaryWorkspace = workspaces?.[0];

        // 🧠 CHAMA A API QUE ACABAMOS DE CRIAR!
        const ctx = await fetchFinancialContext(userSettings.user_id, primaryWorkspace?.id || '');

        // ── MODO DEBUG (RAIO X NO WHATSAPP) ────────────────────────────────────
        if (messageContent.trim().toUpperCase() === 'DEBUG') {
            const msgDebug = `🛠️ *MODO RAIO-X* 🛠️\n\n*Mês:* ${ctx.mes_atual}\n*Entradas:* ${ctx.entradas_fmt}\n*Saídas:* ${ctx.saidas_fmt}\n*SALDO ATUAL:* ${ctx.saldo_fmt}\n\n*Pendentes:* ${ctx.contas_pendentes}\n*Pagas:* ${ctx.contas_pagas}`;
            await sendWhatsAppMessage(targetPhone, msgDebug);
            return NextResponse.json({ success: true });
        }

        let workspacesContextPrompt = "";
        if (workspaces && workspaces.length > 1) {
            workspacesContextPrompt = `\n━━━ ÁREAS DE TRABALHO ━━━\nInclua "context" no JSON com o ID correto.\n`;
            workspaces.forEach((ws) => { workspacesContextPrompt += `- ID: "${ws.id}" | Nome: "${ws.title}" | Regra: "${(ws.whatsapp_rule || '').replace(/["{}[\]]/g, '')}"\n`; });
            workspacesContextPrompt += `Se não souber, use context: "${primaryWorkspace?.id}".\n`;
        } else if (primaryWorkspace) {
            workspacesContextPrompt = `Inclua "context": "${primaryWorkspace.id}" em todos os JSONs.\n`;
        }

        const dataHojeBR = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

        // ── SYSTEM PROMPT ─────────────────────────────────────────────
        const systemPrompt = `
IDENTIDADE: Você é "Meu Aliado", assistente financeiro via WhatsApp. Respostas curtas e humanas.
DATA DE HOJE: ${dataHojeBR} | MÊS ATUAL: ${ctx.mes_atual}

━━━ SITUAÇÃO FINANCEIRA DE ${ctx.mes_atual.toUpperCase()} ━━━
💰 Receitas do Mês:  ${ctx.entradas_fmt}
💸 Despesas do Mês:  ${ctx.saidas_fmt}
📊 Saldo em Conta:   ${ctx.saldo_fmt}
⏳ Contas a pagar:   ${ctx.pendente_fmt} (${ctx.contas_pendentes} conta(s) pendente(s))
✅ Contas Pagas:     ${ctx.contas_pagas} conta(s)
⚠️ Status:          ${ctx.estado_conta}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${workspacesContextPrompt}

🧠 REGRAS (JSON OBRIGATÓRIOS):
1. 💳 CARTÃO (se banco/cartão): {"action":"add","table":"installments","context":"ID","data":{"title":"Nome","value_per_month":0.00,"installments_count":1,"payment_method":"banco","due_day":10}}
2. 🔁 FIXO (todo mês/assinatura): {"action":"add","table":"recurring","context":"ID","data":{"title":"Nome","value":0.00,"type":"expense","due_day":10}}
3. 💸 GASTO COMUM (débito/pix/dia a dia): {"action":"add","table":"transactions","context":"ID","data":{"title":"Nome","amount":0.00,"type":"expense","date":"DD/MM/YYYY"}}
4. 💰 RECEITA (salário/recebido): {"action":"add","table":"transactions","context":"ID","data":{"title":"Nome","amount":0.00,"type":"income","date":"DD/MM/YYYY"}}
5. 🗑️ APAGAR: {"action":"remove","table":"transactions","data":{"title":"Nome aproximado"}}

💬 PERGUNTAS SOBRE FINANÇAS:
Use os dados da "Situação Financeira" acima para responder. Exemplo: "Seu saldo é R$ 93,00".
Retorne: [{"reply": "Sua resposta formatada"}]

REGRAS ABSOLUTAS:
✅ Retorne SEMPRE JSON. Zero texto fora.
✅ Valores: float com ponto (2000.00). NUNCA vírgula.
✅ SEMPRE inclua {"reply": "..."}
${hasAudio ? "\n⚠️ ÁUDIO: Transcreva e aja." : ""}
${hasImage ? "\n📸 IMAGEM: Extraia valor/data." : ""}
        `.trim();

        const finalPrompt = [systemPrompt, ...promptParts];

        // ── CHAMAR IA E EXECUTAR ───────────────────────────────────────────────
        let commands: any[] = [];
        try {
            const result = await model.generateContent(finalPrompt);
            let cleanJson = result.response.text().split('```json').join('').split('```').join('').trim();
            const arrayMatch = cleanJson.match(/\[[\s\S]*\]/);
            if (arrayMatch) cleanJson = arrayMatch[0];
            commands = JSON.parse(cleanJson);
            if (!Array.isArray(commands)) commands = [commands];
        } catch (e) {
            console.error("❌ ERRO IA:", e);
            await sendWhatsAppMessage(targetPhone, "Tive uma travada agora. Pode mandar de novo? 🤖");
            return NextResponse.json({ success: false });
        }

        let replySent = false;
        const validContextIds = new Set(workspaces?.map(w => w.id) || []);

        for (const cmd of commands) {
            if (cmd.table && !['transactions', 'installments', 'recurring'].includes(cmd.table)) continue;

            if (cmd.action === 'add') {
                if (isPartnerMessage && cmd.data?.title && !cmd.data.title.includes('[Parceiro]')) cmd.data.title = `[Parceiro] ${cmd.data.title}`;
                const targetContext = (cmd.context && validContextIds.has(cmd.context)) ? cmd.context : (primaryWorkspace?.id || null);
                const extractedValue = parseFloat(cmd.data?.amount) || parseFloat(cmd.data?.value) || parseFloat(cmd.data?.value_per_month) || parseFloat(cmd.data?.total_value) || 0;
                if (extractedValue <= 0) continue;

                let payload: any = { ...cmd.data, user_id: userSettings.user_id, context: targetContext, created_at: new Date(), message_id: messageId };

                if (cmd.table === 'installments') {
                    payload.current_installment = 0; payload.status = 'active'; payload.due_day = parseInt(cmd.data.due_day) || 10; payload.installments_count = parseInt(cmd.data.installments_count) || 1; payload.payment_method = cmd.data.payment_method || 'outros'; payload.value_per_month = extractedValue; payload.total_value = extractedValue * payload.installments_count; payload.paid_months = [];
                    delete payload.date; delete payload.target_month; delete payload.is_paid; delete payload.amount; delete payload.value;
                    await supabase.from('installments').insert([payload]);
                } else if (cmd.table === 'recurring') {
                    payload.status = 'active'; payload.value = extractedValue; payload.paid_months = []; payload.due_day = parseInt(cmd.data.due_day) || 10;
                    delete payload.is_paid; delete payload.amount; delete payload.date; delete payload.value_per_month;
                    await supabase.from('recurring').insert([payload]);
                } else if (cmd.table === 'transactions') {
                    if (!payload.date) { const hoje = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" })); payload.date = `${String(hoje.getDate()).padStart(2, '0')}/${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`; }
                    payload.amount = extractedValue; payload.is_paid = payload.type !== 'income'; payload.status = 'active'; payload.target_month = ctx.mes_atual;
                    delete payload.value; delete payload.value_per_month;
                    await supabase.from('transactions').insert([payload]);
                }
            } else if (cmd.action === 'remove') {
                await sendWhatsAppMessage(targetPhone, `⚠️ Apagar "${cmd.data.title}"? Responda *SIM*.`);
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
        console.error("🔥 ERRO FATAL:", e); return NextResponse.json({ error: e.message, status: "Caught" }, { status: 200 });
    }
}