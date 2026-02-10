import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { supabase } from '@/supabase';

export default function NotificationBell({ userId }: { userId: string }) {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const modalRef = useRef<HTMLDivElement>(null);

    // Carrega notificações iniciais
    const fetchNotifs = async () => {
        const { data } = await supabase
            .from('notifications')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(10);
        
        if (data) {
            setNotifications(data);
            setUnreadCount(data.filter(n => !n.is_read).length);
        }
    };

    useEffect(() => {
        if (userId) fetchNotifs();
        
        const channel = supabase
            .channel('realtime-notifs')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, 
            (payload) => {
                setNotifications(prev => {
                    const exists = prev.some(n => n.id === payload.new.id);
                    if (exists) return prev;
                    
                    const audio = new Audio('/notification.mp3'); 
                    audio.play().catch(() => {});
                    
                    return [payload.new, ...prev];
                });
                setUnreadCount(prev => prev + 1);
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [userId]);

    // Fecha ao clicar fora
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);

    const markAsRead = async (id: number) => {
        await supabase.from('notifications').update({ is_read: true }).eq('id', id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
        setUnreadCount(prev => Math.max(0, prev - 1));
    };

    const clearAll = async () => {
        await supabase.from('notifications').delete().eq('user_id', userId);
        setNotifications([]);
        setUnreadCount(0);
    };

    return (
        <div className="relative" ref={modalRef}>
            <button 
                onClick={() => setIsOpen(!isOpen)} 
                className={`relative p-2 transition rounded-full ${isOpen ? 'bg-gray-800 text-white' : 'text-gray-400 bg-gray-800/50 hover:text-white hover:bg-gray-800'}`}
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full animate-bounce">
                        {unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className={`
                    bg-[#111] border border-gray-800 rounded-2xl shadow-2xl z-[101] overflow-hidden animate-in fade-in zoom-in-95 duration-200
                    
                    /* POSICIONAMENTO ESTRATÉGICO */
                    absolute top-full mt-3
                    
                    /* MOBILE: Centraliza em relação ao botão e define largura fixa segura */
                    left-1/2 -translate-x-1/2 
                    w-[300px] sm:w-80
                    
                    /* DESKTOP: Alinha à direita do botão normalmente */
                    md:left-auto md:translate-x-0 md:right-0
                `}>
                    <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-[#0a0a0a]">
                        <h3 className="font-bold text-white text-sm">Notificações</h3>
                        {notifications.length > 0 && (
                            <button onClick={clearAll} className="text-[10px] text-gray-500 hover:text-red-400 flex items-center gap-1">
                                <Trash2 size={10}/> Limpar
                            </button>
                        )}
                    </div>
                    
                    <div className="max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800">
                        {notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-600 text-xs">Tudo tranquilo por aqui. 😴</div>
                        ) : (
                            notifications.map(n => (
                                <div key={n.id} className={`p-3 border-b border-gray-800/50 flex gap-3 hover:bg-gray-900/50 transition ${!n.is_read ? 'bg-gray-900/20' : ''}`}>
                                    <div className={`mt-1 w-2 h-2 rounded-full shrink-0 ${n.type === 'danger' ? 'bg-red-500' : (n.type === 'success' ? 'bg-emerald-500' : 'bg-blue-500')}`}></div>
                                    <div className="flex-1">
                                        <p className={`text-sm ${!n.is_read ? 'text-white font-bold' : 'text-gray-400'}`}>{n.title}</p>
                                        <p className="text-xs text-gray-500 mt-0.5 leading-snug">{n.message}</p>
                                        <p className="text-[10px] text-gray-700 mt-1">{new Date(n.created_at).toLocaleTimeString().slice(0,5)}</p>
                                    </div>
                                    {!n.is_read && (
                                        <button onClick={() => markAsRead(n.id)} className="text-gray-600 hover:text-emerald-500 h-fit p-1" title="Marcar como lida">
                                            <Check size={14}/>
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}