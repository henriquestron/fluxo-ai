import React from 'react';
import { Leaf, TrendingUp, TrendingDown, Sun } from 'lucide-react';

export default function ZenView({ currentMonthData, transactions, previousSurplus, activeTab }: any) {
    const displayBalance = currentMonthData.balance + previousSurplus;
    
    // Frases motivacionais aleatórias
    const quotes = [
        "A riqueza é a habilidade de experimentar a vida totalmente.",
        "Não é o quanto você ganha, é o quanto você guarda.",
        "Paz financeira é viver com menos do que você ganha.",
        "O melhor investimento é em você mesmo."
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];

    return (
        <div className="animate-in fade-in duration-1000 min-h-[60vh] flex flex-col items-center justify-center p-4">
            
            {/* CABEÇALHO ZEN */}
            <div className="text-center mb-10">
                <div className="inline-block p-4 rounded-full bg-emerald-900/10 mb-4 animate-bounce duration-[3000ms]">
                    <Leaf className="text-emerald-500" size={32} />
                </div>
                <h2 className="text-gray-400 text-sm uppercase tracking-[0.2em] mb-2">Modo Zen</h2>
                <p className="text-gray-500 italic max-w-md mx-auto text-xs md:text-sm">"{randomQuote}"</p>
            </div>

            {/* CARD PRINCIPAL (FLEX COL NO MOBILE, ROW NO DESKTOP) */}
            <div className="bg-[#0f1219] border border-gray-800 p-8 md:p-12 rounded-[3rem] shadow-2xl shadow-emerald-900/10 flex flex-col md:flex-row items-center gap-8 md:gap-16 w-full max-w-4xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none"></div>

                {/* Coluna 1: O Número Importante */}
                <div className="text-center md:text-left z-10">
                    <p className="text-gray-500 mb-2 font-medium">Livre para Gastar em {activeTab}</p>
                    <h1 className={`text-5xl md:text-7xl font-thin tracking-tighter ${displayBalance >= 0 ? 'text-white' : 'text-red-400'}`}>
                        R$ {displayBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h1>
                    {previousSurplus > 0 && <p className="text-emerald-500 text-xs mt-2 bg-emerald-900/20 inline-block px-3 py-1 rounded-full">+ R$ {previousSurplus.toFixed(2)} acumulado</p>}
                </div>

                {/* Divisor Visual */}
                <div className="w-full h-px md:w-px md:h-32 bg-gray-800"></div>

                {/* Coluna 2: Resumo Minimalista */}
                <div className="space-y-6 w-full md:w-auto z-10">
                    <div className="flex items-center justify-between md:justify-start gap-4">
                        <div className="p-3 bg-emerald-900/20 rounded-2xl text-emerald-400"><TrendingUp size={20}/></div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Entradas</p>
                            <p className="text-xl text-emerald-400">R$ {currentMonthData.income.toFixed(2)}</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between md:justify-start gap-4">
                        <div className="p-3 bg-red-900/20 rounded-2xl text-red-400"><TrendingDown size={20}/></div>
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold">Saídas</p>
                            <p className="text-xl text-red-400">R$ {currentMonthData.expenseTotal.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Rodapé */}
            <div className="mt-12 flex items-center gap-2 text-gray-600 text-xs">
                <Sun size={14} />
                <span>Respire fundo. Você está no controle.</span>
            </div>
        </div>
    );
}