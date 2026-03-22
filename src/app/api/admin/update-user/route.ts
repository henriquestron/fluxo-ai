import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const { targetUserId, newPlan, adminId } = await req.json();

    if (!targetUserId || !newPlan || !adminId) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    // 🟢 INICIALIZA COM A CHAVE MESTRE (Bypassa a segurança do RLS)
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Trava de segurança extra: Verifica se quem pediu a mudança é REALMENTE um admin
    const { data: adminProfile } = await supabaseAdmin
      .from('profiles')
      .select('plan_tier')
      .eq('id', adminId)
      .single();

    if (adminProfile?.plan_tier !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado: Você não é admin.' }, { status: 403 });
    }

    // 2. Executa a mudança no banco de dados
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ plan_tier: newPlan })
      .eq('id', targetUserId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('🔥 Erro na Rota Admin:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}