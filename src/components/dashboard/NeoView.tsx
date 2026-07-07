import React, { useState, useEffect } from 'react';
import { 
    TrendingUp, TrendingDown, CheckCircle2, AlertCircle, AlertTriangle,
    Wallet, CreditCard, DollarSign, ShoppingCart, Home, Car, Utensils, Zap, 
    GraduationCap, HeartPulse, Plane, Gamepad2, Smartphone, Check, Clock,
    FileText, Trash2, Pencil, List, ChevronDown, ChevronUp, X, Loader2, Eye,
    Wifi, Droplet, Shirt, Gift, Briefcase, PiggyBank, Baby, Dog, Tv, Coffee
} from 'lucide-react';
import { Transaction, Installment, Recurring } from '@/types';

// --- MAPA DE ÍCONES ---
const ICON_MAP: any = {
    'shopping-cart': '🛒', 'home': '🏠', 'car': '🚗', 'utensils': '🍔',
    'zap': '⚡', 'graduation-cap': '🎓', 'heart-pulse': '❤️',
    'plane': '✈️', 'gamepad-2': '🎮', 'smartphone': '📱', 'dollar-sign': '💲',
    'tv': '📺', 'coffee': '☕', 'droplet': '💧', 'wifi': '📶', 'shirt': '👕',
    'gift': '🎁', 'briefcase': '💼', 'piggy-bank': '🐷', 'baby': '👶', 'dog': '🐶'
};

const BANK_LOGOS: any = {
    'nubank': { label: 'Nubank', short: 'Nu', color: '#820AD1' },
    'inter': { label: 'Inter', short: 'In', color: '#FF7A00' },
    'bb': { label: 'BB', short: 'BB', color: '#F8D117' },
    'itau': { label: 'Itaú', short: 'It', color: '#EC7000' },
    'santander': { label: 'Santander', short: 'Sa', color: '#CC0000' },
    'caixa': { label: 'Caixa', short: 'Cx', color: '#005CA9' },
    'c6': { label: 'C6 Bank', short: 'C6', color: '#888888' },
    'xp': { label: 'XP', short: 'XP', color: '#FFD700' },
    'outros': { label: 'Outros', short: '💳', color: '#8899BB' }
};

interface NeoViewProps {
    transactions: Transaction[];
    installments: Installment[];
    recurring: Recurring[];
    activeTab: string;
    months: string[];
    setActiveTab: (month: string) => void;
    currentMonthData: any;
    previousSurplus: number;
    displayBalance: number;
    selectedYear: number;
    viewingAs?: any;
    onTogglePaid: (table: string, id: number, status: boolean) => void;
    onTogglePaidMonth: (table: string, item: any) => void;
    onToggleDelay: (table: string, item: any) => void;
    onDelete: (table: string, id: number) => void;
    onEdit: (item: any, mode: string) => void;
    getReceipt?: (item: any, month: string) => any;
}

export default function NeoView({
    transactions, installments, recurring, activeTab, months, setActiveTab,
    currentMonthData, previousSurplus, displayBalance, selectedYear, viewingAs,
    onTogglePaid, onTogglePaidMonth, onToggleDelay, onDelete, onEdit, 
    getReceipt = () => null
}: NeoViewProps) {

    const [openBanks, setOpenBanks] = useState<string[]>([]);
    const [selectedItems, setSelectedItems] = useState<{ id: any, table: string }[]>([]);
    const [mounted, setMounted] = useState(false);

    // Modal State
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean; title: string; message: string; type: 'alert' | 'confirm' | 'danger'; onConfirm?: () => Promise<void> | void;
    }>({ isOpen: false, title: '', message: '', type: 'alert' });
    const [modalProcessing, setModalProcessing] = useState(false);

    useEffect(() => { setMounted(true); }, []);

    // --- LÓGICA DE DADOS ---
    const isPositive = displayBalance >= 0;
    const fmt = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const toggleBank = (bankKey: string) => openBanks.includes(bankKey) ? setOpenBanks(openBanks.filter(k => k !== bankKey)) : setOpenBanks([...openBanks, bankKey]);
    const toggleSelection = (id: any, table: string) => {
        setSelectedItems(prev => prev.find(i => i.id === id && i.table === table) ? prev.filter(i => !(i.id === id && i.table === table)) : [...prev, { id, table }]);
    };

    const handleModalConfirm = async () => {
        if (modalConfig.onConfirm) {
            setModalProcessing(true);
            try { await modalConfig.onConfirm(); } 
            finally { setModalProcessing(false); setModalConfig(p => ({ ...p, isOpen: false })); }
        } else { 
            setModalConfig(p => ({ ...p, isOpen: false })); 
        }
    };

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

    const isPaidThisMonth = (item: any, isTrans = false) => isTrans ? item.is_paid : (item.paid_months?.includes(currentTag) || item.paid_months?.includes(activeTab));

    const monthTransactions = transactions.filter(t => t.date?.includes(dateFilter) && ((t.status !== 'delayed' && t.status !== 'standby') || isPaidThisMonth(t, true)));
    
    const activeRecurring = recurring.filter(r => {
        const paid = isPaidThisMonth(r);
        if ((r.status === 'delayed' || r.status === 'standby') && !paid) return false;
        if (r.standby_months?.includes(currentTag) && !paid) return false;
        const { m: startM, y: startY } = getStartData(r);
        return selectedYear > startY || (selectedYear === startY && monthIndex >= startM);
    });

    const groupedInstallments = installments.reduce((acc: any, curr: any) => {
        const paid = isPaidThisMonth(curr);
        if ((curr.status === 'delayed' || curr.status === 'standby') && !paid) return acc;
        if (curr.standby_months?.includes(currentTag) && !paid) return acc;
        const { m: startM, y: startY } = getStartData(curr);
        const actualInst = 1 + (curr.current_installment || 0) + (((selectedYear - startY) * 12) + (monthIndex - startM));
        if (actualInst < 1 || actualInst > curr.installments_count) return acc;
        const bank = curr.payment_method || 'outros';
        if (!acc[bank]) acc[bank] = { items: [], total: 0 };
        acc[bank].items.push({ ...curr, actualInst, value_per_month: Number(curr.value_per_month || 0) });
        acc[bank].total += Number(curr.value_per_month || 0);
        return acc;
    }, {});
    const sortedBanks = Object.keys(groupedInstallments).sort((a, b) => groupedInstallments[b].total - groupedInstallments[a].total);

    // Cálculo do Congelador
    const delayedItems: any[] = [];
    transactions.forEach(t => { if ((t.status === 'delayed' || t.status === 'standby') && !isPaidThisMonth(t, true)) delayedItems.push({ ...t, _s: 'transactions', _amt: Number(t.amount) }); });
    installments.forEach(i => {
        const stArr = Array.isArray(i.standby_months) ? i.standby_months : [];
        if ((i.status === 'delayed' || i.status === 'standby') && stArr.length === 0 && !isPaidThisMonth(i)) delayedItems.push({ ...i, _s: 'installments', _amt: Number(i.value_per_month) });
        stArr.forEach((tag: string) => { if (!i.paid_months?.includes(tag) && !i.paid_months?.includes(tag.split('/')[0])) delayedItems.push({ ...i, _s: 'installments', _amt: Number(i.value_per_month), _tag: tag }); });
    });
    recurring.forEach(r => {
        if (r.type === 'expense') {
            const stArr = Array.isArray(r.standby_months) ? r.standby_months : [];
            if ((r.status === 'delayed' || r.status === 'standby') && stArr.length === 0 && !isPaidThisMonth(r)) delayedItems.push({ ...r, _s: 'recurring', _amt: Number(r.value) });
            stArr.forEach((tag: string) => { if (!r.paid_months?.includes(tag) && !r.paid_months?.includes(tag.split('/')[0])) delayedItems.push({ ...r, _s: 'recurring', _amt: Number(r.value), _tag: tag }); });
        }
    });

    // --- CÁLCULO DO SCORE RING E BARRAS ---
    const inc = currentMonthData.income || 0;
    const exp = currentMonthData.expenseTotal || 0;
    let score = 100;
    if (inc > 0) score = Math.max(0, 100 - ((exp / inc) * 100));
    else if (exp > 0) score = 0;
    score = Math.round(score);

    const ringColor = score >= 70 ? '#00C98D' : score >= 40 ? '#F59E0B' : '#FF3D6B';
    const ringOffset = mounted ? 220 - (220 * (score / 100)) : 220;
    const budgetPct = mounted && inc > 0 ? Math.min(100, (exp / inc) * 100) : 0;

    const recExpenses = activeRecurring.filter(r => r.type === 'expense');
    const recPaid = recExpenses.filter(r => isPaidThisMonth(r)).length;
    const recPct = mounted && recExpenses.length > 0 ? (recPaid / recExpenses.length) * 100 : 0;

    // Ações do Modal
    const handleBulkDelete = () => setModalConfig({ isOpen: true, title: 'Zona de Risco', message: `Excluir permanentemente as ${selectedItems.length} contas selecionadas?`, type: 'danger', onConfirm: async () => { for (const i of selectedItems) await onDelete(i.table, i.id); setSelectedItems([]); setModalConfig(p => ({ ...p, isOpen: false })); } });
    const handleBulkAct = (bank: string, items: any[], action: 'pay' | 'delay') => {
        const pendentes = items.filter(i => !i.paid_months?.includes(currentTag));
        if (pendentes.length === 0) return setModalConfig({ isOpen: true, title: 'Tudo Certo!', message: 'Nenhuma conta pendente neste grupo.', type: 'alert' });
        setModalConfig({ isOpen: true, title: action === 'pay' ? `Pagar tudo de ${bank}?` : `Adiar contas de ${bank}?`, message: action === 'pay' ? `Dar baixa em ${pendentes.length} parcelas?` : `Congelar ${pendentes.length} parcelas?`, type: 'confirm', onConfirm: async () => { for (const i of pendentes) { if (action === 'pay') await onTogglePaidMonth('installments', i); else await onToggleDelay('installments', i); } setModalConfig(p => ({ ...p, isOpen: false })); } });
    };

    return (
        <div className="min-h-screen bg-[#080C14] text-[#F0F4FF] selection:bg-[#00C98D] selection:text-black">

            {/* MODAL */}
            {modalConfig.isOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[999] flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-[#0F1520] border border-[#253550] rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl animate-in zoom-in-95">
                        <div className="text-4xl mb-4">{modalConfig.type === 'danger' ? '⚠️' : '✅'}</div>
                        <h3 className="text-lg font-bold text-white mb-2">{modalConfig.title}</h3>
                        <p className="text-sm text-[#8899BB] leading-relaxed mb-6">{modalConfig.message}</p>
                        <div className="flex gap-3">
                            {modalConfig.type !== 'alert' && (
                                <button onClick={() => setModalConfig(p => ({ ...p, isOpen: false }))} disabled={modalProcessing} className="flex-1 py-3 bg-[#1C2840] text-[#8899BB] rounded-xl font-bold hover:bg-[#253550] transition disabled:opacity-50">Cancelar</button>
                            )}
                            <button onClick={handleModalConfirm} disabled={modalProcessing} className={`flex-1 py-3 rounded-xl font-bold flex justify-center items-center gap-2 text-black transition ${modalConfig.type === 'danger' ? 'bg-[#F59E0B] hover:bg-[#d98c0a]' : 'bg-[#00C98D] hover:bg-[#00b07a]'}`}>
                                {modalProcessing ? <Loader2 size={18} className="animate-spin" /> : 'Confirmar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* BULK ACTIONS BAR */}
            {selectedItems.length > 0 && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-[#FF3D6B] text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 animate-in slide-in-from-bottom-5">
                    <span className="font-bold text-sm tracking-wide">{selectedItems.length} selecionados</span>
                    <div className="w-px h-5 bg-white/30"></div>
                    <button onClick={handleBulkDelete} className="flex items-center gap-2 hover:text-black transition text-sm font-bold"><Trash2 size={16} /> Excluir</button>
                    <button onClick={() => setSelectedItems([])} className="p-1 hover:bg-black/20 rounded-full transition ml-2"><X size={16} /></button>
                </div>
            )}

            <div className="max-w-[1300px] mx-auto px-4 py-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-700">
                
                {/* HERO */}
                <div className="flex flex-col md:flex-row items-center gap-6 bg-[#0F1520] border border-[#1E2D45] rounded-[24px] p-6 mb-6">
                    <div className="relative w-[100px] h-[100px] shrink-0">
                        <svg width="100" height="100" viewBox="0 0 88 88" className="-rotate-90">
                            <circle cx="44" cy="44" r="35" fill="none" stroke="#253550" strokeWidth="7" />
                            <circle cx="44" cy="44" r="35" fill="none" stroke={ringColor} strokeWidth="7" strokeLinecap="round" strokeDasharray="220" style={{ strokeDashoffset: ringOffset, transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1), stroke 0.6s' }} />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="font-mono text-2xl font-bold" style={{ color: ringColor }}>{score}</span>
                            <span className="text-[10px] text-[#4A6080] uppercase tracking-wider mt-0.5">score</span>
                        </div>
                    </div>
                    <div className="flex-1 min-w-0 text-center md:text-left">
                        <div className="text-sm text-[#4A6080] mb-1">Visão Geral</div>
                        <div className="text-2xl font-bold tracking-tight text-white mb-3">Dashboard Aliado ✨</div>
                        <div className="inline-flex items-center gap-2 bg-[#00C98D]/10 border border-[#00C98D]/20 rounded-lg px-3 py-1.5 text-xs text-[#00C98D] font-bold">
                            <div className="w-1.5 h-1.5 rounded-full bg-[#00C98D] animate-pulse"></div>
                            {viewingAs ? 'Visualizando Cliente' : 'Sistema Online'}
                        </div>
                    </div>
                    <div className="text-center md:text-right shrink-0 mt-4 md:mt-0 w-full md:w-auto border-t md:border-t-0 border-[#1E2D45] pt-5 md:pt-0">
                        <div className="text-xs text-[#4A6080] uppercase tracking-wider mb-2">Saldo Previsto</div>
                        <div className="font-mono text-3xl font-bold tracking-tight" style={{ color: isPositive ? '#00C98D' : '#FF3D6B' }}>
                            R$ {fmt(displayBalance)}
                        </div>
                        <div className="text-xs text-[#4A6080] mt-2">{previousSurplus !== 0 ? `+ R$ ${fmt(previousSurplus)} saldo anterior` : 'Mês atual'}</div>
                    </div>
                </div>

                {/* METRICS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-[#0F1520] border border-[#1E2D45] hover:border-[#253550] transition-colors rounded-[20px] p-5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-[#00C98D]"></div>
                        <div className="text-[11px] text-[#4A6080] uppercase tracking-widest font-bold mb-3">Receitas</div>
                        <div className="font-mono text-2xl font-bold text-[#00C98D] mb-2">R$ {fmt(inc)}</div>
                        <div className="text-xs text-[#00C98D] flex items-center gap-1"><TrendingUp size={14}/> Entradas no mês</div>
                    </div>
                    <div className="bg-[#0F1520] border border-[#1E2D45] hover:border-[#253550] transition-colors rounded-[20px] p-5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-[#FF3D6B]"></div>
                        <div className="text-[11px] text-[#4A6080] uppercase tracking-widest font-bold mb-3">Despesas Totais</div>
                        <div className="font-mono text-2xl font-bold text-[#FF3D6B] mb-2">R$ {fmt(exp)}</div>
                        <div className="text-xs text-[#FF3D6B] flex items-center gap-1"><TrendingDown size={14}/> Saídas e faturas</div>
                    </div>
                    <div className="bg-[#0F1520] border border-[#1E2D45] hover:border-[#253550] transition-colors rounded-[20px] p-5 relative overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-[#F59E0B]"></div>
                        <div className="text-[11px] text-[#4A6080] uppercase tracking-widest font-bold mb-3">Em Stand-by</div>
                        <div className="font-mono text-2xl font-bold text-[#F59E0B] mb-2">R$ {fmt(currentMonthData.delayedTotal || 0)}</div>
                        <div className="text-xs text-[#F59E0B] flex items-center gap-1"><Clock size={14}/> {delayedItems.length} congeladas</div>
                    </div>
                </div>

                {/* BUDGET BAR */}
                <div className="bg-[#0F1520] border border-[#1E2D45] rounded-[20px] p-5 mb-8">
                    <div className="flex justify-between items-center mb-3">
                        <span className="text-sm font-bold text-[#8899BB]">Uso do orçamento</span>
                        <span className="font-mono text-xs text-[#4A6080] bg-[#161E2E] px-2 py-1 rounded-md">{budgetPct.toFixed(1)}% utilizado</span>
                    </div>
                    <div className="h-2 bg-[#1C2840] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${budgetPct}%`, background: 'linear-gradient(90deg, #00C98D, #F59E0B, #FF3D6B)' }}></div>
                    </div>
                    <div className="flex justify-between mt-3 text-xs text-[#4A6080] font-mono">
                        <span>R$ 0</span><span>R$ {fmt(inc)}</span>
                    </div>
                </div>

                {/* TABS */}
                <div className="flex overflow-x-auto gap-2 mb-8 pb-2 scrollbar-hide">
                    {months.map(m => (
                        <button key={m} onClick={() => setActiveTab(m)} className={`shrink-0 px-6 py-2.5 rounded-xl text-sm transition-all duration-200 border ${activeTab === m ? 'bg-[#00C98D] border-[#00C98D] text-black font-bold shadow-[0_0_15px_rgba(0,201,141,0.2)]' : 'bg-[#0F1520] border-[#1E2D45] text-[#8899BB] font-medium hover:border-[#253550] hover:text-white'}`}>
                            {m}
                        </button>
                    ))}
                </div>

                {/* 3 COLUMNS GRID */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    
                    {/* COLUNA 1: EXTRATO */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 px-1">
                            <div className="w-1 h-5 rounded-full bg-[#00C98D]"></div>
                            <span className="text-base font-bold text-white tracking-wide">Extrato</span>
                            <span className="ml-auto text-xs text-[#4A6080] font-mono bg-[#0F1520] border border-[#1E2D45] px-2 py-1 rounded-lg">{monthTransactions.length} itens</span>
                        </div>
                        <div className="bg-[#0F1520] border border-[#1E2D45] rounded-[20px] overflow-hidden max-h-[650px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#253550] scrollbar-track-transparent">
                            {monthTransactions.length === 0 ? (
                                <div className="p-10 text-center text-[#4A6080] text-sm flex flex-col items-center gap-3">
                                    <List size={32} opacity={0.3} />
                                    <span>Nenhuma movimentação avulsa</span>
                                </div>
                            ) : (
                                <div className="divide-y divide-[#1E2D45]">
                                    {monthTransactions.map(item => {
                                        const isSel = selectedItems.some(s => s.id === item.id && s.table === 'transactions');
                                        const iconKey = item.icon || (item.category?.toLowerCase() || 'outros');
                                        const iconChar = ICON_MAP[iconKey] || (item.type === 'income' ? '💰' : '💸');
                                        return (
                                            <div key={item.id} className={`group relative flex items-center gap-3 p-4 transition-colors hover:bg-[#161E2E] ${isSel ? 'bg-[#FF3D6B]/10 hover:bg-[#FF3D6B]/20' : ''}`}>
                                                <input type="checkbox" checked={isSel} onChange={() => toggleSelection(item.id, 'transactions')} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-pointer z-10 w-4 h-4 accent-[#FF3D6B]" />
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-lg" style={{ background: item.type === 'income' ? '#00C98D15' : '#FF3D6B15' }}>
                                                    {iconChar}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-sm font-bold truncate transition-colors ${item.is_paid ? 'text-[#4A6080] line-through' : 'text-white'}`}>{item.title}</div>
                                                    <div className="text-xs text-[#4A6080] truncate flex items-center gap-1.5 mt-0.5">
                                                        <span>{item.date}</span>
                                                        <span className="w-1 h-1 rounded-full bg-[#253550]"></span>
                                                        <span className="truncate">{item.category || 'Avulso'}</span>
                                                        {getReceipt?.(item, activeTab) && <a href={getReceipt(item, activeTab)} target="_blank" className="text-[#00C98D] shrink-0 ml-1"><FileText size={12} /></a>}
                                                    </div>
                                                </div>
                                                <div className="shrink-0 text-right flex flex-col items-end gap-1.5">
                                                    <div className="font-mono text-sm font-bold" style={{ color: item.type === 'income' ? '#00C98D' : (item.is_paid ? '#8899BB' : '#white') }}>
                                                        {item.type === 'income' ? '+' : '-'}R$ {fmt(Number(item.amount))}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => onTogglePaid('transactions', item.id, !!item.is_paid)} className={`text-[10px] font-bold px-2.5 py-1 rounded-md transition-colors ${item.is_paid ? 'bg-[#1C2840] text-[#8899BB] hover:bg-[#253550]' : 'bg-[#00C98D]/10 text-[#00C98D] border border-[#00C98D]/20 hover:bg-[#00C98D]/20'}`}>
                                                            {item.is_paid ? 'Desfazer' : 'Pagar'}
                                                        </button>
                                                        {!item.is_paid && <button onClick={() => onToggleDelay('transactions', item)} className="text-[10px] font-bold px-2.5 py-1 rounded-md bg-[#F59E0B]/10 text-[#F59E0B] border border-[#F59E0B]/20 hover:bg-[#F59E0B]/20 transition-colors">Adiar</button>}
                                                        {!item.is_paid && <button onClick={() => onEdit(item, item.type)} className="text-[#4A6080] hover:text-white p-1 transition-colors"><Pencil size={14}/></button>}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* CONGELADOR */}
                        {delayedItems.length > 0 && (
                            <div className="bg-[#0F1520] border border-[#FF3D6B]/20 rounded-[20px] p-5 relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-[#FF3D6B]"></div>
                                <div className="text-sm font-bold text-[#FF3D6B] flex items-center gap-2 mb-4">🧊 Congelador <span className="text-xs font-mono bg-[#FF3D6B]/10 px-2 py-0.5 rounded-md">{delayedItems.length}</span></div>
                                <div className="space-y-2">
                                    {delayedItems.map((item, idx) => (
                                        <div key={idx} className="flex justify-between items-center p-3 bg-[#FF3D6B]/5 border border-[#FF3D6B]/10 rounded-xl">
                                            <div className="flex-1 min-w-0 pr-3">
                                                <span className="text-xs text-[#FF8FA8] font-bold truncate block">{item.title}</span>
                                            </div>
                                            <div className="flex items-center gap-3 shrink-0">
                                                <span className="font-mono text-xs text-[#FF3D6B] font-bold">R$ {fmt(item._amt)}</span>
                                                <button onClick={() => onToggleDelay(item._s, item)} className="px-3 py-1.5 text-[10px] font-bold bg-[#FF3D6B]/10 text-[#FF3D6B] border border-[#FF3D6B]/20 rounded-lg hover:bg-[#FF3D6B]/20 transition-colors">Restaurar</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* COLUNA 2: CARTÕES */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 px-1">
                            <div className="w-1 h-5 rounded-full bg-[#8B5CF6]"></div>
                            <span className="text-base font-bold text-white tracking-wide">Cartões & Faturas</span>
                            <span className="ml-auto text-xs text-[#4A6080] font-mono bg-[#0F1520] border border-[#1E2D45] px-2 py-1 rounded-lg">{sortedBanks.length} bancos</span>
                        </div>
                        {sortedBanks.length === 0 ? (
                            <div className="bg-[#0F1520] border border-dashed border-[#253550] rounded-[20px] p-10 text-center text-[#4A6080] text-sm flex flex-col items-center gap-3">
                                <CreditCard size={32} opacity={0.3} />
                                <span>Nenhuma fatura lançada</span>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {sortedBanks.map(bankKey => {
                                    const group = groupedInstallments[bankKey];
                                    const style = BANK_LOGOS[bankKey] || BANK_LOGOS['outros'];
                                    const isOpen = openBanks.includes(bankKey);
                                    return (
                                        <div key={bankKey} className="bg-[#0F1520] border rounded-[20px] overflow-hidden transition-all duration-200" style={{ borderColor: isOpen ? style.color : '#1E2D45' }}>
                                            <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-[#161E2E] transition-colors" onClick={() => toggleBank(bankKey)}>
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0" style={{ background: `${style.color}15`, color: style.color }}>
                                                    {style.short}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-sm font-bold text-white truncate">{style.label}</div>
                                                    <div className="text-xs text-[#8899BB] mt-0.5">{group.items.length} parcelas</div>
                                                </div>
                                                <div className="shrink-0 text-right flex items-center gap-3">
                                                    <div className="font-mono text-sm font-bold" style={{ color: style.color }}>R$ {fmt(group.total)}</div>
                                                    <div className="text-[#4A6080]">{isOpen ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}</div>
                                                </div>
                                            </div>
                                            
                                            {isOpen && (
                                                <div className="bg-[#161E2E] border-t border-[#1E2D45] animate-in slide-in-from-top-2 duration-200">
                                                    <div className="flex gap-2 p-3 border-b border-[#1E2D45]/50 bg-[#0F1520]/50">
                                                        <button onClick={() => handleBulkAct(style.label, group.items, 'pay')} className="flex-1 py-2 bg-[#00C98D]/10 text-[#00C98D] text-[11px] font-bold rounded-xl border border-[#00C98D]/20 hover:bg-[#00C98D]/20 transition-colors">✓ Pagar Tudo</button>
                                                        <button onClick={() => handleBulkAct(style.label, group.items, 'delay')} className="flex-1 py-2 bg-[#F59E0B]/10 text-[#F59E0B] text-[11px] font-bold rounded-xl border border-[#F59E0B]/20 hover:bg-[#F59E0B]/20 transition-colors">⏸ Adiar Tudo</button>
                                                    </div>
                                                    <div className="divide-y divide-[#1E2D45]/50">
                                                        {group.items.map((item: any) => {
                                                            const isPaid = item.paid_months?.includes(currentTag);
                                                            const isSel = selectedItems.some(s => s.id === item.id && s.table === 'installments');
                                                            return (
                                                                <div key={item.id} className={`group relative flex items-center gap-3 p-3 transition-colors hover:bg-[#1C2840] ${isSel ? 'bg-[#FF3D6B]/10 hover:bg-[#FF3D6B]/20' : ''}`}>
                                                                    <input type="checkbox" checked={isSel} onChange={() => toggleSelection(item.id, 'installments')} className="absolute left-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-pointer w-3.5 h-3.5 accent-[#FF3D6B]" />
                                                                    <div className="flex-1 min-w-0 pl-3">
                                                                        <div className={`text-xs font-bold truncate ${isPaid ? 'text-[#4A6080] line-through' : 'text-[#8899BB]'}`}>
                                                                            {item.title} {getReceipt?.(item, activeTab) && <span className="text-[#00C98D] ml-1">📎</span>}
                                                                        </div>
                                                                    </div>
                                                                    <div className="shrink-0 font-mono text-[10px] text-[#4A6080] bg-[#0F1520] px-1.5 py-0.5 rounded border border-[#1E2D45]">{item.actualInst}/{item.installments_count}x</div>
                                                                    <div className="shrink-0 font-mono text-xs font-bold text-white w-[70px] text-right">R$ {fmt(item.value_per_month)}</div>
                                                                    <div className="shrink-0 flex items-center gap-1.5">
                                                                        <button onClick={() => onTogglePaidMonth('installments', item)} className={`w-7 h-7 rounded-lg border flex items-center justify-center transition-colors ${isPaid ? 'bg-[#00C98D]/10 border-[#00C98D]/30 text-[#00C98D]' : 'bg-[#0F1520] border-[#253550] text-[#4A6080] hover:bg-[#253550] hover:text-white'}`}>
                                                                            <Check size={14} />
                                                                        </button>
                                                                        {!isPaid && <button onClick={() => onEdit(item, 'installment')} className="w-7 h-7 flex items-center justify-center text-[#4A6080] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"><Pencil size={12}/></button>}
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* COLUNA 3: RECORRENTES */}
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-3 px-1">
                            <div className="w-1 h-5 rounded-full bg-[#F59E0B]"></div>
                            <span className="text-base font-bold text-white tracking-wide">Recorrentes</span>
                            <span className="ml-auto text-xs text-[#4A6080] font-mono bg-[#0F1520] border border-[#1E2D45] px-2 py-1 rounded-lg">{activeRecurring.length} contas</span>
                        </div>
                        <div className="bg-[#0F1520] border border-[#1E2D45] rounded-[20px] overflow-hidden max-h-[650px] overflow-y-auto scrollbar-thin scrollbar-thumb-[#253550] scrollbar-track-transparent">
                            
                            {/* Renda Fixa */}
                            <div className="bg-[#161E2E] px-4 py-2.5 border-b border-[#1E2D45] text-[10px] font-bold text-[#4A6080] uppercase tracking-widest">Renda Fixa</div>
                            <div className="divide-y divide-[#1E2D45]">
                                {activeRecurring.filter(r => r.type === 'income').length === 0 ? (
                                    <div className="p-4 text-center text-[#4A6080] text-xs">Vazio</div>
                                ) : (
                                    activeRecurring.filter(r => r.type === 'income').map(item => {
                                        const isPaid = isPaidThisMonth(item);
                                        const isSel = selectedItems.some(s => s.id === item.id && s.table === 'recurring');
                                        return (
                                            <div key={item.id} className={`group relative flex items-center gap-3 p-4 transition-colors hover:bg-[#161E2E] ${isSel ? 'bg-[#FF3D6B]/10 hover:bg-[#FF3D6B]/20' : ''}`}>
                                                <input type="checkbox" checked={isSel} onChange={() => toggleSelection(item.id, 'recurring')} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-pointer z-10 w-4 h-4 accent-[#FF3D6B]" />
                                                <div className="w-2.5 h-2.5 rounded-full bg-[#00C98D] shrink-0 ml-1"></div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-sm font-bold truncate ${isPaid ? 'text-[#4A6080] line-through' : 'text-white'}`}>{item.title}</div>
                                                    <div className="text-xs text-[#4A6080] mt-0.5">Dia {item.due_day}</div>
                                                </div>
                                                <div className="shrink-0 font-mono text-sm font-bold text-[#00C98D]">R$ {fmt(item.value)}</div>
                                                <div className="shrink-0 flex items-center gap-1 ml-2">
                                                    <button onClick={() => onTogglePaidMonth('recurring', item)} className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors ${isPaid ? 'bg-[#00C98D]/10 border-[#00C98D]/30 text-[#00C98D]' : 'bg-[#1C2840] border-[#253550] text-[#8899BB] hover:bg-[#253550] hover:text-white'}`}>
                                                        <Check size={16} />
                                                    </button>
                                                    {!isPaid && <button onClick={() => onEdit(item, 'income')} className="w-8 h-8 flex items-center justify-center text-[#4A6080] hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"><Pencil size={14}/></button>}
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>

                            {/* Contas a Pagar */}
                            <div className="bg-[#161E2E] px-4 py-2.5 border-y border-[#1E2D45] text-[10px] font-bold text-[#4A6080] uppercase tracking-widest mt-2">Contas a Pagar</div>
                            <div className="divide-y divide-[#1E2D45]">
                                {recExpenses.length === 0 ? (
                                    <div className="p-4 text-center text-[#4A6080] text-xs">Vazio</div>
                                ) : (
                                    recExpenses.map(item => {
                                        const isPaid = isPaidThisMonth(item);
                                        const isSel = selectedItems.some(s => s.id === item.id && s.table === 'recurring');
                                        return (
                                            <div key={item.id} className={`group relative flex items-center gap-3 p-4 transition-colors hover:bg-[#161E2E] ${isSel ? 'bg-[#FF3D6B]/10 hover:bg-[#FF3D6B]/20' : ''}`}>
                                                <input type="checkbox" checked={isSel} onChange={() => toggleSelection(item.id, 'recurring')} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-pointer z-10 w-4 h-4 accent-[#FF3D6B]" />
                                                <div className="w-2.5 h-2.5 rounded-full bg-[#FF3D6B] shrink-0 ml-1"></div>
                                                <div className="flex-1 min-w-0">
                                                    <div className={`text-sm font-bold truncate ${isPaid ? 'text-[#4A6080] line-through' : 'text-white'}`}>{item.title}</div>
                                                    <div className="text-xs text-[#4A6080] mt-0.5 flex items-center gap-1.5">
                                                        <span>Vence dia {item.due_day}</span>
                                                        {getReceipt?.(item, activeTab) && <a href={getReceipt(item, activeTab)} target="_blank" className="text-[#00C98D] shrink-0"><FileText size={10} /></a>}
                                                    </div>
                                                </div>
                                                <div className="shrink-0 font-mono text-sm font-bold text-white">R$ {fmt(item.value)}</div>
                                                <div className="shrink-0 flex items-center gap-1.5 ml-2">
                                                    <button onClick={() => onTogglePaidMonth('recurring', item)} className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-colors ${isPaid ? 'bg-[#00C98D]/10 border-[#00C98D]/30 text-[#00C98D]' : 'bg-[#1C2840] border-[#253550] text-[#8899BB] hover:bg-[#253550] hover:text-white'}`}>
                                                        <Check size={16} />
                                                    </button>
                                                    {!isPaid && (
                                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <button onClick={() => onToggleDelay('recurring', item)} className="w-8 h-8 flex items-center justify-center text-[#F59E0B] hover:bg-[#F59E0B]/10 rounded-xl transition-colors"><Clock size={14}/></button>
                                                            <button onClick={() => onEdit(item, 'fixed_expense')} className="w-8 h-8 flex items-center justify-center text-[#4A6080] hover:text-white transition-colors"><Pencil size={14}/></button>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>

                            {/* Barra de Progresso */}
                            {recExpenses.length > 0 && (
                                <div className="p-5 border-t border-[#1E2D45] bg-[#0F1520]">
                                    <div className="flex justify-between items-center text-xs text-[#4A6080] font-bold mb-3">
                                        <span>Status de Pagamento</span>
                                        <span className="font-mono bg-[#161E2E] px-2 py-1 rounded-md">{recPaid} / {recExpenses.length}</span>
                                    </div>
                                    <div className="h-2 bg-[#1C2840] rounded-full overflow-hidden">
                                        <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${recPct}%`, background: '#00C98D' }}></div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}