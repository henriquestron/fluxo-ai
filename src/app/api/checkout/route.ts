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

    // --- 1. CONEXÃO COM SUPABASE (USANDO SERVICE ROLE PARA PODER TOTAL) ---
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: appSettings, error } = await supabase
      .from('app_settings')
      .select('*')
      .single();

    if (error || !appSettings) {
      console.error("Erro ao buscar configurações:", error);
      return NextResponse.json({ error: 'Erro de configuração do servidor' }, { status: 500 });
    }

    // --- 2. DEFINIÇÃO DINÂMICA DE PREÇO E CUPOM POR PLANO ---
    let activePriceId = '';
    let couponId = '';
    const normalizedPlan = planType.toLowerCase();

    // Lógica para selecionar o ID do Preço Oficial e o Cupom correspondente
    if (normalizedPlan === 'start') {
      activePriceId = appSettings.stripe_start_normal;
      couponId = appSettings.coupon_start;
    } 
    else if (normalizedPlan === 'premium') {
      activePriceId = appSettings.stripe_premium_normal;
      couponId = appSettings.coupon_premium;
    } 
    else if (normalizedPlan === 'pro') {
      activePriceId = appSettings.stripe_price_pro; // Mantendo o nome da sua coluna original
      couponId = appSettings.coupon_pro;
    } 
    else if (normalizedPlan === 'agent') {
      activePriceId = appSettings.stripe_agent_normal;
      couponId = appSettings.coupon_agent;
    } 
    else {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }

    // Validação de segurança
    if (!activePriceId) {
       return NextResponse.json({ error: `Preço não configurado para o plano ${normalizedPlan}` }, { status: 400 });
    }

    // --- 3. APLICAÇÃO DO DESCONTO (APENAS SE A PROMO ESTIVER ATIVA) ---
    const discountArray = (appSettings.is_promo_active && couponId) 
        ? [{ coupon: couponId }] 
        : undefined;

    // --- 4. CRIAÇÃO DA SESSÃO NO STRIPE ---
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], 
      line_items: [
        {
          price: activePriceId, // Sempre o preço cheio
          quantity: 1,
        },
      ],
      mode: 'subscription', 
      discounts: discountArray, // O Stripe aplica o cupom apenas na primeira fatura (se configurado como 'once')
      
      success_url: `${req.headers.get('origin')}/?success=true`,
      cancel_url: `${req.headers.get('origin')}/?canceled=true`,
      customer_email: email,
      client_reference_id: userId,
      
      // Metadata crucial para o seu Webhook saber qual plano liberar
      metadata: {
          planType: normalizedPlan 
      }
    });

    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error("🔥 ERRO FATAL CHECKOUT:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}