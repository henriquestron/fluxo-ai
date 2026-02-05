import React from 'react';
import { Wallet, TrendingUp, TrendingDown, Target, CreditCard, CalendarDays, AlertTriangle, PieChart } from 'lucide-react';

interface BentoViewProps {
  currentMonthData: any;
  transactions: any[];
  installments: any[];
  recurring: any[];
  // NOVAS FUNÇÕES (CHAVES) 👇
  onOpenCalendar: () => void;
  onOpenRollover: () => void;
}

export default function BentoView({ 
  currentMonthData, 
  transactions, 
  installments, 
  recurring,
  onOpenCalendar, // Recebendo a função
  onOpenRollover  // Recebendo a função
}: BentoViewProps) {
  
  // (Mapeando 'income' para 'renda' igual fizemos antes)
  const { income: renda, expenseTotal, balance } = currentMonthData;
  const savingsRate = renda > 0 ? ((balance / renda) * 100).toFixed(0) : 0;
  
  // Próximas contas (Filtra o que vence num futuro próximo)
  const upcomingBills = [...transactions, ...recurring]
    .filter(t => t.type === 'expense' && !t.is_paid && t.status !== 'delayed')
    .sort((a, b) => {
        const dayA = parseInt(a.date?.split('/')[0] || a.due_day || '30');
        const dayB = parseInt(b.date?.split('/')[0] || b.due_day || '30');
        return dayA - dayB;
    })
    .slice(0, 4);

  const totalInstallmentsValue = installments.reduce((acc, curr) => acc + (curr.value_per_month || 0), 0);
  
  const categories = transactions.filter(t => t.type === 'expense').reduce((acc:any, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});
  const topCategory = Object.keys(categories).sort((a,b) => categories[b] - categories[a])[0];

  return (
    <div className="max-w-7xl mx-auto py-6 animate-in zoom-in-95 duration-500 px-4">
      
      <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-3 gap-4 h-full md:h-[650px]">
        
        {/* 1. CARD PRINCIPAL (SALDO) */}
        <div className="col-span-1 md:col-span-2 md:row-span-2 bg-[#080808] border border-gray-800 p-8 rounded-[32px] flex flex-col justify-between relative overflow-hidden">
          <div className="flex justify-between items-start z-10">
            <div>
                <h3 className="text-gray-400 font-medium flex items-center gap-2 mb-1"><Wallet size={18} className="text-cyan-500"/> Fluxo de Caixa Líquido</h3>
                <h1 className={`text-5xl md:text-6xl font-black tracking-tighter ${balance >= 0 ? 'text-white' : 'text-red-500'}`}>
                R$ {balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                </h1>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold border ${balance >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                {balance >= 0 ? 'NO AZUL' : 'ATENÇÃO'}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-8 z-10">
            <div className="bg-[#111] p-4 rounded-2xl border border-gray-800">
                <div className="text-gray-500 text-xs font-bold uppercase mb-1 flex items-center gap-1"><TrendingUp size={12}/> Entrou</div>
                <div className="text-xl font-bold text-emerald-400">R$ {renda?.toLocaleString('pt-BR')}</div>
            </div>
            <div className="bg-[#111] p-4 rounded-2xl border border-gray-800">
                <div className="text-gray-500 text-xs font-bold uppercase mb-1 flex items-center gap-1"><TrendingDown size={12}/> Saiu</div>
                <div className="text-xl font-bold text-red-400">R$ {expenseTotal?.toLocaleString('pt-BR')}</div>
            </div>
          </div>
          <div className="mt-6 z-10">
             <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Taxa de Economia</span><span>{savingsRate}%</span></div>
             <div className="w-full bg-gray-900 h-3 rounded-full overflow-hidden border border-gray-800">
                <div className={`h-full ${balance >= 0 ? 'bg-gradient-to-r from-cyan-600 to-blue-600' : 'bg-red-600'}`} style={{ width: `${Math.min(Math.abs(Number(savingsRate)), 100)}%` }}></div>
             </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none"></div>
        </div>

        {/* 2. CARD PRÓXIMAS CONTAS */}
        <div className="col-span-1 md:col-span-1 md:row-span-2 bg-[#0f0f10] border border-gray-800 p-6 rounded-[32px] overflow-hidden flex flex-col">
            <h3 className="text-gray-400 text-sm font-bold uppercase mb-4 flex items-center gap-2"><CalendarDays size={16}/> A Pagar</h3>
            <div className="space-y-3 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                {upcomingBills.length === 0 && <div className="text-center text-gray-600 mt-10">Nada pendente! 🎉</div>}
                {upcomingBills.map((t, idx) => (
                    <div key={idx} className="bg-black border border-gray-800 p-3 rounded-xl flex justify-between items-center group hover:border-gray-600 transition">
                        <div>
                            <div className="text-white font-bold text-sm truncate w-24 md:w-32">{t.title}</div>
                            <div className="text-xs text-gray-500">Vence dia {t.date?.split('/')[0] || t.due_day}</div>
                        </div>
                        <div className="text-right">
                            <div className="text-red-400 font-mono text-sm font-bold">R$ {t.amount || t.value}</div>
                            {t.category === 'Fixa' && <span className="text-[9px] bg-blue-900/30 text-blue-400 px-1 rounded">FIXO</span>}
                        </div>
                    </div>
                ))}
            </div>
            {/* BOTÃO FUNCIONAL 1: VAI PARA O CALENDÁRIO */}
            <button 
                onClick={onOpenCalendar}
                className="w-full mt-4 bg-gray-800 hover:bg-gray-700 hover:text-white text-gray-300 text-xs py-3 rounded-xl transition font-bold"
            >
                Ver Agenda Completa
            </button>
        </div>

        {/* 3. CARD INSIGHT */}
        <div className="col-span-1 md:col-span-1 md:row-span-1 bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/20 p-6 rounded-[32px] flex flex-col justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 bg-purple-500/10 rounded-bl-2xl text-purple-400"><PieChart size={18}/></div>
            <p className="text-gray-500 text-xs font-bold uppercase mb-1">Maior Vilão</p>
            <h2 className="text-xl font-bold text-white truncate">{topCategory || "---"}</h2>
            <p className="text-xs text-purple-400 mt-1">Categoria que mais consumiu</p>
        </div>

        {/* 4. CARD FATURA */}
        <div className="col-span-1 md:col-span-1 md:row-span-1 bg-[#0f0f10] border border-gray-800 p-6 rounded-[32px] flex flex-col justify-between group hover:border-gray-700 transition">
             <div><h3 className="text-gray-400 text-sm font-bold uppercase mb-1 flex items-center gap-2"><CreditCard size={16}/> Fatura Futura</h3><p className="text-gray-600 text-[10px]">Soma de todas as parcelas ativas</p></div>
             <div><h2 className="text-2xl font-bold text-white group-hover:text-purple-400 transition">R$ {totalInstallmentsValue.toLocaleString('pt-BR')}</h2></div>
        </div>

        {/* 5. CARD ATENÇÃO (RESOLVER) */}
        <div className="col-span-1 md:col-span-2 md:row-span-1 bg-[#1a0505] border border-red-900/30 p-6 rounded-[32px] flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="bg-red-500/10 p-3 rounded-full text-red-500"><AlertTriangle size={24}/></div>
                <div><h3 className="text-red-400 font-bold">Contas em Atraso</h3><p className="text-red-500/60 text-xs">Itens vencidos precisam de atenção</p></div>
            </div>
            {/* BOTÃO FUNCIONAL 2: ABRE O MODAL DE ATRASADOS */}
            <button 
                onClick={onOpenRollover}
                className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-red-900/20 transition hover:scale-105"
            >
                Resolver
            </button>
        </div>

      </div>
    </div>
  );
}