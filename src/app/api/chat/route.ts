import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || ""; 

export async function POST(req: Request) {
  if (!apiKey) return NextResponse.json({ error: "Chave API faltando no servidor" }, { status: 500 });

  try {
    const { prompt, contextData, userPlan, images, history } = await req.json();

    // --- 1. VERIFICAÇÃO DE PLANO ---
    // Apenas estes planos recebem o "Manual de Instruções" de como gerar JSON
    const canPerformActions = ['premium', 'pro', 'agent', 'admin'].includes(userPlan);

    // --- 2. MONTAGEM DO PROMPT ---
    
    // PARTE A: Contexto Geral (Todo mundo recebe)
    const isConsultant = contextData?.is_consultant || false;
    const viewingClient = contextData?.viewing_as_client || false;
    const targetName = viewingClient ? (contextData.client_name || "o Cliente") : "Você";
    const userRole = isConsultant ? "CONSULTOR FINANCEIRO" : "DONO DA CONTA";

    let systemInstructionText = `
        ATUE COMO: "Meu Aliado", um estrategista financeiro de elite.
        
        --- CONTEXTO DA SESSÃO ---
        QUEM ESTÁ FALANDO COM VOCÊ: ${userRole}.
        QUEM É O DONO DOS DADOS ANALISADOS: ${targetName}.
        PLANO ATUAL: ${userPlan.toUpperCase()}.
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
        
        3. **MEMÓRIA:** Lembre-se do contexto das mensagens anteriores desta conversa.
    `;

    // PARTE B: O "Divisor de Águas" (Ações vs Bloqueio)
    if (canPerformActions) {
        // --- SE FOR PREMIUM: Cola o seu prompt original de ações ---
        systemInstructionText += `
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
        `;
    } else {
        // --- SE FOR FREE/START: Bloqueio total de JSON ---
        systemInstructionText += `
        --- MODO RESTRITO (SEM AÇÕES DE BANCO DE DADOS) ---
        ⚠️ **ATENÇÃO:** O usuário está no plano ${userPlan}. Você **NÃO TEM PERMISSÃO** para gerar JSONs de ação (add/edit/delete).
        
        Se o usuário pedir para lançar um gasto, adicionar uma conta, ou enviar uma foto de comprovante para registro:
        1. Identifique a intenção (ex: "Entendi que você quer lançar um gasto de R$ 50 no Uber...").
        2. Explique educadamente: "Como você está no plano ${userPlan}, eu só posso analisar seus dados, mas não posso fazer lançamentos automáticos."
        3. Sugira o upgrade: "No plano Premium, eu lanço isso pra você em segundos, inclusive lendo fotos de comprovantes."
        
        NUNCA gere o bloco de código JSON. Apenas converse e analise.
        `;
    }

    // PARTE C: Finalização (Estratégia) - Todo mundo recebe
    systemInstructionText += `
        --- MODO 2: ESTRATÉGICO (Análise/Consultoria) ---
        Se for apenas conversa ou pedido de análise (sem intenção de lançamento):
        1. Use Markdown rico (**Negrito**, Tabelas, Emojis).
        2. Seja direto e breve. Use Bullet points.
        3. Nunca invente dados. Use apenas o que está no JSON fornecido.
    `;

    // --- 3. INICIALIZAR O MODELO ---
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-flash-latest", 
        systemInstruction: systemInstructionText 
    });

    // --- 4. TRATAMENTO DE IMAGENS ---
    const imageParts = (images || []).map((img: any) => {
        // Remove cabeçalho do base64 se existir
        const base64Data = img.base64.replace(/^data:.*;base64,/, "").trim();
        // Tenta descobrir o mimeType ou assume jpeg
        const mimeType = img.base64.match(/^data:(.*);base64,/)?.[1] || "image/jpeg";
        
        return {
            inlineData: {
                data: base64Data,
                mimeType: mimeType
            }
        };
    });

    // --- 5. EXECUÇÃO DO CHAT ---
    const chat = model.startChat({
        history: history || []
    });

    let messageParts: any[] = [{ text: prompt }];
    
    if (imageParts.length > 0) {
        messageParts = [
            { text: prompt },
            ...imageParts
        ];
    }

    const result = await chat.sendMessage(messageParts);
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