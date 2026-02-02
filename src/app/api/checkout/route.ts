import { NextResponse } from 'next/server';
import Stripe from 'stripe';

// Inicializa o Stripe com a chave secreta (pegue no painel do Stripe)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover', // ou a versão mais recente que ele sugerir
});

export async function POST(req: Request) {
  try {
    const { userId, email } = await req.json();

    // Cria a sessão de checkout
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'], // Adicione 'boleto' ou 'pix' se configurar no Stripe BR
      line_items: [
        {
          price_data: {
            currency: 'brl',
            product_data: {
              name: 'Fluxo AI - Premium Vitalício',
              description: 'Acesso total ao Agente IA e Backup na Nuvem.',
            },
            unit_amount: 2990, // R$ 29,90 (em centavos)
          },
          quantity: 1,
        },
      ],
      mode: 'payment', // Pagamento único (se fosse mensalidade seria 'subscription')
      success_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?success=true`, // Onde volta se der certo
      cancel_url: `${process.env.NEXT_PUBLIC_BASE_URL}/?canceled=true`,
      client_reference_id: userId, // O PULO DO GATO: Enviamos o ID do usuário pro Stripe
      customer_email: email,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}