import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

// Configurações
const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://167.234.242.205:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "sua-senha-secreta";
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

// Função para responder no WhatsApp (Formatando o ID corretamente)
async function sendWhatsAppMessage(jid: string, text: string) {
    // CORREÇÃO 1: Garantir que o ID tenha o sufixo correto para o WhatsApp aceitar
    let finalJid = jid;
    
    // Se for apenas número (sem @), adicionamos o sufixo
    if (!finalJid.includes('@')) {
        if (finalJid.length > 18) {
             // É um LID (ID privado do usuário)
             finalJid = `${finalJid}@lid`;
        } else {
             // É um número de telefone normal
             finalJid = `${finalJid}@s.whatsapp.net`;
        }
    }

    console.log(`📤 Enviando para ${finalJid}: ${text}`);
    
    try {
        await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: finalJid, text })
        });
    } catch (e) {
        console.error("ERRO AO RESPONDER:", e);
    }
}

export async function POST(req: Request) {
    try {
        if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "Configuração incompleta" }, { status: 500 });
        }

        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

        const body = await req.json();
        const remoteJid = body.data?.key?.remoteJid;
        
        if (!remoteJid) return NextResponse.json({ status: 'Ignored' });
        if (body.data?.key?.fromMe) return NextResponse.json({ status: 'Ignored' });

        const senderPhone = remoteJid.split('@')[0];
        const messageContent = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "Imagem/Outro";

        console.log(`📩 MENSAGEM DE: ${senderPhone}`);

        // 1. BUSCA USUÁRIO (LID ou Telefone)
        // Se você salvou o 129... no banco, ele vai achar aqui.
        const possibleNumbers = [senderPhone]; 
        
        // Se for telefone normal, tenta variações do 9º digito
        if (senderPhone.length < 15) {
             possibleNumbers.push(senderPhone.length > 12 ? senderPhone.replace('9', '') : senderPhone);
             possibleNumbers.push(senderPhone.length < 13 ? senderPhone.slice(0, 4) + '9' + senderPhone.slice(4) : senderPhone);
        }

        let { data: userSettings } = await supabase
            .from('user_settings')
            .select('user_id, whatsapp_phone')
            .in('whatsapp_phone', possibleNumbers)
            .maybeSingle();

        if (!userSettings) {
            await sendWhatsAppMessage(remoteJid, `⚠️ Bot: Não achei seu número/ID (${senderPhone}) no sistema.`);
            return NextResponse.json({ error: "Usuário desconhecido" });
        }

        // 2. BUSCA WORKSPACE (Essencial para aparecer no Dashboard)
        const { data: workspace } = await supabase
            .from('workspaces')
            .select('id')
            .eq('user_id', userSettings.user_id)
            .order('created_at', { ascending: true })
            .limit(1)
            .single();

        const contextId = workspace?.id;

        // 3. IA (Gemini 1.5 Flash)
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const systemPrompt = `
        Aja como um assistente financeiro. Hoje é ${new Date().toISOString().split('T')[0]}.
        Identifique gastos.
        
        SE FOR GASTO, retorne JSON:
        [
            {
                "action": "add",
                "table": "transactions",
                "data": {
                    "description": "Descrição",
                    "amount": 0.00,
                    "type": "expense",
                    "date": "YYYY-MM-DD", 
                    "category": "Outros"
                }
            }
        ]
        
        SE NÃO, retorne: {"reply": "Olá! Mande seus gastos."}
        `;
        
        const result = await model.generateContent([systemPrompt, `Mensagem: "${messageContent}"`]);
        const responseText = result.response.text();
        const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();

        try {
            const jsonMatch = cleanJson.match(/\[[\s\S]*\]/) || cleanJson.match(/\{[\s\S]*\}/);
            
            // Define para onde responder (Prioriza o ID que mandou a mensagem pra garantir entrega)
            const targetJid = remoteJid; 

            if (jsonMatch) {
                let commands = JSON.parse(jsonMatch[0]);
                if (!Array.isArray(commands)) commands = [commands];

                // Mapeamento de Meses para o Dashboard
                const monthsMap = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

                for (const cmd of commands) {
                    if (cmd.reply) {
                        await sendWhatsAppMessage(targetJid, cmd.reply);
                    } else if (cmd.action === 'add') {
                        
                        // CORREÇÃO 2: CALCULA O target_month AUTOMATICAMENTE
                        // Sem isso, o dado não aparece no site!
                        const dateObj = new Date(cmd.data.date);
                        // Adiciona fuso horário para não cair no dia anterior
                        const userMonthIndex = dateObj.getUTCMonth(); 
                        const targetMonth = monthsMap[userMonthIndex];

                        await supabase.from(cmd.table).insert([{
                            ...cmd.data,
                            user_id: userSettings.user_id,
                            context: contextId,
                            target_month: targetMonth, // <--- ESSENCIAL
                            created_at: new Date()
                        }]);
                        
                        const valor = cmd.data.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                        await sendWhatsAppMessage(targetJid, `✅ *Lançado em ${targetMonth}!* \n📝 ${cmd.data.description}\n💰 ${valor}`);
                    }
                }
            } else {
                await sendWhatsAppMessage(targetJid, responseText);
            }
        } catch (jsonError) {
            console.error("Erro JSON:", jsonError);
        }

        return NextResponse.json({ success: true });

    } catch (e: any) {
        console.error("ERRO:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}