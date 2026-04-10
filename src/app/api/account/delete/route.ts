import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: Request) {
    try {
        // Pega o token do cabeçalho enviado pelo frontend
        const authHeader = req.headers.get('authorization');
        if (!authHeader) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }
        const token = authHeader.replace('Bearer ', '');

        // Cria o cliente Supabase COM PODERES DE ADMIN (Service Role)
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // Verifica QUEM é o dono desse token
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);
        
        if (authError || !user) {
            return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
        }

        // Deleta todos os dados do usuário nas tabelas (O Supabase admin faz isso facilmente)
        await supabase.from('transactions').delete().eq('user_id', user.id);
        await supabase.from('installments').delete().eq('user_id', user.id);
        await supabase.from('recurring').delete().eq('user_id', user.id);
        
        // Deleta os workspaces e as metas
        await supabase.from('workspaces').delete().eq('user_id', user.id);
        await supabase.from('goals').delete().eq('user_id', user.id);
        
        // Deleta as configurações do WhatsApp
        await supabase.from('user_settings').delete().eq('user_id', user.id);
        
        // Deleta o perfil público
        await supabase.from('profiles').delete().eq('id', user.id);

        // Por fim, deleta o usuário da tabela de autenticação (auth.users)
        await supabase.auth.admin.deleteUser(user.id);

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error("Erro crítico na exclusão de conta:", error);
        return NextResponse.json({ error: 'Erro interno no servidor' }, { status: 500 });
    }
}