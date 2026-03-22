import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, Smartphone, Zap, Crown, Briefcase, Users, Lock, FileSpreadsheet, Loader2 } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface PricingModalProps {
    isOpen: boolean;
    onClose: () => void;
    handleCheckout: (plan: 'START' | 'PREMIUM' | 'PRO' | 'AGENT') => void;
}

export default function PricingModal({ isOpen, onClose, handleCheckout }: PricingModalProps) {
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Busca as configurações do banco de dados toda vez que o modal abre
    useEffect(() => {
        if (isOpen) {
            fetchSettings();
        }
    }, [isOpen]);

    async function fetchSettings() {
        setLoading(true);
        const { data } = await supabase.from('app_settings').select('*').single();
        if (data) setSettings(data);
        setLoading(false);
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/95 backdrop-blur-xl">
            <div className="flex min-h-full items-center justify-center p-4 text-center md:text-left">
                <div className="relative w-full max-w-6xl animate-in zoom-in duration-300 bg-[#0a0a0a] md:bg-transparent rounded-3xl md:rounded-none p-6 md:p-0 border border-gray-800 md:border-none shadow-2xl md:shadow-none my-8">
                    
                    <button onClick={onClose} className="absolute top-2 right-2 md:-right-12 md:-top-4 text-gray-400 hover:text-white p-2 bg-gray-900/50 md:bg-transparent rounded-full z-50 transition">
                        <X size={24} className="md:w-8 md:h-8" />
                    </button>

                    {/* TELA DE CARREGAMENTO ENQUANTO PUXA OS PREÇOS */}
                    {loading || !settings ? (
                        <div className="flex flex-col items-center justify-center h-96">
                            <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                            <p className="text-gray-400">Carregando os melhores planos...</p>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-8 md:mb-12">
                                <h2 className="text-3xl md:text-5xl font-black text-white mb-3">Evolua seu Controle 🚀</h2>
                                <p className="text-gray-400 text-sm md:text-lg px-4">
                                    Escolha o poder de fogo ideal para sua vida financeira.
                                </p>
                                
                                {/* FAIXA DE PROMOÇÃO DINÂMICA (Só aparece se is_promo_active for true) */}
                                {settings.is_promo_active && (
                                    <div className="mt-4 inline-block bg-gradient-to-r from-red-600 to-orange-600 text-white font-black px-6 py-2 rounded-full animate-pulse shadow-lg shadow-red-500/20">
                                        🔥 {settings.promo_text} 🔥
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 md:mb-12 text-left">
                                {/* PLANO START */}
                                <div className="bg-[#111] border border-gray-800 p-6 md:p-8 rounded-3xl flex flex-col hover:border-gray-600 transition group order-1 relative overflow-hidden">
                                    <h3 className="text-gray-400 font-bold uppercase tracking-wider mb-2 text-sm">Start</h3>
                                    
                                    {/* PREÇO DINÂMICO */}
                                    <div className="text-3xl font-black text-white mb-2">
                                        {settings.is_promo_active ? (
                                            <div className="flex flex-col">
                                                <span className="text-sm line-through text-gray-500 font-normal">R$ {settings.price_start_normal}</span>
                                                <span>R$ {settings.price_start_promo}<span className="text-sm font-normal text-gray-500">/mês</span></span>
                                            </div>
                                        ) : (
                                            <span>R$ {settings.price_start_normal}<span className="text-sm font-normal text-gray-500">/mês</span></span>
                                        )}
                                    </div>
                                    
                                    {/* DESCRIÇÃO DINÂMICA */}
                                    <p className="text-xs text-gray-500 mb-6 h-10">{settings.desc_start}</p>

                                    <ul className="space-y-4 mb-8 flex-1 text-sm text-gray-300">
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-gray-600 shrink-0" /> Lançamentos Ilimitados</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-gray-600 shrink-0" /> Gráficos & Histórico</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-gray-600 shrink-0" /> Exportação Excel</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-gray-600 shrink-0" /> IA Lite (Dicas Básicas)</li>
                                        <li className="flex gap-3 text-gray-600 line-through opacity-50"><Smartphone size={18} className="shrink-0" /> Integração WhatsApp</li>
                                    </ul>
                                    <button onClick={() => handleCheckout('START')} className="w-full py-3 rounded-xl border border-gray-700 hover:bg-gray-800 text-white font-bold transition">Escolher Start</button>
                                </div>

                                {/* PLANO PREMIUM (PLUS) */}
                                <div className="bg-[#151515] border border-cyan-500/30 p-6 md:p-8 rounded-3xl flex flex-col relative shadow-2xl shadow-cyan-900/20 z-10 order-first md:order-2 transform md:scale-105 my-2 md:my-0 ring-1 ring-cyan-500/20">
                                    <div className="absolute top-0 right-0 bg-cyan-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl">CUSTO-BENEFÍCIO</div>
                                    <h3 className="text-cyan-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-2 text-sm"><Zap size={16} /> Plus</h3>
                                    
                                    {/* PREÇO DINÂMICO */}
                                    <div className="text-4xl font-black text-white mb-2">
                                        {settings.is_promo_active ? (
                                            <div className="flex flex-col">
                                                <span className="text-sm line-through text-gray-500 font-normal">R$ {settings.price_premium_normal}</span>
                                                <span>R$ {settings.price_premium_promo}<span className="text-sm font-normal text-gray-500">/mês</span></span>
                                            </div>
                                        ) : (
                                            <span>R$ {settings.price_premium_normal}<span className="text-sm font-normal text-gray-500">/mês</span></span>
                                        )}
                                    </div>

                                    {/* DESCRIÇÃO DINÂMICA */}
                                    <p className="text-xs text-gray-400 mb-6 h-10">{settings.desc_premium}</p>

                                    <ul className="space-y-4 mb-8 flex-1 text-sm text-white">
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-cyan-500 shrink-0" /> Tudo do Start</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-cyan-500 shrink-0" /> Agente IA Completo</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-cyan-500 shrink-0" /> Múltiplos Perfis</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-cyan-500 shrink-0" /> Leitura de Comprovantes</li>
                                        <li className="flex gap-3 text-gray-500 line-through opacity-50"><Smartphone size={18} className="shrink-0" /> Integração WhatsApp</li>
                                    </ul>
                                    <button onClick={() => handleCheckout('PREMIUM')} className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:to-blue-500 text-white font-bold transition shadow-lg">Quero o Plus</button>
                                </div>

                                {/* PLANO PRO */}
                                <div className="bg-[#111] border border-purple-500/20 p-6 md:p-8 rounded-3xl flex flex-col hover:border-purple-500/40 transition group relative overflow-hidden order-3">
                                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-600 to-pink-600"></div>
                                    <h3 className="text-purple-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-2 text-sm"><Crown size={16} /> Pro</h3>
                                    
                                    {/* PREÇO DINÂMICO */}
                                    <div className="text-3xl font-black text-white mb-2">
                                        {settings.is_promo_active ? (
                                            <div className="flex flex-col">
                                                <span className="text-sm line-through text-gray-500 font-normal">R$ {settings.price_pro_normal}</span>
                                                <span>R$ {settings.price_pro_promo}<span className="text-sm font-normal text-gray-500">/mês</span></span>
                                            </div>
                                        ) : (
                                            <span>R$ {settings.price_pro_normal}<span className="text-sm font-normal text-gray-500">/mês</span></span>
                                        )}
                                    </div>

                                    {/* DESCRIÇÃO DINÂMICA */}
                                    <p className="text-xs text-gray-500 mb-6 h-10">{settings.desc_pro}</p>

                                    <ul className="space-y-4 mb-8 flex-1 text-sm text-gray-300">
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-purple-500 shrink-0" /> Tudo do Plus</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-purple-500 shrink-0" /> <b>IA no WhatsApp</b> (Áudio)</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-purple-500 shrink-0" /> Notificações via Zap</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-purple-500 shrink-0" /> Prioridade no Suporte</li>
                                    </ul>
                                    <button onClick={() => handleCheckout('PRO')} className="w-full py-3 rounded-xl border border-purple-900/50 hover:bg-purple-900/20 text-white font-bold transition shadow-lg shadow-purple-900/10">Virar Pro</button>
                                </div>
                            </div>

                            {/* PLANO AGENT */}
                            <div className="bg-[#0f0f13] border border-amber-900/30 p-6 md:p-8 rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-center gap-6 md:gap-8 shadow-2xl mb-8 text-left">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-600/10 rounded-full blur-3xl pointer-events-none"></div>
                                <div className="flex-1 relative z-10 text-center md:text-left">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/20 border border-amber-500/30 text-amber-500 text-xs font-bold uppercase tracking-wider mb-4">
                                        <Briefcase size={12} /> Área Profissional
                                    </div>
                                    <h3 className="text-2xl md:text-3xl font-black text-white mb-2">Plano Agent</h3>
                                    
                                    {/* DESCRIÇÃO DINÂMICA */}
                                    <p className="text-gray-400 mb-6 text-sm md:text-base">{settings.desc_agent}</p>
                                    
                                    <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-4 text-sm text-gray-300 font-bold">
                                        <span className="flex items-center gap-2"><Users size={16} className="text-amber-500" /> Gestão de Carteira</span>
                                        <span className="flex items-center gap-2"><Lock size={16} className="text-amber-500" /> Acesso Admin</span>
                                        <span className="flex items-center gap-2"><FileSpreadsheet size={16} className="text-amber-500" /> White-label</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-2 w-full md:w-auto min-w-[200px] relative z-10">
                                    
                                    {/* PREÇO DINÂMICO */}
                                    <div className="text-3xl md:text-4xl font-black text-white">
                                        {settings.is_promo_active ? (
                                            <div className="flex flex-col items-center md:items-end">
                                                <span className="text-sm line-through text-gray-500 font-normal">R$ {settings.price_agent_normal}</span>
                                                <span>R$ {settings.price_agent_promo}<span className="text-sm font-normal text-gray-500">/mês</span></span>
                                            </div>
                                        ) : (
                                            <span>R$ {settings.price_agent_normal}<span className="text-sm font-normal text-gray-500">/mês</span></span>
                                        )}
                                    </div>

                                    <button onClick={() => handleCheckout('AGENT')} className="w-full px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition shadow-lg shadow-amber-900/20 whitespace-nowrap">
                                        Assinar Agent
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}