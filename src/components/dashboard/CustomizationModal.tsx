import React from 'react';
import { X, Layout, Palette, Check } from 'lucide-react';

interface CustomizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentLayout: string;
    currentTheme: string;
    onSelectLayout: (layout: string) => void;
    onSelectTheme: (theme: string) => void;
    userPlan: string;
}

export default function CustomizationModal({ 
    isOpen, onClose, currentLayout, currentTheme, onSelectLayout, onSelectTheme, userPlan 
}: CustomizationModalProps) {
    if (!isOpen) return null;

    const isPro = userPlan === 'pro' || userPlan === 'agent';

    const themes = [
        { id: 'default', name: 'Original Dark', bg: 'bg-[#050505]', border: 'border-gray-800' },
        { id: 'cyberpunk', name: 'Cyberpunk Neon', bg: 'bg-[#0b0014]', border: 'border-pink-500' },
        { id: 'dracula', name: 'Dracula Soft', bg: 'bg-[#282a36]', border: 'border-purple-400' },
        { id: 'nubank', name: 'Roxo Banco', bg: 'bg-[#26004d]', border: 'border-white/20' },
    ];

    const layouts = [
        { id: 'standard', name: 'Padrão (Aliado)', desc: 'Equilíbrio entre lista e gráficos.' },
        { id: 'trader', name: 'Trader / Ads', desc: 'Foco total em números e densidade.' },
        { id: 'calendar', name: 'Calendário', desc: 'Visualização por data de vencimento.' },
        { id: 'zen', name: 'Zen Minimalista', desc: 'Apenas o essencial. Sem estresse.' },
        { id: 'bento', name: 'Bento Grid', desc: 'Visualização em grade modular.' },
        { id: 'timeline', name: 'Linha do Tempo', desc: 'Visualização cronológica de transações.' },
    ];

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[250] p-4">
            <div className="bg-[#111] border border-gray-800 w-full max-w-2xl rounded-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0a0a0a]">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Palette className="text-purple-500" /> Personalização
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white"><X /></button>
                </div>

                {/* Conteúdo com Scroll */}
                <div className="p-8 overflow-y-auto space-y-8">
                    
                    {/* SEÇÃO DE TEMAS */}
                    <section>
                        <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-4">Temas de Cores</h3>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {themes.map(theme => (
                                <button 
                                    key={theme.id}
                                    onClick={() => isPro ? onSelectTheme(theme.id) : alert('Recurso exclusivo PRO 🔒')}
                                    className={`relative group rounded-xl p-3 border-2 transition-all h-24 flex flex-col justify-end ${currentTheme === theme.id ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'border-gray-800 hover:border-gray-600'} ${!isPro && 'opacity-50 grayscale'}`}
                                >
                                    <div className={`absolute inset-0 rounded-lg opacity-50 ${theme.bg}`}></div>
                                    <span className="relative z-10 text-xs font-bold text-white">{theme.name}</span>
                                    {currentTheme === theme.id && <div className="absolute top-2 right-2 bg-emerald-500 text-black rounded-full p-0.5"><Check size={10} strokeWidth={4}/></div>}
                                    {!isPro && <div className="absolute top-2 right-2 text-[10px] bg-gray-800 px-1 rounded text-gray-400">PRO</div>}
                                </button>
                            ))}
                        </div>
                    </section>

                    {/* SEÇÃO DE LAYOUTS */}
                    <section>
                        <h3 className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2"><Layout size={16}/> Estilo do Painel</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {layouts.map(layout => (
                                <button 
                                    key={layout.id}
                                    onClick={() => isPro ? onSelectLayout(layout.id) : alert('Recurso exclusivo PRO 🔒')}
                                    className={`text-left p-4 rounded-xl border transition-all ${currentLayout === layout.id ? 'bg-purple-900/20 border-purple-500' : 'bg-gray-900/50 border-gray-800 hover:bg-gray-900'} ${!isPro && 'opacity-50'}`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`font-bold ${currentLayout === layout.id ? 'text-purple-400' : 'text-white'}`}>{layout.name}</span>
                                        {!isPro && <span className="text-[10px] bg-gray-800 border border-gray-700 px-2 py-0.5 rounded text-gray-400">PRO</span>}
                                    </div>
                                    <p className="text-xs text-gray-500">{layout.desc}</p>
                                </button>
                            ))}
                        </div>
                    </section>

                </div>

                {/* Footer */}
                {!isPro && (
                    <div className="p-4 bg-gradient-to-r from-purple-900/20 to-blue-900/20 border-t border-purple-500/30 text-center">
                        <p className="text-purple-300 text-sm mb-2">Desbloqueie todos os temas e layouts agora.</p>
                        <button className="bg-white text-black font-bold px-6 py-2 rounded-full text-sm hover:bg-gray-200 transition">Virar PRO</button>
                    </div>
                )}
            </div>
        </div>
    );
}