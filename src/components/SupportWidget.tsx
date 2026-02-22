'use client'

import { useState, useEffect } from 'react';
import { X, Send, Loader2, Bug, MessageCircle, HelpCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

export default function SupportWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [showHint, setShowHint] = useState(false);

    // --- CONFIGURAÇÃO DO WHATSAPP ---
    const phoneNumber = "5562981143315"; // Coloque seu número aqui
    const wppMessage = encodeURIComponent("Olá! Preciso de ajuda com a minha conta no Meu Aliado.");
    const whatsappLink = `https://wa.me/${phoneNumber}?text=${wppMessage}`;

    useEffect(() => {
        const startTimer = setTimeout(() => setShowHint(true), 2000);
        const hideTimer = setTimeout(() => setShowHint(false), 10000);
        return () => { clearTimeout(startTimer); clearTimeout(hideTimer); };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;
        setIsSending(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                toast.error("Faça login para enviar.");
                setIsSending(false);
                return;
            }
            const { error } = await supabase.from('support_tickets').insert({
                user_id: user.id, message: message, page_url: window.location.pathname
            });
            if (error) throw error;
            toast.success("Recebemos seu feedback!");
            setMessage('');
            setIsOpen(false);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao enviar.");
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed bottom-12 right-0 z-[100] flex flex-col items-end gap-4 pointer-events-none">
            
            {/* --- JANELA DO CHAT E SUPORTE --- */}
            {isOpen && (
                <div className="pointer-events-auto mr-4 w-80 bg-[#111] border border-gray-800 rounded-3xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-4 border-b border-white/5 flex justify-between items-center">
                        <div>
                            <h3 className="text-white font-bold text-sm flex items-center gap-2">
                                <HelpCircle size={16} className="text-cyan-400"/> Central de Ajuda
                            </h3>
                            <p className="text-gray-400 text-xs mt-0.5">Como podemos ajudar?</p>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition"><X size={18} /></button>
                    </div>

                    <div className="p-4">
                        {/* Botão do WhatsApp (Dúvidas/Reembolso) */}
                        <a 
                            href={whatsappLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 rounded-xl text-sm flex items-center justify-center gap-2 transition mb-4 shadow-lg shadow-emerald-900/20"
                        >
                            <MessageCircle size={18} /> Falar no WhatsApp
                        </a>

                        <div className="flex items-center gap-3 mb-4">
                            <div className="h-px bg-gray-800 flex-1"></div>
                            <span className="text-xs text-gray-500 font-medium">Ou relate um erro</span>
                            <div className="h-px bg-gray-800 flex-1"></div>
                        </div>

                        {/* Formulário de Bug Original */}
                        <form onSubmit={handleSubmit}>
                            <textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Descreva o problema ou bug encontrado..."
                                className="w-full h-24 bg-black/50 border border-gray-700 rounded-xl p-3 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 transition resize-none mb-3 placeholder:text-gray-600"
                            />
                            <button type="submit" disabled={isSending || !message.trim()} className="w-full bg-white text-black font-bold py-2.5 rounded-xl text-sm hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center gap-2">
                                {isSending ? <Loader2 size={16} className="animate-spin" /> : <Bug size={16} />} Enviar Relatório
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* --- BALÃO DE AVISO (POPUP 8s) --- */}
            <div className={`pointer-events-auto mr-4 bg-white text-black text-xs font-bold px-4 py-2.5 rounded-xl rounded-br-none shadow-lg transform transition-all duration-500 origin-bottom-right ${showHint && !isOpen ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-90 translate-x-10 pointer-events-none'}`}>
                👋 Precisa de ajuda?
                <div className="absolute -bottom-1.5 right-3 w-3 h-3 bg-white rotate-45"></div>
            </div>

            {/* --- BOTÃO "ESCONDIDO" NO CANTO --- */}
            <button
                onClick={() => { setIsOpen(!isOpen); setShowHint(false); }}
                className={`
                    pointer-events-auto 
                    h-12 w-14 rounded-l-full shadow-lg flex items-center pl-3 transition-all duration-300 ease-out
                    
                    /* ESTILO VISUAL */
                    ${isOpen 
                        ? 'bg-gray-800 text-gray-400 translate-x-0 opacity-100 w-12 rounded-full justify-center pl-0 rotate-90 right-4 relative' 
                        : 'bg-gradient-to-l from-emerald-600 to-cyan-600 text-white shadow-cyan-900/50 justify-start' 
                    }

                    /* LÓGICA DE ESCONDER */
                    ${!isOpen && 'translate-x-1/2 hover:translate-x-0 opacity-50 hover:opacity-100 active:opacity-100 active:scale-95'}
                `}
                title="Central de Ajuda"
            >
                {isOpen ? <X size={24} /> : <MessageCircle size={22} />}
            </button>
        </div>
    );
}