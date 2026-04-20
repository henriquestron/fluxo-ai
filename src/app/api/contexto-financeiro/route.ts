import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const userId = searchParams.get('userId');
        const workspaceId = searchParams.get('workspaceId');
        
        // Trava de Segurança
        const secret = req.headers.get('x-api-secret');
        if (secret !== process.env.EVOLUTION_WEBHOOK_SECRET) {
            return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
        }

        if (!userId || !workspaceId) {
            return NextResponse.json({ error: 'Faltam parâmetros' }, { status: 400 });
        }

        const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

        // 1. Busca os dados brutos iguais ao do site
        const [transRes, recRes, instRes] = await Promise.all([
            supabase.from('transactions').select('*').eq('user_id', userId).eq('context', workspaceId),
            supabase.from('recurring').select('*').eq('user_id', userId).eq('context', workspaceId),
            supabase.from('installments').select('*').eq('user_id', userId).eq('context', workspaceId)
        ]);

        const transactions = transRes.data || [];
        const recurring = recRes.data || [];
        const installments = instRes.data || [];

        // 2. Lógica Exata do seu page.tsx
        const today = new Date(new Date().toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
        const selectedYear = today.getFullYear();
        const activeMonthIndex = today.getMonth();
        const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const activeTab = MONTHS[activeMonthIndex];

        const isPaid = (item: any, tag: string) => {
            if (!item.paid_months && item.is_paid !== undefined) return item.is_paid; // Pra transação
            if (!item.paid_months) return false; // Pra fixas e parcelas
            return item.paid_months.includes(tag) || item.paid_months.includes(tag.split('/')[0]);
        };

        const getMonthData = (monthName: string, forceMonthIndex: number) => {
            const monthMap: Record<string, string> = { 'Jan': '/01', 'Fev': '/02', 'Mar': '/03', 'Abr': '/04', 'Mai': '/05', 'Jun': '/06', 'Jul': '/07', 'Ago': '/08', 'Set': '/09', 'Out': '/10', 'Nov': '/11', 'Dez': '/12' };
            const dateFilter = `${monthMap[monthName]}/${selectedYear}`;
            const currentPaymentTag = `${monthName}/${selectedYear}`;

            const getStartData = (item: any) => {
                if (item.start_date && item.start_date.includes('/')) {
                    const p = item.start_date.split('/');
                    return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) };
                }
                if (item.date && item.date.includes('/')) {
                    const p = item.date.split('/');
                    return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) };
                }
                if (item.created_at) {
                    const d = new Date(new Date(item.created_at).toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
                    return { m: d.getMonth(), y: d.getFullYear() };
                }
                return { m: 0, y: selectedYear };
            };

            const activeRecurring = recurring.filter(r => {
                const paid = isPaid(r, currentPaymentTag);
                if ((r.status === 'delayed' || r.status === 'standby') && !paid) return false;
                if (r.standby_months?.includes(currentPaymentTag) && !paid) return false;

                const { m: startMonth, y: startYear } = getStartData(r);
                if (selectedYear > startYear) return true;
                if (selectedYear === startYear && forceMonthIndex >= startMonth) return true;
                return false;
            });

            const incomeFixed = activeRecurring.filter(r => r.type === 'income' && !r.skipped_months?.includes(monthName)).reduce((acc, curr) => acc + Number(curr.value), 0);
            const incomeVariable = transactions.filter(t => t.type === 'income' && t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby').reduce((acc, curr) => acc + Number(curr.amount), 0);
            const incomeTotal = incomeFixed + incomeVariable;

            const expenseFixed = activeRecurring.filter(r => r.type === 'expense' && !r.skipped_months?.includes(monthName)).reduce((acc, curr) => acc + Number(curr.value), 0);
            const expenseVariable = transactions.filter(t => t.type === 'expense' && t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby').reduce((acc, curr) => acc + Number(curr.amount), 0);
            
            const installTotal = installments.reduce((acc, curr) => {
                const paid = isPaid(curr, currentPaymentTag);
                if ((curr.status === 'delayed' || curr.status === 'standby') && !paid) return acc;
                if (curr.standby_months?.includes(currentPaymentTag) && !paid) return acc;

                const { m: startMonth, y: startYear } = getStartData(curr);
                const monthsDiff = ((selectedYear - startYear) * 12) + (forceMonthIndex - startMonth);
                const currentInstNum = 1 + (curr.current_installment || 0) + monthsDiff;

                if (currentInstNum >= 1 && currentInstNum <= curr.installments_count) {
                    return acc + Number(curr.value_per_month);
                }
                return acc;
            }, 0);

            // Detalhamento de Pendências (Apenas para o mês atual)
            let pendingCount = 0;
            let pendingAmount = 0;
            let paidCount = 0;

            if (forceMonthIndex === activeMonthIndex) {
                // Conta Transações Pendentes
                transactions.filter(t => t.type === 'expense' && t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby').forEach(t => {
                    if (!t.is_paid) { pendingCount++; pendingAmount += Number(t.amount); } else { paidCount++; }
                });
                // Conta Fixas Pendentes
                activeRecurring.filter(r => r.type === 'expense' && !r.skipped_months?.includes(monthName)).forEach(r => {
                    if (!isPaid(r, currentPaymentTag)) { pendingCount++; pendingAmount += Number(r.value); } else { paidCount++; }
                });
                // Conta Parcelas Pendentes
                installments.forEach(curr => {
                    const paid = isPaid(curr, currentPaymentTag);
                    if ((curr.status === 'delayed' || curr.status === 'standby') && !paid) return;
                    if (curr.standby_months?.includes(currentPaymentTag) && !paid) return;
                    const { m: startMonth, y: startYear } = getStartData(curr);
                    const monthsDiff = ((selectedYear - startYear) * 12) + (forceMonthIndex - startMonth);
                    const currentInstNum = 1 + (curr.current_installment || 0) + monthsDiff;
                    if (currentInstNum >= 1 && currentInstNum <= curr.installments_count) {
                        if (!paid) { pendingCount++; pendingAmount += Number(curr.value_per_month); } else { paidCount++; }
                    }
                });
            }

            return { 
                income: incomeTotal, 
                expenseTotal: expenseVariable + expenseFixed + installTotal, 
                balance: incomeTotal - (expenseVariable + expenseFixed + installTotal),
                pendingCount, pendingAmount, paidCount
            };
        };

        // 3. A MÁQUINA DO TEMPO DO SEU PAGE.TSX
        let previousSurplus = 0;
        for (let i = 0; i < activeMonthIndex; i++) {
            const pastData = getMonthData(MONTHS[i], i);
            const fechamentoDoMes = pastData.balance + previousSurplus;
            previousSurplus = fechamentoDoMes;
        }

        const currentMonthData = getMonthData(activeTab, activeMonthIndex);
        const displayBalance = currentMonthData.balance + previousSurplus;

        const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        let estado = "ESTÁVEL 🟢";
        if (displayBalance < 0) estado = "CRÍTICO 🔴";
        else if (displayBalance < (currentMonthData.income * 0.1)) estado = "ALERTA 🟡";

        const payloadRetorno = {
            saldo_fmt: fmt(displayBalance),
            entradas_fmt: fmt(currentMonthData.income),
            saidas_fmt: fmt(currentMonthData.expenseTotal),
            pendente_fmt: fmt(currentMonthData.pendingAmount),
            mes_atual: activeTab,
            contas_pagas: currentMonthData.paidCount,
            contas_pendentes: currentMonthData.pendingCount,
            detalhes_receitas: "\n📥 Total Receitas (Consulte site para detalhes)",
            detalhes_gastos: "\n📤 Total Despesas (Consulte site para detalhes)",
            estado_conta: estado
        };

        return NextResponse.json(payloadRetorno);

    } catch (error: any) {
        console.error("Erro na API de Contexto:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}