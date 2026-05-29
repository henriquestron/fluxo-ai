import React, { useState, useEffect } from 'react';
import { X, Edit2, Target, Plus, Trash2, CheckCircle2, Link as LinkIcon, Check, Wallet, Lock, Bot, CalendarDays } from 'lucide-react';

export interface GoalItem {
    id: string;
    name: string;
    price: number;
    is_bought: boolean;
    link?: string;
}

export interface Goal {
    id: number;
    title: string;
    target_amount: number;
    current_amount: number;
    deadline: string | null;
    icon: string;
    color: string;
    items?: GoalItem[];
    type?: string; 
    whatsapp_rule?: string; 
    ai_enabled?: boolean;   
    reference_month?: string; 
}

interface GoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    editingGoal: Goal | null;
    userPlan: string; 
}

export default function GoalModal({ isOpen, onClose, onSubmit, editingGoal, userPlan }: GoalModalProps) {
    const [items, setItems] = useState<GoalItem[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');
    const [newItemLink, setNewItemLink] = useState('');
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    
    const [goalType, setGoalType] = useState<'saving' | 'wallet'>('saving');
    
    const [aiEnabled, setAiEnabled] = useState(false);
    const [whatsappRule, setWhatsappRule] = useState('');
    const [referenceMonth, setReferenceMonth] = useState('');
    
    // 🟢 NOVO STATE: Botão de descontar do saldo principal
    const [deductFromBalance, setDeductFromBalance] = useState(true);

    const canUseWhatsapp = ['pro', 'agent', 'admin'].includes(userPlan?.toLowerCase() || '');

    const generateMonthOptions = () => {
        const options = [];
        const today = new Date();
        for (let i = -1; i <= 11; i++) {
            const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
            const val = `${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
            const labelStr = date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
            const label = labelStr.charAt(0).toUpperCase() + labelStr.slice(1);
            options.push({ value: val, label });
        }
        return options;
    };
    const monthOptions = generateMonthOptions();

    useEffect(() => {
        if (isOpen) {
            setItems(editingGoal?.items || []);
            setNewItemName('');
            setNewItemPrice('');
            setNewItemLink('');
            setEditingItemId(null);
            setGoalType((editingGoal?.type as 'saving' | 'wallet') || 'saving');
            
            setAiEnabled(editingGoal?.ai_enabled || false);
            setWhatsappRule(editingGoal?.whatsapp_rule || '');

            const today = new Date();
            const currentMonthStr = `${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
            setReferenceMonth(editingGoal?.reference_month || currentMonthStr);
            
            // Sempre que abrir o modal, por padrão, ele vem marcado para descontar
            setDeductFromBalance(true);
        }
    }, [isOpen, editingGoal]);

    if (!isOpen) return null;

    const handleAddItem = () => {
        if (!newItemName.trim() || !newItemPrice) return;
        
        if (editingItemId) {
            setItems(items.map(item => item.id === editingItemId ? {
                ...item, name: newItemName, price: parseFloat(newItemPrice), link: newItemLink.trim() || undefined
            } : item));
            setEditingItemId(null);
        } else {
            const newItem: GoalItem = {
                id: Math.random().toString(36).substring(2, 9),
                name: newItemName, price: parseFloat(newItemPrice), is_bought: false, link: newItemLink.trim() || undefined
            };
            setItems([...items, newItem]);
        }
        
        setNewItemName(''); setNewItemPrice(''); setNewItemLink('');
    };

    const handleEditItem = (item: GoalItem) => {
        setNewItemName(item.name); setNewItemPrice(item.price.toString()); setNewItemLink(item.link || ''); setEditingItemId(item.id);
    };

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
        if (editingItemId === id) {
            setNewItemName(''); setNewItemPrice(''); setNewItemLink(''); setEditingItemId(null);
        }
    };

    const hasItems = items.length > 0;
    const autoTargetAmount = items.reduce((acc, item) => acc + item.price, 0);
    const isWallet = goalType === 'wallet';

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <div className="bg-[#111] border border-gray-800 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in duration-200 relative max-h-[90vh] overflow-y-auto scrollbar-hide">
                <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                    <X size={24} />
                </button>

                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    {isWallet ? <Wallet className="text-emerald-500" /> : <Target className="text-indigo-500" />}
                    {editingGoal ? (isWallet ? 'Editar Caixinha' : 'Editar Meta') : (isWallet ? 'Nova Caixinha' : 'Nova Meta')}
                </h3>

                {!editingGoal && (
                    <div className="flex bg-gray-900 p-1 rounded-xl mb-6 border border-gray-800">
                        <button
                            type="button"
                            onClick={() => setGoalType('saving')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${!isWallet ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            🎯 Sonho (Guardar)
                        </button>
                        <button
                            type="button"
                            onClick={() => setGoalType('wallet')}
                            className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${isWallet ? 'bg-emerald-600 text-white shadow-md' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            👛 Caixinha (Gastar)
                        </button>
                    </div>
                )}

                <form onSubmit={onSubmit} className="space-y-5">
                    <input type="hidden" name="type" value={goalType} />
                    <input type="hidden" name="items" value={JSON.stringify(items)} />
                    <input type="hidden" name="deduct_from_balance" value={deductFromBalance.toString()} />
                    {hasItems && !isWallet && <input type="hidden" name="target_amount" value={autoTargetAmount} />}
                    {isWallet && <input type="hidden" name="ai_enabled" value={aiEnabled.toString()} />}

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">
                            {isWallet ? 'Nome da Caixinha' : 'Nome da Meta'}
                        </label>
                        <input
                            name="title"
                            defaultValue={editingGoal?.title}
                            placeholder={isWallet ? "Ex: Mercado, Lazer, Uber..." : "Ex: Mobiliar a Casa, Setup Gamer..."}
                            className={`w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white outline-none transition ${isWallet ? 'focus:border-emerald-500' : 'focus:border-indigo-500'}`}
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1 flex items-center gap-1">
                            <CalendarDays size={14} /> Mês de Referência
                        </label>
                        <select
                            name="reference_month"
                            value={referenceMonth}
                            onChange={(e) => setReferenceMonth(e.target.value)}
                            className={`w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white outline-none transition appearance-none ${isWallet ? 'focus:border-emerald-500' : 'focus:border-indigo-500'}`}
                            required
                        >
                            {monthOptions.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-gray-500 mt-1 ml-1">Usado para separar os gastos e depósitos mês a mês.</p>
                    </div>

                    {!isWallet && (
                        <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-800">
                            <label className="block text-xs font-bold text-indigo-400 uppercase mb-3 flex items-center gap-2">
                                <CheckCircle2 size={14} /> Checklist de Compras (Opcional)
                            </label>
                            
                            <div className="flex flex-col gap-2 mb-4">
                                <div className="flex gap-2 items-center">
                                    <input value={newItemName} onChange={(e) => setNewItemName(e.target.value)} placeholder="Ex: Geladeira" className="flex-1 min-w-0 bg-black border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:border-indigo-500 outline-none" />
                                    <input type="number" step="0.01" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)} placeholder="R$ Valor" className="w-24 shrink-0 bg-black border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:border-indigo-500 outline-none" />
                                </div>
                                <div className="flex gap-2 items-center">
                                    <div className="relative flex-1 min-w-0">
                                        <LinkIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                                        <input value={newItemLink} onChange={(e) => setNewItemLink(e.target.value)} placeholder="Link da loja ou observação..." className="w-full pl-9 pr-3 py-2.5 bg-black border border-gray-700 rounded-lg text-sm text-white focus:border-indigo-500 outline-none" />
                                    </div>
                                    <button type="button" onClick={handleAddItem} className={`shrink-0 text-white p-2.5 rounded-lg transition flex items-center justify-center w-[46px] ${editingItemId ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-indigo-600 hover:bg-indigo-500'}`}>
                                        {editingItemId ? <Check size={18} /> : <Plus size={18} />}
                                    </button>
                                </div>
                            </div>

                            {items.length > 0 && (
                                <ul className="space-y-3 mb-2 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 pr-1">
                                    {items.map(item => (
                                        <li key={item.id} className={`flex flex-col bg-black p-3 rounded-lg border transition-colors ${editingItemId === item.id ? 'border-indigo-500' : 'border-gray-800'}`}>
                                            <div className="flex justify-between items-start">
                                                <span className="text-sm text-gray-200 font-bold break-words pr-2">{item.name}</span>
                                                <div className="flex items-center gap-2 shrink-0">
                                                    <span className="text-indigo-400 font-mono text-sm mr-2">R$ {item.price.toFixed(2)}</span>
                                                    <button type="button" onClick={() => handleEditItem(item)} className="text-gray-400 hover:text-white transition"><Edit2 size={14} /></button>
                                                    <button type="button" onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-400 transition"><Trash2 size={14} /></button>
                                                </div>
                                            </div>
                                            {item.link && (
                                                <span className="text-xs text-gray-500 mt-2 flex items-start gap-1 break-all whitespace-pre-wrap">
                                                    <LinkIcon size={12} className="shrink-0 mt-0.5" /> {item.link}
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">
                                {isWallet ? 'Limite da Caixinha (R$)' : 'Valor Alvo (R$)'}
                            </label>
                            {hasItems && !isWallet ? (
                                <input key="target-dummy" name="target_amount_dummy" type="number" value={autoTargetAmount} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-gray-400 cursor-not-allowed outline-none transition" readOnly />
                            ) : (
                                <input key="target-real" name="target_amount" type="number" step="0.01" defaultValue={editingGoal?.target_amount || ''} placeholder="0.00" className={`w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white outline-none transition ${isWallet ? 'focus:border-emerald-500' : 'focus:border-indigo-500'}`} required />
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">
                                {isWallet ? 'Transferir Agora (R$)' : 'Já Guardado (R$)'}
                            </label>
                            <input name="current_amount" type="number" step="0.01" defaultValue={editingGoal?.current_amount || 0} placeholder="0.00" className={`w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white outline-none transition ${isWallet ? 'focus:border-emerald-500' : 'focus:border-indigo-500'}`} />
                        </div>
                        
                        {/* 🟢 NOVO: BOTÃO DE ABATER DO SALDO */}
                        <div className="col-span-2 flex items-center justify-between bg-gray-900/40 p-3 rounded-xl border border-gray-800">
                            <div>
                                <label className="text-[11px] font-bold text-gray-300 block uppercase">Abater do Saldo Principal?</label>
                                <span className="text-[10px] text-gray-500 leading-tight block mt-0.5">Cria um recibo no extrato para descontar esse valor da sua tela inicial.</span>
                            </div>
                            <button
                                type="button"
                                onClick={() => setDeductFromBalance(!deductFromBalance)}
                                className={`w-10 h-5 shrink-0 rounded-full relative transition-colors ${deductFromBalance ? (isWallet ? 'bg-emerald-500' : 'bg-indigo-500') : 'bg-gray-700'}`}
                            >
                                <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${deductFromBalance ? 'translate-x-5' : 'translate-x-0'}`}></div>
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {!isWallet ? (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Prazo (Opcional)</label>
                                <input name="deadline" type="date" defaultValue={editingGoal?.deadline || ''} className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none transition" />
                            </div>
                        ) : (
                            <div></div>
                        )}
                        
                        <div className={isWallet ? "col-span-2" : ""}>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Ícone</label>
                            <select name="icon" defaultValue={editingGoal?.icon || (isWallet ? 'wallet' : 'target')} className={`w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white outline-none transition appearance-none ${isWallet ? 'focus:border-emerald-500' : 'focus:border-indigo-500'}`}>
                                {isWallet && <option value="wallet">👛 Carteira / Dinheiro</option>}
                                {isWallet && <option value="shopping-cart">🛒 Mercado / Compras</option>}
                                {isWallet && <option value="utensils">🍽️ Alimentação</option>}
                                {isWallet && <option value="car">🚗 Transporte</option>}
                                <option value="target">🎯 Alvo</option>
                                <option value="home">🏠 Casa</option>
                                <option value="plane">✈️ Viagem</option>
                                <option value="smartphone">📱 Eletrônico</option>
                                <option value="graduation-cap">🎓 Estudo</option>
                            </select>
                        </div>
                    </div>

                    {isWallet && (
                        <div className="bg-gradient-to-br from-emerald-950/30 to-black border border-emerald-500/20 p-4 rounded-2xl">
                            <div className="flex justify-between items-center">
                                <label className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                                    <Bot size={18} /> IA do WhatsApp
                                </label>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!canUseWhatsapp) return;
                                        setAiEnabled(!aiEnabled);
                                    }}
                                    className={`w-10 h-5 rounded-full relative transition-colors ${aiEnabled ? 'bg-emerald-500' : 'bg-gray-700'} ${!canUseWhatsapp ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${aiEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                </button>
                            </div>

                            {!canUseWhatsapp && (
                                <p className="text-[10px] text-amber-500 font-bold mt-2 flex items-center gap-1">
                                    <Lock size={10} /> Recurso exclusivo do plano Consultor/Pro.
                                </p>
                            )}

                            {aiEnabled && canUseWhatsapp && (
                                <div className="mt-3 animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-[10px] font-bold text-gray-500 uppercase mb-1 ml-1">Regra de Abatimento</label>
                                    <textarea
                                        name="whatsapp_rule"
                                        value={whatsappRule}
                                        onChange={(e) => setWhatsappRule(e.target.value)}
                                        placeholder="Ex: Use esta caixinha para tudo que for supermercado, padaria e açougue."
                                        className="w-full bg-black border border-gray-800 rounded-xl p-3 text-sm text-gray-300 outline-none focus:border-emerald-500 h-20 resize-none"
                                        required={aiEnabled}
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Cor da Barra</label>
                        <div className="flex gap-2 justify-between">
                            {['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map(color => (
                                <label key={color} className="cursor-pointer relative">
                                    <input type="radio" name="color" value={color} defaultChecked={editingGoal?.color === color || (isWallet ? color === '#10B981' : color === '#8B5CF6')} className="peer sr-only" />
                                    <div className="w-8 h-8 rounded-full border-2 border-transparent peer-checked:border-white peer-checked:scale-110 transition-all" style={{ backgroundColor: color }}></div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <button type="submit" className={`w-full text-white font-bold py-3.5 rounded-xl transition shadow-lg mt-4 flex items-center justify-center gap-2 ${isWallet ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-900/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-900/20'}`}>
                        {isWallet ? <Wallet size={18} /> : <Target size={18} />} 
                        {editingGoal ? 'Salvar Alterações' : (isWallet ? 'Criar Caixinha' : 'Criar Meta')}
                    </button>
                </form>
            </div>
        </div>
    );
}