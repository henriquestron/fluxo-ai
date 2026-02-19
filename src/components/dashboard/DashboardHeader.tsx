import React, { useState } from 'react';
import {
    ShieldCheck, Briefcase, User, UserPlus, BarChart3, FileSpreadsheet,
    Lock, HelpCircle, ChevronDown, CreditCard, Smartphone, Palette,
    LogOut, Sparkles, Plus, Search
} from 'lucide-react';
import NotificationBell from '@/components/dashboard/NotificationBell'; // Ajuste o caminho se necessário!

interface DashboardHeaderProps {
    user: any;
    userPlan: string;
    viewingAs: any;
    clients: any[];
    switchView: (client: any | null) => void;
    setIsClientModalOpen: (v: boolean) => void;
    setIsHistoryOpen: (v: boolean) => void;
    setIsExportModalOpen: (v: boolean) => void;
    openPricingModal: () => void;
    runTour: () => void;
    setIsProfileModalOpen: (v: boolean) => void;
    handleManageSubscription: () => void;
    whatsappEnabled: boolean;
    toggleWhatsappNotification: () => void;
    setIsCustomizationOpen: (v: boolean) => void;
    handleCheckout: (plan: 'START' | 'PREMIUM' | 'PRO' | 'AGENT') => void; handleLogout: () => void;
    setIsAIOpen: (v: boolean) => void;
    setIsCreditCardModalOpen: (v: boolean) => void;
    openNewTransactionModal: () => void;
}

export default function DashboardHeader({
    user, userPlan, viewingAs, clients, switchView, setIsClientModalOpen,
    setIsHistoryOpen, setIsExportModalOpen, openPricingModal, runTour,
    setIsProfileModalOpen, handleManageSubscription, whatsappEnabled, toggleWhatsappNotification,
    setIsCustomizationOpen, handleCheckout, handleLogout,
    setIsAIOpen, setIsCreditCardModalOpen, openNewTransactionModal
}: DashboardHeaderProps) {

    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    return (
        <header className="flex flex-col xl:flex-row gap-6 justify-between items-center mb-6 xl:mb-10 relative z-30">

            {/* LADO ESQUERDO: Logo + Consultor */}
            <div id="logo-area" className="w-full xl:w-auto text-center md:text-left flex flex-col items-center xl:items-start">
                <h1 className="text-4xl font-extrabold text-white flex items-center justify-center md:justify-start gap-2 tracking-tighter">
                    <ShieldCheck className="text-cyan-500" size={32} />
                    Meu<span className="text-cyan-500">Aliado.</span>
                </h1>

                <div id="menu-clientes" className="w-full mt-2 flex justify-center xl:justify-start">
                    {(userPlan === 'agent' || userPlan === 'admin') && (
                        <div id="agent-bar" className="w-full max-w-md xl:max-w-none bg-purple-950/20 border border-purple-500/20 rounded-lg p-1.5 overflow-x-auto scrollbar-hide backdrop-blur-sm">
                            <div className="flex items-center gap-3 px-1 min-w-max">
                                <div className="flex items-center gap-1.5 text-purple-400 font-bold uppercase text-[10px] tracking-wider whitespace-nowrap">
                                    <Briefcase size={14} /> Painel
                                </div>
                                <div className="h-4 w-px bg-purple-500/20"></div>
                                <div id="client-selector" className="flex items-center gap-2">
                                    <button onClick={() => switchView(null)} className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition whitespace-nowrap ${!viewingAs ? 'bg-purple-600 text-white shadow-md' : 'text-purple-300 hover:bg-purple-500/10'}`}>
                                        <User size={12} /> Carteira
                                    </button>
                                    {clients.map(client => (
                                        <button key={client.id} onClick={() => switchView(client)} className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs transition whitespace-nowrap ${viewingAs?.id === client.id ? 'bg-purple-600 text-white shadow-md' : 'text-purple-300 hover:bg-purple-500/10'}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${client.client_id ? 'bg-emerald-400' : 'bg-orange-500'}`}></div>
                                            {client.client_email.split('@')[0]}
                                        </button>
                                    ))}
                                </div>
                                <button id="btn-add-client" onClick={() => setIsClientModalOpen(true)} className="ml-auto flex items-center gap-1 text-[10px] bg-purple-600/20 hover:bg-purple-600 text-purple-300 hover:text-white px-2 py-1 rounded border border-purple-500/30 transition whitespace-nowrap">
                                    <UserPlus size={10} /> Add
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* LADO DIREITO: Ações */}
            <div className="flex flex-col xl:flex-row gap-3 w-full xl:w-auto">

                {/* GRUPO 1: Utilitários e Menu */}
                <div className="flex items-center justify-between xl:justify-start gap-2 w-full xl:w-auto order-1 xl:order-none">
                    <div className="flex items-center gap-2 bg-gray-900/50 p-1 rounded-xl border border-gray-800">
                        <button id="btn-history" onClick={() => setIsHistoryOpen(true)} className="h-10 w-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-gray-800 transition" title="Ver Gráfico Anual">
                            <BarChart3 size={20} />
                        </button>
                        <button id="btn-export" onClick={() => { if (userPlan === 'free') { openPricingModal(); return; } setIsExportModalOpen(true); }} className={`h-10 w-10 flex items-center justify-center rounded-lg transition relative ${userPlan === 'free' ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-emerald-400 hover:bg-gray-800'}`}>
                            <FileSpreadsheet size={20} />
                            {userPlan === 'free' && <Lock size={10} className="absolute top-2 right-2 text-amber-500" />}
                        </button>
                        <button onClick={runTour} className="h-10 w-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition">
                            <HelpCircle size={20} />
                        </button>
                    </div>

                    <div className="hidden xl:block w-px h-8 bg-gray-800 mx-1"></div>

                    <div className="flex items-center gap-2 pl-0 xl:pl-2 xl:border-none">
                        {/* Importante: NotificationBell precisa existir no projeto */}
                        <NotificationBell userId={user.id} />

                        {/* MENU DO USUÁRIO (DROPDOWN) */}
                        <div id="btn-menu" className="relative z-50">
                            <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className={`h-11 px-3 xl:px-4 bg-gray-900 border border-gray-800 rounded-xl hover:bg-gray-800 flex items-center justify-center gap-2 transition ${isUserMenuOpen ? 'ring-2 ring-cyan-500/50 border-cyan-500/50' : ''}`}>
                                {user.user_metadata?.avatar_url
                                    ? (<img src={user.user_metadata.avatar_url} className="w-6 h-6 rounded-full object-cover ring-2 ring-gray-700" alt="Avatar" />)
                                    : (<div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-gray-300"><User size={14} /></div>)
                                }
                                <span className="hidden md:inline text-gray-400 text-sm font-medium">Menu</span>
                                <ChevronDown size={14} className="text-gray-500 hidden md:block" />
                            </button>

                            {isUserMenuOpen && (
                                <>
                                    <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
                                    <div className="absolute top-full right-0 mt-2 w-64 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="bg-[#0f0f0f] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10">
                                            <div className="p-4 border-b border-gray-800 bg-gray-900/50">
                                                <div className="flex items-center gap-3">
                                                    {user.user_metadata?.avatar_url
                                                        ? (<img src={user.user_metadata.avatar_url} className="w-10 h-10 rounded-full border border-gray-700" />)
                                                        : (<div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center border border-gray-700"><User size={20} className="text-gray-400" /></div>)
                                                    }
                                                    <div className="overflow-hidden">
                                                        <p className="text-white text-sm font-bold truncate">{user.user_metadata?.full_name || "Usuário"}</p>
                                                        <p className="text-gray-500 text-xs truncate">{user.email}</p>
                                                    </div>
                                                </div>
                                                <div className="mt-3 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-[10px] font-medium text-gray-300 uppercase tracking-wide">
                                                    {userPlan === 'agent' ? 'Consultor' : `Plano ${userPlan}`}
                                                </div>
                                            </div>
                                            <div className="p-2 space-y-1">
                                                <button onClick={() => { setIsUserMenuOpen(false); setIsProfileModalOpen(true); }} className="w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-3 text-gray-300 hover:bg-gray-800 hover:text-white transition"><User size={16} className="text-cyan-500" /> Meu Perfil</button>
                                                {userPlan !== 'free' && (<button onClick={() => { setIsUserMenuOpen(false); handleManageSubscription(); }} className="w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-3 text-gray-300 hover:bg-gray-800 hover:text-white transition"><CreditCard size={16} className="text-emerald-500" /> Assinatura</button>)}
                                                <div className="px-3 py-2.5 flex items-center justify-between group cursor-pointer hover:bg-gray-800 rounded-lg transition" onClick={(e) => { e.stopPropagation(); toggleWhatsappNotification(); }}>
                                                    <div className="flex items-center gap-3 text-sm text-gray-300 group-hover:text-white"><Smartphone size={16} className="text-emerald-500" /> Notificações Zap {(userPlan !== 'pro' && userPlan !== 'agent' && userPlan !== 'admin') && <Lock size={12} className="text-amber-500" />}</div>
                                                    <div className={`w-9 h-5 rounded-full transition-colors relative ${whatsappEnabled ? 'bg-emerald-600' : 'bg-gray-700'}`}><div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform ${whatsappEnabled ? 'translate-x-4' : 'translate-x-0'}`}></div></div>
                                                </div>
                                                {(userPlan === 'pro' || userPlan === 'agent') && (<button onClick={() => { setIsUserMenuOpen(false); setIsCustomizationOpen(true); }} className="w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-3 text-gray-300 hover:bg-gray-800 hover:text-white transition"><Palette size={16} className="text-purple-500" /> Tema e Cores</button>)}
                                                {userPlan !== 'agent' && (<button onClick={() => { setIsUserMenuOpen(false); handleCheckout('AGENT'); }} className="w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-3 text-gray-300 hover:bg-gray-800 hover:text-white transition"><Briefcase size={16} className="text-amber-500" /> Virar Consultor</button>)}
                                                <div className="h-px bg-gray-800 my-1 mx-2"></div>
                                                <button onClick={handleLogout} className="w-full text-left px-3 py-2.5 rounded-lg text-sm flex items-center gap-3 text-red-400 hover:bg-red-950/30 transition font-medium"><LogOut size={16} /> Sair da Conta</button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {/* GRUPO 2: Ações Principais (IA, Fatura, Novo) */}
                <div className="grid grid-cols-2 sm:grid-cols-3 xl:flex gap-2 xl:gap-3 w-full xl:w-auto order-2 xl:order-none">
                    <button id="btn-ai" onClick={() => setIsAIOpen(true)} className={`h-11 px-3 xl:px-5 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm shadow-lg border border-white/5 whitespace-nowrap ${['premium', 'pro', 'agent', 'admin'].includes(userPlan) ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:brightness-110' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}>
                        <Sparkles size={16} className={['premium', 'pro', 'agent', 'admin'].includes(userPlan) ? "text-cyan-200 fill-cyan-200" : ""} />
                        {['premium', 'pro', 'agent', 'admin'].includes(userPlan) ? 'Aliado IA' : 'IA Lite'}
                    </button>

                    <button id="btn-fatura" onClick={() => { if (userPlan === 'free' || userPlan === 'start') { openPricingModal(); return; } setIsCreditCardModalOpen(true); }} className={`h-11 px-3 xl:px-5 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm shadow-lg border border-white/5 whitespace-nowrap ${(userPlan === 'free' || userPlan === 'start') ? 'bg-gray-800 text-gray-500 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}>
                        <CreditCard size={16} /> Fatura
                        {(userPlan === 'free' || userPlan === 'start') && <Lock size={12} className="text-gray-500" />}
                    </button>

                    <button id="btn-novo" onClick={openNewTransactionModal} className="h-11 col-span-2 sm:col-span-1 bg-white text-black px-4 xl:px-6 rounded-xl font-bold hover:bg-gray-100 transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.15)] text-sm active:scale-95 whitespace-nowrap">
                        <Plus size={18} strokeWidth={3} /> Novo
                    </button>
                </div>
            </div>
        </header>
    );
}