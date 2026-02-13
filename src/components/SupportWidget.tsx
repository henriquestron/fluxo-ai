'use client'

import { useState, useEffect } from 'react';
import { X, Send, Loader2, Bug } from 'lucide-react';
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
            
            {/* --- JANELA DO CHAT --- */}
            {isOpen && (
                <div className="pointer-events-auto mr-4 w-80 bg-[#111] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-5 fade-in duration-200">
                    <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-4 border-b border-white/5 flex justify-between items-center">
                        <div>
                            <h3 className="text-white font-bold text-sm">Central de Ajuda</h3>
                            <p className="text-gray-400 text-xs">Encontrou um bug?</p>
                        </div>
                        <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white transition"><X size={18} /></button>
                    </div>
                    <form onSubmit={handleSubmit} className="p-4">
                        <textarea
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Descreva o problema..."
                            className="w-full h-32 bg-black/50 border border-gray-700 rounded-xl p-3 text-sm text-gray-200 focus:outline-none focus:border-cyan-500 transition resize-none mb-3"
                            autoFocus
                        />
                        <button type="submit" disabled={isSending || !message.trim()} className="w-full bg-white text-black font-bold py-2.5 rounded-lg text-sm hover:bg-gray-200 transition disabled:opacity-50 flex items-center justify-center gap-2">
                            {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />} Enviar
                        </button>
                    </form>
                </div>
            )}

            {/* --- BALÃO DE AVISO (POPUP 8s) --- */}
            <div className={`pointer-events-auto mr-4 bg-white text-black text-xs font-bold px-4 py-2 rounded-xl rounded-tr-none shadow-lg transform transition-all duration-500 origin-bottom-right ${showHint && !isOpen ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-90 translate-x-10 pointer-events-none'}`}>
                🐛 Bug? Fala com a gente!
                <div className="absolute -bottom-1 right-0 w-3 h-3 bg-white rotate-45"></div>
            </div>

            {/* --- BOTÃO "ESCONDIDO" NO CANTO --- */}
            <button
                onClick={() => { setIsOpen(!isOpen); setShowHint(false); }}
                className={`
                    pointer-events-auto 
                    h-12 w-14 rounded-l-full shadow-lg flex items-center pl-3 transition-all duration-300 ease-out
                    
                    /* ESTILO VISUAL */
                    ${isOpen 
                        ? 'bg-gray-800 text-gray-400 translate-x-0 opacity-100 w-12 rounded-full justify-center pl-0 rotate-90 right-4 relative' // Quando aberto: visível, redondo, girado
                        : 'bg-gradient-to-l from-cyan-600 to-blue-600 text-white shadow-cyan-900/50 justify-start' // Quando fechado: gradiente, alinhado à esquerda
                    }

                    /* LÓGICA DE ESCONDER (A MÁGICA AQUI) 👇 */
                    ${!isOpen && 'translate-x-1/2 hover:translate-x-0 opacity-40 hover:opacity-100 active:opacity-100 active:scale-95'}
                `}
                title="Relatar Problema"
            >
                {isOpen ? <X size={24} /> : <Bug size={24} />}
            </button>
        </div>
    );
}