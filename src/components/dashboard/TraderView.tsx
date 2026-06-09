import React, { useState } from 'react';
import { 
    TrendingUp, TrendingDown, Activity, DollarSign, Clock, 
    Lock, CheckCircle2, XCircle, AlertTriangle, Landmark, 
    ShoppingCart, Home, Car, Utensils, GraduationCap, HeartPulse, 
    Plane, Gamepad2, Zap, Smartphone, Terminal, BarChart2,
    Trash2, X, Loader2, Eye, FileText, Pencil,
    Wifi, Droplet, Shirt, Gift, Briefcase, PiggyBank, Baby, Dog, Tv, Coffee
} from 'lucide-react';
import { Transaction, Installment, Recurring } from '@/types';

// --- MAPA DE ÍCONES (ATUALIZADO) ---
const ICON_MAP: any = {
    'shopping-cart': ShoppingCart, 'home': Home, 'car': Car, 'utensils': Utensils,
    'zap': Zap, 'graduation-cap': GraduationCap, 'heart-pulse': HeartPulse,
    'plane': Plane, 'gamepad-2': Gamepad2, 'smartphone': Smartphone, 'dollar-sign': DollarSign,
    'tv': Tv, 'coffee': Coffee, 'droplet': Droplet, 'wifi': Wifi, 'shirt': Shirt,
    'gift': Gift, 'briefcase': Briefcase, 'piggy-bank': PiggyBank, 'baby': Baby, 'dog': Dog
};

// --- MAPA DE BANCOS (Cores adaptadas pro Terminal) ---
const BROKER_COLORS: any = {
    'nubank': 'text-[#8a05be] border-[#8a05be]/50 bg-[#8a05be]/10',
    'inter': 'text-[#ff7a00] border-[#ff7a00]/50 bg-[#ff7a00]/10',
    'bb': 'text-[#f8d117] border-[#f8d117]/50 bg-[#f8d117]/10',
    'itau': 'text-[#ec7000] border-[#ec7000]/50 bg-[#ec7000]/10',
    'santander': 'text-[#cc0000] border-[#cc0000]/50 bg-[#cc0000]/10',
    'caixa': 'text-[#005CA9] border-[#005CA9]/50 bg-[#005CA9]/10',
    'mercadopago': 'text-[#009EE3] border-[#009EE3]/50 bg-[#009EE3]/10',
    'bradesco': 'text-[#CC092F] border-[#CC092F]/50 bg-[#CC092F]/10',
    'picpay': 'text-[#11C76F] border-[#11C76F]/50 bg-[#11C76F]/10',
    'c6': 'text-gray-200 border-gray-500/50 bg-gray-800',
    'xp': 'text-[#FFD700] border-[#FFD700]/50 bg-[#111111]',
    'btg': 'text-[#4d8bce] border-[#002A54]/50 bg-[#002A54]/20',
    'pagbank': 'text-[#00B152] border-[#00B152]/50 bg-[#00B152]/10',
    'neon': 'text-[#00E5FF] border-[#00E5FF]/50 bg-[#00E5FF]/10',
    'will': 'text-[#FFD500] border-[#FFD500]/50 bg-[#FFD500]/10',
    'pan': 'text-[#4da6ff] border-[#0054A6]/50 bg-[#0054A6]/10',
    'sicoob': 'text-[#00AE9D] border-[#00AE9D]/50 bg-[#00AE9D]/10',
    'sicredi': 'text-[#32041] border-[#32041]/50 bg-[#32041]/10',
    'money': 'text-[#00ff00] border-[#00ff00]/50 bg-[#00ff00]/10',
    'outros': 'text-gray-400 border-gray-600/50 bg-gray-800'
};

interface TraderViewProps {
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

export default function TraderView({
    transactions, installments, recurring, activeTab, months, setActiveTab,
    currentMonthData, previousSurplus, displayBalance, selectedYear, viewingAs,
    onTogglePaid, onTogglePaidMonth, onToggleDelay, onDelete, onEdit, getReceipt = () => null
}: TraderViewProps) {

    // --- ESTADOS DO MODAL E BULK ACTIONS ---
    const [selectedItems, setSelectedItems] = useState<{ id: any, table: string }[]>([]);
    const [modalConfig, setModalConfig] = useState<{
        isOpen: boolean; title: string; message: string; type: 'alert' | 'confirm' | 'danger'; onConfirm?: () => Promise<void> | void;
    }>({ isOpen: false, title: '', message: '', type: 'alert' });
    const [modalProcessing, setModalProcessing] = useState(false);

    const closeModal = () => { if (!modalProcessing) setModalConfig(prev => ({ ...prev, isOpen: false })); };
    const showConfirm = (title: string, message: string, onConfirm: () => Promise<void> | void, isDanger = false) => {
        setModalConfig({ isOpen: true, title, message, type: isDanger ? 'danger' : 'confirm', onConfirm });
    };

    const handleModalConfirm = async () => {
        if (modalConfig.onConfirm) {
            setModalProcessing(true);
            try { await modalConfig.onConfirm(); } 
            finally { setModalProcessing(false); closeModal(); }
        } else { closeModal(); }
    };

    const toggleSelection = (id: any, table: string) => {
        setSelectedItems(prev => {
            const exists = prev.find(item => item.id === id && item.table === table);
            if (exists) return prev.filter(item => !(item.id === id && item.table === table));
            return [...prev, { id, table }];
        });
    };

    const handleBulkDelete = () => {
        showConfirm(
            "CRITICAL WARNING",
            `EXCLUDE ${selectedItems.length} POSITIONS PERMANENTLY? THIS ACTION CANNOT BE UNDONE.`,
            async () => {
                for (const item of selectedItems) {
                    await onDelete(item.table, item.id);
                }
                setSelectedItems([]);
            },
            true 
        );
    };

    // --- HELPERS ---
    const fmt = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });
    const getBrokerLabel = (method: string) => {
        const map: any = { 
            'nubank': 'NUBANK', 'inter': 'INTER', 'bb': 'B.BRASIL', 'itau': 'ITAÚ', 
            'santander': 'SANTA', 'caixa': 'CAIXA', 'mercadopago': 'M.PAGO', 'bradesco': 'BRAD', 
            'picpay': 'PICPAY', 'c6': 'C6 BANK', 'xp': 'XP', 'btg': 'BTG', 'pagbank': 'PAGBNK', 
            'neon': 'NEON', 'will': 'WILL', 'pan': 'B.PAN', 'sicoob': 'SICOOB', 'sicredi': 'SICRED', 
            'money': 'CASH', 'outros': 'OTHER' 
        };
        return map[method] || 'OTHER';
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

    // Compilar Book de Ofertas
    const getAllItems = () => {
        const list: any[] = [];
        const monthIndex = months.indexOf(activeTab);
        const monthMap: Record<string, string> = { 'Jan': '/01', 'Fev': '/02', 'Mar': '/03', 'Abr': '/04', 'Mai': '/05', 'Jun': '/06', 'Jul': '/07', 'Ago': '/08', 'Set': '/09', 'Out': '/10', 'Nov': '/11', 'Dez': '/12' };
        const dateFilter = `${monthMap[activeTab]}/${selectedYear}`;

        transactions.forEach(t => {
            if (t.date?.includes(dateFilter) && t.status !== 'delayed') {
                list.push({ ...t, origin: 'transactions', type_label: 'SPOT', isFixed: false });
            }
        });

        recurring.forEach(r => {
            if (r.status === 'delayed') return;
            const { m: startMonth, y: startYear } = getStartData(r);
            let show = false;
            if (selectedYear > startYear) show = true;
            else if (selectedYear === startYear && monthIndex >= startMonth) show = true;

            if (show && !r.skipped_months?.includes(activeTab)) {
                const tag = `${activeTab}/${selectedYear}`;
                list.push({ ...r, origin: 'recurring', type_label: 'FIXED', isFixed: true, date: `DUE ${r.due_day}`, amount: r.value, is_paid: r.paid_months?.includes(tag) });
            }
        });

        installments.forEach(i => {
            if (i.status === 'delayed') return;
            const { m: startMonth, y: startYear } = getStartData(i);
            const monthsDiff = ((selectedYear - startYear) * 12) + (monthIndex - startMonth);
            const currentInst = 1 + (i.current_installment || 0) + monthsDiff;
            
            if (currentInst >= 1 && currentInst <= i.installments_count) {
                const tag = `${activeTab}/${selectedYear}`;
                list.push({ ...i, origin: 'installments', type_label: `FUTURES (${currentInst}/${i.installments_count})`, isFixed: false, date: `DUE ${i.due_day}`, amount: i.value_per_month, is_paid: i.paid_months?.includes(tag) });
            }
        });

        return list.sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0));
    };

    const items = getAllItems();
    const isPositive = displayBalance >= 0;
    const liquidityRatio = currentMonthData.income > 0 ? ((displayBalance / currentMonthData.income) * 100) : 0;

    return (
        <div className="font-mono text-xs md:text-sm animate-in fade-in duration-500 bg-[#000000] text-gray-300 min-h-screen selection:bg-[#00ff00] selection:text-black p-1 sm:p-2 relative">
            
            {/* --- MODAL CUSTOMIZADO (TERMINAL STYLE) --- */}
            {modalConfig.isOpen && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm">
                    <div className="bg-[#0a0a0a] border border-gray-700 p-6 w-full max-w-sm shadow-[0_0_30px_rgba(0,0,0,0.8)] flex flex-col">
                        <div className="flex items-center gap-3 border-b border-gray-800 pb-3 mb-4">
                            {modalConfig.type === 'danger' ? <AlertTriangle className="text-[#ff0000]" size={20} /> : <Terminal className="text-[#00ff00]" size={20} />}
                            <h3 className={`text-sm font-bold tracking-widest ${modalConfig.type === 'danger' ? 'text-[#ff0000]' : 'text-[#00ff00]'}`}>
                                {modalConfig.title}
                            </h3>
                        </div>
                        <p className="text-gray-400 text-xs mb-6 uppercase leading-relaxed tracking-wider">{modalConfig.message}</p>
                        <div className="flex gap-3 mt-auto">
                            {modalConfig.type !== 'alert' && (
                                <button onClick={closeModal} disabled={modalProcessing} className="flex-1 py-2 border border-gray-600 text-gray-400 hover:bg-gray-800 hover:text-white transition uppercase text-[10px] tracking-widest disabled:opacity-50">
                                    [ ABORT ]
                                </button>
                            )}
                            <button onClick={handleModalConfirm} disabled={modalProcessing} className={`flex-1 py-2 border uppercase text-[10px] tracking-widest transition flex items-center justify-center gap-2
                                ${modalConfig.type === 'danger' ? 'border-[#ff0000] text-[#ff0000] hover:bg-[#ff0000]/10' : 'border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00]/10'}`}>
                                {modalProcessing ? <Loader2 className="animate-spin" size={14}/> : '[ EXECUTE ]'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* --- BARRA FLUTUANTE BULK ACTIONS --- */}
            {selectedItems.length > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#0a0a0a] text-gray-300 px-6 py-3 shadow-[0_0_20px_rgba(0,255,0,0.15)] flex items-center gap-4 animate-in slide-in-from-bottom-5 border border-[#00ff00]/30">
                    <span className="font-bold tracking-widest text-[#00ff00] text-[10px]">[{selectedItems.length}] TICKERS SEL.</span>
                    <button onClick={handleBulkDelete} className="flex items-center gap-2 hover:text-[#ff0000] transition text-[10px] tracking-widest border border-gray-800 px-3 py-1 hover:border-[#ff0000]/50"><Trash2 size={12} /> DROP</button>
                    <button onClick={() => setSelectedItems([])} className="p-1 hover:text-gray-100 transition"><X size={14} /></button>
                </div>
            )}

            {/* TERMINAL HEADER */}
            <div className="flex items-center justify-between bg-[#0a0a0a] border border-gray-800 p-2 mb-2">
                <div className="flex items-center gap-2 text-[#00ff00]">
                    <Terminal size={14} />
                    <span className="font-bold tracking-widest text-[10px] sm:text-xs">SYS.TERMINAL // VTR-2026</span>
                </div>
                <div className="flex items-center gap-3 text-[10px]">
                    {viewingAs && (
                        <div className="flex items-center gap-1 text-[#a958e8] border border-[#a958e8]/30 px-2 py-0.5 bg-[#820AD1]/10">
                            <Eye size={10} /> <span>GUEST_VIEW</span>
                        </div>
                    )}
                    <span className="text-gray-500 hidden sm:inline">STATUS:</span>
                    <span className="bg-[#00ff00] text-black px-1.5 font-bold animate-pulse">ONLINE</span>
                </div>
            </div>

            {/* BARRA DE TICKER SUPERIOR */}
            <div className="flex overflow-x-auto gap-4 p-2 bg-[#0a0a0a] border border-gray-800 mb-4 scrollbar-hide items-center text-[10px] sm:text-xs">
                <div className="flex items-center gap-2 px-4 border-r border-gray-800 whitespace-nowrap">
                    <span className="text-gray-500 font-bold">SESSION:</span>
                    <span className="text-[#00ff00] font-bold flex items-center gap-1">ACTIVE</span>
                </div>
                <div className="flex items-center gap-2 px-4 border-r border-gray-800 whitespace-nowrap">
                    <span className="text-gray-500 font-bold">NET P&L (SALDO):</span>
                    <span className={`font-bold ${isPositive ? 'text-[#00ff00]' : 'text-[#ff0000]'}`}>
                        {isPositive ? '▲' : '▼'} R$ {fmt(displayBalance)}
                    </span>
                </div>
                <div className="flex items-center gap-2 px-4 border-r border-gray-800 whitespace-nowrap">
                    <span className="text-gray-500 font-bold">VOL SHORT (SAÍDAS):</span>
                    <span className="text-[#ff0000]">R$ {fmt(currentMonthData.expenseTotal)}</span>
                </div>
                <div className="flex items-center gap-2 px-4 whitespace-nowrap">
                    <span className="text-gray-500 font-bold">VOL LONG (ENTRADAS):</span>
                    <span className="text-[#00ff00]">R$ {fmt(currentMonthData.income)}</span>
                </div>
            </div>

            {/* GRID DE DASHBOARD */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                
                {/* COLUNA ESQUERDA: CONTROLES */}
                <div className="lg:col-span-3 space-y-4">
                    
                    {/* TIMEFRAME SELECTOR */}
                    <div className="bg-[#0a0a0a] border border-gray-800 p-3">
                        <h3 className="text-gray-500 mb-3 font-bold border-b border-gray-800 pb-2 text-[10px] tracking-widest flex items-center gap-2">
                            <Clock size={12} /> TIMEFRAME_SELECTOR
                        </h3>
                        <div className="grid grid-cols-3 gap-1">
                            {months.map(m => (
                                <button 
                                    key={m} 
                                    onClick={() => setActiveTab(m)} 
                                    className={`p-2 text-center border transition-all text-[10px] font-bold ${activeTab === m ? 'bg-[#00ff00]/10 border-[#00ff00] text-[#00ff00] shadow-[0_0_10px_rgba(0,255,0,0.1)]' : 'bg-black border-gray-800 text-gray-600 hover:border-gray-500 hover:text-gray-300'}`}
                                >
                                    {m.toUpperCase()}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* LIQUIDITY GAUGE */}
                    <div className="bg-[#0a0a0a] border border-gray-800 p-3">
                        <h3 className="text-gray-500 mb-3 font-bold border-b border-gray-800 pb-2 text-[10px] tracking-widest flex items-center gap-2">
                            <BarChart2 size={12} /> LIQUIDITY_STATUS
                        </h3>
                        <div className="flex justify-between mb-1 text-[10px] font-bold">
                            <span className="text-gray-500">FREE MARGIN:</span>
                            <span className={liquidityRatio < 0 ? 'text-[#ff0000]' : 'text-[#00ff00]'}>{liquidityRatio.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-gray-900 h-2 border border-gray-800 p-[1px]">
                            <div 
                                className={`h-full transition-all duration-500 ${liquidityRatio >= 20 ? 'bg-[#00ff00]' : liquidityRatio >= 0 ? 'bg-yellow-500' : 'bg-[#ff0000]'}`} 
                                style={{ width: `${Math.min(Math.abs(liquidityRatio), 100)}%` }}
                            ></div>
                        </div>
                        <p className="text-[9px] text-gray-600 mt-2 text-right">Target: &gt; 20%</p>
                    </div>

                    {/* DELAYED ALERTS (STAND-BY) */}
                    {currentMonthData.delayedTotal > 0 && (
                        <div className="bg-[#1a0f00] border border-orange-900 p-3 animate-pulse">
                            <h3 className="text-orange-500 mb-2 font-bold text-[10px] tracking-widest flex items-center gap-2">
                                <AlertTriangle size={12} /> MARGIN_CALL_WARNING
                            </h3>
                            <p className="text-[10px] text-orange-400">Pending Holds: R$ {fmt(currentMonthData.delayedTotal)}</p>
                        </div>
                    )}
                </div>

                {/* COLUNA DIREITA: TABELA DE ORDENS */}
                <div className="lg:col-span-9 bg-[#0a0a0a] border border-gray-800 flex flex-col h-[600px] overflow-hidden">
                    <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-black">
                        <h3 className="text-gray-400 font-bold text-[10px] tracking-widest flex items-center gap-2">
                            <Activity size={12} className="text-cyan-500" /> ORDER_BOOK (POSITIONS)
                        </h3>
                        <span className="text-[9px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded-sm">{items.length} TICKERS</span>
                    </div>
                    
                    <div className="flex-1 overflow-auto scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-black">
                        <table className="w-full text-left border-collapse whitespace-nowrap">
                            <thead className="bg-gray-900/80 text-gray-500 border-b border-gray-800 text-[9px] uppercase tracking-widest sticky top-0 backdrop-blur-sm z-10">
                                <tr>
                                    <th className="p-3 font-bold w-10 text-center border-r border-gray-800/50">SEL</th>
                                    <th className="p-3 font-bold">Status</th>
                                    <th className="p-3 font-bold">Asset / Ticker</th>
                                    <th className="p-3 font-bold">Broker</th>
                                    <th className="p-3 font-bold text-center">Side</th>
                                    <th className="p-3 font-bold text-right">Size (R$)</th>
                                    <th className="p-3 font-bold text-center">Action Panel</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {items.length === 0 ? (
                                    <tr><td colSpan={7} className="p-10 text-center text-gray-700 tracking-widest">NO ACTIVE POSITIONS</td></tr>
                                ) : items.map((item: any) => {
                                    const isPaid = item.origin === 'transactions' ? item.is_paid : item.is_paid;
                                    const brokerColor = BROKER_COLORS[item.payment_method] || 'text-gray-500 border-gray-700 bg-gray-900';
                                    const isIncome = item.type === 'income';
                                    const isSelected = selectedItems.some(s => s.id === item.id && s.table === item.origin);

                                    return (
                                        <tr key={`${item.origin}-${item.id}`} className={`hover:bg-[#111] transition-colors ${isPaid ? 'opacity-40' : ''} ${isSelected ? 'bg-red-900/10' : ''}`}>
                                            <td className="p-3 text-center border-r border-gray-800/50">
                                                <input 
                                                    type="checkbox" 
                                                    checked={isSelected} 
                                                    onChange={() => toggleSelection(item.id, item.origin)} 
                                                    className="w-3.5 h-3.5 bg-black border-gray-600 text-[#00ff00] focus:ring-[#00ff00] focus:ring-offset-0 cursor-pointer" 
                                                />
                                            </td>
                                            <td className="p-3">
                                                {item.status === 'delayed' ? (
                                                    <span className="text-[9px] font-bold text-[#ff0000] bg-[#ff0000]/10 px-1.5 py-0.5 border border-[#ff0000]/30">OVERDUE</span>
                                                ) : isPaid ? (
                                                    <span className="text-[9px] font-bold text-gray-500 bg-gray-900 px-1.5 py-0.5 border border-gray-700">FILLED</span>
                                                ) : (
                                                    <span className="text-[9px] font-bold text-cyan-400 bg-cyan-900/20 px-1.5 py-0.5 border border-cyan-800">OPEN</span>
                                                )}
                                            </td>
                                            <td className="p-3 max-w-[150px] sm:max-w-[200px]">
                                                <div className="flex flex-col min-w-0">
                                                    <span className={`font-bold text-[11px] truncate block ${isPaid ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                                                        {item.title.toUpperCase()}
                                                    </span>
                                                    <span className="text-[9px] text-gray-600 flex items-center gap-1">
                                                        {item.date} • {item.type_label}
                                                        {getReceipt?.(item, activeTab) && <a href={getReceipt(item, activeTab)} target="_blank" className="text-[#00ff00] ml-1"><FileText size={10} /></a>}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <span className={`text-[9px] px-1.5 py-0.5 border font-bold ${brokerColor} truncate max-w-[80px] block text-center`}>
                                                    {getBrokerLabel(item.payment_method)}
                                                </span>
                                            </td>
                                            <td className="p-3 text-center">
                                                <span className={`text-[9px] font-bold ${isIncome ? 'text-[#00ff00]' : 'text-[#ff0000]'}`}>
                                                    {isIncome ? 'LONG' : 'SHORT'}
                                                </span>
                                            </td>
                                            <td className={`p-3 text-right font-bold text-[11px] ${isIncome ? 'text-[#00ff00]' : 'text-[#ff0000]'}`}>
                                                {isIncome ? '+' : '-'}{fmt(Number(item.amount))}
                                            </td>
                                            <td className="p-3">
                                                <div className="flex justify-center gap-1">
                                                    <button 
                                                        onClick={() => item.origin === 'transactions' ? onTogglePaid('transactions', item.id, item.is_paid) : onTogglePaidMonth(item.origin, item)} 
                                                        className={`px-2 py-1 text-[9px] font-bold border transition-colors ${isPaid ? 'bg-gray-800 border-gray-700 text-gray-500 hover:bg-gray-700' : 'bg-[#00ff00]/10 border-[#00ff00]/50 text-[#00ff00] hover:bg-[#00ff00]/30'}`}
                                                        title={isPaid ? "Undo Fill" : "Execute Order"}
                                                    >
                                                        [ EXE ]
                                                    </button>
                                                    {!isPaid && (
                                                        <>
                                                            <button 
                                                                onClick={() => onToggleDelay(item.origin, item)} 
                                                                className="px-2 py-1 text-[9px] font-bold border bg-yellow-900/10 border-yellow-600/50 text-yellow-500 hover:bg-yellow-900/30 transition-colors"
                                                                title="Hold Position"
                                                            >
                                                                [ HLD ]
                                                            </button>
                                                            <button 
                                                                onClick={() => {
                                                                    const mode = item.origin === 'transactions' ? item.type : item.origin === 'recurring' ? (item.type === 'income' ? 'income' : 'fixed_expense') : 'installment';
                                                                    onEdit(item, mode);
                                                                }} 
                                                                className="px-2 py-1 text-[9px] font-bold border bg-cyan-900/10 border-cyan-600/50 text-cyan-500 hover:bg-cyan-900/30 transition-colors"
                                                                title="Edit Order"
                                                            >
                                                                [ EDT ]
                                                            </button>
                                                            <button 
                                                                onClick={() => onDelete(item.origin, item.id)} 
                                                                className="px-2 py-1 text-[9px] font-bold border bg-gray-900 border-gray-700 text-gray-500 hover:border-[#ff0000]/50 hover:text-[#ff0000] transition-colors"
                                                                title="Cancel Order"
                                                            >
                                                                [ CAN ]
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}