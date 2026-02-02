import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// --- 1. CONFIGURAÇÃO SEGURA (PROTEÇÃO CONTRA ERRO DE BUILD) ---
// Pegamos as chaves com um valor padrão vazio ("") caso não existam no momento do build
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Só criamos o cliente do Supabase SE as chaves existirem.
// Se não existirem (ex: durante o build), a variável fica como 'null' e não quebra o deploy.
const supabase = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey) 
  : null;

const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
// Mesma coisa para o Stripe: só inicializa se tiver a chave
const stripe = stripeSecret 
  ? new Stripe(stripeSecret, { apiVersion: '2025-01-27.acacia' }) // Ajuste a versão se o VS Code sugerir outra
  : null;

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

// --- 2. O ROBÔ QUE RECEBE O PAGAMENTO ---
export async function POST(req: Request) {
  // Verificação de segurança em tempo de execução:
  // Se o site estiver no ar e as chaves ainda estiverem faltando, avisamos no log e paramos aqui.
  if (!supabase || !stripe || !endpointSecret) {
    console.error("❌ ERRO CRÍTICO: Chaves de API (Stripe ou Supabase) não configuradas no servidor.");
    return NextResponse.json({ error: "Server Misconfiguration: Missing Keys" }, { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event;

  try {
    // Verifica a assinatura para garantir que veio do Stripe mesmo
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`⚠️ Erro de assinatura do Webhook: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // --- 3. LÓGICA DE LIBERAÇÃO ---
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id; // Aqui está o ID que enviamos no checkout

    if (userId) {
      console.log(`💰 Pagamento confirmado para o usuário: ${userId}. Liberando Premium...`);

      // Atualiza o plano no Supabase usando a chave de Admin
      const { error } = await supabase
        .from('profiles')
        .update({ plan_tier: 'premium' })
        .eq('id', userId);

      if (error) {
        console.error('❌ Erro ao atualizar o banco de dados:', error);
        return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 });
      } else {
        console.log(`✅ Sucesso! O usuário ${userId} agora é Premium 👑.`);
      }
    } else {
      console.warn("⚠️ Pagamento recebido, mas sem ID de usuário (client_reference_id).");
    }
  }

  return NextResponse.json({ received: true });
}