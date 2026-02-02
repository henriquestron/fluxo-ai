import { NextResponse } from 'next/server';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  try {
    // Agora recebemos também o priceId do frontend
    const { userId, email, priceId } = await req.json();

    if (!userId || !email || !priceId) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card', 'boleto', 'pix'],
      line_items: [
        {
          price: priceId, // Usa o ID que o frontend mandou (Premium ou Agente)
          quantity: 1,
        },
      ],
      mode: 'payment', // Ou 'subscription' se o plano Agente for mensal
      success_url: `${req.headers.get('origin')}/?success=true`,
      cancel_url: `${req.headers.get('origin')}/?canceled=true`,
      customer_email: email,
      client_reference_id: userId,
      // Metadados para saber qual plano liberar no webhook depois
      metadata: {
          planType: priceId === 'price_AGENT_ID' ? 'agent' : 'premium' 
      }
    });

    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error("Erro Checkout:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}