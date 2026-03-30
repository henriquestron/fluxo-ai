import React, { useState } from 'react';
import {
    ShieldCheck, Briefcase, User, UserPlus, BarChart3, FileSpreadsheet,
    Lock, HelpCircle, ChevronDown, CreditCard, Smartphone, Palette,
    LogOut, Sparkles, Plus, Calculator, Trash2, FileUp,
    FileSignature, FileText, Calendar, Wrench, Eye
} from 'lucide-react';
import NotificationBell from '@/components/dashboard/NotificationBell';

interface ConsultantHeaderProps {
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
    handleCheckout: (plan: 'START' | 'PREMIUM' | 'PRO' | 'AGENT') => void;
    handleLogout: () => void;
    setIsAIOpen: (v: boolean) => void;
    setIsCreditCardModalOpen: (v: boolean) => void;
    openNewTransactionModal: () => void;
    setIsCalculatorOpen: (isOpen: boolean) => void;
    handleRemoveClient: (client: any) => void;
    setIsTutorialOpen: (v: boolean) => void;
    setIsContractOpen: (v: boolean) => void;
    handleClientContractUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isManagedClient: boolean;
    clientContractUrl?: string;
    clientStatus?: string;
    onOpenContract: () => void;
    onOpenReport: () => void;
    client: any;
    setIsImportOpen: (v: boolean) => void;
    setIsAgendaOpen: (v: boolean) => void;
}

export default function ConsultantHeader({
    user, userPlan, viewingAs, clients, switchView, setIsClientModalOpen,
    setIsHistoryOpen, setIsExportModalOpen, openPricingModal, runTour,
    setIsProfileModalOpen, handleManageSubscription, whatsappEnabled, toggleWhatsappNotification,
    setIsCustomizationOpen, handleCheckout, handleLogout,
    setIsAIOpen, setIsCreditCardModalOpen, openNewTransactionModal, setIsCalculatorOpen, handleRemoveClient, client,
    setIsImportOpen, setIsTutorialOpen, setIsContractOpen, handleClientContractUpload, isManagedClient, clientContractUrl, clientStatus, onOpenContract, onOpenReport, setIsAgendaOpen
}: ConsultantHeaderProps) {

    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
    const [isToolsOpen, setIsToolsOpen] = useState(false);

    // 🟢 Menu de Perfil isolado para ser reaproveitado no Mobile e no PC sem duplicar código
    const renderProfileDropdown = () => (
        <>
            <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>
            <div className="absolute top-full right-0 mt-2 w-64 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="bg-[#0f0f0f] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10">
                    <div className="p-4 border-b border-gray-800 bg-gray-900/50">
                        <p className="text-white text-sm font-bold truncate">{user.user_metadata?.full_name || "Consultor"}</p>
                        <p className="text-gray-500 text-xs truncate">{user.email}</p>
                    </div>
                    <div className="p-2 space-y-1">
                        {userPlan === 'admin' && (<button onClick={() => { setIsUserMenuOpen(false); window.location.href = '/api/admin'; }} className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 transition">👨‍💼 Painel CEO</button>)}
                        <button onClick={() => { setIsUserMenuOpen(false); setIsProfileModalOpen(true); }} className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 transition flex gap-3"><User size={16} className="text-cyan-500"/> Perfil e IA</button>
                        <button onClick={() => { setIsUserMenuOpen(false); handleManageSubscription(); }} className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 transition flex gap-3"><CreditCard size={16} className="text-emerald-500"/> Assinatura</button>
                        <button onClick={() => { setIsUserMenuOpen(false); setIsCustomizationOpen(true); }} className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 transition flex gap-3"><Palette size={16} className="text-purple-500"/> Cores do Site</button>
                        <button onClick={handleLogout} className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-950/30 transition flex gap-3 mt-2 border-t border-gray-800"><LogOut size={16}/> Sair</button>
                    </div>
                </div>
            </div>
        </>
    );

    return (
        <header className="flex flex-col gap-4 mb-8 relative z-30">
            
            {/* ========================================================= */}
            {/* CAMADA 1: NAVEGAÇÃO GLOBAL (Sistema, Perfil, Ações Rápidas) */}
            {/* ========================================================= */}
            <div className="flex flex-col xl:flex-row justify-between gap-4 bg-[#0a0a0a]/50 p-3 rounded-2xl border border-gray-800/60 backdrop-blur-md">
                
                {/* 🟢 LINHA 1 (Mobile): Logo na esquerda, Perfil na direita */}
                <div className="flex items-center justify-between w-full xl:w-auto gap-6">
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2 tracking-tighter shrink-0">
                        <ShieldCheck className="text-cyan-500" size={28} /> Meu<span className="text-cyan-500">Aliado.</span>
                    </h1>

                    {/* SINO E MENU: Aparecem aqui apenas no Mobile */}
                    <div className="flex xl:hidden items-center gap-2">
                        <NotificationBell userId={user.id} />
                        <div className="relative z-50">
                            <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="h-10 px-2 bg-gray-900 border border-gray-800 rounded-lg hover:bg-gray-800 flex items-center gap-2 transition shadow-lg">
                                {user.user_metadata?.avatar_url ? (<img src={user.user_metadata.avatar_url} className="w-6 h-6 rounded-full object-cover" alt="Avatar" />) : (<div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center"><User size={12} /></div>)}
                            </button>
                            {isUserMenuOpen && renderProfileDropdown()}
                        </div>
                    </div>
                </div>

                {/* 🟢 LINHA 2 (Mobile): Botões de Ação (Abaixo da logo no celular, ou do lado direito no PC) */}
                <div className="flex flex-wrap sm:flex-nowrap items-center w-full xl:w-auto gap-2 sm:gap-3">
                    
                    {/* Botão Ferramentas */}
                    <div className="relative flex-1 sm:flex-none">
                        <button onClick={() => setIsToolsOpen(!isToolsOpen)} className="w-full h-10 px-3 flex items-center justify-center gap-2 bg-gray-900 border border-gray-800 rounded-lg text-gray-300 hover:text-white transition">
                            <Wrench size={16} className="text-gray-400" />
                            <span className="font-medium text-xs">Ferramentas</span>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${isToolsOpen ? 'rotate-180' : ''}`} />
                        </button>
                        {isToolsOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsToolsOpen(false)}></div>
                                <div className="absolute top-full left-0 mt-2 w-56 bg-[#0f0f0f] border border-gray-800 rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/10 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="p-2 space-y-1">
                                        <button onClick={() => { setIsToolsOpen(false); setIsHistoryOpen(true); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 transition"><BarChart3 size={16} className="text-cyan-500"/> Histórico</button>
                                        <button onClick={() => { setIsToolsOpen(false); setIsCalculatorOpen(true); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 transition"><Calculator size={16} className="text-amber-500"/> Calculadora</button>
                                        <button onClick={() => { setIsToolsOpen(false); setIsImportOpen(true); }} className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 transition"><div className="flex items-center gap-3"><FileUp size={16} className="text-emerald-500"/> Importar</div><span className="bg-emerald-500 text-black text-[9px] px-1.5 rounded font-black uppercase">Beta</span></button>
                                        <button onClick={() => { setIsToolsOpen(false); setIsExportModalOpen(true); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 transition"><FileSpreadsheet size={16} className="text-green-500"/> Exportar Excel</button>
                                        <div className="h-px bg-gray-800 my-1 mx-2"></div>
                                        <button onClick={() => { setIsToolsOpen(false); setIsTutorialOpen(true); }} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-300 hover:bg-gray-800 transition"><HelpCircle size={16} className="text-purple-500"/> Tutoriais</button>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>

                    {/* Botões IA e Novo */}
                    <button onClick={() => setIsAIOpen(true)} className="h-10 flex-1 sm:flex-none px-4 rounded-lg font-bold transition flex items-center justify-center gap-2 text-xs bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:brightness-110 shadow-lg whitespace-nowrap">
                        <Sparkles size={14} className="text-cyan-200 fill-cyan-200" /> <span className="hidden sm:inline">IA Aliado</span><span className="sm:hidden">IA</span>
                    </button>
                    
                    <button onClick={openNewTransactionModal} className="h-10 flex-1 sm:flex-none px-4 rounded-lg font-bold transition flex items-center justify-center gap-2 text-xs bg-white text-black hover:bg-gray-200 shadow-[0_0_15px_rgba(255,255,255,0.2)] whitespace-nowrap">
                        <Plus size={16} strokeWidth={3} /> Novo
                    </button>

                    {/* SINO E MENU: Aparecem aqui apenas no Computador (Desktop) */}
                    <div className="hidden xl:flex items-center gap-2 pl-3 border-l border-gray-800 ml-1">
                        <NotificationBell userId={user.id} />
                        <div className="relative z-50">
                            <button onClick={() => setIsUserMenuOpen(!isUserMenuOpen)} className="h-10 px-3 bg-gray-900 border border-gray-800 rounded-lg hover:bg-gray-800 flex items-center gap-2 transition">
                                {user.user_metadata?.avatar_url ? (<img src={user.user_metadata.avatar_url} className="w-6 h-6 rounded-full object-cover" alt="Avatar" />) : (<div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center"><User size={12} /></div>)}
                                <ChevronDown size={14} className="text-gray-500" />
                            </button>
                            {isUserMenuOpen && renderProfileDropdown()}
                        </div>
                    </div>

                </div>
            </div>

            {/* ========================================================= */}
            {/* CAMADA 2: BARRA DO CONSULTOR (Mini-CRM Integrado) */}
            {/* ========================================================= */}
            <div className="bg-purple-950/20 border border-purple-500/30 rounded-2xl p-2 sm:p-3 flex flex-col xl:flex-row items-center justify-between gap-4 shadow-lg shadow-purple-900/10">
                
                {/* Seletor de Clientes */}
                <div className="w-full xl:w-auto flex items-center overflow-x-auto scrollbar-hide gap-2">
                    <div className="flex items-center gap-1.5 text-purple-400 font-black uppercase text-[10px] tracking-widest shrink-0 mr-2 bg-purple-900/30 px-2 py-1 rounded-md">
                        <Briefcase size={14} /> CRM
                    </div>
                    
                    <button onClick={() => switchView(null)} className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${!viewingAs ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                        <User size={14} /> Minha Conta
                    </button>
                    
                    {clients.map(c => (
                        <button key={c.id} onClick={() => switchView(c)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition shrink-0 ${viewingAs?.id === c.id ? 'bg-purple-600 text-white shadow-md' : 'bg-gray-900 border border-gray-800 text-gray-400 hover:bg-gray-800 hover:text-white'}`}>
                            <div className={`w-2 h-2 rounded-full ${c.client_id ? 'bg-emerald-400 shadow-[0_0_8px_#34d399]' : 'bg-orange-500'}`}></div>
                            {c.client_email.split('@')[0]}
                        </button>
                    ))}
                    
                    <button onClick={() => setIsClientModalOpen(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30 hover:bg-purple-500/20 transition shrink-0">
                        <UserPlus size={14} /> Adicionar
                    </button>
                </div>

                {/* Ações Específicas do Consultor */}
                <div className="w-full xl:w-auto flex flex-wrap sm:flex-nowrap items-center gap-2 justify-start sm:justify-end shrink-0 border-t xl:border-t-0 border-purple-500/20 pt-3 xl:pt-0 overflow-x-auto scrollbar-hide pb-1 xl:pb-0">
                    
                    <button onClick={() => setIsAgendaOpen(true)} className="h-10 px-4 flex items-center gap-2 bg-[#111] border border-gray-700 text-gray-300 hover:bg-white hover:text-black hover:border-white rounded-xl transition text-xs font-bold shadow-sm shrink-0">
                        <Calendar size={16} /> <span>Minha Agenda</span>
                    </button>

                    {viewingAs && (
                        <>
                            <button onClick={onOpenContract} className="h-10 px-4 flex items-center gap-2 bg-cyan-900/30 border border-cyan-500/40 text-cyan-400 hover:bg-cyan-600 hover:text-white rounded-xl transition text-xs font-bold shrink-0">
                                <FileSignature size={16} /> <span className="hidden sm:inline">Gerar Contrato</span><span className="sm:hidden">Contrato</span>
                            </button>
                            
                            <button onClick={onOpenReport} className="h-10 px-4 flex items-center gap-2 bg-indigo-900/30 border border-indigo-500/40 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded-xl transition text-xs font-bold shrink-0">
                                <FileText size={16} /> <span className="hidden sm:inline">Relatório IA</span><span className="sm:hidden">Relatório</span>
                            </button>

                            {viewingAs?.contract_url && (
                                <a href={viewingAs.contract_url} target="_blank" className="h-10 w-10 shrink-0 flex items-center justify-center bg-emerald-900/30 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-xl transition" title="Ver Contrato Assinado">
                                    <FileSignature size={16} />
                                </a>
                            )}
                            <button onClick={() => handleRemoveClient(viewingAs)} className="h-10 w-10 shrink-0 flex items-center justify-center bg-red-900/10 border border-red-900/30 text-red-500 hover:bg-red-600 hover:text-white rounded-xl transition ml-1" title="Remover Vínculo do Cliente">
                                <Trash2 size={16}/>
                            </button>
                        </>
                    )}
                </div>
            </div>
        </header>
    );
}