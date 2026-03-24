import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// 🔴 1. FIM DO HARDCODE (Segurança de IP e Chaves)
const EVOLUTION_URL = process.env.EVOLUTION_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

// Falha Segura
if (!EVOLUTION_URL || !EVOLUTION_API_KEY) {
    throw new Error('🔥 Variáveis de ambiente da Evolution ausentes no .env');
}

const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

// 🔴 2. UPSTASH INICIALIZADO (Rate Limit)
// Impede que um usuário mal-intencionado (mesmo logado) dispare a notificação 500 vezes seguidas.
const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(3, '1 m'), // Limite bem estrito: max 3 cliques no botão por minuto
});

// Array auxiliar para o nome do mês
const MONTHS_BR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export async function POST(req: Request) {
    console.log("📨 API Check-Notifications iniciada...");

    try {
        // 🔴 3. AUTENTICAÇÃO REAL (O Crachá)
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) {
            return NextResponse.json({ error: 'Acesso negado. Token ausente.' }, { status: 401 });
        }

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY! 
        );

        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) {
            return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 });
        }

        const activeUserId = user.id;

        // 🔴 4. BLINDAGEM DE RATE LIMIT (Anti-Flood)
        const { success: rateLimitSuccess } = await ratelimit.limit(activeUserId);
        if (!rateLimitSuccess) {
            console.warn(`⏳ Rate Limit atingido para notificações do usuário: ${activeUserId}`);
            return NextResponse.json({ error: 'Muitas requisições. Aguarde um minuto antes de tentar novamente.' }, { status: 429 });
        }

        const body = await req.json().catch(() => ({}));
        const forceSend = body.forceSend === true;

        // 🔴 5. TRAVA DO FORCESEND (Evita Spam)
        if (forceSend) {
            const { data: profile } = await supabase
                .from('profiles')
                .select('plan_tier')
                .eq('id', activeUserId)
                .single();

            if (profile?.plan_tier !== 'admin') {
                console.warn(`Tentativa de forceSend bloqueada para usuário não admin: ${activeUserId}`);
                return NextResponse.json({ error: 'Sem permissão para forçar envio.' }, { status: 403 });
            }
        }

        // 🔴 6. SELECT RESTRITO
        const { data: settings } = await supabase
            .from('user_settings')
            .select('notify_whatsapp, whatsapp_phone, last_whatsapp_notification')
            .eq('user_id', activeUserId)
            .single();

        if (!settings) return NextResponse.json({ error: "Configuração não encontrada" });
        if (!settings.notify_whatsapp) return NextResponse.json({ status: "skipped", reason: "User disabled notifications" });
        if (!settings.whatsapp_phone) return NextResponse.json({ status: "skipped", reason: "No phone number" });

        // Trava de Data
        if (settings.last_whatsapp_notification && !forceSend) {
            const lastDate = new Date(settings.last_whatsapp_notification).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            const todayDate = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });

            if (lastDate === todayDate) {
                console.log(`📅 Já enviado hoje (${todayDate}).`);
                return NextResponse.json({ status: "skipped", reason: "Already sent today" });
            }
        }

        // 🔴 7. O BACKEND BUSCA AS CONTAS
        const hojeLocal = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
        const diaHoje = hojeLocal.getDate();
        const anoAtual = hojeLocal.getFullYear();
        const tagMes = `${MONTHS_BR[hojeLocal.getMonth()]}/${anoAtual}`; 

        const { data: recurringBills } = await supabase
            .from('recurring')
            .select('title, value, paid_months')
            .eq('user_id', activeUserId)
            .eq('due_day', diaHoje)
            .in('status', ['active', 'delayed']);

        const unpdRecurring = (recurringBills || []).filter(r => {
            const paid = r.paid_months || [];
            return !paid.includes(tagMes) && !paid.includes(tagMes.split('/')[0]);
        }).map(r => ({ title: r.title, amount: Number(r.value) }));

        const { data: installmentBills } = await supabase
            .from('installments')
            .select('title, value_per_month, paid_months')
            .eq('user_id', activeUserId)
            .eq('due_day', diaHoje)
            .in('status', ['active', 'delayed']);

        const unpdInstallments = (installmentBills || []).filter(i => {
            const paid = i.paid_months || [];
            return !paid.includes(tagMes) && !paid.includes(tagMes.split('/')[0]);
        }).map(i => ({ title: i.title, amount: Number(i.value_per_month) }));

        const finalBills = [...unpdRecurring, ...unpdInstallments];

        if (finalBills.length === 0) {
            console.log("Nada vencendo hoje (ou tudo pago).");
            return NextResponse.json({ status: "skipped", reason: "Nenhuma conta pendente para hoje." });
        }

        const totalValue = finalBills.reduce((acc: number, item: any) => acc + item.amount, 0);
        const totalFmt = totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
        const billsList = finalBills.map((b: any) => `• *${b.title}*`).join('\n');

        const message = `🔔 *Lembrete: Contas de Hoje* 🔔\n\nOlá! Você tem *${finalBills.length} contas* pendentes para hoje, totalizando *${totalFmt}*.\n\n${billsList}\n\nAcesse o sistema para marcar como pago! 🚀`;

        // 🔴 8. ENVIO EVOLUTION COM FALLBACK
        const cleanPhone = settings.whatsapp_phone.replace(/\D/g, '');
        const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        const finalJid = `${finalPhone}@s.whatsapp.net`;

        const evoResponse = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: { 
                'apikey': EVOLUTION_API_KEY as string, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({ 
                number: finalJid,
                options: { delay: 1200, presence: "composing" },
                textMessage: { text: message }
            })
        });

        if (evoResponse.ok) {
            await supabase.from('user_settings').update({ last_whatsapp_notification: new Date() }).eq('user_id', activeUserId);
            return NextResponse.json({ success: true, contasAvisadas: finalBills.length });
        } else {
            // Se a Evolution cair, nós capturamos o erro e o servidor não quebra
            console.warn(`⚠️ Evolution API recusou a requisição para o número ${finalPhone}.`);
            throw new Error("Falha na API da Evolution");
        }

    } catch (error: any) {
        // 🔴 9. ERRO SILENCIOSO
        console.error("❌ Erro notificação:", error.message || error);
        return NextResponse.json({ error: 'Ocorreu um erro interno no servidor ao enviar a notificação.' }, { status: 500 });
    }
}