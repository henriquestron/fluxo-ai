import React from 'react';
import { 
    Clock, Calendar, CheckCircle2, AlertCircle, RefreshCw, CreditCard, 
    ArrowUpRight, ArrowDownLeft,
    ShoppingCart, Home, Car, Utensils, GraduationCap, HeartPulse, Plane, Gamepad2, Zap, Smartphone, DollarSign
} from 'lucide-react';

// Mapa de Ícones
const ICON_MAP: any = {
    'shopping-cart': ShoppingCart, 'home': Home, 'car': Car, 'utensils': Utensils,
    'zap': Zap, 'graduation-cap': GraduationCap, 'heart-pulse': HeartPulse,
    'plane': Plane, 'gamepad-2': Gamepad2, 'smartphone': Smartphone, 'dollar-sign': DollarSign
};

// Cores dos Bancos (Badges)
const BANK_BADGES: any = {
    'nubank': 'bg-[#820AD1]/20 text-[#bf5eff] border-[#820AD1]/30',
    'inter': 'bg-[#FF7A00]/20 text-[#ff9f4d] border-[#FF7A00]/30',
    'bb': 'bg-[#F8D117]/20 text-[#fde047] border-[#F8D117]/30',
    'itau': 'bg-[#EC7000]/20 text-[#fdba74] border-[#EC7000]/30',
    'santander': 'bg-[#CC0000]/20 text-[#fca5a5] border-[#CC0000]/30',
    'c6': 'bg-gray-800 text-gray-300 border-gray-600',
    'money': 'bg-emerald-900/30 text-emerald-400 border-emerald-500/30',
    'outros': 'bg-gray-800 text-gray-500 border-gray-700'
};

interface TimelineViewProps {
    transactions: any[];
    installments: any[];
    recurring: any[];
    activeTab: string;
}

export default function TimelineView({ transactions, installments, recurring, activeTab }: TimelineViewProps) {
    
    // Helper: Formata mês/ano para filtro
    const monthMap: Record<string, string> = { 'Jan': '/01', 'Fev': '/02', 'Mar': '/03', 'Abr': '/04', 'Mai': '/05', 'Jun': '/06', 'Jul': '/07', 'Ago': '/08', 'Set': '/09', 'Out': '/10', 'Nov': '/11', 'Dez': '/12' };
    const currentYear = 2026; // Idealmente dinâmico, mas seguindo seu padrão
    const monthCode = monthMap[activeTab]; // Ex: "/01"

    // 1. Unificar todos os itens (Transações + Parcelas + Fixas) com datas normalizadas
    const getAllItems = () => {
        let items: any[] = [];

        // Transações
        transactions.forEach(t => {
            // Verifica se pertence ao mês atual
            if (t.date?.includes(monthCode) && t.status !== 'delayed') {
                items.push({ ...t, type_origin: 'trans', date_sort: t.date });
            }
        });

        // Parcelas
        installments.forEach(i => {
            const monthsList = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
            const currentInst = i.current_installment + monthsList.indexOf(activeTab);
            
            if (currentInst >= 1 && currentInst <= i.installments_count && i.status !== 'delayed') {
                const dayStr = i.due_day.toString().padStart(2, '0');
                const dateStr = `${dayStr}${monthCode}/${currentYear}`;
                items.push({ ...i, amount: i.value_per_month, type_origin: 'inst', date_sort: dateStr, type: 'expense' });
            }
        });

        // Recorrentes
        recurring.forEach(r => {
            if (r.status !== 'delayed' && !r.skipped_months?.includes(activeTab)) {
                 // Lógica simplificada de início (poderia ser mais complexa)
                const dayStr = r.due_day.toString().padStart(2, '0');
                const dateStr = `${dayStr}${monthCode}/${currentYear}`;
                items.push({ ...r, amount: r.value, type_origin: 'recur', date_sort: dateStr });
            }
        });

        return items;
    };

    const allItems = getAllItems();

    // 2. Agrupar por Data
    const groupedItems = allItems.reduce((groups: any, item: any) => {
        const date = item.date_sort;
        if (!groups[date]) groups[date] = [];
        groups[date].push(item);
        return groups;
    }, {});

    // 3. Ordenar Datas (Decrescente: Mais novo em cima)
    const sortedDates = Object.keys(groupedItems).sort((a, b) => {
        const [dayA, monthA, yearA] = a.split('/').map(Number);
        const [dayB, monthB, yearB] = b.split('/').map(Number);
        return new Date(yearB, monthB - 1, dayB).getTime() - new Date(yearA, monthA - 1, dayA).getTime();
    });

    return (
        <div className="max-w-3xl mx-auto py-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center mb-12">
                <div className="inline-flex items-center justify-center p-3 rounded-full bg-cyan-900/10 mb-3 animate-pulse">
                    <Clock className="text-cyan-400" size={32} />
                </div>
                <h2 className="text-2xl font-black text-white">Linha do Tempo</h2>
                <p className="text-gray-500 text-sm mt-1">Extrato detalhado de {activeTab}.</p>
            </div>

            {sortedDates.length === 0 ? (
                <div className="text-center text-gray-600 py-20 border border-dashed border-gray-800 rounded-3xl bg-[#0a0a0a]">
                    <Clock size={48} className="mx-auto mb-4 opacity-20"/>
                    <p>Nenhuma movimentação neste mês.</p>
                </div>
            ) : (
                <div className="relative border-l-2 border-gray-800 ml-6 md:ml-20 space-y-16 pb-20">
                    {sortedDates.map((date) => {
                        const items = groupedItems[date];
                        const dayTotal = items.reduce((acc: number, t: any) => t.type === 'income' ? acc + t.amount : acc - t.amount, 0);
                        const [day, month] = date.split('/');

                        return (
                            <div key={date} className="relative pl-8 md:pl-12">
                                {/* DATA STICKY */}
                                <div className="absolute -left-[42px] md:-left-[60px] top-0 flex flex-col items-end w-[30px] md:w-[40px]">
                                    <span className="text-2xl font-black text-white tracking-tighter">{day}</span>
                                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest">DI</span>
                                </div>

                                {/* BOLINHA DA DATA */}
                                <div className={`absolute -left-[9px] top-2 border-4 border-[#050505] rounded-full w-5 h-5 shadow-[0_0_10px_rgba(0,0,0,0.5)] ${dayTotal >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                
                                {/* RESUMO DO DIA */}
                                <div className="mb-6 flex items-center gap-4">
                                    <div className={`text-xs px-2 py-1 rounded font-mono font-bold border ${dayTotal >= 0 ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/50' : 'bg-red-950/30 text-red-400 border-red-900/50'}`}>
                                        {dayTotal >= 0 ? '+' : ''} R$ {dayTotal.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                                    </div>
                                    <div className="h-px flex-1 bg-gray-800/50"></div>
                                </div>

                                {/* LISTA DE ITENS DO DIA */}
                                <div className="space-y-3">
                                    {items.map((t: any, idx: number) => {
                                        const Icon = ICON_MAP[t.icon] || (t.type === 'income' ? ArrowUpRight : ArrowDownLeft);
                                        const bankBadge = BANK_BADGES[t.payment_method] || BANK_BADGES['outros'];
                                        const isPaid = t.is_paid || t.paid_months?.includes(activeTab);

                                        return (
                                            <div key={`${t.id}-${idx}`} className="bg-[#0a0a0a] border border-gray-800 p-4 rounded-xl flex items-center justify-between hover:border-gray-600 transition group relative overflow-hidden shadow-sm">
                                                
                                                {/* Borda lateral colorida */}
                                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${t.type === 'income' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>

                                                <div className="flex items-center gap-4 pl-3">
                                                    <div className={`p-2.5 rounded-xl border ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                        <Icon size={20} strokeWidth={2}/>
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <h4 className={`font-bold text-sm ${isPaid ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{t.title}</h4>
                                                            {t.status === 'delayed' && <span className="text-[9px] font-bold bg-red-500 text-black px-1 rounded">ATRASADO</span>}
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-2 mt-1">
                                                            {/* Categoria */}
                                                            <span className="text-[10px] text-gray-500 bg-gray-800/50 px-1.5 py-0.5 rounded border border-gray-700/50">
                                                                {t.category}
                                                            </span>
                                                            
                                                            {/* Badge de Banco */}
                                                            <span className={`text-[9px] px-1.5 py-0.5 rounded border uppercase font-bold tracking-wide ${bankBadge}`}>
                                                                {t.payment_method || 'Outros'}
                                                            </span>

                                                            {/* Se for parcela */}
                                                            {t.type_origin === 'inst' && (
                                                                <span className="flex items-center gap-1 text-[10px] text-purple-400 font-bold">
                                                                    <CreditCard size={10}/> {t.current_installment + ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'].indexOf(activeTab)}/{t.installments_count}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <div className={`font-mono font-bold text-sm ${t.type === 'income' ? 'text-emerald-400' : 'text-red-400'} ${isPaid ? 'opacity-50' : ''}`}>
                                                        {t.type === 'income' ? '+' : '-'} {t.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                    </div>
                                                    {isPaid && (
                                                        <div className="text-[10px] text-emerald-600 flex items-center justify-end gap-1 mt-0.5 font-bold">
                                                            <CheckCircle2 size={10}/> Pago
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    );
}