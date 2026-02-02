import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || ""; 

export async function POST(req: Request) {
  if (!apiKey) return NextResponse.json({ error: "Chave API faltando" }, { status: 500 });

  try {
    const { prompt, contextData, userPlan } = await req.json();
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    // --- PROMPT HÍBRIDO: ANALISTA + OPERADOR DE DADOS ---
    const systemInstruction = `
        ATUE COMO: "Meu Aliado", um estrategista financeiro de elite.
        DADOS: ${JSON.stringify(contextData)}.
        PLANO: ${userPlan}.

        --- MODO 1: OPERACIONAL (Adicionar/Lançar) ---
        Se o usuário pedir para registrar, lançar ou comprar algo, retorne APENAS um ARRAY JSON cru (sem markdown, sem comentários).
        Você DEVE seguir estritamente os nomes das colunas abaixo:

        1. GASTOS/GANHOS PONTUAIS (Tabela: "transactions"):
        Use para: Mercado, Uber, Pix, Café.
        Formato: [{"action":"add", "table":"transactions", "data":{ "title": "Nome", "amount": 0.00, "type": "expense" ou "income", "category": "Outros", "date": "DD/MM/AAAA", "status": "active" }}]

        2. PARCELADOS (Tabela: "installments"):
        Use para: "Comprei em 10x", "Dividi no cartão".
        Formato: [{"action":"add", "table":"installments", "data":{ "title": "Nome do Item", "total_value": 0.00, "installments_count": 1, "value_per_month": 0.00, "due_day": 10, "status": "active" }}]
        *Nota: Calcule o value_per_month (total / parcelas).

        3. FIXOS/RECORRENTES (Tabela: "recurring"):
        Use para: Assinaturas, Aluguel, Salário.
        Formato: [{"action":"add", "table":"recurring", "data":{ "title": "Nome", "value": 0.00, "type": "expense" ou "income", "category": "Fixa", "due_day": 10, "status": "active" }}]

        --- MODO 2: ESTRATÉGICO (Análise/Consultoria) ---
        Se o usuário pedir análise, diagnóstico ou apenas conversar (e NÃO estiver pedindo para lançar conta):
        1. Use formatação rica (Markdown, **Negrito** nos valores, Emojis).
        2. Seja direto e tático. Use bullet points.
        3. Execute as funções se solicitado:
           - "Diagnóstico": Calcule o risco (Verde/Amarelo/Vermelho) baseado no saldo vs gastos.
           - "Detetive": Olhe a lista de 'maiores_gastos' e aponte padrões ou gastos supérfluos.
           - "Plano de Guerra": Se saldo < 0, dê 3 passos práticos.

        Entrada do Usuário: "${prompt}"
    `;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: systemInstruction }] }],
        generationConfig: { temperature: 0.3 } // Equilíbrio entre precisão (JSON) e criatividade (Análise)
    });

    const text = await result.response.text();
    return NextResponse.json({ response: text });

  } catch (error) {
    return NextResponse.json({ error: "Erro no QG" }, { status: 500 });
  }
}