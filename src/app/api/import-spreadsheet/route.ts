import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
    try {
        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: "Chave da API do Gemini não configurada." }, { status: 500 });
        }

        const body = await req.json();
        const { rawData } = body;

        if (!rawData || !Array.isArray(rawData)) {
            return NextResponse.json({ error: "Dados inválidos enviados." }, { status: 400 });
        }

        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        // 🟢 O PROMPT MÁGICO
        const prompt = `
        Você é um assistente financeiro ultra-preciso especializado em migração de dados.
        O usuário enviou os dados brutos de uma planilha abaixo (em JSON).
        Sua missão é classificar cada linha e organizá-la no esquema do meu banco de dados.

        DADOS DA PLANILHA:
        ${JSON.stringify(rawData)}

        REGRAS DE CLASSIFICAÇÃO:
        1. RECURRING (Contas Fixas/Mensais): Contas que têm cara de assinatura ou repetição mensal contínua (ex: Internet, Netflix, Luz, Água, Aluguel, Plano de Saúde).
        2. INSTALLMENTS (Parcelas): Compras que têm um total de parcelas definido (ex: se o texto diz "1/10", "Parcelado", "iPhone 12x").
        3. TRANSACTIONS (Despesas/Entradas Avulsas): Tudo que for gasto comum do dia a dia (Mercado, Padaria, Uber, Lanche) ou Entradas (Salário, Pix recebido).

        REGRAS DE FORMATAÇÃO:
        - "amount" ou "value" SEMPRE deve ser um número float (ex: 150.50).
        - O "type" pode ser "income" (entrada/receita) ou "expense" (saída/despesa). Assuma "expense" para contas a pagar.
        - Para datas, use o formato "DD/MM/YYYY". Se a planilha não tiver data, use a data atual: ${new Date().toLocaleDateString('pt-BR')}.
        - Estime uma "category" (ex: Moradia, Lazer, Alimentação, Transporte, Saúde, Outros).
        
        RETORNE EXCLUSIVAMENTE UM OBJETO JSON NESTE FORMATO EXATO, NADA A MAIS:
        {
            "transactions": [ { "title": "...", "amount": 0.00, "type": "expense", "date": "DD/MM/YYYY", "category": "Alimentação" } ],
            "recurring": [ { "title": "...", "value": 0.00, "type": "expense", "due_day": 10 } ],
            "installments": [ { "title": "...", "total_value": 0.00, "installments_count": 12, "value_per_month": 0.00, "due_day": 10 } ]
        }
        `;

        const result = await model.generateContent(prompt);
        let cleanJson = result.response.text().replace(/```json/g, '').replace(/```/g, '').trim();

        const parsedData = JSON.parse(cleanJson);

        return NextResponse.json({ success: true, data: parsedData });

    } catch (error: any) {
        console.error("❌ ERRO NA IA DE IMPORTAÇÃO:", error);
        return NextResponse.json({ error: "Erro ao processar a planilha com a IA." }, { status: 500 });
    }
}