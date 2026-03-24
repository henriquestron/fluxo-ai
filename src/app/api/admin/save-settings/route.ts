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

    // 🟢 Usa a chave mestre (SERVICE_ROLE) APENAS porque validamos a identidade depois
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
    const { id, ...updateData } = settingsData; // Separa o ID do resto por segurança

    if (!id) {
      return NextResponse.json({ error: 'ID de configuração ausente.' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("app_settings")
      .update(updateData)
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    // 🔴 4. Oculta vazamento de erros
    console.error('🔥 Erro ao salvar configurações:', error);
    return NextResponse.json({ error: 'Erro interno no servidor.' }, { status: 500 });
  }
}