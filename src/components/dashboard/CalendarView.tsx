import React from 'react';
import { 
    Calendar as CalIcon, ChevronLeft, ChevronRight, 
    ShoppingCart, Home, Car, Utensils, GraduationCap, HeartPulse, Plane, Gamepad2, Zap, Smartphone, DollarSign
} from 'lucide-react';

// Mapa de Ícones
const ICON_MAP: any = {
    'shopping-cart': ShoppingCart, 'home': Home, 'car': Car, 'utensils': Utensils,
    'zap': Zap, 'graduation-cap': GraduationCap, 'heart-pulse': HeartPulse,
    'plane': Plane, 'gamepad-2': Gamepad2, 'smartphone': Smartphone, 'dollar-sign': DollarSign
};

// Cores dos Bancos (Bordas)
const BANK_BORDERS: any = {
    'nubank': 'border-l-[#820AD1]',
    'inter': 'border-l-[#FF7A00]',
    'bb': 'border-l-[#F8D117]',
    'itau': 'border-l-[#EC7000]',
    'santander': 'border-l-[#CC0000]',
    'c6': 'border-l-gray-200',
    'money': 'border-l-emerald-500',
    'outros': 'border-l-gray-500'
};

export default function CalendarView({ transactions, installments, recurring, activeTab, months, setActiveTab }: any) {
    
    // Helper para pegar dias do mês
    const getDaysInMonth = (monthName: string) => {
        const monthIndex = months.indexOf(monthName);
        const year = 2026;
        const date = new Date(year, monthIndex, 1);
        const days = [];
        while (date.getMonth() === monthIndex) {
            days.push(new Date(date));
            date.setDate(date.getDate() + 1);
        }
        return days;
    };

    const days = getDaysInMonth(activeTab);
    const monthMap: Record<string, string> = { 'Jan': '/01', 'Fev': '/02', 'Mar': '/03', 'Abr': '/04', 'Mai': '/05', 'Jun': '/06', 'Jul': '/07', 'Ago': '/08', 'Set': '/09', 'Out': '/10', 'Nov': '/11', 'Dez': '/12' };

    // Filtra itens por dia
    const getItemsForDay = (day: number) => {
        const dayStr = day.toString().padStart(2, '0');
        const dateFilter = `${dayStr}${monthMap[activeTab]}`; // Ex: "05/02"
        
        // 1. Transações
        const trans = transactions.filter((t: any) => {
            // Se tiver data exata, usa. Se não, tenta bater com o filtro.
            const hasDate = t.date?.includes(dateFilter);
            return hasDate && t.status !== 'delayed';
        }).map((t: any) => ({...t, type_label: 'spot'}));
        
        // 2. Parcelas (Baseado no Dia de Vencimento)
        const insts = installments.filter((i: any) => {
            if (i.status === 'delayed') return false;
            const due = i.due_day || 10;
            const currentInst = i.current_installment + months.indexOf(activeTab);
            // Verifica dia E se a parcela está ativa neste mês
            return due === day && currentInst >= 1 && currentInst <= i.installments_count;
        }).map((i: any) => ({...i, amount: i.value_per_month, type_label: 'parc'}));

        // 3. Recorrentes (Baseado no Dia de Vencimento)
        const recurs = recurring.filter((r: any) => {
            if (r.status === 'delayed') return false;
            const due = r.due_day || 10;
            const startMonthIndex = r.start_date ? parseInt(r.start_date.split('/')[1]) - 1 : 0;
            const currentMonthIndex = months.indexOf(activeTab);
            
            return due === day && r.type === 'expense' && 
                   currentMonthIndex >= startMonthIndex && 
                   !r.skipped_months?.includes(activeTab);
        }).map((r: any) => ({...r, amount: r.value, type_label: 'fixo'}));

        return [...trans, ...insts, ...recurs];
    };

    // Navegação de Mês
    const currentIdx = months.indexOf(activeTab);
    const prevMonth = currentIdx > 0 ? months[currentIdx - 1] : null;
    const nextMonth = currentIdx < months.length - 1 ? months[currentIdx + 1] : null;

    const fmt = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

    return (
        <div className="animate-in fade-in zoom-in duration-500">
            {/* Header do Calendário */}
            <div className="flex justify-between items-center mb-6 bg-[#0f1219] p-4 rounded-2xl border border-gray-800 shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="bg-purple-900/20 p-2.5 rounded-xl text-purple-400 border border-purple-500/20"><CalIcon size={20}/></div>
                    <div>
                        <h2 className="text-lg font-bold text-white">Calendário</h2>
                        <p className="text-xs text-gray-500">Visão mensal de vencimentos</p>
                    </div>
                </div>
                <div className="flex items-center gap-1 bg-black p-1 rounded-xl border border-gray-800">
                    <button onClick={() => prevMonth && setActiveTab(prevMonth)} disabled={!prevMonth} className="p-2 hover:bg-gray-800 rounded-lg disabled:opacity-30 transition text-gray-400 hover:text-white"><ChevronLeft size={18}/></button>
                    <span className="font-bold text-cyan-400 w-20 text-center text-sm uppercase tracking-wider">{activeTab}</span>
                    <button onClick={() => nextMonth && setActiveTab(nextMonth)} disabled={!nextMonth} className="p-2 hover:bg-gray-800 rounded-lg disabled:opacity-30 transition text-gray-400 hover:text-white"><ChevronRight size={18}/></button>
                </div>
            </div>

            {/* CONTAINER COM SCROLL HORIZONTAL PARA MOBILE */}
            <div className="overflow-x-auto pb-4">
                {/* min-w-[1000px] garante que as células tenham espaço */}
                <div className="min-w-[1000px] bg-[#0f1219] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
                    
                    {/* Cabeçalho dias da semana */}
                    <div className="grid grid-cols-7 bg-gray-900 border-b border-gray-800">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                            <div key={d} className="py-3 text-center text-[10px] font-black text-gray-500 uppercase tracking-widest">{d}</div>
                        ))}
                    </div>

                    {/* Grade de Dias */}
                    <div className="grid grid-cols-7 auto-rows-fr bg-[#0a0a0a]">
                        {/* Espaços vazios antes do dia 1 */}
                        {Array.from({ length: days[0].getDay() }).map((_, i) => (
                            <div key={`empty-${i}`} className="border-r border-b border-gray-800/50 min-h-[140px] bg-[#050505]"></div>
                        ))}

                        {days.map((date) => {
                            const dayNum = date.getDate();
                            const items = getItemsForDay(dayNum);
                            const totalDay = items.reduce((acc: number, curr: any) => acc + (curr.amount || 0), 0);
                            
                            // Verifica se é hoje
                            const isToday = new Date().getDate() === dayNum && new Date().getMonth() === months.indexOf(activeTab);

                            return (
                                <div key={dayNum} className={`border-r border-b border-gray-800/50 min-h-[140px] p-2 transition hover:bg-gray-900/80 relative group flex flex-col ${isToday ? 'bg-cyan-950/10' : ''}`}>
                                    
                                    {/* Cabeçalho do Dia */}
                                    <div className="flex justify-between items-start mb-2">
                                        <span className={`text-xs font-bold ${isToday ? 'text-black bg-cyan-400 w-6 h-6 flex items-center justify-center rounded-full shadow-lg shadow-cyan-900/50' : 'text-gray-500'}`}>
                                            {dayNum}
                                        </span>
                                        {totalDay > 0 && (
                                            <span className="text-[9px] font-mono text-white bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700">
                                                {fmt(totalDay)}
                                            </span>
                                        )}
                                    </div>
                                    
                                    {/* Lista de Itens */}
                                    <div className="space-y-1 overflow-y-auto max-h-[100px] scrollbar-thin scrollbar-thumb-gray-800 pr-1 flex-1">
                                        {items.map((item: any, idx: number) => {
                                            const Icon = ICON_MAP[item.icon] || DollarSign;
                                            const isPaid = item.is_paid || item.paid_months?.includes(activeTab);
                                            const bankBorder = BANK_BORDERS[item.payment_method] || 'border-l-gray-600';

                                            return (
                                                <div 
                                                    key={`${item.id}-${idx}`} 
                                                    className={`
                                                        text-[10px] p-1.5 rounded flex items-center gap-1.5 border-l-[3px] shadow-sm transition hover:scale-[1.02] cursor-default
                                                        ${bankBorder}
                                                        ${isPaid ? 'bg-gray-900 text-gray-500 opacity-60 grayscale' : 'bg-gray-800 text-gray-200'}
                                                    `}
                                                    title={`${item.title} - ${fmt(item.amount)}`}
                                                >
                                                    <Icon size={10} className={isPaid ? 'text-gray-500' : 'text-cyan-400'} />
                                                    <div className="flex flex-col overflow-hidden">
                                                        <span className="truncate font-medium leading-none">{item.title}</span>
                                                        <span className="text-[8px] opacity-70 leading-none mt-0.5 font-mono">{fmt(item.amount)}</span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            
            <p className="md:hidden text-center text-xs text-gray-500 mt-4 flex items-center justify-center gap-2 animate-pulse">
                <ChevronLeft size={12}/> Arraste para ver <ChevronRight size={12}/>
            </p>
        </div>
    );
}