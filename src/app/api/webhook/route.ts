import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

// Inicializa o Stripe e o Supabase (Service Role)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2026-01-28.clover' });
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('stripe-signature') as string;

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error(`❌ Erro de Assinatura: ${err.message}`);
    return NextResponse.json({ error: 'Webhook signature verification failed.' }, { status: 400 });
  }

  switch (event.type) {

    // 🟢 1. COMPRA INICIAL (Sessão de Checkout)
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;

      if (session.payment_status !== 'paid') {
        console.log(`⚠️ Sessão ${session.id} completada, mas pagamento ainda pendente.`);
        break;
      }

      const userId = session.metadata?.userId;
      const planType = session.metadata?.planType;
      const subscriptionId = session.subscription as string;

      if (!userId || typeof userId !== 'string' || userId.trim() === '') {
        console.error('❌ Erro: userId ausente ou inválido no metadata:', session.id);
        break;
      }

      // ✨ AJUSTE 1: Busca a assinatura real no Stripe para pegar a data de vencimento exata
      // (Seja ela mensal, anual, com trial ou sem trial!)
      const subscription = (await stripe.subscriptions.retrieve(subscriptionId)) as Stripe.Subscription;

      const expiresAt = new Date(subscription.items.data[0].current_period_end * 1000).toISOString();

      // 🔄 ATIVA O PLANO NO BANCO
      const { error } = await supabaseAdmin
        .from('profiles') // Ajuste o nome da tabela se precisar
        .update({
          plan_tier: planType,
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: subscriptionId,
          plan_expires_at: expiresAt // ✨ Data exata injetada aqui!
        })
        .eq('id', userId);

      if (error) {
        console.error('❌ Erro Supabase (Checkout):', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      console.log(`✅ Plano ${planType} ativado para o usuário ${userId} até ${new Date(expiresAt).toLocaleDateString()}`);
      break;
    }

    // 🌟 2. RENOVAÇÃO MENSAL (Fatura Paga)
    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice;
      const parent = invoice.parent;
      const subscriptionId = parent?.type === 'subscription_details'
        ? parent.subscription_details?.subscription
        : undefined;

      if (!subscriptionId) break;
      const periodEnd = invoice.lines.data[0]?.period.end;

      if (subscriptionId && periodEnd) {
        // ✨ AJUSTE 2: Apenas empurra a data de vencimento para frente.
        // Removemos o plan_tier: 'active' para não sobrescrever o plano real ('premium', 'pro', etc)
        // que acabou de ser salvo pelo checkout.session.completed.
        const { error } = await supabaseAdmin
          .from('profiles')
          .update({
            plan_expires_at: new Date(periodEnd * 1000).toISOString()
          })
          .eq('stripe_subscription_id', subscriptionId);

        if (error) {
          console.error('❌ Erro Supabase (Renovação):', error);
          return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }
        console.log(`🔄 Assinatura ${subscriptionId} renovada/atualizada até ${new Date(periodEnd * 1000).toLocaleDateString()}`);
      }
      break;
    }

    // 🔴 3. FALHA NA COBRANÇA (Cartão Recusado)
    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      const parent = invoice.parent;
      const subscriptionId = parent?.type === 'subscription_details'
        ? parent.subscription_details?.subscription
        : undefined;

      if (!subscriptionId) break;

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ plan_tier: 'past_due' })
        .eq('stripe_subscription_id', subscriptionId);

      if (error) {
        console.error('❌ Erro Supabase (Falha Pagamento):', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      console.log(`📉 Pagamento falhou. Assinatura ${subscriptionId} marcada como atrasada.`);
      break;
    }

    // 🗑️ 4. ASSINATURA CANCELADA PELO USUÁRIO OU STRIPE
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const subscriptionId = subscription.id;

      const { error } = await supabaseAdmin
        .from('profiles')
        .update({
          plan_tier: 'free',
          stripe_subscription_id: null,
          plan_expires_at: null
        })
        .eq('stripe_subscription_id', subscriptionId);

      if (error) {
        console.error('❌ Erro Supabase (Cancelamento):', error);
        return NextResponse.json({ error: 'Database error' }, { status: 500 });
      }

      console.log(`👋 Assinatura ${subscriptionId} removida e usuário voltou para o Free.`);
      break;
    }
  }

  return NextResponse.json({ received: true });
}