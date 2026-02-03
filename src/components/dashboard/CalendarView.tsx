import React from 'react';
import { Calendar as CalIcon, ChevronLeft, ChevronRight } from 'lucide-react';

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
        const dateFilter = `${dayStr}${monthMap[activeTab]}`;
        
        const trans = transactions.filter((t: any) => t.date?.includes(dateFilter) && t.status !== 'delayed');
        
        // Parcelas vencendo neste dia
        const insts = installments.filter((i: any) => {
            if (i.status === 'delayed') return false;
            const due = i.due_day || 10;
            return due === day && i.current_installment + months.indexOf(activeTab) <= i.installments_count;
        });

        // Recorrentes vencendo neste dia
        const recurs = recurring.filter((r: any) => {
            if (r.status === 'delayed') return false;
            const due = r.due_day || 10;
            return due === day && r.type === 'expense';
        });

        return [...trans, ...insts, ...recurs];
    };

    // Navegação de Mês
    const currentIdx = months.indexOf(activeTab);
    const prevMonth = currentIdx > 0 ? months[currentIdx - 1] : null;
    const nextMonth = currentIdx < months.length - 1 ? months[currentIdx + 1] : null;

    return (
        <div className="animate-in fade-in zoom-in duration-500">
            {/* Header do Calendário */}
            <div className="flex justify-between items-center mb-6 bg-[#0f1219] p-4 rounded-2xl border border-gray-800">
                <div className="flex items-center gap-2">
                    <div className="bg-purple-900/20 p-2 rounded-lg text-purple-400"><CalIcon size={20}/></div>
                    <h2 className="text-xl font-bold text-white">Calendário de Vencimentos</h2>
                </div>
                <div className="flex items-center gap-2">
                    <button onClick={() => prevMonth && setActiveTab(prevMonth)} disabled={!prevMonth} className="p-2 hover:bg-gray-800 rounded-lg disabled:opacity-30 transition"><ChevronLeft/></button>
                    <span className="font-mono font-bold text-cyan-400 w-16 text-center">{activeTab}</span>
                    <button onClick={() => nextMonth && setActiveTab(nextMonth)} disabled={!nextMonth} className="p-2 hover:bg-gray-800 rounded-lg disabled:opacity-30 transition"><ChevronRight/></button>
                </div>
            </div>

            {/* CONTAINER COM SCROLL HORIZONTAL PARA MOBILE */}
            <div className="overflow-x-auto pb-4">
                {/* min-w-[800px] força o calendário a ter tamanho decente e ativar o scroll no mobile */}
                <div className="min-w-[800px] bg-[#0f1219] border border-gray-800 rounded-2xl overflow-hidden">
                    {/* Cabeçalho dias da semana */}
                    <div className="grid grid-cols-7 bg-gray-900 border-b border-gray-800">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                            <div key={d} className="py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">{d}</div>
                        ))}
                    </div>

                    {/* Grade de Dias */}
                    <div className="grid grid-cols-7 auto-rows-fr">
                        {/* Espaços vazios antes do dia 1 */}
                        {Array.from({ length: days[0].getDay() }).map((_, i) => (
                            <div key={`empty-${i}`} className="bg-[#0a0a0a] border-r border-b border-gray-800/50 min-h-[120px]"></div>
                        ))}

                        {days.map((date) => {
                            const dayNum = date.getDate();
                            const items = getItemsForDay(dayNum);
                            const totalDay = items.reduce((acc: number, curr: any) => acc + (curr.amount || curr.value || curr.value_per_month), 0);
                            const isToday = new Date().getDate() === dayNum && new Date().getMonth() === months.indexOf(activeTab) && new Date().getFullYear() === 2026;

                            return (
                                <div key={dayNum} className={`border-r border-b border-gray-800/50 min-h-[120px] p-2 transition hover:bg-gray-800/20 relative group ${isToday ? 'bg-cyan-900/10' : ''}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`text-sm font-bold ${isToday ? 'text-cyan-400 bg-cyan-900/30 w-6 h-6 flex items-center justify-center rounded-full' : 'text-gray-500'}`}>{dayNum}</span>
                                        {totalDay > 0 && <span className="text-[10px] text-red-300 bg-red-900/20 px-1 rounded">- {Math.round(totalDay)}</span>}
                                    </div>
                                    
                                    <div className="space-y-1 overflow-y-auto max-h-[80px] scrollbar-hide">
                                        {items.map((item: any, idx: number) => (
                                            <div key={idx} className={`text-[10px] px-1.5 py-0.5 rounded truncate border ${item.is_paid ? 'bg-emerald-900/20 text-emerald-400 border-emerald-900/30' : 'bg-gray-800 text-gray-300 border-gray-700'}`}>
                                                {item.title}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            
            <p className="md:hidden text-center text-xs text-gray-500 mt-2 animate-pulse">← Arraste para ver a semana inteira →</p>
        </div>
    );
}