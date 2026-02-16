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
        console.log(`📤 Enviando para ${finalJid}...`);
        await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: finalJid, text, delay: delay })
        });
    } catch (e) { console.error("❌ Erro Envio ZAP:", e); }
}

async function downloadMedia(url: string) {
    try {
        console.log("📥 Baixando mídia...", url);
        // Tenta baixar a mídia. Se o Evolution mandar URL interna, o fetch precisa do header
        const response = await fetch(url, { headers: { 'apikey': EVOLUTION_API_KEY } });
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer).toString('base64');
    } catch (error) { 
        console.error("Erro download mídia:", error);
        return null; 
    }
}

async function getFinancialContext(supabase: any, userId: string, workspaceId: string) {
    const today = new Date();
    const monthStr = String(today.getMonth() + 1).padStart(2, '0');
    const yearStr = today.getFullYear();
    
    // Busca saldo simples para dar contexto à IA
    const { data: trans } = await supabase.from('transactions')
        .select('type, amount')
        .eq('user_id', userId)
        .eq('context', workspaceId)
        .like('date', `%/${monthStr}/${yearStr}`) // Filtra pelo mês atual
        .neq('status', 'delayed');

    let saldo = 0;
    trans?.forEach((t: any) => t.type === 'income' ? saldo += t.amount : saldo -= t.amount);

    return {
        saldo: saldo.toFixed(2),
        mes_atual: `${monthStr}/${yearStr}`
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
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" }); // Modelo mais rápido para Zap

        const body = await req.json();

        // 1. FILTROS BÁSICOS
        if (body.event && body.event !== "messages.upsert") return NextResponse.json({ status: 'Ignored Event' });
        const key = body.data?.key;
        if (!key?.remoteJid || key.fromMe) return NextResponse.json({ status: 'Ignored' });
        
        const messageId = key.id; 
        const remoteJid = key.remoteJid;       
        const senderId = remoteJid.split('@')[0];
        const messageContent = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";

        // --- PROCESSAMENTO DE ÁUDIO E IMAGEM ---
        let promptParts: any[] = [];
        let hasAudio = false;
        let hasImage = false;

        const msgData = body.data?.message;
        
        // Verifica Imagem
        if (msgData?.imageMessage) {
            hasImage = true;
            let imgBase64 = body.data?.base64 || msgData.imageMessage?.base64; // Evolution as vezes manda direto
            if (!imgBase64 && msgData.imageMessage.url) {
                imgBase64 = await downloadMedia(msgData.imageMessage.url);
            }
            if (imgBase64) {
                promptParts.push({ inlineData: { mimeType: msgData.imageMessage.mimetype || "image/jpeg", data: imgBase64 } });
            }
        }

        // Verifica Áudio
        if (msgData?.audioMessage) {
            hasAudio = true;
            let audioBase64 = body.data?.base64 || msgData.audioMessage?.base64;
            if (!audioBase64 && msgData.audioMessage.url) {
                audioBase64 = await downloadMedia(msgData.audioMessage.url);
            }
            if (audioBase64) {
                promptParts.push({ inlineData: { mimeType: "audio/ogg", data: audioBase64 } });
            }
        }

        // Adiciona texto se houver
        if (messageContent) promptParts.push(messageContent);
        
        if (promptParts.length === 0) return NextResponse.json({ status: 'No Content' });

        // 2. IDENTIFICAÇÃO DO USUÁRIO
        let { data: userSettings } = await supabase.from('user_settings').select('*').or(`whatsapp_phone.eq.${senderId},whatsapp_id.eq.${senderId}`).maybeSingle();

        // Lógica de Vínculo (Mantida igual a sua)
        if (!userSettings) {
             const numbersInText = messageContent.replace(/\D/g, ''); 
             if (numbersInText.length >= 8) { 
                 const { data: userToLink } = await supabase.from('user_settings').select('*').ilike('whatsapp_phone', `%${numbersInText}%`).maybeSingle();
                 if (userToLink) {
                     await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', userToLink.user_id);
                     await sendWhatsAppMessage(remoteJid, `✅ *Vinculado!* Agora você pode usar a IA.`);
                     return NextResponse.json({ success: true, action: "linked" });
                 }
             }
             return NextResponse.json({ error: "User unknown" });
        }
        
        // TRAVA DE PLANO
        const { data: profile } = await supabase.from('profiles').select('plan_tier').eq('id', userSettings.user_id).single();
        const plan = profile?.plan_tier || 'free';
        if (!['pro', 'agent', 'admin'].includes(plan)) {
            await sendWhatsAppMessage(remoteJid, "🔒 Função exclusiva para planos Pro/Premium.");
            return NextResponse.json({ status: 'Blocked Plan' });
        }

        if (senderId !== userSettings.whatsapp_phone && userSettings.whatsapp_id !== senderId) {
            await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', userSettings.user_id);
        }

        const targetPhone = userSettings.whatsapp_phone || senderId;
        const { data: workspace } = await supabase.from('workspaces').select('id').eq('user_id', userSettings.user_id).limit(1).single();

        // 3. CONTEXTO FINANCEIRO
        let contextInfo = { saldo: "0", mes_atual: "" };
        if (workspace) contextInfo = await getFinancialContext(supabase, userSettings.user_id, workspace.id);

        // 4. PROMPT DA IA (AJUSTADO PARA LER COMPROVANTES CORRETAMENTE)
        const systemPrompt = `
        ATUE COMO: "Meu Aliado", assistente financeiro.
        DATA DE HOJE: ${new Date().toLocaleDateString('pt-BR')}.
        SALDO ATUAL: ${contextInfo.saldo}.
        
        --- INSTRUÇÕES ---
        1. Se receber uma IMAGEM (Comprovante/Nota):
           - Extraia o VALOR TOTAL (Procure por "Total", "Valor Pago").
           - Extraia a DATA da compra. Se não achar, use a data de HOJE.
           - Extraia o LOCAL (Nome da loja/estabelecimento).
           - GERE O JSON PARA ADICIONAR (tabela: transactions).
        
        2. Se receber ÁUDIO ou TEXTO:
           - Interprete a intenção e gere o JSON.

        --- FORMATO OBRIGATÓRIO (JSON ARRAY) ---
        Responda APENAS o JSON puro, sem crase (\`\`\`).

        EXEMPLOS DE AÇÃO:
        1. GASTOS (transactions):
        [{"action":"add", "table":"transactions", "data":{ "title": "Mercado", "amount": 50.00, "type": "expense", "date": "DD/MM/YYYY", "category": "Alimentação" }}]

        2. PARCELADO (installments):
        [{"action":"add", "table":"installments", "data":{ "title": "TV", "total_value": 2000.00, "installments_count": 10, "value_per_month": 200.00, "due_day": 10 }}]

        3. RECORRENTE (recurring):
        [{"action":"add", "table":"recurring", "data":{ "title": "Netflix", "value": 55.90, "type": "expense", "due_day": 15 }}]

        Se não for ação, use: [{"reply": "Sua resposta curta aqui"}]
        `;

        const finalPrompt = [systemPrompt, ...promptParts];
        const result = await model.generateContent(finalPrompt);
        const rawText = result.response.text();

        // LIMPEZA DO JSON (CRÍTICO PARA NÃO TRAVAR)
        let cleanJson = rawText.replace(/```json/g, '').replace(/```/g, '').trim();
        // Tenta pegar apenas a parte do array [...]
        const arrayMatch = cleanJson.match(/\[[\s\S]*\]/);
        if (arrayMatch) cleanJson = arrayMatch[0];

        try {
            let commands = JSON.parse(cleanJson);
            if (!Array.isArray(commands)) commands = [commands];

            let replySent = false;

            for (const cmd of commands) {
                if (cmd.action === 'add') {
                    // Prepara o Payload base, mas garantindo números corretos
                    let payload: any = { 
                        ...cmd.data, 
                        user_id: userSettings.user_id, 
                        context: workspace?.id, 
                        created_at: new Date(), 
                        message_id: messageId,
                        // Garante que amount seja número (evita o erro do "gasto zerado")
                        amount: parseFloat(cmd.data.amount) || parseFloat(cmd.data.value) || 0
                    };

                    // --- TRATAMENTO ESPECÍFICO POR TABELA (SUA LÓGICA MANTIDA) ---

                    if (cmd.table === 'installments') {
                        payload.current_installment = 0; 
                        payload.status = 'active';
                        // Installments usa total_value e value_per_month, não amount
                        payload.total_value = parseFloat(cmd.data.total_value) || payload.amount;
                        payload.value_per_month = parseFloat(cmd.data.value_per_month) || (payload.total_value / (cmd.data.installments_count || 1));
                        
                        delete payload.amount;
                        delete payload.date; 
                        delete payload.target_month; // Parcelamento não tem target_month

                        const { error } = await supabase.from('installments').insert([payload]);
                        
                        if (error) console.error("Erro Installments:", error);
                        if (!error && !commands.some((c:any) => c.reply)) {
                             const total = (payload.total_value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                             await sendWhatsAppMessage(targetPhone, `✅ Parcelado: ${cmd.data.title} (${total})`);
                        }
                    }
                    else if (cmd.table === 'recurring') {
                        payload.status = 'active';
                        payload.value = payload.amount; // Recurring usa 'value'
                        delete payload.amount;
                        
                        // Garante start_date
                        if (!payload.start_date) payload.start_date = new Date().toLocaleDateString('pt-BR');

                        const { error } = await supabase.from('recurring').insert([payload]);
                        
                        if (error) console.error("Erro Recurring:", error);
                        if (!error && !commands.some((c:any) => c.reply)) await sendWhatsAppMessage(targetPhone, `✅ Fixo: ${cmd.data.title}`);
                    }
                    else if (cmd.table === 'transactions') {
                        // DATA E MES
                        if (!payload.date) {
                            payload.date = new Date().toLocaleDateString('pt-BR');
                        }
                        
                        // Extrai target_month da data (ex: 15/02/2026 -> Fev)
                        const parts = payload.date.split('/');
                        if (parts.length === 3) {
                            const map: any = { '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr', '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago', '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez' };
                            payload.target_month = map[parts[1]] || 'Jan';
                        }

                        payload.is_paid = true; 
                        payload.status = 'paid';
                        
                        // Remove campos inválidos
                        delete payload.value; 

                        const { error } = await supabase.from('transactions').insert([payload]);
                        
                        if (error) console.error("Erro Transactions:", error);
                        
                        if (!error && !commands.some((c:any) => c.reply)) {
                             const val = (payload.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                             await sendWhatsAppMessage(targetPhone, `✅ Lançado: ${cmd.data.title} (${val}) - ${payload.date}`);
                        }
                    }
                }
                else if (cmd.action === 'remove') {
                    // (Sua lógica de remove mantida igual)
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
            console.error("❌ ERRO NO JSON PROCESSADO:", error);
            // Se falhar o JSON, manda a resposta crua da IA como texto (fallback)
            // Isso evita que ele fique mudo se a IA resolver conversar em vez de agir
            if (!hasAudio && !hasImage) await sendWhatsAppMessage(targetPhone, rawText);
            else await sendWhatsAppMessage(targetPhone, "Não consegui ler os dados corretamente. Tente novamente.");
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}