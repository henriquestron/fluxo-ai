import React, { useState } from 'react';
import {
    TrendingUp, TrendingDown, CheckCircle2, AlertCircle,
    Wallet, CreditCard, DollarSign,
    ShoppingCart, Home, Car, Utensils, Zap, GraduationCap,
    HeartPulse, Plane, Gamepad2, Smartphone, Check, Clock,
    FileText, Trash2, Pencil, List, AlertTriangle,
    ChevronDown, ChevronUp, X, RotateCcw,
    Paperclip, Sparkles, PieChart, Calendar, Banknote, Eye
} from 'lucide-react';
import { Transaction, Installment, Recurring } from '@/types';

// --- MAPA DE ÍCONES (mantido) ---
const ICON_MAP: any = {
    'shopping-cart': ShoppingCart, 'home': Home, 'car': Car, 'utensils': Utensils,
    'zap': Zap, 'graduation-cap': GraduationCap, 'heart-pulse': HeartPulse,
    'plane': Plane, 'gamepad-2': Gamepad2, 'smartphone': Smartphone, 'dollar-sign': DollarSign
};

// --- ESTILOS DOS BANCOS (mantido) ---
const BANK_STYLES: any = {
    'nubank': { label: 'Nubank', color: 'bg-[#820AD1]', bg: 'bg-[#820AD1]/5', border: 'border-[#820AD1]/30', text: 'text-[#a958e8]', icon: 'https://upload.wikimedia.org/wikipedia/commons/f/f7/Nubank_logo_2021.svg' },
    'inter': { label: 'Inter', color: 'bg-[#FF7A00]', bg: 'bg-[#FF7A00]/5', border: 'border-[#FF7A00]/30', text: 'text-[#ff9638]', icon: 'https://upload.wikimedia.org/wikipedia/commons/0/01/Inter_RGB_300_dpi.png' },
    'bb': { label: 'BB', color: 'bg-[#F8D117]', bg: 'bg-[#F8D117]/5', border: 'border-[#F8D117]/30', text: 'text-[#fae064]', icon: 'https://upload.wikimedia.org/wikipedia/commons/1/1a/Funda%C3%A7%C3%A3o_Banco_do_Brasil_-_logo_2.svg' },
    'itau': { label: 'Itaú', color: 'bg-[#EC7000]', bg: 'bg-[#EC7000]/5', border: 'border-[#EC7000]/30', text: 'text-[#ff9233]', icon: 'https://upload.wikimedia.org/wikipedia/commons/1/19/Ita%C3%BA_Unibanco_logo_2023.svg' },
    'santander': { label: 'Santander', color: 'bg-[#CC0000]', bg: 'bg-[#CC0000]/5', border: 'border-[#CC0000]/30', text: 'text-[#ff4d4d]', icon: 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Banco_Santander_Logotipo.svg' },
    'caixa': { label: 'Caixa', color: 'bg-[#005CA9]', bg: 'bg-[#005CA9]/5', border: 'border-[#005CA9]/30', text: 'text-[#4ea4eb]', icon: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Caixa_Econ%C3%B4mica_Federal_logo_1997.svg' },
    'bradesco': { label: 'Bradesco', color: 'bg-[#CC092F]', bg: 'bg-[#CC092F]/5', border: 'border-[#CC092F]/30', text: 'text-[#ff4d6f]', icon: 'https://upload.wikimedia.org/wikipedia/commons/c/c3/Banco_Bradesco_logo.svg' },
    'c6': { label: 'C6 Bank', color: 'bg-[#222]', bg: 'bg-gray-800/30', border: 'border-gray-600', text: 'text-gray-300', icon: 'https://upload.wikimedia.org/wikipedia/commons/7/77/Logo_C6_Bank.svg' },
    'picpay': { label: 'PicPay', color: 'bg-[#11C76F]', bg: 'bg-[#11C76F]/10', border: 'border-[#11C76F]/30', text: 'text-[#11C76F]', icon: 'https://upload.wikimedia.org/wikipedia/commons/5/5e/PicPay_Logogrande.png' },
    'money': { label: 'Dinheiro', color: 'bg-emerald-600', bg: 'bg-emerald-900/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: null },
    'outros': { label: 'Outros', color: 'bg-gray-700', bg: 'bg-gray-800/30', border: 'border-gray-700', text: 'text-gray-400', icon: null },
};

// --- COMPONENTE METRIC CARD (corrigido) ---
const MetricCard = ({ title, value, icon: Icon, trend, trendValue, elementId, badge }: any) => {
    const trendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : null;
    const trendColor = trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-gray-400';
    return (
        <div id={elementId} className="group relative bg-gradient-to-br from-gray-900/80 to-gray-800/40 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-5 transition-all duration-300 hover:scale-[1.02] hover:border-cyan-500/30 hover:shadow-lg hover:shadow-cyan-500/10">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">{title}</p>
                    <h3 className="text-2xl font-bold text-white mt-1 tracking-tight">
                        R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </h3>
                    {trendValue && (
                        <div className="flex items-center gap-1 mt-2">

                            <span className={`text-xs font-medium ${trendColor}`}>{trendValue}</span>
                        </div>
                    )}
                    {badge && <span className="inline-block mt-2 text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">{badge}</span>}
                </div>
                <div className={`p-2 rounded-xl transition-colors ${title === 'Em Stand-by' && value > 0 ? 'bg-amber-500/20 text-amber-400 animate-pulse' : 'bg-cyan-500/10 text-cyan-400 group-hover:bg-cyan-500/20'}`}>
                    <Icon size={22} />
                </div>
            </div>
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
        </div>
    );
};

// --- COMPONENTE DE PROGRESSO ---
const ProgressBar = ({ current, total, color }: { current: number; total: number; color: string }) => {
    const percent = (current / total) * 100;
    return (
        <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${percent}%` }} />
        </div>
    );
};

interface ModernViewProps {
    transactions: Transaction[];
    installments: Installment[];
    recurring: Recurring[];
    activeTab: string;
    months: string[];
    setActiveTab: (tab: string) => void;
    currentMonthData: any;
    previousSurplus: number;
    displayBalance: number;
    viewingAs: any;
    selectedYear: number;
    onTogglePaid: (table: string, id: number, currentStatus: boolean) => void;
    onToggleSkip: (item: Recurring) => void;
    onToggleDelay: (table: string, item: any) => void;
    onDelete: (table: string, id: number) => void;
    onEdit: (item: any, mode: string) => void;
    onTogglePaidMonth: (table: string, item: any) => void;
    getReceipt: (item: any, month: string) => any;
}

export default function ModernView({
    transactions, installments, recurring, activeTab, months, setActiveTab,
    currentMonthData, previousSurplus, displayBalance, viewingAs, selectedYear,
    onTogglePaid, onToggleSkip, onToggleDelay, onDelete, onEdit, onTogglePaidMonth, getReceipt
}: ModernViewProps) {

    const [internalTab, setInternalTab] = useState<'recurring' | 'installments'>('recurring');
    const [openBanks, setOpenBanks] = useState<string[]>([]);
    const toggleBank = (bankKey: string) => openBanks.includes(bankKey) ? setOpenBanks(openBanks.filter(k => k !== bankKey)) : setOpenBanks([...openBanks, bankKey]);

    const [selectedItems, setSelectedItems] = useState<{ id: any, table: string }[]>([]);
    const toggleSelection = (id: any, table: string) => {
        setSelectedItems(prev => {
            const exists = prev.find(item => item.id === id && item.table === table);
            if (exists) return prev.filter(item => !(item.id === id && item.table === table));
            return [...prev, { id, table }];
        });
    };
    const handleBulkDelete = async () => {
        if (confirm(`Excluir ${selectedItems.length} conta(s) permanentemente?`)) {
            for (const item of selectedItems) await onDelete(item.table, item.id);
            setSelectedItems([]);
        }
    };

    // --- HELPERS DE DATA ---
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

    const monthIndex = months.indexOf(activeTab);
    const monthMap: Record<string, string> = { 'Jan': '/01', 'Fev': '/02', 'Mar': '/03', 'Abr': '/04', 'Mai': '/05', 'Jun': '/06', 'Jul': '/07', 'Ago': '/08', 'Set': '/09', 'Out': '/10', 'Nov': '/11', 'Dez': '/12' };
    const dateFilter = `${monthMap[activeTab]}/${selectedYear}`;
    const currentTag = `${activeTab}/${selectedYear}`;

    const isPaidThisMonth = (item: any, isTrans = false) => {
        if (isTrans) return item.is_paid;
        return item.paid_months?.includes(currentTag) || item.paid_months?.includes(activeTab);
    };

    // --- FILTROS ---
    const monthTransactions = transactions.filter(t =>
        t.date?.includes(dateFilter) &&
        ((t.status !== 'delayed' && t.status !== 'standby') || isPaidThisMonth(t, true))
    );

    const activeRecurring = recurring.filter(r => {
        const paid = isPaidThisMonth(r);
        if ((r.status === 'delayed' || r.status === 'standby') && !paid) return false;
        if (r.standby_months?.includes(currentTag) && !paid) return false;
        const { m: startM, y: startY } = getStartData(r);
        if (selectedYear > startY) return true;
        if (selectedYear === startY && monthIndex >= startM) return true;
        return false;
    });

    const groupedInstallments = installments.reduce((acc: any, curr: any) => {
        const paid = isPaidThisMonth(curr);
        if ((curr.status === 'delayed' || curr.status === 'standby') && !paid) return acc;
        if (curr.standby_months?.includes(currentTag) && !paid) return acc;
        const { m: startM, y: startY } = getStartData(curr);
        const monthsDiff = ((selectedYear - startY) * 12) + (monthIndex - startM);
        const actualInstallment = 1 + (curr.current_installment || 0) + monthsDiff;
        if (actualInstallment < 1 || actualInstallment > curr.installments_count) return acc;
        const bank = curr.payment_method || 'outros';
        if (!acc[bank]) acc[bank] = { items: [], total: 0 };
        const baseValue = Number(curr.value_per_month || 0);
        acc[bank].items.push({ ...curr, actualInstallment, value_per_month: baseValue });
        acc[bank].total += baseValue;
        return acc;
    }, {});

    const sortedBanks = Object.keys(groupedInstallments).sort((a, b) => groupedInstallments[b].total - groupedInstallments[a].total);

    // --- FUNÇÃO PARA CALCULAR STAND-BY (CORRIGIDA) ---
    const getDelayedStats = () => {
        let total = 0;
        let count = 0;
        // Transações
        transactions.forEach(t => {
            if ((t.status === 'delayed' || t.status === 'standby') && !isPaidThisMonth(t, true)) {
                total += Number(t.amount);
                count++;
            }
        });
        // Parcelas
        installments.forEach(i => {
            const standbyArr = Array.isArray(i.standby_months) ? i.standby_months : [];
            if ((i.status === 'delayed' || i.status === 'standby') && standbyArr.length === 0 && !isPaidThisMonth(i)) {
                total += Number(i.value_per_month);
                total += Number(i.value_per_month); // Se não tem standby_months e está delayed/standby, adiciona
                count++;
            }
            standbyArr.forEach((tag: string) => {
                const isPaid = i.paid_months?.includes(tag) || i.paid_months?.includes(tag.split('/')[0]);
                if (!isPaid) {
                    total += Number(i.value_per_month);
                    count++;
                }
            });
        });
        // Recorrentes (somente despesas)
        recurring.forEach(r => {
            if (r.type === 'expense') {
                const standbyArr = Array.isArray(r.standby_months) ? r.standby_months : [];
                if ((r.status === 'delayed' || r.status === 'standby') && standbyArr.length === 0 && !isPaidThisMonth(r)) {
                    total += Number(r.value);
                    total += Number(r.value); // Se não tem standby_months e está delayed/standby, adiciona
                    count++;
                }
                standbyArr.forEach((tag: string) => {
                    const isPaid = r.paid_months?.includes(tag) || r.paid_months?.includes(tag.split('/')[0]);
                    if (!isPaid) {
                        total += Number(r.value);
                        count++;
                    }
                });
            }
        });
        return { total, count };
    };

    const delayedStats = getDelayedStats();

    // --- RENDER DO CONGELADOR (usando delayedStats) ---
    const renderDelayed = () => {
        const delayedItems: any[] = [];
        transactions.forEach(t => {
            if ((t.status === 'delayed' || t.status === 'standby') && !isPaidThisMonth(t, true)) {
                delayedItems.push({ ...t, _source: 'trans', _amount: Number(t.amount) });
            }
        });
        installments.forEach(i => {
            const standbyArr = Array.isArray(i.standby_months) ? i.standby_months : [];
            if ((i.status === 'delayed' || i.status === 'standby') && standbyArr.length === 0 && !isPaidThisMonth(i)) {
                delayedItems.push({ ...i, _source: 'inst', _amount: Number(i.value_per_month) });
            }
            standbyArr.forEach((tag: string) => {
                const isPaid = i.paid_months?.includes(tag) || i.paid_months?.includes(tag.split('/')[0]);
                if (!isPaid) {
                    delayedItems.push({ ...i, _source: 'inst', _amount: Number(i.value_per_month), _targetTag: tag, _displayTag: tag });
                }
            });
        });
        recurring.forEach(r => {
            if (r.type === 'expense') {
                const standbyArr = Array.isArray(r.standby_months) ? r.standby_months : [];
                if ((r.status === 'delayed' || r.status === 'standby') && standbyArr.length === 0 && !isPaidThisMonth(r)) {
                    delayedItems.push({ ...r, _source: 'recur', _amount: Number(r.value) });
                }
                standbyArr.forEach((tag: string) => {
                    const isPaid = r.paid_months?.includes(tag) || r.paid_months?.includes(tag.split('/')[0]);
                    if (!isPaid) {
                        delayedItems.push({ ...r, _source: 'recur', _amount: Number(r.value), _targetTag: tag, _displayTag: tag });
                    }
                });
            }
        });
        if (delayedItems.length === 0) return null;
        return (
            <div className="mt-6 border border-amber-500/30 bg-amber-500/5 rounded-2xl p-5">
                <h3 className="text-amber-400 font-bold flex items-center gap-2 mb-3"><AlertTriangle size={18} /> Contas em Stand-by ({delayedItems.length})</h3>
                <div className="space-y-2 max-h-[200px] overflow-y-auto scrollbar-thin scrollbar-thumb-amber-900/50 scrollbar-track-transparent pr-1">
                    {delayedItems.map((item, idx) => (
                        <div key={`del-${item._source}-${item.id}-${idx}`} className="flex justify-between items-center p-2 bg-amber-900/10 rounded-xl border border-amber-800/30">
                            <div>
                                <span className="text-amber-200 text-sm font-bold">{item.title}</span>
                                {item._displayTag && <span className="text-[10px] text-amber-400/80 ml-2 bg-amber-950 px-2 py-0.5 rounded">{item._displayTag}</span>}
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-amber-400">R$ {item._amount.toFixed(2)}</span>
                                <button onClick={() => onToggleDelay(item._source === 'trans' ? 'transactions' : item._source === 'inst' ? 'installments' : 'recurring', item)} className="text-xs bg-amber-500 text-black px-3 py-1.5 rounded-full hover:bg-amber-400 transition">Restaurar</button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    return (
        <div className="animate-in fade-in duration-500">
            {/* Barra de seleção em massa */}
            {selectedItems.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-4 animate-in slide-in-from-bottom-5 zoom-in-95 border border-red-500/50">
                    <span className="font-bold">{selectedItems.length} selecionada(s)</span>
                    <button onClick={handleBulkDelete} className="flex items-center gap-2 hover:text-red-200 transition"><Trash2 size={16} /> Excluir</button>
                    <button onClick={() => setSelectedItems([])} className="p-1 hover:bg-red-700 rounded-full"><X size={16} /></button>
                </div>
            )}

            {/* Header: Seletor de mês */}
            {/* Header: Seletor de mês estilizado */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-8">
                <div className="flex overflow-x-auto scrollbar-hide bg-gray-900/50 backdrop-blur-sm p-1 rounded-full border border-gray-700/70 shadow-inner gap-1">
                    {months.map(m => (
                        <button
                            key={m}
                            onClick={() => setActiveTab(m)}
                            className={`shrink-0 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${activeTab === m ? 'bg-cyan-500 text-black shadow-lg' : 'text-gray-400 hover:text-white'}`}
                        >
                            {m}
                        </button>
                    ))}
                </div>
                {viewingAs && (
                    <div className="flex items-center gap-2 bg-purple-900/20 border border-purple-500/30 px-4 py-2 rounded-full">
                        <Eye size={14} className="text-purple-400" />
                        <span className="text-purple-300 text-xs font-bold">Visualizando cliente</span>
                    </div>
                )}
            </div>

            {/* Cards superiores - corrigidos */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
                <MetricCard title="Saldo Previsto" value={displayBalance} icon={Wallet} trend={displayBalance >= 0 ? 'up' : 'down'} trendValue={previousSurplus > 0 ? `+R$ ${previousSurplus.toFixed(2)} mês ant.` : undefined} />
                <MetricCard title="Entradas" value={currentMonthData.income} icon={TrendingUp} trend="up" />  {/* removeu o +100% */}
                <MetricCard title="Saídas Totais" value={currentMonthData.expenseTotal} icon={TrendingDown} trend="down" trendValue={currentMonthData.accumulatedDebt > 0 ? `+ R$ ${currentMonthData.accumulatedDebt.toFixed(2)} pendente` : undefined} />
                <MetricCard title="Em Stand-by" value={delayedStats.total} icon={Clock} trend="down" trendValue={delayedStats.count > 0 ? `${delayedStats.count} item(s)` : 'nenhum'} badge={delayedStats.count > 0 ? `R$ ${delayedStats.total.toFixed(2)}` : undefined} />
            </div>

            {/* Layout principal: duas colunas */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Coluna esquerda */}
                <div className="lg:col-span-7 space-y-8">
                    <div className="bg-gray-900/40 backdrop-blur-sm rounded-3xl border border-gray-800/70 overflow-hidden">
                        <div className="p-5 border-b border-gray-800/50 flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-cyan-500/10 rounded-xl text-cyan-400"><List size={20} /></div>
                                <h3 className="text-lg font-bold text-white">Extrato do Mês</h3>
                            </div>
                            <span className="text-xs text-gray-500">{monthTransactions.length} movimentações</span>
                        </div>
                        <div className="max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                            {monthTransactions.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                                    <Banknote size={40} opacity={0.5} />
                                    <p className="text-sm mt-2">Nenhuma movimentação avulsa este mês</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-800/30">
                                    {monthTransactions.map(item => {
                                        const Icon = item.icon && ICON_MAP[item.icon] ? ICON_MAP[item.icon] : (item.type === 'income' ? TrendingUp : TrendingDown);
                                        const isSelected = selectedItems.some(s => s.id === item.id && s.table === 'transactions');
                                        return (
                                            <div key={item.id} className={`group p-4 flex items-center justify-between hover:bg-white/[0.03] transition ${isSelected ? 'bg-red-500/5' : ''}`}>
                                                <div className="flex items-center gap-3 flex-1">
                                                    <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(item.id, 'transactions')} className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-red-500 focus:ring-red-500 focus:ring-offset-0 cursor-pointer" />
                                                    <div onClick={() => onTogglePaid('transactions', item.id, !!item.is_paid)} className={`cursor-pointer w-9 h-9 rounded-xl flex items-center justify-center transition-all ${item.is_paid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-500 group-hover:text-gray-300'}`}>
                                                        {item.is_paid ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                                                    </div>
                                                    <div>
                                                        <p className={`font-medium text-sm ${item.is_paid ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{item.title}</p>
                                                        <p className="text-xs text-gray-500 flex gap-2 mt-0.5">
                                                            <span>{item.category}</span> • <span>{item.date}</span>
                                                            {getReceipt(item, activeTab) && <a href={getReceipt(item, activeTab)} target="_blank" className="text-emerald-500"><FileText size={12} /></a>}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`font-mono font-bold text-sm ${item.type === 'income' ? 'text-emerald-400' : 'text-gray-300'}`}>
                                                        {item.type === 'income' ? '+' : '-'} R$ {Number(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </p>
                                                    <div className="flex justify-end gap-2 mt-1 md:opacity-70 md:hover:opacity-100 transition-opacity">
                                                        <button onClick={() => onTogglePaid('transactions', item.id, !!item.is_paid)} className="text-gray-500 hover:text-emerald-400"><Check size={12} /></button>
                                                        <button onClick={() => onToggleDelay('transactions', item)} className="text-gray-500 hover:text-amber-400"><Clock size={12} /></button>
                                                        <button onClick={() => onEdit(item, item.type)} className="text-gray-500 hover:text-cyan-400"><Pencil size={12} /></button>
                                                        <button onClick={() => onDelete('transactions', item.id)} className="text-gray-500 hover:text-red-400"><Trash2 size={12} /></button>
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

                {/* Coluna direita */}
                <div className="lg:col-span-5 space-y-6">
                    <div className="bg-gray-900/40 backdrop-blur-sm rounded-3xl border border-gray-800/70 overflow-hidden">
                        <div className="flex border-b border-gray-800/50">
                            <button
                                onClick={() => setInternalTab('recurring')}
                                className={`flex-1 py-3 text-sm font-bold transition-colors ${internalTab === 'recurring' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <div className="flex items-center justify-center gap-2"><Sparkles size={16} /> Recorrentes</div>
                            </button>
                            <button
                                onClick={() => setInternalTab('installments')}
                                className={`flex-1 py-3 text-sm font-bold transition-colors ${internalTab === 'installments' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                <div className="flex items-center justify-center gap-2"><CreditCard size={16} /> Cartões</div>
                            </button>
                        </div>

                        <div className="p-4 max-h-[550px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-700">
                            {internalTab === 'recurring' ? (
                                <div className="space-y-5">
                                    {/* Renda fixa */}
                                    {/* Renda fixa */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingUp size={14} className="text-emerald-400" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Renda Fixa</span>
                                        </div>
                                        {activeRecurring.filter(r => r.type === 'income').length === 0 ? (
                                            <p className="text-gray-500 text-xs italic pl-2">Nenhuma renda cadastrada</p>
                                        ) : (
                                            activeRecurring.filter(r => r.type === 'income').map(item => {
                                                const isPaid = isPaidThisMonth(item);
                                                const isSkipped = item.skipped_months?.includes(activeTab);
                                                const isSelected = selectedItems.some(s => s.id === item.id && s.table === 'recurring');
                                                return (
                                                    <div key={item.id} className={`flex items-center justify-between p-2 rounded-xl mb-2 transition hover:bg-white/5 ${isSelected ? 'bg-red-500/5' : ''} ${isSkipped ? 'opacity-50' : ''}`}>
                                                        <div className="flex items-center gap-3 flex-1">
                                                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(item.id, 'recurring')} className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-red-500" />
                                                            <div onClick={() => onTogglePaidMonth('recurring', item)} className="cursor-pointer">
                                                                {isPaid ? <CheckCircle2 size={18} className="text-emerald-400" /> : <DollarSign size={18} className="text-gray-500" />}
                                                            </div>
                                                            <p className={`text-sm font-medium ${isPaid ? 'text-gray-500 line-through' : 'text-white'}`}>{item.title}</p>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={`font-mono font-bold text-sm ${isPaid ? 'text-gray-500' : 'text-emerald-400'}`}>
                                                                R$ {Number(item.value).toFixed(2)}
                                                            </p>
                                                            {/* 🔧 Botões sempre visíveis, com opacidade reduzida no desktop */}
                                                            <div className="flex justify-end gap-2 mt-1 md:opacity-70 md:hover:opacity-100 transition-opacity">
                                                                <button onClick={() => onTogglePaidMonth('recurring', item)} className="text-gray-500 hover:text-emerald-400" title={isPaid ? "Desfazer" : "Receber"}>
                                                                    <Check size={12} />
                                                                </button>
                                                                <button onClick={() => onToggleDelay('recurring', item)} className="text-gray-500 hover:text-amber-400" title={isSkipped ? "Voltar" : "Pular mês"}>
                                                                    <Clock size={12} />
                                                                </button>
                                                                <button onClick={() => onEdit(item, 'income')} className="text-gray-500 hover:text-cyan-400" title="Editar">
                                                                    <Pencil size={12} />
                                                                </button>
                                                                <button onClick={() => onDelete('recurring', item.id)} className="text-gray-500 hover:text-red-400" title="Excluir">
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    {/* Contas a pagar */}
                                    {/* Contas a pagar */}
                                    <div>
                                        <div className="flex items-center gap-2 mb-2">
                                            <TrendingDown size={14} className="text-red-400" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Contas a Pagar</span>
                                        </div>
                                        {activeRecurring.filter(r => r.type === 'expense').length === 0 ? (
                                            <p className="text-gray-500 text-xs italic pl-2">Todas as contas pagas!</p>
                                        ) : (
                                            activeRecurring.filter(r => r.type === 'expense').map(item => {
                                                const isPaid = isPaidThisMonth(item);
                                                const isSkipped = item.skipped_months?.includes(activeTab);
                                                const Icon = item.icon && ICON_MAP[item.icon] ? ICON_MAP[item.icon] : Home;
                                                const isSelected = selectedItems.some(s => s.id === item.id && s.table === 'recurring');
                                                return (
                                                    <div key={item.id} className={`flex items-center justify-between p-2 rounded-xl mb-2 transition hover:bg-white/5 ${isSelected ? 'bg-red-500/5' : ''} ${isSkipped ? 'opacity-50' : ''}`}>
                                                        <div className="flex items-center gap-3 flex-1">
                                                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(item.id, 'recurring')} className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-red-500" />
                                                            <div onClick={() => onTogglePaidMonth('recurring', item)} className="cursor-pointer">
                                                                {isPaid ? <CheckCircle2 size={18} className="text-emerald-400" /> : <Icon size={18} className="text-gray-500" />}
                                                            </div>
                                                            <div>
                                                                <p className={`text-sm font-medium ${isPaid ? 'text-gray-500 line-through' : 'text-white'}`}>{item.title}</p>
                                                                <p className="text-[10px] text-gray-500">Vence {item.due_day}</p>
                                                            </div>
                                                        </div>
                                                        <div className="text-right">
                                                            <p className={`font-mono font-bold text-sm ${isPaid ? 'text-gray-500' : 'text-white'}`}>
                                                                R$ {Number(item.value).toFixed(2)}
                                                            </p>
                                                            {/* 🔧 Botões sempre visíveis, com opacidade reduzida no desktop */}
                                                            <div className="flex justify-end gap-2 mt-1 md:opacity-70 md:hover:opacity-100 transition-opacity">
                                                                <button onClick={() => onTogglePaidMonth('recurring', item)} className="text-gray-500 hover:text-emerald-400" title={isPaid ? "Desfazer" : "Dar Baixa"}>
                                                                    <Check size={12} />
                                                                </button>
                                                                <button onClick={() => onToggleDelay('recurring', item)} className="text-gray-500 hover:text-amber-400" title="Stand-by">
                                                                    <Clock size={12} />
                                                                </button>
                                                                <button onClick={() => onEdit(item, 'fixed_expense')} className="text-gray-500 hover:text-cyan-400" title="Editar">
                                                                    <Pencil size={12} />
                                                                </button>
                                                                <button onClick={() => onDelete('recurring', item.id)} className="text-gray-500 hover:text-red-400" title="Excluir">
                                                                    <Trash2 size={12} />
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {sortedBanks.length === 0 ? (
                                        <div className="text-center py-12 text-gray-500">
                                            <CreditCard size={32} opacity={0.5} />
                                            <p className="text-sm mt-2">Nenhuma fatura este mês</p>
                                        </div>
                                    ) : (
                                        sortedBanks.map(bankKey => {
                                            const group = groupedInstallments[bankKey];
                                            const style = BANK_STYLES[bankKey] || BANK_STYLES['outros'];
                                            const isOpen = openBanks.includes(bankKey);
                                            return (
                                                <div key={bankKey} className={`rounded-xl border overflow-hidden transition-all duration-200 ${style.bg} ${style.border}`}>
                                                    <div onClick={() => toggleBank(bankKey)} className="p-3 flex justify-between items-center cursor-pointer hover:bg-white/5">
                                                        <div className="flex items-center gap-2">
                                                            {style.icon ? (
                                                                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center p-1"><img src={style.icon} className="w-full h-full object-contain" /></div>
                                                            ) : (
                                                                <CreditCard size={16} className={style.text} />
                                                            )}
                                                            <span className={`font-bold text-sm ${style.text}`}>{style.label}</span>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xs font-mono text-white">R$ {group.total.toFixed(2)}</span>
                                                            {isOpen ? <ChevronUp size={16} className="text-gray-500" /> : <ChevronDown size={16} className="text-gray-500" />}
                                                        </div>
                                                    </div>
                                                    {isOpen && (
                                                        <div className="divide-y divide-gray-700/20 bg-black/20 p-2">
                                                            {group.items.map((item: any) => {
                                                                const isPaid = item.paid_months?.includes(currentTag);
                                                                const Icon = item.icon && ICON_MAP[item.icon] ? ICON_MAP[item.icon] : ShoppingCart;
                                                                const isSelected = selectedItems.some(s => s.id === item.id && s.table === 'installments');
                                                                return (
                                                                    <div key={item.id} className={`flex items-center justify-between p-2 rounded-lg group ${isSelected ? 'bg-red-500/5' : ''}`}>
                                                                        <div className="flex items-center gap-2 flex-1">
                                                                            <input type="checkbox" checked={isSelected} onChange={() => toggleSelection(item.id, 'installments')} className="w-3.5 h-3.5 rounded border-gray-600 bg-gray-800 text-red-500" />
                                                                            <div onClick={() => onTogglePaidMonth('installments', item)} className="cursor-pointer w-6 h-6 rounded-md flex items-center justify-center">
                                                                                {isPaid ? <Check size={12} className="text-emerald-400" /> : <span className="text-[10px] text-gray-500">{item.actualInstallment}x</span>}
                                                                            </div>
                                                                            <div className="flex-1">
                                                                                <p className={`text-xs font-medium truncate max-w-[130px] ${isPaid ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{item.title}</p>
                                                                                <div className="flex items-center gap-2 mt-1">
                                                                                    <ProgressBar current={item.actualInstallment} total={item.installments_count} color="bg-cyan-500" />
                                                                                    <span className="text-[9px] text-gray-500">{item.actualInstallment}/{item.installments_count}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                        <div className="text-right">
                                                                            <p className={`font-mono text-xs font-bold ${isPaid ? 'text-gray-600' : 'text-white'}`}>R$ {item.value_per_month.toFixed(2)}</p>
                                                                            <div className="flex gap-1 mt-1 md:opacity-70 md:hover:opacity-100 transition-opacity">
                                                                                <button onClick={() => onTogglePaidMonth('installments', item)} className="text-gray-500 hover:text-emerald-400"><Check size={10} /></button>
                                                                                <button onClick={() => onToggleDelay('installments', item)} className="text-gray-500 hover:text-amber-400"><Clock size={10} /></button>
                                                                                <button onClick={() => onEdit(item, 'installment')} className="text-gray-500 hover:text-cyan-400"><Pencil size={10} /></button>
                                                                                <button onClick={() => onDelete('installments', item.id)} className="text-gray-500 hover:text-red-400"><Trash2 size={10} /></button>
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
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}