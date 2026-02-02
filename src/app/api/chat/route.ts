import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || ""; 

export async function POST(req: Request) {
  if (!apiKey) return NextResponse.json({ error: "Chave API faltando" }, { status: 500 });

  try {
    const { prompt, contextData, userPlan } = await req.json();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const systemInstruction = `
        ATUE COMO: Uma API que converte linguagem natural em JSON para um banco de dados financeiro.
        CONTEXTO: "Meu Aliado", assistente financeiro.
        DADOS: ${JSON.stringify(contextData)}.
        PLANO: ${userPlan}.

        REGRAS RÍGIDAS DE SAÍDA:
        1. Se for uma conversa normal, responda em texto simples.
        2. Se for uma ação de adicionar/lançar, sua resposta deve conter APENAS o JSON. Nada de "Aqui está", nada de markdown (\`\`\`json). Apenas o array cru.
        3. O JSON deve ser um ARRAY: [ { ... } ].
        4. NÃO use vírgula no último item do objeto (erro comum).
        5. NÃO use comentários (//) dentro do JSON.

        ESQUEMA OBRIGATÓRIO PARA AÇÕES:
        
        1. TRANSAÇÕES (Gasto único/Entrada):
        [{"action":"add","table":"transactions","data":{"title":"X","amount":0.00,"type":"expense","category":"Outros","date":"DD/MM/AAAA","status":"active"}}]

        2. PARCELADOS:
        [{"action":"add","table":"installments","data":{"title":"X","total_value":0.00,"installments_count":1,"value_per_month":0.00,"due_day":10,"status":"active"}}]

        3. FIXOS:
        [{"action":"add","table":"recurring","data":{"title":"X","value":0.00,"type":"expense","category":"Fixa","due_day":10,"status":"active"}}]

        Entrada do Usuário: "${prompt}"
    `;

    // Configuração para garantir JSON limpo
    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: systemInstruction }] }],
        generationConfig: {
            temperature: 0.2 // Baixa criatividade para evitar erros de sintaxe
        }
    });

    const text = await result.response.text();
    return NextResponse.json({ response: text });

  } catch (error) {
    return NextResponse.json({ error: "Erro no QG" }, { status: 500 });
  }
}