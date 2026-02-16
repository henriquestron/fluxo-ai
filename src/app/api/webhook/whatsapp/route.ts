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
        console.log(`📤 [Zap] Enviando para ${finalJid}: ${text.substring(0, 30)}...`);
        await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: finalJid, text, delay: delay })
        });
    } catch (e) { console.error("❌ Erro Envio ZAP:", e); }
}

async function downloadMedia(url: string) {
    try {
        const response = await fetch(url, { headers: { 'apikey': EVOLUTION_API_KEY } });
        if (!response.ok) return null;
        const arrayBuffer = await response.arrayBuffer();
        return Buffer.from(arrayBuffer).toString('base64');
    } catch (error) { return null; }
}

// Helper para limpar números brasileiros (ex: "1.200,50" -> 1200.50)
function parseBRL(value: any) {
    if (typeof value === 'number') return value;
    if (!value) return 0;
    // Remove pontos de milhar e troca vírgula decimal por ponto
    const cleanStr = value.toString().replace(/\./g, '').replace(',', '.');
    return parseFloat(cleanStr) || 0;
}

// 🧠 CÁLCULO FINANCEIRO
async function getFinancialContext(supabase: any, userId: string, workspaceId: string) {
    const today = new Date();
    const monthStr = String(today.getMonth() + 1).padStart(2, '0');
    const yearStr = today.getFullYear();
    
    const { data: transactions } = await supabase.from('transactions').select('type, amount').eq('user_id', userId).eq('context', workspaceId).like('date', `%/${monthStr}/${yearStr}`).neq('status', 'delayed');
    const { data: recurring } = await supabase.from('recurring').select('type, value').eq('user_id', userId).eq('context', workspaceId).eq('status', 'active');
    
    let totalEntradas = 0;
    let totalSaidas = 0;

    transactions?.forEach((t: any) => t.type === 'income' ? totalEntradas += t.amount : totalSaidas += t.amount);
    recurring?.forEach((r: any) => r.type === 'income' ? totalEntradas += r.value : totalSaidas += r.value);

    const saldo = totalEntradas - totalSaidas;
    return { saldo: saldo.toFixed(2), mes_atual: `${monthStr}/${yearStr}` };
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

        // 1. FILTROS
        if (body.event && body.event !== "messages.upsert") return NextResponse.json({ status: 'Ignored Event' });
        const key = body.data?.key;
        if (!key?.remoteJid || key.fromMe) return NextResponse.json({ status: 'Ignored' });
        
        const messageId = key.id; 
        const remoteJid = key.remoteJid;       
        const senderId = remoteJid.split('@')[0];
        const messageContent = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";

        // --- MÍDIA ---
        let promptParts: any[] = [];
        let hasAudio = false;
        let hasImage = false;

        const msgData = body.data?.message;
        
        if (msgData?.imageMessage) {
            hasImage = true;
            let imgBase64 = body.data?.base64 || msgData.imageMessage?.base64;
            if (!imgBase64 && msgData.imageMessage.url) imgBase64 = await downloadMedia(msgData.imageMessage.url);
            if (imgBase64) promptParts.push({ inlineData: { mimeType: msgData.imageMessage.mimetype || "image/jpeg", data: imgBase64 } });
        }

        if (msgData?.audioMessage) {
            hasAudio = true;
            let audioBase64 = body.data?.base64 || msgData.audioMessage?.base64;
            if (!audioBase64 && msgData.audioMessage.url) audioBase64 = await downloadMedia(msgData.audioMessage.url);
            if (audioBase64) promptParts.push({ inlineData: { mimeType: "audio/ogg", data: audioBase64 } });
        }

        if (messageContent) promptParts.push(messageContent);
        if (promptParts.length === 0) return NextResponse.json({ status: 'No Content' });

        // 2. IDENTIFICAÇÃO
        let { data: userSettings } = await supabase.from('user_settings').select('*').or(`whatsapp_phone.eq.${senderId},whatsapp_id.eq.${senderId}`).maybeSingle();

        if (!userSettings) {
             // Tenta recuperar se o número vier formatado diferente
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
                    await sendWhatsAppMessage(remoteJid, `✅ *Vinculado!*`);
                    return NextResponse.json({ success: true, action: "linked" });
                }
            }
            return NextResponse.json({ error: "User unknown" });
        }
        
        const { data: profile } = await supabase.from('profiles').select('plan_tier').eq('id', userSettings.user_id).single();
        if (!['pro', 'agent', 'admin'].includes(profile?.plan_tier || 'free')) {
            await sendWhatsAppMessage(userSettings.whatsapp_phone || senderId, "🔒 Função exclusiva Pro.");
            return NextResponse.json({ status: 'Blocked' });
        }

        const targetPhone = userSettings.whatsapp_phone || senderId;
        const { data: workspace } = await supabase.from('workspaces').select('id').eq('user_id', userSettings.user_id).limit(1).single();
        let contextInfo = workspace ? await getFinancialContext(supabase, userSettings.user_id, workspace.id) : { saldo: "0" };

        // 3. PROMPT
        const systemPrompt = `
        ATUE COMO: Assistente Financeiro "Meu Aliado".
        HOJE: ${new Date().toLocaleDateString('pt-BR')}.
        SALDO: ${contextInfo.saldo}.
        
        INSTRUÇÕES:
        1. SE RECEBER IMAGEM: Extraia Valor, Data, Local. Assuma Gasto.
        2. SE RECEBER ÁUDIO/TEXTO: Interprete.

        FORMATO JSON (Sem Markdown):
        [{"action": "add", ...}]

        EXEMPLOS:
        - Gasto: [{"action":"add", "table":"transactions", "data":{ "title": "Uber", "amount": 14.93, "type": "expense", "date": "11/02/2026", "target_month": "Fev" }}]
        - Parcelado: [{"action":"add", "table":"installments", "data":{ "title": "TV", "total_value": 2000.00, "installments_count": 10, "due_day": 10 }}]
        
        Se não for ação, use: [{"reply": "Resposta..."}]
        `;

        const result = await model.generateContent([systemPrompt, ...promptParts]);
        
        // --- LIMPEZA JSON ---
        let cleanJson = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const arrayMatch = cleanJson.match(/\[[\s\S]*\]/);
        if (arrayMatch) cleanJson = arrayMatch[0];

        try {
            let commands = JSON.parse(cleanJson);
            if (!Array.isArray(commands)) commands = [commands];

            let replySent = false;

            for (const cmd of commands) {
                if (cmd.action === 'add') {
                    // Payload Base
                    let payload: any = { 
                        ...cmd.data, 
                        user_id: userSettings.user_id, 
                        context: workspace?.id, 
                        created_at: new Date(), 
                        message_id: messageId,
                        // Parse genérico inicial
                        amount: parseBRL(cmd.data.amount || cmd.data.value)
                    };

                    // --- PARCELAMENTOS (INSTALLMENTS) ---
                    if (cmd.table === 'installments') {
                        payload.current_installment = 0; 
                        payload.status = 'active';
                        
                        // Parse específico de valores do parcelamento
                        // Se a IA mandou 'amount', usamos como total_value se este não existir
                        payload.total_value = parseBRL(cmd.data.total_value || payload.amount);
                        
                        // Garante contagem de parcelas
                        payload.installments_count = parseInt(cmd.data.installments_count) || 1;
                        
                        // Calcula valor por mês se a IA não mandou
                        payload.value_per_month = parseBRL(cmd.data.value_per_month);
                        if (payload.value_per_month === 0 && payload.installments_count > 0) {
                            payload.value_per_month = payload.total_value / payload.installments_count;
                        }

                        // Limpeza
                        delete payload.amount;
                        delete payload.date;
                        delete payload.target_month;

                        const { error } = await supabase.from('installments').insert([payload]);
                        
                        if (!error && !commands.some((c:any) => c.reply)) {
                             // Formata com segurança
                             const totalFmt = (payload.total_value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                             const parcelaFmt = (payload.value_per_month || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                             
                             await sendWhatsAppMessage(targetPhone, `✅ Parcelado: *${cmd.data.title}*\nTotal: ${totalFmt}\n(${payload.installments_count}x de ${parcelaFmt})`);
                        } else if (error) {
                            console.error("Erro Installments:", error);
                        }
                    }
                    
                    // --- TRANSAÇÕES (TRANSACTIONS) ---
                    else if (cmd.table === 'transactions') {
                        // Data e Mês
                        payload.date = payload.date || new Date().toLocaleDateString('pt-BR');
                        const parts = payload.date.split('/');
                        if (parts.length === 3) {
                            const map: any = { '01':'Jan', '02':'Fev', '03':'Mar', '04':'Abr', '05':'Mai', '06':'Jun', '07':'Jul', '08':'Ago', '09':'Set', '10':'Out', '11':'Nov', '12':'Dez' };
                            payload.target_month = map[parts[1]] || 'Jan';
                        } else {
                            payload.target_month = 'Jan'; // Fallback
                        }

                        payload.is_paid = true; 
                        payload.status = 'paid';
                        delete payload.value; 

                        const { error } = await supabase.from('transactions').insert([payload]);
                        
                        if (!error && !commands.some((c:any) => c.reply)) {
                             const val = (payload.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                             await sendWhatsAppMessage(targetPhone, `✅ Lançado: *${cmd.data.title}* (${val})\n📅 ${payload.date}`);
                        }
                    }

                    // --- RECORRENTES (RECURRING) ---
                    else if (cmd.table === 'recurring') {
                        payload.status = 'active';
                        payload.value = payload.amount;
                        delete payload.amount;
                        if (!payload.start_date) payload.start_date = new Date().toLocaleDateString('pt-BR');

                        const { error } = await supabase.from('recurring').insert([payload]);
                        
                        if (!error && !commands.some((c:any) => c.reply)) await sendWhatsAppMessage(targetPhone, `✅ Fixo: ${cmd.data.title}`);
                    }
                }
                // (Logica de remove mantida igual, omitida aqui para brevidade do snippet mas deve estar no arquivo final)
                else if (cmd.reply && !replySent) {
                    await sendWhatsAppMessage(targetPhone, cmd.reply);
                    replySent = true;
                }
            }
        } catch (error) {
            console.error("❌ ERRO JSON:", error);
            if (!hasAudio && !hasImage) await sendWhatsAppMessage(targetPhone, result.response.text()); // Fallback conversa
            else await sendWhatsAppMessage(targetPhone, "Não entendi os dados. Tente digitar?");
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}