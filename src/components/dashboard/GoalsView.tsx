import React from 'react';
import { Target, Plus, Edit2, Trash2, Calendar, ExternalLink, CheckSquare, Square, FileText } from 'lucide-react';
import { ICON_MAP } from '@/utils/constants';
import { Goal } from '@/types'; // (Atenção: Garanta que o tipo Goal do seu types.ts agora aceite items?: GoalItem[])

interface GoalsViewProps {
    goals: Goal[];
    setIsGoalModalOpen: (v: boolean) => void;
    setEditingGoal: (goal: Goal | null) => void;
    handleDeleteGoal: (id: number) => void;
    handleToggleGoalItem?: (goalId: number, itemId: string) => void; // 🟢 Prop nova para o checkbox funcionar!
}

export default function GoalsView({ goals, setIsGoalModalOpen, setEditingGoal, handleDeleteGoal, handleToggleGoalItem }: GoalsViewProps) {
    return (
        <div className="max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[60vh]">
            
            {/* Cabeçalho da Seção */}
            <div className="text-center mb-10">
                <h2 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">
                    Seus Sonhos, <span className="text-indigo-500">Organizados.</span>
                </h2>
                <p className="text-gray-400">Defina objetivos, acompanhe o progresso e realize.</p>
            </div>

            {/* Botão de Adicionar */}
            <div className="flex justify-end mb-6">
                <button 
                    onClick={() => { setEditingGoal(null); setIsGoalModalOpen(true); }}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-900/20 flex items-center gap-2 transition hover:scale-105"
                >
                    <Plus size={20} /> Nova Meta
                </button>
            </div>

            {/* Grid de Metas */}
            {goals.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed border-gray-800 rounded-3xl bg-gray-900/20">
                    <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6">
                        <Target size={40} className="text-gray-600" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-300 mb-2">Nenhuma meta ainda</h3>
                    <p className="text-gray-500 max-w-sm text-center">Comece pequeno. Que tal criar uma "Reserva de Emergência" ou "Mobiliar a Sala"?</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {goals.map((goal) => {
                        // 🟢 Lógica Dinâmica: Se tiver itens, o total atual é o "Já guardado" + valor das coisas já compradas.
                        const hasItems = goal.items && goal.items.length > 0;
                        const boughtItemsValue = hasItems 
                            ? goal.items!.filter(i => i.is_bought).reduce((acc, i) => acc + i.price, 0)
                            : 0;
                        
                        const effectiveCurrentAmount = hasItems ? (goal.current_amount + boughtItemsValue) : goal.current_amount;
                        const percentage = Math.min(100, Math.round((effectiveCurrentAmount / goal.target_amount) * 100));
                        const IconComponent = ICON_MAP[goal.icon] || Target;
                        const falta = goal.target_amount - effectiveCurrentAmount;

                        return (
                            <div key={goal.id} className="bg-[#111] p-6 rounded-3xl border border-gray-800 hover:border-gray-600 transition-all group relative overflow-hidden flex flex-col">
                                {/* Barra de Progresso como Fundo Suave */}
                                <div className="absolute bottom-0 left-0 h-1 bg-gray-800 w-full">
                                    <div className="h-full transition-all duration-1000" style={{ width: `${percentage}%`, backgroundColor: goal.color }}></div>
                                </div>

                                <div className="flex justify-between items-start mb-6">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg`} style={{ backgroundColor: goal.color }}>
                                        <IconComponent size={24} />
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => { setEditingGoal(goal); setIsGoalModalOpen(true); }} className="p-2 hover:bg-gray-800 rounded-lg text-gray-400"><Edit2 size={16} /></button>
                                        <button onClick={() => handleDeleteGoal(goal.id)} className="p-2 hover:bg-gray-800 rounded-lg text-red-400"><Trash2 size={16} /></button>
                                    </div>
                                </div>

                                <h3 className="text-xl font-bold text-white mb-1">{goal.title}</h3>
                                {goal.deadline && <p className="text-xs text-gray-500 mb-4 flex items-center gap-1"><Calendar size={12}/> {new Date(goal.deadline).toLocaleDateString('pt-BR')}</p>}

                                <div className="space-y-4 flex-grow">
                                    <div>
                                        <div className="flex justify-between text-sm mb-1">
                                            <span className="text-gray-400">Progresso</span>
                                            <span className="font-bold text-white">{percentage}%</span>
                                        </div>
                                        <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                                            <div className="h-full rounded-full transition-all duration-1000 relative" style={{ width: `${percentage}%`, backgroundColor: goal.color }}>
                                                <div className="absolute right-0 top-0 bottom-0 w-full bg-gradient-to-l from-white/20 to-transparent"></div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-end pt-4 border-t border-gray-800/50">
                                        <div>
                                            <p className="text-[10px] text-gray-500 uppercase font-bold">{hasItems ? 'Adquirido/Guardado' : 'Acumulado'}</p>
                                            <p className="text-lg font-mono text-gray-200">{effectiveCurrentAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold">Meta</p>
                                            <p className="text-lg font-mono text-gray-200">{goal.target_amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                                        </div>
                                    </div>
                                    
                                    {/* 🟢 CHECKLIST VISUAL NO CARD */}
                                    {hasItems && (
                                        <div className="mt-4 pt-4 border-t border-gray-800/50 space-y-2">
                                            <p className="text-[10px] text-gray-500 uppercase font-bold mb-3">Checklist de Compras</p>
                                            <div className="space-y-3 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 pr-2">
                                                {goal.items!.map(item => {
                                                    // Verifica se é uma URL válida
                                                    const isLink = item.link?.startsWith('http') || item.link?.startsWith('www');
                                                    const href = item.link?.startsWith('www') ? `https://${item.link}` : item.link;

                                                    return (
                                                        <div key={item.id} className="flex flex-col group/item border-b border-gray-800/30 pb-2 last:border-0 last:pb-0">
                                                            <div className="flex items-center justify-between">
                                                                <label className="flex items-center gap-3 cursor-pointer flex-1 min-w-0">
                                                                    <div onClick={(e) => {
                                                                        e.preventDefault(); 
                                                                        if(handleToggleGoalItem) handleToggleGoalItem(goal.id, item.id);
                                                                    }} className="cursor-pointer text-indigo-400 hover:text-indigo-300 transition-colors">
                                                                        {item.is_bought ? <CheckSquare size={18} className="text-emerald-500" /> : <Square size={18} className="text-gray-500" />}
                                                                    </div>
                                                                    <span className={`text-sm font-medium truncate transition-all ${item.is_bought ? "text-gray-600 line-through" : "text-gray-200"}`}>
                                                                        {item.name}
                                                                    </span>
                                                                </label>
                                                                <span className={`text-xs font-mono ml-3 ${item.is_bought ? "text-gray-600 line-through" : "text-gray-400"}`}>
                                                                    {item.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                                                </span>
                                                            </div>
                                                            
                                                            {/* 🟢 RENDERIZAÇÃO INTELIGENTE DO LINK/OBSERVAÇÃO */}
                                                            
                                                            {item.link && (
                                                                <div className="pl-8 pt-1">
                                                                    {isLink ? (
                                                                        <a 
                                                                            href={href} 
                                                                            target="_blank" 
                                                                            rel="noopener noreferrer" 
                                                                            // 🟢 QUEBRA DE LINHA: break-all para o link não estourar a div
                                                                            className={`text-xs flex items-start gap-1 w-full transition-colors hover:underline break-all ${item.is_bought ? "text-gray-600" : "text-indigo-400 hover:text-indigo-300"}`}
                                                                        >
                                                                            <ExternalLink size={12} className="shrink-0 mt-0.5" /> {item.link}
                                                                        </a>
                                                                    ) : (
                                                                        // 🟢 QUEBRA DE LINHA: break-words e whitespace-pre-wrap para observações
                                                                        <p className={`text-xs italic flex items-start gap-1 w-full break-words whitespace-pre-wrap ${item.is_bought ? "text-gray-600" : "text-gray-400"}`}>
                                                                            <FileText size={12} className="shrink-0 mt-0.5" /> {item.link}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* FOOTER DO CARD */}
                                <div className="pt-4 mt-4">
                                    {falta > 0 ? (
                                        <div className="text-center bg-gray-900/50 py-2 rounded-lg border border-gray-800 border-dashed">
                                            <span className="text-xs text-gray-400">Faltam </span>
                                            <span className="text-xs font-bold text-white">{falta.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                                        </div>
                                    ) : (
                                        <div className="text-center bg-emerald-900/20 py-2 rounded-lg border border-emerald-500/30">
                                            <span className="text-xs font-bold text-emerald-400">Meta Concluída! 🎉</span>
                                        </div>
                                    )}
                                </div>

                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}