import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// --- CONFIGURAÇÃO SEGURA ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const supabase = (supabaseUrl && supabaseServiceKey) 
  ? createClient(supabaseUrl, supabaseServiceKey) 
  : null;

const stripeSecret = process.env.STRIPE_SECRET_KEY || "";
const stripe = stripeSecret 
  ? new Stripe(stripeSecret, { apiVersion: '2026-01-28.clover' }) // Versão estável
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

  // --- LÓGICA DE LIBERAÇÃO INTELIGENTE ---
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;
    
    // 🧠 AQUI O PUL O DO GATO: Lemos o metadado que enviamos no Checkout
    const planType = session.metadata?.planType || 'premium'; // Fallback para premium se falhar

    if (userId) {
      console.log(`💰 Pagamento confirmado! Usuário: ${userId}. Plano: ${planType}`);

      // Atualiza o plano exato (start, premium, pro, agent)
      const { error } = await supabase
        .from('profiles')
        .update({ plan_tier: planType }) 
        .eq('id', userId);

      if (error) {
        console.error('❌ Erro ao atualizar Supabase:', error);
        return NextResponse.json({ error: 'Database Error' }, { status: 500 });
      } else {
        console.log(`✅ Sucesso! Usuário ${userId} atualizado para ${planType}.`);
      }
    }
  }

  return NextResponse.json({ received: true });
}