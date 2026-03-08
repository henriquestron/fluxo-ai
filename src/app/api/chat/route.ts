import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || ""; 

export async function POST(req: Request) {
  if (!apiKey) return NextResponse.json({ error: "Chave API faltando no servidor" }, { status: 500 });

  try {
    const { prompt, contextData, userPlan, images, history, selectedYear } = await req.json();

    const canPerformActions = ['premium', 'pro', 'agent', 'admin'].includes(userPlan);

    const rawOwnerName = contextData?.owner_name;
    const myRealName = (rawOwnerName && rawOwnerName !== "Você") ? rawOwnerName : "Investidor";
    const isConsultant = contextData?.is_consultant || false;
    const viewingClient = contextData?.viewing_as_client || false;

    const interlocutorName = myRealName;
    const dataOwnerName = viewingClient ? (contextData.client_name || "o Cliente") : myRealName;
    const userRole = isConsultant ? "CONSULTOR FINANCEIRO" : "DONO DA CONTA";

    const todayReal = new Date().toLocaleDateString('pt-BR');
    const viewingPeriod = `${contextData.mes_visualizado}/${selectedYear}`;

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
        Se ${interlocutorName} pedir para registrar algo (ex: "Gastei 50 reais no mercado"), VOCÊ DEVE EXECUTAR A AÇÃO.
        
        Use como data padrão para o registro: DIA ATUAL/${contextData.mes_visualizado}/${selectedYear}.
        
        ⚠️ REGRA CRÍTICA PARA AÇÕES: Se a sua resposta for registrar uma transação, sua resposta DEVE SER EXCLUSIVAMENTE O ARRAY JSON ABAIXO. NÃO adicione nenhum texto antes ou depois. NENHUM.
        
        1. GASTOS E RECEITAS (transactions):
        [{"action":"add", "table":"transactions", "data":{ "title": "Ex: Mercado", "amount": 50.00, "type": "expense", "category": "Outros", "icon": "shopping-cart", "is_paid": true, "date": "10/${contextData.mes_visualizado}/${selectedYear}", "target_month": "${contextData.mes_visualizado}", "status": "active" }}]

        2. PARCELAS DE CARTÃO DE CRÉDITO (installments):
        [{"action":"add", "table":"installments", "data":{ "title": "Nome", "total_value": 0.00, "installments_count": 1, "value_per_month": 0.00, "due_day": 10, "status": "active", "icon": "credit-card" }}]

        3. CONTAS E RECEITAS FIXAS (recurring):
        [{"action":"add", "table":"recurring", "data":{ "title": "Nome", "value": 0.00, "type": "expense", "category": "Fixa", "due_day": 10, "status": "active", "start_date": "01/${contextData.mes_visualizado}/${selectedYear}" }}]
        `;
    } else {
        systemInstructionText += `
        --- MODO RESTRITO ---
        O usuário não tem permissão para criar dados automaticamente. Apenas analise.
        `;
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-2.5-flash", 
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