import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const EVOLUTION_URL = process.env.EVOLUTION_URL || "[http://167.234.242.205:8080](http://167.234.242.205:8080)";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "sua-senha-secreta";
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

// --- FUNÇÕES AUXILIARES (Mantidas) ---

async function sendWhatsAppMessage(jid: string, text: string, delay: number = 1200) {
    const finalJid = jid.includes('@') ? jid : `${jid}@s.whatsapp.net`;
    try {
        console.log(`📤 Enviando para ${finalJid} (Delay: ${delay}ms)...`);
        const res = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: finalJid, text, delay: delay })
        });
        const json = await res.json();
        console.log("✅ Status Envio:", json);
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

// 🧠 CÁLCULO FINANCEIRO (Mantido)
async function getFinancialContext(supabase: any, userId: string, workspaceId: string) {
    const today = new Date();
    const monthStr = String(today.getMonth() + 1).padStart(2, '0');
    const yearStr = today.getFullYear();
    
    const { data: transactions } = await supabase.from('transactions').select('type, amount').eq('user_id', userId).eq('context', workspaceId).like('date', `%/${monthStr}/${yearStr}`).neq('status', 'delayed');
    const { data: recurring } = await supabase.from('recurring').select('type, value').eq('user_id', userId).eq('context', workspaceId).eq('status', 'active');
    const { data: installments } = await supabase.from('installments').select('value_per_month').eq('user_id', userId).eq('context', workspaceId).eq('status', 'active');

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
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" }); // Usei o flash por ser mais rápido no Zap

        const body = await req.json();

        // 1. FILTROS BÁSICOS
        if (body.event && body.event !== "messages.upsert") return NextResponse.json({ status: 'Ignored Event' });
        const key = body.data?.key;
        if (!key?.remoteJid || key.fromMe) return NextResponse.json({ status: 'Ignored' });
        
        const messageId = key.id; 
        const remoteJid = key.remoteJid;       
        const senderId = remoteJid.split('@')[0];
        const messageContent = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";

        // --- PROCESSAMENTO DE MÍDIA (ATUALIZADO PARA IMAGENS) ---
        let promptParts: any[] = [];
        let hasAudio = false;
        let hasImage = false; // Novo flag

        const msgData = body.data?.message;
        const msgType = body.data?.messageType;

        // Verifica Áudio
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
                await sendWhatsAppMessage(remoteJid, "⚠️ Erro no áudio. Mande texto.");
                return NextResponse.json({ status: 'Audio Failed' });
            }
        } 
        // Verifica Imagem (NOVO)
        else if (msgType === "imageMessage" || msgData?.imageMessage) {
            let imgBase64 = body.data?.base64 || msgData?.imageMessage?.base64;
            if (!imgBase64) {
                const url = msgData?.imageMessage?.url || body.data?.mediaUrl;
                if (url) imgBase64 = await downloadMedia(url);
            }
            if (imgBase64) {
                hasImage = true;
                promptParts.push({ inlineData: { mimeType: "image/jpeg", data: imgBase64 } });
            }
        }
        else {
            if (!messageContent) return NextResponse.json({ status: 'No Content' });
            promptParts.push(messageContent);
        }

        // 2. IDENTIFICAÇÃO DO USUÁRIO (Mantido)
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
        
        // TRAVA DE PLANO (Mantida)
        const { data: profile } = await supabase.from('profiles').select('plan_tier').eq('id', userSettings.user_id).single();
        const plan = profile?.plan_tier || 'free';
        
        if (!['pro', 'agent', 'admin'].includes(plan)) {
            const targetForBlock = userSettings.whatsapp_phone || senderId;
            await sendWhatsAppMessage(targetForBlock, "🚫 *Acesso Exclusivo PRO*...", 100);
            return NextResponse.json({ status: 'Blocked by Plan', plan: plan });
        }

        if (senderId !== userSettings.whatsapp_phone && userSettings.whatsapp_id !== senderId) {
            await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', userSettings.user_id);
        }

        const targetPhone = userSettings.whatsapp_phone || senderId;
        const { data: workspace } = await supabase.from('workspaces').select('id').eq('user_id', userSettings.user_id).limit(1).single();

        // 3. CONTEXTO FINANCEIRO
        let contextInfo = { saldo: "0", resumo_texto: "Sem dados", estado_conta: "Indefinido" };
        if (workspace) contextInfo = await getFinancialContext(supabase, userSettings.user_id, workspace.id);

        // 4. PROMPT DA IA (ATUALIZADO PARA LER COMPROVANTES)
        const systemPrompt = `
        ATUE COMO: "Meu Aliado", assistente financeiro.
        HOJE: ${new Date().toLocaleDateString('pt-BR')}.
        --- DADOS FINANCEIROS REAIS ---
        ${JSON.stringify(contextInfo)}
        -------------------------------
        SUA MISSÃO:
        1. SE RECEBER IMAGEM (COMPROVANTE):
           - Extraia o VALOR TOTAL (ex: "TOTAL R$ 14,93").
           - Extraia a DATA da compra. Se não achar, use HOJE.
           - Gere o JSON de "transactions".

        2. SE RECEBER ÁUDIO/TEXTO:
           - Interprete e gere o JSON.

        3. ADICIONAR CONTA: 
           - SE estiver 'CRÍTICO' ou 'ALERTA', INCLUA UM ALERTA GRAVE.
        4. CONSULTA:
           - Se perguntar "Como estou?", use o 'resumo_texto'.

        FORMATO OBRIGATÓRIO (Responda APENAS o JSON, sem markdown):
        [{"action": "add", ...}]

        EXEMPLOS JSON:
        1. GASTOS (transactions):
           [{"action":"add", "table":"transactions", "data":{ "title": "Uber", "amount": 14.93, "type": "expense", "date": "11/02/2026", "category": "Transporte", "target_month": "Fev" }}]
           *IMPORTANTE: Use ponto para decimais (14.93), não vírgula.*

        2. PARCELADOS (installments):
           [{"action":"add", "table":"installments", "data":{ "title": "TV", "total_value": 1000.00, "installments_count": 10, "value_per_month": 100.00, "due_day": 10, "status": "active" }}]

        ${hasAudio ? "Transcrição do Áudio: O usuário falou algo. Entenda e execute." : ""}
        ${hasImage ? "Imagem: Analise o comprovante visualmente." : ""}
        `;

        const finalPrompt = [systemPrompt, ...promptParts];
        const result = await model.generateContent(finalPrompt);
        
        // --- LIMPEZA DO JSON (IMPORTANTE!) ---
        let rawText = result.response.text();
        let cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonMatch = cleanJson.match(/\[[\s\S]*\]/);
        if (jsonMatch) cleanJson = jsonMatch[0];

        try {
            let commands = JSON.parse(cleanJson);
            if (!Array.isArray(commands)) commands = [commands];

            let replySent = false;

            for (const cmd of commands) {
                if (cmd.action === 'add') {
                    // Prepara Payload Base
                    let payload: any = { 
                        ...cmd.data, 
                        user_id: userSettings.user_id, 
                        context: workspace?.id, 
                        created_at: new Date(), 
                        message_id: messageId,
                        // Garante que amount seja número (corrige o bug do gasto zerado)
                        amount: typeof cmd.data.amount === 'string' ? parseFloat(cmd.data.amount.replace(',', '.')) : (cmd.data.amount || 0)
                    };

                    if (cmd.table === 'installments') {
                        // Sua lógica de Installments
                        payload.current_installment = 0; payload.status = 'active';
                        delete payload.date; delete payload.target_month;
                        // Garante valores numéricos
                        payload.total_value = parseFloat(cmd.data.total_value) || payload.amount;
                        payload.value_per_month = parseFloat(cmd.data.value_per_month) || 0;

                        const { error } = await supabase.from('installments').insert([payload]);
                        
                        if (error && error.code === '23505') { replySent = true; continue; }

                        if (!error && !commands.some((c:any) => c.reply)) {
                             const total = (payload.total_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                             await sendWhatsAppMessage(targetPhone, `✅ Parcelado: ${cmd.data.title} (${total})`);
                        }
                    }
                    else if (cmd.table === 'recurring') {
                        // Sua lógica de Recurring
                        payload.status = 'active';
                        payload.value = payload.amount; // Recurring usa 'value'
                        delete payload.amount; 
                        const { error } = await supabase.from('recurring').insert([payload]);
                        
                        if (error && error.code === '23505') { replySent = true; continue; }

                        if (!error && !commands.some((c:any) => c.reply)) await sendWhatsAppMessage(targetPhone, `✅ Fixo: ${cmd.data.title}`);
                    }
                    else if (cmd.table === 'transactions') {
                        // --- LÓGICA DE DATA E MÊS (CORREÇÃO AQUI) ---
                        if (!payload.date) {
                            // Se a IA não mandou data, usa Hoje
                            payload.date = new Date().toLocaleDateString('pt-BR');
                        }
                        
                        // Extrai o target_month da data que a IA mandou (ex: "11/02/2026")
                        const parts = payload.date.split('/'); // [11, 02, 2026]
                        if (parts.length === 3) {
                            const map: any = { '01':'Jan', '02':'Fev', '03':'Mar', '04':'Abr', '05':'Mai', '06':'Jun', '07':'Jul', '08':'Ago', '09':'Set', '10':'Out', '11':'Nov', '12':'Dez' };
                            payload.target_month = map[parts[1]] || 'Jan';
                        } else {
                            // Fallback se a data vier estranha
                            payload.target_month = 'Jan'; 
                        }

                        payload.is_paid = true; payload.status = 'paid';
                        
                        const { error } = await supabase.from('transactions').insert([payload]);
                        
                        if (error && error.code === '23505') { replySent = true; continue; }
                        
                        if (!error && !commands.some((c:any) => c.reply)) {
                             const val = (payload.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                             await sendWhatsAppMessage(targetPhone, `✅ Lançado: ${cmd.data.title} (${val}) - ${payload.date}`);
                        }
                    }
                }
                else if (cmd.action === 'remove') {
                    // Sua lógica de Remove
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
            if (hasAudio) await sendWhatsAppMessage(targetPhone, "Erro técnico na IA.");
            // Se falhar o JSON, manda o texto cru como fallback
            else await sendWhatsAppMessage(targetPhone, rawText);
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}