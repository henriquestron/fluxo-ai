import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const EVOLUTION_URL = process.env.EVOLUTION_URL || "http://167.234.242.205:8080";
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || "sua-senha-secreta";
const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

async function sendWhatsAppMessage(phone: string, text: string) {
    const finalJid = phone.includes('@') ? phone : `${phone}@s.whatsapp.net`;
    console.log(`📤 Respondendo para: ${finalJid}`);
    try {
        await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: { 'apikey': EVOLUTION_API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: finalJid, text, delay: 1000 })
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

        const remoteJid = body.data?.key?.remoteJid;
        if (!remoteJid || body.data?.key?.fromMe) return NextResponse.json({ status: 'Ignored' });

        const senderId = remoteJid.split('@')[0]; // O ID que chegou (LID ou Numero)
        console.log(`📩 Recebido de: ${senderId}`);

        // 1. TENTATIVA RÁPIDA (Pelo ID exato)
        let { data: userSettings } = await supabase
            .from('user_settings')
            .select('*')
            .or(`whatsapp_phone.eq.${senderId},whatsapp_id.eq.${senderId}`)
            .maybeSingle();

        // 2. TENTATIVA INTELIGENTE (Se não achou pelo ID, tenta pelo numero com variações do 9)
        // Isso serve para encontrar os usuários antigos que só tem o telefone cadastrado
        if (!userSettings) {
            console.log("🔍 ID exato não achado. Tentando variações do telefone...");
            
            // Tenta o ID como se fosse telefone (tirando ou pondo o 9)
            // Se o ID for um numero gigante (LID), isso vai falhar, e tudo bem.
            // Mas se for numero de telefone sem o 9, isso vai funcionar.
            const variations = [
                senderId,
                senderId.length > 12 ? senderId.replace('9', '') : senderId, // Tenta tirar o 9
                senderId.length < 13 ? senderId.slice(0, 4) + '9' + senderId.slice(4) : senderId // Tenta por o 9
            ];
            
            // Se o senderId for LID (15 digitos ou mais), não adianta variar, 
            // a gente não consegue adivinhar o telefone a partir do LID.
            // Nesse caso, o usuário TEM que cadastrar o ID manualmente ou mandar o numero no texto.
            
            const { data: foundByPhone } = await supabase
                .from('user_settings')
                .select('*')
                .in('whatsapp_phone', variations)
                .maybeSingle();

            userSettings = foundByPhone;
        }

        if (!userSettings) {
            console.log("❌ Usuário totalmente desconhecido.");
            await sendWhatsAppMessage(senderId, `⚠️ Bot: Não reconheci seu número. Cadastre-o no painel ou fale com o suporte.`);
            return NextResponse.json({ error: "User not found" });
        }

        // 3. AUTO-APRENDIZADO (O CÓDIGO NOVO AQUI) 🧠
        // Se o usuário tem o campo 'whatsapp_id' vazio OU diferente do que chegou agora,
        // vamos salvar o ID novo para facilitar da próxima vez.
        if (senderId !== userSettings.whatsapp_phone && userSettings.whatsapp_id !== senderId) {
            console.log(`💾 Aprendendo novo ID para o usuário: ${senderId}`);
            
            await supabase.from('user_settings')
                .update({ whatsapp_id: senderId })
                .eq('user_id', userSettings.user_id);
                
            // Atualiza o objeto local também para usar agora
            userSettings.whatsapp_id = senderId;
        }

        // Define para onde responder (Prioriza o Telefone Real para garantir entrega)
        const targetPhone = userSettings.whatsapp_phone || senderId;

        // 4. LÓGICA DE WORKSPACE E IA (IGUAL ANTES)
        const { data: workspace } = await supabase
            .from('workspaces')
            .select('id')
            .eq('user_id', userSettings.user_id)
            .limit(1)
            .single();

        const messageContent = body.data?.message?.conversation || body.data?.message?.extendedTextMessage?.text || "";
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        
        const systemPrompt = `
        ATUE COMO: "Meu Aliado", um assistente financeiro pessoal inteligente e prestativo.
        DATA DE HOJE: ${new Date().toISOString().split('T')[0]}.

        SUA MISSÃO:
        1. Analisar a mensagem do usuário.
        2. Se for um GASTO ou GANHO, extrair os dados para JSON de ação.
        3. Se for "Oi", "Ajuda", ou conversa fiada, explicar quem você é e dar exemplos de como usar.

        --- FORMATOS DE RESPOSTA OBRIGATÓRIOS (Use APENAS JSON) ---

        CASO 1: IDENTIFICOU UM GASTO/GANHO
        Retorne uma lista de ações:
        [
            {
                "action": "add",
                "table": "transactions",
                "data": {
                    "description": "Descrição curta (ex: Uber, Almoço)",
                    "amount": 0.00,
                    "type": "expense" (ou "income" se for ganho),
                    "date": "YYYY-MM-DD",
                    "category": "Escolha entre: Alimentação, Transporte, Lazer, Casa, Saúde, Outros"
                }
            }
        ]

        CASO 2: CONVERSA, DÚVIDA OU "OI"
        Retorne um JSON de resposta explicando como ajudar:
        {
            "reply": "Olá! Sou seu Aliado Financeiro. 🤖💰\n\nEu organizo suas finanças automaticamente.\n\n*Experimente me mandar:*\n👉 'Gastei 30 no almoço'\n👉 'Uber 15 reais'\n👉 'Recebi 1000 de pagamento'\n\nO que vamos anotar agora?"
        }
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
                    const d = new Date(cmd.data.date);
                    const mesNome = months[d.getUTCMonth()]; 

                    await supabase.from('transactions').insert([{
                        ...cmd.data,
                        user_id: userSettings.user_id,
                        context: workspace?.id,
                        target_month: mesNome,
                        created_at: new Date()
                    }]);
                    
                    const valor = cmd.data.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    await sendWhatsAppMessage(targetPhone, `✅ Lançado: ${cmd.data.title} (${valor})`);
                }
            }
        } else {
            await sendWhatsAppMessage(targetPhone, result.response.text());
        }

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error("ERRO:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}