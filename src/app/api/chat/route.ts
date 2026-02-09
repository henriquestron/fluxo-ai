import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || ""; 

export async function POST(req: Request) {
  if (!apiKey) return NextResponse.json({ error: "Chave API faltando no servidor" }, { status: 500 });

  try {
    const { prompt, contextData, userPlan, images } = await req.json();
    
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Usando Gemini 2.0 Flash (Rápido, Inteligente e Multimodal)
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    // --- 1. PREPARAÇÃO E LIMPEZA DAS IMAGENS (MANTIDO O CORRETOR) ---
    const imageParts = images?.map((img: any) => {
        let base64Data = img.base64;
        let mimeType = "image/jpeg"; // Padrão seguro

        // Tenta descobrir se é PDF pelo cabeçalho
        const mimeMatch = base64Data.match(/^data:(.*);base64,/);
        if (mimeMatch && mimeMatch[1]) {
            mimeType = mimeMatch[1];
        }

        // Remove cabeçalho e espaços
        base64Data = base64Data.replace(/^data:.*;base64,/, "").trim();

        return {
            inlineData: {
                data: base64Data,
                mimeType: mimeType
            }
        };
    }) || [];

    // --- 2. IDENTIFICAÇÃO DOS PERSONAGENS ---
    const isConsultant = contextData?.is_consultant || false;
    const viewingClient = contextData?.viewing_as_client || false;
    const targetName = viewingClient ? (contextData.client_name || "o Cliente") : "Você (Vitor)";
    const userRole = isConsultant ? "CONSULTOR FINANCEIRO" : "DONO DA CONTA";

    // --- 3. PROMPT DE SISTEMA (RESTAUROU A PERSONALIDADE + MODO VISÃO) ---
    const systemInstruction = `
        ATUE COMO: "Meu Aliado", um estrategista financeiro de elite.
        
        --- CONTEXTO DA SESSÃO ---
        QUEM ESTÁ FALANDO COM VOCÊ: ${userRole}.
        QUEM É O DONO DOS DADOS ANALISADOS: ${targetName}.
        PLANO ATUAL: ${userPlan}.
        DATA DE HOJE: ${new Date().toLocaleDateString('pt-BR')}.
        MÊS DO SISTEMA: ${contextData.mes_visualizado || 'Atual'}.

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
        Se o usuário pedir para registrar algo OU **ENVIAR UMA FOTO/PDF DE CONTA**:
        
        **REGRA DE OURO PARA ARQUIVOS:** Se a imagem/PDF for claramente uma conta de consumo (TIM, Claro, Luz, Água) ou Comprovante de Pagamento, **NÃO PERGUNTE**. Gere o JSON de "transactions" (Gasto) imediatamente. Assuma que é um pagamento à vista (type: expense).
        
        **IMPORTANTE:** Tente adivinhar o ícone ('icon') baseado no nome do gasto.
        Opções de ícones: 'shopping-cart', 'home', 'car', 'utensils', 'graduation-cap', 'heart-pulse', 'plane', 'gamepad-2', 'smartphone', 'zap'.

        Siga estritamente este formato JSON (responda APENAS o JSON se for ação):
        
        1. GASTOS/GANHOS PONTUAIS (Tabela: "transactions"):
        Ex: "Uber", "Mercado", "Fatura TIM", "Pix Recebido".
        [{"action":"add", "table":"transactions", "data":{ "title": "Nome (ex: TIM)", "amount": 0.00, "type": "expense" (ou income), "category": "Contas" (ou Alimentação, Lazer...), "icon": "smartphone", "date": "DD/MM/AAAA", "target_month": "Mês (Ex: Jan)", "status": "paid" }}]

        2. PARCELADOS (Tabela: "installments"):
        Ex: "Comprei iPhone em 12x", "Dividi a TV".
        [{"action":"add", "table":"installments", "data":{ "title": "Nome", "total_value": 0.00, "installments_count": 1, "value_per_month": 0.00, "due_day": 10, "status": "active", "icon": "shopping-cart" }}]

        3. FIXOS/RECORRENTES (Tabela: "recurring"):
        Ex: "Aluguel", "Netflix", "Salário".
        [{"action":"add", "table":"recurring", "data":{ "title": "Nome", "value": 0.00, "type": "expense", "category": "Fixa", "due_day": 10, "status": "active", "icon": "home" }}]

        --- MODO 2: ESTRATÉGICO (Análise/Consultoria) ---
        Se for apenas conversa ou pedido de análise (sem intenção de lançamento):
        1. Use Markdown rico (**Negrito**, Tabelas, Emojis).
        2. Seja direto e breve. Use Bullet points.
        3. Nunca invente dados. Use apenas o que está no JSON fornecido.

        Entrada do Usuário: "${prompt || "Analise o arquivo em anexo e execute a ação necessária."}"
    `;

    // Monta o payload
    const promptParts = [systemInstruction, ...imageParts];

    // Chama a API
    const result = await model.generateContent(promptParts);
    const responseText = result.response.text();

    return NextResponse.json({ response: responseText });

  } catch (error: any) {
    console.error("🔥 Erro Crítico no Backend:", error);
    return NextResponse.json({ 
        error: "Erro na IA (Backend)", 
        details: error.message 
    }, { status: 500 });
  }
}