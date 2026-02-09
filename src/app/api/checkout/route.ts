import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// ⚠️ IMPORTANTE: COLOCAR SEUS PRICE_IDS REAIS AQUI IGUAL AO PAGE.TSX
const STRIPE_PRICES = {
    START: 'price_1SyvGvBVKV78UpHayU9XXe2Q',
    PREMIUM: 'price_1SyvHkBVKV78UpHaHryy3YYP',
    PRO: 'price_1SyvIYBVKV78UpHahHXN0APT',
    AGENT: 'price_1SwQumBVKV78UpHaxUSMAGhW'
};

export async function POST(req: Request) {
  try {
    const { userId, email, priceId } = await req.json();

    if (!userId || !email || !priceId) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // --- 1. IDENTIFICAR QUAL PLANO ESTÁ SENDO COMPRADO ---
    let planType = 'free';
    
    // Varre nosso objeto de preços para descobrir qual é o nome do plano (start, premium, etc)
    // baseando-se no ID que chegou (price_123...)
    if (priceId === STRIPE_PRICES.START) planType = 'start';
    else if (priceId === STRIPE_PRICES.PREMIUM) planType = 'premium'; // Plus no front, Premium no banco
    else if (priceId === STRIPE_PRICES.PRO) planType = 'pro';
    else if (priceId === STRIPE_PRICES.AGENT) planType = 'agent';

    // --- 2. CRIAR A SESSÃO DE CHECKOUT ---
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], // Assinatura recorrente exige cartão
      
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      
      // ✅ AGORA TODOS SÃO SUBSCRIPTION (MENSAL)
      mode: 'subscription', 
      
      success_url: `${req.headers.get('origin')}/?success=true`,
      cancel_url: `${req.headers.get('origin')}/?canceled=true`,
      customer_email: email,
      client_reference_id: userId,
      
      // 🔥 AQUI ESTÁ O SEGREDO: Enviamos o nome do plano para o Webhook ler depois
      metadata: {
          planType: planType 
      }
    });

    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error("🔥 ERRO FATAL STRIPE:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}