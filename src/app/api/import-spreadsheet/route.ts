import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// 🔴 1. UPSTASH INICIALIZADO (Proteção Financeira Máxima)
// Limite rigoroso: 5 importações por minuto. Ninguém importa planilhas tão rápido.
const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(5, '1 m'),
});

export async function POST(req: Request) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "Erro interno: Chave da IA ausente." }, { status: 500 });
        }

        // 🔴 2. AUTENTICAÇÃO REAL (O Crachá)
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'Acesso negado. Token não fornecido.' }, { status: 401 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 });
        }

        // 🔴 3. BLINDAGEM DE RATE LIMIT (Anti-Robôs Financeiros)
        const { success: rateLimitSuccess } = await ratelimit.limit(user.id);
        if (!rateLimitSuccess) {
            console.warn(`⏳ Rate Limit atingido na importação IA para: ${user.id}`);
            return NextResponse.json({ error: 'Você atingiu o limite de importações simultâneas. Aguarde um minuto.' }, { status: 429 });
        }

        // 🔴 4. TRAVA DE PLANO (Recurso Premium)
        const { data: profile } = await supabase
            .from('profiles')
            .select('plan_tier')
            .eq('id', user.id)
            .single();

        const allowedPlans = ['premium', 'pro', 'agent', 'admin'];
        if (!allowedPlans.includes(profile?.plan_tier || 'free')) {
            return NextResponse.json({ error: 'A importação inteligente via IA está disponível apenas nos planos Premium ou superiores.' }, { status: 403 });
        }

        const body = await req.json();
        const { rawData, textData, imageBase64, mimeType } = body;

        if (!rawData && !textData && !imageBase64) {
            return NextResponse.json({ error: "Nenhum dado, texto ou imagem foi enviado." }, { status: 400 });
        }

        // 🔴 5. LIMITADORES DE CARGA (Evita o colapso do servidor e gastos absurdos)
        const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
        const MAX_IMAGE_B64 = 1_500_000; // ~1MB
        const MAX_TEXT_LENGTH = 15_000;  // ~15KB de texto (O suficiente para planilhas e textos grandes)

        if (imageBase64 && imageBase64.length > MAX_IMAGE_B64) {
            return NextResponse.json({ error: 'A imagem é muito grande. O limite máximo é de aproximadamente 1MB.' }, { status: 400 });
        }

        if (imageBase64 && mimeType && !ALLOWED_MIME.includes(mimeType)) {
            return NextResponse.json({ error: 'Formato de imagem não suportado. Use JPG, PNG ou WEBP.' }, { status: 400 });
        }

        if (textData && textData.length > MAX_TEXT_LENGTH) {
            return NextResponse.json({ error: 'O texto enviado é muito longo. Envie arquivos ou textos menores por vez.' }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Atualizado para a nomenclatura correta do modelo flash padrão
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        let prompt = `
        Você é um assistente financeiro ultra-preciso especializado em extração de dados.
        O usuário enviou dados que podem vir de uma planilha estruturada, um texto copiado do WhatsApp, ou uma foto de um recibo/anotação.
        Sua missão é extrair as contas legíveis, ignorar lixo ou imagens ininteligíveis, e organizar no esquema do banco de dados.

        ⚠️ REGRAS CRÍTICAS ANTI-ERRO (FOTOS E TEXTOS LIVRES):
        - Se a imagem estiver muito borrada, ilegível ou não tiver contexto financeiro, IGNORE. Não invente números.
        - Para textos bagunçados (ex: "Mercado 150, Açougue 80 em 2x"), isole cada item perfeitamente.
        - CATEGORIA É OBRIGATÓRIA PARA TODOS: Estime entre (Moradia, Alimentação, Transporte, Saúde, Lazer, Educação, Fixa, Outros). Na dúvida, use "Outros".
        - PARCELADOS (INSTALLMENTS): Procure padrões como "x5", "em 10 vezes", "1/4", "parcelado em 3". O campo "installments_count" deve refletir exatamente isso.

        REGRAS DE CLASSIFICAÇÃO:
        1. RECURRING (Contas Fixas/Mensais): Contas com cara de assinatura ou repetição contínua (ex: Internet, Netflix, Luz, Água, Aluguel).
        2. INSTALLMENTS (Parcelas): Compras que claramente têm um total de parcelas definido.
        3. TRANSACTIONS (Avulsas): Tudo que for gasto comum do dia a dia (Padaria, Uber) ou Entradas (Salário, Pix).

        REGRAS DE FORMATAÇÃO:
        - "amount", "value", "total_value" e "value_per_month" SEMPRE devem ser números float (ex: 150.50).
        - O "type" pode ser "income" (entrada) ou "expense" (saída). Assuma "expense" para contas a pagar.
        - Para datas, use "DD/MM/YYYY". Se não tiver data na imagem/texto, use a data atual: ${new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })}.

        RETORNE EXCLUSIVAMENTE UM OBJETO JSON NESTE FORMATO EXATO, NADA A MAIS:
        {
            "transactions": [ { "title": "Mercado", "amount": 0.00, "type": "expense", "date": "DD/MM/YYYY", "category": "Alimentação" } ],
            "recurring": [ { "title": "Netflix", "value": 0.00, "type": "expense", "due_day": 10, "category": "Fixa" } ],
            "installments": [ { "title": "TV Nova", "total_value": 0.00, "installments_count": 10, "value_per_month": 0.00, "due_day": 5, "category": "Eletrônicos" } ]
        }
        `;

        // 🔴 6. SANITIZAÇÃO DE ENTRADA (Anti Prompt Injection em Planilhas)
        if (rawData) {
            // Converte para string e corta o excesso brutalmente para evitar injeções ocultas lá no final do arquivo
            const safeRaw = JSON.stringify(rawData).slice(0, MAX_TEXT_LENGTH);
            prompt += `\n\n--- DADOS DA PLANILHA (JSON) ---\n${safeRaw}`;
        }
        if (textData) {
            prompt += `\n\n--- TEXTO DO WHATSAPP / ANOTAÇÃO ---\n${textData}`;
        }

        let messageParts: any[] = [{ text: prompt }];
        
        if (imageBase64) {
            const base64Clean = imageBase64.replace(/^data:.*;base64,/, "");
            messageParts.unshift({
                inlineData: { data: base64Clean, mimeType: mimeType || "image/jpeg" }
            });
        }

        const result = await model.generateContent(messageParts);
        
        // Limpeza aprimorada do JSON (semelhante à que fizemos no Webhook do WhatsApp)
        let cleanJson = result.response.text().split('```json').join('').split('```').join('').trim();
        const jsonMatch = cleanJson.match(/\{[\s\S]*\}/);
        if (jsonMatch) cleanJson = jsonMatch[0];

        const parsedData = JSON.parse(cleanJson);

        // 🔴 7. SANITIZAÇÃO DE SAÍDA (Anti-Alucinação da IA)
        // A IA pode inventar de mandar um objeto do tipo "usuarios_deletar": [...]
        // Nós garantimos que apenas as três gavetas oficiais voltem para o Frontend
        const safeData = {
            transactions: Array.isArray(parsedData.transactions) ? parsedData.transactions : [],
            recurring:    Array.isArray(parsedData.recurring)    ? parsedData.recurring    : [],
            installments: Array.isArray(parsedData.installments) ? parsedData.installments : [],
        };

        return NextResponse.json({ success: true, data: safeData });

    } catch (error: any) {
        // 🔴 8. ERRO SILENCIOSO (Não mostra tokens nem erros do Gemini pro Frontend)
        console.error("❌ ERRO NA IA DE IMPORTAÇÃO MULTIMODAL:", error.message || error);
        return NextResponse.json({ error: "Ocorreu um erro ao processar os dados. Certifique-se de que a imagem ou texto estão legíveis." }, { status: 500 });
    }
}