import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://167.234.242.205:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "sua-senha-secreta";
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

async function sendWhatsAppMessage(jid: string, text: string) {
    // Se for LID (número gigante), tenta mandar pro remoteJid original ou adiciona sufixo
    // Mas geralmente responder para o JID que chegou funciona melhor se for resposta imediata
    console.log(`📤 Enviando para: ${jid}`);
    try {
        await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: jid, text, delay: 1200 })
        });
    } catch (e) { console.error("❌ Erro Envio:", e); }
}

export async function POST(req: Request) {
    try {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "Configuração incompleta" }, { status: 500 });
        }

        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const body = await req.json();

        if (body.event && body.event !== "messages.upsert") return NextResponse.json({ status: 'Ignored Event' });

        const remoteJid = body.data?.key?.remoteJid;
        if (!remoteJid || body.data?.key?.fromMe) return NextResponse.json({ status: 'Ignored' });

        // ID Bruto (LID ou Telefone)
        const senderId = remoteJid.split('@')[0];
        const messageContent = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";

        console.log(`📩 Mensagem de: ${senderId}`);

        // 1. TENTA IDENTIFICAR O USUÁRIO (Busca exata ou por variações se for telefone)
        let { data: userSettings } = await supabase
            .from('user_settings')
            .select('*')
            .or(`whatsapp_phone.eq.${senderId},whatsapp_id.eq.${senderId}`)
            .maybeSingle();

        // Se não achou e o senderId parece telefone (menos de 15 digitos), tenta variações do 9
        if (!userSettings && senderId.length < 15) {
             const variations = [
                senderId,
                senderId.length > 12 ? senderId.replace('9', '') : senderId,
                senderId.length < 13 ? senderId.slice(0, 4) + '9' + senderId.slice(4) : senderId
            ];
            const { data: found } = await supabase.from('user_settings').select('*').in('whatsapp_phone', variations).maybeSingle();
            userSettings = found;
        }

        // --- AQUI ESTÁ A MÁGICA DO VÍNCULO ---
        if (!userSettings) {
            // O usuário é desconhecido (provavelmente é um LID novo).
            // Vamos verificar se ele mandou um número de telefone no texto para se identificar.
            
            // Limpa o texto deixando só números
            const cleanMessage = messageContent.replace(/\D/g, '');
            
            // Se o texto parece um telefone (DDD + numero, ex: 62999999999)
            if (cleanMessage.length >= 10 && cleanMessage.length <= 13) {
                console.log(`🔍 Tentando vincular LID ${senderId} ao telefone ${cleanMessage}...`);
                
                // Busca quem é o dono desse telefone digitado
                const possiblePhones = [
                    `55${cleanMessage}`, // Tenta com 55
                    cleanMessage,        // Tenta puro
                    cleanMessage.includes('55') ? cleanMessage : `55${cleanMessage}`
                ];

                const { data: userToLink } = await supabase
                    .from('user_settings')
                    .select('*')
                    .in('whatsapp_phone', possiblePhones) // Poderia adicionar variações do 9 aqui tb
                    .maybeSingle();

                if (userToLink) {
                    // ACHOU! Vamos salvar o LID nesse usuário.
                    await supabase.from('user_settings')
                        .update({ whatsapp_id: senderId })
                        .eq('user_id', userToLink.user_id);
                    
                    await sendWhatsAppMessage(remoteJid, `✅ *Conta Vinculada!* \nReconheci você como dono do telefone ${userToLink.whatsapp_phone}.\n\nAgora pode mandar seus gastos!`);
                    return NextResponse.json({ success: true, action: "linked" });
                } else {
                    await sendWhatsAppMessage(remoteJid, `❌ Não encontrei o telefone ${cleanMessage} no banco de dados.\nVerifique se cadastrou o número correto no site.`);
                    return NextResponse.json({ error: "Phone not found in DB" });
                }
            } else {
                // Se não mandou telefone, pede para mandar
                await sendWhatsAppMessage(remoteJid, `👋 Olá! Não reconheci seu dispositivo.\n\nPara liberar o acesso, responda com seu **número de telefone cadastrado** (ex: 62999999999).`);
                return NextResponse.json({ error: "User unknown, asked for phone" });
            }
        }

        // ... (Se chegou aqui, o usuário já existe ou acabou de ser vinculado) ...

        // Auto-aprendizado (Atualiza ID se mudou)
        if (senderId !== userSettings.whatsapp_phone && userSettings.whatsapp_id !== senderId) {
            await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', userSettings.user_id);
            userSettings.whatsapp_id = senderId;
        }

        const targetPhone = userSettings.whatsapp_phone || senderId;

        // 2. CONTEXTO DO WORKSPACE
        const { data: workspace } = await supabase
            .from('workspaces')
            .select('id')
            .eq('user_id', userSettings.user_id)
            .limit(1)
            .single();

        // 3. IA GEMINI (Seu código ajustado)
        if (!messageContent) return NextResponse.json({ status: 'No Text' });
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        
        const systemPrompt = `
        ATUE COMO: "Meu Aliado", assistente financeiro.
        DATA: ${new Date().toISOString().split('T')[0]}.

        REGRAS DO BANCO: 'title' (obrigatório), 'amount' ou 'value'.
        TABELAS: 'transactions' (comum), 'recurring' (fixa), 'installments' (parcelado).

        FORMATOS JSON:
        [{"action":"add", "table":"transactions", "data":{ "title": "...", "amount": 0.00, "type": "expense", "date": "YYYY-MM-DD", "category": "Outros", "target_month": "Mês", "status": "paid" }}]
        {"reply": "Olá"}
        `;

        const result = await model.generateContent([systemPrompt, messageContent]);
        const cleanJson = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const jsonMatch = cleanJson.match(/\[[\s\S]*\]/) || cleanJson.match(/\{[\s\S]*\}/);

        if (jsonMatch) {
            let commands = JSON.parse(jsonMatch[0]);
            if (!Array.isArray(commands)) commands = [commands];
            const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

            for (const cmd of commands) {
                if (cmd.reply) {
                    await sendWhatsAppMessage(targetPhone, cmd.reply);
                } else if (cmd.action === 'add') {
                    let payload: any = {
                        ...cmd.data,
                        user_id: userSettings.user_id,
                        context: workspace?.id,
                        created_at: new Date()
                    };
                    if (cmd.table === 'transactions') {
                        const d = new Date(cmd.data.date);
                        payload.target_month = months[d.getUTCMonth()];
                    }

                    const { error } = await supabase.from(cmd.table).insert([payload]);

                    if (error) {
                        console.error(`❌ Erro Banco:`, error);
                        await sendWhatsAppMessage(targetPhone, `❌ Erro: ${error.message}`);
                    } else {
                        const val = cmd.data.amount || cmd.data.value || cmd.data.total_value || 0;
                        const valorFmt = val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                        await sendWhatsAppMessage(targetPhone, `✅ Lançado: ${cmd.data.title} (${valorFmt})`);
                    }
                }
            }
        } else {
            await sendWhatsAppMessage(targetPhone, result.response.text());
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("ERRO GERAL:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}