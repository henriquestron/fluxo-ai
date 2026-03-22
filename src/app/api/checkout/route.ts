import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    const { userId, email, planType } = await req.json();

    if (!userId || !email || !planType) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: appSettings, error } = await supabase
      .from('app_settings')
      .select('*')
      .single();

    if (error || !appSettings) {
      return NextResponse.json({ error: 'Erro de configuração do servidor' }, { status: 500 });
    }

    let activePriceId = '';
    const normalizedPlan = planType.toLowerCase();

    // 🟢 MUDANÇA: Agora ele SEMPRE puxa o ID do Preço NORMAL
    if (normalizedPlan === 'start') {
      activePriceId = appSettings.stripe_start_normal;
    } else if (normalizedPlan === 'premium') {
      activePriceId = appSettings.stripe_premium_normal;
    } else if (normalizedPlan === 'pro') {
      activePriceId = appSettings.stripe_price_pro; // O nome antigo do normal que mantivemos
    } else if (normalizedPlan === 'agent') {
      activePriceId = appSettings.stripe_agent_normal;
    } else {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }

    if (!activePriceId) {
       return NextResponse.json({ error: `Preço não configurado para o plano ${normalizedPlan}` }, { status: 400 });
    }

    // 🟢 MÁGICA DO CUPOM: Se a promoção estiver ON e o ID do cupom existir, ele anexa o desconto!
    const discountArray = (appSettings.is_promo_active && appSettings.stripe_coupon_id) 
        ? [{ coupon: appSettings.stripe_coupon_id }] 
        : undefined;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], 
      line_items: [
        {
          price: activePriceId, 
          quantity: 1,
        },
      ],
      mode: 'subscription', 
      discounts: discountArray, // Aplica o cupom de 1 mês aqui!
      
      success_url: `${req.headers.get('origin')}/?success=true`,
      cancel_url: `${req.headers.get('origin')}/?canceled=true`,
      customer_email: email,
      client_reference_id: userId,
      metadata: {
          planType: normalizedPlan 
      }
    });

    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error("🔥 ERRO FATAL STRIPE:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}