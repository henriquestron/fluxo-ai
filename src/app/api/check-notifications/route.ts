import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// 🔴 1. FIM DO HARDCODE (Segurança de IP e Chaves)
const EVOLUTION_URL = process.env.EVOLUTION_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

if (!EVOLUTION_URL || !EVOLUTION_API_KEY) {
    throw new Error('🔥 Variáveis de ambiente da Evolution ausentes no .env');
}

const INSTANCE_NAME = "MEO_ALIADO_INSTANCE";

const redis = Redis.fromEnv();
const ratelimit = new Ratelimit({
    redis: redis,
    limiter: Ratelimit.slidingWindow(3, '1 m'), 
});

const MONTHS_BR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// 🟢 HELPER 1: Transformador de Array Seguro
const safeArray = (val: any) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
    }
    return [];
};

export async function POST(req: Request) {
    console.log("📨 API Check-Notifications iniciada...");

    try {
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');

        if (!token) return NextResponse.json({ error: 'Acesso negado. Token ausente.' }, { status: 401 });

        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const { data: { user }, error: authError } = await supabase.auth.getUser(token);

        if (authError || !user) return NextResponse.json({ error: 'Sessão inválida ou expirada.' }, { status: 401 });

        const activeUserId = user.id;

        const { success: rateLimitSuccess } = await ratelimit.limit(activeUserId);
        if (!rateLimitSuccess) {
            console.warn(`⏳ Rate Limit atingido para notificações do usuário: ${activeUserId}`);
            return NextResponse.json({ error: 'Muitas requisições. Aguarde um minuto antes de tentar novamente.' }, { status: 429 });
        }

        const body = await req.json().catch(() => ({}));
        const forceSend = body.forceSend === true;

        if (forceSend) {
            const { data: profile } = await supabase.from('profiles').select('plan_tier').eq('id', activeUserId).single();
            if (profile?.plan_tier !== 'admin') {
                return NextResponse.json({ error: 'Sem permissão para forçar envio.' }, { status: 403 });
            }
        }

        const { data: settings } = await supabase
            .from('user_settings')
            .select('notify_whatsapp, whatsapp_phone, last_whatsapp_notification')
            .eq('user_id', activeUserId)
            .single();

        if (!settings) return NextResponse.json({ error: "Configuração não encontrada" });
        if (!settings.notify_whatsapp) return NextResponse.json({ status: "skipped", reason: "User disabled notifications" });
        if (!settings.whatsapp_phone) return NextResponse.json({ status: "skipped", reason: "No phone number" });

        if (settings.last_whatsapp_notification && !forceSend) {
            const lastDate = new Date(settings.last_whatsapp_notification).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            const todayDate = new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
            if (lastDate === todayDate) return NextResponse.json({ status: "skipped", reason: "Already sent today" });
        }

        // 🔴 7. O BACKEND BUSCA AS CONTAS (AGORA COM MATEMÁTICA TEMPORAL CELESTIAL)
        const hojeLocal = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
        const diaHoje = hojeLocal.getDate();
        const currentYear = hojeLocal.getFullYear();
        const currentMonthIndex = hojeLocal.getMonth();
        const currentYYYYMM = `${currentYear}-${String(currentMonthIndex + 1).padStart(2, '0')}`;
        const currentMonthName = MONTHS_BR[currentMonthIndex];
        const currentTag = `${currentMonthName}/${currentYear}`; 

        // 🟢 HELPER 2: O Leitor de Datas Blindado que conserta o banco
        const getStartData = (item: any) => {
            const parseStr = (val: string) => {
                if (!val) return null;
                if (val.includes('/')) {
                    const p = val.split('/'); return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) };
                }
                if (val.includes('-')) {
                    const safeVal = val.replace(' ', 'T');
                    const dLocal = new Date(new Date(safeVal).toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
                    if (!isNaN(dLocal.getTime())) return { m: dLocal.getMonth(), y: dLocal.getFullYear() };
                }
                return null;
            };

            if (item.start_date) { const res = parseStr(item.start_date); if (res) return res; }
            if (item.date) { const res = parseStr(item.date); if (res) return res; }
            if (item.created_at) {
                const safeCreated = String(item.created_at).replace(' ', 'T');
                const d = new Date(new Date(safeCreated).toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
                if (!isNaN(d.getTime())) return { m: d.getMonth(), y: d.getFullYear() };
            }
            return { m: currentMonthIndex, y: currentYear };
        };

        // Buscando TODAS as datas e arrays necessários do banco
        const { data: recurringBills } = await supabase
            .from('recurring')
            .select('title, value, paid_months, standby_months, skipped_months, start_date, created_at, cancelled_from')
            .eq('user_id', activeUserId)
            .eq('due_day', diaHoje)
            .in('status', ['active', 'delayed']);

        const unpdRecurring = (recurringBills || []).filter(r => {
            const paidArr = safeArray(r.paid_months);
            if (paidArr.includes(currentTag) || paidArr.includes(currentMonthName)) return false;

            const standbyArr = safeArray(r.standby_months);
            const skippedArr = safeArray(r.skipped_months);
            if (standbyArr.includes(currentTag) || skippedArr.includes(currentMonthName)) return false;

            if (r.cancelled_from && currentYYYYMM >= r.cancelled_from) return false;

            const { m: startM, y: startY } = getStartData(r);
            if (currentYear < startY) return false; 
            if (currentYear === startY && currentMonthIndex < startM) return false; 

            return true;
        }).map(r => ({ title: r.title, amount: Number(r.value) }));

        // Buscando TODAS as datas e parcelas necessárias
        const { data: installmentBills } = await supabase
            .from('installments')
            .select('title, value_per_month, paid_months, standby_months, start_date, created_at, cancelled_from, installments_count, current_installment')
            .eq('user_id', activeUserId)
            .eq('due_day', diaHoje)
            .in('status', ['active', 'delayed']);

        const unpdInstallments = (installmentBills || []).filter(i => {
            const paidArr = safeArray(i.paid_months);
            if (paidArr.includes(currentTag) || paidArr.includes(currentMonthName)) return false;

            const standbyArr = safeArray(i.standby_months);
            if (standbyArr.includes(currentTag)) return false;

            if (i.cancelled_from && currentYYYYMM >= i.cancelled_from) return false;

            const { m: startM, y: startY } = getStartData(i);
            if (currentYear < startY) return false; 
            if (currentYear === startY && currentMonthIndex < startM) return false; 

            // Matemática da Parcela Atual (O Grande Salva-Vidas)
            let pastStandbys = 0;
            const monthsDiff = ((currentYear - startY) * 12) + (currentMonthIndex - startM);
            
            for (let j = 0; j < monthsDiff; j++) {
                const checkM = (startM + j) % 12;
                const checkY = startY + Math.floor((startM + j) / 12);
                if (standbyArr.includes(`${MONTHS_BR[checkM]}/${checkY}`)) pastStandbys++;
            }

            const actualInstallment = 1 + (i.current_installment || 0) + monthsDiff - pastStandbys;
            
            // 🟢 A TRAVA MESTRA DA PARCELA: Se não começou (< 1) ou já acabou, pula!
            if (actualInstallment < 1 || actualInstallment > i.installments_count) return false;

            return true;
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

        // 🔴 8. ENVIO EVOLUTION
        const cleanPhone = settings.whatsapp_phone.replace(/\D/g, '');
        const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : `55${cleanPhone}`;
        const finalJid = `${finalPhone}@s.whatsapp.net`;

        const evoResponse = await fetch(`${EVOLUTION_URL}/message/sendText/${INSTANCE_NAME}`, {
            method: 'POST',
            headers: { 'apikey': EVOLUTION_API_KEY as string, 'Content-Type': 'application/json' },
            body: JSON.stringify({ number: finalJid, options: { delay: 1200, presence: "composing" }, textMessage: { text: message } })
        });

        if (evoResponse.ok) {
            await supabase.from('user_settings').update({ last_whatsapp_notification: new Date().toISOString() }).eq('user_id', activeUserId);
            return NextResponse.json({ success: true, contasAvisadas: finalBills.length });
        } else {
            console.warn(`⚠️ Evolution API recusou a requisição para o número ${finalPhone}.`);
            throw new Error("Falha na API da Evolution");
        }

    } catch (error: any) {
        console.error("❌ Erro notificação:", error.message || error);
        return NextResponse.json({ error: 'Ocorreu um erro interno no servidor ao enviar a notificação.' }, { status: 500 });
    }
}