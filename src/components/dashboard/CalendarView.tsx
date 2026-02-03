import React from 'react';
import { Calendar as CalIcon, ChevronLeft, ChevronRight } from 'lucide-react';

export default function CalendarView({ transactions, installments, recurring, activeTab, months, setActiveTab }: any) {
    const monthIndex = months.indexOf(activeTab);
    const year = 2026;
    
    // Gera os dias do mês
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Mapeia contas por dia
    const getItemsForDay = (day: number) => {
        const dayStr = day < 10 ? `0${day}` : `${day}`;
        const monthStr = (monthIndex + 1) < 10 ? `0${monthIndex + 1}` : `${monthIndex + 1}`;
        const dateMatch = `${dayStr}/${monthStr}`; // Ex: 05/02

        const items: any[] = [];

        // Transações normais
        transactions.forEach((t: any) => { if (t.date?.includes(dateMatch)) items.push({ ...t, color: 'bg-emerald-500' }); });
        
        // Recorrentes (Dia fixo)
        recurring.forEach((r: any) => { if (r.due_day === day && !r.skipped_months?.includes(activeTab)) items.push({ ...r, color: 'bg-blue-500' }); });

        // Parcelas (Dia fixo)
        installments.forEach((i: any) => { 
            const currentInst = i.current_installment + monthIndex;
            if (i.due_day === day && currentInst >= 1 && currentInst <= i.installments_count) items.push({ ...i, color: 'bg-purple-500' }); 
        });

        return items;
    };

    return (
        <div className="animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-6 bg-[#111] p-4 rounded-xl border border-gray-800">
                <h2 className="text-xl font-bold flex items-center gap-2"><CalIcon className="text-cyan-500"/> Agenda: {activeTab}/{year}</h2>
                <div className="flex gap-2">
                    {months.map((m: string) => (
                        <button key={m} onClick={() => setActiveTab(m)} className={`px-3 py-1 rounded text-xs ${activeTab === m ? 'bg-cyan-900 text-cyan-400 border border-cyan-500' : 'text-gray-500'}`}>{m}</button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
                {days.map(day => {
                    const items = getItemsForDay(day);
                    return (
                        <div key={day} className={`min-h-[100px] bg-[#0a0a0a] border border-gray-800 rounded-xl p-2 hover:border-gray-600 transition relative ${items.length > 0 ? 'bg-[#0f1219]' : ''}`}>
                            <span className="absolute top-2 right-3 text-gray-600 font-bold text-xs">{day}</span>
                            <div className="mt-6 space-y-1">
                                {items.map((item, idx) => (
                                    <div key={idx} className={`text-[10px] px-2 py-1 rounded text-white truncate ${item.type === 'income' ? 'bg-emerald-900/50 border border-emerald-500/30' : 'bg-gray-800 border border-gray-700'}`}>
                                        {item.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    );
}