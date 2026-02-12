import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://167.234.242.205:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "sua-senha-secreta";
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

// --- FUNÇÕES AUXILIARES ---

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
async function getFinancialContext(supabase: any, userId: string, workspaceId: string) {
    const today = new Date();
    const monthStr = String(today.getMonth() + 1).padStart(2, '0');
    const yearStr = today.getFullYear();
    
    // 1. Busca Transações do Mês
    const { data: transactions } = await supabase
        .from('transactions')
        .select('type, amount')
        .eq('user_id', userId)
        .eq('context', workspaceId)
        .like('date', `%/${monthStr}/${yearStr}`)
        .neq('status', 'delayed');

    // 2. Busca Fixos Ativos
    const { data: recurring } = await supabase
        .from('recurring')
        .select('type, value')
        .eq('user_id', userId)
        .eq('context', workspaceId)
        .eq('status', 'active');

    // 3. Busca Parcelamentos Ativos
    const { data: installments } = await supabase
        .from('installments')
        .select('value_per_month')
        .eq('user_id', userId)
        .eq('context', workspaceId)
        .eq('status', 'active');

    let totalEntradas = 0;
    let totalSaidas = 0;

    transactions?.forEach((t: any) => t.type === 'income' ? totalEntradas += t.amount : totalSaidas += t.amount);
    recurring?.forEach((r: any) => r.type === 'income' ? totalEntradas += r.value : totalSaidas += r.value);
    installments?.forEach((i: any) => totalSaidas += i.value_per_month);

    const saldo = totalEntradas - totalSaidas;

    let estado = "ESTÁVEL";
    if (saldo < 0) estado = "CRÍTICO (VERMELHO)";
    else if (saldo < (totalEntradas * 0.1)) estado = "ALERTA (POUCA MARGEM)";

    return {
        saldo: saldo.toFixed(2),
        entradas: totalEntradas.toFixed(2),
        saidas: totalSaidas.toFixed(2),
        estado_conta: estado,
        resumo_texto: `Receita: R$${totalEntradas.toFixed(2)} | Despesas Totais: R$${totalSaidas.toFixed(2)} | SALDO FINAL: R$${saldo.toFixed(2)}`
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
        const remoteJid = key.remoteJid;       
        const senderId = remoteJid.split('@')[0];
        const messageContent = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";

        // --- PROCESSAMENTO DE ÁUDIO ---
        let promptParts: any[] = [];
        let hasAudio = false;
        const msgData = body.data?.message;
        const msgType = body.data?.messageType;

        if (msgType === "audioMessage" || msgData?.audioMessage) {
            console.log("🎙️ Áudio detectado.");
            let audioBase64 = body.data?.base64 || msgData?.audioMessage?.base64 || body.data?.message?.base64;
            if (!audioBase64) {
                const url = msgData?.audioMessage?.url || body.data?.mediaUrl;
                if (url) {
                    if (url.includes('.enc')) console.warn("⚠️ URL Criptografada.");
                    audioBase64 = await downloadMedia(url);
                }
            }
            if (audioBase64) {
                hasAudio = true;
                promptParts.push({ inlineData: { mimeType: "audio/ogg", data: audioBase64 } });
            } else {
                await sendWhatsAppMessage(remoteJid, "⚠️ Erro no áudio. Mande texto.");
                return NextResponse.json({ status: 'Audio Failed' });
            }
        } else {
            if (!messageContent) return NextResponse.json({ status: 'No Content' });
            promptParts.push(messageContent);
        }

        console.log(`📩 Processando msg de: ${senderId}`);

        // 2. IDENTIFICAÇÃO DO USUÁRIO
        let { data: userSettings } = await supabase.from('user_settings').select('*').or(`whatsapp_phone.eq.${senderId},whatsapp_id.eq.${senderId}`).maybeSingle();

        if (!userSettings) {
             const variations = [senderId, senderId.replace(/^55/, ''), `55${senderId}`];
             const { data: found } = await supabase.from('user_settings').select('*').in('whatsapp_phone', variations).maybeSingle();
             if (found) {
                 userSettings = found;
                 await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', found.user_id);
             }
        }

        if (!userSettings) {
            const numbersInText = messageContent.replace(/\D/g, ''); 
            if (numbersInText.length >= 10) { 
                const possiblePhones = [numbersInText, `55${numbersInText}`, numbersInText.replace(/^55/, '')];
                const { data: userToLink } = await supabase.from('user_settings').select('*').in('whatsapp_phone', possiblePhones).maybeSingle();

                if (userToLink) {
                    await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', userToLink.user_id);
                    await sendWhatsAppMessage(remoteJid, `✅ *Vinculado!* Agora você pode usar a IA.`);
                    return NextResponse.json({ success: true, action: "linked" });
                }
            }
            return NextResponse.json({ error: "User unknown" });
        }
        
        // =================================================================================
        // 🔒 1. TRAVA DE SEGURANÇA: VERIFICAÇÃO DE PLANO
        // =================================================================================
        
        const { data: profile } = await supabase
            .from('profiles')
            .select('plan_tier')
            .eq('id', userSettings.user_id)
            .single();

        const plan = profile?.plan_tier || 'free';
        
        // Se NÃO for Pro, Agent ou Admin, BLOQUEIA e avisa.
        if (!['pro', 'agent', 'admin'].includes(plan)) {
            console.log(`🚫 Bloqueado: ${senderId} é plano '${plan}'`);
            
            await sendWhatsAppMessage(remoteJid, 
                "🚫 *Acesso Exclusivo PRO*\n\n" +
                "A Inteligência Artificial no WhatsApp está disponível apenas nos planos **Pro** e **Consultor**.\n\n" +
                "Faça o upgrade no seu painel para desbloquear: lançamentos por áudio, consultas e muito mais! 🚀"
            );
            
            return NextResponse.json({ status: 'Blocked by Plan', plan: plan });
        }
        // =================================================================================

        if (senderId !== userSettings.whatsapp_phone && userSettings.whatsapp_id !== senderId) {
            await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', userSettings.user_id);
        }

        const targetPhone = userSettings.whatsapp_phone || senderId;
        const { data: workspace } = await supabase.from('workspaces').select('id').eq('user_id', userSettings.user_id).limit(1).single();

        // 3. CONTEXTO FINANCEIRO
        let contextInfo = { saldo: "0", resumo_texto: "Sem dados", estado_conta: "Indefinido" };
        if (workspace) {
            contextInfo = await getFinancialContext(supabase, userSettings.user_id, workspace.id);
        }

        // 4. PROMPT DA IA
        const systemPrompt = `
        ATUE COMO: "Meu Aliado", assistente financeiro.
        HOJE: ${new Date().toLocaleDateString('pt-BR')}.
        
        --- DADOS FINANCEIROS REAIS ---
        ${JSON.stringify(contextInfo)}
        -------------------------------

        SUA MISSÃO:
        1. ADICIONAR CONTA: 
           - Verifique o campo 'estado_conta' acima.
           - SE estiver 'CRÍTICO' ou 'ALERTA' e o usuário adicionar um gasto, INCLUA UM ALERTA GRAVE.
           - Ex: "Adicionei, mas CUIDADO! Seu saldo já está negativo em R$ ${contextInfo.saldo}."

        2. CONSULTA:
           - Se perguntar "Como estou?", use o 'resumo_texto'.

        FORMATO (JSON ARRAY):
        [{"action": "add", ...}, {"reply": "Texto..."}]

        AÇÕES JSON:
        1. ADICIONAR (add):
           - transactions: [{"action":"add", "table":"transactions", "data":{ "title": "...", "amount": 0.00, "type": "expense", "date": "DD/MM/YYYY", "category": "Outros", "target_month": "Mês" }}]
           - installments: [{"action":"add", "table":"installments", "data":{ "title": "...", "total_value": 0.00, "installments_count": 1, "value_per_month": 0.00, "due_day": 10, "status": "active" }}]
        
        2. CONVERSAR (reply):
           - [{"reply": "Sua resposta..."}]

        ${hasAudio ? "Transcrição do Áudio: O usuário falou algo. Entenda e execute." : ""}
        `;

        const finalPrompt = [systemPrompt, ...promptParts];
        const result = await model.generateContent(finalPrompt);
        
        let cleanJson = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const arrayMatch = cleanJson.match(/\[[\s\S]*\]/);
        if (arrayMatch) cleanJson = arrayMatch[0];

        try {
            let commands = JSON.parse(cleanJson);
            if (!Array.isArray(commands)) commands = [commands];

            let replySent = false;

            for (const cmd of commands) {
                if (cmd.action === 'add') {
                    let payload: any = { ...cmd.data, user_id: userSettings.user_id, context: workspace?.id, created_at: new Date(), message_id: messageId };

                    if (cmd.table === 'installments') {
                        payload.current_installment = 0; payload.status = 'active';
                        delete payload.date; delete payload.target_month;
                        const { error } = await supabase.from('installments').insert([payload]);
                        
                        // 🔁 CORREÇÃO DE DUPLICIDADE: Se já existir (erro 23505), SILENCIA o bot
                        if (error) {
                            if (error.code === '23505') { 
                                console.log("🔁 Duplicidade detectada (Installment). Silenciando resposta.");
                                replySent = true; 
                                continue; 
                            }
                        }

                        if (!error && !commands.some((c:any) => c.reply)) {
                             const total = (cmd.data.total_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                             await sendWhatsAppMessage(targetPhone, `✅ Parcelado: ${cmd.data.title} (${total})`);
                        }
                    }
                    else if (cmd.table === 'recurring') {
                        payload.status = 'active';
                        const { error } = await supabase.from('recurring').insert([payload]);
                        
                        // 🔁 CORREÇÃO DE DUPLICIDADE
                        if (error) {
                            if (error.code === '23505') { 
                                console.log("🔁 Duplicidade detectada (Recurring). Silenciando resposta.");
                                replySent = true; 
                                continue; 
                            }
                        }

                        if (!error && !commands.some((c:any) => c.reply)) await sendWhatsAppMessage(targetPhone, `✅ Fixo: ${cmd.data.title}`);
                    }
                    else if (cmd.table === 'transactions') {
                        if (!payload.date) {
                            const hoje = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
                            const dStr = String(hoje.getDate()).padStart(2,'0');
                            const mStr = String(hoje.getMonth()+1).padStart(2,'0');
                            payload.date = `${dStr}/${mStr}/${hoje.getFullYear()}`;
                        }
                        payload.is_paid = true; payload.status = 'paid';
                        const { error } = await supabase.from('transactions').insert([payload]);
                        
                        // 🔁 CORREÇÃO DE DUPLICIDADE
                        if (error) {
                            if (error.code === '23505') { 
                                console.log("🔁 Duplicidade detectada (Transaction). Silenciando resposta.");
                                replySent = true; 
                                continue; 
                            }
                        }
                        
                        if (!error && !commands.some((c:any) => c.reply)) {
                             const val = (cmd.data.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                             await sendWhatsAppMessage(targetPhone, `✅ Lançado: ${cmd.data.title} (${val})`);
                        }
                    }
                }
                else if (cmd.action === 'remove') {
                    // Lógica de remoção permanece a mesma
                    const { data: items } = await supabase.from(cmd.table).select('id, title').eq('user_id', userSettings.user_id).ilike('title', `%${cmd.data.title}%`).order('created_at', { ascending: false }).limit(1);
                    if (items?.length) {
                        await supabase.from(cmd.table).delete().eq('id', items[0].id);
                        if (!commands.some((c:any) => c.reply)) await sendWhatsAppMessage(targetPhone, `🗑️ Apagado: "${items[0].title}"`);
                    } else {
                        if (!commands.some((c:any) => c.reply)) await sendWhatsAppMessage(targetPhone, `⚠️ Não encontrei "${cmd.data.title}"`);
                    }
                }

                if (cmd.reply && !replySent) {
                    await sendWhatsAppMessage(targetPhone, cmd.reply);
                    replySent = true;
                }
            }
        } catch (error) {
            console.error("❌ ERRO JSON:", error);
            if (hasAudio) await sendWhatsAppMessage(targetPhone, "Erro técnico. Tente texto.");
            else await sendWhatsAppMessage(targetPhone, result.response.text());
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}