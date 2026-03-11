import React from 'react';
import { 
    Wallet, TrendingUp, TrendingDown, Target, CreditCard, CalendarDays, 
    AlertTriangle, PieChart, ArrowUpRight, ArrowDownLeft 
} from 'lucide-react';

import { Transaction, Installment, Recurring } from '@/types'; 

interface BentoViewProps {
    currentMonthData: any;
    
    transactions: Transaction[];
    installments: Installment[];
    recurring: Recurring[];
    
    activeTab: string;
    selectedYear: number;
    months: string[];
    
    onOpenCalendar: () => void;
    onOpenRollover: () => void;
    pastDueCount?: number;
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function BentoView({ 
  currentMonthData, 
  transactions, 
  installments, 
  recurring,
  activeTab,
  selectedYear,
  months,
  onOpenCalendar,
  pastDueCount = 0, 
  onOpenRollover
}: BentoViewProps) {
  
  // Helper Unificado de Datas
  const getStartData = (item: any) => {
    if (item.start_date && item.start_date.includes('/')) {
        const p = item.start_date.split('/'); return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) };
    }
    if (item.date && item.date.includes('/')) {
        const p = item.date.split('/'); return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) };
    }
    if (item.created_at) {
        const d = new Date(item.created_at); return { m: d.getMonth(), y: d.getFullYear() };
    }
    return { m: 0, y: selectedYear };
  };

  // 🟢 1. O MOTOR MATEMÁTICO BLINDADO (Igual ao do Excel)
  let previousSurplus = 0;
  let computedInc = 0;
  let computedExp = 0;
  let computedBalance = 0;

  const activeMonthIdx = MONTHS.indexOf(activeTab);

  // Calcula desde Janeiro até o mês atual para arrastar o saldo corretamente
  for (let idx = 0; idx <= activeMonthIdx; idx++) {
      const month = MONTHS[idx];
      const mCode = (idx + 1).toString().padStart(2, '0');
      const dateFilter = `/${mCode}/${selectedYear}`;
      const paymentTag = `${month}/${selectedYear}`;

      const inc = (transactions.filter(t => t.type === 'income' && t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby').reduce((acc, i) => acc + Number(i.amount), 0)) +
                  (recurring.filter(r => {
                      const { m: sM, y: sY } = getStartData(r);
                      const paid = r.paid_months?.includes(paymentTag) || r.paid_months?.includes(month);
                      if ((r.status === 'delayed' || r.status === 'standby' || r.standby_months?.includes(paymentTag)) && !paid) return false;
                      return r.type === 'income' && (selectedYear > sY || (selectedYear === sY && idx >= sM)) && !r.skipped_months?.includes(month);
                  }).reduce((acc, i) => acc + Number(i.value), 0));

      const exp = (transactions.filter(t => t.type === 'expense' && t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby').reduce((acc, i) => acc + Number(i.amount), 0)) +
                  (recurring.filter(r => {
                      const { m: sM, y: sY } = getStartData(r);
                      const paid = r.paid_months?.includes(paymentTag) || r.paid_months?.includes(month);
                      if ((r.status === 'delayed' || r.status === 'standby' || r.standby_months?.includes(paymentTag)) && !paid) return false;
                      return r.type === 'expense' && (selectedYear > sY || (selectedYear === sY && idx >= sM)) && !r.skipped_months?.includes(month);
                  }).reduce((acc, i) => acc + Number(i.value), 0)) +
                  (installments.reduce((acc, i) => {
                      const paid = i.paid_months?.includes(paymentTag) || i.paid_months?.includes(month);
                      if ((i.status === 'delayed' || i.status === 'standby' || i.standby_months?.includes(paymentTag)) && !paid) return acc;
                      
                      const { m: sM, y: sY } = getStartData(i);
                      const diff = ((selectedYear - sY) * 12) + (idx - sM);
                      const act = 1 + (i.current_installment || 0) + diff;
                      return (act >= 1 && act <= i.installments_count) ? acc + Number(i.value_per_month) : acc;
                  }, 0));

      const saldoMensal = inc - exp;
      const saldoAcumulado = saldoMensal + previousSurplus;

      if (idx === activeMonthIdx) {
          computedInc = inc;
          computedExp = exp;
          computedBalance = saldoAcumulado;
      }

      // 🟢 A MÁGICA: Agora ele SEMPRE arrasta o saldo (seja lucro ou dívida!)
      previousSurplus = saldoAcumulado;
  }

  // Valores Finais do Mês Atual
  const renda = computedInc;
  const expenseTotal = computedExp;
  const balance = computedBalance;
  const savingsRate = renda > 0 ? ((balance / renda) * 100).toFixed(0) : 0;
  
  const paymentTagCurrent = `${activeTab}/${selectedYear}`;

  // 2. FILTRA PRÓXIMAS CONTAS (Ajustado para lógica de Anos)
  const upcomingBills: any[] = [];

  transactions.forEach(t => {
      const dateCode = `/${(activeMonthIdx + 1).toString().padStart(2, '0')}/${selectedYear}`;
      if (t.type === 'expense' && !t.is_paid && t.status !== 'delayed' && t.status !== 'standby' && t.date?.includes(dateCode)) {
          upcomingBills.push({ title: t.title, day: parseInt(t.date.split('/')[0]), amount: Number(t.amount), category: t.category });
      }
  });

  recurring.forEach(r => {
      const { m: sM, y: sY } = getStartData(r);
      const isVisible = selectedYear > sY || (selectedYear === sY && activeMonthIdx >= sM);
      const isPaid = r.paid_months?.includes(paymentTagCurrent) || r.paid_months?.includes(activeTab);

      if (r.type === 'expense' && isVisible && !isPaid && r.status !== 'delayed' && r.status !== 'standby' && !r.skipped_months?.includes(activeTab)) {
          upcomingBills.push({ title: r.title, day: r.due_day, amount: Number(r.value), category: 'Fixa' });
      }
  });

  installments.forEach(i => {
      const { m: sM, y: sY } = getStartData(i);
      const monthsDiff = ((selectedYear - sY) * 12) + (activeMonthIdx - sM);
      const actualInst = 1 + (i.current_installment || 0) + monthsDiff;
      const isPaid = i.paid_months?.includes(paymentTagCurrent) || i.paid_months?.includes(activeTab);

      if (actualInst >= 1 && actualInst <= i.installments_count && !isPaid && i.status !== 'delayed' && i.status !== 'standby') {
          upcomingBills.push({ title: i.title, day: i.due_day, amount: Number(i.value_per_month), category: `${actualInst}/${i.installments_count}` });
      }
  });

  const sortedUpcoming = upcomingBills.sort((a, b) => a.day - b.day).slice(0, 4);

  // 3. CÁLCULO DÍVIDA FUTURA
  const totalInstallmentsValue = installments.reduce((acc, curr) => {
      if (curr.status === 'delayed' || curr.status === 'standby') return acc;
      const { m: sM, y: sY } = getStartData(curr);
      const monthsDiff = ((selectedYear - sY) * 12) + (activeMonthIdx - sM);
      const actualInst = 1 + (curr.current_installment || 0) + monthsDiff;
      
      const remaining = curr.installments_count - actualInst + 1;
      return remaining > 0 ? acc + (Number(curr.value_per_month) * remaining) : acc;
  }, 0);
  
  // Categoria Vilã
  const categories = transactions.filter(t => t.type === 'expense').reduce((acc:any, t) => {
    acc[t.category] = (acc[t.category] || 0) + Number(t.amount);
    return acc;
  }, {});
  const topCategory = Object.keys(categories).sort((a,b) => categories[b] - categories[a])[0];

  // 🟢 4. A VERDADEIRA VERIFICAÇÃO DE ATRASOS
  // Agora ele só acende o alerta vermelho se a conta REALMENTE estiver com status de atrasada no banco!
  // 🟢 Só acende o botão vermelho se os dados principais informarem que há pendência real
  // 🟢 4. A VERDADEIRA VERIFICAÇÃO DE ATRASOS
  // Agora ele só acende se a lista do page.tsx realmente tiver contas!
  const hasDelayed = pastDueCount > 0;
  return (
    <div className="max-w-7xl mx-auto py-6 animate-in zoom-in-95 duration-500 px-4">
      
      <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-3 gap-5 min-h-[600px] h-auto">
        
        {/* 1. CARD PRINCIPAL (SALDO) */}
        <div className="col-span-1 md:col-span-2 md:row-span-2 bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-gray-800 p-8 rounded-[32px] flex flex-col justify-between relative overflow-hidden group hover:border-gray-700 transition duration-500 shadow-2xl">
          <div className="flex justify-between items-start z-10">
            <div>
                <h3 className="text-gray-400 font-bold flex items-center gap-2 mb-2 uppercase tracking-widest text-xs">
                    <Wallet size={16} className="text-cyan-500"/> Fluxo Líquido • {activeTab}
                </h3>
                <h1 className={`text-5xl sm:text-6xl lg:text-7xl font-black tracking-tighter ${balance >= 0 ? 'text-white' : 'text-red-500'}`}>
                    R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </h1>
            </div>
            <div className={`px-4 py-1.5 rounded-full text-[10px] font-black tracking-widest uppercase border shadow-lg ${balance >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-900/20' : 'bg-red-500/10 text-red-400 border-red-500/20 shadow-red-900/20'}`}>
                {balance >= 0 ? 'POSITIVO' : 'NEGATIVO'}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-8 z-10">
            <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/5 hover:bg-white/10 transition">
                <div className="text-gray-500 text-[10px] font-bold uppercase mb-2 flex items-center gap-1.5"><ArrowUpRight size={14} className="text-emerald-500"/> Entrou</div>
                <div className="text-2xl font-black text-emerald-400 truncate">R$ {renda.toLocaleString('pt-BR')}</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-5 rounded-2xl border border-white/5 hover:bg-white/10 transition">
                <div className="text-gray-500 text-[10px] font-bold uppercase mb-2 flex items-center gap-1.5"><ArrowDownLeft size={14} className="text-red-500"/> Saiu</div>
                <div className="text-2xl font-black text-red-400 truncate">R$ {expenseTotal.toLocaleString('pt-BR')}</div>
            </div>
          </div>
          
          <div className="mt-8 z-10 bg-black/40 p-4 rounded-2xl border border-white/5">
             <div className="flex justify-between text-xs text-gray-400 font-bold mb-2 uppercase tracking-wide">
                 <span>Taxa de Economia</span>
                 <span className={Number(savingsRate) >= 0 ? 'text-cyan-400' : 'text-red-400'}>{savingsRate}%</span>
             </div>
             <div className="w-full bg-gray-900 h-2.5 rounded-full overflow-hidden border border-gray-800">
                <div className={`h-full transition-all duration-1000 ${balance >= 0 ? 'bg-gradient-to-r from-cyan-600 to-blue-500 shadow-[0_0_10px_rgba(8,145,178,0.5)]' : 'bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.5)]'}`} style={{ width: `${Math.min(Math.abs(Number(savingsRate)), 100)}%` }}></div>
             </div>
          </div>
          <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none group-hover:bg-cyan-600/20 transition duration-1000"></div>
        </div>

        {/* 2. CARD PRÓXIMAS CONTAS */}
        <div className="col-span-1 md:col-span-1 md:row-span-2 bg-[#0a0a0a] border border-gray-800 p-6 rounded-[32px] overflow-hidden flex flex-col justify-between shadow-2xl">
            <div>
                <h3 className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-6 flex items-center gap-2"><CalendarDays size={16} className="text-orange-500"/> Próximos Vencimentos</h3>
                <div className="space-y-3">
                    {sortedUpcoming.length === 0 && (
                        <div className="text-center flex flex-col items-center justify-center mt-12 opacity-50">
                            <Target size={32} className="text-emerald-500 mb-3" />
                            <p className="text-sm text-gray-400 font-bold">Nada pendente! 🎉</p>
                        </div>
                    )}
                    
                    {sortedUpcoming.map((t, idx) => (
                        <div key={idx} className="bg-[#111] border border-gray-800/80 p-3.5 rounded-xl flex justify-between items-center group hover:border-gray-600 hover:bg-white/5 transition duration-300">
                            <div className="flex-1 min-w-0 pr-3">
                                <div className="text-white font-bold text-sm truncate">{t.title}</div>
                                <div className="text-[10px] text-gray-500 font-mono mt-0.5">Dia {t.day} • {t.category}</div>
                            </div>
                            <div className="text-right shrink-0">
                                <div className="text-red-400 font-mono text-sm font-bold">R$ {t.amount.toLocaleString('pt-BR')}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            
            <button 
                onClick={onOpenCalendar}
                className="w-full mt-6 bg-transparent hover:bg-gray-800 text-gray-400 hover:text-white text-xs py-3.5 rounded-xl transition duration-300 font-bold border border-gray-700/50 hover:border-gray-500"
            >
                Abrir Agenda Completa
            </button>
        </div>

        {/* 3. CARD INSIGHT (VILÃO) */}
        <div className="col-span-1 md:col-span-1 md:row-span-1 bg-gradient-to-br from-[#1a0b1f] to-black border border-purple-500/20 p-6 rounded-[32px] flex flex-col justify-center relative overflow-hidden group hover:border-purple-500/40 transition duration-500 shadow-2xl">
            <div className="absolute top-0 right-0 p-4 bg-purple-500/10 rounded-bl-[32px] text-purple-400 group-hover:bg-purple-500/20 transition"><PieChart size={20}/></div>
            <p className="text-gray-500 text-[10px] font-bold uppercase mb-2 tracking-widest flex items-center gap-2">Maior Vilão</p>
            <h2 className="text-2xl font-black text-white truncate pr-6">{topCategory || "Sem gastos"}</h2>
            <p className="text-xs text-purple-400/80 mt-1 font-medium">Categoria com maior custo</p>
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl group-hover:bg-purple-500/20 transition duration-1000"></div>
        </div>

        {/* 4. CARD DÍVIDA TOTAL */}
        <div className="col-span-1 md:col-span-1 md:row-span-1 bg-gradient-to-br from-[#111] to-black border border-gray-800 p-6 rounded-[32px] flex flex-col justify-between group hover:border-gray-700 transition duration-500 shadow-2xl">
             <div>
                 <h3 className="text-gray-400 text-[10px] font-bold uppercase mb-1 tracking-widest flex items-center gap-2"><CreditCard size={14} className="text-gray-500"/> Dívida Futura Total</h3>
                 <p className="text-gray-600 text-[10px] font-medium">Soma de parcelas a vencer</p>
             </div>
             <div>
                 <h2 className="text-3xl font-black text-white group-hover:text-cyan-400 transition duration-300 truncate">R$ {totalInstallmentsValue.toLocaleString('pt-BR')}</h2>
             </div>
        </div>

        {/* 5. CARD ATENÇÃO (ROLLOVER) */}
        {hasDelayed ? (
            <div className="col-span-1 md:col-span-4 md:row-span-1 bg-gradient-to-r from-[#2a0808] to-[#110000] border border-red-900/50 p-6 md:px-10 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6 shadow-2xl shadow-red-900/10">
                <div className="flex items-center gap-5 w-full md:w-auto">
                    <div className="bg-red-500/20 p-4 rounded-2xl text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse shrink-0">
                        <AlertTriangle size={28}/>
                    </div>
                    <div>
                        <h3 className="text-red-400 font-black text-xl mb-1">Atenção Necessária</h3>
                        <p className="text-red-500/80 text-sm font-medium">Existem itens em atraso precisando da sua ação.</p>
                    </div>
                </div>
                <button 
                    onClick={onOpenRollover}
                    className="w-full md:w-auto bg-red-600 hover:bg-red-500 text-white px-10 py-4 rounded-2xl text-sm font-black uppercase tracking-widest shadow-lg shadow-red-900/40 transition duration-300 hover:scale-[1.02] active:scale-95 shrink-0"
                >
                    Resolver Agora
                </button>
            </div>
        ) : (
            <div className="col-span-1 md:col-span-4 md:row-span-1 bg-gradient-to-r from-[#051a0d] to-[#020a05] border border-emerald-900/40 p-6 md:px-10 rounded-[32px] flex items-center justify-between shadow-2xl">
                <div className="flex items-center gap-5">
                    <div className="bg-emerald-500/20 p-4 rounded-2xl text-emerald-500 shrink-0">
                        <Target size={28}/>
                    </div>
                    <div>
                        <h3 className="text-emerald-400 font-black text-xl mb-1">Painel Limpo</h3>
                        <p className="text-emerald-500/80 text-sm font-medium">Nenhuma conta atrasada detectada. Tudo sob controle!</p>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
}