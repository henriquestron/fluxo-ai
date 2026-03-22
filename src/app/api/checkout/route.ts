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

    // --- 1. BUSCAR AS CONFIGURAÇÕES NO "CONTROLE REMOTO" DO SUPABASE ---
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: appSettings, error } = await supabase
      .from('app_settings')
      .select('*')
      .single();

    if (error || !appSettings) {
      console.error("Erro ao buscar configurações do app:", error);
      return NextResponse.json({ error: 'Erro de configuração do servidor' }, { status: 500 });
    }

    // --- 2. IDENTIFICAR O ID DO STRIPE BASEADO NA PROMOÇÃO E NO PLANO ---
    let activePriceId = '';
    const isPromo = appSettings.is_promo_active;
    
    // Normaliza para minúsculo (START vira start) para não dar erro no webhook depois
    const normalizedPlan = planType.toLowerCase();

    if (normalizedPlan === 'start') {
      activePriceId = isPromo ? appSettings.stripe_start_promo : appSettings.stripe_start_normal;
    } 
    else if (normalizedPlan === 'premium') {
      activePriceId = isPromo ? appSettings.stripe_premium_promo : appSettings.stripe_premium_normal;
    } 
    else if (normalizedPlan === 'pro') {
      // Lembrando que o Pro usa os nomes antigos que já existiam
      activePriceId = isPromo ? appSettings.stripe_price_promo : appSettings.stripe_price_pro;
    } 
    else if (normalizedPlan === 'agent') {
      activePriceId = isPromo ? appSettings.stripe_agent_promo : appSettings.stripe_agent_normal;
    } 
    else {
      return NextResponse.json({ error: 'Plano inválido' }, { status: 400 });
    }

    if (!activePriceId) {
       return NextResponse.json({ error: `Preço Stripe não configurado para o plano ${normalizedPlan}` }, { status: 400 });
    }

    // --- 3. CRIAR A SESSÃO DE CHECKOUT COM O PREÇO DINÂMICO ---
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], 
      
      line_items: [
        {
          price: activePriceId, // 🟢 Puxa exatamente o ID que está valendo agora!
          quantity: 1,
        },
      ],
      
      mode: 'subscription', 
      
      success_url: `${req.headers.get('origin')}/?success=true`,
      cancel_url: `${req.headers.get('origin')}/?canceled=true`,
      customer_email: email,
      client_reference_id: userId,
      
      // Enviamos o nome do plano normalizado (minúsculo) para o Webhook ler depois
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