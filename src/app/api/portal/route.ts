import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Inicializa o Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-01-28.clover', // Mantive a versão que você estava usando
});

// 🟡 BLINDAGEM 1: Rate Limiter (Upstash Redis)
// Impede que um usuário mal-intencionado gere 1.000 sessões do portal por segundo
const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, '1 m'), // Limite de 5 acessos ao portal por minuto
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

    // 🔴 BLINDAGEM 1 (Aplicação): Verifica o Rate Limit do usuário
    const { success } = await ratelimit.limit(user.id);
    if (!success) {
      return NextResponse.json({ error: 'Muitas tentativas. Aguarde um momento.' }, { status: 429 });
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

    // 🔴 BLINDAGEM 2: Fim do Open Redirect (Prevenção de Phishing)
    // Usamos a variável de ambiente fixa. Se não existir, usamos a URL oficial padrão.
    const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://usealiado.com.br';

    // 5. Gerar Link do Portal
    const session = await stripe.billingPortal.sessions.create({
      customer: profile.stripe_customer_id,
      return_url: `${APP_URL}/dashboard`, // Retorna o usuário exatamente para o painel seguro
    });

    return NextResponse.json({ url: session.url });

  } catch (err: any) {
    // 🔴 BLINDAGEM 3: Ocultar detalhes do erro para o cliente
    console.error("🔥 Erro API Portal:", err);
    return NextResponse.json({ error: 'Erro interno do servidor.' }, { status: 500 });
  }
}