import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
  try {
    const settingsData = await req.json();

    // 🟢 Usa a chave mestre (SERVICE_ROLE) para ter poder de Deus e ignorar bloqueios
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error } = await supabaseAdmin
      .from("app_settings")
      .update(settingsData)
      .eq("id", settingsData.id);

    if (error) throw error;

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('🔥 Erro ao salvar configurações:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}