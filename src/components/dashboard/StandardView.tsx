import React, { useState } from 'react';
import {
    TrendingUp, TrendingDown, CheckCircle2, AlertCircle,
    Wallet, CreditCard, DollarSign,
    ShoppingCart, Home, Car, Utensils, Zap, GraduationCap,
    HeartPulse, Plane, Gamepad2, Smartphone, Check, Clock,
    FileText, Trash2, Pencil, List, AlertTriangle,
    ChevronDown, ChevronUp 
} from 'lucide-react';

// --- MAPA DE ÍCONES ---
const ICON_MAP: any = {
    'shopping-cart': ShoppingCart, 'home': Home, 'car': Car, 'utensils': Utensils,
    'zap': Zap, 'graduation-cap': GraduationCap, 'heart-pulse': HeartPulse,
    'plane': Plane, 'gamepad-2': Gamepad2, 'smartphone': Smartphone, 'dollar-sign': DollarSign
};

// --- ESTILOS DOS BANCOS ---
const BANK_STYLES: any = {
    'nubank': { label: 'Nubank', color: 'bg-[#820AD1]', bg: 'bg-[#820AD1]/10', border: 'border-[#820AD1]/30', text: 'text-[#a958e8]', icon: 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Nubank_logo_2021.svg' },
    'inter': { label: 'Inter', color: 'bg-[#FF7A00]', bg: 'bg-[#FF7A00]/10', border: 'border-[#FF7A00]/30', text: 'text-[#ff9638]', icon: 'https://upload.wikimedia.org/wikipedia/commons/0/01/Inter_RGB_300_dpi.png' },
    'bb': { label: 'BB', color: 'bg-[#F8D117]', bg: 'bg-[#F8D117]/10', border: 'border-[#F8D117]/30', text: 'text-[#fae064]', icon: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Funda%C3%A7%C3%A3o_Banco_do_Brasil_-_logo_2.svg' },
    'itau': { label: 'Itaú', color: 'bg-[#EC7000]', bg: 'bg-[#EC7000]/10', border: 'border-[#EC7000]/30', text: 'text-[#ff9233]', icon: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Ita%C3%BA_Unibanco_logo_2023.svg' },
    'santander': { label: 'Santander', color: 'bg-[#CC0000]', bg: 'bg-[#CC0000]/10', border: 'border-[#CC0000]/30', text: 'text-[#ff4d4d]', icon: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Banco_Santander_Logotipo.svg' },
    'caixa': { label: 'Caixa', color: 'bg-[#005CA9]', bg: 'bg-[#005CA9]/10', border: 'border-[#005CA9]/30', text: 'text-[#4ea4eb]', icon: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Caixa_Econ%C3%B4mica_Federal_logo_1997.svg' },
    'bradesco': { label: 'Bradesco', color: 'bg-[#CC092F]', bg: 'bg-[#CC092F]/10', border: 'border-[#CC092F]/30', text: 'text-[#ff4d6f]', icon: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Banco_Bradesco_logo.svg' },
    'c6': { label: 'C6 Bank', color: 'bg-[#222]', bg: 'bg-gray-800', border: 'border-gray-600', text: 'text-gray-300', icon: 'https://upload.wikimedia.org/wikipedia/commons/7/77/Logo_C6_Bank.svg' },
    'money': { label: 'Dinheiro', color: 'bg-emerald-600', bg: 'bg-emerald-900/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: null },
    'outros': { label: 'Outros', color: 'bg-gray-700', bg: 'bg-gray-800/50', border: 'border-gray-700', text: 'text-gray-400', icon: null },
};

// --- COMPONENTE CARD ---
const Card = ({ title, value, icon: Icon, type, extraLabel, subValueLabel, elementId }: any) => {
    let bgClass = "bg-[#0f1219] border-gray-800 hover:border-cyan-500/30";
    let textClass = "text-white";
    let iconBgClass = "bg-cyan-500/10 text-cyan-400";
    let glowClass = "from-cyan-600/10";

    if (type === 'negative') {
        bgClass = "bg-red-950/20 border-red-900/50";
        textClass = "text-red-500";
        iconBgClass = "bg-red-500/10 text-red-400";
        glowClass = "from-red-600/10";
    } else if (type === 'warning') {
        bgClass = "bg-orange-950/20 border-orange-900/50 hover:border-orange-500/50";
        textClass = "text-orange-200";
        iconBgClass = "bg-orange-500/10 text-orange-400";
        glowClass = "from-orange-600/10";
    } else if (type === 'income') {
        textClass = "text-emerald-400";
        iconBgClass = "bg-emerald-500/10 text-emerald-400";
        glowClass = "from-emerald-600/10";
    }

    return (
        <div id={elementId} className={`backdrop-blur-md border p-5 md:p-6 rounded-2xl transition duration-300 group relative overflow-hidden h-full shadow-lg ${bgClass}`}>
            <div className="flex justify-between items-start z-10 relative">
                <div>
                    <p className="text-gray-400 text-xs md:text-sm font-medium mb-1 uppercase tracking-wide">{title}</p>
                    <h3 className={`text-2xl md:text-3xl font-bold tracking-tight ${textClass}`}>
                        R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </h3>
                    {extraLabel && <p className="text-[10px] md:text-xs text-emerald-400 mt-2 font-mono bg-emerald-900/20 inline-block px-2 py-1 rounded border border-emerald-900/30">{extraLabel}</p>}
                    {subValueLabel && <div className="mt-2 text-xs border-t border-gray-700/50 pt-2 text-gray-400">{subValueLabel}</div>}
                </div>
                <div className={`p-2 md:p-3 rounded-xl ${iconBgClass}`}>
                    <Icon size={20} className="md:w-6 md:h-6" />
                </div>
            </div>
            <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${glowClass} to-transparent rounded-full blur-3xl pointer-events-none`}></div>
        </div>
    );
};

interface StandardViewProps {
    transactions: any[];
    installments: any[];
    recurring: any[];
    activeTab: string;
    months: string[];
    setActiveTab: (tab: string) => void;
    currentMonthData: any;
    previousSurplus: number;
    displayBalance: number;
    viewingAs: any;
    selectedYear: number;
    onTogglePaid: (table: string, id: number, currentStatus: boolean) => void;
    onToggleSkip: (item: any) => void;
    onToggleDelay: (table: string, item: any) => void;
    onDelete: (table: string, id: number) => void;
    onEdit: (item: any, mode: string) => void;
    onTogglePaidMonth: (table: string, item: any) => void;
    getReceipt: (item: any, month: string) => any;
}

export default function StandardView({
    transactions, installments,  recurring, activeTab, months, setActiveTab,
    currentMonthData, previousSurplus, displayBalance, viewingAs, selectedYear,
    onTogglePaid, onToggleSkip, onToggleDelay, onDelete, onEdit, onTogglePaidMonth, getReceipt
}: StandardViewProps) {

    const [openBanks, setOpenBanks] = useState<string[]>([]);
    const toggleBank = (bankKey: string) => openBanks.includes(bankKey) ? setOpenBanks(openBanks.filter(k => k !== bankKey)) : setOpenBanks([...openBanks, bankKey]);

    const monthIndex = months.indexOf(activeTab);
    const monthMap: Record<string, string> = { 'Jan': '/01', 'Fev': '/02', 'Mar': '/03', 'Abr': '/04', 'Mai': '/05', 'Jun': '/06', 'Jul': '/07', 'Ago': '/08', 'Set': '/09', 'Out': '/10', 'Nov': '/11', 'Dez': '/12' };
    const dateFilter = `${monthMap[activeTab]}/${selectedYear}`; 

    // Helper Unificado de Datas (Exatamente igual ao do page.tsx)
    const getStartData = (item: any) => {
        if (item.start_date && item.start_date.includes('/')) {
            const p = item.start_date.split('/'); return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) };
        }
        if (item.date && item.date.includes('/')) {
            const p = item.date.split('/'); return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) };
        }
        if (item.created_at) {
            const d = new Date(item.created_at); return { m: d.getMonth(), y: d.getFullYear() };
        }
        return { m: 0, y: new Date().getFullYear() };
    };

    // --- FILTRO TRANSAÇÕES ---
    const monthTransactions = transactions.filter(t => t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby');

    // --- FILTRO RECORRENTES (Salário/Fixas) ---
    const activeRecurring = recurring.filter(r => {
        if (r.status === 'delayed' || r.status === 'standby') return false;
        
        const { m: startM, y: startY } = getStartData(r);

        if (selectedYear > startY) return true;
        if (selectedYear === startY && monthIndex >= startM) return true;
        return false;
    });

    // --- FILTRO PARCELAS (Lógica Corrigida) ---
    const groupedInstallments = installments.reduce((acc: any, curr: any) => {
        if (curr.status === 'delayed' || curr.status === 'standby') return acc;
        
        // Usa o MESMO helper para garantir consistência
        const { m: startM, y: startY } = getStartData(curr);

        // Cálculo de Ano: 12 meses de diferença para cada ano
        const monthsDiff = ((selectedYear - startY) * 12) + (monthIndex - startM);
        const actualInstallment = 1 + (curr.current_installment || 0) + monthsDiff;

        // Filtro de exibição
        if (actualInstallment < 1 || actualInstallment > curr.installments_count) return acc;

        const bank = curr.payment_method || 'outros';
        if (!acc[bank]) acc[bank] = { items: [], total: 0 };
        
        acc[bank].items.push({ ...curr, actualInstallment });
        
        // 🔥 CORREÇÃO: Força conversão para Number para evitar erro de string
        acc[bank].total += Number(curr.value_per_month || 0);
        return acc;
    }, {});
    
    const sortedBanks = Object.keys(groupedInstallments).sort((a, b) => groupedInstallments[b].total - groupedInstallments[a].total);

    // --- RENDER STANDBY ---
    const renderDelayed = () => {
        const delayedItems = [
            ...transactions.filter(t => t.status === 'delayed' || t.status === 'standby').map(t => ({ ...t, _source: 'trans', _amount: Number(t.amount) })),
            ...installments.filter(i => i.status === 'delayed' || i.status === 'standby').map(i => ({ ...i, _source: 'inst', _amount: Number(i.value_per_month) })),
            ...recurring.filter(r => r.status === 'delayed' || r.status === 'standby').map(r => ({ ...r, _source: 'recur', _amount: Number(r.value) }))
        ];

        if (delayedItems.length === 0) return null;

        return (
            <div className="mt-8 border border-red-900/30 bg-red-950/10 rounded-2xl p-6">
                <h3 className="text-red-400 font-bold flex items-center gap-2 mb-4"><AlertTriangle size={18} /> Em Stand-by (Congelados)</h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-red-900 scrollbar-track-transparent pr-2">
                    {delayedItems.map((item: any) => (
                        <div key={`del-${item._source}-${item.id}`} className="flex justify-between items-center p-3 bg-red-900/10 rounded-lg border border-red-900/20">
                            <span className="text-red-200 text-sm">{item.title}</span>
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-red-400 font-bold">R$ {item._amount.toFixed(2)}</span>
                                <button onClick={() => onToggleDelay(item._source === 'trans' ? 'transactions' : item._source === 'inst' ? 'installments' : 'recurring', item)} title="Restaurar" className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-400">Restaurar</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )
    };

    const hasDelayed = currentMonthData.delayedTotal > 0;
    const gridClass = hasDelayed ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-3";

    return (
        <div className="animate-in fade-in zoom-in duration-500">
            {/* ... SELETOR DE MÊS ... */}
            <div className="flex justify-between items-center mb-6 overflow-x-auto pb-2 scrollbar-hide">
                <div className="flex bg-gray-900/80 p-1.5 rounded-2xl border border-gray-800 shadow-xl backdrop-blur-md">
                    {months.map(m => (
                        <button key={m} onClick={() => setActiveTab(m)} className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-300 relative ${activeTab === m ? 'text-black shadow-lg scale-105' : 'text-gray-500 hover:text-gray-300'}`}>
                            {activeTab === m && (<div className="absolute inset-0 bg-gradient-to-tr from-cyan-400 to-blue-500 rounded-xl" />)}
                            <span className="relative z-10">{m}</span>
                        </button>
                    ))}
                </div>
                {viewingAs && (<div className="hidden md:flex items-center gap-2 bg-purple-900/20 border border-purple-500/30 px-4 py-2 rounded-xl"><div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div><span className="text-purple-300 text-xs font-bold uppercase tracking-wider">Visualizando Cliente</span></div>)}
            </div>

            {/* ... CARDS DO TOPO ... */}
            <div className={`grid gap-4 mb-8 ${gridClass}`}>
                <Card elementId="card-saldo" title="Saldo Previsto" value={displayBalance} icon={Wallet} type={displayBalance >= 0 ? 'income' : 'negative'} extraLabel={previousSurplus > 0 ? `+ R$ ${previousSurplus.toFixed(2)} (Mês Passado)` : null} />
                <Card title="Entradas" value={currentMonthData.income} icon={TrendingUp} type="income" />
                <Card title="Saídas Totais" value={currentMonthData.expenseTotal} icon={TrendingDown} type="expense" subValueLabel={currentMonthData.accumulatedDebt > 0 ? (<span className="text-red-400 font-bold flex items-center gap-1"><AlertCircle size={12} /> + R$ {currentMonthData.accumulatedDebt.toFixed(2)} Pendente</span>) : null} />
                {hasDelayed && (<Card title="Em Stand-by" value={currentMonthData.delayedTotal} icon={Clock} type="warning" subValueLabel="Valores Adiados" />)}
            </div>

            {/* --- LAYOUT COMPACTO 3 COLUNAS --- */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
                {/* COLUNA 1: EXTRATO */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2"><div className="w-1 h-6 bg-cyan-500 rounded-full"></div> Extrato do Mês</h3>
                        <span className="text-xs text-gray-500 font-mono">{monthTransactions.length} itens</span>
                    </div>

                    <div className="bg-[#0f0f10] border border-gray-800/50 rounded-3xl overflow-hidden max-h-[600px] flex flex-col">
                        <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                            {monthTransactions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-[200px] text-gray-600 gap-3">
                                    <div className="bg-gray-800/50 p-4 rounded-full"><List size={32} opacity={0.5} /></div>
                                    <p className="text-sm">Nenhuma movimentação avulsa.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-800/50">
                                    {monthTransactions.map(item => {
                                        const Icon = item.icon && ICON_MAP[item.icon] ? ICON_MAP[item.icon] : (item.type === 'income' ? TrendingUp : TrendingDown);
                                        return (
                                            <div key={item.id} className="group p-4 hover:bg-white/[0.02] transition flex items-center justify-between">
                                                <div className="flex items-center gap-4">
                                                    <div onClick={() => onTogglePaid('transactions', item.id, item.is_paid)} className={`cursor-pointer w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${item.is_paid ? 'bg-emerald-500/20 text-emerald-500' : 'bg-gray-800 text-gray-500 group-hover:bg-gray-700'}`}>
                                                        {item.is_paid ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                                                    </div>
                                                    <div>
                                                        <p className={`font-bold text-sm ${item.is_paid ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{item.title}</p>
                                                        <p className="text-xs text-gray-500 flex items-center gap-1">{item.category} • {item.date}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`font-mono font-bold text-sm ${item.type === 'income' ? 'text-emerald-400' : 'text-gray-300'}`}>
                                                        {item.type === 'income' ? '+' : '-'} R$ {Number(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </p>
                                                    <div className="flex justify-end gap-2 mt-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">                                                        <button onClick={() => onToggleDelay('transactions', item)} title="Congelar" className="text-gray-500 hover:text-orange-400"><Clock size={14} /></button>
                                                        <button onClick={() => onEdit(item, item.type)} className="text-gray-500 hover:text-cyan-400"><Pencil size={14} /></button>
                                                        <button onClick={() => onDelete('transactions', item.id)} className="text-gray-500 hover:text-red-400"><Trash2 size={14} /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                    {renderDelayed()}
                </div>

                {/* COLUNA 2: BANCOS */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2"><div className="w-1 h-6 bg-purple-500 rounded-full"></div> Cartões & Faturas</h3>
                    </div>

                    <div className="space-y-3 max-h-[700px] overflow-y-auto scrollbar-thin scrollbar-thumb-purple-900/30 scrollbar-track-transparent pr-1">
                        {sortedBanks.length === 0 ? (
                            <div className="bg-[#0f0f10] border border-gray-800/50 rounded-3xl p-8 flex flex-col items-center justify-center text-center text-gray-600 gap-3 min-h-[200px]">
                                <CreditCard size={32} opacity={0.5} />
                                <p className="text-sm">Sem faturas para este mês.</p>
                            </div>
                        ) : (
                            sortedBanks.map(bankKey => {
                                const group = groupedInstallments[bankKey];
                                const style = BANK_STYLES[bankKey] || BANK_STYLES['outros'];
                                const isOpen = openBanks.includes(bankKey);

                                return (
                                    <div key={bankKey} className={`rounded-2xl border overflow-hidden transition-all duration-300 ${style.bg} ${style.border} ${isOpen ? 'shadow-lg shadow-black/40' : 'opacity-90 hover:opacity-100'}`}>
                                        <div onClick={() => toggleBank(bankKey)} className="p-4 flex justify-between items-center cursor-pointer select-none hover:bg-white/5 active:bg-white/10 transition">
                                            <div className="flex items-center gap-3">
                                                {style.icon ? <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center p-1.5 shadow-sm"><img src={style.icon} className="w-full h-full object-contain" style={{ filter: bankKey === 'nubank' ? 'none' : '' }} /></div> : <div className={`w-8 h-8 rounded-full flex items-center justify-center bg-black/20 ${style.text}`}><CreditCard size={16} /></div>}
                                                <div>
                                                    <h4 className={`font-bold text-sm ${style.text}`}>{style.label}</h4>
                                                    <p className="text-[10px] text-gray-400/80 uppercase tracking-wider font-bold">{isOpen ? `Fatura de ${activeTab}` : `${group.items.length} compras`}</p>
                                                </div>
                                            </div>
                                            <div className="text-right flex items-center gap-3">
                                                <div>
                                                    <p className="text-[10px] text-gray-400">Total da Fatura</p>
                                                    <p className="text-white font-bold font-mono">R$ {group.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                </div>
                                                {isOpen ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
                                            </div>
                                        </div>
                                        {isOpen && (
                                            <div className="divide-y divide-gray-700/20 bg-black/20 animate-in slide-in-from-top-2 duration-200">
                                                {group.items.map((item: any) => {
                                                    const tag = `${activeTab}/${selectedYear}`;
                                                    const isPaid = item.paid_months?.includes(tag);
                                                    const Icon = item.icon && ICON_MAP[item.icon] ? ICON_MAP[item.icon] : ShoppingCart;

                                                    return (
                                                        <div key={item.id} className="group p-3 flex items-center justify-between hover:bg-white/5 transition">
                                                            <div className="flex items-center gap-3">
                                                                <div onClick={() => onTogglePaidMonth('installments', item)} className={`cursor-pointer w-8 h-8 rounded-lg flex items-center justify-center transition-all ${isPaid ? 'bg-emerald-500/20 text-emerald-500' : 'bg-gray-800/50 text-gray-500 hover:text-white'}`}>
                                                                    {isPaid ? <Check size={14} /> : <span className="text-[10px] font-bold">{item.actualInstallment}x</span>}
                                                                </div>
                                                                <div className="overflow-hidden">
                                                                    <p className={`text-sm font-medium truncate max-w-[140px] ${isPaid ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{item.title}</p>
                                                                    <p className="text-[10px] text-gray-500 flex items-center gap-1"><Icon size={10} /> <span>{item.actualInstallment}/{item.installments_count}</span> <span className="text-gray-600 mx-0.5">•</span> <span className="text-gray-400">{item.due_day} {activeTab}</span></p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className={`font-mono text-sm font-medium ${isPaid ? 'text-gray-600' : 'text-gray-300'}`}>R$ {Number(item.value_per_month).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                                <div className="flex justify-end gap-2 mt-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">                                                                    <button onClick={() => onToggleDelay('installments', item)} className="text-gray-500 hover:text-orange-400" title="Stand-by"><Clock size={12} /></button>
                                                                    <button onClick={() => onEdit(item, 'installment')} className="text-gray-500 hover:text-cyan-400" title="Editar"><Pencil size={12} /></button>
                                                                    <button onClick={() => onDelete('installments', item.id)} className="text-gray-500 hover:text-red-400" title="Excluir"><Trash2 size={12} /></button>
                                                                    {getReceipt(item, activeTab) && (<a href={getReceipt(item, activeTab)} target="_blank" className="text-emerald-500 hover:text-emerald-300" title="Ver Recibo"><FileText size={12} /></a>)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>

                {/* COLUNA 3: RECORRENTES */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2"><div className="w-1 h-6 bg-emerald-500 rounded-full"></div> Recorrentes</h3>
                    </div>

                    <div className="bg-[#0f0f10] border border-gray-800/50 rounded-3xl overflow-hidden max-h-[600px] flex flex-col">
                        <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                            <div className="bg-emerald-900/10 border-b border-emerald-500/20 p-3">
                                <p className="text-[10px] uppercase font-bold text-emerald-500 tracking-wider mb-2 ml-1">Renda Fixa</p>
                                {activeRecurring.filter(r => r.type === 'income').length === 0 ? (
                                    <p className="text-xs text-gray-600 italic ml-1">Nenhuma renda fixa.</p>
                                ) : (
                                    activeRecurring.filter(r => r.type === 'income').map(item => {
                                        const isSkipped = item.skipped_months?.includes(activeTab);
                                        return (
                                            <div key={item.id} className={`flex items-center justify-between p-2 rounded-lg mb-1 ${isSkipped ? 'opacity-50' : ''}`}>
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center"><DollarSign size={14} /></div>
                                                    <span className="text-sm font-bold text-gray-200">{item.title}</span>
                                                </div>
                                                <span className="text-emerald-400 font-mono font-bold text-sm">R$ {Number(item.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                                            </div>
                                        )
                                    })
                                )}
                            </div>

                            <div className="p-2">
                                <p className="text-[10px] uppercase font-bold text-gray-500 tracking-wider mb-2 mt-2 ml-2">Contas a Pagar</p>
                                {activeRecurring.filter(r => r.type === 'expense').length === 0 ? (
                                    <div className="text-center py-8 text-gray-600 text-sm">Tudo limpo!</div>
                                ) : (
                                    activeRecurring.filter(r => r.type === 'expense').map(item => {
                                        const tag = `${activeTab}/${selectedYear}`;
                                        const isPaid = item.paid_months?.includes(tag);
                                        const isSkipped = item.skipped_months?.includes(activeTab);
                                        const Icon = item.icon && ICON_MAP[item.icon] ? ICON_MAP[item.icon] : Home;

                                        return (
                                            <div key={item.id} className={`group p-3 rounded-xl border mb-2 transition flex items-center justify-between ${isSkipped ? 'border-dashed border-gray-800 opacity-50 bg-transparent' : isPaid ? 'bg-gray-900/50 border-gray-800' : 'bg-gray-800/30 border-gray-700 hover:border-gray-600'}`}>
                                                <div className="flex items-center gap-3">
                                                    <div onClick={() => onTogglePaidMonth('recurring', item)} className={`cursor-pointer w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isPaid ? 'bg-emerald-500/20 text-emerald-500' : 'bg-black text-gray-400 group-hover:text-white'}`}>
                                                        {isPaid ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                                                    </div>
                                                    <div>
                                                        <p className={`font-bold text-sm ${isPaid ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{item.title}</p>
                                                        <p className="text-[10px] text-gray-500 flex items-center gap-1">Vence dia {item.due_day} {isSkipped && <span className="text-orange-500 font-bold ml-1">(Pular)</span>}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`font-mono font-bold text-sm ${isPaid ? 'text-gray-600' : 'text-gray-300'}`}>R$ {Number(item.value).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                                                    <div className="flex justify-end gap-2 mt-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">                                                        <button onClick={() => onToggleDelay('recurring', item)} title="Stand-by" className="text-gray-500 hover:text-orange-400"><Clock size={12} /></button>
                                                        <button onClick={() => onEdit(item, 'fixed_expense')} className="text-gray-500 hover:text-cyan-400"><Pencil size={12} /></button>
                                                        <button onClick={() => onDelete('recurring', item.id)} className="text-gray-500 hover:text-red-400"><Trash2 size={12} /></button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}