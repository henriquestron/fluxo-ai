import React, { useEffect, useState } from 'react';
import { X, CheckCircle2, Smartphone, Zap, Crown, Briefcase, Users, Lock, FileSpreadsheet, Shield, Loader2, Calculator, BarChart3, Target, Clock, FileUp, Sparkles, MessageSquare } from 'lucide-react';
import { supabase } from '@/supabase';

interface PricingModalProps {
    isOpen: boolean;
    onClose: () => void;
    handleCheckout: (plan: 'START' | 'PREMIUM' | 'PRO' | 'AGENT') => void;
}

export default function PricingModal({ isOpen, onClose, handleCheckout }: PricingModalProps) {
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);

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
            <div className="flex min-h-full items-center justify-center p-4 py-12">
                <div className="relative w-full max-w-7xl animate-in zoom-in duration-300">

                    <button onClick={onClose} className="absolute -top-10 right-0 text-gray-400 hover:text-white p-2 transition">
                        <X size={32} />
                    </button>

                    {loading || !settings ? (
                        <div className="flex flex-col items-center justify-center h-96 bg-[#0a0a0a] rounded-3xl border border-gray-800">
                            <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                            <p className="text-gray-400">Carregando as melhores ofertas...</p>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-12">
                                <h2 className="text-4xl md:text-6xl font-black text-white mb-4">Escolha seu Poder 🚀</h2>
                                <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                                    Do iniciante ao consultor profissional, temos a ferramenta exata para sua evolução financeira.
                                </p>

                                {settings.is_promo_active && (
                                    <div className="mt-6 inline-block bg-gradient-to-r from-red-600 to-orange-600 text-white font-black px-8 py-2 rounded-full animate-bounce shadow-lg shadow-red-500/20">
                                        🔥 {settings.promo_text} 🔥
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 items-stretch">

                                {/* PLANO START */}
                                <div className="bg-[#111] border border-gray-800 p-8 rounded-3xl flex flex-col hover:border-gray-600 transition group relative overflow-hidden">
                                    <h3 className="text-gray-400 font-bold uppercase tracking-widest mb-4 text-sm">Start</h3>

                                    <div className="text-3xl font-black text-white mb-6">
                                        {settings.is_promo_active ? (
                                            <div className="flex flex-col">
                                                <span className="text-sm line-through text-gray-500 font-normal">R$ {settings.price_start_normal}</span>
                                                <span>R$ {settings.price_start_promo}<span className="text-sm font-normal text-gray-500">/mês</span></span>
                                            </div>
                                        ) : (
                                            <span>R$ {settings.price_start_normal}<span className="text-sm font-normal text-gray-500">/mês</span></span>
                                        )}
                                    </div>

                                    <ul className="space-y-4 mb-8 flex-1 text-sm text-gray-400">
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-emerald-500 shrink-0" /> Faturas com ícones personalizados</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-emerald-500 shrink-0" /> Relatórios Excel com filtros</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-emerald-500 shrink-0" /> Importação IA (Fotos e anotações)</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-emerald-500 shrink-0" /> Calculadora e Gráfico Anual</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-emerald-500 shrink-0" /> Sistema de Metas e Compras</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-emerald-500 shrink-0" /> Contas em Stand-by (Saldo Devedor)</li>
                                        <li className="flex gap-3 text-orange-400 font-bold"><Zap size={18} className="shrink-0" /> IA do Site (Uso Limitado)</li>
                                    </ul>
                                    <button onClick={() => handleCheckout('START')} className="w-full py-4 rounded-xl border border-gray-700 hover:bg-white hover:text-black font-bold transition">Assinar Start</button>
                                </div>

                                {/* PLANO PREMIUM (PLUS) */}
                                <div className="bg-[#151515] border border-cyan-500/50 p-8 rounded-3xl flex flex-col relative shadow-2xl shadow-cyan-900/20 z-10 transform md:scale-105 ring-1 ring-cyan-500/30">
                                    <div className="absolute top-0 right-0 bg-cyan-600 text-white text-[10px] font-black px-4 py-1 rounded-bl-xl rounded-tr-2xl uppercase tracking-tighter">O Mais Vendido</div>
                                    <h3 className="text-cyan-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-sm"><Sparkles size={16} /> Premium</h3>

                                    <div className="text-4xl font-black text-white mb-6">
                                        {settings.is_promo_active ? (
                                            <div className="flex flex-col">
                                                <span className="text-sm line-through text-gray-500 font-normal">R$ {settings.price_premium_normal}</span>
                                                <span>R$ {settings.price_premium_promo}<span className="text-sm font-normal text-gray-500">/mês</span></span>
                                            </div>
                                        ) : (
                                            <span>R$ {settings.price_premium_normal}<span className="text-sm font-normal text-gray-500">/mês</span></span>
                                        )}
                                    </div>

                                    <ul className="space-y-4 mb-8 flex-1 text-sm text-white">
                                        <li className="flex gap-3 font-bold text-cyan-400"><CheckCircle2 size={18} className="shrink-0" /> Tudo do Plano Start</li>

                                        {/* 🟢 IA POTENTE NO SITE */}
                                        <li className="flex gap-3 font-black text-cyan-500 italic"><Sparkles size={18} className="shrink-0" /> IA do Site: Lançamentos & Simulações</li>

                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-cyan-500 shrink-0" /> Adição Automática via Texto, Comprovante ou Foto</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-cyan-500 shrink-0" /> Inteligência de Identificação (Fixa, Variável ou Parcela)</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-cyan-500 shrink-0" /> Simulação de Cenários e Consultoria Digital</li>

                                        {/* 🟢 MULTIPERFIS */}
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-cyan-500 shrink-0" /> Personalização de Layout e Cores</li>
                                        <li className="flex gap-3 font-bold"><CheckCircle2 size={18} className="text-cyan-500 shrink-0" /> Criação de Múltiplos Perfis de Conta</li>

                                        <li className="flex gap-3 text-gray-500 line-through"><Smartphone size={18} className="shrink-0" /> IA integrada no WhatsApp</li>
                                    </ul>
                                    <button onClick={() => handleCheckout('PREMIUM')} className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black transition shadow-lg text-lg">Quero o Premium</button>
                                </div>

                                {/* PLANO PRO */}
                                <div className="bg-[#111] border border-purple-500/30 p-8 rounded-3xl flex flex-col hover:border-purple-500/60 transition group relative overflow-hidden">
                                    <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-purple-600 to-pink-600"></div>
                                    <h3 className="text-purple-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-sm"><Crown size={16} /> Pro</h3>

                                    <div className="text-3xl font-black text-white mb-6">
                                        {settings.is_promo_active ? (
                                            <div className="flex flex-col">
                                                <span className="text-sm line-through text-gray-500 font-normal">R$ {settings.price_pro_normal}</span>
                                                <span>R$ {settings.price_pro_promo}<span className="text-sm font-normal text-gray-500">/mês</span></span>
                                            </div>
                                        ) : (
                                            <span>R$ {settings.price_pro_normal}<span className="text-sm font-normal text-gray-500">/mês</span></span>
                                        )}
                                    </div>

                                    <ul className="space-y-4 mb-8 flex-1 text-sm text-gray-300">
                                        <li className="flex gap-3 font-bold text-purple-400"><CheckCircle2 size={18} className="shrink-0" /> Tudo do Plano Premium</li>
                                        <li className="flex gap-3 font-black text-white italic"><MessageSquare size={18} className="text-emerald-500 shrink-0" /> Notificações de Contas via WhatsApp</li>
                                        <li className="flex gap-3 font-black text-white italic"><Smartphone size={18} className="text-emerald-500 shrink-0" /> IA Integrada no WhatsApp (24h)</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-purple-500 shrink-0" /> Adição de contas via Áudio/Foto no Zap</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-purple-500 shrink-0" /> Configuração de Perfis via WhatsApp</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-purple-500 shrink-0" /> Suporte Prioritário VIP</li>
                                    </ul>
                                    <button onClick={() => handleCheckout('PRO')} className="w-full py-4 rounded-xl border border-purple-500/50 bg-purple-900/10 hover:bg-purple-600 text-white font-black transition shadow-lg">Virar Pro Agora</button>
                                </div>
                            </div>

                            {/* PLANO AGENT (CONSULTOR) */}
                            <div className="bg-[#0f0f13] border border-amber-500/30 p-8 md:p-10 rounded-[40px] relative overflow-hidden flex flex-col md:row items-center gap-8 shadow-2xl">
                                <div className="absolute top-0 right-0 w-96 h-96 bg-amber-600/10 rounded-full blur-[100px] pointer-events-none"></div>
                                <div className="flex-1 relative z-10 text-center md:text-left">
                                    <div className="inline-flex items-center gap-2 px-4 py-1 rounded-full bg-amber-900/30 border border-amber-500/40 text-amber-500 text-xs font-black uppercase tracking-widest mb-6">
                                        <Briefcase size={14} /> Solução Corporativa
                                    </div>
                                    <h3 className="text-3xl md:text-5xl font-black text-white mb-4">Aliado Agent <span className="text-amber-500">(Consultor)</span></h3>
                                    <p className="text-gray-400 mb-8 text-lg max-w-3xl">
                                        Transforme o app na sua ferramenta de trabalho. Gerencie a vida financeira de dezenas de clientes com um painel administrativo exclusivo.
                                    </p>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-gray-300 font-bold">
                                        <span className="flex items-center gap-2 bg-black/40 p-3 rounded-2xl border border-gray-800"><Users size={18} className="text-amber-500" /> Gestão de Carteira</span>
                                        <span className="flex items-center gap-2 bg-black/40 p-3 rounded-2xl border border-gray-800"><CheckCircle2 size={18} className="text-amber-500" /> Todos os Recursos PRO</span>
                                        <span className="flex items-center gap-2 bg-black/40 p-3 rounded-2xl border border-gray-800"><FileSpreadsheet size={18} className="text-amber-500" /> Geração de Contratos</span>
                                        <span className="flex items-center gap-2 bg-black/40 p-3 rounded-2xl border border-gray-800"><Shield size={18} className="text-amber-500" /> Painel Master Admin</span>
                                    </div>
                                </div>

                                <div className="flex flex-col items-center gap-4 w-full md:w-auto min-w-[280px] relative z-10 bg-amber-500/5 p-8 rounded-3xl border border-amber-500/20">
                                    <div className="text-4xl md:text-5xl font-black text-white">
                                        {settings.is_promo_active ? (
                                            <div className="flex flex-col items-center">
                                                <span className="text-sm line-through text-gray-500 font-normal">R$ {settings.price_agent_normal}</span>
                                                <span>R$ {settings.price_agent_promo}<span className="text-lg font-normal text-gray-500">/mês</span></span>
                                            </div>
                                        ) : (
                                            <span>R$ {settings.price_agent_normal}<span className="text-lg font-normal text-gray-500">/mês</span></span>
                                        )}
                                    </div>
                                    <button onClick={() => handleCheckout('AGENT')} className="w-full px-10 py-5 bg-amber-600 hover:bg-amber-500 text-white text-xl font-black rounded-2xl transition shadow-xl shadow-amber-900/40">
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