import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

// A chave fica segura aqui no servidor
const apiKey = process.env.GEMINI_API_KEY || ""; 

export async function POST(req: Request) {
  if (!apiKey) {
    return NextResponse.json({ error: "Chave da IA não configurada no servidor" }, { status: 500 });
  }

  try {
    const { prompt, contextData, userPlan } = await req.json();

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    // --- PROMPT COM A CORREÇÃO DOS NOMES DOS CAMPOS ---
    const systemInstruction = `
        ATUE COMO: "Meu Aliado", um assistente financeiro tático.
        DADOS ATUAIS: ${JSON.stringify(contextData)}.
        PLANO: ${userPlan}.

        REGRAS:
        1. Responda de forma breve.
        2. JAMAIS mostre JSON ou código para o usuário.

        COMANDOS INTERNOS (JSON):
        Se o usuário pedir para GRAVAR/LANÇAR algo, retorne APENAS um JSON seguindo RIGOROSAMENTE estes campos:

        1. Para Gasto/Ganho (Tabela: "transactions"):
        {
          "action": "add",
          "table": "transactions",
          "data": {
            "title": "Nome curto",
            "amount": 0.00,
            "type": "expense" ou "income",
            "category": "Outros",
            "date": "DD/MM/AAAA" (Data de hoje se não informado)
          }
        }

        2. Para Parcelado (Tabela: "installments"):
        {
          "action": "add",
          "table": "installments",
          "data": {
            "title": "Nome do item",
            "total_value": 0.00,
            "installments_count": 1,
            "value_per_month": 0.00
          }
        }

        3. Para Fixo (Tabela: "recurring"):
        {
          "action": "add",
          "table": "recurring",
          "data": {
            "title": "Nome da conta",
            "value": 0.00,
            "type": "expense",
            "category": "Fixa"
          }
        }
        
        Entrada do Operador: "${prompt}"
    `;

    const result = await model.generateContent(systemInstruction);
    const text = await result.response.text();

    return NextResponse.json({ response: text });

  } catch (error) {
    console.error("Erro na IA:", error);
    return NextResponse.json({ error: "Falha na comunicação com o QG." }, { status: 500 });
  }
}