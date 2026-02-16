import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || ""; 

export async function POST(req: Request) {
  if (!apiKey) return NextResponse.json({ error: "Chave API faltando" }, { status: 500 });

  try {
    const { prompt, contextData, userPlan, images, history, selectedYear } = await req.json();

    const canPerformActions = ['premium', 'pro', 'agent', 'admin'].includes(userPlan);

    // --- CONTEXTO DE PESSOAS ---
    const isConsultant = contextData?.is_consultant || false;
    const viewingClient = contextData?.viewing_as_client || false;
    const targetName = viewingClient ? (contextData.client_name || "o Cliente") : (contextData.owner_name || "Você");
    const userRole = isConsultant ? "CONSULTOR FINANCEIRO" : "DONO DA CONTA";
    
    // --- DATAS (A CORREÇÃO ESTÁ AQUI) ---
    const todayReal = new Date().toLocaleDateString('pt-BR'); // Data de hoje (ex: 16/02/2026)
    const viewingPeriod = `${contextData.mes_visualizado}/${selectedYear}`; // O que está na tela (ex: Fev/2027)

    let systemInstructionText = `
        ATUE COMO: "Meu Aliado", um estrategista financeiro pessoal.
        
        --- QUEM É VOCÊ FALANDO ---
        Você está conversando com: ${targetName} (${userRole}).
        Sempre chame o usuário pelo nome: **${targetName}**.
        
        --- CONTEXTO TEMPORAL ---
        DATA REAL DE HOJE: ${todayReal}. (Use para cumprimentos tipo "Bom dia").
        PAINEL VISUALIZADO: O usuário está olhando para os dados de **${viewingPeriod}**.
        
        ⚠️ **IMPORTANTE:** Ao analisar saldo ou adicionar contas, use o contexto do painel (${viewingPeriod}).
        
        --- DADOS FINANCEIROS DE ${viewingPeriod} ---
        ${JSON.stringify(contextData, null, 2)}

        --- DIRETRIZES DE PERSONALIDADE ---
        1. **USE O NOME:** Crie proximidade usando o nome ${targetName}.
        2. **ORIENTAÇÃO:** Seja direto. Use Markdown para formatar valores (ex: **R$ 100,00**).
    `;

    if (canPerformActions) {
        systemInstructionText += `
        --- MODO OPERACIONAL (CRIAR DADOS) ---
        Se ${targetName} pedir para registrar algo (ex: "Gastei 50 reais no mercado"):
        
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