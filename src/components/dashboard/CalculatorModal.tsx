import React, { useState } from 'react';
import { X, Calculator, Copy, Delete } from 'lucide-react';
import { toast } from 'sonner';

interface CalculatorModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function CalculatorModal({ isOpen, onClose }: CalculatorModalProps) {
    const [display, setDisplay] = useState('');
    const [result, setResult] = useState('0');

    if (!isOpen) return null;

    const handleButton = (value: string) => {
        if (value === 'C') {
            setDisplay('');
            setResult('0');
        } else if (value === '⌫') {
            setDisplay(prev => prev.slice(0, -1));
        } else if (value === '=') {
            try {
                // Segurança: Só aceita números e operadores matemáticos
                const calc = display.replace(/,/g, '.').replace(/x/g, '*');
                if (/^[\d+\-*/.%() ]+$/.test(calc)) {
                    // Usa o Function para avaliar a string de forma segura (melhor que eval)
                    const res = new Function('return ' + calc)();
                    
                    // Verifica se o resultado é válido
                    if (isFinite(res)) {
                        setResult(res.toLocaleString('pt-BR', { maximumFractionDigits: 2 }));
                    } else {
                        setResult('Erro');
                    }
                } else {
                    setResult('Erro');
                }
            } catch (e) {
                setResult('Erro');
            }
        } else {
            setDisplay(prev => prev + value);
        }
    };

    const copyToClipboard = () => {
        if (result !== '0' && result !== 'Erro') {
            // Copia apenas os números e a vírgula
            navigator.clipboard.writeText(result.replace(/\./g, ''));
            toast.success("Valor copiado! Pode colar no lançamento.");
            onClose(); // Fecha a calculadora para facilitar
        }
    };

    const buttons = [
        'C', '⌫', '%', '/',
        '7', '8', '9', '*',
        '4', '5', '6', '-',
        '1', '2', '3', '+',
        '0', '.', '=', 
    ];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[500] p-4 animate-in fade-in zoom-in duration-200">
            <div className="bg-[#0f0f10] border border-gray-800 p-6 rounded-3xl w-full max-w-xs shadow-2xl relative">
                
                {/* Header */}
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-gray-400 font-bold flex items-center gap-2">
                        <Calculator size={18} className="text-cyan-500" /> Calculadora
                    </h3>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition">
                        <X size={20} />
                    </button>
                </div>

                {/* Visor */}
                <div className="bg-black border border-gray-800 rounded-2xl p-4 mb-4 text-right overflow-hidden flex flex-col justify-end min-h-[100px]">
                    <p className="text-gray-500 text-sm tracking-widest mb-1 truncate">{display || '0'}</p>
                    <p className="text-3xl font-bold text-white truncate">{result}</p>
                </div>

                {/* Botões */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                    {buttons.map((btn, index) => (
                        <button
                            key={index}
                            onClick={() => handleButton(btn)}
                            className={`
                                py-4 rounded-xl font-bold text-lg transition active:scale-95
                                ${btn === '=' ? 'bg-cyan-600 text-white hover:bg-cyan-500 col-span-2' : 
                                  btn === 'C' || btn === '⌫' ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20' :
                                  ['/', '*', '-', '+', '%'].includes(btn) ? 'bg-gray-800 text-cyan-400 hover:bg-gray-700' : 
                                  'bg-[#1a1a1c] text-white hover:bg-gray-800'}
                            `}
                        >
                            {btn === '⌫' ? <Delete size={20} className="mx-auto" /> : btn}
                        </button>
                    ))}
                </div>

                {/* Botão de Copiar */}
                <button 
                    onClick={copyToClipboard}
                    disabled={result === '0' || result === 'Erro'}
                    className="w-full bg-gray-900 border border-gray-800 hover:border-cyan-500/50 disabled:opacity-50 text-gray-300 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition"
                >
                    <Copy size={16} /> Copiar Valor
                </button>
            </div>
        </div>
    );
}