import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from '@supabase/supabase-js';

const apiKey = process.env.GEMINI_API_KEY || ""; 

export async function POST(req: Request) {
    if (!apiKey) return NextResponse.json({ error: "Erro interno." }, { status: 500 });

    try {
        const authHeader = req.headers.get('Authorization');
        const token = authHeader?.replace('Bearer ', '');
        const { clientId, clientName, month, year, consultantName } = await req.json();

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            { global: { headers: { Authorization: `Bearer ${token}` } } }
        );

        // 1. BUSCA TUDO DO CLIENTE
        const [resT, resR, resI] = await Promise.all([
            supabase.from('transactions').select('*').eq('user_id', clientId),
            supabase.from('recurring').select('*').eq('user_id', clientId).eq('status', 'active'),
            supabase.from('installments').select('*').eq('user_id', clientId).eq('status', 'active')
        ]);

        const targetMonth = Number(month);
        const targetYear = Number(year);

        let pastBalance = 0;
        let currentIncome = 0;
        let currentExpense = 0;
        let categories: Record<string, number> = {};

        // 1. CALCULA O PASSADO (TUDO ANTES DO MÊS ATUAL)
        resT.data?.forEach(t => {
            const amount = Number(t.amount || 0);
            const [d, m, y] = t.date.split('/').map(Number);
            
            if (y < targetYear || (y === targetYear && m < targetMonth)) {
                if (t.type === 'income') pastBalance += amount;
                else pastBalance -= amount;
            } 
        });

        // Subtrai Recorrentes e Parcelas dos meses passados
        // (Precisamos saber quantos meses se passaram desde o início do uso)
        const firstDate = resT.data?.length ? resT.data.reduce((min, p) => p.created_at < min ? p.created_at : min, resT.data[0].created_at) : new Date();
        const startMonth = new Date(firstDate).getMonth() + 1;
        const startYear = new Date(firstDate).getFullYear();
        
        // Quantos meses o cliente já "viveu" no app antes deste mês alvo?
        const diffMonths = (targetYear - startYear) * 12 + (targetMonth - startMonth);

        if (diffMonths > 0) {
            resR.data?.forEach(r => {
                const val = Number(r.value || 0) * diffMonths; // Multiplica o gasto fixo pelos meses passados
                if (r.type === 'expense') pastBalance -= val;
                else pastBalance += val;
            });
            resI.data?.forEach(i => {
                pastBalance -= (Number(i.value_per_month || 0) * diffMonths);
            });
        }

        // 2. CÁLCULO DO MÊS ATUAL (IGUAL AO ANTERIOR)
        resT.data?.filter(t => {
            const [d, m, y] = t.date.split('/').map(Number);
            return y === targetYear && m === targetMonth;
        }).forEach(t => {
            const amount = Number(t.amount || 0);
            if (t.type === 'income') currentIncome += amount;
            else {
                currentExpense += amount;
                categories[t.category || 'Outros'] = (categories[t.category || 'Outros'] || 0) + amount;
            }
        });

        resR.data?.forEach(r => {
            const val = Number(r.value || 0);
            if (r.type === 'expense') {
                currentExpense += val;
                categories[r.category || 'Fixas'] = (categories[r.category || 'Fixas'] || 0) + val;
            } else {
                currentIncome += val;
            }
        });

        resI.data?.forEach(i => {
            const val = Number(i.value_per_month || 0);
            currentExpense += val;
            categories['Cartão/Parcelas'] = (categories['Cartão/Parcelas'] || 0) + val;
        });

        const totalAvailable = pastBalance + currentIncome;
        const finalBalance = totalAvailable - currentExpense;

        // Formata as categorias para o prompt
        const categoriesList = Object.entries(categories)
            .sort((a, b) => b[1] - a[1])
            .map(([cat, val]) => `${cat}: R$ ${val.toFixed(2)}`)
            .join('\n');

        // 5. PROMPT BLINDADO (IA NÃO PODE CALCULAR)
        const promptText = `
Você é um consultor financeiro de elite da plataforma "Meu Aliado".
Analise os resultados do cliente ${clientName}. 

VALORES REAIS (NÃO ALTERE ESTES NÚMEROS):
- Saldo Acumulado (Meses anteriores): R$ ${pastBalance.toFixed(2)}
- Receitas deste mês: R$ ${currentIncome.toFixed(2)}
- Despesas deste mês: R$ ${currentExpense.toFixed(2)}
- Saldo Final (O que sobrou): R$ ${finalBalance.toFixed(2)}

DETALHAMENTO DE GASTOS:
${categoriesList}

Gere um diagnóstico profissional em Markdown. 
ATENÇÃO: Use APENAS os números fornecidos acima. Se o saldo acumulado for negativo, alerte o cliente. Se as despesas forem maiores que a receita do mês, sugira cortes.
        `;

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });
        const result = await model.generateContent(promptText);
        
        return NextResponse.json({ report: result.response.text() });

    } catch (error) {
        return NextResponse.json({ error: "Erro na geração" }, { status: 500 });
    }
}