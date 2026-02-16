import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://167.234.242.205:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "sua-senha-secreta";
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

// --- FUNÇÕES AUXILIARES ---

async function sendWhatsAppMessage(jid: string, text: string, delay: number = 1200) {
    const finalJid = jid.includes('@') ? jid : `${jid}@s.whatsapp.net`;
    try {
        console.log(`📤 Enviando para ${finalJid} (Delay: ${delay}ms)...`);
        await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: finalJid, text, delay: delay })
        });
    } catch (e) { console.error("❌ Erro Envio ZAP:", e); }
}

// 🔥 CORREÇÃO 1: DOWNLOADER BLINDADO
async function downloadMedia(url: string) {
    try {
        console.log("📥 Baixando mídia:", url);
        
        const headers: any = {};
        // Se a URL não for direta do WhatsApp, usa a API Key do Evolution
        if (!url.includes('whatsapp.net')) {
            headers['apikey'] = EVOLUTION_API_KEY;
        }

        // Timeout de 10s para não travar
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, { headers, signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) return null;

        // Verifica o tipo do arquivo (aceita imagens e o formato binário do Zap)
        const contentType = response.headers.get('content-type');
        if (contentType && !contentType.startsWith('image/') && !contentType.startsWith('audio/') && !contentType.includes('application/octet-stream')) {
            console.error("❌ Tipo inválido:", contentType);
            return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer).toString('base64');
    } catch (error) { 
        console.error("❌ Erro download:", error);
        return null; 
    }
}

// 🔥 CORREÇÃO 2: PARSE DE VALORES (1.200,50 -> 1200.50)
function parseBRL(value: any) {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    // Remove pontos de milhar e troca vírgula decimal por ponto
    const cleanStr = value.toString().replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanStr) || 0;
}

// 🧠 CÁLCULO FINANCEIRO (MANTIDO IGUAL)
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
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

        const body = await req.json();

        // 1. FILTROS BÁSICOS
        if (body.event && body.event !== "messages.upsert") return NextResponse.json({ status: 'Ignored Event' });
        const key = body.data?.key;
        if (!key?.remoteJid || key.fromMe) return NextResponse.json({ status: 'Ignored' });
        
        const messageId = key.id; 
        const remoteJid = key.remoteJid;       
        const senderId = remoteJid.split('@')[0];
        const messageContent = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";

        // --- PROCESSAMENTO DE MÍDIA (ATUALIZADO) ---
        let promptParts: any[] = [];
        let hasAudio = false;
        let hasImage = false;

        const msgData = body.data?.message;
        const msgType = body.data?.messageType;

        // Verifica Imagem
        if (msgType === "imageMessage" || msgData?.imageMessage) {
            hasImage = true;
            let imgBase64 = body.data?.base64 || msgData.imageMessage?.base64;
            if (!imgBase64 && msgData.imageMessage.url) imgBase64 = await downloadMedia(msgData.imageMessage.url);
            
            if (imgBase64) {
                // Remove prefixo data:image para evitar erro 400 do Gemini
                const cleanBase64 = imgBase64.replace(/^data:image\/[a-z]+;base64,/, "");
                promptParts.push({ inlineData: { mimeType: "image/jpeg", data: cleanBase64 } });
            }
        }

        // Verifica Áudio
        if (msgType === "audioMessage" || msgData?.audioMessage) {
            hasAudio = true;
            let audioBase64 = body.data?.base64 || msgData.audioMessage?.base64;
            if (!audioBase64 && msgData.audioMessage.url) audioBase64 = await downloadMedia(msgData.audioMessage.url);
            
            if (audioBase64) {
                const cleanAudio = audioBase64.replace(/^data:audio\/[a-z]+;base64,/, "");
                promptParts.push({ inlineData: { mimeType: "audio/ogg", data: cleanAudio } });
            } else {
                await sendWhatsAppMessage(remoteJid, "⚠️ Erro no áudio. Mande texto.");
                return NextResponse.json({ status: 'Audio Failed' });
            }
        }

        // Adiciona texto se houver
        if (messageContent) promptParts.push(messageContent);
        if (promptParts.length === 0) return NextResponse.json({ status: 'No Content' });

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
        
        const { data: profile } = await supabase.from('profiles').select('plan_tier').eq('id', userSettings.user_id).single();
        if (!['pro', 'agent', 'admin'].includes(profile?.plan_tier || 'free')) {
            await sendWhatsAppMessage(userSettings.whatsapp_phone || senderId, "🚫 Função exclusiva Pro.");
            return NextResponse.json({ status: 'Blocked Plan' });
        }

        if (senderId !== userSettings.whatsapp_phone && userSettings.whatsapp_id !== senderId) {
            await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', userSettings.user_id);
        }

        const targetPhone = userSettings.whatsapp_phone || senderId;
        const { data: workspace } = await supabase.from('workspaces').select('id').eq('user_id', userSettings.user_id).limit(1).single();

        // 3. CONTEXTO FINANCEIRO
        let contextInfo = { saldo: "0", resumo_texto: "Sem dados", estado_conta: "Indefinido" };
        if (workspace) contextInfo = await getFinancialContext(supabase, userSettings.user_id, workspace.id);

        // 4. PROMPT DA IA (SEU PROMPT ORIGINAL + INSTRUÇÃO DE IMAGEM)
        const systemPrompt = `
        ATUE COMO: "Meu Aliado", assistente financeiro.
        HOJE: ${new Date().toLocaleDateString('pt-BR')}.
        --- DADOS FINANCEIROS REAIS ---
        ${JSON.stringify(contextInfo)}
        -------------------------------
        SUA MISSÃO:
        1. ADICIONAR CONTA: 
           - SE estiver 'CRÍTICO' ou 'ALERTA', INCLUA UM ALERTA GRAVE.
           - SE for IMAGEM (Comprovante): Extraia o VALOR TOTAL e a DATA da compra. Se não achar data, use HOJE.
        2. CONSULTA:
           - Se perguntar "Como estou?", use o 'resumo_texto'.
        
        FORMATO (JSON ARRAY SEM MARKDOWN):
        [{"action": "add", ...}, {"reply": "Texto..."}]
        
        AÇÕES JSON:
        1. ADICIONAR (add):
           - transactions: [{"action":"add", "table":"transactions", "data":{ "title": "...", "amount": 0.00, "type": "expense", "date": "DD/MM/YYYY", "category": "Outros", "target_month": "Mês" }}]
           - installments: [{"action":"add", "table":"installments", "data":{ "title": "...", "total_value": 0.00, "installments_count": 1, "value_per_month": 0.00, "due_day": 10, "status": "active" }}]
        2. CONVERSAR (reply):
           - [{"reply": "Sua resposta..."}]
        
        ${hasAudio ? "Transcrição do Áudio: O usuário falou algo. Entenda e execute." : ""}
        ${hasImage ? "IMAGEM RECEBIDA: Analise visualmente o comprovante." : ""}
        `;

        const finalPrompt = [systemPrompt, ...promptParts];
        
        // --- CHAMADA SEGURA (WRAP) ---
        let result;
        try {
            result = await model.generateContent(finalPrompt);
        } catch (genError: any) {
            console.error("⚠️ Erro Gemini:", genError.message);
            if (hasImage) {
                await sendWhatsAppMessage(targetPhone, "⚠️ Não consegui ler a imagem. Tente digitar o valor.");
                return NextResponse.json({ success: true, status: 'Gemini Image Error' });
            }
            throw genError;
        }

        // LIMPEZA DO JSON
        let cleanJson = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const arrayMatch = cleanJson.match(/\[[\s\S]*\]/);
        if (arrayMatch) cleanJson = arrayMatch[0];

        try {
            let commands = JSON.parse(cleanJson);
            if (!Array.isArray(commands)) commands = [commands];

            let replySent = false;

            for (const cmd of commands) {
                if (cmd.action === 'add') {
                    let payload: any = { 
                        ...cmd.data, 
                        user_id: userSettings.user_id, 
                        context: workspace?.id, 
                        created_at: new Date(), 
                        message_id: messageId,
                        // 🔥 CORREÇÃO 3: Parse Numérico
                        amount: parseBRL(cmd.data.amount || cmd.data.value)
                    };

                    // PARCELAS
                    if (cmd.table === 'installments') {
                        payload.current_installment = 0; payload.status = 'active';
                        payload.total_value = parseBRL(cmd.data.total_value || payload.amount);
                        delete payload.amount; delete payload.date; delete payload.target_month;
                        
                        const { error } = await supabase.from('installments').insert([payload]);
                        
                        if (error && error.code === '23505') { replySent = true; continue; }

                        if (!error && !commands.some((c:any) => c.reply)) {
                             const total = (payload.total_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                             await sendWhatsAppMessage(targetPhone, `✅ Parcelado: ${cmd.data.title} (${total})`);
                        }
                    }
                    // RECORRENTES
                    else if (cmd.table === 'recurring') {
                        payload.status = 'active';
                        payload.value = payload.amount;
                        delete payload.amount;
                        const { error } = await supabase.from('recurring').insert([payload]);
                        
                        if (error && error.code === '23505') { replySent = true; continue; }

                        if (!error && !commands.some((c:any) => c.reply)) await sendWhatsAppMessage(targetPhone, `✅ Fixo: ${cmd.data.title}`);
                    }
                    // GASTOS (TRANSACTIONS)
                    else if (cmd.table === 'transactions') {
                        if (!payload.date) {
                            payload.date = new Date().toLocaleDateString('pt-BR');
                        }
                        // Cálculo de Target Month
                        const parts = payload.date.split('/');
                        if (parts.length === 3) {
                            const map: any = { '01':'Jan', '02':'Fev', '03':'Mar', '04':'Abr', '05':'Mai', '06':'Jun', '07':'Jul', '08':'Ago', '09':'Set', '10':'Out', '11':'Nov', '12':'Dez' };
                            payload.target_month = map[parts[1]] || 'Jan';
                        } else {
                            payload.target_month = 'Jan'; 
                        }

                        payload.is_paid = true; payload.status = 'paid';
                        const { error } = await supabase.from('transactions').insert([payload]);
                        
                        if (error && error.code === '23505') { replySent = true; continue; }
                        
                        if (!error && !commands.some((c:any) => c.reply)) {
                             const val = (payload.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                             await sendWhatsAppMessage(targetPhone, `✅ Lançado: ${cmd.data.title} (${val})`);
                        }
                    }
                }
                else if (cmd.action === 'remove') {
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
            if (!hasAudio && !hasImage) await sendWhatsAppMessage(targetPhone, result.response.text());
            else await sendWhatsAppMessage(targetPhone, "Não consegui ler os dados.");
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        // Retorna 200 com erro para parar loop do WhatsApp
        return NextResponse.json({ error: e.message }, { status: 200 });
    }
}