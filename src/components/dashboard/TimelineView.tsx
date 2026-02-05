import React from 'react';
import { ArrowUpRight, ArrowDownLeft, Clock, Calendar, CheckCircle2, AlertCircle, RefreshCw, CreditCard } from 'lucide-react';

interface TimelineViewProps {
  transactions: any[];
  activeTab: string;
}

export default function TimelineView({ transactions, activeTab }: TimelineViewProps) {
  // 1. Agrupa e Calcula Saldo Diário
  const groupedTransactions = transactions.reduce((groups: any, transaction: any) => {
    const date = transaction.date;
    if (!groups[date]) groups[date] = [];
    groups[date].push(transaction);
    return groups;
  }, {});

  const sortedDates = Object.keys(groupedTransactions).sort((a, b) => {
    const [dayA, monthA, yearA] = a.split('/').map(Number);
    const [dayB, monthB, yearB] = b.split('/').map(Number);
    return new Date(yearB, monthB - 1, dayB).getTime() - new Date(yearA, monthA - 1, dayA).getTime();
  });

  return (
    <div className="max-w-4xl mx-auto py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="text-center mb-12">
        <h2 className="text-3xl font-black text-white flex items-center justify-center gap-3"><Clock className="text-cyan-500" size={32} /> Linha do Tempo Financeira</h2>
        <p className="text-gray-500 mt-2">O dia a dia do seu dinheiro em {activeTab}.</p>
      </div>

      <div className="relative border-l-2 border-gray-800 ml-6 md:ml-20 space-y-16">
        {sortedDates.map((date) => {
            // Calcula o balanço do dia
            const dayTotal = groupedTransactions[date].reduce((acc: number, t: any) => 
                t.type === 'income' ? acc + t.amount : acc - t.amount, 0);

            return (
                <div key={date} className="relative pl-8 md:pl-12">
                    {/* DATA STICKY (Fica preso no topo) */}
                    <div className="absolute -left-[42px] md:-left-[60px] top-0 flex flex-col items-end w-[30px] md:w-[40px]">
                        <span className="text-2xl font-black text-white">{date.split('/')[0]}</span>
                        <span className="text-xs font-bold text-gray-600 uppercase">{activeTab}</span>
                    </div>

                    {/* BOLINHA DA DATA */}
                    <div className={`absolute -left-[9px] top-2 border-4 border-[#050505] rounded-full w-5 h-5 ${dayTotal >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                    
                    {/* RESUMO DO DIA */}
                    <div className="mb-6 flex items-center gap-4">
                        <h3 className="text-lg font-bold text-gray-300">Resumo do dia {date}</h3>
                        <span className={`text-xs px-2 py-1 rounded font-mono font-bold ${dayTotal >= 0 ? 'bg-emerald-950 text-emerald-400' : 'bg-red-950 text-red-400'}`}>
                            {dayTotal >= 0 ? '+' : ''} R$ {dayTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                        </span>
                    </div>

                    <div className="space-y-3">
                        {groupedTransactions[date].map((t: any) => (
                        <div key={t.id} className="bg-[#111] border border-gray-800 p-4 rounded-xl flex items-center justify-between hover:border-gray-600 transition group relative overflow-hidden">
                            {/* Borda lateral colorida baseada no tipo */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${t.type === 'income' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>

                            <div className="flex items-center gap-4 pl-3">
                                <div className={`p-2 rounded-lg ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                    {t.category === 'Fixa' ? <RefreshCw size={18}/> : t.type === 'income' ? <ArrowUpRight size={18} /> : <ArrowDownLeft size={18} />}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-bold text-white text-base">{t.title}</h4>
                                        {t.status === 'delayed' && <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 rounded border border-red-500/30">ATRASADO</span>}
                                        {!t.is_paid && t.type === 'expense' && t.status !== 'delayed' && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 rounded border border-yellow-500/30">PENDENTE</span>}
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                        <span className="bg-gray-800 px-1.5 py-0.5 rounded text-gray-400">{t.category}</span>
                                        {t.installments_count && <span className="flex items-center gap-1 text-purple-400"><CreditCard size={10}/> Parcela {t.current_installment || '1'}/{t.installments_count}</span>}
                                    </div>
                                </div>
                            </div>

                            <div className="text-right">
                                <div className={`font-mono font-bold text-base ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {t.type === 'income' ? '+' : '-'} R$ {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                                {t.is_paid && <div className="text-[10px] text-emerald-600 flex items-center justify-end gap-1 mt-1"><CheckCircle2 size={10}/> Pago</div>}
                            </div>
                        </div>
                        ))}
                    </div>
                </div>
            );
        })}
      </div>
    </div>
  );
}