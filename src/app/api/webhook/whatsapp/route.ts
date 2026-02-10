import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://167.234.242.205:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "sua-senha-secreta";
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

// Função para baixar imagem da mensagem (se houver)
async function downloadMedia(url: string) {
    const res = await fetch(url, { headers: { 'apikey': EVOLUTION_API_KEY } });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer).toString('base64');
}

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

        const remoteJid = key.remoteJid;       
        const senderId = remoteJid.split('@')[0];
        
        // --- LÓGICA DE TEXTO E IMAGEM ---
        let messageContent = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";
        const messageType = body.data?.messageType;
        let imageBase64 = null;

        // Se for imagem, tenta baixar
        if (messageType === "imageMessage" || body.data?.message?.imageMessage) {
            console.log("📸 Imagem detectada! Tentando baixar...");
            const mediaUrl = body.data?.message?.imageMessage?.url || body.data?.mediaUrl; // Evolution varia as vezes
            // Na Evolution V2, geralmente precisa buscar a midia pelo ID ou o webhook manda base64 direto se configurado
            // Vou assumir que o webhook manda o base64 no body ou URL (ajuste conforme sua config da Evolution)
            
            // SE A EVOLUTION MANDAR O BASE64 DIRETO (Configuração recomendada):
            if (body.data?.message?.imageMessage?.jpegThumbnail) {
                 // Thumbnail é baixa qualidade, ideal é configurar o webhook para mandar o 'media' completo
                 // Mas para teste, vamos usar o texto da legenda
                 messageContent = body.data?.message?.imageMessage?.caption || "Analise esta imagem de comprovante";
            }
            
            // NOTA: Para imagem funcionar 100%, você precisa ativar "includeBase64" no webhook da Evolution ou baixar da URL.
        }

        console.log(`📩 Recebido de: ${senderId}`);

        // --- 1. BUSCA E VINCULAÇÃO ---
        let { data: userSettings } = await supabase
            .from('user_settings')
            .select('*')
            .or(`whatsapp_phone.eq.${senderId},whatsapp_id.eq.${senderId}`)
            .maybeSingle();

        if (!userSettings && senderId.length < 15) {
             const variations = [senderId, senderId.length > 12 ? senderId.replace('9', '') : senderId, senderId.length < 13 ? senderId.slice(0, 4) + '9' + senderId.slice(4) : senderId];
             const { data: found } = await supabase.from('user_settings').select('*').in('whatsapp_phone', variations).maybeSingle();
             userSettings = found;
        }

        if (!userSettings) {
            const cleanMessage = messageContent.replace(/\D/g, ''); 
            if (cleanMessage.length >= 10 && cleanMessage.length <= 13) {
                console.log(`🔍 Vinculando ${senderId} ao telefone ${cleanMessage}`);
                const possiblePhones = [cleanMessage, `55${cleanMessage}`, cleanMessage.replace(/^55/, '')];
                const { data: userToLink } = await supabase.from('user_settings').select('*').in('whatsapp_phone', possiblePhones).maybeSingle();

                if (userToLink) {
                    await supabase.from('user_settings').update({ whatsapp_id: senderId }).eq('user_id', userToLink.user_id);
                    await sendWhatsAppMessage(remoteJid, `✅ *Conta Conectada!* \nReconheci você. Pode mandar seus gastos.`);
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

        if (!messageContent && !imageBase64) return NextResponse.json({ status: 'No Content' });

        // --- 3. IA ---
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        
        const systemPrompt = `
        ATUE COMO: Assistente Financeiro "Meu Aliado". HOJE: ${new Date().toISOString().split('T')[0]}.

        SE FOR PARCELADO (Ex: "10x de 300"): 
        Retorne a tabela "installments" com "installments_count": 10 e "total_value": 3000 (total geral).
        
        SE FOR COMPROVANTE (Imagem ou Texto): 
        Extraia data, valor e local.

        RETORNE APENAS JSON:
        [PARCELADO] [{"action":"add", "table":"installments", "data":{ "title": "PS5", "total_value": 3000.00, "installments_count": 10, "value_per_month": 300.00, "due_day": 10 }}]
        [GASTO] [{"action":"add", "table":"transactions", "data":{ "title": "Almoço", "amount": 20.00, "type": "expense", "date": "YYYY-MM-DD", "category": "Alimentação" }}]
        [CONVERSA] {"reply": "..."}
        `;

        // Se tiver imagem, mandamos junto (implementação futura simplificada aqui focando no texto primeiro)
        const result = await model.generateContent([systemPrompt, messageContent]);
        
        let cleanJson = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();
        const arrayMatch = cleanJson.match(/\[[\s\S]*\]/);
        const objectMatch = cleanJson.match(/\{[\s\S]*\}/);
        if (arrayMatch) cleanJson = arrayMatch[0];
        else if (objectMatch) cleanJson = objectMatch[0];

        try {
            let commands = JSON.parse(cleanJson);
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

                    // --- TRATAMENTO DE DATA (BR) ---
                    if (cmd.data.date && cmd.data.date.includes('-')) {
                         const parts = cmd.data.date.split('-'); 
                         if (parts.length === 3) {
                             if (cmd.table === 'transactions') {
                                 payload.date = `${parts[2]}/${parts[1]}/${parts[0]}`;
                             }
                         }
                    }

                    // --- PARCELADO INTELIGENTE (LOOP DE CRIAÇÃO) ---
                    if (cmd.table === 'installments') {
                        // Salva o "contrato" pai na tabela installments
                        payload.current_installment = 1;
                        payload.status = 'active';
                        
                        console.log(`💾 Criando Contrato Parcelado:`, payload);
                        const { data: installmentData, error: instError } = await supabase.from('installments').insert([payload]).select().single();
                        
                        if (!instError && installmentData) {
                            // AGORA A MÁGICA: Cria as X transações futuras na tabela 'transactions'
                            // Para aparecer no extrato mês a mês
                            const totalParcelas = cmd.data.installments_count;
                            const valorParcela = cmd.data.value_per_month;
                            const diaVenc = cmd.data.due_day || 10;
                            const hoje = new Date();

                            for (let i = 0; i < totalParcelas; i++) {
                                // Calcula data: Mês atual + i
                                const dataParcela = new Date(hoje.getFullYear(), hoje.getMonth() + i, diaVenc);
                                const mesNome = months[dataParcela.getMonth()];
                                const ano = dataParcela.getFullYear();
                                
                                // Formata data BR
                                const diaStr = String(diaVenc).padStart(2, '0');
                                const mesStr = String(dataParcela.getMonth() + 1).padStart(2, '0');
                                const dataFormatada = `${diaStr}/${mesStr}/${ano}`;

                                await supabase.from('transactions').insert([{
                                    user_id: userSettings.user_id,
                                    context: workspace?.id,
                                    title: `${cmd.data.title} (${i+1}/${totalParcelas})`, // Ex: PS5 (1/10)
                                    amount: valorParcela,
                                    type: 'expense',
                                    date: dataFormatada,
                                    target_month: mesNome,
                                    category: 'Parcelado',
                                    is_paid: false, // Futuro não está pago
                                    status: 'pending'
                                }]);
                            }
                            await sendWhatsAppMessage(targetPhone, `✅ Parcelamento criado! ${totalParcelas}x de ${valorParcela} lançadas.`);
                            continue; // Pula o insert padrão pois já fizemos manual
                        }
                    }

                    // Insert Padrão (Gastos à vista)
                    if (cmd.table === 'transactions') {
                        const d = new Date(cmd.data.date);
                        payload.target_month = months[d.getUTCMonth()];
                        payload.is_paid = true;
                        payload.status = 'paid';
                        
                        console.log(`💾 Salvando Gasto:`, payload);
                        const { error } = await supabase.from(cmd.table).insert([payload]);
                        if (error) throw error;
                        
                        const val = cmd.data.amount || 0;
                        const valorFmt = val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                        await sendWhatsAppMessage(targetPhone, `✅ Lançado: ${cmd.data.title} (${valorFmt})`);
                    }
                }
            }
        } catch (error: any) {
            console.error("❌ ERRO:", error);
            await sendWhatsAppMessage(targetPhone, result.response.text());
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}