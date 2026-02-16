import React from 'react';
import { 
    TrendingUp, TrendingDown, Activity, DollarSign, Clock, Lock, 
    CheckCircle2, XCircle, AlertTriangle, Landmark,
    ShoppingCart, Home, Car, Utensils, GraduationCap, HeartPulse, Plane, Gamepad2, Zap, Smartphone
} from 'lucide-react';

// Mapa de Ícones (Para renderizar visualmente)
const ICON_MAP: any = {
    'shopping-cart': ShoppingCart, 'home': Home, 'car': Car, 'utensils': Utensils,
    'zap': Zap, 'graduation-cap': GraduationCap, 'heart-pulse': HeartPulse,
    'plane': Plane, 'gamepad-2': Gamepad2, 'smartphone': Smartphone, 'dollar-sign': DollarSign
};

// Mapa de Bancos (Cores do Terminal)
const BROKER_COLORS: any = {
    'nubank': 'text-purple-400 border-purple-500/50 bg-purple-900/10',
    'inter': 'text-orange-400 border-orange-500/50 bg-orange-900/10',
    'bb': 'text-yellow-400 border-yellow-500/50 bg-yellow-900/10',
    'itau': 'text-orange-500 border-orange-600/50 bg-orange-900/10',
    'santander': 'text-red-500 border-red-600/50 bg-red-900/10',
    'c6': 'text-gray-200 border-gray-500/50 bg-gray-800',
    'money': 'text-emerald-400 border-emerald-500/50 bg-emerald-900/10',
    'outros': 'text-gray-400 border-gray-600/50 bg-gray-800'
};

interface TraderViewProps {
    transactions: any[];
    installments: any[];
    recurring: any[];
    activeTab: string;
    months: string[];
    setActiveTab: (month: string) => void;
    currentMonthData: any;
    previousSurplus: number;
    displayBalance: number;
    selectedYear: number; // <--- ADICIONADO
    // Funções
    onTogglePaid: (table: string, id: number, status: boolean) => void;
    onTogglePaidMonth: (table: string, item: any) => void;
    onToggleDelay: (table: string, item: any) => void;
    onDelete: (table: string, id: number) => void;
}

export default function TraderView({
    transactions, installments, recurring, activeTab, months, setActiveTab,
    currentMonthData, previousSurplus, displayBalance, selectedYear, // <--- ADICIONADO
    onTogglePaid, onTogglePaidMonth, onToggleDelay, onDelete
}: TraderViewProps) {

    // Helper para formatar moeda estilo terminal
    const fmt = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    // Helper para pegar nome do banco formatado
    const getBrokerLabel = (method: string) => {
        const map: any = { 'nubank': 'NUBANK', 'inter': 'INTER', 'bb': 'B.BRASIL', 'itau': 'ITAÚ', 'santander': 'SANTA', 'c6': 'C6 BANK', 'money': 'CASH', 'outros': 'OTHER' };
        return map[method] || 'OTHER';
    };

    // Helper de Datas
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

    // Junta tudo numa lista única para a "Tabela de Ordens"
    const getAllItems = () => {
        const list: any[] = []; 
        const monthIndex = months.indexOf(activeTab);
        const monthMap: Record<string, string> = { 'Jan': '/01', 'Fev': '/02', 'Mar': '/03', 'Abr': '/04', 'Mai': '/05', 'Jun': '/06', 'Jul': '/07', 'Ago': '/08', 'Set': '/09', 'Out': '/10', 'Nov': '/11', 'Dez': '/12' };
        const dateFilter = `${monthMap[activeTab]}/${selectedYear}`; // Filtro com Ano

        // 1. Transações Normais (Prioriza target_month ou data exata)
        transactions.forEach(t => {
            // Verifica data exata "dd/mm/aaaa"
            const isMatch = t.date?.includes(dateFilter);
            
            if (isMatch && t.status !== 'delayed') {
                list.push({ ...t, origin: 'transactions', type_label: 'SPOT', isFixed: false });
            }
        });

        // 2. Recorrentes (Lógica atualizada com Ano)
        recurring.forEach(r => {
            if (r.status === 'delayed') return;
            const { m: startMonth, y: startYear } = getStartData(r);
            
            let show = false;
            if (selectedYear > startYear) show = true;
            else if (selectedYear === startYear && monthIndex >= startMonth) show = true;

            if (show && !r.skipped_months?.includes(activeTab)) {
                // Check de pagamento rígido
                const tag = `${activeTab}/${selectedYear}`;
                const isPaid = r.paid_months?.includes(tag);

                list.push({ ...r, origin: 'recurring', type_label: 'FIXED', isFixed: true, date: `VENC ${r.due_day}`, amount: r.value, is_paid: isPaid });
            }
        });

        // 3. Parcelas (Lógica atualizada com Ano e 13x)
        installments.forEach(i => {
            if (i.status === 'delayed') return;
            const { m: startMonth, y: startYear } = getStartData(i);

            const monthsDiff = ((selectedYear - startYear) * 12) + (monthIndex - startMonth);
            const currentInst = 1 + (i.current_installment || 0) + monthsDiff;

            if (currentInst >= 1 && currentInst <= i.installments_count) {
                // Check de pagamento rígido
                const tag = `${activeTab}/${selectedYear}`;
                const isPaid = i.paid_months?.includes(tag);

                list.push({ 
                    ...i, 
                    origin: 'installments', 
                    type_label: `FUTURES (${currentInst}/${i.installments_count})`, 
                    isFixed: false, 
                    date: `VENC ${i.due_day}`, 
                    amount: i.value_per_month,
                    is_paid: isPaid 
                });
            }
        });

        return list.sort((a, b) => (Number(b.amount) || 0) - (Number(a.amount) || 0)); // Ordena por valor
    };

    const items = getAllItems();
    const isPositive = displayBalance >= 0;

    return (
        <div className="font-mono text-xs md:text-sm animate-in fade-in duration-500">
            
            {/* BARRA DE TICKER SUPERIOR */}
            <div className="flex overflow-x-auto gap-4 p-2 bg-black border-y border-gray-800 mb-6 scrollbar-hide items-center">
                <div className="flex items-center gap-2 px-4 border-r border-gray-800 whitespace-nowrap">
                    <span className="text-gray-500 font-bold">MARKET:</span>
                    <span className="text-emerald-500 font-bold flex items-center gap-1"><Activity size={12}/> OPEN</span>
                </div>
                <div className="flex items-center gap-2 px-4 border-r border-gray-800 whitespace-nowrap">
                    <span className="text-gray-500 font-bold">NET P&L:</span>
                    <span className={`font-bold ${isPositive ? 'text-emerald-400' : 'text-red-500'}`}>
                        {isPositive ? '▲' : '▼'} R$ {fmt(displayBalance)}
                    </span>
                </div>
                <div className="flex items-center gap-2 px-4 border-r border-gray-800 whitespace-nowrap">
                    <span className="text-gray-500 font-bold">VOL (OUT):</span>
                    <span className="text-red-400">R$ {fmt(currentMonthData.expenseTotal)}</span>
                </div>
                <div className="flex items-center gap-2 px-4 whitespace-nowrap">
                    <span className="text-gray-500 font-bold">VOL (IN):</span>
                    <span className="text-emerald-400">R$ {fmt(currentMonthData.income)}</span>
                </div>
            </div>

            {/* GRID DE DASHBOARD "BLOOMBERG" */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* COLUNA ESQUERDA: CONTROLES DE MÊS (VERTICAL) */}
                <div className="lg:col-span-1 bg-[#050505] border border-gray-800 p-4 rounded-sm h-fit shadow-lg">
                    <h3 className="text-gray-500 mb-4 font-bold border-b border-gray-800 pb-2 text-[10px] tracking-widest">TIMEFRAME_SELECTOR</h3>
                    <div className="grid grid-cols-3 gap-1">
                        {months.map(m => (
                            <button 
                                key={m} 
                                onClick={() => setActiveTab(m)}
                                className={`p-2 text-center border transition-all text-[10px] font-bold ${activeTab === m ? 'bg-cyan-900/20 border-cyan-500 text-cyan-400' : 'bg-black border-gray-800 text-gray-600 hover:border-gray-600 hover:text-gray-400'}`}
                            >
                                {m.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    
                    <div className="mt-8 border border-gray-800 p-3 bg-black">
                        <p className="text-gray-500 mb-2 text-[10px]">WALLET_HEALTH</p>
                        <div className="flex justify-between mb-1 text-xs"><span>MARGIN:</span> <span className={displayBalance < 0 ? 'text-red-500' : 'text-white'}>{currentMonthData.income > 0 ? ((displayBalance / currentMonthData.income) * 100).toFixed(1) : 0}%</span></div>
                        <div className="w-full bg-gray-900 h-1.5 mt-2 overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${displayBalance >= 0 ? 'bg-emerald-500' : 'bg-red-600'}`} style={{ width: `${Math.min(Math.abs((displayBalance / (currentMonthData.income || 1)) * 100), 100)}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* COLUNA DIREITA: TABELA DE ORDENS (TRANSAÇÕES) */}
                <div className="lg:col-span-3 bg-[#050505] border border-gray-800 rounded-sm overflow-hidden min-h-[500px]">
                    <div className="p-3 border-b border-gray-800 bg-black flex justify-between items-center">
                        <h3 className="text-gray-400 font-bold text-xs tracking-wider">ORDER_BOOK (Lançamentos)</h3>
                        <div className="flex gap-2 items-center">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-[10px] text-gray-600">LIVE FEED</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-900/50 text-gray-600 border-b border-gray-800 text-[10px] uppercase font-bold tracking-wider">
                                <tr>
                                    <th className="p-3">Status</th>
                                    <th className="p-3">Asset / Desc</th>
                                    <th className="p-3">Broker</th>
                                    <th className="p-3">Type</th>
                                    <th className="p-3 text-right">Val (R$)</th>
                                    <th className="p-3 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/30">
                                {items.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-700 italic">NO POSITIONS FOUND</td></tr>
                                ) : items.map((item: any) => {
                                    // isPaid já vem calculado no getAllItems para Recorrentes/Parcelas
                                    // Para transactions, usa o is_paid direto
                                    const isPaid = item.origin === 'transactions' ? item.is_paid : item.is_paid; 
                                    const Icon = ICON_MAP[item.icon] || DollarSign;
                                    const brokerColor = BROKER_COLORS[item.payment_method] || 'text-gray-500 border-gray-700 bg-gray-900';

                                    return (
                                        <tr key={`${item.origin}-${item.id}`} className="hover:bg-gray-900/30 transition group">
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 text-[9px] font-bold border ${isPaid ? 'border-emerald-500 text-emerald-500 bg-emerald-900/10' : (item.status === 'delayed' ? 'border-red-500 text-red-500 bg-red-900/10' : 'border-yellow-600 text-yellow-600 bg-yellow-900/10')}`}>
                                                    {item.status === 'delayed' ? 'DELAYED' : (isPaid ? 'FILLED' : 'OPEN')}
                                                </span>
                                            </td>
                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <Icon size={14} className="text-cyan-600"/>
                                                    <span className="font-bold text-gray-300 truncate max-w-[150px]">{item.title.toUpperCase()}</span>
                                                </div>
                                            </td>
                                            <td className="p-3">
                                                <span className={`text-[9px] px-1.5 py-0.5 border rounded-sm ${brokerColor}`}>
                                                    {getBrokerLabel(item.payment_method)}
                                                </span>
                                            </td>
                                            <td className="p-3 text-gray-500 text-[10px]">{item.type_label}</td>
                                            <td className={`p-3 text-right font-mono font-bold ${item.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {item.type === 'income' ? '+' : '-'} {fmt(Number(item.amount))}
                                            </td>
                                            <td className="p-3 flex justify-center gap-2 opacity-30 group-hover:opacity-100 transition">
                                                <button 
                                                    onClick={() => item.origin === 'transactions' ? onTogglePaid('transactions', item.id, item.is_paid) : onTogglePaidMonth(item.origin, item)} 
                                                    className="hover:text-emerald-400"
                                                    title="Executar Ordem (Pagar)"
                                                >
                                                    <CheckCircle2 size={14}/>
                                                </button>
                                                <button onClick={() => onToggleDelay(item.origin, item)} className="hover:text-yellow-400" title="Hold (Adiar)">
                                                    <Clock size={14}/>
                                                </button>
                                                <button onClick={() => onDelete(item.origin, item.id)} className="hover:text-red-500" title="Cancelar">
                                                    <XCircle size={14}/>
                                                </button>
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