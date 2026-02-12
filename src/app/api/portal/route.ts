import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js'; // Usamos a lib padrão aqui
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover',
});

export async function POST(req: Request) {
  try {
    // 1. Pegar o Token do Cabeçalho
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
        return NextResponse.json({ error: 'Token de autenticação ausente' }, { status: 401 });
    }

    // 2. Criar cliente Supabase Simples
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // 3. Verificar se o Token é válido e quem é o usuário
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
        return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 });
    }

    // 4. Buscar o ID do Cliente Stripe no banco
    const { data: profile } = await supabase
      .from('profiles') 
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return NextResponse.json({ error: 'Assinatura não encontrada.' }, { status: 404 });
    }

    // 5. Gerar Link do Portal
    const origin = req.headers.get('origin') || 'https://usealiado.com.br/';
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${origin}`,
    });

    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    console.error("Erro API Portal:", err);
    return NextResponse.json({ error: 'Erro interno: ' + err.message }, { status: 500 });
  }
}