import React, { useState, useEffect } from 'react';
import { Leaf, TrendingUp, TrendingDown, Sun, ChevronLeft, ChevronRight, Wind } from 'lucide-react';

interface ZenViewProps {
    currentMonthData: any;
    displayBalance: number;
    activeTab: string;
    months: string[];
    setActiveTab: (month: string) => void;
    selectedYear: number;
}

export default function ZenView({ currentMonthData, displayBalance, activeTab, months, setActiveTab, selectedYear }: ZenViewProps) {
    
    // Frases motivacionais aleatórias
    const [quote, setQuote] = useState("");
    
    useEffect(() => {
        const quotes = [
            "A riqueza é a habilidade de experimentar a vida totalmente.",
            "Não é o quanto você ganha, é o quanto você guarda.",
            "Paz financeira é viver com menos do que você ganha.",
            "O melhor investimento é em você mesmo.",
            "A simplicidade é o último grau de sofisticação.",
            "O dinheiro é um excelente servo, mas um péssimo mestre.",
            "Pequenos vazamentos afundam grandes navios."
        ];
        setQuote(quotes[Math.floor(Math.random() * quotes.length)]);
    }, [activeTab, selectedYear]); // Muda a frase quando muda o mês ou ano

    // Navegação
    const currentIdx = months.indexOf(activeTab);
    const prevMonth = currentIdx > 0 ? months[currentIdx - 1] : null;
    const nextMonth = currentIdx < months.length - 1 ? months[currentIdx + 1] : null;

    // Cálculos de Saúde (Garantindo que sejam números)
    const income = Number(currentMonthData.income) || 0; 
    const expense = Number(currentMonthData.expenseTotal) || 0;
    const safeIncome = income || 1; // Evita divisão por zero
    
    const percentUsed = Math.min((expense / safeIncome) * 100, 100);
    const isDanger = expense > income;

    const fmt = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    return (
        <div className="animate-in fade-in zoom-in duration-1000 min-h-[70vh] flex flex-col items-center justify-center p-4 relative">
            
            {/* Efeitos de Fundo (Aura dinâmica baseada no saldo do ano) */}
            <div className={`absolute top-1/4 left-1/4 w-96 h-96 rounded-full blur-[128px] pointer-events-none opacity-20 transition-colors duration-1000 ${displayBalance >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>

            {/* CABEÇALHO ZEN */}
            <div className="text-center mb-8 relative z-10">
                <div className="inline-flex items-center justify-center p-4 rounded-full bg-white/5 backdrop-blur-sm mb-4 border border-white/10 animate-pulse duration-[4000ms]">
                    <Leaf className={displayBalance >= 0 ? "text-emerald-400" : "text-orange-400"} size={28} />
                </div>
                <h2 className="text-gray-500 text-xs uppercase tracking-[0.3em] font-medium mb-3">Modo Foco • {selectedYear}</h2>
                <div className="flex items-center justify-center gap-4">
                    <button onClick={() => prevMonth && setActiveTab(prevMonth)} disabled={!prevMonth} className="text-gray-600 hover:text-white disabled:opacity-0 transition"><ChevronLeft size={20}/></button>
                    <span className="text-2xl font-thin text-white">{activeTab}</span>
                    <button onClick={() => nextMonth && setActiveTab(nextMonth)} disabled={!nextMonth} className="text-gray-600 hover:text-white disabled:opacity-0 transition"><ChevronRight size={20}/></button>
                </div>
            </div>

            {/* CARD PRINCIPAL */}
            <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/5 p-8 md:p-16 rounded-[3rem] shadow-2xl flex flex-col items-center gap-10 w-full max-w-3xl relative overflow-hidden transition-all duration-500">
                
                {/* Indicador de Saldo Gigante */}
                <div className="text-center z-10">
                    <p className="text-gray-400 mb-2 font-medium text-sm tracking-wide">Saldo Líquido Disponível</p>
                    <h1 className={`text-6xl md:text-8xl font-thin tracking-tighter transition-colors duration-500 ${displayBalance >= 0 ? 'text-white' : 'text-red-400'}`}>
                        <span className="text-2xl align-top opacity-50 font-sans mr-2">R$</span>
                        {fmt(displayBalance)}
                    </h1>
                </div>

                {/* Barra de Progresso (Comprometimento mensal) */}
                <div className="w-full max-w-md space-y-2 z-10">
                    <div className="flex justify-between text-xs text-gray-500 px-1">
                        <span>Comprometido: {percentUsed.toFixed(0)}%</span>
                        <span>Meta: 100%</span>
                    </div>
                    <div className="h-2 w-full bg-gray-800 rounded-full overflow-hidden">
                        <div 
                            className={`h-full rounded-full transition-all duration-1000 ${isDanger ? 'bg-red-500' : 'bg-emerald-500'}`} 
                            style={{ width: `${percentUsed}%` }}
                        ></div>
                    </div>
                </div>

                {/* Resumo Minimalista */}
                <div className="grid grid-cols-2 gap-12 w-full max-w-sm z-10 border-t border-white/5 pt-8">
                    <div className="text-center group cursor-default">
                        <div className="flex items-center justify-center gap-2 text-gray-500 mb-1 group-hover:text-emerald-400 transition">
                            <TrendingUp size={16}/> <span className="text-xs uppercase font-bold tracking-wider">Entradas</span>
                        </div>
                        <p className="text-2xl text-gray-200 group-hover:text-white transition">{fmt(income)}</p>
                    </div>
                    <div className="text-center group cursor-default">
                        <div className="flex items-center justify-center gap-2 text-gray-500 mb-1 group-hover:text-red-400 transition">
                            <TrendingDown size={16}/> <span className="text-xs uppercase font-bold tracking-wider">Saídas</span>
                        </div>
                        <p className="text-2xl text-gray-200 group-hover:text-white transition">{fmt(expense)}</p>
                    </div>
                </div>

            </div>

            {/* Rodapé / Frase */}
            <div className="mt-12 text-center max-w-md mx-auto animate-in slide-in-from-bottom-4 duration-700 delay-200">
                <Wind className="inline-block text-gray-600 mb-3" size={16} />
                <p className="text-gray-500 italic text-sm font-light leading-relaxed">
                    "{quote}"
                </p>
            </div>
        </div>
    );
}