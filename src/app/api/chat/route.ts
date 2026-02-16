import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || ""; 

export async function POST(req: Request) {
  if (!apiKey) return NextResponse.json({ error: "Chave API faltando no servidor" }, { status: 500 });

  try {
    const { prompt, contextData, userPlan, images, history, selectedYear } = await req.json();

    const canPerformActions = ['premium', 'pro', 'agent', 'admin'].includes(userPlan);

    // --- 1. DEFINIÇÃO DE PAPÉIS (LÓGICA CORRIGIDA) ---
    
    // Nome de quem está no chat (Você)
    // Se vier vazio, usa "Investidor" como fallback elegante
    const rawOwnerName = contextData?.owner_name;
    const myRealName = (rawOwnerName && rawOwnerName !== "Você") ? rawOwnerName : "Investidor";

    const isConsultant = contextData?.is_consultant || false;
    const viewingClient = contextData?.viewing_as_client || false;

    // QUEM FALA (Interlocutor): É sempre você (seja dono ou consultor)
    const interlocutorName = myRealName;

    // QUEM É O DONO DO DINHEIRO (Sujeito): Pode ser você ou seu cliente
    const dataOwnerName = viewingClient ? (contextData.client_name || "o Cliente") : myRealName;

    // Contexto do cargo
    const userRole = isConsultant ? "CONSULTOR FINANCEIRO" : "DONO DA CONTA";

    // --- 2. DATAS E CONTEXTO TEMPORAL ---
    const todayReal = new Date().toLocaleDateString('pt-BR'); // Data real (ex: 16/02/2026)
    const viewingPeriod = `${contextData.mes_visualizado}/${selectedYear}`; // O que está na tela (ex: Fev/2027)

    // --- 3. PROMPT DO SISTEMA ---
    let systemInstructionText = `
        ATUE COMO: "Meu Aliado", um estrategista financeiro pessoal.
        
        --- QUEM ESTÁ FALANDO COM VOCÊ (INTERLOCUTOR) ---
        Nome: **${interlocutorName}**
        Papel: ${userRole}
        
        --- SOBRE QUEM SÃO OS DADOS (PROPRIETÁRIO) ---
        Nome: **${dataOwnerName}**
        
        --- CONTEXTO TEMPORAL ---
        DATA REAL DE HOJE: ${todayReal}. (Use para cumprimentos tipo "Bom dia").
        PAINEL VISUALIZADO: O usuário está olhando para os dados de **${viewingPeriod}**.
        
        ⚠️ **REGRA DE OURO:** 1. Sempre chame o usuário (interlocutor) pelo nome: **${interlocutorName}**.
        2. Se ${interlocutorName} for um Consultor, ajude-o a analisar os dados de ${dataOwnerName}.
        3. Ao analisar saldo ou adicionar contas, use o contexto do painel (${viewingPeriod}).
        
        --- DADOS FINANCEIROS DE ${viewingPeriod} ---
        ${JSON.stringify(contextData, null, 2)}

        --- DIRETRIZES DE PERSONALIDADE ---
        1. **USE O NOME:** Crie proximidade chamando **${interlocutorName}** pelo nome.
        2. **ORIENTAÇÃO:** Seja direto. Use Markdown para formatar valores (ex: **R$ 100,00**).
    `;

    if (canPerformActions) {
        systemInstructionText += `
        --- MODO OPERACIONAL (CRIAR DADOS) ---
        Se ${interlocutorName} pedir para registrar algo (ex: "Gastei 50 reais no mercado"):
        
        Use como data padrão para o registro: DIA ATUAL/${contextData.mes_visualizado}/${selectedYear}.
        (Se hoje for dia 16 e o usuário estiver olhando Fevereiro, a data será 16/02/${selectedYear}).
        
        FORMATO JSON OBRIGATÓRIO (Responda APENAS o JSON se for ação):
        
        1. GASTOS (transactions):
        [{"action":"add", "table":"transactions", "data":{ "title": "Ex: Mercado", "amount": 0.00, "type": "expense", "category": "Outros", "icon": "shopping-cart", "date": "DD/${contextData.mes_visualizado}/${selectedYear}", "target_month": "${contextData.mes_visualizado}", "status": "active" }}]

        2. PARCELAS (installments):
        [{"action":"add", "table":"installments", "data":{ "title": "Nome", "total_value": 0.00, "installments_count": 1, "value_per_month": 0.00, "due_day": 10, "status": "active", "icon": "credit-card" }}]

        3. FIXAS (recurring):
        [{"action":"add", "table":"recurring", "data":{ "title": "Nome", "value": 0.00, "type": "expense", "category": "Fixa", "due_day": 10, "status": "active", "start_date": "01/${contextData.mes_visualizado}/${selectedYear}" }}]
        `;
    } else {
        systemInstructionText += `
        --- MODO RESTRITO ---
        O usuário não tem permissão para criar dados automaticamente. Apenas analise.
        `;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Uso o modelo 2.0 Flash que é mais rápido e inteligente que o flash-latest genérico
    const model = genAI.getGenerativeModel({ 
        model: "gemini-flash-latest", 
        systemInstruction: systemInstructionText 
    });

    const chatHistory = (history || []).map((h: any) => ({
        role: h.role,
        parts: h.parts
    }));

    const chat = model.startChat({ history: chatHistory });

    let messageParts: any[] = [{ text: prompt }];
    
    if (images && images.length > 0) {
        const img = images[0];
        // Limpeza extra para garantir que o Gemini aceite a imagem
        const base64Data = img.base64.replace(/^data:.*;base64,/, "");
        messageParts = [
            { inlineData: { data: base64Data, mimeType: img.mimeType || "image/jpeg" } },
            { text: prompt }
        ];
    }

    const result = await chat.sendMessage(messageParts);
    const responseText = result.response.text();

    return NextResponse.json({ response: responseText });

  } catch (error: any) {
    console.error("🔥 Erro IA:", error);
    return NextResponse.json({ error: "Erro na IA", details: error.message }, { status: 500 });
  }
}