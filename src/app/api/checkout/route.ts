import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';
import { z } from 'zod';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2026-01-28.clover' as any
});

const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(5, '1 m'),
});

const checkoutSchema = z.object({
    planType: z.enum(['start', 'premium', 'pro', 'agent', 'START', 'PREMIUM', 'PRO', 'AGENT'])
        .transform(val => val.toLowerCase())
});

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const parsed = checkoutSchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json({ error: 'Dados de requisição inválidos' }, { status: 400 });
        }

        const { planType } = parsed.data;
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.split(' ')[1];

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

        const { data: { user }, error: userError } = await supabase.auth.getUser(token);
        if (userError || !user) {
            return NextResponse.json({ error: 'Acesso não autorizado' }, { status: 401 });
        }

        const userId = user.id;
        const customerEmail = user.email;

        const { success: rateLimitSuccess } = await ratelimit.limit(userId);
        if (!rateLimitSuccess) {
            return NextResponse.json({ error: 'Muitas tentativas. Aguarde um minuto.' }, { status: 429 });
        }

        // Busca configurações sem comentários dentro da query string
        const { data: settings, error: settingsError } = await supabase
            .from('app_settings')
            .select('is_promo_active, stripe_start_normal, coupon_start, stripe_premium_normal, coupon_premium, stripe_price_pro, coupon_pro, stripe_agent_normal, coupon_agent')
            .single();

        if (settingsError || !settings) {
            console.error("Erro Supabase Settings:", settingsError);
            throw new Error('Falha ao consultar configurações'); 
        }

        let stripePriceId = '';
        let stripeCouponId = undefined;

        if (planType === 'start') {
            stripePriceId = settings.stripe_start_normal;
            if (settings.is_promo_active) stripeCouponId = settings.coupon_start;
        } else if (planType === 'premium') {
            stripePriceId = settings.stripe_premium_normal;
            if (settings.is_promo_active) stripeCouponId = settings.coupon_premium;
        } else if (planType === 'pro') {
            stripePriceId = settings.stripe_price_pro;
            if (settings.is_promo_active) stripeCouponId = settings.coupon_pro;
        } else if (planType === 'agent') {
            stripePriceId = settings.stripe_agent_normal;
            if (settings.is_promo_active) stripeCouponId = settings.coupon_agent;
        }

        if (!stripePriceId) {
            throw new Error('ID do preço não encontrado para: ' + planType);
        }

        const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

        const stripeSession = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: customerEmail,
            line_items: [{ price: stripePriceId, quantity: 1 }],
            mode: 'subscription',
            discounts: stripeCouponId ? [{ coupon: stripeCouponId }] : undefined,
            success_url: `${APP_URL}/dashboard?success=true`,
            cancel_url: `${APP_URL}/dashboard?canceled=true`,
            metadata: { userId, planType },
        });

        return NextResponse.json({ url: stripeSession.url });

    } catch (error: any) {
        console.error("🔥 ERRO NO CHECKOUT:", error.message);
        return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
    }
}