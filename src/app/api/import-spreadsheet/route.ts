import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "Chave da API do Gemini não configurada." }, { status: 500 });
        }

        const body = await req.json();
        // 🟢 AGORA ACEITA 3 TIPOS DE ENTRADA: Planilha, Texto livre ou Imagem!
        const { rawData, textData, imageBase64, mimeType } = body;

        if (!rawData && !textData && !imageBase64) {
            return NextResponse.json({ error: "Nenhum dado, texto ou imagem foi enviado." }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // O Flash é perfeito para isso pois é multimodal (lê imagem e texto rápido)
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // 🟢 O PROMPT MÁGICO (TREINADO PARA O MUNDO REAL)
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
        - Para datas, use "DD/MM/YYYY". Se não tiver data na imagem/texto, use a data atual: ${new Date().toLocaleDateString('pt-BR')}.

        RETORNE EXCLUSIVAMENTE UM OBJETO JSON NESTE FORMATO EXATO, NADA A MAIS:
        {
            "transactions": [ { "title": "Mercado", "amount": 0.00, "type": "expense", "date": "DD/MM/YYYY", "category": "Alimentação" } ],
            "recurring": [ { "title": "Netflix", "value": 0.00, "type": "expense", "due_day": 10, "category": "Fixa" } ],
            "installments": [ { "title": "TV Nova", "total_value": 0.00, "installments_count": 10, "value_per_month": 0.00, "due_day": 5, "category": "Eletrônicos" } ]
        }
        `;

        // INJETANDO OS DADOS ENVIADOS PELO USUÁRIO NO PROMPT
        if (rawData) {
            prompt += `\n\n--- DADOS DA PLANILHA (JSON) ---\n${JSON.stringify(rawData)}`;
        }
        if (textData) {
            prompt += `\n\n--- TEXTO DO WHATSAPP / ANOTAÇÃO ---\n${textData}`;
        }

        // PREPARANDO A CARGA PARA A IA (Texto + Imagem, se houver)
        let messageParts: any[] = [{ text: prompt }];
        
        if (imageBase64) {
            // Limpa o prefixo do base64 se o frontend mandar (ex: data:image/png;base64,...)
            const base64Clean = imageBase64.replace(/^data:.*;base64,/, "");
            messageParts.unshift({
                inlineData: { data: base64Clean, mimeType: mimeType || "image/jpeg" }
            });
        }

        // CHAMA A IA
        const result = await model.generateContent(messageParts);
        let cleanJson = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();

        const parsedData = JSON.parse(cleanJson);

        return NextResponse.json({ success: true, data: parsedData });

    } catch (error: any) {
        console.error("❌ ERRO NA IA DE IMPORTAÇÃO MULTIMODAL:", error);
        return NextResponse.json({ error: "Erro ao processar os dados com a IA. Certifique-se de que a imagem ou texto é legível." }, { status: 500 });
    }
}