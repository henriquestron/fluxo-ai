import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface YearSelectorProps {
    selectedYear: number;
    setSelectedYear: (year: number) => void;
}

export default function YearSelector({ selectedYear, setSelectedYear }: YearSelectorProps) {
    const currentYear = new Date().getFullYear();

    return (
        <div className="flex justify-center mb-6 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-4 bg-gray-900/80 backdrop-blur-sm p-1.5 pr-4 rounded-full border border-gray-800 shadow-xl">
                <div className="flex items-center">
                    <button onClick={() => setSelectedYear(selectedYear - 1)} className="p-2 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition active:scale-95">
                        <ChevronLeft size={18} />
                    </button>
                    <span className="text-xl font-bold text-white min-w-[60px] text-center font-mono">{selectedYear}</span>
                    <button onClick={() => setSelectedYear(selectedYear + 1)} className="p-2 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition active:scale-95">
                        <ChevronRight size={18} />
                    </button>
                </div>
                {selectedYear !== currentYear && (
                    <button onClick={() => setSelectedYear(currentYear)} className="text-[10px] uppercase font-bold text-cyan-500 hover:text-cyan-400 border border-cyan-500/30 px-2 py-1 rounded-md transition">
                        Voltar p/ Hoje
                    </button>
                )}
            </div>
        </div>
    );
}