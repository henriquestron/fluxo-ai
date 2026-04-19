import React, { useState, useEffect } from 'react';
import { X, Edit2, Target, Plus, Trash2, CheckCircle2 } from 'lucide-react';

export interface GoalItem {
    id: string;
    name: string;
    price: number;
    is_bought: boolean;
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
}

interface GoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    editingGoal: Goal | null;
}

export default function GoalModal({ isOpen, onClose, onSubmit, editingGoal }: GoalModalProps) {
    const [items, setItems] = useState<GoalItem[]>([]);
    const [newItemName, setNewItemName] = useState('');
    const [newItemPrice, setNewItemPrice] = useState('');

    // 🟢 A MÁGICA DA LIMPEZA: Toda vez que abrir o modal, ele reseta a lista
    useEffect(() => {
        if (isOpen) {
            setItems(editingGoal?.items || []);
            setNewItemName('');
            setNewItemPrice('');
        }
    }, [isOpen, editingGoal]);

    if (!isOpen) return null;

    const handleAddItem = () => {
        if (!newItemName.trim() || !newItemPrice) return;
        const newItem: GoalItem = {
            id: Math.random().toString(36).substring(2, 9),
            name: newItemName,
            price: parseFloat(newItemPrice),
            is_bought: false
        };
        setItems([...items, newItem]);
        setNewItemName('');
        setNewItemPrice('');
    };

    const handleRemoveItem = (id: string) => {
        setItems(items.filter(item => item.id !== id));
    };

    const hasItems = items.length > 0;
    const autoTargetAmount = items.reduce((acc, item) => acc + item.price, 0);

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <div className="bg-[#111] border border-gray-800 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in duration-200 relative max-h-[90vh] overflow-y-auto scrollbar-hide">
                <button type="button" onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                    <X size={24} />
                </button>

                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    {editingGoal ? <Edit2 className="text-indigo-500" /> : <Target className="text-indigo-500" />}
                    {editingGoal ? 'Editar Meta' : 'Nova Meta'}
                </h3>

                <form onSubmit={onSubmit} className="space-y-5">
                    <input type="hidden" name="items" value={JSON.stringify(items)} />
                    {hasItems && <input type="hidden" name="target_amount" value={autoTargetAmount} />}

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Nome da Meta</label>
                        <input
                            name="title"
                            defaultValue={editingGoal?.title}
                            placeholder="Ex: Mobiliar a Casa, Setup Gamer..."
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none transition"
                            required
                        />
                    </div>

                    <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-800">
                        <label className="block text-xs font-bold text-indigo-400 uppercase mb-3 flex items-center gap-2">
                            <CheckCircle2 size={14} /> Checklist de Compras (Opcional)
                        </label>
                        
                        <div className="flex gap-2 mb-4 items-center">
                            <input
                                value={newItemName}
                                onChange={(e) => setNewItemName(e.target.value)}
                                placeholder="Ex: Geladeira"
                                className="flex-1 min-w-0 bg-black border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                            />
                            <input
                                type="number"
                                step="0.01"
                                value={newItemPrice}
                                onChange={(e) => setNewItemPrice(e.target.value)}
                                placeholder="R$ Valor"
                                className="w-20 sm:w-24 shrink-0 bg-black border border-gray-700 rounded-lg p-2.5 text-sm text-white focus:border-indigo-500 outline-none"
                            />
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white p-2.5 rounded-lg transition flex items-center justify-center"
                            >
                                <Plus size={18} />
                            </button>
                        </div>

                        {items.length > 0 && (
                            <ul className="space-y-2 mb-2 max-h-32 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 pr-1">
                                {items.map(item => (
                                    <li key={item.id} className="flex justify-between items-center bg-black p-2 rounded-lg border border-gray-800 text-sm">
                                        <span className="text-gray-300 truncate pr-2">{item.name}</span>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <span className="text-indigo-400 font-mono">R$ {item.price.toFixed(2)}</span>
                                            <button type="button" onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:text-red-400"><Trash2 size={14} /></button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Valor Alvo (R$)</label>
                            {hasItems ? (
                                <input
                                    key="target-dummy"
                                    name="target_amount_dummy"
                                    type="number"
                                    value={autoTargetAmount}
                                    className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-gray-400 cursor-not-allowed outline-none transition"
                                    readOnly
                                />
                            ) : (
                                <input
                                    key="target-real"
                                    name="target_amount"
                                    type="number"
                                    step="0.01"
                                    defaultValue={editingGoal?.target_amount || ''}
                                    placeholder="0.00"
                                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none transition"
                                    required
                                />
                            )}
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Já Guardado (R$)</label>
                            <input
                                name="current_amount"
                                type="number"
                                step="0.01"
                                defaultValue={editingGoal?.current_amount || 0}
                                placeholder="0.00"
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none transition"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Prazo (Opcional)</label>
                            <input
                                name="deadline"
                                type="date"
                                defaultValue={editingGoal?.deadline || ''}
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none transition"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Ícone</label>
                            <select name="icon" defaultValue={editingGoal?.icon || 'target'} className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none transition appearance-none">
                                <option value="target">🎯 Alvo</option>
                                <option value="car">🚗 Carro</option>
                                <option value="home">🏠 Casa</option>
                                <option value="plane">✈️ Viagem</option>
                                <option value="smartphone">📱 Eletrônico</option>
                                <option value="graduation-cap">🎓 Estudo</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-2 ml-1">Cor da Barra</label>
                        <div className="flex gap-2 justify-between">
                            {['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'].map(color => (
                                <label key={color} className="cursor-pointer relative">
                                    <input type="radio" name="color" value={color} defaultChecked={editingGoal?.color === color || color === '#10B981'} className="peer sr-only" />
                                    <div className="w-8 h-8 rounded-full border-2 border-transparent peer-checked:border-white peer-checked:scale-110 transition-all" style={{ backgroundColor: color }}></div>
                                </label>
                            ))}
                        </div>
                    </div>

                    <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-indigo-900/20 mt-4 flex items-center justify-center gap-2">
                        <Target size={18} /> {editingGoal ? 'Salvar Alterações' : 'Criar Meta'}
                    </button>
                </form>
            </div>
        </div>
    );
}