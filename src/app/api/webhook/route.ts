import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO SEGURA ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ""; // Use a Service Role, nunca a Anon!

const supabase = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey) 
  : null;

const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeSecret 
  ? new Stripe(stripeSecret, { apiVersion: '2026-01-28.clover' }) // Ajuste para sua versão do Stripe
  : null;

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

export async function POST(req: Request) {
  if (!supabase || !stripe || !endpointSecret) {
    console.error("❌ ERRO CRÍTICO: Chaves de API ausentes.");
    return NextResponse.json({ error: "Server Misconfiguration" }, { status: 500 });
  }

  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event;

  try {
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    console.error(`⚠️ Erro Webhook: ${err.message}`);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // --- LÓGICA DE GERENCIAMENTO DE PLANOS ---
  
  switch (event.type) {
    // CASO 1: Compra Aprovada (Ativa o Premium)
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const planType = session.metadata?.planType || 'premium';
      
      // Importante: Pegamos os IDs do Stripe para poder cancelar depois
      const subscriptionId = session.subscription as string;
      const customerId = session.customer as string;

      if (userId) {
        console.log(`💰 Pagamento confirmado! User: ${userId}. Plano: ${planType}`);

        const { error } = await supabase
          .from('profiles') // Confirme se sua tabela é 'profiles' ou 'user_settings'
          .update({ 
            plan_tier: planType,
            stripe_customer_id: customerId,     // <--- SALVAR ISSO (Crie essa coluna no banco)
            stripe_subscription_id: subscriptionId // <--- SALVAR ISSO (Crie essa coluna no banco)
          }) 
          .eq('id', userId);

        if (error) console.error('❌ Erro Supabase (Checkout):', error);
      }
      break;
    }

    // CASO 2: Assinatura Cancelada ou Falta de Pagamento (Volta pro Free)
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const subscriptionId = subscription.id;

      console.log(`🔻 Assinatura cancelada: ${subscriptionId}. Rebaixando usuário...`);

      // Procura o usuário que tem essa assinatura e muda para 'free'
      const { error } = await supabase
        .from('profiles')
        .update({ plan_tier: 'free' }) // Volta para o plano grátis
        .eq('stripe_subscription_id', subscriptionId); // <--- AQUI ESTÁ O SEGREDO

      if (error) {
        console.error('❌ Erro Supabase (Cancelamento):', error);
      } else {
        console.log(`✅ Sucesso! Usuário da assinatura ${subscriptionId} voltou para Free.`);
      }
      break;
    }

    default:
      console.log(`Evento ignorado: ${event.type}`);
  }

  return NextResponse.json({ received: true });
}