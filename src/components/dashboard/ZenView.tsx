import React from 'react';
import { Leaf, ArrowUpCircle, ArrowDownCircle, Wallet } from 'lucide-react';

export default function ZenView({ displayBalance, currentMonthData, activeTab, months, setActiveTab }: any) {
    const isPositive = displayBalance >= 0;
    const percentageSpent = Math.min((currentMonthData.expenseTotal / (currentMonthData.income || 1)) * 100, 100);

    return (
        <div className="animate-in fade-in duration-700 flex flex-col items-center justify-center min-h-[60vh] text-center">
            
            {/* Seletor Discreto */}
            <div className="flex gap-2 mb-12 opacity-50 hover:opacity-100 transition">
                {months.map((m: string) => (
                    <button key={m} onClick={() => setActiveTab(m)} className={`text-xs uppercase tracking-widest ${activeTab === m ? 'text-white border-b border-white' : 'text-gray-600'}`}>{m}</button>
                ))}
            </div>

            {/* O Grande Número */}
            <div className="relative mb-8">
                <div className={`absolute inset-0 blur-[100px] opacity-20 ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                <h1 className="text-gray-400 text-sm uppercase tracking-[0.2em] mb-4 flex items-center justify-center gap-2">
                    <Leaf size={16} /> Saldo Disponível
                </h1>
                <div className={`text-7xl md:text-9xl font-thin tracking-tighter ${isPositive ? 'text-white' : 'text-red-400'}`}>
                    <span className="text-2xl md:text-4xl align-top opacity-50 mr-2">R$</span>
                    {displayBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </div>
            </div>

            {/* Barra de Progresso Minimalista */}
            <div className="w-64 h-1 bg-gray-900 rounded-full mb-8 overflow-hidden">
                <div className={`h-full transition-all duration-1000 ${isPositive ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${percentageSpent}%` }}></div>
            </div>

            {/* Resumo Zen */}
            <div className="grid grid-cols-2 gap-12 md:gap-24">
                <div>
                    <p className="text-gray-600 text-xs uppercase tracking-widest mb-2 flex items-center justify-center gap-2"><ArrowUpCircle size={14}/> Entrou</p>
                    <p className="text-2xl text-gray-300 font-light">R$ {currentMonthData.income.toLocaleString('pt-BR')}</p>
                </div>
                <div>
                    <p className="text-gray-600 text-xs uppercase tracking-widest mb-2 flex items-center justify-center gap-2"><ArrowDownCircle size={14}/> Saiu</p>
                    <p className="text-2xl text-gray-300 font-light">R$ {currentMonthData.expenseTotal.toLocaleString('pt-BR')}</p>
                </div>
            </div>
        </div>
    );
}