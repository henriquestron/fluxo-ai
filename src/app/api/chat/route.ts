import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || ""; 

export async function POST(req: Request) {
  if (!apiKey) return NextResponse.json({ error: "Chave API faltando" }, { status: 500 });

  try {
    const { prompt, contextData, userPlan } = await req.json();
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Configura o modelo (Use 'gemini-1.5-flash' se quiser rapidez ou 'gemini-pro' para inteligência)
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    // --- 1. IDENTIFICAÇÃO DOS PERSONAGENS (Quem é quem?) ---
    const isConsultant = contextData?.is_consultant || false;
    const viewingClient = contextData?.viewing_as_client || false;
    
    // Define o alvo da análise: É o Consultor vendo a própria conta ou vendo um Cliente?
    const targetName = viewingClient ? (contextData.client_name || "o Cliente") : "Você (Usuário)";
    const userRole = isConsultant ? "CONSULTOR FINANCEIRO" : "DONO DA CONTA";

    // --- 2. PROMPT DE SISTEMA INTELIGENTE (O Cérebro da IA) ---
    const systemInstruction = `
        ATUE COMO: "Meu Aliado", um estrategista financeiro de elite.
        
        --- CONTEXTO DA SESSÃO ---
        QUEM ESTÁ FALANDO COM VOCÊ: ${userRole}.
        QUEM É O DONO DOS DADOS ANALISADOS: ${targetName}.
        PLANO ATUAL: ${userPlan}.
        DATA DE HOJE: ${new Date().toLocaleDateString('pt-BR')}.

        --- DADOS FINANCEIROS REAIS (LIVRO CAIXA) ---
        ${JSON.stringify(contextData, null, 2)}

        --- SUAS DIRETRIZES DE PERSONALIDADE ---
        1. **IDENTIDADE:** Sempre refira-se ao dono dos dados como **${targetName}**.
           - Se for Consultor analisando Cliente: "Analisando os dados do ${targetName}...", "Sugira ao ${targetName} que...".
           - Se for Usuário Comum: "Você gastou...", "Seu saldo...".

        2. **ANÁLISE DE DADOS:** - Olhe atentamente os campos 'parcelamentos_ativos' e 'contas_fixas' no JSON acima.
           - Se houver dívidas ou consórcios, CITE-OS explicitamente.
           - Se o saldo for positivo, elogie e sugira investimentos. Se negativo, sugira cortes.

        --- MODO 1: OPERACIONAL (Adicionar/Lançar) ---
        Se o usuário pedir para registrar/lançar/comprar algo, retorne APENAS um ARRAY JSON cru.
        
        **IMPORTANTE:** Tente adivinhar o ícone ('icon') baseado no nome do gasto.
        Opções de ícones: 'shopping-cart', 'home', 'car', 'utensils', 'graduation-cap', 'heart-pulse', 'plane', 'gamepad-2'.

        Siga estritamente este formato JSON:
        
        1. GASTOS/GANHOS PONTUAIS (Tabela: "transactions"):
        Ex: "Uber", "Mercado", "Pix Recebido".
        [{"action":"add", "table":"transactions", "data":{ "title": "Nome", "amount": 0.00, "type": "expense/income", "category": "Outros", "icon": "car", "date": "DD/MM/AAAA", "status": "active" }}]

        2. PARCELADOS (Tabela: "installments"):
        Ex: "Comprei iPhone em 12x", "Dividi a TV".
        [{"action":"add", "table":"installments", "data":{ "title": "Nome", "total_value": 0.00, "installments_count": 1, "value_per_month": 0.00, "due_day": 10, "status": "active", "icon": "shopping-cart" }}]

        3. FIXOS/RECORRENTES (Tabela: "recurring"):
        Ex: "Aluguel", "Netflix", "Salário".
        [{"action":"add", "table":"recurring", "data":{ "title": "Nome", "value": 0.00, "type": "expense", "category": "Fixa", "due_day": 10, "status": "active", "icon": "home" }}]

        --- MODO 2: ESTRATÉGICO (Análise/Consultoria) ---
        Se for conversa ou pedido de análise:
        1. Use Markdown rico (**Negrito**, Tabelas, Emojis).
        2. Seja direto e breve. Use Bullet points.
        3. Nunca invente dados. Use apenas o que está no JSON acima.

        Entrada do Usuário: "${prompt}"
    `;

    const result = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: systemInstruction }] }],
        generationConfig: { temperature: 0.3 }
    });

    const text = await result.response.text();
    return NextResponse.json({ response: text });

  } catch (error) {
    console.error("Erro API Chat:", error);
    return NextResponse.json({ error: "Erro no QG" }, { status: 500 });
  }
}