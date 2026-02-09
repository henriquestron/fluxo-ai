import React, { useState } from 'react';
import { X, Plus, Trash2, CheckCircle2, Circle, CreditCard, Save, Loader2 } from 'lucide-react';
import { supabase } from '@/supabase';
import { toast } from 'sonner';

const BANK_STYLES: any = {
    'nubank': { 
        label: 'Nubank', 
        color: 'bg-[#820AD1]', 
        bg: 'bg-[#820AD1]/10', 
        border: 'border-[#820AD1]/30', 
        text: 'text-[#a958e8]', 
        icon: 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Nubank_logo_2021.svg' 
    },
    'inter': { 
        label: 'Inter', 
        color: 'bg-[#FF7A00]', 
        bg: 'bg-[#FF7A00]/10', 
        border: 'border-[#FF7A00]/30', 
        text: 'text-[#ff9638]', 
        icon: 'https://upload.wikimedia.org/wikipedia/commons/0/01/Inter_RGB_300_dpi.png' 
    },
    'bb': { 
        label: 'BB', 
        color: 'bg-[#F8D117]', 
        bg: 'bg-[#F8D117]/10', 
        border: 'border-[#F8D117]/30', 
        text: 'text-[#fae064]', 
        icon: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Funda%C3%A7%C3%A3o_Banco_do_Brasil_-_logo_2.svg' 
    },
    'itau': { 
        label: 'Itaú', 
        color: 'bg-[#EC7000]', 
        bg: 'bg-[#EC7000]/10', 
        border: 'border-[#EC7000]/30', 
        text: 'text-[#ff9233]', 
        icon: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Ita%C3%BA_Unibanco_logo_2023.svg' 
    },
    'santander': { 
        label: 'Santander', 
        color: 'bg-[#CC0000]', 
        bg: 'bg-[#CC0000]/10', 
        border: 'border-[#CC0000]/30', 
        text: 'text-[#ff4d4d]', 
        icon: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Banco_Santander_Logotipo.svg' 
    },
    'caixa': { 
        label: 'Caixa', 
        color: 'bg-[#005CA9]', 
        bg: 'bg-[#005CA9]/10', 
        border: 'border-[#005CA9]/30', 
        text: 'text-[#4ea4eb]', 
        icon: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Caixa_Econ%C3%B4mica_Federal_logo_1997.svg' 
    },
    'bradesco': { 
        label: 'Bradesco', 
        color: 'bg-[#CC092F]', 
        bg: 'bg-[#CC092F]/10', 
        border: 'border-[#CC092F]/30', 
        text: 'text-[#ff4d6f]', 
        icon: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Banco_Bradesco_logo.svg' 
    },
    'c6': { 
        label: 'C6 Bank', 
        color: 'bg-[#222]', 
        bg: 'bg-gray-800', 
        border: 'border-gray-600', 
        text: 'text-gray-300', 
        icon: 'https://upload.wikimedia.org/wikipedia/commons/7/77/Logo_C6_Bank.svg' 
    },
    'money': { 
        label: 'Dinheiro', 
        color: 'bg-emerald-600', 
        bg: 'bg-emerald-900/10', 
        border: 'border-emerald-500/30', 
        text: 'text-emerald-400', 
        icon: null // Dinheiro usa ícone padrão do sistema
    },
    'outros': { 
        label: 'Outros', 
        color: 'bg-gray-700', 
        bg: 'bg-gray-800/50', 
        border: 'border-gray-700', 
        text: 'text-gray-400', 
        icon: null 
    },
};

interface CreditCardModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    activeTab: string;
    contextId: string; // <--- NOVO: Recebe o ID do Workspace
    onSuccess: () => void;
}

export default function CreditCardModal({ isOpen, onClose, user, activeTab, contextId, onSuccess }: CreditCardModalProps) {
    if (!isOpen) return null;

    const [selectedBank, setSelectedBank] = useState('nubank');
    const [isSaving, setIsSaving] = useState(false);
    
    const [items, setItems] = useState([
        { id: 1, title: '', value: '', installments: '1', isPaid: false }
    ]);

    const addNewLine = () => {
        setItems([...items, { id: Date.now(), title: '', value: '', installments: '1', isPaid: false }]);
    };

    const removeLine = (id: number) => {
        if (items.length === 1) return;
        setItems(items.filter(i => i.id !== id));
    };

    const updateItem = (id: number, field: string, value: any) => {
        setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    const totalBatch = items.reduce((acc, item) => {
        const val = parseFloat(item.value.toString().replace(',', '.')) || 0;
        return acc + val;
    }, 0);

    const handleSaveBatch = async () => {
        const invalidItems = items.filter(i => !i.title || !i.value);
        if (invalidItems.length > 0) {
            toast.warning("Preencha a descrição e valor de todos os itens.");
            return;
        }

        setIsSaving(true);
        try {
            const inserts = items.map(item => {
                const valParcela = parseFloat(item.value.toString().replace(',', '.')) || 0;
                const qtd = parseInt(item.installments.toString()) || 1;
                const totalCompra = valParcela * qtd;
                
                const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
                const targetMonthIndex = months.indexOf(activeTab);
                const startOffset = 1 - targetMonthIndex;

                return {
                    user_id: user.id,
                    context: contextId, // <--- CORREÇÃO: Salva o ID do Workspace!
                    title: item.title,
                    total_value: totalCompra,
                    installments_count: qtd,
                    current_installment: startOffset,
                    value_per_month: valParcela,
                    payment_method: selectedBank,
                    due_day: 10,
                    status: 'active',
                    paid_months: item.isPaid ? [activeTab] : [],
                    icon: 'shopping-cart'
                };
            });

            const { error } = await supabase.from('installments').insert(inserts);

            if (error) throw error;

            toast.success(`${items.length} compras lançadas! 🚀`);
            onSuccess();
            onClose();
            setItems([{ id: 1, title: '', value: '', installments: '1', isPaid: false }]);

        } catch (error: any) {
            toast.error("Erro ao salvar: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const currentBankStyle = BANK_STYLES[selectedBank];

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[150] p-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-[#111] border border-gray-800 w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh]">
                
                <div className="p-6 border-b border-gray-800 bg-[#0a0a0a]">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <CreditCard className="text-purple-500" /> Fatura Rápida ({activeTab})
                            </h2>
                            <p className="text-gray-500 text-xs mt-1">Adicione vários gastos de uma vez no cartão.</p>
                        </div>
                        <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={24}/></button>
                    </div>

                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                        {Object.keys(BANK_STYLES).map(key => {
                            const bank = BANK_STYLES[key];
                            const isSelected = selectedBank === key;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setSelectedBank(key)}
                                    className={`
                                        flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition border
                                        ${isSelected 
                                            ? `${bank.color} ${bank.text} border-transparent shadow-lg scale-105` 
                                            : 'bg-gray-900 border-gray-700 text-gray-400 hover:bg-gray-800'}
                                    `}
                                >
                                    
                                    {bank.label}
                                    {isSelected && <CheckCircle2 size={12}/>}
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-2 bg-[#0f0f10]">
                    {items.map((item, index) => (
                        <div key={item.id} className="flex gap-2 items-center animate-in slide-in-from-left-2 duration-300">
                            <span className="text-gray-600 text-xs font-mono w-4">{index + 1}.</span>
                            <input type="text" placeholder="O que você comprou?" value={item.title} onChange={(e) => updateItem(item.id, 'title', e.target.value)} autoFocus={index === items.length - 1} className="flex-1 bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-purple-500 outline-none"/>
                            <div className="w-28 relative"><span className="absolute left-3 top-3 text-xs text-gray-500">R$</span><input type="number" placeholder="0,00" value={item.value} onChange={(e) => updateItem(item.id, 'value', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 pl-8 text-sm text-white focus:border-purple-500 outline-none font-mono"/></div>
                            <div className="w-20 relative" title="Número de Parcelas"><span className="absolute right-3 top-3.5 text-[10px] text-gray-500 font-bold">x</span><input type="number" placeholder="1" value={item.installments} onChange={(e) => updateItem(item.id, 'installments', e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-purple-500 outline-none text-center"/></div>
                            <button onClick={() => updateItem(item.id, 'isPaid', !item.isPaid)} className={`p-3 rounded-lg border transition ${item.isPaid ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'bg-gray-800 border-gray-700 text-gray-600 hover:text-white'}`} title={item.isPaid ? "Marcado como Pago" : "Marcar como Pago"}>{item.isPaid ? <CheckCircle2 size={18}/> : <Circle size={18}/>}</button>
                            <button onClick={() => removeLine(item.id)} className="p-3 rounded-lg text-gray-600 hover:text-red-500 hover:bg-red-500/10 transition" disabled={items.length === 1}><Trash2 size={18}/></button>
                        </div>
                    ))}
                    <button onClick={addNewLine} className="w-full py-3 border border-dashed border-gray-700 rounded-xl text-gray-500 hover:text-white hover:border-gray-500 transition flex items-center justify-center gap-2 text-sm mt-4"><Plus size={16}/> Adicionar mais um item</button>
                </div>

                <div className="p-6 border-t border-gray-800 bg-[#0a0a0a] flex justify-between items-center">
                    <div><p className="text-gray-500 text-xs uppercase font-bold">Total a lançar</p><p className={`text-2xl font-bold font-mono ${currentBankStyle.text.replace('text-white', 'text-gray-200')}`}>R$ {totalBatch.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p></div>
                    <button onClick={handleSaveBatch} disabled={isSaving || totalBatch === 0} className={`px-8 py-4 rounded-xl font-bold text-white flex items-center gap-2 shadow-lg transition ${isSaving ? 'bg-gray-700 cursor-wait' : `${currentBankStyle.color} hover:brightness-110`}`}>{isSaving ? <Loader2 className="animate-spin"/> : <Save size={20}/>}{isSaving ? "Salvando..." : "Lançar Fatura"}</button>
                </div>
            </div>
        </div>
    );
}