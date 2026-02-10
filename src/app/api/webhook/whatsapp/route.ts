import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://167.234.242.205:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "sua-senha-secreta";
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

async function sendWhatsAppMessage(jid: string, text: string) {
    // Tenta limpar o JID para garantir envio
    // Se for LID, a Evolution às vezes falha, mas tentamos mesmo assim
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

        const key = body.data?.key;
        if (!key?.remoteJid || key.fromMe) return NextResponse.json({ status: 'Ignored' });

        // --- 1. A CAÇADA PELO NÚMERO REAL ---
        const remoteJid = key.remoteJid;       // O endereço que enviou (pode ser LID)
        const participant = key.participant;   // O endereço real (as vezes vem aqui!)
        
        const lidId = remoteJid.split('@')[0];
        const participantId = participant ? participant.split('@')[0] : null;

        console.log(`📩 Recebido de: ${lidId} | Participante: ${participantId || "Não veio"}`);

        // Vamos tentar achar o usuário usando TUDO que temos
        const possibleIds = [lidId];
        if (participantId) possibleIds.push(participantId);

        // Busca no banco por Telefone OU ID
        let { data: userSettings } = await supabase
            .from('user_settings')
            .select('*')
            .or(`whatsapp_phone.in.(${possibleIds.join(',')}),whatsapp_id.in.(${possibleIds.join(',')})`)
            .maybeSingle();

        // Se não achou exato, tenta variação do 9 (para telefones)
        if (!userSettings) {
             const cleanIds = possibleIds.map(id => id.length > 13 ? null : id).filter(Boolean) as string[]; // Pega só o que parece telefone
             
             if (cleanIds.length > 0) {
                 const variations: string[] = [];
                 cleanIds.forEach(id => {
                     variations.push(id);
                     variations.push(id.length > 12 ? id.replace('9', '') : id); // Tira 9
                     variations.push(id.length < 13 ? id.slice(0, 4) + '9' + id.slice(4) : id); // Põe 9
                 });
                 
                 const { data: found } = await supabase.from('user_settings').select('*').in('whatsapp_phone', variations).maybeSingle();
                 userSettings = found;
             }
        }

        // --- 2. VÍNCULO AUTOMÁTICO (O Pulo do Gato) ---
        // Se achamos o usuário pelo 'participant' (real) mas o 'remoteJid' (LID) é novo, SALVA AGORA!
        if (userSettings) {
            // Se o ID que chegou (LID) não está salvo no banco, salva agora.
            if (userSettings.whatsapp_id !== lidId && lidId !== userSettings.whatsapp_phone) {
                console.log(`🔗 VINCULANDO AUTOMATICAMENTE: LID ${lidId} ao usuário ${userSettings.whatsapp_phone}`);
                await supabase.from('user_settings')
                    .update({ whatsapp_id: lidId })
                    .eq('user_id', userSettings.user_id);
                
                // Atualiza localmente para usar na resposta
                userSettings.whatsapp_id = lidId;
            }
        } 
        else {
            // --- 3. SE AINDA NÃO ACHOU, PEDE O NÚMERO ---
            // Se chegou aqui, o pacote não trouxe o número real. Precisamos perguntar.
            
            const messageContent = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";
            const cleanMessage = messageContent.replace(/\D/g, ''); // Só numeros

            // Se o usuário digitou um telefone no texto (ex: "sou o 62999...")
            if (cleanMessage.length >= 10 && cleanMessage.length <= 13) {
                const possiblePhones = [`55${cleanMessage}`, cleanMessage, cleanMessage.includes('55') ? cleanMessage : `55${cleanMessage}`];
                const { data: userToLink } = await supabase.from('user_settings').select('*').in('whatsapp_phone', possiblePhones).maybeSingle();

                if (userToLink) {
                    await supabase.from('user_settings').update({ whatsapp_id: lidId }).eq('user_id', userToLink.user_id);
                    await sendWhatsAppMessage(remoteJid, `✅ *Vínculo realizado!* Agora te reconheço.`);
                    return NextResponse.json({ success: true, action: "linked" });
                }
            }
            
            // Tenta responder pedindo o número (Se falhar o envio pro LID, o usuário terá que cadastrar o LID manualmente no banco uma vez)
            console.log("⚠️ Usuário desconhecido e sem participant. Pedindo número...");
            await sendWhatsAppMessage(remoteJid, "Olá! Para configurar seu acesso, responda apenas com seu *número de celular* cadastrado (ex: 62999999999).");
            return NextResponse.json({ error: "User unknown" });
        }

        // Define o alvo da resposta (SEMPRE O TELEFONE REAL SE TIVER)
        const targetPhone = userSettings.whatsapp_phone || lidId;

        // --- 4. FLUXO NORMAL (IA e Banco) ---
        const { data: workspace } = await supabase.from('workspaces').select('id').eq('user_id', userSettings.user_id).limit(1).single();

        const messageContent = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";
        if (!messageContent) return NextResponse.json({ status: 'No Text' });

        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        
        const systemPrompt = `
        ATUE COMO: "Meu Aliado", assistente financeiro.
        DATA: ${new Date().toISOString().split('T')[0]}.

        REGRAS:
        1. 'title' é obrigatório.
        2. Tabela 'transactions' usa 'target_month' (Ex: Jan, Fev).

        FORMATOS:
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