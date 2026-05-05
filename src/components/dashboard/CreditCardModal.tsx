import React, { useState } from 'react';
import { X, Plus, Trash2, CheckCircle2, Circle, CreditCard, Save, Loader2, CalendarDays } from 'lucide-react';
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
    'mercadopago': { 
        label: 'Mercado Pago', 
        color: 'bg-[#009EE3]', 
        bg: 'bg-[#009EE3]/10', 
        border: 'border-[#009EE3]/30', 
        text: 'text-[#009EE3]', 
        icon: 'https://logodownload.org/wp-content/uploads/2019/06/mercado-pago-logo.png' 
    },
    'bradesco': { 
        label: 'Bradesco', 
        color: 'bg-[#CC092F]', 
        bg: 'bg-[#CC092F]/10', 
        border: 'border-[#CC092F]/30', 
        text: 'text-[#ff4d6f]', 
        icon: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Banco_Bradesco_logo.svg' 
    },
    'picpay': { 
        label: 'PicPay', 
        color: 'bg-[#11C76F]', 
        bg: 'bg-[#11C76F]/10', 
        border: 'border-[#11C76F]/30', 
        text: 'text-[#11C76F]', 
        icon: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/PicPay_Logogrande.png' 
    },
    'c6': { 
        label: 'C6 Bank', 
        color: 'bg-[#222]', 
        bg: 'bg-gray-800', 
        border: 'border-gray-600', 
        text: 'text-gray-300', 
        icon: 'https://upload.wikimedia.org/wikipedia/commons/7/77/Logo_C6_Bank.svg' 
    },
    'xp': { 
        label: 'XP', 
        color: 'bg-[#111111]', 
        bg: 'bg-[#111111]/50', 
        border: 'border-[#FFD700]/30', 
        text: 'text-[#FFD700]', 
        icon: '/logos/xp.svg' 
    },
    'btg': { 
        label: 'BTG Pactual', 
        color: 'bg-[#002A54]', 
        bg: 'bg-[#002A54]/20', 
        border: 'border-[#002A54]/40', 
        text: 'text-[#4d8bce]', 
        icon: '/logos/btg.svg' 
    },
    'pagbank': { 
        label: 'PagBank', 
        color: 'bg-[#00B152]', 
        bg: 'bg-[#00B152]/10', 
        border: 'border-[#00B152]/30', 
        text: 'text-[#00B152]', 
        icon: '/logos/pagbank.svg' 
    },
    'neon': { 
        label: 'Neon', 
        color: 'bg-[#00E5FF]', 
        bg: 'bg-[#00E5FF]/10', 
        border: 'border-[#00E5FF]/30', 
        text: 'text-[#00E5FF]', 
        icon: 'https://upload.wikimedia.org/wikipedia/commons/c/c2/Neon_Pagamentos_logo.svg' 
    },
    'will': { 
        label: 'Will Bank', 
        color: 'bg-[#FFD500]', 
        bg: 'bg-[#FFD500]/10', 
        border: 'border-[#FFD500]/30', 
        text: 'text-[#FFD500]', 
        icon: null // Usará o ícone padrão de cartão
    },
    'pan': { 
        label: 'Banco Pan', 
        color: 'bg-[#0054A6]', 
        bg: 'bg-[#0054A6]/10', 
        border: 'border-[#0054A6]/30', 
        text: 'text-[#4da6ff]', 
        icon: '/logos/pan.svg' 
    },
    'sicoob': { 
        label: 'Sicoob', 
        color: 'bg-[#003641]', 
        bg: 'bg-[#00AE9D]/10', 
        border: 'border-[#00AE9D]/30', 
        text: 'text-[#00AE9D]', 
        icon: '/logos/sicoob.svg' 
    },
    'sicredi': { 
        label: 'Sicredi', 
        color: 'bg-[#32A041]', 
        bg: 'bg-[#32A041]/10', 
        border: 'border-[#32A041]/30', 
        text: 'text-[#32A041]', 
        icon: '/logos/sicredi.svg' 
    },
    'money': { 
        label: 'Dinheiro', 
        color: 'bg-emerald-600', 
        bg: 'bg-emerald-900/10', 
        border: 'border-emerald-500/30', 
        text: 'text-emerald-400', 
        icon: null 
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
    contextId: string; 
    onSuccess: () => void;
}

export default function CreditCardModal({ isOpen, onClose, user, activeTab, contextId, onSuccess }: CreditCardModalProps) {
    if (!isOpen) return null;

    const [selectedBank, setSelectedBank] = useState('nubank');
    const [isSaving, setIsSaving] = useState(false);
    
    // Guarda o dia de vencimento de CADA banco separado
    const [dueDays, setDueDays] = useState<Record<string, string>>({});
    
    const [items, setItems] = useState([
        { id: 1, title: '', value: '', installments: '1', isPaid: false }
    ]);

    // LIMITE DE ITENS (Anti-Spam / Anti-Travamento)
    const MAX_ITEMS = 50;
    const addNewLine = () => {
        if (items.length >= MAX_ITEMS) {
            toast.warning(`Você atingiu o limite de ${MAX_ITEMS} itens por vez.`);
            return;
        }
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
            const currentYear = new Date().getFullYear();
            const currentRealMonth = new Date().getMonth();
            
            const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            const targetMonthIndex = months.indexOf(activeTab);
            
            const startOffset = currentRealMonth - targetMonthIndex;
            
            // SANITIZAÇÃO DE VENCIMENTO (Sempre entre 1 e 31)
            const finalDueDay = Math.min(31, Math.max(1, parseInt(dueDays[selectedBank] || '10') || 10));

            const inserts = items.map(item => {
                const valParcela = parseFloat(item.value.toString().replace(',', '.')) || 0;
                const qtd = parseInt(item.installments.toString()) || 1;
                const totalCompra = valParcela * qtd;

                return {
                    user_id: user.id,
                    context: contextId, 
                    title: item.title,
                    total_value: totalCompra,
                    installments_count: qtd,
                    current_installment: startOffset, 
                    value_per_month: valParcela,
                    payment_method: selectedBank,
                    due_day: finalDueDay,
                    status: 'active',
                    paid_months: item.isPaid ? [`${activeTab}/${currentYear}`] : [],
                    icon: 'shopping-cart'
                };
            });

            const { error } = await supabase.from('installments').insert(inserts);

            if (error) throw error;

            toast.success(`${items.length} compras lançadas no ${BANK_STYLES[selectedBank].label}! 🚀`);
            onSuccess();
            onClose();
            setItems([{ id: 1, title: '', value: '', installments: '1', isPaid: false }]);

        } catch (error: any) {
            console.error("❌ Erro interno ao salvar fatura:", error);
            toast.error("Não foi possível salvar os dados. Verifique sua conexão e tente novamente.");
        } finally {
            setIsSaving(false);
        }
    };

    const currentBankStyle = BANK_STYLES[selectedBank];
    const currentDueDay = dueDays[selectedBank] || '10';

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[150] p-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-[#111] border border-gray-800 w-full max-w-3xl rounded-3xl shadow-2xl flex flex-col max-h-[95vh] sm:max-h-[90vh]">
                
                {/* CABEÇALHO REFEITO COM FLEX-WRAP PARA MOBILE */}
                <div className="p-5 sm:p-6 border-b border-gray-800 bg-[#0a0a0a] rounded-t-3xl">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5 sm:mb-6">
                        <div className="flex justify-between w-full sm:w-auto items-start">
                            <div>
                                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                    <CreditCard className="text-purple-500" /> Fatura Rápida ({activeTab})
                                </h2>
                                <p className="text-gray-500 text-xs mt-1">Adicione vários gastos de uma vez no cartão.</p>
                            </div>
                            {/* Botão de Fechar Exclusivo do Mobile */}
                            <button onClick={onClose} className="sm:hidden text-gray-500 hover:text-white transition bg-gray-900 hover:bg-gray-800 p-2 rounded-xl flex-shrink-0">
                                <X size={20}/>
                            </button>
                        </div>
                        
                        <div className="flex items-center w-full sm:w-auto gap-4">
                            <div className="flex items-center justify-center gap-2 bg-gray-900 border border-gray-800 px-3 py-2 rounded-xl flex-1 sm:flex-none" title="Dia do Vencimento da Fatura">
                                <CalendarDays size={16} className={currentBankStyle.text.replace('text-', 'text-').split(' ')[0] || "text-gray-500"} />
                                <span className="text-xs text-gray-500 font-bold uppercase">Venc. <span className="hidden sm:inline">{BANK_STYLES[selectedBank].label}:</span></span>
                                <input 
                                    type="number" 
                                    min="1" 
                                    max="31" 
                                    value={currentDueDay} 
                                    onChange={(e) => setDueDays({ ...dueDays, [selectedBank]: e.target.value })} 
                                    className="bg-transparent text-white text-sm font-bold w-10 text-center outline-none" 
                                    placeholder="10" 
                                />
                            </div>
                            {/* Botão de Fechar Exclusivo do Desktop */}
                            <button onClick={onClose} className="hidden sm:block text-gray-500 hover:text-white transition bg-gray-900 hover:bg-gray-800 p-2 rounded-xl flex-shrink-0">
                                <X size={20}/>
                            </button>
                        </div>
                    </div>

                    {/* BARRA DE ROLAGEM DE BANCOS */}
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

                {/* LISTA DE ITENS RESPONSIVA */}
                <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-3 sm:space-y-2 bg-[#0f0f10]">
                    {items.map((item, index) => (
                        <div key={item.id} className="flex flex-col sm:flex-row gap-2 sm:items-center animate-in slide-in-from-left-2 duration-300 bg-gray-900/30 sm:bg-transparent p-3 sm:p-0 rounded-xl sm:rounded-none border border-gray-800 sm:border-transparent">
                            
                            {/* LINHA 1 MOBILE (Nome e Lixeira) | Esquerda no Desktop */}
                            <div className="flex w-full sm:w-auto items-center gap-2 flex-1">
                                <span className="hidden sm:inline-block text-gray-600 text-xs font-mono w-4">{index + 1}.</span>
                                
                                <input 
                                    type="text" 
                                    placeholder="O que comprou?" 
                                    value={item.title} 
                                    onChange={(e) => updateItem(item.id, 'title', e.target.value)} 
                                    autoFocus={index === items.length - 1} 
                                    maxLength={100}
                                    className="flex-1 w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-purple-500 outline-none"
                                />
                                {/* Botão Excluir Mobile */}
                                <button onClick={() => removeLine(item.id)} className="sm:hidden p-3 rounded-lg text-gray-400 hover:text-red-500 bg-gray-800 hover:bg-red-500/10 border border-gray-700 transition" disabled={items.length === 1}>
                                    <Trash2 size={18}/>
                                </button>
                            </div>
                            
                            {/* LINHA 2 MOBILE (Valor, Parcelas e Check) | Direita no Desktop */}
                            <div className="flex w-full sm:w-auto items-center gap-2">
                                
                                {/* 🟢 CAMPO DE VALOR COM TEXTO "R$" FIXO DENTRO DA CAIXA */}
                                <div className="flex-1 sm:w-32 flex items-center bg-gray-800 border border-gray-700 rounded-lg overflow-hidden focus-within:border-purple-500 transition-colors">
                                    <span className="pl-3 text-xs text-gray-500 font-bold">R$</span>
                                    <input 
                                        type="number" 
                                        placeholder="0,00" 
                                        value={item.value} 
                                        onChange={(e) => updateItem(item.id, 'value', e.target.value)} 
                                        className="w-full bg-transparent p-3 pl-2 text-sm text-white outline-none font-mono"
                                    />
                                </div>
                                
                                {/* 🟢 CAMPO DE PARCELAS CORRIGIDO COM TEXTO "Parc." */}
                                <div className="flex-1 sm:w-28 flex items-center bg-gray-800 border border-gray-700 rounded-lg overflow-hidden focus-within:border-purple-500 transition-colors" title="Número de Parcelas">
                                    <span className="pl-3 text-[10px] text-gray-400 font-bold uppercase tracking-wider">Parc.</span>
                                    <input 
                                        type="number" 
                                        placeholder="1" 
                                        value={item.installments} 
                                        onChange={(e) => updateItem(item.id, 'installments', e.target.value)} 
                                        className="w-full bg-transparent p-3 pl-2 text-sm text-white outline-none text-center font-mono"
                                    />
                                </div>

                                <button onClick={() => updateItem(item.id, 'isPaid', !item.isPaid)} className={`p-3 rounded-lg border transition flex-shrink-0 ${item.isPaid ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'bg-gray-800 border-gray-700 text-gray-600 hover:text-white'}`} title={item.isPaid ? "Marcado como Pago" : "Marcar como Pago"}>
                                    {item.isPaid ? <CheckCircle2 size={18}/> : <Circle size={18}/>}
                                </button>

                                {/* Botão Excluir Desktop */}
                                <button onClick={() => removeLine(item.id)} className="hidden sm:block p-3 rounded-lg text-gray-600 hover:text-red-500 hover:bg-red-500/10 transition flex-shrink-0" disabled={items.length === 1}>
                                    <Trash2 size={18}/>
                                </button>
                            </div>
                        </div>
                    ))}
                    
                    <button onClick={addNewLine} className="w-full py-4 sm:py-3 border border-dashed border-gray-700 rounded-xl text-gray-500 hover:text-white hover:border-gray-500 transition flex items-center justify-center gap-2 text-sm mt-4">
                        <Plus size={16}/> Adicionar item
                    </button>
                </div>

                {/* RODAPÉ RESPONSIVO */}
                <div className="p-5 sm:p-6 border-t border-gray-800 bg-[#0a0a0a] rounded-b-3xl flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="w-full sm:w-auto text-center sm:text-left">
                        <p className="text-gray-500 text-xs uppercase font-bold">Total a lançar</p>
                        <p className={`text-2xl font-bold font-mono ${currentBankStyle.text.replace('text-white', 'text-gray-200')}`}>
                            R$ {totalBatch.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                    </div>
                    <button onClick={handleSaveBatch} disabled={isSaving || totalBatch === 0} className={`w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-white flex items-center justify-center gap-2 shadow-lg transition ${isSaving ? 'bg-gray-700 cursor-wait' : `${currentBankStyle.color} hover:brightness-110`}`}>
                        {isSaving ? <Loader2 className="animate-spin"/> : <Save size={20}/>}
                        {isSaving ? "Salvando..." : "Lançar Fatura"}
                    </button>
                </div>
            </div>
        </div>
    );
}