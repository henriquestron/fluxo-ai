import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
// Usamos a chave SERVICE ROLE do Supabase porque ela pode escrever em qualquer lugar (admin)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: Request) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature')!;

  let event;

  try {
    // Verifica se o aviso veio mesmo do Stripe (Segurança)
    event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err: any) {
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  // Se o pagamento foi aprovado
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id; // Pegamos o ID de volta

    if (userId) {
      // ATUALIZA O BANCO PARA PREMIUM
      const { error } = await supabase
        .from('profiles')
        .update({ plan_tier: 'premium' })
        .eq('id', userId);

      if (error) console.error('Erro ao atualizar premium:', error);
      else console.log(`Usuário ${userId} virou Premium!`);
    }
  }

  return NextResponse.json({ received: true });
}