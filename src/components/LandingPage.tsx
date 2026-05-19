"use client";

import React, { useEffect, useState } from 'react';
import { createClient } from "@supabase/supabase-js";
import {
    ShieldCheck, Sparkles, Smartphone, BarChart3,
    Zap, CheckCircle2, Lock, ArrowRight,
    LayoutDashboard, Layers, TrendingUp, Briefcase, Users, Tag,
    FileSignature, Calendar, Brain, RefreshCw, MessageSquare, Crown,
    Send, User, FileSpreadsheet, Percent, Eye
} from 'lucide-react';

// 🟢 Inicializa o Supabase
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface LandingPageProps {
    onLoginClick: () => void;
}

export default function LandingPage({ onLoginClick }: LandingPageProps) {
    const [settings, setSettings] = useState<any>(null);
    const [showStickyCTA, setShowStickyCTA] = useState(false);

    // --- ESTADOS DO SIMULADOR DO WHATSAPP ---
    const [chatStep, setChatStep] = useState(0);
    const [isTyping, setIsTyping] = useState(false);
    const [visibleMessages, setVisibleMessages] = useState<any[]>([]);

    const chatScript = [
        { sender: 'user', text: 'Mandei R$ 45 de Uber indo pro trabalho', type: 'text' },
        { sender: 'luna', text: 'Anotado! 🚗 Isolei R$ 45,00 na categoria **Transporte**. Seu saldo previsto para o fim do mês foi atualizado.', type: 'text' },
        { sender: 'user', text: 'Sobrou R$ 150, joga no cofrinho da viagem', type: 'text' },
        { sender: 'luna', text: 'Meta atualizada! 🏰 Guardei R$ 150,00 na sua caixinha **"Viagem Disney"**. Progresso atual: 62% concluído.', type: 'text' },
        { sender: 'user', text: 'Quanto eu gastei de mercado este mês?', type: 'text' },
        { sender: 'luna', text: 'Você já gastou R$ 680,50 em **Alimentação (Supermercado)**. Restam R$ 319,50 do seu teto estipulado de R$ 1.000.', type: 'text' }
    ];

    // Lógica do Loop do Simulador
    useEffect(() => {
        let timer: any;
        
        const runSimulation = async () => {
            if (chatStep >= chatScript.length) {
                // Reinicia o chat do zero
                await new Promise(r => setTimeout(r, 3000));
                setVisibleMessages([]);
                setChatStep(0);
                return;
            }

            const currentMsg = chatScript[chatStep];

            if (currentMsg.sender === 'luna') {
                setIsTyping(true);
                // Simula tempo de digitação da IA
                timer = setTimeout(() => {
                    setIsTyping(false);
                    setVisibleMessages(prev => [...prev, currentMsg]);
                    setChatStep(prev => prev + 1);
                }, 2000);
            } else {
                // Mensagem do usuário aparece um pouco mais rápido
                timer = setTimeout(() => {
                    setVisibleMessages(prev => [...prev, currentMsg]);
                    setChatStep(prev => prev + 1);
                }, 1500);
            }
        };

        if (document.getElementById('whatsapp-simulator')) {
            runSimulation();
        }
        
        return () => clearTimeout(timer);
    }, [chatStep]);

    // 🟢 Busca configurações e controla animações de Scroll
    useEffect(() => {
        const fetchSettings = async () => {
            const { data } = await supabase.from('app_settings').select('*').single();
            if (data) setSettings(data);
        };
        fetchSettings();

        // Controle da Barra CTA Mobile
        const handleScroll = () => {
            if (window.scrollY > 500) {
                setShowStickyCTA(true);
            } else {
                setShowStickyCTA(false);
            }
        };
        window.addEventListener('scroll', handleScroll);

        // Intersection Observer para o Efeito Reveal no Bento Box
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.remove('opacity-0', 'translate-y-12');
                    entry.target.classList.add('opacity-100', 'translate-y-0');
                    observer.unobserve(entry.target); // Anima só na primeira vez
                }
            });
        }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

        const revealElements = document.querySelectorAll('.scroll-reveal');
        revealElements.forEach(el => observer.observe(el));

        return () => {
            window.removeEventListener('scroll', handleScroll);
            observer.disconnect();
        };
    }, []);

    const handlePlanClick = (planName: string) => {
        localStorage.setItem('intent_plan', planName);
        onLoginClick();
    };

    const handleGenericLogin = () => {
        localStorage.removeItem('intent_plan');
        onLoginClick();
    };

    const renderPrice = (prefix: string, fallback: string) => {
        if (!settings) return <div className="text-3xl font-black text-white mb-6">R$ {fallback}<span className="text-sm font-normal text-gray-500">/mês</span></div>;

        const isPromo = settings.is_promo_active;
        const normal = settings[`price_${prefix}_normal`];
        const promo = settings[`price_${prefix}_promo`];

        const formatValue = (val: string) => val.includes('R$') ? val : `R$ ${val}`;

        if (isPromo && promo) {
            return (
                <div className="flex flex-col mb-6">
                    <span className="text-sm text-gray-500 line-through font-normal">De {formatValue(normal)}</span>
                    <span className="text-3xl font-black text-white">{formatValue(promo)}<span className="text-sm font-normal text-gray-500">/mês</span></span>
                </div>
            );
        }
        return <div className="text-3xl font-black text-white mb-6">{formatValue(normal)}<span className="text-sm font-normal text-gray-500">/mês</span></div>;
    };

    const scrollToConsultant = () => {
        const section = document.getElementById('consultant-section');
        if (section) section.scrollIntoView({ behavior: 'smooth' });
    };

    const scrollToFeatures = () => {
        const section = document.getElementById('bento-features');
        if (section) section.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-cyan-500 selection:text-black overflow-x-hidden pb-20 md:pb-0">

            {/* --- NAVBAR --- */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 md:h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <ShieldCheck className="text-cyan-500 w-8 h-8 md:w-9 md:h-9" />
                        <span className="text-xl md:text-2xl font-extrabold tracking-tighter">Meu<span className="text-cyan-500">Aliado.</span></span>
                    </div>
                    <div className="flex items-center gap-3 md:gap-4">
                        <button onClick={scrollToConsultant} className="hidden md:block text-sm text-gray-400 hover:text-white font-bold transition">
                            Sou Consultor
                        </button>
                        <button
                            onClick={handleGenericLogin}
                            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 md:px-6 md:py-2.5 rounded-full text-sm md:text-base font-bold transition border border-gray-700 shadow-lg shadow-gray-900/20"
                        >
                            Acessar
                        </button>
                    </div>
                </div>
            </nav>

            {/* --- HERO SECTION CENTRALIZADA --- */}
            <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 px-4 sm:px-6 overflow-hidden text-center">
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[140px] pointer-events-none"></div>
                <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[140px] pointer-events-none delay-300"></div>

                <div className="max-w-5xl mx-auto relative z-10 flex flex-col items-center space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700">
                    
                    {settings?.is_promo_active ? (
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[11px] font-bold uppercase tracking-wider mb-2">
                            <Tag size={12} /> {settings.promo_text || "Oferta Especial Ativa"}
                        </div>
                    ) : (
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-900 border border-gray-800 text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-2 backdrop-blur-sm">
                            <LayoutDashboard size={12} className="text-cyan-500" /> Inteligência Financeira Unificada
                        </div>
                    )}

                    <h1 className="text-4xl sm:text-5xl md:text-7xl font-black tracking-tight leading-[1.05] max-w-4xl">
                        O Sistema Operacional <br />
                        da sua <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500">Vida Financeira.</span>
                    </h1>

                    <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed px-4">
                        Contas, cartões e objetivos unificados em uma plataforma de alta performance. Gerencie tudo pela Web e conte com a facilidade da IA Luna direto no seu WhatsApp para lançamentos rápidos.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 w-full px-6">
                        <button
                            onClick={handleGenericLogin}
                            className="w-full sm:w-auto px-10 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-lg shadow-xl shadow-cyan-900/20 transition transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2"
                        >
                            Começar Grátis <ArrowRight size={20} />
                        </button>
                        <button onClick={scrollToFeatures} className="w-full sm:w-auto px-10 py-4 bg-gray-900/50 border border-gray-800 hover:bg-gray-800 text-gray-300 rounded-xl font-bold text-lg transition flex items-center justify-center gap-2 backdrop-blur-sm hover:scale-[1.02] active:scale-95">
                            <Sparkles size={18} className="text-purple-400" /> Explorar Ecossistema
                        </button>
                    </div>
                </div>
            </section>

            {/* --- SEÇÃO GRANDE BENTO (BENTO BOX GRID) --- */}
            <section id="bento-features" className="py-20 md:py-28 bg-[#0a0a0a] border-y border-white/5 scroll-mt-16 relative">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none"></div>
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    
                    <div className="text-center max-w-3xl mx-auto mb-16 space-y-4 relative z-10 scroll-reveal opacity-0 translate-y-12 transition-all duration-700">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider">
                            <Layers size={12} /> Ecossistema Unificado
                        </div>
                        <h2 className="text-3xl md:text-5xl font-black">Muito mais que planilhas.</h2>
                        <p className="text-gray-400 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
                            Centralize sua complexidade financeira em uma interface desenhada para performance. O Meu Aliado não apenas registra, ele age estrategicamente na sua organização.
                        </p>
                    </div>

                    {/* O GRID BENTO COM ANIMAÇÕES NO SCROLL */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6 auto-rows-[220px] relative z-10">
                        
                        {/* 1. Centralização Total */}
                        <div className="md:col-span-7 md:row-span-2 p-8 md:p-10 rounded-3xl bg-[#111] border border-gray-800 flex flex-col justify-between group hover:border-cyan-500/30 transition duration-300 relative overflow-hidden shadow-xl hover:shadow-cyan-900/10 scroll-reveal opacity-0 translate-y-12 transition-all duration-700 delay-100">
                            <div className="absolute -right-10 -bottom-10 opacity-10 pointer-events-none text-cyan-500 group-hover:scale-105 transition duration-500"><LayoutDashboard size={280} /></div>
                            <div className="relative z-10">
                                <div className="w-14 h-14 bg-cyan-900/20 text-cyan-400 rounded-2xl flex items-center justify-center mb-8"><Layers size={26} /></div>
                                <h3 className="text-2xl md:text-3xl font-black mb-4 tracking-tight leading-tight">Painel de Consolidação Geral</h3>
                                <p className="text-sm md:text-base text-gray-400 leading-relaxed max-w-md">
                                    Junte carteiras digitais, contas correntes, cartões de crédito e dinheiro físico em um único saldo vivo. Chega de logar em cinco aplicativos para saber quanto você tem de verdade.
                                </p>
                            </div>
                            <div className="text-xs text-cyan-500 font-mono tracking-wider flex items-center gap-2 mt-4 relative z-10"><CheckCircle2 size={12}/> Integração Visual Inteligente</div>
                        </div>

                        {/* 2. Filtros e Exportação Excel */}
                        <div className="md:col-span-5 md:row-span-1 p-6 md:p-8 rounded-3xl bg-[#111] border border-gray-800 flex flex-col justify-between group hover:border-emerald-500/30 transition duration-300 relative overflow-hidden scroll-reveal opacity-0 translate-y-12 transition-all duration-700 delay-200">
                            <div className="absolute right-4 bottom-4 text-emerald-500/10 pointer-events-none"><FileSpreadsheet size={90} /></div>
                            <div className="flex items-start gap-4 relative z-10">
                                <div className="w-10 h-10 bg-emerald-900/20 text-emerald-400 rounded-xl flex items-center justify-center shrink-0"><FileSpreadsheet size={18} /></div>
                                <div>
                                    <h3 className="text-lg font-bold mb-1">Relatórios Excel Nível Auditoria</h3>
                                    <p className="text-xs md:text-sm text-gray-400 leading-relaxed">
                                        Exporte todo o seu histórico financeiro estruturado com filtros avançados em um clique.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* 3. Sistema de Metas e Compras */}
                        <div className="md:col-span-5 md:row-span-1 p-6 md:p-8 rounded-3xl bg-[#111] border border-gray-800 flex flex-col justify-between group hover:border-purple-500/30 transition duration-300 relative overflow-hidden scroll-reveal opacity-0 translate-y-12 transition-all duration-700 delay-300">
                            <div className="flex items-start gap-4 relative z-10">
                                <div className="w-10 h-10 bg-purple-900/20 text-purple-400 rounded-xl flex items-center justify-center shrink-0"><Sparkles size={18} /></div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold mb-1">Caixinhas de Metas Visuais</h3>
                                    <p className="text-xs md:text-sm text-gray-400 leading-relaxed mb-3">
                                        Separe capital para objetivos específicos e acompanhe o progresso automático.
                                    </p>
                                    <div className="w-full bg-gray-900 rounded-full h-1.5 border border-gray-800 overflow-hidden"><div className="bg-purple-500 h-full w-[62%] rounded-full shadow-[0_0_8px_#a855f7]"></div></div>
                                </div>
                            </div>
                        </div>

                        {/* 4. Múltiplos Perfis */}
                        <div className="md:col-span-4 md:row-span-1 p-6 rounded-3xl bg-[#111] border border-gray-800 flex flex-col justify-between group hover:border-blue-500/30 transition duration-300 relative overflow-hidden scroll-reveal opacity-0 translate-y-12 transition-all duration-700 delay-400">
                            <div className="flex items-center gap-3 text-blue-400 mb-2 relative z-10">
                                <Users size={18} />
                                <h4 className="font-bold text-sm text-white">Segregação de Perfis</h4>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed relative z-10">
                                Separe as contas da sua Empresa, da sua Casa e da sua vida Pessoal no mesmo login.
                            </p>
                        </div>

                        {/* 5. Contas em Stand-by */}
                        <div className="md:col-span-4 md:row-span-1 p-6 rounded-3xl bg-[#111] border border-gray-800 flex flex-col justify-between group hover:border-amber-500/30 transition duration-300 relative overflow-hidden scroll-reveal opacity-0 translate-y-12 transition-all duration-700 delay-[500ms]">
                            <div className="flex items-center gap-3 text-amber-500 mb-2 relative z-10">
                                <Calendar size={18} />
                                <h4 className="font-bold text-sm text-white">Stand-by Inteligente</h4>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed relative z-10">
                                Trave faturas recorrentes e monitore parcelamentos futuros para evitar esquecimentos.
                            </p>
                        </div>

                        {/* 6. Sandbox de Cenários */}
                        <div className="md:col-span-4 md:row-span-1 p-6 rounded-3xl bg-[#111] border border-gray-800 flex flex-col justify-between group hover:border-pink-500/30 transition duration-300 relative overflow-hidden scroll-reveal opacity-0 translate-y-12 transition-all duration-700 delay-[600ms]">
                            <div className="flex items-center gap-3 text-pink-500 mb-2 relative z-10">
                                <Brain size={18} />
                                <h4 className="font-bold text-sm text-white">Simulação de Cenários</h4>
                            </div>
                            <p className="text-xs text-gray-400 leading-relaxed relative z-10">
                                Projete compras grandes e descubra o impacto real no seu saldo futuro antes de gastar.
                            </p>
                        </div>

                    </div>
                </div>
            </section>

            {/* --- NOVA SEÇÃO: WHATSAPP ANIMADO --- */}
            <section id="whatsapp-simulator" className="py-20 md:py-28 px-4 sm:px-6 bg-[#050505] relative overflow-hidden">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none"></div>
                
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
                    
                    {/* TEXTO EXPLICATIVO */}
                    <div className="lg:col-span-7 text-center lg:text-left space-y-6 scroll-reveal opacity-0 translate-y-12 transition-all duration-700">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                            <Smartphone size={14} className="text-emerald-500" /> Praticidade no seu Bolso
                        </div>

                        <h2 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
                            Luna no WhatsApp: <br />
                            Sua assistente 24h.
                        </h2>

                        <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                            Lançar gastos nunca foi tão rápido. Esqueça ter que abrir o app para tudo. Envie uma mensagem de texto, tire foto de um recibo ou mande um áudio rápido no trânsito ("Gastei R$ 30 de padaria"). A Luna entende, categoriza e atualiza seu painel web instantaneamente.
                        </p>

                        <div className="flex justify-center lg:justify-start pt-3">
                            <button
                                onClick={handleGenericLogin}
                                className="px-6 py-3 border border-gray-700 bg-gray-900/50 hover:bg-gray-800 text-white rounded-xl font-bold text-sm transition flex items-center gap-2 hover:scale-[1.02]"
                            >
                                Testar Praticidade <Smartphone size={16} />
                            </button>
                        </div>
                    </div>

                    {/* INTERFACE DO WHATSAPP ANIMADO */}
                    {/* INTERFACE DO WHATSAPP ANIMADO COM AVATAR DA LUNA (Responsivo) */}
                    <div className="lg:col-span-5 flex justify-center lg:justify-end w-full relative scroll-reveal opacity-0 translate-y-12 transition-all duration-700 delay-200 mt-12 lg:mt-0">
                        
                        {/* Efeito de luz (Aura) atrás de tudo */}
                        <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/20 to-purple-500/20 blur-3xl rounded-full scale-90 opacity-50 z-0"></div>
                        
                        {/* 🟢 AVATAR DE CORPO INTEIRO (luna-full.png) */}
                        {/* 🔴 AJUSTE MOBILE: A classe 'hidden lg:block' garante que ela SÓ apareça em telas grandes. */}
                        <div className="hidden lg:block absolute bottom-0 lg:left-[-15%] xl:left-[-10%] w-[380px] z-10 pointer-events-none transition-transform duration-700 origin-bottom hover:scale-105">
                            <img 
                                src="/luna-confiante.png" 
                                alt="Luna Assistente Financeira" 
                                className="w-full h-auto object-contain drop-shadow-[0_0_40px_rgba(8,145,178,0.4)]"
                            />
                        </div>
                        
                        {/* Corpo do Smartphone Mockup (z-20) */}
                        {/* Ajuste de margem responsiva: no mobile centraliza, no desktop encosta na direita com margem */}
                        <div className="w-full max-w-[300px] sm:max-w-[320px] bg-[#0c0c0e] border-[6px] border-gray-800 rounded-[2.5rem] shadow-2xl overflow-hidden aspect-[9/18.5] flex flex-col relative z-20 group hover:border-gray-700 transition duration-500 shadow-[0_20px_50px_rgba(0,0,0,0.8)] lg:mr-4">
                            
                            {/* Topo do Celular (Dynamic Island Style) */}
                            <div className="h-6 bg-black w-full flex justify-center items-center relative shrink-0 z-30">
                                <div className="w-24 h-4 bg-black rounded-b-xl absolute top-0"></div>
                            </div>

                            {/* Header do WhatsApp */}
                            <div className="bg-[#141416] p-3 border-b border-gray-800 flex items-center gap-3 shrink-0 relative z-10">
                                <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold relative shadow-md overflow-hidden border border-white/5">
                                    <img src="/luna-avatar.png" alt="Luna Avatar" className="w-full h-full object-cover" />
                                    <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-[#141416] rounded-full"></div>
                                </div>
                                <div className="text-left flex-1">
                                    <h4 className="text-xs font-black tracking-wide">Luna • MeuAliado</h4>
                                    <p className="text-[10px] text-emerald-400 font-medium">
                                        {isTyping ? "digitando..." : "online"}
                                    </p>
                                </div>
                                <ShieldCheck size={16} className="text-cyan-500" />
                            </div>

                            {/* Corpo do Chat / Mensagens */}
                            <div id="whatsapp-simulator-messages" className="flex-1 p-3 overflow-y-auto bg-[#08080a] space-y-3 flex flex-col scrollbar-none text-[11px] md:text-xs">
                                {visibleMessages.map((msg, idx) => (
                                    <div
                                        key={idx}
                                        className={`max-w-[85%] rounded-2xl p-3 leading-relaxed animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                                            msg.sender === 'user'
                                                ? 'bg-gray-800 text-white self-end rounded-tr-none text-right shadow'
                                                : 'bg-cyan-950/40 border border-cyan-900/40 text-gray-200 self-start rounded-tl-none text-left shadow-inner'
                                        }`}
                                    >
                                        <p dangerouslySetInnerHTML={{__html: msg.text.replace(/\*\*(.*?)\*\*/g, '<strong class="text-cyan-400 font-bold">$1</strong>')}} />
                                    </div>
                                ))}

                                {/* Indicador de Digitando */}
                                {isTyping && (
                                    <div className="bg-gray-900/50 text-gray-400 self-start rounded-2xl rounded-tl-none p-3 flex items-center gap-1 animate-pulse">
                                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></div>
                                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-75"></div>
                                        <div className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce delay-150"></div>
                                    </div>
                                )}
                            </div>

                            {/* Barra de Input Falsa */}
                            <div className="p-3 bg-[#141416] border-t border-gray-800 flex items-center gap-2 shrink-0 text-left relative z-10">
                                <div className="flex-1 bg-black border border-gray-800 rounded-full px-4 py-2 text-[10px] text-gray-600 flex items-center justify-between">
                                    <span>Conversar com a Luna...</span>
                                </div>
                                <div className="w-8 h-8 rounded-full bg-cyan-600 text-white flex items-center justify-center shadow-lg"><Send size={12} /></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- PRICING PESSOAL --- */}
            <section className="py-20 md:py-28 bg-[#0a0a0a] border-t border-white/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[120px] pointer-events-none"></div>
                
                <div className="max-w-7xl mx-auto px-4 sm:px-6 text-center relative z-10">
                    <h2 className="text-3xl md:text-5xl font-black mb-4 scroll-reveal opacity-0 translate-y-12 transition-all duration-700">Escolha seu Poder 🚀</h2>
                    <p className="text-gray-400 mb-16 max-w-2xl mx-auto text-sm md:text-base leading-relaxed scroll-reveal opacity-0 translate-y-12 transition-all duration-700 delay-100">
                        Do controle básico ao monitoramento corporativo. Ative o plano perfeito para a sua realidade financeira e mude seu patamar de organização hoje.
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 text-left items-stretch">
                        
                        {/* PLANO START */}
                        <div className="p-6 md:p-8 rounded-3xl bg-[#111] border border-gray-800 flex flex-col hover:border-gray-700 transition group relative overflow-hidden h-full shadow-lg hover:shadow-gray-900/50 hover:-translate-y-1 scroll-reveal opacity-0 translate-y-12 transition-all duration-700 delay-200">
                            <h3 className="text-gray-400 font-bold uppercase tracking-widest mb-4 text-xs">Start</h3>
                            {renderPrice('start', '10,00')}
                            
                            <ul className="space-y-4 mb-8 flex-1 text-xs md:text-sm text-gray-400">
                                <li className="flex gap-3"><CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> Faturas com ícones organizados</li>
                                <li className="flex gap-3"><CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> Relatórios Excel Filtrados</li>
                                <li className="flex gap-3"><CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> Importação com IA (Texto de Recibo)</li>
                                <li className="flex gap-3"><CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> Gráfico Comparativo de Desempenho</li>
                                <li className="flex gap-3"><CheckCircle2 size={16} className="text-emerald-500 shrink-0" /> Gerenciamento de Metas de Compra</li>
                                <li className="flex gap-3 text-amber-500 font-bold"><Zap size={16} className="shrink-0" /> Assistente Web (Limite de Uso)</li>
                            </ul>
                            
                            <button onClick={() => handlePlanClick('start')} className="w-full py-4 rounded-xl border border-gray-700 hover:bg-white hover:text-black font-bold transition mt-auto text-sm shadow active:scale-95">Escolher Start</button>
                        </div>

                        {/* PLANO PREMIUM (DESTAQUE) */}
                        <div className="p-6 md:p-8 rounded-3xl bg-[#0e0e11] border border-cyan-500 relative flex flex-col shadow-2xl shadow-cyan-900/20 z-10 transform md:scale-105 hover:scale-[1.01] md:hover:scale-[1.07] transition duration-300 h-full ring-1 ring-cyan-500/30 scroll-reveal opacity-0 translate-y-12 transition-all duration-700 delay-300">
                            <div className="absolute top-0 right-0 bg-cyan-600 text-white text-[9px] font-black px-4 py-1.5 rounded-bl-xl uppercase tracking-wider">O MAIS PROCURADO</div>
                            <h3 className="text-cyan-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-xs"><Sparkles size={14} /> Premium</h3>
                            {renderPrice('premium', '29,90')}
                            
                            <ul className="space-y-4 mb-8 flex-1 text-xs md:text-sm text-white">
                                <li className="flex gap-3 font-bold text-cyan-400"><CheckCircle2 size={16} className="shrink-0" /> Tudo do Plano Start</li>
                                <li className="flex gap-3 font-black text-cyan-400 italic"><Sparkles size={16} className="shrink-0" /> Luna Web: Lançamentos & Cenários</li>
                                <li className="flex gap-3"><CheckCircle2 size={16} className="text-cyan-500 shrink-0" /> Extração Completa de Fotos de Recibo</li>
                                <li className="flex gap-3"><CheckCircle2 size={16} className="text-cyan-500 shrink-0" /> Detalhamento em Categoria e Subcategoria</li>
                                <li className="flex gap-3"><CheckCircle2 size={16} className="text-cyan-500 shrink-0" /> Customização Estética de Cores e Temas</li>
                                <li className="flex gap-3 font-bold"><CheckCircle2 size={16} className="text-cyan-500 shrink-0" /> Abertura de Múltiplos Perfis Independentes</li>
                                <li className="flex gap-3 text-gray-500 line-through"><Smartphone size={16} className="shrink-0" /> Integração Nativa com WhatsApp</li>
                            </ul>
                            
                            <button onClick={() => handlePlanClick('premium')} className="w-full py-4 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black transition shadow-lg text-base mt-auto active:scale-95">Quero o Premium</button>
                        </div>

                        {/* PLANO PRO */}
                        <div className="p-6 md:p-8 rounded-3xl bg-[#111] border border-purple-500/30 flex flex-col hover:border-purple-500/60 transition group relative overflow-hidden h-full shadow-lg hover:shadow-gray-900/50 hover:-translate-y-1 scroll-reveal opacity-0 translate-y-12 transition-all duration-700 delay-400">
                            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-600 to-pink-600"></div>
                            <h3 className="text-purple-400 font-bold uppercase tracking-widest mb-4 flex items-center gap-2 text-xs"><Crown size={14} /> Pro</h3>
                            {renderPrice('pro', '39,90')}
                            
                            <ul className="space-y-4 mb-8 flex-1 text-xs md:text-sm text-gray-300">
                                <li className="flex gap-3 font-bold text-purple-400"><CheckCircle2 size={16} className="shrink-0" /> Tudo do Plano Premium</li>
                                <li className="flex gap-3 font-black text-white italic"><MessageSquare size={16} className="text-emerald-400 shrink-0" /> Notificações de Vencimento no WhatsApp</li>
                                <li className="flex gap-3 font-black text-white italic"><Smartphone size={16} className="text-emerald-400 shrink-0" /> IA Completa no WhatsApp (Acesso 24h)</li>
                                <li className="flex gap-3"><CheckCircle2 size={16} className="text-purple-500 shrink-0" /> Suporte a Mensagens de Áudio no Zap</li>
                                <li className="flex gap-3"><CheckCircle2 size={16} className="text-purple-500 shrink-0" /> Cadastro Integrado do Nome do Parceiro(a)</li>
                                <li className="flex gap-3"><CheckCircle2 size={16} className="text-purple-500 shrink-0" /> Canal de Atendimento Vip/Prioritário</li>
                            </ul>
                            
                            <button onClick={() => handlePlanClick('pro')} className="w-full py-4 rounded-xl border border-purple-500/50 bg-purple-900/10 hover:bg-purple-600 text-white font-black transition shadow-lg mt-auto text-sm active:scale-95">Virar Pro Agora</button>
                        </div>
                    </div>

                    {/* BANNER DO PLANO CONSULTOR B2B */}
                    <div className="mt-16 bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6 max-w-4xl mx-auto cursor-pointer hover:border-amber-500/40 transition shadow-2xl hover:shadow-amber-900/5 relative z-10 scroll-reveal opacity-0 translate-y-12 transition-all duration-700 delay-500" onClick={scrollToConsultant}>
                        <div className="flex items-center gap-4 text-left">
                            <div className="p-3 bg-amber-500/20 text-amber-500 rounded-xl shrink-0"><Briefcase size={22} /></div>
                            <div>
                                <h4 className="text-white font-bold text-base md:text-lg">Solução Corporativa para Consultores</h4>
                                <p className="text-gray-400 text-xs md:text-sm">Controle clientes, emita contratos White-Label com sua marca e envie relatórios automatizados.</p>
                            </div>
                        </div>
                        <button className="px-5 py-2.5 bg-amber-600/20 text-amber-400 font-bold rounded-lg border border-amber-500/40 hover:bg-amber-500 hover:text-black transition text-xs md:text-sm whitespace-nowrap active:scale-95">
                            Ver Solução B2B
                        </button>
                    </div>

                </div>
            </section>

            {/* --- ÁREA PARA CONSULTORES (B2B) --- */}
            <section id="consultant-section" className="py-20 md:py-28 bg-[#08080c] relative overflow-hidden border-t border-white/5 scroll-mt-16">
                <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10">
                    <div className="bg-[#111] border border-gray-800 rounded-3xl p-6 md:p-14 shadow-2xl scroll-reveal opacity-0 translate-y-12 transition-all duration-700">
                        <div className="text-center mb-12 space-y-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/20 border border-amber-500/30 text-amber-500 text-xs font-bold uppercase tracking-wider mb-2">
                                <Briefcase size={12} /> Solução Corporativa
                            </div>
                            <h2 className="text-3xl md:text-5xl font-black text-white leading-tight">
                                O seu escritório digital no <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Plano Consultor (Agent)</span>
                            </h2>
                            <p className="text-gray-400 text-sm md:text-base max-w-3xl mx-auto leading-relaxed">
                                Transforme a nossa tecnologia na engrenagem de performance do seu negócio. Administre carteiras de dezenas de assessorados por um painel exclusivo de controle total.
                            </p>
                        </div>

                        {/* Grid de funcionalidades B2B */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 mb-12">
                            <div className="bg-[#151518] rounded-2xl p-6 border border-gray-800 hover:border-amber-500/30 transition group flex flex-col gap-4">
                                <div className="w-12 h-12 bg-amber-900/20 text-amber-500 rounded-xl flex items-center justify-center mb-1 group-hover:scale-105 transition"><RefreshCw size={24} /></div>
                                <h3 className="text-lg font-bold text-white mb-0">Painel de Onboarding do Cliente</h3>
                                <p className="text-xs md:text-sm text-gray-400 leading-relaxed">
                                    Monitore as movimentações, saldos e históricos dos seus clientes cadastrados em tempo real, fornecendo feedbacks cirúrgicos e preventivos.
                                </p>
                            </div>

                            <div className="bg-[#151518] rounded-2xl p-6 border border-gray-800 hover:border-amber-500/30 transition group flex flex-col gap-4">
                                <div className="w-12 h-12 bg-amber-900/20 text-amber-500 rounded-xl flex items-center justify-center mb-1 group-hover:scale-105 transition"><FileSignature size={24} /></div>
                                <h3 className="text-lg font-bold text-white mb-0">Contratos e Documentos com sua Logo</h3>
                                <p className="text-xs md:text-sm text-gray-400 leading-relaxed">
                                    Gere relatórios gerenciais e layouts personalizados (White-Label) com a logomarca do seu escritório financeiro diretamente na plataforma.
                                </p>
                            </div>

                            <div className="bg-[#151518] rounded-2xl p-6 border border-gray-800 hover:border-amber-500/30 transition group flex flex-col gap-4">
                                <div className="w-12 h-12 bg-amber-900/20 text-amber-500 rounded-xl flex items-center justify-center mb-1 group-hover:scale-105 transition"><Brain size={24} /></div>
                                <h3 className="text-lg font-bold text-white mb-0">Relatórios Gerenciais Automatizados</h3>
                                <p className="text-xs md:text-sm text-gray-400 leading-relaxed">
                                    Utilize relatórios consolidados por períodos para identificar onde estão as dores, gargalos e vazamentos de capital dos seus clientes.
                                </p>
                            </div>

                            <div className="bg-[#151518] rounded-2xl p-6 border border-gray-800 hover:border-amber-500/30 transition group flex flex-col gap-4">
                                <div className="w-12 h-12 bg-amber-900/20 text-amber-500 rounded-xl flex items-center justify-center mb-1 group-hover:scale-105 transition"><Calendar size={24} /></div>
                                <h3 className="text-lg font-bold text-white mb-0">Agenda Integrada de Alinhamento</h3>
                                <p className="text-xs md:text-sm text-gray-400 leading-relaxed">
                                    Sincronize calendários e organize as reuniões mensais de fechamento diretamente pela interface para manter os clientes engajados.
                                </p>
                            </div>
                        </div>

                        {/* Preço B2B */}
                        <div className="text-center pt-10 border-t border-gray-800 flex flex-col items-center">
                            <div className="mb-6">{renderPrice('agent', '99,90')}</div>
                            <button
                                onClick={() => handlePlanClick('agent')}
                                className="px-10 py-5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-black rounded-xl transition shadow-xl shadow-amber-900/30 text-lg inline-flex items-center gap-2 transform hover:scale-[1.01] active:scale-95"
                            >
                                Assinar Plano Consultor <ArrowRight size={22} />
                            </button>
                            <p className="text-gray-500 text-xs md:text-sm mt-6 max-w-md mx-auto leading-relaxed">
                                Ao criar a conta de consultor, você ativa <span className="text-amber-400 font-bold">24 horas de teste grátis</span>. Avalie os painéis internos antes da primeira cobrança do ciclo.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FOOTER INSTITUCIONAL --- */}
            <footer className="py-16 border-t border-white/5 text-center text-gray-500 text-sm bg-[#050505] px-4 relative overflow-hidden">
                <div className="absolute bottom-[-100px] left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-cyan-900/10 blur-[100px] pointer-events-none opacity-50"></div>

                <div className="max-w-4xl mx-auto flex flex-col items-center relative z-10">
                    <div className="flex items-center justify-center gap-2 mb-4">
                        <ShieldCheck size={26} className="text-gray-700" />
                        <span className="font-extrabold text-gray-300 text-xl tracking-tight">Meu<span className="text-cyan-500">Aliado.</span></span>
                    </div>
                    
                    <p className="max-w-2xl mx-auto text-xs text-gray-600 leading-relaxed mb-6">
                        O Meu Aliado é uma plataforma tecnológica voltada para gestão, organização e automação gerencial. 
                        Não somos um banco, não operamos carteiras de investimentos de terceiros e <strong className="text-gray-400">nunca</strong> solicitaremos as credenciais de acesso ou senhas das suas instituições bancárias.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-6 mb-8 text-gray-400 text-xs md:text-sm">
                        <a href="mailto:contato@usealiado.com.br" className="flex items-center gap-2 hover:text-cyan-400 transition font-medium">
                            <MessageSquare size={16} className="text-cyan-500"/> contato@usealiado.com.br
                        </a>
                        <span className="hidden sm:inline text-gray-800">•</span>
                        <span>Goiânia, GO - Brasil</span>
                    </div>

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-gray-800 to-transparent mb-8"></div>

                    <p className="mb-6 text-xs">&copy; {new Date().getFullYear()} Meu Aliado Tecnologia. Todos os direitos reservados.</p>
                    
                    <div className="flex flex-wrap justify-center gap-6 text-xs font-medium text-gray-400">
                        <a href="/termos" className="hover:text-cyan-400 transition">Termos de Uso</a>
                        <a href="/privacidade" className="hover:text-cyan-400 transition">Política de Privacidade</a>
                        <a href="mailto:contato@usealiado.com.br" className="hover:text-cyan-400 transition">Suporte</a>
                    </div>
                </div>
            </footer>

            {/* --- STICKY CTA MOBILE --- */}
            <div className={`fixed bottom-0 left-0 right-0 p-4 bg-[#0a0a0a]/90 backdrop-blur-lg border-t border-gray-800 z-50 md:hidden transition-transform duration-500 ease-in-out ${showStickyCTA ? 'translate-y-0' : 'translate-y-full'}`}>
                <div className="flex items-center justify-between gap-4">
                    <div className="flex flex-col text-left">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider leading-none mb-1">A partir de</span>
                        <span className="text-lg font-black text-white leading-none">R$ 10,00<span className="text-[10px] font-normal text-gray-500">/mês</span></span>
                    </div>
                    <button onClick={handleGenericLogin} className="flex-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20 active:scale-95 text-sm">
                        Começar Grátis <ArrowRight size={16} />
                    </button>
                </div>
            </div>

        </div>
    );
}