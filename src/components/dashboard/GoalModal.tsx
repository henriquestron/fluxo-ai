import React from 'react';
import { X, Edit2, Target } from 'lucide-react';

interface Goal {
    id: number;
    title: string;
    target_amount: number;
    current_amount: number;
    deadline: string | null;
    icon: string;
    color: string;
}

interface GoalModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
    editingGoal: Goal | null;
}

export default function GoalModal({ isOpen, onClose, onSubmit, editingGoal }: GoalModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <div className="bg-[#111] border border-gray-800 rounded-3xl w-full max-w-md p-6 shadow-2xl animate-in zoom-in duration-200 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-white">
                    <X size={24} />
                </button>

                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                    {editingGoal ? <Edit2 className="text-indigo-500" /> : <Target className="text-indigo-500" />}
                    {editingGoal ? 'Editar Meta' : 'Nova Meta'}
                </h3>

                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Nome da Meta</label>
                        <input
                            name="title"
                            defaultValue={editingGoal?.title}
                            placeholder="Ex: Viagem 2026, Carro Novo..."
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none transition"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1 ml-1">Valor Alvo (R$)</label>
                            <input
                                name="target_amount"
                                type="number"
                                step="0.01"
                                defaultValue={editingGoal?.target_amount}
                                placeholder="0.00"
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-indigo-500 outline-none transition"
                                required
                            />
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