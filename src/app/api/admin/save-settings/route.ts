import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    // 🔴 1. Exige o Crachá (Token)
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ error: 'Acesso negado. Token ausente.' }, { status: 401 });
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 🔴 2. Descobre de quem é o Token
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 });
    }

    // 🔴 3. Trava de Segurança: Esse usuário é um Admin de verdade?
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('plan_tier')
      .eq('id', user.id)
      .single();

    if (profile?.plan_tier !== 'admin') {
      return NextResponse.json({ error: 'Permissão negada. Apenas administradores.' }, { status: 403 });
    }

    const settingsData = await req.json();
    const id = settingsData.id;

    if (!id) {
      return NextResponse.json({ error: 'ID de configuração ausente.' }, { status: 400 });
    }

    // 🔴 4. WHITELIST DE COLUNAS (Proteção contra Mass Assignment)
    // Apenas estes campos podem ser alterados na tabela app_settings
    const EDITABLE_FIELDS = [
      'is_promo_active', 'promo_text', 'stripe_coupon_id',
      'stripe_start_normal', 'coupon_start',
      'stripe_premium_normal', 'coupon_premium',
      'stripe_price_pro', 'coupon_pro',
      'stripe_agent_normal', 'coupon_agent',
      'desc_start', 'desc_premium', 'desc_pro', 'desc_agent',
    ];

    // O código varre o que veio do frontend e joga fora qualquer coisa que não esteja na lista acima
    const updateData = Object.fromEntries(
      Object.entries(settingsData).filter(([key]) => EDITABLE_FIELDS.includes(key))
    );

    // Se depois do filtro não sobrar nada, não tem por que ir no banco
    if (Object.keys(updateData).length === 0) {
       return NextResponse.json({ error: 'Nenhum campo válido para atualizar fornecido.' }, { status: 400 });
    }

    // 5. Executa o update seguro
    const { error } = await supabaseAdmin
      .from("app_settings")
      .update(updateData)
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('🔥 Erro ao salvar configurações:', error);
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}