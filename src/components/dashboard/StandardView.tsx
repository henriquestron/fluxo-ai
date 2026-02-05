import React from 'react';
import { 
    DollarSign, TrendingDown, CreditCard, AlertCircle, Check, Eye, EyeOff, 
    Clock, Pencil, Trash2, ExternalLink, List, LayoutGrid, CheckSquare, 
    Square, AlertTriangle, TrendingUp,
    // ÍCONES PARA PERSONALIZAÇÃO
    ShoppingCart, Home, Car, Utensils, Zap, GraduationCap, 
    HeartPulse, Plane, Gamepad2, Smartphone
} from 'lucide-react';

// --- MAPA DE ÍCONES ---
const ICON_MAP: any = {
    'shopping-cart': ShoppingCart, 'home': Home, 'car': Car, 'utensils': Utensils,
    'zap': Zap, 'graduation-cap': GraduationCap, 'heart-pulse': HeartPulse,
    'plane': Plane, 'gamepad-2': Gamepad2, 'smartphone': Smartphone, 'dollar-sign': DollarSign
};

// --- COMPONENTE CARD INTERNO ---
const Card = ({ title, value, icon: Icon, type, extraLabel, subValueLabel, elementId }: any) => {
    // Define as cores baseado no tipo
    let bgClass = "bg-[#0f1219] border-gray-800 hover:border-cyan-500/30";
    let textClass = "text-white";
    let iconBgClass = "bg-cyan-500/10 text-cyan-400";
    let glowClass = "from-cyan-600/10";

    if (type === 'negative') {
        bgClass = "bg-red-950/20 border-red-900/50";
        textClass = "text-red-500";
        iconBgClass = "bg-red-500/10 text-red-400";
        glowClass = "from-red-600/10";
    } else if (type === 'warning') { // Stand-by
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
    setActiveTab: (month: string) => void;
    currentMonthData: any;
    previousSurplus: number;
    displayBalance: number;
    viewingAs: any;
    onTogglePaid: (table: string, id: number, status: boolean) => void;
    onToggleSkip: (item: any) => void;
    onToggleDelay: (table: string, item: any) => void;
    onDelete: (table: string, id: number) => void;
    onEdit: (item: any, mode: any) => void;
    onTogglePaidMonth: (table: string, item: any) => void;
    getReceipt: (item: any, month: string) => string | null;
}

export default function StandardView({
    transactions, installments, recurring, activeTab, months, setActiveTab,
    currentMonthData, previousSurplus, displayBalance, viewingAs,
    onTogglePaid, onToggleSkip, onToggleDelay, onDelete, onEdit, onTogglePaidMonth, getReceipt
}: StandardViewProps) {

    // Helper para Renderizar Ícones Personalizados
    const renderIconItem = (iconName: string) => {
        const IconComp = ICON_MAP[iconName] || DollarSign;
        return <IconComp size={16} className="text-cyan-500"/>;
    };

    const renderTransactions = () => { 
        const monthMap: Record<string, string> = { 'Jan': '/01', 'Fev': '/02', 'Mar': '/03', 'Abr': '/04', 'Mai': '/05', 'Jun': '/06', 'Jul': '/07', 'Ago': '/08', 'Set': '/09', 'Out': '/10', 'Nov': '/11', 'Dez': '/12' }; 
        const filter = monthMap[activeTab]; 
        const normalItems = transactions.filter(t => t.date?.includes(filter) && t.status !== 'delayed'); 
        const fixedItems = recurring.map(r => { const startMonthIndex = r.start_date ? parseInt(r.start_date.split('/')[1]) - 1 : 0; const currentMonthIndex = months.indexOf(activeTab); if (currentMonthIndex < startMonthIndex) return null; return { ...r, isFixed: true, isSkipped: r.skipped_months?.includes(activeTab), date: 'Fixo Mensal', amount: r.value }; }).filter(Boolean); 
        const allItems = [...fixedItems, ...normalItems.map(t => ({...t, isFixed: false, isSkipped: false}))]; 
        
        if (allItems.length === 0) return <p className="text-gray-500 text-center py-8 italic text-sm border border-dashed border-gray-800 rounded-xl">Nenhuma movimentação para {viewingAs ? 'este cliente' : 'você'} em {activeTab}.</p>; 
        
        return allItems.map((item: any, index: number) => { 
            if (item.status === 'delayed') return null; 
            const isDimmed = item.isSkipped || item.is_paid; 
            const currentReceipt = getReceipt(item, activeTab);
            const rowId = index === 0 ? 'action-group-0' : undefined;

            return ( 
                <div key={`${item.isFixed ? 'fix' : 'var'}-${item.id}`} className={`flex justify-between items-center p-4 border rounded-xl group transition ${isDimmed ? 'bg-[#0f1219]/50 border-gray-800/50 opacity-60' : 'bg-[#0f1219] border-gray-800 hover:border-gray-700'}`}> 
                    <div className="flex items-center gap-4"> 
                        {!item.isFixed && (<button onClick={() => onTogglePaid('transactions', item.id, item.is_paid)} title="Marcar como Pago/Pendente" className={`rounded-full p-1.5 border transition ${item.is_paid ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'border-gray-600 text-transparent hover:border-emerald-500'}`}><Check size={12} /></button>)} 
                        {item.isFixed && (<button onClick={() => onToggleSkip(item)} title={item.isSkipped ? "Restaurar neste mês" : "Ocultar deste mês (sem excluir regra)"} className={`rounded-full p-1.5 border transition ${item.isSkipped ? 'bg-gray-800 border-gray-700 text-gray-500' : 'border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10'}`}>{item.isSkipped ? <EyeOff size={12}/> : <Eye size={12}/>}</button>)} 
                        
                        {/* ÍCONE PERSONALIZADO AQUI */}
                        <div className={`p-2 rounded-lg bg-gray-800/50 border border-gray-700 ${item.isFixed ? 'text-blue-400' : 'text-gray-400'}`}>
                            {renderIconItem(item.icon)}
                        </div>

                        <div> 
                            <p className={`font-semibold text-sm ${isDimmed ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{item.title} {item.isFixed && <span className="text-[9px] bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded ml-1 uppercase tracking-wide">Fixo</span>}</p> 
                            <div className="flex items-center gap-2"><p className="text-xs text-gray-500">{item.isSkipped ? 'PULADO' : item.date}</p>{currentReceipt && (<a href={currentReceipt} target="_blank" rel="noopener noreferrer" title="Ver comprovante" className="text-cyan-500 hover:text-cyan-400 flex items-center text-[10px] gap-1 bg-cyan-900/20 px-1.5 rounded transition"><ExternalLink size={10}/> Ver Comprovante</a>)}</div> 
                        </div> 
                    </div> 
                    <div className="flex items-center gap-3"> 
                        <span className={`font-mono font-medium ${item.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>{item.type === 'expense' ? '-' : '+'} {item.amount.toFixed(2)}</span> 
                        <div id={rowId} className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition"> 
                            {!item.isFixed && item.type === 'expense' && (<button onClick={() => onToggleDelay(item.isFixed ? 'recurring' : 'transactions', item)} title="Congelar/Stand-by" className="p-1.5 rounded bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white"><Clock size={14}/></button>)} 
                            <button onClick={() => onEdit(item, item.isFixed ? (item.type === 'income' ? 'income' : 'fixed_expense') : (item.type === 'income' ? 'income' : 'expense'))} title="Editar" className="p-1.5 rounded hover:bg-blue-500/10 text-blue-500"><Pencil size={14}/></button> 
                            <button onClick={() => onDelete(item.isFixed ? 'recurring' : 'transactions', item.id)} title="Excluir" className="p-1.5 rounded hover:bg-red-500/10 text-red-500"><Trash2 size={14}/></button> 
                        </div> 
                    </div> 
                </div> 
            ); 
        }); 
    };

    const renderDelayed = () => { 
        const delayedTrans = transactions.filter(t => t.status === 'delayed').map(t => ({ ...t, _source: 'trans' })); 
        const delayedInst = installments.filter(i => i.status === 'delayed').map(i => ({ ...i, _source: 'inst' })); 
        const delayedRecur = recurring.filter(r => r.status === 'delayed').map(r => ({ ...r, _source: 'recur' })); 
        const delayedItems = [...delayedTrans, ...delayedInst, ...delayedRecur]; 
        
        if (delayedItems.length === 0) return null; 
        
        return (
            <div className="mt-8 border border-red-900/30 bg-red-950/10 rounded-2xl p-6">
                <h3 className="text-red-400 font-bold flex items-center gap-2 mb-4"><AlertTriangle size={18}/> Em Stand-by (Congelados)</h3>
                <div className="space-y-2">
                    {delayedItems.map((item: any) => (
                        <div key={`del-${item._source}-${item.id}`} className="flex justify-between items-center p-3 bg-red-900/10 rounded-lg border border-red-900/20">
                            <span className="text-red-200 text-sm">{item.title}</span>
                            <div className="flex items-center gap-3">
                                <span className="font-mono text-red-400 font-bold">R$ {(item.amount || item.value || item.value_per_month).toFixed(2)}</span>
                                <button onClick={() => onToggleDelay(item._source === 'trans' ? 'transactions' : item._source === 'inst' ? 'installments' : 'recurring', item)} title="Restaurar" className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-400">Restaurar</button>
                            </div>
                        </div>
                    ))}
                </div>
                <p className="text-xs text-red-500/50 mt-3 text-center">Estes valores não afetam seu saldo atual.</p>
            </div>
        ) 
    };

    const hasDelayed = currentMonthData.delayedTotal > 0;
    // CORREÇÃO: Grid class agora lida com 4 colunas de forma estável
    const gridClass = hasDelayed ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-4" : "grid-cols-1 md:grid-cols-3";

    return (
        <div className="animate-in fade-in zoom-in duration-500">
            {/* CARDS DE RESUMO */}
            <div className={`grid gap-4 mb-12 ${gridClass}`}>
                <Card 
                    elementId="card-saldo" 
                    title={`Saldo ${viewingAs ? 'do Cliente' : 'Pessoal'} (${activeTab})`} 
                    value={displayBalance} 
                    icon={DollarSign} 
                    type={displayBalance >= 0 ? 'income' : 'negative'} 
                    extraLabel={previousSurplus > 0 ? `+ R$ ${previousSurplus.toFixed(2)} (Sobra)` : null} 
                />
                <Card 
                    title="Saídas Totais" 
                    value={currentMonthData.expenseTotal} 
                    icon={TrendingDown} 
                    type="expense" 
                    subValueLabel={currentMonthData.accumulatedDebt > 0 ? (<span className="text-red-400 font-bold flex items-center gap-1"><AlertCircle size={12}/> + R$ {currentMonthData.accumulatedDebt.toFixed(2)} Pendente</span>) : null} 
                />
                <Card 
                    title="Entradas" 
                    value={currentMonthData.income} 
                    icon={TrendingUp} // Ícone corrigido para TrendingUp
                    type="income" 
                />
                {/* CARD STAND-BY (VOLTOU AO ORIGINAL MAS USANDO O COMPONENTE CARD) */}
                {hasDelayed && (
                    <Card 
                        title="Em Stand-by"
                        value={currentMonthData.delayedTotal}
                        icon={Clock}
                        type="warning" // Cor Laranja
                        subValueLabel="Valores Adiados"
                    />
                )}
            </div>

            {/* ÁREA PRINCIPAL */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* COLUNA ESQUERDA */}
                <div className="xl:col-span-1 space-y-6">
                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-200"><List size={20} className="text-cyan-500"/> Extrato</h2>
                    <div className="space-y-3">{renderTransactions()}</div>
                    {renderDelayed()}
                </div>

                {/* COLUNA DIREITA */}
                <div className="xl:col-span-2 bg-[#0f1219] border border-gray-800 rounded-3xl p-6 md:p-8">
                    <div className="flex justify-between items-center mb-6">
                        <h2 className="text-xl font-bold flex items-center gap-2"><LayoutGrid size={20} className="text-cyan-500"/> Financiamentos & Contas</h2>
                        <div className="flex bg-black p-1 rounded-xl border border-gray-800 overflow-x-auto w-full md:w-auto scrollbar-hide">
                            {months.map((month) => (
                                <button key={month} onClick={() => setActiveTab(month)} className={`px-6 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === month ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>{month}</button>
                            ))}
                        </div>
                    </div>
                    
                    {/* LISTA MOBILE */}
                    <div className="block md:hidden space-y-3">
                        {[...installments, ...recurring.filter(r => r.type === 'expense')].map(item => { 
                            const isInstallment = item.installments_count !== undefined; 
                            const currentInst = isInstallment ? item.current_installment + months.indexOf(activeTab) : null; 
                            if (item.status === 'delayed') return null; 
                            if (isInstallment && (currentInst < 1 || currentInst > item.installments_count)) return null; 
                            if (!isInstallment && (item.skipped_months?.includes(activeTab))) return null; 
                            if (!isInstallment) { const startMonthIndex = item.start_date ? parseInt(item.start_date.split('/')[1]) - 1 : 0; if (months.indexOf(activeTab) < startMonthIndex) return null; } 
                            const isPaid = item.paid_months?.includes(activeTab); 
                            const prefix = isInstallment ? 'mob-inst' : 'mob-rec'; 
                            const currentReceipt = getReceipt(item, activeTab); 
                            return ( 
                                <div key={`${prefix}-${item.id}`} className={`p-4 rounded-xl border ${isPaid ? 'bg-emerald-950/20 border-emerald-900/30' : 'bg-gray-900 border-gray-800'}`}> 
                                    <div className="flex justify-between mb-2">
                                        <span className="font-bold text-white flex items-center gap-2">
                                            {renderIconItem(item.icon)} {item.title}
                                        </span>
                                        <span className="font-mono text-gray-300">R$ {(item.value || item.value_per_month).toFixed(2)}</span>
                                    </div> 
                                    <div className="flex justify-between items-center text-xs text-gray-500 mb-4"><span>{isInstallment ? `Parcela ${currentInst}/${item.installments_count}` : 'Recorrente'}</span><span className={`px-2 py-0.5 rounded ${isInstallment ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>{isInstallment ? 'Parcelado' : 'Fixo'}</span></div> 
                                    <div className="flex justify-between items-center border-t border-gray-800 pt-3"> 
                                        <button onClick={() => onTogglePaidMonth(isInstallment ? 'installments' : 'recurring', item)} title="Marcar como Pago" className={`flex items-center gap-2 text-sm font-medium ${isPaid ? 'text-emerald-400' : 'text-gray-400'}`}>{isPaid ? <CheckSquare size={18}/> : <Square size={18}/>} {isPaid ? 'Pago' : 'Marcar'}</button> 
                                        <div className="flex gap-4">
                                            {currentReceipt && (<a href={currentReceipt} target="_blank" rel="noopener noreferrer" title="Ver Comprovante" className="text-cyan-500"><ExternalLink size={18}/></a>)}
                                            <button onClick={() => onToggleDelay(isInstallment ? 'installments' : 'recurring', item)} title="Congelar/Adiar" className="text-orange-400"><Clock size={18}/></button>
                                            <button onClick={() => onEdit(item, isInstallment ? 'installment' : 'fixed_expense')} title="Editar" className="text-blue-400"><Pencil size={18}/></button>
                                            <button onClick={() => onDelete(isInstallment ? 'installments' : 'recurring', item.id)} title="Excluir" className="text-red-400"><Trash2 size={18}/></button>
                                        </div> 
                                    </div> 
                                </div> 
                            ); 
                        })}
                    </div>

                    {/* TABELA DESKTOP */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead><tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800"><th className="pb-4 pl-2 font-medium">Descrição</th><th className="pb-4 font-medium">Tipo</th><th className="pb-4 font-medium">Status</th><th className="pb-4 pr-2 text-right font-medium">Valor</th><th className="pb-4 w-24 text-right">Pago?</th><th className="pb-4 w-24"></th></tr></thead>
                            <tbody className="text-sm">
                                {installments.map((inst) => {
                                    if (inst.status === 'delayed') return null;
                                    const currentInst = inst.current_installment + months.indexOf(activeTab);
                                    if (currentInst < 1 || currentInst > inst.installments_count) return null;
                                    const isPaid = inst.paid_months?.includes(activeTab);
                                    const currentReceipt = getReceipt(inst, activeTab);
                                    return (
                                        <tr key={`desk-inst-${inst.id}`} className={`border-b border-gray-800/50 group transition ${isPaid ? 'bg-emerald-950/10' : 'hover:bg-gray-800/30'}`}>
                                            <td className="py-4 pl-2 font-medium text-white flex items-center gap-2">{renderIconItem(inst.icon)} {inst.title}</td>
                                            <td className="py-4 text-gray-500"><span className="bg-purple-500/10 text-purple-400 px-2 py-1 rounded text-xs">Parcelado</span></td>
                                            <td className="py-4 text-gray-400"><span className="bg-gray-800 text-xs px-2 py-1 rounded text-gray-300 border border-gray-700">{currentInst}/{inst.installments_count}</span></td>
                                            <td className="py-4 pr-2 text-right font-mono text-gray-200">R$ {inst.value_per_month.toFixed(2)}</td>
                                            <td className="py-4 text-right"><button onClick={() => onTogglePaidMonth('installments', inst)} title="Marcar Parcela como Paga" className={`transition ${isPaid ? 'text-emerald-400 hover:text-emerald-300' : 'text-gray-600 hover:text-white'}`}>{isPaid ? <CheckSquare size={20}/> : <Square size={20}/>}</button></td>
                                            <td className="py-4 text-right flex gap-3 justify-end">
                                                {currentReceipt && (<a href={currentReceipt} target="_blank" rel="noopener noreferrer" title="Ver Comprovante" className="text-cyan-500 hover:text-white transition"><ExternalLink size={16}/></a>)}
                                                <button onClick={() => onToggleDelay('installments', inst)} title="Congelar/Adiar" className="text-gray-600 hover:text-orange-500 opacity-0 group-hover:opacity-100 transition"><Clock size={16}/></button>
                                                <button onClick={() => onEdit(inst, 'installment')} title="Editar" className="text-gray-600 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition"><Pencil size={16}/></button>
                                                <button onClick={() => onDelete('installments', inst.id)} title="Excluir" className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16}/></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {recurring.filter(r => r.type === 'expense').map((rec) => {
                                     if (rec.status === 'delayed' || rec.skipped_months?.includes(activeTab)) return null;
                                     const startMonthIndex = rec.start_date ? parseInt(rec.start_date.split('/')[1]) - 1 : 0;
                                     if (months.indexOf(activeTab) < startMonthIndex) return null;
                                     const isPaid = rec.paid_months?.includes(activeTab);
                                     const currentReceipt = getReceipt(rec, activeTab);
                                     return (
                                        <tr key={`desk-rec-${rec.id}`} className={`border-b border-gray-800/50 group transition ${isPaid ? 'bg-emerald-950/10' : 'hover:bg-gray-800/30'}`}>
                                            <td className="py-4 pl-2 font-medium text-white flex items-center gap-2">{renderIconItem(rec.icon)} {rec.title}</td>
                                            <td className="py-4 text-gray-500"><span className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded text-xs">Fixo</span></td>
                                            <td className="py-4 text-gray-400 text-xs">Mensal</td>
                                            <td className="py-4 pr-2 text-right font-mono text-gray-200">R$ {rec.value.toFixed(2)}</td>
                                            <td className="py-4 text-right"><button onClick={() => onTogglePaidMonth('recurring', rec)} title="Marcar como Pago" className={`transition ${isPaid ? 'text-emerald-400 hover:text-emerald-300' : 'text-gray-600 hover:text-white'}`}>{isPaid ? <CheckSquare size={20}/> : <Square size={20}/>}</button></td>
                                            <td className="py-4 text-right flex gap-3 justify-end">
                                                {currentReceipt && (<a href={currentReceipt} target="_blank" rel="noopener noreferrer" title="Ver Comprovante" className="text-cyan-500 hover:text-white transition"><ExternalLink size={16}/></a>)}
                                                <button onClick={() => onToggleDelay('recurring', rec)} title="Congelar/Adiar" className="text-gray-600 hover:text-orange-500 opacity-0 group-hover:opacity-100 transition"><Clock size={16}/></button>
                                                <button onClick={() => onEdit(rec, 'fixed_expense')} title="Editar" className="text-gray-600 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition"><Pencil size={16}/></button>
                                                <button onClick={() => onDelete('recurring', rec.id)} title="Excluir" className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16}/></button>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}