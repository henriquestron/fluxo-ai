import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const apiKey = process.env.GEMINI_API_KEY || ""; 

// 🟡 BLINDAGEM 1: Rate Limiter (Upstash Redis)
// Evita que robôs esgotem sua cota do Gemini e gerem custos astronômicos
// Limite: 15 mensagens por minuto por usuário
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(15, '1 m'), 
});

export async function POST(req: Request) {
  if (!apiKey) return NextResponse.json({ error: "Erro interno no servidor." }, { status: 500 });

  try {
    // 🔴 BLINDAGEM 2: Autenticação Real via Token
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Acesso negado. Token não fornecido.' }, { status: 401 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 });
    }

    // Aplica o Rate Limiting usando o ID seguro do usuário
    const { success } = await ratelimit.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: 'Você enviou muitas mensagens muito rápido. Aguarde um minuto.' }, { status: 429 });
    }

    // Recebe os dados do Frontend (NÃO confiamos no userPlan que vem daqui)
    const { prompt, contextData, images, history, selectedYear } = await req.json();

    // 🔴 BLINDAGEM 3: Validação de Prompt (Anti Prompt-Injection)
    if (!prompt || typeof prompt !== 'string' || prompt.length > 2000) {
      return NextResponse.json({ error: 'Texto da mensagem inválido ou muito longo.' }, { status: 400 });
    }

    // 🔴 BLINDAGEM 4: Segurança de Imagens (Evita travar o servidor com arquivos gigantes)
    let messageParts: any[] = [];
    if (images && images.length > 0) {
      const img = images[0];
      const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
      const MAX_B64_LENGTH = 1_500_000; // Aprox 1MB em Base64

      if (!ALLOWED_TYPES.includes(img.mimeType)) {
        return NextResponse.json({ error: 'Formato de imagem não suportado. Use JPG, PNG ou WEBP.' }, { status: 400 });
      }

      if (img.base64?.length > MAX_B64_LENGTH) {
        return NextResponse.json({ error: 'A imagem é muito grande. O tamanho máximo é ~1MB.' }, { status: 400 });
      }

      const base64Data = img.base64.replace(/^data:.*;base64,/, "");
      messageParts.push({ inlineData: { data: base64Data, mimeType: img.mimeType } });
    }

    // Adiciona o texto do prompt validado
    messageParts.push({ text: prompt });

    // 🔴 BLINDAGEM 5: Limpeza de Histórico (Evita gastar milhares de tokens atoa)
    const MAX_HISTORY = 15; // Lembra as últimas 15 mensagens apenas
    const chatHistory = (history || [])
      .slice(-MAX_HISTORY)
      .filter((h: any) => ['user', 'model'].includes(h.role)) // Garante que não injetem roles falsas
      .map((h: any) => ({
        role: h.role,
        parts: h.parts
      }));

    // 🔴 BLINDAGEM 6: Fim da Escalada de Privilégio
    // O backend agora busca a verdade absoluta no banco de dados, ignorando o que o frontend diz
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan_tier')
      .eq('id', user.id)
      .single();

    const realPlanTier = profile?.plan_tier || 'free';
    const canPerformActions = ['premium', 'pro', 'agent', 'admin'].includes(realPlanTier);

    // --- LÓGICA DE NEGÓCIO E MONTAGEM DO PROMPT ---
    const rawOwnerName = contextData?.owner_name;
    const myRealName = (rawOwnerName && rawOwnerName !== "Você") ? rawOwnerName : "Investidor";
    const isConsultant = contextData?.is_consultant || false;
    const viewingClient = contextData?.viewing_as_client || false;

    const interlocutorName = myRealName;
    const dataOwnerName = viewingClient ? (contextData.client_name || "o Cliente") : myRealName;
    const userRole = isConsultant ? "CONSULTOR FINANCEIRO" : "DONO DA CONTA";

    const todayReal = new Date().toLocaleDateString('pt-BR');
    const viewingPeriod = `${contextData?.mes_visualizado || 'Atual'}/${selectedYear}`;

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
        
        4. ANÁLISE DE CONTAS EM STANDBY E SOMAS GERAIS:
        Se o usuário pedir para analisar contas ou somar gastos (ex: "Quanto gastei com almoço?"), procure nas listas fornecidas e use a action analyze.
        [{"action":"analyze", "table":"mixed", "data":{ 
            "total_impact": 0.00, 
            "items_count": 0, 
            "analysis_text": "Escreva aqui sua resposta humanizada..." 
        }}]
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

    const chat = model.startChat({ history: chatHistory });
    const result = await chat.sendMessage(messageParts);
    const responseText = result.response.text();

    return NextResponse.json({ response: responseText });

  } catch (error: any) {
    // 🔴 BLINDAGEM 7: Erro Silencioso (Esconde a stack trace e API keys)
    console.error("🔥 Erro IA:", error);
    return NextResponse.json({ error: "Ocorreu um erro interno ao processar a inteligência artificial." }, { status: 500 });
  }
}