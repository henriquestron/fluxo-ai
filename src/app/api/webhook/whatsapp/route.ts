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

// 🧠 NOVO: Função que busca o resumo financeiro do usuário
async function getFinancialContext(supabase: any, userId: string, workspaceId: string) {
    const today = new Date();
    const monthStr = String(today.getMonth() + 1).padStart(2, '0'); // "02"
    const yearStr = today.getFullYear(); // "2026"
    
    // 1. Pega Transações do Mês (Entradas e Saídas)
    const { data: transactions } = await supabase
        .from('transactions')
        .select('type, amount, category')
        .eq('user_id', userId)
        .eq('context', workspaceId)
        .like('date', `%/${monthStr}/${yearStr}`); // Filtra pelo mês atual na string "DD/MM/YYYY"

    // 2. Pega Recorrentes Ativos (Salários e Contas Fixas)
    const { data: recurring } = await supabase
        .from('recurring')
        .select('type, value, title')
        .eq('user_id', userId)
        .eq('context', workspaceId)
        .eq('status', 'active');

    // Cálculos Rápidos
    let totalEntradas = 0;
    let totalSaidas = 0;

    // Soma Transações
    transactions?.forEach((t: any) => {
        if (t.type === 'income') totalEntradas += t.amount;
        else totalSaidas += t.amount;
    });

    // Soma Recorrentes (Estimativa)
    recurring?.forEach((r: any) => {
        if (r.type === 'income') totalEntradas += r.value;
        else totalSaidas += r.value;
    });

    const saldo = totalEntradas - totalSaidas;

    return {
        saldo_estimado: saldo.toFixed(2),
        entradas: totalEntradas.toFixed(2),
        saidas: totalSaidas.toFixed(2),
        resumo: `Receita: R$${totalEntradas} | Despesa: R$${totalSaidas} | Saldo: R$${saldo}`
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

        // --- LÓGICA DE ÁUDIO ---
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

        // 2. BUSCA E VINCULAÇÃO DE USUÁRIO
        let { data: userSettings } = await supabase.from('user_settings').select('*').or(`whatsapp_phone.eq.${senderId},whatsapp_id.eq.${senderId}`).maybeSingle();

        if (!userSettings) {
             const variations = [senderId, senderId.replace(/^55/, ''), senderId.length > 12 ? senderId.replace('9', '') : senderId, `55${senderId}`];
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
                    await sendWhatsAppMessage(remoteJid, `✅ *Vinculado!* \nAgora sei quem você é.`);
                    return NextResponse.json({ success: true, action: "linked" });
                }
            }
            return NextResponse.json({ error: "User unknown" });
        }
        
        if (senderId !== userSettings.whatsapp_phone && userSettings.whatsapp_id !== senderId) {
            await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', userSettings.user_id);
            userSettings.whatsapp_id = senderId;
        }

        const targetPhone = userSettings.whatsapp_phone || senderId;
        const { data: workspace } = await supabase.from('workspaces').select('id').eq('user_id', userSettings.user_id).limit(1).single();

        // 🧠 3. PREPARA O CONTEXTO FINANCEIRO (A MÁGICA ACONTECE AQUI)
        let financialContext = { resumo: "Sem dados ainda", saldo_estimado: "0" };
        if (workspace) {
            financialContext = await getFinancialContext(supabase, userSettings.user_id, workspace.id);
        }

        // 4. IA COM CONTEXTO E INSTRUÇÕES DE DICAS
        const systemPrompt = `
        ATUE COMO: "Meu Aliado", assistente financeiro pessoal no WhatsApp.
        HOJE: ${new Date().toLocaleDateString('pt-BR')}.
        
        --- SITUAÇÃO FINANCEIRA ATUAL DO USUÁRIO ---
        ${JSON.stringify(financialContext)}
        -------------------------------------------

        ${hasAudio ? "O USUÁRIO MANDOU ÁUDIO. Transcreva e entenda a intenção." : ""}

        SUA MISSÃO:
        1. Se for para ADICIONAR conta:
           - Verifique o 'saldo_estimado' acima.
           - Se o novo gasto for deixar o saldo negativo ou apertado, ADICIONE O GASTO, mas inclua um ALERTA no campo 'reply'.
           - Ex: "Adicionei o Uber de R$50. ⚠️ Cuidado, seu saldo agora está negativo!"
        
        2. Se o usuário perguntar "Como estou?" ou pedir DICAS:
           - Analise os números acima (Receita vs Despesa).
           - Responda no campo 'reply' com uma análise curta e útil.
           - Ex: "Você gastou muito mais do que ganhou este mês. Sugiro cortar..."

        FORMATO DE RESPOSTA (JSON OBRIGATÓRIO):
        Retorne SEMPRE um array JSON. Se for só conversa, use apenas "reply".

        Exemplos:
        - Conversa/Dica: [{"reply": "Sua situação está boa! Sobrou R$ 500."}]
        - Adicionar Gasto: [{"action":"add", "table":"transactions", "data":{...}}, {"reply": "✅ Gasto adicionado."}]
        - Adicionar com Alerta: [{"action":"add", "table":"transactions", "data":{...}}, {"reply": "✅ Adicionei, mas atenção: Você entrou no vermelho! 🚨"}]

        AÇÕES JSON SUPORTADAS:
        1. ADICIONAR (add) -> Tables: 'transactions', 'installments', 'recurring'.
        2. EXCLUIR (remove) -> Table: 'transactions'.
        `;

        const finalPrompt = [systemPrompt, ...promptParts];
        const result = await model.generateContent(finalPrompt);
        let cleanJson = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        
        const arrayMatch = cleanJson.match(/\[[\s\S]*\]/);
        if (arrayMatch) cleanJson = arrayMatch[0];

        try {
            let commands = JSON.parse(cleanJson);
            if (!Array.isArray(commands)) commands = [commands];
            const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

            for (const cmd of commands) {
                // SE TIVER RESPOSTA/DICA/ALERTA, ENVIA
                if (cmd.reply) {
                    await sendWhatsAppMessage(targetPhone, cmd.reply);
                }
                
                // EXECUTA AÇÕES DE BANCO
                else if (cmd.action === 'add') {
                    let payload: any = { ...cmd.data, user_id: userSettings.user_id, context: workspace?.id, created_at: new Date(), message_id: messageId };

                    if (cmd.table === 'installments') {
                        payload.current_installment = 0; payload.status = 'active';
                        delete payload.date; delete payload.target_month;
                        const { error } = await supabase.from('installments').insert([payload]);
                        // Se não tiver 'reply' no JSON da IA, mandamos um padrão
                        if (!error && !commands.some((c:any) => c.reply)) {
                             const total = (cmd.data.total_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                             await sendWhatsAppMessage(targetPhone, `✅ Parcelado: ${cmd.data.title} (${total})`);
                        }
                    }
                    else if (cmd.table === 'recurring') {
                        payload.status = 'active';
                        const { error } = await supabase.from('recurring').insert([payload]);
                        if (!error && !commands.some((c:any) => c.reply)) await sendWhatsAppMessage(targetPhone, `✅ Fixo: ${cmd.data.title}`);
                    }
                    else if (cmd.table === 'transactions') {
                        if (!payload.date) {
                            const hoje = new Date(new Date().toLocaleString("en-US", {timeZone: "America/Sao_Paulo"}));
                            const dStr = String(hoje.getDate()).padStart(2,'0');
                            const mStr = String(hoje.getMonth()+1).padStart(2,'0');
                            payload.date = `${dStr}/${mStr}/${hoje.getFullYear()}`;
                        }
                        if (payload.date) {
                             const [dia, mes] = payload.date.split('/');
                             if (months[parseInt(mes)-1]) payload.target_month = months[parseInt(mes)-1];
                        }
                        payload.is_paid = true; payload.status = 'paid';
                        const { error } = await supabase.from('transactions').insert([payload]);
                        // O 'reply' da IA tem prioridade, se não tiver, manda o padrão
                        if (!error && !commands.some((c:any) => c.reply)) {
                             const val = (cmd.data.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
                        if (!commands.some((c:any) => c.reply)) await sendWhatsAppMessage(targetPhone, `⚠️ Não encontrei "${cmd.data.title}" para apagar.`);
                    }
                }
            }
        } catch (error) {
            console.error("❌ ERRO JSON:", error);
            if (hasAudio) await sendWhatsAppMessage(targetPhone, "🙉 Ouvi, mas não entendi. Tente falar mais devagar.");
            else await sendWhatsAppMessage(targetPhone, result.response.text()); // Manda a resposta crua se não for JSON
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}