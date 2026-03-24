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

    // 🔴 2. Descobre quem é o DONO do token (A verdade absoluta do Backend)
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 });
    }

    const { targetUserId, newPlan } = await req.json();

    if (!targetUserId || !newPlan) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // 🔴 3. WHITELIST DE PLANOS (A Trava Final)
    // Impede que qualquer string maluca seja salva no banco, mesmo que enviada por um Admin
    const VALID_PLANS = ['free', 'start', 'premium', 'pro', 'agent', 'admin'];
    if (!VALID_PLANS.includes(newPlan)) {
      console.warn(`Tentativa de aplicar plano inválido: ${newPlan} pelo Admin: ${user.id}`);
      return NextResponse.json({ error: 'Plano inválido ou inexistente no sistema.' }, { status: 400 });
    }

    // 🔴 4. Verifica se o DONO do token é Admin
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('plan_tier')
      .eq('id', user.id)
      .single();

    if (adminProfile?.plan_tier !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado: Você não é admin.' }, { status: 403 });
    }

    // 5. Executa a mudança no banco de dados
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ plan_tier: newPlan })
      .eq('id', targetUserId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    // 6. Oculta vazamento de erros
    console.error('🔥 Erro na Rota Admin:', error);
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}