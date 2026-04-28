import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// 🟡 1. Inicializa o Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-01-28.clover'
});

// 🟡 2. Inicializa o Rate Limiter (Upstash Redis)
// Limita a 5 tentativas de checkout por minuto, por usuário/IP
const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, '1 m'),
});

// 🟡 3. Validação Rigorosa de Input (Zod)
const checkoutSchema = z.object({
    planType: z.enum(['start', 'premium', 'pro', 'agent', 'START', 'PREMIUM', 'PRO', 'AGENT'])
        .transform(val => val.toLowerCase())
});

export async function POST(req: Request) {
    try {
        // Valida o formato do que veio do Frontend
        const body = await req.json();
        const parsed = checkoutSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Dados de requisição inválidos' }, { status: 400 });
        }

        const { planType } = parsed.data;
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.split(' ')[1];


        // 🔴 BLINDAGEM 1: Autenticação Segura Direto no Servidor Supabase
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name: string) { return cookieStore.get(name)?.value; },
                },
            }
        );

        // Usando getUser() no lugar de getSession() para validar o token no backend!
        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) {
            return NextResponse.json({ error: 'Acesso não autorizado. Faça login novamente.' }, { status: 401 });
        }

        const userId = user.id;
        const customerEmail = user.email;

        // 🔴 BLINDAGEM 2: Rate Limiting (Proteção contra Abuso)
        const { success: rateLimitSuccess } = await ratelimit.limit(userId);
        if (!rateLimitSuccess) {
            return NextResponse.json({ error: 'Muitas tentativas. Aguarde um minuto antes de tentar novamente.' }, { status: 429 });
        }

        // 🔴 BLINDAGEM 3: Prevenção de Dupla Assinatura
        const { data: existingSubscription } = await supabase
            .from('subscriptions') // Confirme se o nome da sua tabela de assinaturas é esse
            .select('id, status')
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

        if (existingSubscription) {
            return NextResponse.json(
                { error: 'Você já possui uma assinatura ativa.' },
                { status: 409 }
            );
        }

        // 🔵 BLINDAGEM 4: Select Restrito de Configurações
        const { data: settings, error: settingsError } = await supabase
            .from('app_settings')
            .select(`
                is_promo_active,
                stripe_start_normal, coupon_start,
                stripe_premium_normal, coupon_premium,
                stripe_pro_normal, coupon_pro,
                stripe_agent_normal, coupon_agent
            `)
            .single();

        if (settingsError || !settings) {
            throw new Error('Falha ao consultar configurações');
        }

        // --- Lógica de Definição de Preços ---
        let stripePriceId = '';
        let stripeCouponId = undefined;

        if (planType === 'start') {
            stripePriceId = settings.stripe_start_normal;
            if (settings.is_promo_active) stripeCouponId = settings.coupon_start;
        } else if (planType === 'premium') {
            stripePriceId = settings.stripe_premium_normal;
            if (settings.is_promo_active) stripeCouponId = settings.coupon_premium;
        } else if (planType === 'pro') {
            stripePriceId = settings.stripe_pro_normal;
            if (settings.is_promo_active) stripeCouponId = settings.coupon_pro;
        } else if (planType === 'agent') {
            stripePriceId = settings.stripe_agent_normal;
            if (settings.is_promo_active) stripeCouponId = settings.coupon_agent;
        }

        if (!stripePriceId) {
            throw new Error('ID do preço não configurado no banco');
        }

        // 🔴 BLINDAGEM 5: URL Fixa (Proteção contra Phishing)
        const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        // --- Cria a sessão no Stripe ---
        const stripeSession = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: customerEmail,
            line_items: [
                {
                    price: stripePriceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            discounts: stripeCouponId ? [{ coupon: stripeCouponId }] : undefined,
            success_url: `${APP_URL}/dashboard?success=true`,
            cancel_url: `${APP_URL}/dashboard?canceled=true`,
            metadata: {
                userId: userId,
                planType: planType
            },
        });

        return NextResponse.json({ url: stripeSession.url });

    } catch (error: any) {
        // 🔴 BLINDAGEM 6: Erro Silencioso
        console.error("🔥 ERRO CRÍTICO NO CHECKOUT:", error);
        return NextResponse.json({ error: 'Ocorreu um erro interno no servidor. Nossa equipe já foi notificada.' }, { status: 500 });
    }
}