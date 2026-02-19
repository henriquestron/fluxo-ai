import React from 'react';
import { LayoutGrid, Target, Sparkles } from 'lucide-react';

interface TabNavigationProps {
    activeSection: 'dashboard' | 'goals';
    setActiveSection: (section: 'dashboard' | 'goals') => void;
    goalsCount: number;
    onOpenAI: () => void;
}

export default function TabNavigation({ activeSection, setActiveSection, goalsCount, onOpenAI }: TabNavigationProps) {
    return (
        <div className="flex justify-center mb-8 animate-in fade-in slide-in-from-top-2">
            <div className="bg-[#0f0f0f] border border-gray-800 p-1 rounded-2xl flex items-center shadow-2xl relative z-20">
                
                {/* Botão FLUXO */}
                <button 
                    onClick={() => setActiveSection('dashboard')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                        activeSection === 'dashboard' 
                        ? 'bg-gray-800 text-white shadow-lg ring-1 ring-white/5' 
                        : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/30'
                    }`}
                >
                    <LayoutGrid size={18} className={activeSection === 'dashboard' ? 'text-cyan-500' : ''} />
                    Fluxo
                </button>

                {/* Botão METAS */}
                <button 
                    onClick={() => setActiveSection('goals')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 ${
                        activeSection === 'goals' 
                        ? 'bg-gray-800 text-white shadow-lg ring-1 ring-white/5' 
                        : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/30'
                    }`}
                >
                    <Target size={18} className={activeSection === 'goals' ? 'text-indigo-500' : ''} />
                    Metas
                    {goalsCount > 0 && (
                        <span className="ml-1 bg-gray-900 border border-gray-700 text-[10px] px-1.5 rounded-md text-gray-400">
                            {goalsCount}
                        </span>
                    )}
                </button>

                {/* Botão IA (Atalho) */}
                <button 
                    onClick={onOpenAI}
                    className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-gray-500 hover:text-purple-400 hover:bg-purple-900/10 transition-all duration-300"
                >
                    <Sparkles size={18} />
                    IA
                </button>
            </div>
        </div>
    );
}