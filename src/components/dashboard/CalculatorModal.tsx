import React, { useState, useEffect } from 'react';
import { X, Calculator, Copy, Delete, List as ListIcon, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface CalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
    transactions: any[];
    installments: any[];
    recurring: any[];
    activeTab: string;
    selectedYear: number;
}

export default function CalculatorModal({ isOpen, onClose, transactions, installments, recurring, activeTab, selectedYear }: CalculatorModalProps) {
    const [display, setDisplay] = useState('');
    const [result, setResult] = useState('0');

    useEffect(() => {
        try {
            const calc = display.replace(/,/g, '.').replace(/x/g, '*');
            if (/^[\d+\-*/.%() ]+$/.test(calc) && calc !== '') {
                const res = new Function('return ' + calc)();
                if (isFinite(res)) setResult(res.toLocaleString('pt-BR', { maximumFractionDigits: 2 }));
            } else {
                setResult(display === '' ? '0' : '...');
            }
        } catch {
            setResult('...');
        }
    }, [display]);

    if (!isOpen) return null;

    const handleButton = (value: string) => {
        if (value === 'C') { setDisplay(''); setResult('0'); } 
        else if (value === '⌫') { setDisplay(prev => prev.slice(0, -1)); } 
        else if (value === '=') { /* Calculado via useEffect */ } 
        else { setDisplay(prev => prev + value); }
    };

    const copyToClipboard = () => {
        if (result !== '0' && result !== '...') {
            navigator.clipboard.writeText(result.replace(/\./g, ''));
            toast.success("Valor copiado! Pode colar no lançamento.");
            onClose();
        }
    };

    const addValueToCalc = (amount: number) => {
        const valStr = amount.toString();
        setDisplay(prev => {
            if (prev === '') return valStr;
            if (['+', '-', '*', '/'].includes(prev.slice(-1))) return prev + valStr;
            return prev + '+' + valStr;
        });
        toast.info(`+ R$ ${amount.toFixed(2)} adicionado!`);
    };

    const buttons = ['C', '⌫', '%', '/', '7', '8', '9', '*', '4', '5', '6', '-', '1', '2', '3', '+', '0', '.', '='];

    const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const monthIndex = MONTHS.indexOf(activeTab);
    const currentTag = `${activeTab}/${selectedYear}`;
    const monthExpenses: any[] = [];

    const getStartData = (item: any) => {
        if (item.start_date && item.start_date.includes('/')) { const p = item.start_date.split('/'); return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) }; }
        if (item.date && item.date.includes('/')) { const p = item.date.split('/'); return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) }; }
        if (item.created_at) { const d = new Date(item.created_at); return { m: d.getMonth(), y: d.getFullYear() }; }
        return { m: 0, y: selectedYear };
    };

    const mapMesNums: any = { 'Jan': '/01', 'Fev': '/02', 'Mar': '/03', 'Abr': '/04', 'Mai': '/05', 'Jun': '/06', 'Jul': '/07', 'Ago': '/08', 'Set': '/09', 'Out': '/10', 'Nov': '/11', 'Dez': '/12' };
    const dateFilter = `${mapMesNums[activeTab]}/${selectedYear}`;

    transactions.forEach(t => {
        if (t.type === 'expense' && t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby') {
            monthExpenses.push({ id: `t-${t.id}`, title: t.title, amount: Number(t.amount), type: 'Avulsa' });
        }
    });

    recurring.forEach(r => {
        if (r.type === 'expense' && r.status !== 'delayed' && r.status !== 'standby' && !r.standby_months?.includes(currentTag) && !r.skipped_months?.includes(activeTab)) {
            const { m, y } = getStartData(r);
            if (selectedYear > y || (selectedYear === y && monthIndex >= m)) {
                monthExpenses.push({ id: `r-${r.id}`, title: r.title, amount: Number(r.value), type: 'Fixa' });
            }
        }
    });

    installments.forEach(i => {
        if (i.status !== 'delayed' && i.status !== 'standby' && !i.standby_months?.includes(currentTag)) {
            const { m, y } = getStartData(i);
            const monthsDiff = ((selectedYear - y) * 12) + (monthIndex - m);
            const currentInst = 1 + (i.current_installment || 0) + monthsDiff;
            if (currentInst >= 1 && currentInst <= i.installments_count) {
                monthExpenses.push({ id: `i-${i.id}`, title: `${i.title} (${currentInst}/${i.installments_count})`, amount: Number(i.value_per_month), type: 'Parcela' });
            }
        }
    });

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[500] p-2 md:p-4 animate-in fade-in zoom-in duration-200">
            {/* 🟢 CORREÇÃO: Altura travada no celular (h-[95vh]), flexível no PC (md:h-auto) */}
            <div className="bg-[#0f0f10] border border-gray-800 rounded-3xl w-full max-w-4xl shadow-2xl relative flex flex-col md:flex-row overflow-hidden h-[95vh] md:h-auto md:max-h-[90vh]">
                
                {/* LADO ESQUERDO: Lista de Gastos */}
                {/* 🟢 CORREÇÃO: No celular ocupa 35% da tela, no PC ocupa a altura toda disponível */}
                <div className="w-full md:w-1/2 border-b md:border-b-0 md:border-r border-gray-800/50 p-4 md:p-6 flex flex-col h-[35%] md:h-auto bg-gray-900/20 shrink-0">
                    <div className="flex justify-between items-center mb-2 md:mb-4 shrink-0">
                        <h3 className="text-gray-400 font-bold flex items-center gap-2 text-sm md:text-base">
                            <ListIcon size={16} className="text-cyan-500" /> Gastos de {activeTab}
                        </h3>
                        <span className="text-[10px] md:text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded-md">{monthExpenses.length} itens</span>
                    </div>
                    
                    <div className="overflow-y-auto pr-2 space-y-2 scrollbar-thin scrollbar-thumb-gray-800 h-full">
                        {monthExpenses.length === 0 ? (
                            <p className="text-xs md:text-sm text-gray-600 text-center py-4 md:py-8">Nenhum gasto neste mês.</p>
                        ) : (
                            monthExpenses.map(exp => (
                                <div key={exp.id} className="flex justify-between items-center bg-black/40 p-2 md:p-3 rounded-xl border border-gray-800/50 hover:border-gray-700 transition group">
                                    <div className="overflow-hidden pr-2">
                                        <p className="text-white text-xs md:text-sm font-medium truncate">{exp.title}</p>
                                        <p className="text-[9px] md:text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">{exp.type}</p>
                                    </div>
                                    <div className="flex items-center gap-2 md:gap-3 shrink-0">
                                        <p className="text-gray-300 font-mono text-xs md:text-sm font-bold">R$ {exp.amount.toFixed(2)}</p>
                                        <button 
                                            onClick={() => addValueToCalc(exp.amount)}
                                            className="bg-cyan-900/30 text-cyan-400 hover:bg-cyan-500 hover:text-white p-1.5 md:p-2 rounded-lg transition active:scale-95"
                                            title="Adicionar à soma"
                                        >
                                            <Plus size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* LADO DIREITO: Calculadora */}
                {/* 🟢 CORREÇÃO: No celular ocupa 65% da tela, forçando os botões a caberem */}
                <div className="w-full md:w-1/2 p-4 md:p-6 flex flex-col h-[65%] md:h-auto shrink-0">
                    <div className="flex justify-between items-center mb-3 md:mb-6 shrink-0">
                        <h3 className="text-gray-400 font-bold flex items-center gap-2 text-sm md:text-base">
                            <Calculator size={16} className="text-cyan-500" /> Calculadora
                        </h3>
                        <button onClick={onClose} className="text-gray-500 hover:text-white transition bg-gray-800 hover:bg-red-500/20 hover:text-red-500 p-1.5 rounded-full">
                            <X size={16} />
                        </button>
                    </div>

                    {/* Visor */}
                    <div className="bg-black border border-gray-800 rounded-2xl p-3 md:p-4 mb-3 md:mb-6 text-right overflow-hidden flex flex-col justify-end min-h-[70px] md:min-h-[100px] shadow-inner shrink-0">
                        <p className="text-gray-500 text-xs md:text-sm tracking-widest mb-1 truncate font-mono">{display || '0'}</p>
                        <p className="text-3xl md:text-4xl font-bold text-white truncate">{result}</p>
                    </div>

                    {/* Botões */}
                    <div className="grid grid-cols-4 gap-1.5 md:gap-2 mb-3 md:mb-4 flex-1">
                        {buttons.map((btn, index) => (
                            <button
                                key={index}
                                onClick={() => handleButton(btn)}
                                className={`
                                    py-2.5 md:py-4 rounded-xl font-bold text-base md:text-lg transition active:scale-95
                                    ${btn === '=' ? 'bg-cyan-600 text-white hover:bg-cyan-500 col-span-2' : 
                                      btn === 'C' || btn === '⌫' ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' :
                                      ['/', '*', '-', '+', '%'].includes(btn) ? 'bg-gray-800 text-cyan-400 hover:bg-gray-700' : 
                                      'bg-[#1a1a1c] text-white hover:bg-gray-800'}
                                `}
                            >
                                {btn === '⌫' ? <Delete size={18} className="mx-auto" /> : btn}
                            </button>
                        ))}
                    </div>

                    {/* Copiar */}
                    <button 
                        onClick={copyToClipboard}
                        disabled={result === '0' || result === '...'}
                        className="w-full bg-gray-900 border border-gray-800 hover:border-cyan-500/50 disabled:opacity-50 text-gray-300 py-3 md:py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition shrink-0 text-sm md:text-base"
                    >
                        <Copy size={16} /> Copiar Resultado Final
                    </button>
                </div>
            </div>
        </div>
    );
}