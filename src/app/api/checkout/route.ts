import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// SEUS IDS REAIS
const PREMIUM_PRICE_ID = 'price_1SwQtoBVKV78UpHa2QmMCB6v';
const AGENT_PRICE_ID = 'price_1SwQumBVKV78UpHaxUSMAGhW';

export async function POST(req: Request) {
  try {
    const { userId, email, priceId } = await req.json();

    if (!userId || !email || !priceId) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // --- LÓGICA INTELIGENTE DE MODO (CORRIGIDA) ---
    // Padrão: 'payment' (Pagamento Único para o plano Premium)
    let mode: 'payment' | 'subscription' = 'payment'; 

    if (priceId === AGENT_PRICE_ID) {
        // ✅ CORREÇÃO AQUI: Como seu plano no Stripe é recorrente,
        // mudamos o modo para 'subscription'.
        mode = 'subscription'; 
    }

    const session = await stripe.checkout.sessions.create({
      // Apenas Cartão (Pix não funciona bem para assinaturas recorrentes sem setup complexo)
      payment_method_types: ['card'], 
      
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      // O modo agora obedece a lógica acima (payment ou subscription)
      mode: mode, 
      
      success_url: `${req.headers.get('origin')}/?success=true`,
      cancel_url: `${req.headers.get('origin')}/?canceled=true`,
      customer_email: email,
      client_reference_id: userId,
      
      metadata: {
          planType: priceId === AGENT_PRICE_ID ? 'agent' : 'premium' 
      }
    });

    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error("🔥 ERRO FATAL STRIPE:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}