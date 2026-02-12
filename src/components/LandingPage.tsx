import React from 'react';
import { 
    ShieldCheck, Sparkles, Smartphone, BarChart3, 
    Zap, CheckCircle2, Lock, ArrowRight, 
    LayoutDashboard, Layers, TrendingUp, Play, Briefcase, Users
} from 'lucide-react';

interface LandingPageProps {
    onLoginClick: () => void;
}

export default function LandingPage({ onLoginClick }: LandingPageProps) {
    
    // Rolar até o Vídeo
    const scrollToDemo = () => {
        const section = document.getElementById('demo-video');
        if (section) section.scrollIntoView({ behavior: 'smooth' });
    };

    // Rolar até a área de Consultores (NOVO)
    const scrollToConsultant = () => {
        const section = document.getElementById('consultant-section');
        if (section) section.scrollIntoView({ behavior: 'smooth' });
    };

    return (
        <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-cyan-500 selection:text-black overflow-x-hidden">
            
            {/* --- NAVBAR --- */}
            <nav className="fixed top-0 left-0 right-0 z-50 bg-[#050505]/80 backdrop-blur-md border-b border-white/10">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShieldCheck className="text-cyan-500" size={32} />
                        <span className="text-2xl font-extrabold tracking-tighter">Meu<span className="text-cyan-500">Aliado.</span></span>
                    </div>
                    <div className="flex items-center gap-4">
                        {/* AGORA ESSE BOTÃO ROLA A PÁGINA 👇 */}
                        <button onClick={scrollToConsultant} className="hidden md:block text-sm text-gray-400 hover:text-white font-bold transition">
                            Sou Consultor
                        </button>
                        <button 
                            onClick={onLoginClick}
                            className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2.5 rounded-full font-bold transition border border-gray-700 hover:border-gray-500"
                        >
                            Acessar Sistema
                        </button>
                    </div>
                </div>
            </nav>

            {/* --- HERO SECTION --- */}
            <section className="relative pt-32 pb-10 md:pt-48 md:pb-20 px-6 overflow-hidden text-center">
                <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none"></div>
                
                <div className="max-w-5xl mx-auto relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gray-900 border border-gray-700 text-gray-300 text-xs font-bold uppercase tracking-wider mb-6 animate-in fade-in slide-in-from-bottom-4">
                        <LayoutDashboard size={12} className="text-cyan-500"/> Gestão Financeira Inteligente
                    </div>
                    
                    <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-tight animate-in fade-in slide-in-from-bottom-6 duration-700">
                        O Sistema Operacional <br className="hidden md:block"/>
                        da sua <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">Vida Financeira.</span>
                    </h1>
                    
                    <p className="text-lg md:text-xl text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed animate-in fade-in slide-in-from-bottom-8 duration-1000">
                        Centralize contas, cartões e investimentos em um painel unificado. 
                        Use a <span className="text-white font-bold">Inteligência Artificial</span> para lançar gastos pelo WhatsApp e prever seu futuro financeiro.
                    </p>
                    
                    <div className="flex flex-col md:flex-row items-center justify-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-1000">
                        <button 
                            onClick={onLoginClick}
                            className="w-full md:w-auto px-8 py-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-cyan-900/20 transition hover:scale-105 flex items-center justify-center gap-2"
                        >
                            Começar Grátis <ArrowRight size={20} />
                        </button>
                        <button onClick={scrollToDemo} className="w-full md:w-auto px-8 py-4 bg-gray-900 border border-gray-800 hover:bg-gray-800 text-gray-300 rounded-xl font-bold text-lg transition flex items-center justify-center gap-2">
                            <Sparkles size={20} className="text-purple-500"/> Ver Demonstração
                        </button>
                    </div>
                </div>
            </section>

            {/* --- VÍDEO SECTION --- */}
            <section id="demo-video" className="px-6 pb-20 scroll-mt-32">
                <div className="max-w-5xl mx-auto">
                    <div className="relative rounded-3xl p-1 bg-gradient-to-b from-gray-700 to-gray-900 shadow-2xl shadow-cyan-900/20 group">
                        <div className="absolute inset-0 bg-cyan-500/20 blur-3xl opacity-20 group-hover:opacity-40 transition duration-1000 rounded-3xl"></div>
                        <div className="relative bg-[#050505] rounded-[22px] overflow-hidden aspect-video flex items-center justify-center border border-white/5 cursor-pointer group">
                            <img 
                                src="https://images.unsplash.com/photo-1642543492481-44e81e3914a7?q=80&w=2670&auto=format&fit=crop" 
                                alt="Dashboard Preview" 
                                className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-40 transition duration-500"
                            />
                            <div className="w-24 h-24 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center border border-white/20 shadow-2xl group-hover:scale-110 transition duration-300 z-10 relative">
                                <Play size={32} className="fill-white text-white ml-2" />
                            </div>
                            <div className="absolute bottom-8 left-0 right-0 text-center z-10">
                                <p className="text-sm font-bold uppercase tracking-widest text-white/80">Assista como funciona (1:30)</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- PILARES --- */}
            <section className="py-20 bg-[#0a0a0a] border-y border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="p-8 rounded-3xl bg-[#111] border border-gray-800 relative group hover:border-cyan-500/30 transition">
                            <div className="w-14 h-14 bg-cyan-900/20 text-cyan-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                                <Layers size={28} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Centralização Total</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Junte Nubank, Inter, Caixa e dinheiro vivo em um dashboard unificado. Pare de somar saldos de cabeça.
                            </p>
                        </div>
                        <div className="p-8 rounded-3xl bg-[#111] border border-gray-800 relative group hover:border-purple-500/30 transition">
                            <div className="w-14 h-14 bg-purple-900/20 text-purple-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                                <BarChart3 size={28} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Previsibilidade Real</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Nosso sistema projeta seu saldo futuro, avisa sobre faturas e impede que você entre no vermelho antes que aconteça.
                            </p>
                        </div>
                        <div className="p-8 rounded-3xl bg-[#111] border border-gray-800 relative group hover:border-emerald-500/30 transition">
                            <div className="w-14 h-14 bg-emerald-900/20 text-emerald-400 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition">
                                <Smartphone size={28} />
                            </div>
                            <h3 className="text-xl font-bold mb-3">Captura via WhatsApp</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Gastou na rua? Mande um áudio ou foto pro bot. A IA processa e lança no seu painel em segundos.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- DASHBOARD PREVIEW --- */}
            <section className="py-20 px-6">
                <div className="max-w-7xl mx-auto">
                    <div className="bg-gradient-to-b from-gray-900 to-black border border-gray-800 rounded-3xl p-1 md:p-4 overflow-hidden shadow-2xl relative">
                        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 pointer-events-none"></div>
                        <div className="bg-[#050505] rounded-2xl p-8 md:p-12 text-center md:text-left relative z-10 flex flex-col md:flex-row items-center gap-12">
                            <div className="flex-1">
                                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-900/30 border border-purple-500/30 text-purple-400 text-xs font-bold uppercase tracking-wider mb-6">
                                    <Sparkles size={12} /> Tecnologia Exclusiva
                                </div>
                                <h3 className="text-3xl md:text-4xl font-bold mb-6">
                                    Um Dashboard vivo que <br/>
                                    <span className="text-gray-500">conversa com você.</span>
                                </h3>
                                <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                                    Esqueça softwares complicados de contabilidade. O Meu Aliado foi desenhado para ser visual, rápido e intuitivo.
                                </p>
                                <ul className="space-y-3 mb-8">
                                    <li className="flex items-center gap-3 text-gray-300">
                                        <CheckCircle2 size={18} className="text-cyan-500" />
                                        <span>Modo Calendário e Timeline</span>
                                    </li>
                                    <li className="flex items-center gap-3 text-gray-300">
                                        <CheckCircle2 size={18} className="text-cyan-500" />
                                        <span>Gestão de Faturas de Cartão</span>
                                    </li>
                                    <li className="flex items-center gap-3 text-gray-300">
                                        <CheckCircle2 size={18} className="text-cyan-500" />
                                        <span>Múltiplos Perfis (Pessoal, Casa, Empresa)</span>
                                    </li>
                                </ul>
                                <button onClick={onLoginClick} className="px-6 py-3 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition">
                                    Ver Demonstração
                                </button>
                            </div>
                            
                            {/* Visual do Gráfico */}
                            <div className="flex-1 w-full relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 blur-3xl rounded-full"></div>
                                <div className="relative bg-[#111] border border-gray-800 rounded-2xl p-6 shadow-2xl">
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <div className="text-xs text-gray-500 uppercase font-bold">Saldo Previsto</div>
                                            <div className="text-3xl font-mono font-bold text-white">R$ 4.250,00</div>
                                        </div>
                                        <div className="p-3 bg-green-500/10 rounded-xl text-green-500"><TrendingUp size={24}/></div>
                                    </div>
                                    <div className="h-40 flex items-end gap-2">
                                        <div className="w-full bg-gray-800 rounded-t-lg h-[40%]"></div>
                                        <div className="w-full bg-gray-800 rounded-t-lg h-[60%]"></div>
                                        <div className="w-full bg-gray-800 rounded-t-lg h-[30%]"></div>
                                        <div className="w-full bg-cyan-600 rounded-t-lg h-[80%] relative shadow-[0_0_15px_rgba(8,145,178,0.5)]"></div>
                                        <div className="w-full bg-gray-800 rounded-t-lg h-[50%]"></div>
                                    </div>
                                    <div className="mt-4 flex justify-between text-xs text-gray-500 font-mono">
                                        <span>01</span><span>05</span><span>10</span><span>15</span><span>20</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- PRICING PESSOAL --- */}
            <section className="py-20 bg-[#0a0a0a] border-t border-white/5">
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <h2 className="text-3xl md:text-5xl font-black mb-4">Planos Pessoais</h2>
                    <p className="text-gray-400 mb-12">Comece organizando sua vida grátis.</p>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                        {/* START */}
                        <div className="p-8 rounded-3xl bg-[#111] border border-gray-800 flex flex-col hover:border-gray-600 transition">
                            <h3 className="text-gray-400 font-bold mb-2">Start</h3>
                            <div className="text-3xl font-black text-white mb-6">R$ 10<span className="text-sm font-normal text-gray-500">/mês</span></div>
                            <ul className="space-y-4 mb-8 flex-1">
                                <li className="flex gap-3 text-sm text-gray-300"><CheckCircle2 size={18} className="text-gray-600"/> Lançamentos Ilimitados</li>
                                <li className="flex gap-3 text-sm text-gray-300"><CheckCircle2 size={18} className="text-gray-600"/> Acesso ao Painel Completo</li>
                                <li className="flex gap-3 text-sm text-gray-500 line-through"><Zap size={18}/> Automação WhatsApp</li>
                            </ul>
                            <button onClick={onLoginClick} className="w-full py-3 rounded-xl border border-gray-700 hover:bg-gray-800 text-white font-bold transition">Escolher Start</button>
                        </div>

                        {/* PLUS */}
                        <div className="p-8 rounded-3xl bg-[#151515] border border-cyan-500/30 relative flex flex-col shadow-2xl shadow-cyan-900/10 scale-105 z-10">
                            <div className="absolute top-0 right-0 bg-cyan-600 text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl">RECOMENDADO</div>
                            <h3 className="text-cyan-500 font-bold mb-2 flex items-center gap-2"><Zap size={16}/> Plus</h3>
                            <div className="text-4xl font-black text-white mb-6">R$ 29,90<span className="text-sm font-normal text-gray-500">/mês</span></div>
                            <ul className="space-y-4 mb-8 flex-1">
                                <li className="flex gap-3 text-sm text-white"><CheckCircle2 size={18} className="text-cyan-500"/> Tudo do Start</li>
                                <li className="flex gap-3 text-sm text-white"><CheckCircle2 size={18} className="text-cyan-500"/> WhatsApp Integrado</li>
                                <li className="flex gap-3 text-sm text-white"><CheckCircle2 size={18} className="text-cyan-500"/> Leitura de Comprovantes</li>
                            </ul>
                            <button onClick={onLoginClick} className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:to-blue-500 text-white font-bold transition shadow-lg">Quero Automação</button>
                        </div>

                        {/* PRO */}
                        <div className="p-8 rounded-3xl bg-[#111] border border-purple-500/20 flex flex-col hover:border-purple-500/40 transition">
                            <h3 className="text-purple-400 font-bold mb-2">Pro</h3>
                            <div className="text-3xl font-black text-white mb-6">R$ 59,90<span className="text-sm font-normal text-gray-500">/mês</span></div>
                            <ul className="space-y-4 mb-8 flex-1">
                                <li className="flex gap-3 text-sm text-gray-300"><CheckCircle2 size={18} className="text-purple-500"/> Tudo do Plus</li>
                                <li className="flex gap-3 text-sm text-gray-300"><CheckCircle2 size={18} className="text-purple-500"/> IA Consultora (GPT-4)</li>
                                <li className="flex gap-3 text-sm text-gray-300"><CheckCircle2 size={18} className="text-purple-500"/> Múltiplos Perfis</li>
                            </ul>
                            <button onClick={onLoginClick} className="w-full py-3 rounded-xl border border-purple-900/50 hover:bg-purple-900/20 text-white font-bold transition">Escolher Pro</button>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- ÁREA PARA CONSULTORES (ID ADICIONADO) --- */}
            <section id="consultant-section" className="py-24 bg-[#08080c] relative overflow-hidden border-t border-white/5 scroll-mt-20">
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 pointer-events-none"></div>
                <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-amber-500/5 rounded-full blur-[120px] pointer-events-none"></div>

                <div className="max-w-6xl mx-auto px-6 relative z-10">
                    <div className="bg-[#111] border border-gray-800 rounded-3xl p-8 md:p-16 flex flex-col md:flex-row items-center gap-12 shadow-2xl">
                        <div className="flex-1">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/20 border border-amber-500/30 text-amber-500 text-xs font-bold uppercase tracking-wider mb-6">
                                <Briefcase size={12} /> Para Profissionais
                            </div>
                            <h2 className="text-3xl md:text-5xl font-black text-white mb-6">
                                Você é Contador ou <br/>Consultor Financeiro?
                            </h2>
                            <p className="text-gray-400 text-lg mb-8 leading-relaxed">
                                Gerencie a carteira de múltiplos clientes em um único painel. 
                                Ofereça o "Meu Aliado" como sua ferramenta oficial e tenha acesso administrativo em tempo real.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-800 rounded-lg text-amber-500"><Users size={20}/></div>
                                    <span className="text-sm font-bold text-gray-300">Gestão de Carteira</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-800 rounded-lg text-amber-500"><Lock size={20}/></div>
                                    <span className="text-sm font-bold text-gray-300">Acesso Administrativo</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-800 rounded-lg text-amber-500"><Zap size={20}/></div>
                                    <span className="text-sm font-bold text-gray-300">Automação para Clientes</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-gray-800 rounded-lg text-amber-500"><BarChart3 size={20}/></div>
                                    <span className="text-sm font-bold text-gray-300">Relatórios White-label</span>
                                </div>
                            </div>

                            <button onClick={onLoginClick} className="px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition shadow-lg shadow-amber-900/20">
                                Criar Conta de Consultor
                            </button>
                        </div>
                        
                        {/* Card Visual B2B */}
                        <div className="flex-1 w-full flex justify-center">
                            <div className="bg-[#1a1a1a] p-8 rounded-2xl border border-gray-700 w-full max-w-sm transform rotate-3 hover:rotate-0 transition duration-500 shadow-2xl">
                                <div className="flex items-center gap-4 mb-6 border-b border-gray-700 pb-4">
                                    <div className="w-12 h-12 rounded-full bg-amber-500 flex items-center justify-center font-bold text-black text-xl">VF</div>
                                    <div>
                                        <div className="font-bold text-white">Vitor Finanças</div>
                                        <div className="text-xs text-amber-500 uppercase font-bold">Consultor Agent</div>
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center bg-gray-800 p-3 rounded-xl border border-gray-700">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                            <span className="text-sm text-gray-300">Cliente A. Silva</span>
                                        </div>
                                        <span className="text-xs font-mono text-green-400">R$ 12k</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-gray-800 p-3 rounded-xl border border-gray-700">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                            <span className="text-sm text-gray-300">Padaria Central</span>
                                        </div>
                                        <span className="text-xs font-mono text-red-400">-R$ 2k</span>
                                    </div>
                                    <div className="flex justify-between items-center bg-gray-800 p-3 rounded-xl border border-gray-700">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                            <span className="text-sm text-gray-300">Família Souza</span>
                                        </div>
                                        <span className="text-xs font-mono text-blue-400">R$ 5k</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* --- FOOTER --- */}
            <footer className="py-12 border-t border-white/10 text-center text-gray-500 text-sm bg-[#050505]">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <ShieldCheck size={24} className="text-gray-600"/>
                    <span className="font-bold text-gray-300">MeuAliado</span>
                </div>
                <p>&copy; 2026 Meu Aliado Tecnologia. Todos os direitos reservados.</p>
                <div className="flex justify-center gap-6 mt-6">
                    <a href="#" className="hover:text-white transition">Termos</a>
                    <a href="#" className="hover:text-white transition">Privacidade</a>
                    <a href="#" className="hover:text-white transition">Suporte</a>
                </div>
            </footer>

        </div>
    );
}