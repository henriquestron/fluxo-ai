import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://167.234.242.205:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "sua-senha-secreta";
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

// Função auxiliar de envio
async function sendWhatsAppMessage(jid: string, text: string) {
    const finalJid = jid.includes('@') ? jid : `${jid}@s.whatsapp.net`;
    console.log(`📤 Enviando para: ${finalJid}`);
    try {
        await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: finalJid, text, delay: 1200 })
        });
    } catch (e) { console.error("❌ Erro Envio:", e); }
}

export async function POST(req: Request) {
    try {
        // --- 1. CONFIGURAÇÃO E FILTROS ---
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "Configuração incompleta" }, { status: 500 });
        }

        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
        const body = await req.json();

        // Filtra eventos que não sejam mensagens novas
        if (body.event && body.event !== "messages.upsert") return NextResponse.json({ status: 'Ignored Event' });

        const key = body.data?.key;
        if (!key?.remoteJid || key.fromMe) return NextResponse.json({ status: 'Ignored' });

        const remoteJid = key.remoteJid;       
        const senderId = remoteJid.split('@')[0];
        
        // Pega o conteúdo da mensagem IMEDIATAMENTE (para usar na lógica de ativação)
        const messageContent = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";

        console.log(`📩 Recebido de: ${senderId}`);

        // --- 2. BUSCA DO USUÁRIO (TENTATIVA 1: ID) ---
        let { data: userSettings } = await supabase
            .from('user_settings')
            .select('*')
            .or(`whatsapp_phone.eq.${senderId},whatsapp_id.eq.${senderId}`)
            .maybeSingle();

        // TENTATIVA 2: Variações de telefone (com 9/sem 9) se o ID parecer telefone
        if (!userSettings && senderId.length < 15) {
             const variations = [
                senderId,
                senderId.length > 12 ? senderId.replace('9', '') : senderId,
                senderId.length < 13 ? senderId.slice(0, 4) + '9' + senderId.slice(4) : senderId
            ];
            const { data: found } = await supabase.from('user_settings').select('*').in('whatsapp_phone', variations).maybeSingle();
            userSettings = found;
        }

        // --- 3. SE O USUÁRIO FOR DESCONHECIDO: LÓGICA DE ATIVAÇÃO ---
        // (Aqui entra o código que você pediu)
        if (!userSettings) {
            
            // Tenta achar um número no corpo da mensagem (ex: "Ativar 5562...")
            const cleanMessage = messageContent.replace(/\D/g, ''); 

            if (cleanMessage.length >= 10 && cleanMessage.length <= 13) {
                console.log(`🔍 Tentando vincular LID ${senderId} ao telefone ${cleanMessage}...`);
                
                const possiblePhones = [
                    cleanMessage, 
                    `55${cleanMessage}`,
                    cleanMessage.replace(/^55/, '') // Remove 55 se tiver
                ];

                const { data: userToLink } = await supabase
                    .from('user_settings')
                    .select('*')
                    .in('whatsapp_phone', possiblePhones)
                    .maybeSingle();

                if (userToLink) {
                    console.log(`🔗 SUCESSO! Vinculando ${senderId} ao usuário ${userToLink.whatsapp_phone}`);
                    
                    // Salva o ID novo no banco
                    await supabase.from('user_settings')
                        .update({ whatsapp_id: senderId })
                        .eq('user_id', userToLink.user_id);
                    
                    // Manda confirmação e ENCERRA (retorna sucesso)
                    await sendWhatsAppMessage(remoteJid, `✅ *Conta Conectada!* \nReconheci você. Pode mandar seus gastos.`);
                    return NextResponse.json({ success: true, action: "linked" });
                }
            }
            
            // Se chegou aqui, não achou ninguém. Manda instrução.
            console.log("⚠️ Usuário desconhecido.");
            // Opcional: tentar enviar mensagem de ajuda
            // await sendWhatsAppMessage(remoteJid, "Olá! Não te reconheci. Use o botão 'Conectar WhatsApp' no site.");
            return NextResponse.json({ error: "User unknown" });
        }

        // --- 4. FLUXO NORMAL (USUÁRIO JÁ IDENTIFICADO) ---

        // Auto-aprendizado: Se o ID mudou, atualiza
        if (senderId !== userSettings.whatsapp_phone && userSettings.whatsapp_id !== senderId) {
            await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', userSettings.user_id);
            userSettings.whatsapp_id = senderId;
        }

        // Define onde responder (Prioriza telefone real)
        const targetPhone = userSettings.whatsapp_phone || senderId;

        // Pega Workspace
        const { data: workspace } = await supabase
            .from('workspaces')
            .select('id')
            .eq('user_id', userSettings.user_id)
            .limit(1)
            .single();

        if (!messageContent) return NextResponse.json({ status: 'No Text' });

        // --- 5. INTELIGÊNCIA ARTIFICIAL (GEMINI) ---
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        
        const systemPrompt = `
        ATUE COMO: "Meu Aliado", assistente financeiro.
        DATA: ${new Date().toISOString().split('T')[0]}.

        REGRAS DO BANCO DE DADOS:
        1. Use 'title' para o nome (NÃO description).
        2. Tabela 'transactions' exige 'target_month' (Ex: Jan, Fev).
        
        FORMATOS JSON DE RESPOSTA:
        [GASTO ÚNICO] -> transactions
        [{"action":"add", "table":"transactions", "data":{ "title": "Nome", "amount": 0.00, "type": "expense", "date": "YYYY-MM-DD", "category": "Outros", "target_month": "Mês", "status": "paid" }}]

        [CONTA FIXA] -> recurring
        [{"action":"add", "table":"recurring", "data":{ "title": "Nome", "value": 0.00, "type": "expense", "due_day": 10, "category": "Fixa" }}]

        [PARCELADO] -> installments
        [{"action":"add", "table":"installments", "data":{ "title": "Nome", "total_value": 0.00, "installments_count": 10, "value_per_month": 0.00, "due_day": 10 }}]

        [CONVERSA]
        {"reply": "Olá! Sou seu Aliado. Mande seus gastos."}
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

                    // Ajuste específico para transactions (target_month)
                    if (cmd.table === 'transactions') {
                        const d = new Date(cmd.data.date);
                        payload.target_month = months[d.getUTCMonth()];
                    }

                    const { error } = await supabase.from(cmd.table).insert([payload]);

                    if (error) {
                        console.error(`❌ Erro Banco:`, error);
                        await sendWhatsAppMessage(targetPhone, `❌ Erro ao salvar: ${error.message}`);
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