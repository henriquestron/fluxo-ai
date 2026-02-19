import React from 'react';
import { X, DollarSign, TrendingDown, CreditCard, CheckCircle2, Upload, FileText, Loader2, Landmark, Check, Sparkles } from 'lucide-react';
import { ACCOUNTS, ICON_MAP, MONTHS } from '@/utils/constants';

interface TransactionFormProps {
    isOpen: boolean;
    onClose: () => void;
    formMode: 'income' | 'expense' | 'installment' | 'fixed_expense';
    setFormMode: (mode: 'income' | 'expense' | 'installment' | 'fixed_expense') => void;
    formData: any; // Você pode tipar isso melhor depois com a interface FormState
    setFormData: (data: any) => void;
    onSubmit: () => void;
    editingId: number | null;
    uploadingFile: boolean;
    handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleRemoveReceipt: (e: React.MouseEvent) => void;
    userPlan: string;
}

export default function TransactionForm({
    isOpen, onClose, formMode, setFormMode, formData, setFormData, onSubmit,
    editingId, uploadingFile, handleFileUpload, handleRemoveReceipt, userPlan
}: TransactionFormProps) {
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#111] border border-gray-700 p-8 rounded-3xl w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto scrollbar-hide">
                <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24} /></button>
                
                <h2 className="text-2xl font-bold mb-6 text-white">{editingId ? 'Editar Lançamento' : 'Novo Lançamento'}</h2>

                {/* Seletor de Mês */}
                <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 mb-6 flex items-center justify-between">
                    <label className="text-gray-400 text-sm">Mês de Referência:</label>
                    <select 
                        value={formData.targetMonth} 
                        onChange={(e) => setFormData({ ...formData, targetMonth: e.target.value })} 
                        className="bg-black text-white p-2 rounded-lg border border-gray-700 outline-none cursor-pointer hover:border-gray-500 transition"
                    >
                        {MONTHS.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                </div>

                {/* Seletor de Tipo */}
                <div className="grid grid-cols-2 gap-2 mb-6">
                    <button onClick={() => setFormMode('income')} className={`py-3 rounded-xl border text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${formMode === 'income' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'bg-gray-900 border-gray-800 text-gray-500 hover:bg-gray-800'}`}><DollarSign size={20} /> Entrada</button>
                    <button onClick={() => setFormMode('expense')} className={`py-3 rounded-xl border text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${formMode === 'expense' ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-gray-900 border-gray-800 text-gray-500 hover:bg-gray-800'}`}><TrendingDown size={20} /> Gasto</button>
                    <button onClick={() => setFormMode('installment')} className={`py-3 rounded-xl border text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${formMode === 'installment' ? 'bg-purple-500/20 border-purple-500 text-purple-500' : 'bg-gray-900 border-gray-800 text-gray-500 hover:bg-gray-800'}`}><CreditCard size={20} /> Parcelado</button>
                    <button onClick={() => setFormMode('fixed_expense')} className={`py-3 rounded-xl border text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${formMode === 'fixed_expense' ? 'bg-blue-500/20 border-blue-500 text-blue-500' : 'bg-gray-900 border-gray-800 text-gray-500 hover:bg-gray-800'}`}><CheckCircle2 size={20} /> Fixo</button>
                </div>

                <div className="space-y-4">
                    {formMode === 'income' && (
                        <div className="flex items-center gap-3 bg-gray-900 p-3 rounded-lg border border-gray-800">
                            <input type="checkbox" id="fixo" checked={formData.isFixedIncome} onChange={(e) => setFormData({ ...formData, isFixedIncome: e.target.checked })} className="w-5 h-5 rounded accent-emerald-500 cursor-pointer" />
                            <label htmlFor="fixo" className="text-gray-300 text-sm cursor-pointer select-none font-medium">É Salário Fixo?</label>
                        </div>
                    )}
                    
                    <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none transition" placeholder="Descrição (Ex: Mercado, Uber...)" />

                    {/* Ícones */}
                    <div className="my-4">
                        <label className="text-gray-500 text-xs uppercase font-bold mb-2 block ml-1">Escolha um Ícone</label>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {Object.keys(ICON_MAP).map(iconKey => {
                                const IconComponent = ICON_MAP[iconKey];
                                return (
                                    <button key={iconKey} onClick={() => setFormData({ ...formData, icon: iconKey })} className={`p-3 rounded-xl border transition flex-shrink-0 ${formData.icon === iconKey ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-900/50' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'}`}><IconComponent size={20} /></button>
                                )
                            })}
                        </div>
                    </div>

                    {/* Contas / Bancos */}
                    <div className="mb-4">
                        <label className="text-gray-500 text-xs uppercase font-bold mb-2 block ml-1 flex items-center gap-2"><Landmark size={12} /> Conta / Cartão</label>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {ACCOUNTS.map(acc => (
                                <button key={acc.id} onClick={() => setFormData({ ...formData, paymentMethod: acc.id })} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition border ${formData.paymentMethod === acc.id ? `${acc.color} ${acc.text} border-transparent shadow-md scale-105` : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}>
                                    {acc.id === 'nubank' && <img src="https://upload.wikimedia.org/wikipedia/commons/f/f7/Nubank_logo_2021.svg" className="w-4 h-4 invert opacity-90" alt="Nu" />}
                                    {acc.label}
                                    {formData.paymentMethod === acc.id && <Check size={12} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="mb-2">
                        <label className="text-xs text-gray-500 ml-1 mb-1 block">{formMode === 'installment' ? "Valor TOTAL da Compra (Opcional se souber a parcela)" : "Valor (R$)"}</label>
                        <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none font-mono text-lg" placeholder={formMode === 'installment' ? "Total: 1200.00" : "0.00"} />
                    </div>

                    {formMode === 'installment' && (
                        <div className="bg-purple-900/10 p-4 rounded-xl border border-purple-900/30 space-y-3 mb-4 animate-in slide-in-from-top-2">
                            <p className="text-purple-400 text-xs font-bold uppercase mb-2 flex items-center gap-2"><Sparkles size={12} /> Detalhes do Parcelamento</p>
                            <div>
                                <label className="text-gray-400 text-xs block mb-1">Valor da Parcela Mensal:</label>
                                <input type="number" value={formData.fixedMonthlyValue} onChange={(e) => setFormData({ ...formData, fixedMonthlyValue: e.target.value })} className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none font-bold text-lg font-mono" placeholder="Ex: 100.00" />
                            </div>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="text-gray-500 text-[10px] uppercase font-bold mb-1 block">Qtd. Parcelas</label>
                                    <input type="number" placeholder="12" value={formData.installments} onChange={(e) => setFormData({ ...formData, installments: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white outline-none" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-gray-500 text-[10px] uppercase font-bold mb-1 block">Dia Vencimento</label>
                                    <input type="number" placeholder="Dia 10" value={formData.dueDay} onChange={(e) => setFormData({ ...formData, dueDay: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white outline-none" />
                                </div>
                            </div>
                        </div>
                    )}

                    {(formMode === 'fixed_expense') && (
                         <div className="mb-2">
                            <label className="text-xs text-gray-500 ml-1 mb-1 block">Dia do Vencimento</label>
                            <input type="number" placeholder="Dia 10" value={formData.dueDay} onChange={(e) => setFormData({ ...formData, dueDay: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white outline-none" />
                        </div>
                    )}

                    {/* UPLOAD DE COMPROVANTE */}
                    {((formMode !== 'installment' && formMode !== 'fixed_expense') || editingId) && (
                        <div className="border border-dashed border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-900/50 transition relative group">
                            {!formData.receiptUrl && (<input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />)}
                            
                            {uploadingFile ? (
                                <Loader2 className="animate-spin text-cyan-500" />
                            ) : formData.receiptUrl ? (
                                <div className="flex flex-col items-center z-20">
                                    <FileText className="text-emerald-500 mb-1" size={24} />
                                    <span className="text-xs text-emerald-400 font-bold">Comprovante Anexado!</span>
                                    <div className="flex gap-2 mt-2">
                                        <a href={formData.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-gray-800 px-2 py-1 rounded hover:bg-gray-700 text-white border border-gray-600">Ver</a>
                                        <button type="button" onClick={handleRemoveReceipt} className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500 hover:text-white border border-red-500/30 transition">Excluir</button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <Upload className="text-gray-500" size={24} />
                                    <span className="text-xs text-gray-400 group-hover:text-gray-200 transition text-center">
                                        Anexar Comprovante <br/> <span className="text-[10px] text-gray-600">(Foto ou PDF)</span>
                                    </span>
                                </>
                            )}
                        </div>
                    )}

                    <button onClick={onSubmit} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 rounded-xl transition mt-4 shadow-lg shadow-cyan-900/20 active:scale-95 flex items-center justify-center gap-2">
                        <Check size={20} />
                        {editingId ? 'Salvar Alterações' : 'Adicionar Lançamento'}
                    </button>
                </div>
            </div>
        </div>
    );
}