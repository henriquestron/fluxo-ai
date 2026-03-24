import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { supabase } from '@/supabase';
import { toast } from 'sonner';
import ClientOnboardingModal from './ClientOnboardingModal'; // 🟢 1. IMPORTANDO O NOVO MODAL

export default function NotificationBell({ userId }: { userId: string }) {
    const [notifications, setNotifications] = useState<any[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const modalRef = useRef<HTMLDivElement>(null);

    // 🟢 2. ESTADOS DO MODAL DE ONBOARDING
    const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
    const [pendingInviteNotification, setPendingInviteNotification] = useState<any>(null);

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
                        audio.play().catch(() => { });

                        return [payload.new, ...prev];
                    });
                    setUnreadCount(prev => prev + 1);
                })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [userId]);

    // Fecha ao clicar fora (Ignora se o modal de onboarding estiver aberto)
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (isOnboardingOpen) return; // 🟢 Não fecha o menu se o modal de onboarding estiver aberto

            if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        if (isOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen, isOnboardingOpen]);

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

    // 🟢 3A. PASSO 1: O CLIENTE CLICA NO BOTÃO E ABRE O MODAL
    const triggerOnboarding = (notification: any) => {
        setPendingInviteNotification(notification);
        setIsOpen(false); // Fecha a janelinha de notificação
        setIsOnboardingOpen(true); // Abre o Modal Grandão
    };

    // 🟢 3B. PASSO 2: O CLIENTE PREENCHEU TUDO E CLICOU "SALVAR"
    const handleConfirmOnboarding = async (name: string, cpf: string) => {
        if (!pendingInviteNotification) return;

        // 🟢 CAPTURA SEGURA: Tenta pegar o ID de várias formas (objeto ou string)
        const rawActionData = pendingInviteNotification.action_data;
        const managerId = (typeof rawActionData === 'object' ? rawActionData?.id : rawActionData)?.toString().trim();
        const notificationId = pendingInviteNotification.id;

        // 🔍 DEBUG: Veja no console se esses IDs aparecem ou se vêm vazios {}
        console.log("Tentando vincular:", {
            managerId,
            userId,
            name,
            cpf
        });

        if (!managerId || !userId) {
            toast.error("Erro interno: IDs de vínculo não encontrados.");
            return;
        }

        try {
            // A) Roda a sua RPC original
            const { error: rpcError } = await supabase.rpc('accept_consultant_invite', {
                p_manager_id: managerId,
                p_client_id: userId
            });

            if (rpcError) throw rpcError;

            // B) 🟢 UPDATE COM "FORÇA BRUTA" (Match mais simples)
            const { data: updatedData, error: updateError } = await supabase
                .from('manager_clients')
                .update({
                    full_name: name,
                    cpf: cpf
                })
                .eq('manager_id', managerId)
                .eq('client_id', userId)
                .select();

            if (updateError) throw updateError;

            // Se o updatedData vier vazio, é porque o RLS barrou ou o ID não bateu
            if (!updatedData || updatedData.length === 0) {
                console.warn("Aviso: Vínculo aceito, mas CPF não gravado. Tentando via Email...");

                // Plano C: Tenta atualizar pelo Email (que você tem no JSON)
                await supabase
                    .from('manager_clients')
                    .update({ full_name: name, cpf: cpf })
                    .eq('client_email', pendingInviteNotification.email || '')
                    .eq('client_id', userId);
            }

            await markAsRead(notificationId);
            setIsOnboardingOpen(false);
            setPendingInviteNotification(null);

            toast.success("Tudo pronto! Você agora é PRO e está vinculado. 🎉");

            setTimeout(() => {
                window.location.reload();
            }, 1500);

        } catch (error: any) {
            console.error("Erro completo:", error);
            throw new Error(error.message || "Erro ao processar vínculo.");
        }
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
                    absolute top-full mt-3
                    left-1/2 -translate-x-1/2 
                    w-[300px] sm:w-80
                    md:left-auto md:translate-x-0 md:right-0
                `}>
                    <div className="p-3 border-b border-gray-800 flex justify-between items-center bg-[#0a0a0a]">
                        <h3 className="font-bold text-white text-sm">Notificações</h3>
                        {notifications.length > 0 && (
                            <button onClick={clearAll} className="text-[10px] text-gray-500 hover:text-red-400 flex items-center gap-1">
                                <Trash2 size={10} /> Limpar
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

                                        {/* 🟢 O BOTÃO AGORA SÓ ABRE O MODAL */}
                                        {n.type === 'consultant_invite' && !n.is_read && (
                                            <div className="mt-2 flex gap-2">
                                                <button
                                                    onClick={() => triggerOnboarding(n)}
                                                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg transition shadow-lg active:scale-95"
                                                >
                                                    Aceitar Consultoria
                                                </button>
                                            </div>
                                        )}
                                        {/* 🟢 NOVO: BOTÃO DE BAIXAR O CONTRATO SE TIVER LINK */}
                                        {n.type === 'info' && n.action_data && n.action_data.includes('http') && (
                                            <div className="mt-2">
                                                <a
                                                    href={n.action_data}
                                                    target="_blank"
                                                    className="inline-flex items-center gap-1 bg-gray-800 hover:bg-gray-700 text-cyan-400 text-[10px] font-bold px-3 py-1.5 rounded-lg border border-gray-700 transition"
                                                    onClick={() => markAsRead(n.id)} // Marca como lido ao baixar!
                                                >
                                                    Baixar Contrato
                                                </a>
                                            </div>
                                        )}

                                        <p className="text-[10px] text-gray-700 mt-1">{new Date(n.created_at).toLocaleTimeString().slice(0, 5)}</p>
                                    </div>
                                    {!n.is_read && (
                                        <button onClick={() => markAsRead(n.id)} className="text-gray-600 hover:text-emerald-500 h-fit p-1" title="Marcar como lida">
                                            <Check size={14} />
                                        </button>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* 🟢 4. O MODAL RENDERIZADO NO FINAL DO COMPONENTE */}
            <ClientOnboardingModal
                isOpen={isOnboardingOpen}
                onClose={() => {
                    setIsOnboardingOpen(false);
                    setPendingInviteNotification(null);
                }}
                onConfirm={handleConfirmOnboarding}
                consultantName="seu novo Consultor Financeiro"
            />
        </div>
    );
}