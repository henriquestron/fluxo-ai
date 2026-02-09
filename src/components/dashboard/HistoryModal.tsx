import React, { useMemo, useState } from 'react';
import { X, TrendingUp, Calendar, ArrowUpCircle, ArrowDownCircle, Wallet } from 'lucide-react';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

interface HistoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactions: any[];
    installments: any[];
    recurring: any[];
}

export default function HistoryModal({ isOpen, onClose, transactions, installments, recurring }: HistoryModalProps) {
    // Estado para controlar qual barra está ativa
    const [activeIndex, setActiveIndex] = useState<number | null>(null);

    // --- CÁLCULO DE DADOS ---
    const chartData = useMemo(() => {
        let accumulatedBalance = 0;

        return MONTHS.map((month) => {
            const monthIndex = MONTHS.indexOf(month);
            const monthMap: Record<string, string> = { 'Jan': '/01', 'Fev': '/02', 'Mar': '/03', 'Abr': '/04', 'Mai': '/05', 'Jun': '/06', 'Jul': '/07', 'Ago': '/08', 'Set': '/09', 'Out': '/10', 'Nov': '/11', 'Dez': '/12' };
            const dateFilter = monthMap[month];

            const isRecurringActive = (rec: any) => {
                if (!rec.start_date) return true;
                const startMonthIndex = parseInt(rec.start_date.split('/')[1]) - 1;
                return monthIndex >= startMonthIndex;
            };

            const incomeFixed = recurring.filter(r => r.type === 'income' && isRecurringActive(r) && !r.skipped_months?.includes(month)).reduce((acc, curr) => acc + curr.value, 0);
            const incomeVariable = transactions.filter(t => t.type === 'income' && t.date?.includes(dateFilter) && t.status !== 'delayed').reduce((acc, curr) => acc + curr.amount, 0);

            const expenseVariable = transactions.filter(t => t.type === 'expense' && t.date?.includes(dateFilter) && t.status !== 'delayed').reduce((acc, curr) => acc + curr.amount, 0);
            const expenseFixed = recurring.filter(r => r.type === 'expense' && isRecurringActive(r) && !r.skipped_months?.includes(month) && r.status !== 'delayed').reduce((acc, curr) => acc + curr.value, 0);

            const expenseInstallments = installments.reduce((acc, curr) => {
                if (curr.status === 'delayed') return acc;
                const offset = monthIndex; 
                const projectedInstallment = curr.current_installment + offset;
                if (projectedInstallment >= 1 && projectedInstallment <= curr.installments_count) {
                    return acc + curr.value_per_month;
                }
                return acc;
            }, 0);

            const totalIncome = incomeFixed + incomeVariable;
            const totalExpense = expenseVariable + expenseFixed + expenseInstallments;
            const monthlyResult = totalIncome - totalExpense;
            
            accumulatedBalance += monthlyResult;

            return { month, income: totalIncome, expense: totalExpense, result: monthlyResult, accumulated: accumulatedBalance };
        });
    }, [transactions, installments, recurring]);

    const maxValue = Math.max(...chartData.map(d => Math.max(d.income, d.expense)));

    // Dados do mês selecionado (para o painel mobile)
    const activeData = activeIndex !== null ? chartData[activeIndex] : null;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[200] p-0 md:p-4 overflow-hidden">
            <div className="w-full max-w-6xl bg-[#0a0a0a] border-0 md:border border-gray-800 rounded-none md:rounded-3xl flex flex-col h-full md:max-h-[90vh]">
                
                {/* HEADER */}
                <div className="p-4 md:p-6 border-b border-gray-800 flex justify-between items-center bg-[#111]">
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2"><TrendingUp className="text-cyan-500"/> Histórico Anual</h2>
                        <p className="text-gray-500 text-xs md:text-sm hidden md:block">Análise da sua evolução financeira mês a mês.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition bg-gray-800 p-2 rounded-full"><X size={24}/></button>
                </div>

                {/* --- PAINEL DE DETALHES MOBILE (FIXO NO TOPO) --- */}
                {/* Só aparece em telas pequenas (md:hidden) */}
                <div className="md:hidden bg-gray-900 border-b border-gray-800 p-4 shrink-0 transition-all duration-300">
                    {activeData ? (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-white font-bold text-lg uppercase bg-gray-800 px-3 py-1 rounded-lg border border-gray-700">{activeData.month}</span>
                                <span className={`text-lg font-mono font-bold ${activeData.result >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                    {activeData.result >= 0 ? '+' : ''} {activeData.result.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-emerald-900/10 border border-emerald-900/30 p-2 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-emerald-500 text-xs"><ArrowUpCircle size={14}/> Entrou</div>
                                    <span className="text-emerald-400 font-bold text-xs">{activeData.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                                <div className="bg-red-900/10 border border-red-900/30 p-2 rounded-lg flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-red-500 text-xs"><ArrowDownCircle size={14}/> Saiu</div>
                                    <span className="text-red-400 font-bold text-xs">{activeData.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-2 text-gray-500 gap-2 opacity-50">
                            <TrendingUp size={24} />
                            <p className="text-xs">Toque em uma barra abaixo para ver os valores</p>
                        </div>
                    )}
                </div>

                {/* CORPO - GRÁFICO (COM SCROLL) */}
                <div className="flex-1 overflow-y-hidden overflow-x-auto relative bg-[#0a0a0a]">
                    <div className="h-full min-h-[300px] p-4 md:p-10 min-w-[800px] flex items-end justify-between gap-2 md:gap-4 relative pb-8 md:pt-35" onClick={() => setActiveIndex(null)}>
                        
                        {/* Linhas de Grade */}
                        <div className="absolute inset-0 flex flex-col justify-end pointer-events-none opacity-20 pb-8 px-4 md:px-10">
                            <div className="border-t border-gray-500 w-full mb-[20%]"></div>
                            <div className="border-t border-gray-500 w-full mb-[20%]"></div>
                            <div className="border-t border-gray-500 w-full mb-[20%]"></div>
                            <div className="border-t border-gray-500 w-full mb-[20%]"></div>
                        </div>

                        {chartData.map((data, idx) => {
                            const incomeHeight = maxValue > 0 ? (data.income / maxValue) * 100 : 0;
                            const expenseHeight = maxValue > 0 ? (data.expense / maxValue) * 100 : 0;
                            const isActive = activeIndex === idx;
                            
                            return (
                                <div 
                                    key={idx} 
                                    className="flex-1 flex flex-col justify-end items-center gap-1 group relative h-full z-10 cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setActiveIndex(isActive ? null : idx);
                                    }}
                                    onMouseEnter={() => setActiveIndex(idx)}
                                >
                                    
                                    {/* TOOLTIP FLUTUANTE (SÓ DESKTOP - HIDDEN NO MOBILE) */}
                                    <div className={`hidden md:block absolute bottom-full mb-3 transition-all duration-200 pointer-events-none bg-[#1a1a1a] border border-gray-600 p-3 rounded-xl shadow-2xl z-50 w-48 text-center left-1/2 -translate-x-1/2 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                                        <p className="text-white font-bold mb-2 border-b border-gray-700 pb-1">{data.month}</p>
                                        <div className="flex justify-between text-xs text-emerald-400 mb-1">
                                            <span>Entrou:</span> <span>{data.income.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                        </div>
                                        <div className="flex justify-between text-xs text-red-400 mb-1">
                                            <span>Saiu:</span> <span>{data.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                        </div>
                                        <div className={`flex justify-between text-xs font-bold pt-1 border-t border-gray-700 ${data.result >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                                            <span>Saldo:</span> <span>{data.result.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                        </div>
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-[#1a1a1a]"></div>
                                    </div>

                                    {/* BARRAS */}
                                    <div className={`flex gap-1 w-full justify-center items-end h-full transition-opacity duration-300 ${isActive ? 'opacity-100' : 'opacity-60 md:hover:opacity-90'}`}>
                                        {/* Barras ficam um pouco mais largas no mobile para facilitar o toque */}
                                        <div style={{ height: `${incomeHeight}%` }} className={`w-3 md:w-4 bg-emerald-500 rounded-t-sm ${isActive ? 'shadow-[0_0_15px_rgba(16,185,129,0.4)]' : ''}`}></div>
                                        <div style={{ height: `${expenseHeight}%` }} className={`w-3 md:w-4 bg-red-500 rounded-t-sm ${isActive ? 'shadow-[0_0_15px_rgba(239,68,68,0.4)]' : ''}`}></div>
                                    </div>

                                    {/* MÊS */}
                                    <span className={`text-[10px] md:text-xs font-bold mt-2 uppercase transition-colors ${isActive ? 'text-white scale-110' : 'text-gray-500'}`}>{data.month}</span>
                                    
                                    {/* Indicador de Seleção no Mobile (Bolinha embaixo do mês) */}
                                    {isActive && <div className="md:hidden w-1 h-1 bg-white rounded-full mt-1"></div>}
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* FOOTER - RESUMO (ESCONDIDO EM MOBILE MUITO PEQUENO PARA GANHAR ESPAÇO, OU ADAPTADO) */}
                <div className="p-4 md:p-6 bg-[#111] border-t border-gray-800 grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
                    <div className="hidden md:block bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                        <p className="text-gray-500 text-xs uppercase font-bold mb-1">Total Entradas (Ano)</p>
                        <p className="text-2xl font-mono text-emerald-400 font-bold">{chartData.reduce((acc, curr) => acc + curr.income, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                    <div className="hidden md:block bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                        <p className="text-gray-500 text-xs uppercase font-bold mb-1">Total Saídas (Ano)</p>
                        <p className="text-2xl font-mono text-red-400 font-bold">{chartData.reduce((acc, curr) => acc + curr.expense, 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                    {/* No mobile, mostramos apenas o acumulado geral no rodapé para não ocupar muito espaço */}
                    <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex justify-between items-center md:block">
                        <p className="text-gray-400 text-xs uppercase font-bold md:mb-1">Acumulado do Ano</p>
                        <p className={`text-lg md:text-2xl font-mono font-bold ${chartData[chartData.length-1].accumulated >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{chartData[chartData.length-1].accumulated.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                    </div>
                </div>

            </div>
        </div>
    );
}