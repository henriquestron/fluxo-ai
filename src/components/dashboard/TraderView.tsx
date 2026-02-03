import React from 'react';
import { TrendingUp, TrendingDown, Activity, DollarSign, Clock, Lock, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';

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
    // Funções
    onTogglePaid: (table: string, id: number, status: boolean) => void;
    onToggleDelay: (table: string, item: any) => void;
    onDelete: (table: string, id: number) => void;
}

export default function TraderView({
    transactions, installments, recurring, activeTab, months, setActiveTab,
    currentMonthData, previousSurplus, displayBalance,
    onTogglePaid, onToggleDelay, onDelete
}: TraderViewProps) {

    // Helper para formatar moeda estilo terminal
    const fmt = (val: number) => val.toLocaleString('pt-BR', { minimumFractionDigits: 2 });

    // Junta tudo numa lista única para a "Tabela de Ordens"
    const getAllItems = () => {
        const list: any[] = []; 
        
        const monthMap: Record<string, string> = { 'Jan': '/01', 'Fev': '/02', 'Mar': '/03', 'Abr': '/04', 'Mai': '/05', 'Jun': '/06', 'Jul': '/07', 'Ago': '/08', 'Set': '/09', 'Out': '/10', 'Nov': '/11', 'Dez': '/12' };
        
        // 1. Transações Normais
        transactions.forEach(t => {
            if (t.date?.includes(monthMap[activeTab]) && t.status !== 'delayed') {
                list.push({ ...t, origin: 'transactions', type_label: 'SPOT', isFixed: false });
            }
        });

        // 2. Recorrentes
        recurring.forEach(r => {
            const startMonthIndex = r.start_date ? parseInt(r.start_date.split('/')[1]) - 1 : 0;
            const currentMonthIndex = months.indexOf(activeTab);
            if (currentMonthIndex >= startMonthIndex && !r.skipped_months?.includes(activeTab) && r.status !== 'delayed') {
                list.push({ ...r, origin: 'recurring', type_label: 'FIXED', isFixed: true, date: 'MENSAL', amount: r.value });
            }
        });

        // 3. Parcelas
        installments.forEach(i => {
            const currentInst = i.current_installment + months.indexOf(activeTab);
            if (currentInst >= 1 && currentInst <= i.installments_count && i.status !== 'delayed') {
                list.push({ ...i, origin: 'installments', type_label: `FUTURES (${currentInst}/${i.installments_count})`, isFixed: false, date: `VENC ${i.due_day}`, amount: i.value_per_month });
            }
        });

        return list.sort((a, b) => (b.amount || 0) - (a.amount || 0)); // Ordena por valor (Maior impacto primeiro)
    };

    const items = getAllItems();
    const isPositive = displayBalance >= 0;

    return (
        <div className="font-mono text-xs md:text-sm animate-in fade-in duration-500">
            
            {/* BARRA DE TICKER SUPERIOR */}
            <div className="flex overflow-x-auto gap-4 p-2 bg-black border-y border-gray-800 mb-6 scrollbar-hide">
                <div className="flex items-center gap-2 px-4 border-r border-gray-800 whitespace-nowrap">
                    <span className="text-gray-500">MERCADO:</span>
                    <span className="text-emerald-500 font-bold flex items-center gap-1"><Activity size={12}/> ABERTO</span>
                </div>
                <div className="flex items-center gap-2 px-4 border-r border-gray-800 whitespace-nowrap">
                    <span className="text-gray-500">SALDO LÍQUIDO:</span>
                    <span className={`font-bold ${isPositive ? 'text-emerald-400' : 'text-red-500'}`}>
                        {isPositive ? '▲' : '▼'} R$ {fmt(displayBalance)}
                    </span>
                </div>
                <div className="flex items-center gap-2 px-4 border-r border-gray-800 whitespace-nowrap">
                    <span className="text-gray-500">VOLUME (SAÍDA):</span>
                    <span className="text-red-400">R$ {fmt(currentMonthData.expenseTotal)}</span>
                </div>
                <div className="flex items-center gap-2 px-4 whitespace-nowrap">
                    <span className="text-gray-500">VOLUME (ENTRADA):</span>
                    <span className="text-emerald-400">R$ {fmt(currentMonthData.income)}</span>
                </div>
            </div>

            {/* GRID DE DASHBOARD "BLOOMBERG" */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                
                {/* COLUNA ESQUERDA: CONTROLES DE MÊS (VERTICAL) */}
                <div className="lg:col-span-1 bg-[#0a0a0a] border border-gray-800 p-4 rounded-lg h-fit">
                    <h3 className="text-gray-500 mb-4 font-bold border-b border-gray-800 pb-2">PERIOD_SELECTOR</h3>
                    <div className="grid grid-cols-3 gap-1">
                        {months.map(m => (
                            <button 
                                key={m} 
                                onClick={() => setActiveTab(m)}
                                className={`p-2 text-center border transition-all ${activeTab === m ? 'bg-emerald-900/30 border-emerald-500 text-emerald-400' : 'bg-black border-gray-800 text-gray-600 hover:border-gray-600'}`}
                            >
                                {m.toUpperCase()}
                            </button>
                        ))}
                    </div>
                    
                    <div className="mt-8 border border-gray-800 p-3 bg-black">
                        <p className="text-gray-500 mb-2">STATUS DA CARTEIRA</p>
                        <div className="flex justify-between mb-1"><span>MARGEM LIVRE:</span> <span className={displayBalance < 0 ? 'text-red-500' : 'text-white'}>{((displayBalance / (currentMonthData.income || 1)) * 100).toFixed(1)}%</span></div>
                        <div className="w-full bg-gray-800 h-1 mt-2">
                            <div className={`h-1 transition-all duration-500 ${displayBalance >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${Math.min(Math.abs((displayBalance / (currentMonthData.income || 1)) * 100), 100)}%` }}></div>
                        </div>
                    </div>
                </div>

                {/* COLUNA DIREITA: TABELA DE ORDENS (TRANSAÇÕES) */}
                <div className="lg:col-span-3 bg-[#0a0a0a] border border-gray-800 rounded-lg overflow-hidden">
                    <div className="p-3 border-b border-gray-800 bg-black flex justify-between items-center">
                        <h3 className="text-gray-400 font-bold">ORDER_BOOK (Lançamentos)</h3>
                        <div className="flex gap-2">
                            <span className="text-[10px] text-gray-600">LIVE DATA ●</span>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-900 text-gray-500 border-b border-gray-800">
                                <tr>
                                    <th className="p-3">STATUS</th>
                                    <th className="p-3">TICKER / DESC</th>
                                    <th className="p-3">TYPE</th>
                                    <th className="p-3">DATA</th>
                                    <th className="p-3 text-right">PRICE (R$)</th>
                                    <th className="p-3 text-center">ACTION</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800/50">
                                {items.length === 0 ? (
                                    <tr><td colSpan={6} className="p-8 text-center text-gray-600">NO POSITIONS FOUND</td></tr>
                                ) : items.map((item: any) => {
                                    const isPaid = item.paid_months?.includes(activeTab) || item.is_paid;
                                    return (
                                        <tr key={`${item.origin}-${item.id}`} className="hover:bg-gray-900/30 transition group">
                                            <td className="p-3">
                                                <span className={`px-2 py-0.5 text-[10px] border ${isPaid ? 'border-emerald-500 text-emerald-500 bg-emerald-900/10' : 'border-yellow-600 text-yellow-600 bg-yellow-900/10'}`}>
                                                    {isPaid ? 'EXECUTED' : 'PENDING'}
                                                </span>
                                            </td>
                                            <td className="p-3 font-bold text-gray-300">{item.title.toUpperCase()}</td>
                                            <td className="p-3 text-gray-500">{item.type_label}</td>
                                            <td className="p-3 text-gray-500">{item.date}</td>
                                            <td className={`p-3 text-right font-bold ${item.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {item.type === 'income' ? '+' : '-'} {fmt(item.amount)}
                                            </td>
                                            <td className="p-3 flex justify-center gap-2 opacity-30 group-hover:opacity-100 transition">
                                                <button onClick={() => item.origin === 'transactions' ? onTogglePaid(item.origin, item.id, item.is_paid) : alert('Use o layout padrão para parcelas')} className="hover:text-emerald-400"><CheckCircle2 size={14}/></button>
                                                <button onClick={() => onToggleDelay(item.origin, item)} className="hover:text-yellow-400"><Clock size={14}/></button>
                                                <button onClick={() => onDelete(item.origin, item.id)} className="hover:text-red-500"><XCircle size={14}/></button>
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