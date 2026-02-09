import React from 'react';
import { 
    Wallet, TrendingUp, TrendingDown, Target, CreditCard, CalendarDays, 
    AlertTriangle, PieChart, ArrowUpRight, ArrowDownLeft 
} from 'lucide-react';

interface BentoViewProps {
  currentMonthData: any;
  transactions: any[];
  installments: any[];
  recurring: any[];
  // Funções de Navegação
  onOpenCalendar: () => void;
  onOpenRollover: () => void;
}

export default function BentoView({ 
  currentMonthData, 
  transactions, 
  installments, 
  recurring,
  onOpenCalendar, 
  onOpenRollover
}: BentoViewProps) {
  
  // Dados Básicos
  const { income: renda, expenseTotal, balance } = currentMonthData;
  const savingsRate = renda > 0 ? ((balance / renda) * 100).toFixed(0) : 0;
  
  // Filtra as próximas contas a vencer (Expense + !Paid + !Delayed)
  const today = new Date().getDate();
  const upcomingBills = [...transactions, ...recurring, ...installments]
    .filter(t => {
        // Normaliza
        const isExpense = t.type === 'expense' || t.value_per_month; 
        const isPaid = t.is_paid || (t.paid_months?.includes && false); // Lógica simples
        const day = parseInt(t.date?.split('/')[0] || t.due_day || '30');
        
        return isExpense && !isPaid && t.status !== 'delayed' && day >= today;
    })
    .map(t => ({
        title: t.title,
        day: parseInt(t.date?.split('/')[0] || t.due_day || '30'),
        amount: t.amount || t.value || t.value_per_month,
        category: t.category || (t.installments_count ? 'Parcela' : 'Fixa')
    }))
    .sort((a, b) => a.day - b.day)
    .slice(0, 4); // Pega só as top 4

  // Soma total de parcelas ativas (Dívida Futura)
  const totalInstallmentsValue = installments.reduce((acc, curr) => acc + (curr.value_per_month * (curr.installments_count - curr.current_installment)), 0);
  
  // Categoria Vilã (Maior Gasto)
  const categories = transactions.filter(t => t.type === 'expense').reduce((acc:any, t) => {
    acc[t.category] = (acc[t.category] || 0) + t.amount;
    return acc;
  }, {});
  const topCategory = Object.keys(categories).sort((a,b) => categories[b] - categories[a])[0];

  // Verifica se tem atrasados para mostrar o alerta
  const hasDelayed = [...transactions, ...installments, ...recurring].some(t => t.status === 'delayed');

  return (
    <div className="max-w-7xl mx-auto py-6 animate-in zoom-in-95 duration-500 px-4">
      
      <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-3 gap-4 h-full md:h-[650px]">
        
        {/* 1. CARD PRINCIPAL (SALDO) */}
        <div className="col-span-1 md:col-span-2 md:row-span-2 bg-[#080808] border border-gray-800 p-8 rounded-[32px] flex flex-col justify-between relative overflow-hidden group hover:border-gray-700 transition">
          <div className="flex justify-between items-start z-10">
            <div>
                <h3 className="text-gray-400 font-medium flex items-center gap-2 mb-1"><Wallet size={18} className="text-cyan-500"/> Fluxo Líquido</h3>
                <h1 className={`text-5xl md:text-6xl font-black tracking-tighter ${balance >= 0 ? 'text-white' : 'text-red-500'}`}>
                R$ {balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
                </h1>
            </div>
            <div className={`px-3 py-1 rounded-full text-xs font-bold border ${balance >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                {balance >= 0 ? 'POSITIVO' : 'NEGATIVO'}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-8 z-10">
            <div className="bg-[#111] p-4 rounded-2xl border border-gray-800">
                <div className="text-gray-500 text-xs font-bold uppercase mb-1 flex items-center gap-1"><ArrowUpRight size={12} className="text-emerald-500"/> Entrou</div>
                <div className="text-xl font-bold text-emerald-400">R$ {renda?.toLocaleString('pt-BR')}</div>
            </div>
            <div className="bg-[#111] p-4 rounded-2xl border border-gray-800">
                <div className="text-gray-500 text-xs font-bold uppercase mb-1 flex items-center gap-1"><ArrowDownLeft size={12} className="text-red-500"/> Saiu</div>
                <div className="text-xl font-bold text-red-400">R$ {expenseTotal?.toLocaleString('pt-BR')}</div>
            </div>
          </div>
          
          <div className="mt-6 z-10">
             <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Taxa de Economia</span><span>{savingsRate}%</span></div>
             <div className="w-full bg-gray-900 h-2 rounded-full overflow-hidden border border-gray-800">
                <div className={`h-full ${balance >= 0 ? 'bg-gradient-to-r from-cyan-600 to-blue-600' : 'bg-red-600'}`} style={{ width: `${Math.min(Math.abs(Number(savingsRate)), 100)}%` }}></div>
             </div>
          </div>
          <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-cyan-600/5 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-600/10 transition duration-1000"></div>
        </div>

        {/* 2. CARD PRÓXIMAS CONTAS */}
        <div className="col-span-1 md:col-span-1 md:row-span-2 bg-[#0f0f10] border border-gray-800 p-6 rounded-[32px] overflow-hidden flex flex-col justify-between">
            <div>
                <h3 className="text-gray-400 text-sm font-bold uppercase mb-4 flex items-center gap-2"><CalendarDays size={16}/> Próximos Vencimentos</h3>
                <div className="space-y-3">
                    {upcomingBills.length === 0 && <div className="text-center text-gray-600 mt-10 text-sm">Nada pendente para os próximos dias! 🎉</div>}
                    
                    {upcomingBills.map((t, idx) => (
                        <div key={idx} className="bg-black border border-gray-800 p-3 rounded-xl flex justify-between items-center group hover:border-gray-600 transition">
                            <div>
                                <div className="text-white font-bold text-sm truncate w-24 md:w-28">{t.title}</div>
                                <div className="text-[10px] text-gray-500 font-mono">Dia {t.day} • {t.category}</div>
                            </div>
                            <div className="text-right">
                                <div className="text-red-400 font-mono text-sm font-bold">R$ {t.amount}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <button 
                onClick={onOpenCalendar} // <--- AÇÃO REAL
                className="w-full mt-4 bg-gray-800 hover:bg-gray-700 hover:text-white text-gray-400 text-xs py-3 rounded-xl transition font-bold border border-gray-700 hover:border-gray-500"
            >
                Ver Agenda Completa
            </button>
        </div>

        {/* 3. CARD INSIGHT (VILÃO) */}
        <div className="col-span-1 md:col-span-1 md:row-span-1 bg-gradient-to-br from-purple-900/10 to-black border border-purple-500/20 p-6 rounded-[32px] flex flex-col justify-center relative overflow-hidden group hover:border-purple-500/40 transition">
            <div className="absolute top-0 right-0 p-3 bg-purple-500/10 rounded-bl-2xl text-purple-400"><PieChart size={18}/></div>
            <p className="text-gray-500 text-[10px] font-bold uppercase mb-1 tracking-widest">Maior Vilão</p>
            <h2 className="text-xl font-bold text-white truncate">{topCategory || "Sem gastos"}</h2>
            <p className="text-xs text-purple-400 mt-1">Categoria que mais consumiu</p>
            <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition"></div>
        </div>

        {/* 4. CARD DÍVIDA TOTAL */}
        <div className="col-span-1 md:col-span-1 md:row-span-1 bg-[#0f0f10] border border-gray-800 p-6 rounded-[32px] flex flex-col justify-between group hover:border-gray-700 transition">
             <div><h3 className="text-gray-400 text-[10px] font-bold uppercase mb-1 flex items-center gap-2 tracking-widest"><CreditCard size={14}/> Dívida Futura Total</h3><p className="text-gray-600 text-[10px]">Soma de todas parcelas a vencer</p></div>
             <div><h2 className="text-2xl font-bold text-white group-hover:text-purple-400 transition">R$ {totalInstallmentsValue.toLocaleString('pt-BR')}</h2></div>
        </div>

        {/* 5. CARD ATENÇÃO (ROLLOVER) */}
        {hasDelayed ? (
            <div className="col-span-1 md:col-span-2 md:row-span-1 bg-[#1a0505] border border-red-900/30 p-6 rounded-[32px] flex items-center justify-between animate-pulse">
                <div className="flex items-center gap-4">
                    <div className="bg-red-500/10 p-3 rounded-full text-red-500"><AlertTriangle size={24}/></div>
                    <div><h3 className="text-red-400 font-bold">Contas em Atraso</h3><p className="text-red-500/60 text-xs">Existem itens vencidos no sistema.</p></div>
                </div>
                <button 
                    onClick={onOpenRollover} // <--- AÇÃO REAL
                    className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-red-900/20 transition hover:scale-105"
                >
                    Resolver
                </button>
            </div>
        ) : (
            <div className="col-span-1 md:col-span-2 md:row-span-1 bg-[#051a05] border border-emerald-900/30 p-6 rounded-[32px] flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-emerald-500/10 p-3 rounded-full text-emerald-500"><Target size={24}/></div>
                    <div><h3 className="text-emerald-400 font-bold">Tudo em Dia</h3><p className="text-emerald-500/60 text-xs">Nenhuma conta atrasada detectada.</p></div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}