'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
    CreditCard, TrendingDown, DollarSign, Plus, X, List, LayoutGrid, Sparkles, Send,
    Trash2, AlertCircle, CheckCircle2, Pencil, Clock, AlertTriangle, Check, LogIn,
    LogOut, User, Eye, EyeOff, CheckSquare, Square, ArrowRight, Crown, ShieldCheck, Edit2, Calendar,
    Mail, Loader2, Lock, BarChart3, Search, Target, Upload, FileText, ExternalLink,
    Users, ChevronDown, UserPlus, Briefcase, HelpCircle, Star, Zap, Shield, Palette,
    Layout, MousePointerClick, FolderPlus, Layers, FileSpreadsheet, Wallet, Landmark, Rocket, Paperclip, ChevronRight, ChevronLeft,
    ShoppingCart, Home, Car, Utensils, GraduationCap, HeartPulse, Plane, Gamepad2, Smartphone, Calculator, FileUp
}
    from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { supabase } from '@/supabase';
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import TimelineView from '@/components/dashboard/TimelineView';
import BentoView from '@/components/dashboard/BentoView';
import { Toaster, toast } from 'sonner';
import ProfileModal from '@/components/dashboard/ProfileModal';
import ExportModal from '@/components/dashboard/ExportModal';
import CreditCardModal from '@/components/dashboard/CreditCardModal';
import HistoryModal from '@/components/dashboard/HistoryModal';
import NotificationBell from '@/components/dashboard/NotificationBell';
import LandingPage from '@/components/LandingPage';
import { MONTHS, STRIPE_PRICES, ACCOUNTS, ICON_MAP } from '@/utils/constants';
import PricingModal from '@/components/dashboard/PricingModal';
import TransactionForm from '@/components/dashboard/TransactionForm';
import AiAssistantModal from '@/components/dashboard/AiAssistantModal';
import AuthModals from '@/components/auth/AuthModals';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import GoalsView from '@/components/dashboard/GoalsView';
import TabNavigation from '@/components/dashboard/TabNavigation';
import YearSelector from '@/components/dashboard/YearSelector';
import CalculatorModal from '@/components/dashboard/CalculatorModal';
import OnboardingTutorial from '@/components/dashboard/OnboardingTutorial';
import ImportModal from '@/components/dashboard/ImportModal';
import StandardView from '@/components/dashboard/StandardView';
import TraderView from '@/components/dashboard/TraderView';
import CustomizationModal from '@/components/dashboard/CustomizationModal';
import ZenView from '@/components/dashboard/ZenView';
import CalendarView from '@/components/dashboard/CalendarView';
import GoalModal from '@/components/dashboard/GoalModal';

import { Transaction, Installment, Recurring, Goal, ClientUser } from '@/types';



export default function FinancialDashboard() {
    const currentSystemMonthIndex = new Date().getMonth();
    const currentSystemMonthName = MONTHS[currentSystemMonthIndex];

    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');

    // --- ESTADOS GLOBAIS ---
    const [activeTab, setActiveTab] = useState(currentSystemMonthName);
    const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
    const [currentLayout, setCurrentLayout] = useState<'standard' | 'trader' | 'zen' | 'calendar' | 'timeline' | 'bento'>('standard');
    const [currentTheme, setCurrentTheme] = useState('default');
    const [activeSection, setActiveSection] = useState<'dashboard' | 'goals'>('dashboard');
    // --- WORKSPACES (PERFIS DE DADOS) ---
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [currentWorkspace, setCurrentWorkspace] = useState<any>(null);
    const [newWorkspaceName, setNewWorkspaceName] = useState('');
    const [isNewProfileModalOpen, setIsNewProfileModalOpen] = useState(false);
    const [isDeleteWorkspaceModalOpen, setIsDeleteWorkspaceModalOpen] = useState(false);
    const [isDeletingWorkspace, setIsDeletingWorkspace] = useState(false);
    const [isSavingWorkspace, setIsSavingWorkspace] = useState(false);
    const [standbyModal, setStandbyModal] = useState<{ isOpen: boolean, item: any, origin: string, isRestore: boolean } | null>(null);

    const [newProfileName, setNewProfileName] = useState('');
    // Adicione junto com os outros states (ex: perto de const [isAiLoading, setIsAiLoading] = useState(false);)
    const [isSimulationMode, setIsSimulationMode] = useState(false);
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isTutorialOpen, setIsTutorialOpen] = useState(false);
    // --- MODAIS ---
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isCreditCardModalOpen, setIsCreditCardModalOpen] = useState(false); // <--- ESTADO NOVO AQUI
    const [isAIOpen, setIsAIOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isPricingOpen, setIsPricingOpen] = useState(false);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [isRolloverModalOpen, setIsRolloverModalOpen] = useState(false);
    const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [goals, setGoals] = useState<Goal[]>([]);
    const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [isSessionLoading, setIsSessionLoading] = useState(true);
    const [whatsappEnabled, setWhatsappEnabled] = useState(false);
    const [addCounter, setAddCounter] = useState(0);
    const [isNudgeOpen, setIsNudgeOpen] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState<any[]>([]);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [isTermsOpen, setIsTermsOpen] = useState(false);
    const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

    // --- AUTH & USER DATA ---
    const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
    const [showEmailCheck, setShowEmailCheck] = useState(false);
    const [user, setUser] = useState<any>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loadingAuth, setLoadingAuth] = useState(false);
    const [authMessage, setAuthMessage] = useState('');
    const [userPlan, setUserPlan] = useState<string>('free');
    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

    // --- DADOS FINANCEIROS ---
    const [transactions, setTransactions] = useState<any[]>([]);
    const [installments, setInstallments] = useState<any[]>([]);
    const [recurring, setRecurring] = useState<any[]>([]);
    const [pastDueItems, setPastDueItems] = useState<any[]>([]);

    // --- B2B ---
    const [clients, setClients] = useState<any[]>([]);
    const [viewingAs, setViewingAs] = useState<any>(null);
    const [newClientEmail, setNewClientEmail] = useState('');
    const [addingClient, setAddingClient] = useState(false);

    const [formMode, setFormMode] = useState<'income' | 'expense' | 'installment' | 'fixed_expense'>('income');
    const [editingId, setEditingId] = useState<number | null>(null);
    const diaDeHoje = String(new Date().getDate()).padStart(2, '0');

    const initialFormState = {
        title: '',
        amount: '',
        installments: '',
        dueDay: '',
        day: diaDeHoje,
        category: 'Outros',
        targetMonth: 'Jan',
        isFixedIncome: false,
        fixedMonthlyValue: '',
        receiptUrl: '',
        icon: '',
        paymentMethod: ''
    };
    const [formData, setFormData] = useState(initialFormState);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [aiResponse, setAiResponse] = useState<any>('');
    const [isLoading, setIsLoading] = useState(false);

    const getThemeClasses = () => {
        switch (currentTheme) {
            case 'cyberpunk': return 'bg-[#020014] text-pink-50 selection:bg-pink-500 selection:text-white';
            case 'dracula': return 'bg-[#282a36] text-purple-100 selection:bg-purple-500 selection:text-white';
            case 'nubank': return 'bg-[#26004d] text-gray-100 selection:bg-white selection:text-purple-700';
            case 'forest': return 'bg-[#061a0c] text-emerald-100 selection:bg-emerald-700 selection:text-white';
            case 'midnight': return 'bg-[#0f172a] text-white';
            default: return 'bg-[#050505] text-gray-100 selection:bg-cyan-500 selection:text-black';
        }
    };


    const runTour = () => {
        // Verifica se a biblioteca driver.js foi carregada
        const driverLib = (window as any).driver?.js?.driver;
        if (!driverLib) return;

        // --- 1. DEFINIÇÃO DOS PASSOS ---
        const agentSteps = [
            {
                element: '#agent-bar',
                popover: {
                    title: '🕵️ Central do Consultor',
                    description: 'Esta é sua central de controle. Aqui você gerencia sua carteira, alterna entre clientes e acompanha toda a operação em tempo real.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#client-selector',
                popover: {
                    title: '📂 Gestão de Carteira',
                    description: 'Selecione aqui o cliente que deseja analisar. Ao trocar, todos os dados do sistema são atualizados automaticamente para aquela conta.',
                    side: "bottom",
                    align: 'start'
                }
            },
            {
                element: '#btn-add-client',
                popover: {
                    title: '➕ Adicionar Novo Cliente',
                    description: 'Cadastre um novo cliente na sua carteira para começar a organizar finanças, acompanhar indicadores e gerar relatórios personalizados.',
                    side: "left",
                    align: 'start'
                }
            }
        ];

        const commonSteps = [
            {
                element: '#logo-area',
                popover: {
                    title: '🛡️ Bem-vindo ao Meu Aliado',
                    description: 'Eu vou te guiar para que você tenha controle total das suas finanças — com clareza, estratégia e visão de crescimento.'
                }
            },

            // Ações Principais
            {
                element: '#btn-novo',
                popover: {
                    title: '🚀 Novo Lançamento',
                    description: 'Aqui você registra Ganhos, Despesas ou Parcelamentos. Tudo começa por este botão.',
                    side: "bottom"
                }
            },
            {
                element: '#btn-ai',
                popover: {
                    title: '🧠 Inteligência Financeira',
                    description: 'Converse com o Aliado para lançar gastos por texto, tirar dúvidas ou receber orientações estratégicas.',
                    side: "bottom"
                }
            },
            {
                element: '#btn-fatura',
                popover: {
                    title: '💳 Gestão de Fatura',
                    description: 'Faça lançamentos em lote para organizar sua fatura mensal de forma rápida e eficiente.',
                    side: "bottom"
                }
            },

            // Ferramentas
            {
                element: '#btn-history',
                popover: {
                    title: '📅 Histórico e Evolução',
                    description: 'Acompanhe sua performance financeira mês a mês através de gráficos claros e comparativos.',
                    side: "bottom"
                }
            },
            {
                element: '#btn-export',
                popover: {
                    title: '📊 Exportar Relatórios',
                    description: 'Baixe seus dados em Excel para análises mais detalhadas ou envio para contadores e parceiros.',
                    side: "bottom"
                }
            },

            // Dashboard
            {
                element: '#card-saldo',
                popover: {
                    title: '💰 Seu Termômetro Financeiro',
                    description: 'Aqui você vê seu saldo atual. Verde indica resultado positivo. Vermelho sinaliza atenção e necessidade de ajuste.',
                    side: "top"
                }
            },

            // Menu
            {
                element: '#btn-notifications',
                popover: {
                    title: '🔔 Central de Alertas',
                    description: 'Receba avisos importantes como contas próximas do vencimento e atualizações do sistema.',
                }
            },
            {
                element: '#btn-menu',
                popover: {
                    title: '👤 Perfil e Configurações',
                    description: 'Gerencie sua assinatura, personalize o tema e ajuste preferências do sistema.',
                    side: "left"
                }
            }
        ];



    // --- 2. LÓGICA DE MONTAGEM ---
    let finalSteps = (userPlan === 'agent') ? [...agentSteps, ...commonSteps] : commonSteps;

    finalSteps = finalSteps.filter(step => document.querySelector(step.element));

    // --- 3. EXECUÇÃO ---
    const driverObj = driverLib({
        showProgress: true,
        animate: true,
        allowClose: true,
        overlayClickNext: false,
        keyboardControl: true,
        nextBtnText: 'Próximo →',
        prevBtnText: '← Voltar',
        doneBtnText: 'Concluir 🚀',
        steps: finalSteps,
    });

        driverObj.drive();
    };

    useEffect(() => {
        // Só roda se tiver USUÁRIO logado. Se for Landing Page (!user), ignora.
        if (user) {
            // Lógica para o Consultor (Agent)
            if (userPlan === 'agent' && (window as any).driver) {
                const hasSeenTour = localStorage.getItem('has_seen_agent_tour_v1');
                if (!hasSeenTour) {
                    setTimeout(() => { runTour(); localStorage.setItem('has_seen_agent_tour_v1', 'true'); }, 1500);
                }
            }
            // Lógica para usuários normais (Start, Free, Pro)
            else {
                const hasSeenTour = localStorage.getItem('hasSeenTour_v3');
                if (!hasSeenTour) {
                    setTimeout(() => { runTour(); localStorage.setItem('hasSeenTour_v3', 'true'); }, 1500);
                }
            }
        }
    }, [userPlan, transactions, user]);

    useEffect(() => {
        // 1. Procura se tem intenção de compra
        const intentPlan = localStorage.getItem('intent_plan');

        if (intentPlan) {
            console.log(`Intenção detectada: ${intentPlan}`);

            if (intentPlan === 'agent') {
                // O cara quer ser consultor! 
                // Aqui você pode abrir um modal específico de B2B ou já jogar ele pro Checkout do Agent
                setIsPricingOpen(true);

            } else {
                // O cara quer um plano pago (start, premium, pro)
                // Abre o modal de preços ou já abre o link do Stripe direto!
                setIsPricingOpen(true);
            }

            // 2. RASGA O POST-IT! (Crucial para não abrir o modal de novo se ele der F5 na página)
            localStorage.removeItem('intent_plan');
        } else {
            // Se NÃO tem post-it, é um usuário normal que só clicou em "Acessar"
            // Aqui você pode deixar rodar o tutorial gratuito normalmente
        }
    }, []);

    const getReceiptForMonth = (item: any, month: string) => {
        const tag = `${month}/${selectedYear}`;

        // 1. Tenta pegar pela Tag Mês/Ano exata (Ex: Mar/2026)
        if (item.receipts && item.receipts[tag]) {
            return item.receipts[tag];
        }

        // 2. Tenta pegar pela Tag Mês Antiga (Legado)
        if (item.receipts && item.receipts[month]) {
            return item.receipts[month];
        }

        // 3. 🟢 TRAVA CONTRA VAZAMENTO DE COMPROVANTES:
        // O Fallback 'livre' só pode ser usado para Despesas Avulsas (que têm o campo 'date').
        // Contas Fixas e Parcelas (que usam 'due_day') são bloqueadas aqui para não vazar a imagem pro próximo mês.
        if (item.date && item.receipt_url) {
            return item.receipt_url;
        }

        return null;
    };

    useEffect(() => {
        const checkUser = async () => {
            try {
                const hash = window.location.hash;
                if (hash && hash.includes('type=recovery')) {
                    setIsChangePasswordOpen(true);
                }
                const { data, error } = await supabase.auth.getSession();
                if (error) { await supabase.auth.signOut(); setUser(null); return; }
                const currentUser = data.session?.user || null;

                setUser(currentUser);
                if (currentUser) {
                    fetchUserProfile(currentUser.id);
                    fetchWorkspaces(currentUser.id);
                    fetchUserSettings(currentUser.id);
                }
            } catch (e) { setUser(null); }
            finally {
                // 👇 O SEGREDO: Avisa que terminou de carregar
                setIsSessionLoading(false);
            }
        };
        checkUser();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            if (event === 'PASSWORD_RECOVERY') { setIsChangePasswordOpen(true); }
            else if (event === 'SIGNED_OUT' || (event as string) === 'USER_DELETED') {
                setUser(null); setTransactions([]); setInstallments([]); setRecurring([]); setWorkspaces([]); setCurrentWorkspace(null);
            }
            else if (session?.user) {
                setUser(session.user);
                fetchUserProfile(session.user.id);
                fetchWorkspaces(session.user.id);
            }
        });
        return () => subscription.unsubscribe();
    }, []);

    const fetchWorkspaces = async (userId: string, forceSelectFirst = false) => {
        const { data } = await supabase.from('workspaces').select('*').eq('user_id', userId).order('created_at', { ascending: true });
        if (data && data.length > 0) {
            setWorkspaces(data);
            if (forceSelectFirst || !currentWorkspace) {
                setCurrentWorkspace(data[0]);
                loadData(userId, data[0].id);
            }
        } else {
            const { data: newW } = await supabase.from('workspaces').insert({ user_id: userId, title: 'Pessoal' }).select().single();
            if (newW) {
                setWorkspaces([newW]);
                setCurrentWorkspace(newW);
                loadData(userId, newW.id);
            }
        }
    };

    const handleCreateProfile = async () => {
        if (!user) {
            setIsNewProfileModalOpen(false);
            // setIsAuthModalOpen(true); // Descomente se usar modal de auth no dashboard
            return;
        }

        // 🔒 TRAVA BLINDADA: Free e Start não passam daqui!
        if ((userPlan === 'free' || userPlan === 'start') && workspaces.length >= 1) {
            toast.error("Limite de Perfis", {
                description: "Para gerenciar múltiplas contas/perfis, faça o upgrade para o Premium ou Pro."
            });
            setIsNewProfileModalOpen(false); // Fecha o modal de criar perfil
            openPricingModal(); // Abre a vitrine para o cara comprar!
            return;
        }

        if (!newWorkspaceName.trim()) {
            toast.error("Digite um nome para o perfil.");
            return;
        }

        setIsSavingWorkspace(true);
        try {
            const userId = getActiveUserId();

            // Salva no banco
            const { data, error } = await supabase
                .from('workspaces')
                .insert([{ user_id: userId, title: newWorkspaceName }])
                .select()
                .single();

            if (error) throw error;

            // Sucesso!
            toast.success("Novo perfil criado com sucesso!");
            setWorkspaces([...workspaces, data]);
            setCurrentWorkspace(data);
            setNewWorkspaceName('');
            setIsNewProfileModalOpen(false);

            // Limpa a tela para o novo perfil aparecer vazio
            setTransactions([]);
            setInstallments([]);
            setRecurring([]);

        } catch (error: any) {
            console.error(error);
            toast.error("Erro ao criar perfil: " + error.message);
        } finally {
            setIsSavingWorkspace(false);
        }
    };
    const toggleSimulationMode = () => {
        if (isSimulationMode) {
            // SAIR DA SIMULAÇÃO: Recarrega os dados reais do banco
            setIsSimulationMode(false);
            const activeId = getActiveUserId();
            if (activeId) loadData(activeId, currentWorkspace?.id);
            toast.info("Simulação Encerrada. Dados reais restaurados! 🔄");
        } else {
            // ENTRAR NA SIMULAÇÃO: Apenas liga o modo visual
            setIsSimulationMode(true);
            toast.success("🧪 Modo Simulação Ativado! Brinque à vontade, nada será salvo.");
        }
    };

    const toggleWhatsappNotification = async () => {
        if (!user) return;

        // 🔒 TRAVA: Apenas Pro e Agent podem usar WhatsApp
        if (userPlan !== 'pro' && userPlan !== 'agent' && userPlan !== 'admin') {
            toast.error("Recurso Pro Exclusivo", {
                description: "Notificações e IA via WhatsApp estão disponíveis apenas no plano Pro."
            });
            openPricingModal();
            return;
        }

        const newValue = !whatsappEnabled;
        setWhatsappEnabled(newValue);

        const { data } = await supabase.from('user_settings').select('id').eq('user_id', user.id).single();

        if (data) {
            await supabase.from('user_settings').update({ notify_whatsapp: newValue }).eq('user_id', user.id);
        } else {
            await supabase.from('user_settings').insert({ user_id: user.id, notify_whatsapp: newValue });
        }

        toast.success(newValue ? "Notificações WhatsApp Ativadas! 🔔" : "Notificações WhatsApp Desativadas. 🔕");
    };

    const fetchUserSettings = async (uid: string) => {
        const { data } = await supabase.from('user_settings').select('notify_whatsapp').eq('user_id', uid).single();
        if (data) setWhatsappEnabled(data.notify_whatsapp);
    };

    const switchWorkspace = (workspace: any) => {
        if (workspace.id === currentWorkspace?.id) return;
        setCurrentWorkspace(workspace);
        setTransactions([]); setInstallments([]); setRecurring([]);
        if (user) loadData(user.id, workspace.id);
    };

    const fetchUserProfile = async (userId: string) => {
        const { data } = await supabase.from('profiles').select('plan_tier, preferred_layout, theme_color').eq('id', userId).single();
        const plan = data?.plan_tier || 'free';

        setUserPlan(plan);
        if (data?.preferred_layout) setCurrentLayout(data.preferred_layout as any);
        if (data?.theme_color) setCurrentTheme(data.theme_color);
        if (plan === 'agent') fetchClients(userId);
    };

    const handleSavePreferences = async (type: 'layout' | 'theme', value: string) => {
        if (type === 'layout') setCurrentLayout(value as any);
        if (type === 'theme') setCurrentTheme(value);
        if (user) {
            const updateData = type === 'layout' ? { preferred_layout: value } : { theme_color: value };
            await supabase.from('profiles').update(updateData).eq('id', user.id);
        }
    };

    const checkUpcomingBills = async (userId: string) => {
    if (!userId) return;

    // 1. Prepara as datas atuais reais (Hoje)
    const today = new Date();
    const dayNum = today.getDate();
    const dayStr = dayNum.toString().padStart(2, '0');
    const currentYear = today.getFullYear();
    const currentMonthIdx = today.getMonth();

    const monthMap: Record<number, string> = {
        0: 'Jan', 1: 'Fev', 2: 'Mar', 3: 'Abr', 4: 'Mai', 5: 'Jun',
        6: 'Jul', 7: 'Ago', 8: 'Set', 9: 'Out', 10: 'Nov', 11: 'Dez'
    };
    const currentMonthName = monthMap[currentMonthIdx];
    const currentPaymentTag = `${currentMonthName}/${currentYear}`;

    const getStartData = (item: any) => {
        if (item.start_date && item.start_date.includes('/')) {
            const p = item.start_date.split('/'); return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) };
        }
        if (item.date && item.date.includes('/')) {
            const p = item.date.split('/'); return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) };
        }
        return { m: 0, y: currentYear };
    };

    const isFuture = (item: any) => {
        const { m: startM, y: startY } = getStartData(item);
        return (currentYear < startY) || (currentYear === startY && currentMonthIdx < startM);
    };

    // 2. Identifica as contas para a notificação INTERNA (Sininho do site)
    const billsDueToday = [
        ...transactions.filter(t => 
            t.type === 'expense' && !t.is_paid && t.status !== 'delayed' && t.status !== 'standby' &&
            t.date?.startsWith(`${dayStr}/`) && t.date?.endsWith(`/${currentYear}`) && !isFuture(t)
        ),
        ...recurring.filter(r => 
            r.type === 'expense' && r.due_day === dayNum && r.status !== 'delayed' && r.status !== 'standby' &&
            !r.paid_months?.includes(currentPaymentTag) && !isFuture(r)
        ),
        ...installments.filter(i => 
            i.due_day === dayNum && i.status !== 'delayed' && i.status !== 'standby' &&
            !i.paid_months?.includes(currentPaymentTag) && !isFuture(i)
        )
    ];

    if (billsDueToday.length === 0) return;

    // 3. ANTI-DUPLICIDADE (Sininho do site)
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const { data: existingNotifs } = await supabase
        .from('notifications')
        .select('id')
        .eq('user_id', userId)
        .eq('title', 'Contas Vencendo Hoje! 💸')
        .gte('created_at', startOfDay.toISOString())
        .limit(1);

    if (existingNotifs && existingNotifs.length > 0) return;

    // 4. Salva no banco de notificações do SITE
    const messageSignature = `Você tem ${billsDueToday.length} conta(s) para pagar hoje. Não esqueça!`;
    const { error } = await supabase.from('notifications').insert({
        user_id: userId,
        title: 'Contas Vencendo Hoje! 💸',
        message: messageSignature,
        type: 'warning',
        is_read: false
    });

    if (!error) {
        toast.warning("Atenção: Contas Vencendo Hoje!", { description: messageSignature });

        // 🔴🔴 AQUI ESTÁ A MUDANÇA PARA O WHATSAPP 🔴🔴
        console.log("📤 Solicitando disparo de WhatsApp ao Backend...");
        
        // Buscamos o Token da sessão atual
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        fetch('/api/check-notifications', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}` // ✅ ENVIANDO O TOKEN
            },
            body: JSON.stringify({
                forceSend: false // ✅ MANDAMOS SÓ O ESSENCIAL (Backend faz o resto)
            })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) console.log("✅ WhatsApp enviado com sucesso!");
            else console.log("⚠️ WhatsApp não enviado:", data.reason || data.error);
        })
        .catch(err => console.error("❌ Erro ao chamar API de WhatsApp:", err));
    }
};

    const fetchClients = async (managerId: string) => {
        const { data } = await supabase.from('manager_clients').select('*').eq('manager_id', managerId);
        if (data) setClients(data);
    };

    // ADICIONAR CLIENTE (SISTEMA DE CONVITE SEGURO)
    const handleAddClient = async () => {
        if (!newClientEmail) return toast.warning("Digite o e-mail.");
        setAddingClient(true);
        const toastId = toast.loading("Enviando convite...");

        try {
            const { data: foundUserId } = await supabase.rpc('get_user_id_by_email', {
                search_email: newClientEmail
            });

            if (!foundUserId) {
                await supabase.from('manager_clients').insert({
                    manager_id: user.id, client_email: newClientEmail, status: 'pending'
                });
                toast.success("E-mail convidado! Aguardando cadastro.", { id: toastId });
            } else {
                // USUÁRIO EXISTE: Criar notificação
                const { error: notifError } = await supabase.rpc('create_notification', {
                    p_user_id: foundUserId,
                    p_title: 'Convite de Consultoria',
                    p_message: `O consultor ${user.email} quer gerenciar sua conta.`,
                    p_type: 'consultant_invite',
                    p_action_data: user.id
                });

                if (notifError) {
                    console.error("Erro no RPC:", notifError);
                    throw new Error(`Erro na notificação: ${notifError.message || 'Falha no banco'}`);
                }

                const { error: insertError } = await supabase
                    .from('manager_clients')
                    .insert({
                        manager_id: user.id,
                        client_email: newClientEmail,
                        client_id: foundUserId,
                        status: 'pending'
                    });

                if (insertError) throw insertError;

                toast.success("Convite enviado com sucesso! 🔔", { id: toastId });
            }
            setNewClientEmail('');
            setIsClientModalOpen(false);
            fetchClients(user.id);

        } catch (error: any) {
            toast.error(error.message, { id: toastId });
        } finally {
            setAddingClient(false);
        }
    };

    // CLIENTE ACEITA CONVITE DO CONSULTOR
    const handleAcceptConsultant = async (notification: any) => {
        const managerId = notification.action_data; // O ID do consultor que nós guardamos
        const toastId = toast.loading("Confirmando vínculo...");

        try {
            // 1. Atualiza o vínculo para ATIVO
            const { error: updateError } = await supabase
                .from('manager_clients')
                .update({ status: 'active' })
                .eq('manager_id', managerId)
                .eq('client_id', user.id); // Confirma que é o próprio usuário

            if (updateError) throw updateError;

            // 2. Sobe o plano do cliente para Pro de presente! (Usando aquele comando VIP que criamos antes)
            await supabase.rpc('upgrade_client_plan', { target_client_id: user.id });

            // 3. Marca a notificação como lida (ou deleta ela)
            await supabase.from('notifications').update({ is_read: true }).eq('id', notification.id);

            toast.success("Consultor vinculado! Você ganhou o plano PRO de presente! 🎉", { id: toastId });

            // Opcional: Atualizar a lista de notificações na tela

        } catch (error: any) {
            console.error(error);
            toast.error("Erro ao aceitar convite.", { id: toastId });
        }
    };

    const switchView = async (client: any | null) => {
        // 🔒 TRAVA DE SEGURANÇA: Se o cliente estiver pendente, o acesso é negado!
        if (client && client.status === 'pending') {
            toast.error("Acesso negado. Aguarde o cliente aceitar o convite.");
            return;
        }

        setViewingAs(client);
        const targetUserId = client ? client.client_id : user?.id;
        if (targetUserId) {
            await fetchWorkspaces(targetUserId, true);
        }
    };
    // DESVINCULAR CLIENTE E REBAIXAR PLANO
    const handleRemoveClient = async (client: any) => {
        const confirmDelete = window.confirm(`Tem certeza que deseja remover ${client.client_email}?`);
        if (!confirmDelete) return;

        const toastId = toast.loading("Removendo...");

        try {
            // 1. APAGA A LIGAÇÃO
            const { error: unlinkError } = await supabase
                .from('manager_clients')
                .delete()
                .eq('manager_id', user.id)
                .eq('client_email', client.client_email);

            if (unlinkError) throw unlinkError;

            // 2. REBAIXA PLANO (SE CLIENTE TIVER ID)
            if (client.client_id && client.client_id !== 'null') {
                const { error: downgradeError } = await supabase.rpc('downgrade_client_plan', {
                    target_client_id: client.client_id
                });
                if (downgradeError) console.error("Erro ao rebaixar plano:", downgradeError);
            }

            // 3. ATUALIZA A TELA
            setClients(prev => prev.filter(c => c.client_email !== client.client_email));

            // Volta para tela pessoal se visualizando cliente excluído
            if (viewingAs && viewingAs.client_email === client.client_email) {
                switchView(null);
            }

            toast.success("Removido com sucesso! 🧹", { id: toastId });

        } catch (error: any) {
            console.error(error);
            toast.error("Erro ao remover: " + error.message, { id: toastId });
        }
    };

    useEffect(() => {
        if (transactions.length > 0 || installments.length > 0) {
            checkForPastDueItems();
            if (user) checkUpcomingBills(user.id); // <--- ADICIONE ISSO
        }
    }, [transactions, installments, recurring, user]);


    const loadData = async (userId: string, workspaceId: string) => {
        if (!userId || !workspaceId) return;

        // Busca os dados financeiros normais
        const { data: trans } = await supabase.from('transactions').select('*').eq('user_id', userId).eq('context', workspaceId);
        const { data: inst } = await supabase.from('installments').select('*').eq('user_id', userId).eq('context', workspaceId);
        const { data: recur } = await supabase.from('recurring').select('*').eq('user_id', userId).eq('context', workspaceId);

        // 🔥 AQUI ESTAVA FALTANDO: Busca as METAS no banco
        const { data: goalsData } = await supabase
            .from('goals')
            .select('*')
            .eq('user_id', userId)
            .order('deadline', { ascending: true }); // Ordena por prazo

        // Atualiza os estados
        if (trans) setTransactions(trans);
        if (inst) setInstallments(inst);
        if (recur) setRecurring(recur);

        // 🔥 ATUALIZA O ESTADO DAS METAS
        if (goalsData) setGoals(goalsData);
    };

    const saveDataLocal = (newTrans: any[], newInst: any[], newRecur: any[]) => {
        setTransactions(newTrans); setInstallments(newInst); setRecurring(newRecur);
        localStorage.setItem(`guest_transactions`, JSON.stringify(newTrans));
        localStorage.setItem(`guest_installments`, JSON.stringify(newInst));
        localStorage.setItem(`guest_recurring`, JSON.stringify(newRecur));
    };

    // 🟢 LISTA DE PENDÊNCIAS: Atualizada com a lógica de "Imunidade de Pagamento"
    const checkForPastDueItems = () => {
        const pastDueList: any[] = [];
        const currentMonthIdx = MONTHS.indexOf(activeTab);

        const isPaid = (item: any, tag: string) => {
            if (!item.paid_months) return false;
            return item.paid_months.includes(tag) || item.paid_months.includes(tag.split('/')[0]);
        };

        const getStartData = (item: any) => {
            if (item.start_date && item.start_date.includes('/')) {
                const p = item.start_date.split('/'); return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) };
            }
            if (item.date && item.date.includes('/')) {
                const p = item.date.split('/'); return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) };
            }
            if (item.created_at) {
                const d = new Date(item.created_at); return { m: d.getMonth(), y: d.getFullYear() };
            }
            return { m: 0, y: selectedYear };
        };

        // 1. TRANSAÇÕES AVULSAS ATRASADAS
        transactions.forEach(t => {
            if (t.type === 'expense' && !t.is_paid && t.status !== 'standby' && t.status !== 'delayed') {
                const { m, y } = getStartData(t);
                if (y < selectedYear || (y === selectedYear && m < currentMonthIdx)) {
                    pastDueList.push({ ...t, _source: 'transactions', _pastMonth: MONTHS[m], _amount: Number(t.amount) });
                }
            }
        });

        // 2. PARCELAS ATRASADAS
        installments.forEach(inst => {
            if (inst.status !== 'standby' && inst.status !== 'delayed') {
                const { m: startMonth, y: startYear } = getStartData(inst);

                // Pega a diferença de meses até o mês ATUAL (que o usuário está visualizando na aba)
                const totalMonthsDiffUntilNow = ((selectedYear - startYear) * 12) + (currentMonthIdx - startMonth);

                // 🟢 TRAVA DE FUTURO: Se a conta começa no futuro, pula fora!
                if (totalMonthsDiffUntilNow < 0) return;

                for (let i = 0; i <= totalMonthsDiffUntilNow; i++) {
                    const instNum = 1 + (inst.current_installment || 0) + i;

                    // Só cobra se a parcela atual for válida (entre 1 e o total de parcelas)
                    if (instNum >= 1 && instNum <= inst.installments_count) {
                        const absMonthIndex = (startMonth + i);
                        const pYear = startYear + Math.floor(absMonthIndex / 12);
                        const pMonthName = MONTHS[absMonthIndex % 12];
                        const paymentTag = `${pMonthName}/${pYear}`;

                        // Verifica se NÃO está paga E se NÃO está em stand-by
                        if (!isPaid(inst, paymentTag) && !inst.standby_months?.includes(paymentTag)) {
                            pastDueList.push({
                                ...inst,
                                title: `${inst.title} (${instNum}/${inst.installments_count})`,
                                _source: 'installments',
                                _pastMonth: pMonthName,
                                _amount: Number(inst.value_per_month),
                                _paymentTag: paymentTag
                            });
                        }
                    }
                }
            }
        });

        // 3. CONTAS FIXAS ATRASADAS
        recurring.forEach(rec => {
            if (rec.type === 'expense' && rec.status !== 'standby' && rec.status !== 'delayed') {
                const { m: startMonth, y: startYear } = getStartData(rec);
                const totalMonthsSinceStart = ((selectedYear - startYear) * 12) + (currentMonthIdx - startMonth);

                // 🟢 TRAVA DE FUTURO: Se a conta começa no futuro, pula fora!
                if (totalMonthsSinceStart < 0) return;

                for (let i = 0; i <= totalMonthsSinceStart; i++) {
                    const absMonthIndex = startMonth + i;
                    const checkYear = startYear + Math.floor(absMonthIndex / 12);
                    const checkMonthName = MONTHS[absMonthIndex % 12];
                    const checkTag = `${checkMonthName}/${checkYear}`;

                    // Verifica se NÃO está paga, NÃO foi pulada E NÃO está em stand-by
                    if (!isPaid(rec, checkTag) && !rec.skipped_months?.includes(checkMonthName) && !rec.standby_months?.includes(checkTag)) {
                        pastDueList.push({
                            ...rec,
                            _source: 'recurring',
                            _pastMonth: checkMonthName,
                            _amount: Number(rec.value),
                            _paymentTag: checkTag
                        });
                    }
                }
            }
        });

        // Atualiza o estado que alimenta o Modal de Rollover!
        setPastDueItems(pastDueList);
    };


    const handleAuth = async () => {
        setLoadingAuth(true);
        setAuthMessage('');

        // 👇 TRAVA DE SEGURANÇA NOVA
        if (authMode === 'signup' && !termsAccepted) {
            setAuthMessage("⚠️ Você precisa aceitar os Termos de Uso e Privacidade.");
            setLoadingAuth(false);
            return;
        }

        if (authMode === 'login') {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) setAuthMessage("❌ " + error.message);
            else {
                setAuthMessage("✅ Login realizado!");
                setTimeout(() => { setIsAuthModalOpen(false); window.location.reload(); }, 1000);
            }
        } else {
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) setAuthMessage("❌ " + error.message);
            else setShowEmailCheck(true);
        }
        setLoadingAuth(false);
    };

    const handleResetPassword = async () => {
        if (!email) { setAuthMessage("⚠️ Digite seu e-mail no campo acima."); return; }
        setLoadingAuth(true); setAuthMessage('');
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}` });
        if (error) setAuthMessage("❌ Erro: " + error.message); else setAuthMessage("✅ Link enviado!");
        setLoadingAuth(false);
    };

    const handleUpdatePassword = async () => {
        if (!newPassword) return toast.warning("Digite a nova senha.");
        setLoadingAuth(true);
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) { toast.error("Erro ao atualizar: " + error.message); }
        else { toast.success("Senha atualizada com sucesso! 🔒"); setIsChangePasswordOpen(false); setNewPassword(''); }
        setLoadingAuth(false);
    };

    const handleLogout = async () => { await supabase.auth.signOut(); window.location.reload(); };

    const openPricingModal = () => { if (!user) { setIsAuthModalOpen(true); setAuthMessage("✨ Crie uma conta grátis."); return; } setIsPricingOpen(true); };

    const handleCheckout = async (planType: 'START' | 'PREMIUM' | 'PRO' | 'AGENT') => {
        const btn = document.getElementById(`checkout-btn-${planType}`);
        if (btn) btn.innerText = "Processando...";

        try {
            const response = await fetch('/api/checkout', {
                method: 'POST', // 🟢 AGORA SIM! Ele sabe que é pra enviar dados
                headers: {
                    'Content-Type': 'application/json' // Avisa o servidor que é um JSON
                },
                body: JSON.stringify({
                    userId: user.id,
                    email: user.email,
                    planType: planType // 🟢 DINÂMICO! Manda exatamente o botão que o cara clicou
                })
            });

            const data = await response.json();

            if (data.url) {
                window.location.href = data.url; // Vai pro Stripe!
            } else {
                toast.error(data.error || "Erro ao criar pagamento.");
            }
        } catch (e) {
            console.error("Erro no checkout:", e);
            toast.error("Erro de conexão. Tente novamente.");
        }

        if (btn) btn.innerText = "Assinar Agora"; // Volta o texto normal caso dê erro
    };

    const handleManageSubscription = async () => {
        if (!user) return;
        if (userPlan === 'free') { toast.info("Sem assinatura ativa", { description: "Faça o upgrade para ter o que gerenciar!" }); openPricingModal(); return; }
        const toastId = toast.loading("Abrindo portal de assinatura...");
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error("Sessão inválida. Faça login novamente.");
            const response = await fetch('/api/portal', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` } });
            const data = await response.json();
            if (data.url) window.location.href = data.url; else throw new Error(data.error || "Não foi possível abrir o portal.");
        } catch (error: any) { console.error(error); toast.error("Erro ao abrir portal", { description: error.message }); } finally { toast.dismiss(toastId); }
    };

    const getActiveUserId = () => viewingAs ? viewingAs.client_id : user?.id;

    const handleDelete = async (table: string, id: number) => {
        if (!confirm("Tem certeza?")) return;

        // 🧪 SEQUESTRO DA SIMULAÇÃO (Não deixa excluir de verdade)
        if (isSimulationMode) {
            if (table === 'transactions') setTransactions(prev => prev.filter(t => t.id !== id));
            else if (table === 'installments') setInstallments(prev => prev.filter(i => i.id !== id));
            else if (table === 'recurring') setRecurring(prev => prev.filter(r => r.id !== id));

            toast.success("Excluído apenas na simulação! 🧪");
            return; // 🛑 Impede que o código continue e delete no banco!
        }

        const activeId = getActiveUserId();
        if (user && activeId) {
            await supabase.from(table).delete().eq('id', id);
            loadData(activeId, currentWorkspace?.id);
        } else {
            if (table === 'transactions') saveDataLocal(transactions.filter(t => t.id !== id), installments, recurring);
            else if (table === 'installments') saveDataLocal(transactions, installments.filter(i => i.id !== id), recurring);
            else saveDataLocal(transactions, installments, recurring.filter(r => r.id !== id));
        }
    };
    const togglePaid = async (table: string, id: number, currentStatus: boolean) => {
        // 🧪 SEQUESTRO DA SIMULAÇÃO
        if (isSimulationMode) {
            if (table === 'transactions') {
                setTransactions(prev => prev.map(t => t.id === id ? { ...t, is_paid: !currentStatus } : t));
            }
            return; // O 'return' impede que vá para o banco de dados!
        }

        const activeId = getActiveUserId();
        if (user && activeId) {
            await supabase.from(table).update({ is_paid: !currentStatus }).eq('id', id);
            loadData(activeId, currentWorkspace?.id);
        } else {
            const updateList = (list: any[]) => list.map(i => i.id === id ? { ...i, is_paid: !currentStatus } : i);
            if (table === 'transactions') saveDataLocal(updateList(transactions), installments, recurring);
        }
    };
    // --- FUNÇÕES DO ROLLOVER (ITEM 7 REFINADO) ---

    // 1. Marcar TUDO como pago (Esqueci de dar baixa)
    // 🟢 PAGAR TODAS AS PENDÊNCIAS DE UMA VEZ
    const handleMarkAllAsPaid = async () => {
        setIsRolloverModalOpen(false);
        const toastId = toast.loading("Dando baixa em todas as pendências...");

        try {
            // Varre a lista de contas atrasadas e paga uma por uma no banco de dados
            for (const item of pastDueItems) {
                const table = item._source || item.origin; // Aceita o nome novo ou o legado
                const tag = item._paymentTag;
                let payload: any = {};

                if (table === 'transactions') {
                    // Transação avulsa é só marcar como paga
                    payload = { is_paid: true, status: 'paid' };
                } else {
                    // Fixas e Parceladas ganham o CARIMBO DO MÊS na lista de imunidade
                    const currentPaid = Array.isArray(item.paid_months) ? [...item.paid_months] : [];
                    if (!currentPaid.includes(tag)) currentPaid.push(tag);
                    payload = { paid_months: currentPaid };
                }

                // Atualiza o item no banco de dados
                await supabase.from(table).update(payload).eq('id', item.id);
            }

            toast.success("Tudo pago! Que alívio! 🎉", { id: toastId });

            // Recarrega os dados para a tela principal ficar toda verde e bonitona!
            const activeId = getActiveUserId();
            if (activeId) {
                loadData(activeId, currentWorkspace?.id);
            }

            // Limpa a lista
            setPastDueItems([]);

        } catch (error) {
            toast.error("Erro ao dar baixa nas contas.", { id: toastId });
        }
    };

    // 2. Calcular o Total Atrasado
    const totalPastDue = pastDueItems.reduce((acc, item) => {
        const val = item.amount || item.value || item.value_per_month || 0;
        return acc + val;
    }, 0);

    // 1. CLIQUE NO BOTÃO DE ATRASO
    const toggleDelay = (origin: string, item: any) => {
        const targetTag = item._targetTag || `${activeTab}/${selectedYear}`;

        let isStandby = false;
        if (origin === 'transactions') {
            isStandby = (item.status === 'delayed' || item.status === 'standby');
        } else {
            const arr = item.standby_months || [];
            isStandby = arr.includes(targetTag) || item.status === 'standby' || item.status === 'delayed';
        }

        if (origin === 'transactions') {
            confirmDelayChoice(origin, item, isStandby ? 'restore_global' : 'global');
        } else {
            setStandbyModal({ isOpen: true, item, origin, isRestore: isStandby });
        }
    };

    // 2. EXECUÇÃO DA ESCOLHA
    const confirmDelayChoice = async (origin: string, item: any, choice: 'restore_single' | 'restore_global' | 'single' | 'global') => {
        setStandbyModal(null);

        const tableMap: Record<string, string> = { 'transactions': 'transactions', 'installments': 'installments', 'recurring': 'recurring' };
        const table = tableMap[origin] || origin;

        const targetTag = item._targetTag || `${activeTab}/${selectedYear}`;

        let newStatusGlobal = item.status;
        let newStandbyArray = Array.isArray(item.standby_months) ? [...item.standby_months] : [];

        if (table === 'transactions') {
            newStatusGlobal = choice.startsWith('restore') ? 'active' : 'standby';
        } else {
            if (choice === 'restore_single') {
                newStatusGlobal = 'active';
                newStandbyArray = newStandbyArray.filter((m: string) => m !== targetTag); // Tira SÓ o mês da etiqueta
            } else if (choice === 'restore_global') {
                newStatusGlobal = 'active';
                newStandbyArray = []; // Limpa TUDO
            } else if (choice === 'single') {
                newStatusGlobal = 'active';
                if (!newStandbyArray.includes(targetTag)) newStandbyArray.push(targetTag);
            } else if (choice === 'global') {
                // 🟢 AQUI ESTÁ A CORREÇÃO: Sem o loop maluco de 60 meses! 
                // Como já temos a 'Imunidade', podemos usar o status global nativo.
                newStatusGlobal = 'standby';
                newStandbyArray = [];
            }
        }

        const applyInstantVisualUpdate = () => {
            if (table === 'transactions') setTransactions(prev => prev.map(t => t.id === item.id ? { ...t, status: newStatusGlobal } : t));
            else if (table === 'installments') setInstallments(prev => prev.map(i => i.id === item.id ? { ...i, status: newStatusGlobal, standby_months: newStandbyArray } : i));
            else if (table === 'recurring') setRecurring(prev => prev.map(r => r.id === item.id ? { ...r, status: newStatusGlobal, standby_months: newStandbyArray } : r));
        };
        applyInstantVisualUpdate();

        if (isSimulationMode) { toast.success(`[Simulação] Atualizado!`); return; }

        const activeId = getActiveUserId();
        if (user && activeId) {
            try {
                const payload = table === 'transactions' ? { status: newStatusGlobal } : { standby_months: newStandbyArray, status: newStatusGlobal };
                await supabase.from(table).update(payload).eq('id', item.id);

                if (choice === 'restore_global') toast.success(`Restaurado para todos os meses!`);
                else if (choice === 'restore_single') toast.success(`Restaurado com sucesso!`);
                else if (choice === 'single') toast.success(`Congelado com sucesso!`);
                else toast.success("Congelado em todos os meses futuros!");
            } catch (error) {
                toast.error("Erro no Banco de Dados.");
                loadData(activeId, currentWorkspace?.id);
            }
        }
    };

    const toggleSkipMonth = async (item: any) => {
        const currentSkipped = item.skipped_months || []; const isSkipped = currentSkipped.includes(activeTab); let newSkipped = isSkipped ? currentSkipped.filter((m: string) => m !== activeTab) : [...currentSkipped, activeTab];
        const activeId = getActiveUserId();
        if (user && activeId) { await supabase.from('recurring').update({ skipped_months: newSkipped }).eq('id', item.id); loadData(activeId, currentWorkspace?.id); }
        else {
            const newRecur = recurring.map(r => r.id === item.id ? { ...r, skipped_months: newSkipped } : r);
            saveDataLocal(transactions, installments, newRecur);
        }
    };

    const togglePaidMonth = async (table: string, item: any) => {
        const currentPaid = item.paid_months || [];
        const monthTag = `${activeTab}/${selectedYear}`;
        let newPaidList;

        if (currentPaid.includes(monthTag)) {
            newPaidList = currentPaid.filter((m: string) => m !== monthTag);
        } else {
            newPaidList = [...currentPaid, monthTag];
            newPaidList = newPaidList.filter((m: string) => m !== activeTab);
        }

        // 🧪 SEQUESTRO DA SIMULAÇÃO
        if (isSimulationMode) {
            if (table === 'installments') setInstallments(prev => prev.map(i => i.id === item.id ? { ...i, paid_months: newPaidList } : i));
            else if (table === 'recurring') setRecurring(prev => prev.map(r => r.id === item.id ? { ...r, paid_months: newPaidList } : r));
            return; // Impede que vá para o banco!
        }

        const activeId = getActiveUserId();
        if (user && activeId) {
            await supabase.from(table).update({ paid_months: newPaidList }).eq('id', item.id);
            loadData(activeId, currentWorkspace?.id);
        } else {
            const updateList = (list: any[]) => list.map(i => i.id === item.id ? { ...i, paid_months: newPaidList } : i);
            if (table === 'installments') saveDataLocal(transactions, updateList(installments), recurring);
            else saveDataLocal(transactions, installments, updateList(recurring));
        }
    };

    const handleEdit = (item: any, mode: any) => {
        setFormMode(mode);
        setEditingId(item.id);
        const currentReceipt = getReceiptForMonth(item, activeTab);

        setFormData({
            title: item.title,
            amount: item.amount || item.value || item.total_value || '',
            installments: item.installments_count || '',
            dueDay: item.due_day || '',
            category: item.category || 'Outros',
            targetMonth: item.target_month || activeTab,
            isFixedIncome: mode === 'income' && item.category === 'Salário',
            fixedMonthlyValue: item.fixed_monthly_value || '',
            receiptUrl: currentReceipt || '',
            day: '',
            icon: item.icon || '',
            paymentMethod: item.payment_method || 'outros'
        });

        setIsFormOpen(true);
    };

    const openNewTransactionModal = () => { setEditingId(null); setFormData({ ...initialFormState, targetMonth: activeTab }); setIsFormOpen(true); };

    const handleFileUpload = async (e: any) => {
        const file = e.target.files[0];
        if (!file || !user) return;
        // BLOQUEIO: Free e Start não podem fazer upload
        if (userPlan === 'free' || userPlan === 'start') {
            toast.error("Recurso Exclusivo Aliado Plus", {
                description: "Faça o upgrade (R$ 29,90) para salvar comprovantes na nuvem."
            });
            return;
        }
        setUploadingFile(true);
        try {
            const fileExt = file.name.split('.').pop(); const fileName = `${user.id}/${Date.now()}.${fileExt}`;
            const { error: uploadError } = await supabase.storage.from('comprovantes').upload(fileName, file); if (uploadError) throw uploadError; const { data } = supabase.storage.from('comprovantes').getPublicUrl(fileName);
            setFormData({ ...formData, receiptUrl: data.publicUrl });
        } catch (error: any) { toast.error("Erro no upload: " + error.message); } finally { setUploadingFile(false); }
    };

    const handleRemoveReceipt = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); if (confirm("Tem certeza?")) setFormData({ ...formData, receiptUrl: '' }); };
    // Função para limpar o formulário após salvar ou fechar
    // Função para limpar o formulário após salvar ou fechar
    // Função para limpar o formulário
    const resetForm = () => {
        const diaDeHoje = String(new Date().getDate()).padStart(2, '0');

        setFormData({
            title: '',
            amount: '',
            installments: '',
            dueDay: '',
            day: diaDeHoje, // <--- AQUI TAMBÉM!
            category: 'Outros',
            targetMonth: activeTab || 'Jan',
            isFixedIncome: false,
            fixedMonthlyValue: '',
            receiptUrl: '',
            icon: '',
            paymentMethod: ''
        });

        setEditingId(null);
        // Se tiver o estado de upload, mantenha:
        // setUploadingFile(false); 
    };
    const handleSubmit = async () => {
        // 1. Validação Inicial
        if (!formData.title) {
            toast.error("Preencha a descrição.");
            return;
        }

        const activeId = getActiveUserId();
        const context = currentWorkspace?.id;

        // Converte valores para número (tratando vírgula e ponto)
        const amountVal = formData.amount ? parseFloat(formData.amount.toString().replace(',', '.')) : 0;
        const fixedVal = formData.fixedMonthlyValue ? parseFloat(formData.fixedMonthlyValue.toString().replace(',', '.')) : 0;

        // Mapa de meses para construir a data ISO
        const monthMapNums: Record<string, string> = {
            'Jan': '01', 'Fev': '02', 'Mar': '03', 'Abr': '04', 'Mai': '05', 'Jun': '06',
            'Jul': '07', 'Ago': '08', 'Set': '09', 'Out': '10', 'Nov': '11', 'Dez': '12'
        };

        // 🟢 CORREÇÃO DO "DIA 01": Verifica qual campo de dia usar dependendo do tipo de lançamento
        let baseDay = '01';
        if (formMode === 'income' || formMode === 'expense') {
            // Se estiver vazio, pega o dia de hoje como segurança
            baseDay = formData.day ? formData.day.toString() : String(new Date().getDate());
        } else {
            baseDay = formData.dueDay ? formData.dueDay.toString() : '01';
        }

        const dayValue = baseDay.padStart(2, '0');
        const monthValue = monthMapNums[formData.targetMonth] || '01';

        // Criamos uma data no formato ISO (YYYY-MM-DD) para o banco aceitar no created_at
        // Usamos 12:00:00 para evitar problemas de fuso horário
        const isoDateForDatabase = `${selectedYear}-${monthValue}-${dayValue}T12:00:00Z`;
        const dateStringBR = `${dayValue}/${monthValue}/${selectedYear}`;

        // 2. Lógica de Comprovantes (Preservando o que você já tem)
        // 2. Lógica de Comprovantes (Corrigida para Exclusão)
        let originalItem: any = null;
        if (editingId) {
            originalItem = transactions.find(t => t.id === editingId) ||
                installments.find(i => i.id === editingId) ||
                recurring.find(r => r.id === editingId);
        }

        let updatedReceipts = { ...(originalItem?.receipts || {}) };
        const tag = `${formData.targetMonth}/${selectedYear}`;

        // 🟢 A MÁGICA DA EXCLUSÃO: Se formData.receiptUrl for vazio, manda "null" pro banco!
        let finalReceiptUrl = originalItem?.receipt_url || null;

        if (formData.receiptUrl === '') {
            delete updatedReceipts[tag]; // Tira do histórico
            finalReceiptUrl = null;      // Zera o comprovante principal
        } else if (formData.receiptUrl) {
            updatedReceipts[tag] = formData.receiptUrl;
            finalReceiptUrl = formData.receiptUrl;
        }

        // 3. Montagem do Payload por Tipo de Lançamento
        const getPayload = () => {
            const base = {
                user_id: activeId,
                title: formData.title,
                context: context,
                icon: formData.icon,
                payment_method: formData.paymentMethod || 'outros',
                receipts: updatedReceipts,
                receipt_url: finalReceiptUrl // 🟢 Agora envia 'null' corretamente!
            };

            const safeCreatedAt = (editingId && originalItem?.created_at) ? originalItem.created_at : isoDateForDatabase;

            // --- RECEITAS ---
            if (formMode === 'income') {
                return formData.isFixedIncome
                    ? { table: 'recurring', data: { ...base, value: amountVal, due_day: parseInt(dayValue), category: 'Salário', type: 'income', status: 'active', start_date: editingId && originalItem?.start_date ? originalItem.start_date : isoDateForDatabase, created_at: safeCreatedAt } }
                    : { table: 'transactions', data: { ...base, amount: amountVal, type: 'income', date: dateStringBR, category: 'Receita', target_month: formData.targetMonth, status: 'active', created_at: safeCreatedAt } };
            }

            // --- DESPESAS AVULSAS ---
            if (formMode === 'expense') {
                return {
                    table: 'transactions',
                    data: {
                        ...base,
                        amount: amountVal,
                        type: 'expense',
                        date: dateStringBR,
                        category: formData.category,
                        target_month: formData.targetMonth,
                        status: 'active',
                        created_at: safeCreatedAt,
                        is_paid: editingId && originalItem !== undefined ? originalItem.is_paid : true
                    }
                };
            }

            // --- PARCELAMENTOS ---
            if (formMode === 'installment') {
                const qtd = parseInt(formData.installments.toString()) || 1;
                const valuePerMonth = fixedVal > 0 ? fixedVal : (amountVal / qtd);
                const totalValue = amountVal > 0 ? amountVal : (valuePerMonth * qtd);

                return {
                    table: 'installments',
                    data: {
                        ...base,
                        total_value: totalValue,
                        installments_count: qtd,
                        current_installment: editingId && originalItem ? originalItem.current_installment : 0,
                        value_per_month: valuePerMonth,
                        due_day: parseInt(dayValue) || 10,
                        status: 'active',
                        created_at: safeCreatedAt
                    }
                };
            }

            // --- DESPESAS FIXAS ---
            return {
                table: 'recurring',
                data: {
                    ...base,
                    value: amountVal,
                    due_day: parseInt(dayValue) || 10,
                    category: formData.category || 'Fixa',
                    type: 'expense',
                    status: 'active',
                    start_date: editingId && originalItem?.start_date ? originalItem.start_date : isoDateForDatabase,
                    created_at: safeCreatedAt
                }
            };
        };

        const { table, data } = getPayload();

        // 🧪 SEQUESTRO DA SIMULAÇÃO (Não deixa salvar no banco)
        if (isSimulationMode) {
            // Cria um ID falso só para a tela conseguir renderizar
            const fakeItem = { ...data, id: editingId ? editingId : Date.now() };

            if (table === 'transactions') {
                if (editingId) setTransactions(prev => prev.map(t => t.id === editingId ? fakeItem : t));
                else setTransactions(prev => [...prev, fakeItem]);
            } else if (table === 'installments') {
                if (editingId) setInstallments(prev => prev.map(i => i.id === editingId ? fakeItem : i));
                else setInstallments(prev => [...prev, fakeItem]);
            } else if (table === 'recurring') {
                if (editingId) setRecurring(prev => prev.map(r => r.id === editingId ? fakeItem : r));
                else setRecurring(prev => [...prev, fakeItem]);
            }

            toast.success("Salvo no laboratório! 🧪");

            // Fecha o form e limpa os dados
            setIsFormOpen(false);
            setEditingId(null);
            const diaDeHoje = String(new Date().getDate()).padStart(2, '0');
            setFormData({
                title: '', amount: '', targetMonth: activeTab, icon: 'dollar-sign',
                paymentMethod: 'outros', isFixedIncome: false, category: 'Outros',
                installments: '1', fixedMonthlyValue: '', dueDay: '10', day: diaDeHoje, receiptUrl: ''
            });

            return; // 🛑 Para a função aqui e não envia pro Supabase!
        }

        // 4. Execução no Supabase (Com lógica robusta de Update/Insert)
        try {
            let error = null;

            if (editingId) {
                // Descobre em qual tabela o item estava originalmente
                const originalTable = transactions.find(t => t.id === editingId) ? 'transactions'
                    : installments.find(i => i.id === editingId) ? 'installments'
                        : recurring.find(r => r.id === editingId) ? 'recurring'
                            : null;

                if (originalTable && originalTable !== table) {
                    // MUDANÇA DE TIPO: Deleta da antiga -> Insere na nova
                    const { error: delError } = await supabase.from(originalTable).delete().eq('id', editingId);
                    if (delError) throw delError;

                    const { error: insError } = await supabase.from(table).insert([data]);
                    error = insError;
                } else {
                    // MESMA TABELA: Apenas atualiza
                    const { error: updError } = await supabase.from(table).update(data).eq('id', editingId);
                    error = updError;
                }
            } else {
                // NOVO ITEM: Insere
                const { error: insError } = await supabase.from(table).insert([data]);
                error = insError;
            }

            if (error) throw error;

            toast.success("Dados salvos com sucesso!");

            // Limpa o formulário e fecha o modal usando o NOME CERTO
            setIsFormOpen(false); // <--- AQUI ESTAVA O ERRO!
            setEditingId(null);

            // Limpa o form, agora o TypeScript já conhece o 'day'
            setFormData({
                title: '', amount: '', targetMonth: activeTab, icon: 'dollar-sign',
                paymentMethod: 'outros', isFixedIncome: false, category: 'Outros',
                installments: '1', fixedMonthlyValue: '', dueDay: '10', day: '', receiptUrl: ''
            });

            // Recarrega os dados
            if (activeId) loadData(activeId, context);

        } catch (error: any) {
            console.error("Erro ao salvar:", error);
            toast.error("Erro ao salvar: " + (error.message || "Erro desconhecido"));
        }
    };
    // --- FUNÇÕES DE METAS (NOVO) ---

    const handleGoalSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const activeId = getActiveUserId();

        // Tratamento de valores
        const targetVal = parseFloat((formData.get('target_amount') as string).replace(',', '.'));
        const currentVal = parseFloat((formData.get('current_amount') as string).replace(',', '.'));

        const goalData = {
            user_id: activeId,
            title: formData.get('title'),
            target_amount: targetVal || 0,
            current_amount: currentVal || 0,
            deadline: formData.get('deadline') || null,
            icon: formData.get('icon') || 'target',
            color: formData.get('color') || '#10B981'
        };

        try {
            if (editingGoal) {
                await supabase.from('goals').update(goalData).eq('id', editingGoal.id);
                toast.success("Meta atualizada!");
            } else {
                await supabase.from('goals').insert([goalData]);
                toast.success("Nova meta criada! 🚀");
            }

            setIsGoalModalOpen(false);
            setEditingGoal(null);
            loadData(activeId!, currentWorkspace?.id);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar meta.");
        }
    };

    const handleDeleteGoal = async (id: number) => {
        if (!confirm("Excluir esta meta?")) return;
        await supabase.from('goals').delete().eq('id', id);
        toast.success("Meta excluída.");
        loadData(getActiveUserId()!, currentWorkspace?.id);
    };
    const getMonthData = (monthName: string) => {
        const monthIndex = MONTHS.indexOf(monthName);
        const monthMap: Record<string, string> = { 'Jan': '/01', 'Fev': '/02', 'Mar': '/03', 'Abr': '/04', 'Mai': '/05', 'Jun': '/06', 'Jul': '/07', 'Ago': '/08', 'Set': '/09', 'Out': '/10', 'Nov': '/11', 'Dez': '/12' };

        const dateFilter = `${monthMap[monthName]}/${selectedYear}`;
        const currentPaymentTag = `${monthName}/${selectedYear}`;

        const getStartData = (item: any) => {
            if (item.start_date && item.start_date.includes('/')) {
                const p = item.start_date.split('/'); return { d: parseInt(p[0]), m: parseInt(p[1]) - 1, y: parseInt(p[2]) };
            }
            if (item.date && item.date.includes('/')) {
                const p = item.date.split('/'); return { d: parseInt(p[0]), m: parseInt(p[1]) - 1, y: parseInt(p[2]) };
            }
            if (item.created_at) {
                const d = new Date(item.created_at); return { d: d.getDate(), m: d.getMonth(), y: d.getFullYear() };
            }
            return { d: 1, m: 0, y: new Date().getFullYear() };
        };

        // 🟢 HELPER DA IMUNIDADE: Conta paga não pode sumir!
        const isPaid = (item: any, tag: string) => {
            if (!item.paid_months) return false;
            return item.paid_months.includes(tag) || item.paid_months.includes(tag.split('/')[0]);
        };

        // 1. RECORRENTES ATIVOS NO MÊS
        const activeRecurring = recurring.filter(r => {
            const paid = isPaid(r, currentPaymentTag);
            if ((r.status === 'delayed' || r.status === 'standby') && !paid) return false;
            if (r.standby_months?.includes(currentPaymentTag) && !paid) return false;

            const { m: startMonth, y: startYear } = getStartData(r);
            if (selectedYear > startYear) return true;
            if (selectedYear === startYear && monthIndex >= startMonth) return true;
            return false;
        });

        // --- CÁLCULO DE ENTRADAS ---
        const incomeFixed = activeRecurring.filter(r => r.type === 'income' && !r.skipped_months?.includes(monthName)).reduce((acc, curr) => acc + Number(curr.value), 0);
        const incomeVariable = transactions.filter(t => t.type === 'income' && t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby').reduce((acc, curr) => acc + Number(curr.amount), 0);
        const incomeTotal = incomeFixed + incomeVariable;

        // --- CÁLCULO DE SAÍDAS DO MÊS ---
        const expenseFixed = activeRecurring.filter(r => r.type === 'expense' && !r.skipped_months?.includes(monthName)).reduce((acc, curr) => acc + Number(curr.value), 0);

        const expenseVariable = transactions.filter(t => t.type === 'expense' && t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby').reduce((acc, curr) => acc + Number(curr.amount), 0);

        const installTotal = installments.reduce((acc, curr) => {
            const paid = isPaid(curr, currentPaymentTag);
            if ((curr.status === 'delayed' || curr.status === 'standby') && !paid) return acc;
            if (curr.standby_months?.includes(currentPaymentTag) && !paid) return acc;

            const { m: startMonth, y: startYear } = getStartData(curr);
            const monthsDiff = ((selectedYear - startYear) * 12) + (monthIndex - startMonth);
            const currentInstNum = 1 + (curr.current_installment || 0) + monthsDiff;

            if (currentInstNum >= 1 && currentInstNum <= curr.installments_count) {
                return acc + Number(curr.value_per_month);
            }
            return acc;
        }, 0);

        // --- STAND-BY GLOBAL (Mostra o total congelado em TODOS os meses) ---
        let delayedTotal = 0;

        transactions.forEach(t => {
            if ((t.status === 'delayed' || t.status === 'standby') && !t.is_paid) delayedTotal += Number(t.amount);
        });

        installments.forEach(i => {
            // 🟢 PREVENÇÃO DE ERRO
            const standbyArr = Array.isArray(i.standby_months) ? i.standby_months : [];

            if ((i.status === 'delayed' || i.status === 'standby') && standbyArr.length === 0) {
                delayedTotal += Number(i.value_per_month);
            }
            standbyArr.forEach((tag: string) => {
                if (!isPaid(i, tag)) delayedTotal += Number(i.value_per_month);
            });
        });

        recurring.forEach(r => {
            if (r.type === 'expense') {
                // 🟢 PREVENÇÃO DE ERRO
                const standbyArr = Array.isArray(r.standby_months) ? r.standby_months : [];

                if ((r.status === 'delayed' || r.status === 'standby') && standbyArr.length === 0) {
                    delayedTotal += Number(r.value);
                }
                standbyArr.forEach((tag: string) => {
                    if (!isPaid(r, tag)) delayedTotal += Number(r.value);
                });
            }
        });

        // --- DÍVIDA ACUMULADA ---
        let accumulatedDebt = 0;

        transactions.forEach(t => {
            if (t.type === 'expense' && !t.is_paid && t.status !== 'standby' && t.status !== 'delayed') {
                const { m, y } = getStartData(t);
                if (y < selectedYear || (y === selectedYear && m < monthIndex)) {
                    accumulatedDebt += Number(t.amount);
                }
            }
        });

        installments.forEach(inst => {
            if (inst.status !== 'standby' && inst.status !== 'delayed') {
                const { m: startMonth, y: startYear } = getStartData(inst);
                const totalMonthsDiffUntilNow = ((selectedYear - startYear) * 12) + (monthIndex - startMonth);

                for (let i = 0; i < totalMonthsDiffUntilNow; i++) {
                    const instNum = 1 + (inst.current_installment || 0) + i;
                    if (instNum >= 1 && instNum <= inst.installments_count) {
                        const absMonthIndex = (startMonth + i);
                        const pYear = startYear + Math.floor(absMonthIndex / 12);
                        const pMonthName = MONTHS[absMonthIndex % 12];

                        const paymentTag = `${pMonthName}/${pYear}`;
                        // 🟢 Só vira Dívida Acumulada se NÃO estiver pago E NÃO estiver em Standby
                        if (!isPaid(inst, paymentTag) && !inst.standby_months?.includes(paymentTag)) {
                            accumulatedDebt += Number(inst.value_per_month);
                        }
                    }
                }
            }
        });

        recurring.forEach(rec => {
            if (rec.type === 'expense' && rec.status !== 'standby' && rec.status !== 'delayed') {
                const { m: startMonth, y: startYear } = getStartData(rec);
                const totalMonthsSinceStart = ((selectedYear - startYear) * 12) + (monthIndex - startMonth);

                for (let i = 0; i < totalMonthsSinceStart; i++) {
                    const absMonthIndex = startMonth + i;
                    const checkYear = startYear + Math.floor(absMonthIndex / 12);
                    const checkMonthName = MONTHS[absMonthIndex % 12];
                    const checkTag = `${checkMonthName}/${checkYear}`;

                    // 🟢 Mesma regra para as fixas
                    if (!isPaid(rec, checkTag) && !rec.skipped_months?.includes(checkMonthName) && !rec.standby_months?.includes(checkTag)) {
                        accumulatedDebt += Number(rec.value);
                    }
                }
            }
        });

        const currentMonthObligations = expenseVariable + expenseFixed + installTotal;

        return {
            income: incomeTotal,
            expenseTotal: currentMonthObligations,
            accumulatedDebt: accumulatedDebt,
            balance: incomeTotal - currentMonthObligations,
            delayedTotal: delayedTotal
        };
    };

    const currentMonthData = getMonthData(activeTab);
    let previousSurplus = 0;
    const currentIndex = MONTHS.indexOf(activeTab);

    // 🟢 MÁQUINA DO TEMPO (EFEITO CASCATA REAL): Simula o extrato exato de cada mês
    for (let i = 0; i < currentIndex; i++) {
        const pastData = getMonthData(MONTHS[i]);

        // O fechamento do mês é o saldo gerado no mês + o saldo (positivo ou negativo) que veio do passado
        const fechamentoDoMes = pastData.balance + previousSurplus;

        // 🚀 A MÁGICA: Agora ele carrega TUDO para o mês seguinte!
        // Se sobrou, vai positivo. Se faltou (cheque especial), vai negativo.
        previousSurplus = fechamentoDoMes;
    }

    const displayBalance = currentMonthData.balance + previousSurplus;

    // Função para chamar a IA (Agora aceita arquivos!)
    // Função para chamar a IA (Agora aceita arquivos!)
    const askGemini = async (text: string, fileBase64: string | null = null) => {
        setIsAiLoading(true);

        const userMsg = { role: 'user', content: text, type: 'text' };
        setChatHistory(prev => [...prev, userMsg]);

        try {
            const myName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || "Investidor";

            const contextData = {
                saldo_atual: displayBalance,
                receita_mensal: currentMonthData.income,
                despesa_mensal: currentMonthData.expenseTotal,
                transacoes_do_mes: transactions.map(t => ({ ...t, date: t.date })),
                contas_fixas: recurring.filter(r => r.status === 'active' || r.status === 'standby'),
                parcelamentos_ativos: installments.filter(i => i.status === 'active' || i.status === 'standby'),
                mes_visualizado: activeTab,
                ano_visualizado: selectedYear,
                user_plan: userPlan,
                is_consultant: userPlan === 'agent',
                viewing_as_client: viewingAs?.client_id !== user?.id,
                client_name: viewingAs ? viewingAs.client_email : "Você",
                owner_name: myName
            };

            const images = fileBase64 ? [{ base64: fileBase64, mimeType: 'image/jpeg' }] : [];

            const historyForAi = chatHistory
                .filter(msg => msg.type === 'text')
                .map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'model',
                    parts: [{ text: msg.content }]
                }));

            // 🔴 1. PEGA O TOKEN DA SESSÃO ATUAL
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    // 🔴 2. ENVIA O CRACHÁ PARA O BACKEND
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    prompt: text,
                    contextData,
                    // 🟢 3. REMOVIDO: userPlan não vai mais no body, o backend busca direto do banco
                    images,
                    history: historyForAi,
                    selectedYear
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            let aiResponseText = data.response;

            // Tenta encontrar algo parecido com um Array JSON na resposta (mesmo se a IA mandar texto junto)
            const jsonMatch = aiResponseText.match(/\[\s*\{[\s\S]*\}\s*\]/);

            if (jsonMatch) {
                try {
                    // Limpa crases de markdown do bloco de código
                    let cleanJson = jsonMatch[0].replace(/```json/g, '').replace(/```/g, '').trim();
                    const commands = JSON.parse(cleanJson);
                    console.log("🕵️‍♂️ COMANDO DA IA:", commands);

                    if (Array.isArray(commands)) {
                        let actionsPerformed = 0;
                        let lastSavedItemName = "";
                        const activeId = getActiveUserId();
                        let analysisTextGenerated = "";

                        for (const cmd of commands) {
                            if (cmd.action === 'add') {
                                // 🔴 4. WHITELIST DE TABELAS (Proteção contra Injeção SQL pela IA)
                                const ALLOWED_TABLES = ['transactions', 'installments', 'recurring'];
                                if (!ALLOWED_TABLES.includes(cmd.table)) {
                                    console.warn(`🚨 Tabela bloqueada pela IA: ${cmd.table}`);
                                    continue; // Pula esse comando, é perigoso!
                                }

                                // 1. TRATAMENTO DE DATA E MÊS (Com Tradutor de Letras)
                                let finalDate = cmd.data.date;
                                const mapMes: any = { 'Jan': '01', 'Fev': '02', 'Mar': '03', 'Abr': '04', 'Mai': '05', 'Jun': '06', 'Jul': '07', 'Ago': '08', 'Set': '09', 'Out': '10', 'Nov': '11', 'Dez': '12' };

                                if (finalDate) {
                                    const parts = finalDate.split('/');
                                    if (parts.length >= 2) {
                                        let d = parts[0].padStart(2, '0');
                                        let m = parts[1];
                                        let y = parts.length === 3 ? parts[2] : selectedYear;

                                        if (isNaN(Number(m))) {
                                            const mFormatado = m.charAt(0).toUpperCase() + m.slice(1).toLowerCase();
                                            m = mapMes[mFormatado] || '01';
                                        } else {
                                            m = String(m).padStart(2, '0');
                                        }
                                        finalDate = `${d}/${m}/${y}`;
                                    }
                                } else if (cmd.data.target_month) {
                                    finalDate = `01/${mapMes[cmd.data.target_month] || '01'}/${selectedYear}`;
                                }

                                const safeData: any = {
                                    user_id: activeId,
                                    context: currentWorkspace?.id,
                                    title: cmd.data.title,
                                    type: cmd.data.type || 'expense',
                                    category: cmd.data.category || 'Outros',
                                    icon: cmd.data.icon || 'dollar-sign',
                                    status: cmd.data.status || 'active',
                                    is_paid: cmd.data.is_paid === true
                                };

                                // 🟢 AGORA ELE PROCURA O VALOR EM TODOS OS FORMATOS (Transação, Fixo ou Parcelado)
                                const extractedValue = parseFloat(cmd.data.amount) || parseFloat(cmd.data.value) || parseFloat(cmd.data.value_per_month) || parseFloat(cmd.data.total_value) || 0;

                                // 🔴 5. TRAVA DE VALOR ZERO (Evita criar gastos "fantasmas" de R$ 0,00)
                                if (extractedValue <= 0) {
                                    console.warn('⚠️ Valor inválido retornado pela IA, pulando insert.');
                                    continue;
                                }

                                if (cmd.table === 'transactions') {
                                    safeData.amount = extractedValue;
                                    safeData.date = finalDate;
                                    safeData.target_month = cmd.data.target_month || activeTab;
                                    safeData.is_paid = true;
                                    if (cmd.data.is_paid === true) safeData.is_paid = true;
                                }

                                if (cmd.table === 'installments') {
                                    const qtd = parseInt(cmd.data.installments_count) || 1;
                                    const perMonth = parseFloat(cmd.data.value_per_month) || extractedValue;

                                    safeData.total_value = cmd.data.total_value || (perMonth * qtd);
                                    safeData.installments_count = qtd;
                                    safeData.current_installment = 0;
                                    safeData.value_per_month = perMonth;
                                    safeData.due_day = parseInt(cmd.data.due_day) || 10;
                                    safeData.payment_method = cmd.data.payment_method || 'outros';
                                    safeData.paid_months = [];

                                    // 🔴 A CORREÇÃO ESTÁ AQUI: Removemos o is_paid que o banco não aceita nesta tabela
                                    delete safeData.is_paid;

                                    // Mantemos as outras remoções que já existiam
                                    delete safeData.start_date;
                                    delete safeData.amount;
                                    delete safeData.date;
                                    delete safeData.target_month;
                                    delete safeData.category;
                                    delete safeData.type;
                                }

                                if (cmd.table === 'recurring') {
                                    safeData.value = extractedValue;
                                    safeData.due_day = parseInt(cmd.data.due_day) || 10;
                                    safeData.start_date = finalDate;

                                    delete safeData.amount; delete safeData.date;
                                }

                                // Agora o insert está seguro!
                                const { error } = await supabase.from(cmd.table).insert([safeData]);

                                if (!error) {
                                    actionsPerformed++;
                                    lastSavedItemName = safeData.title;
                                } else {
                                    console.error("Erro detalhado Supabase:", JSON.stringify(error, null, 2));
                                }
                            }

                            else if (cmd.action === 'analyze') {
                                analysisTextGenerated = cmd.data.analysis_text;
                            }
                        }

                        if (actionsPerformed > 0) {
                            aiResponseText = `✅ Pronto! Lançado: **${lastSavedItemName}**. O que mais precisa?`;
                            if (user && activeId) loadData(activeId, currentWorkspace?.id);
                        } else if (analysisTextGenerated !== "") {
                            aiResponseText = analysisTextGenerated;
                        } else {
                            aiResponseText = `Ops, entendi o que você queria, mas deu um erro ao tentar executar a ação ou o valor era zero.`;
                        }
                    }
                } catch (e) {
                    console.error("Erro ao analisar JSON da IA", e);
                    aiResponseText = "Entendi o seu pedido, mas tive uma falha técnica ao tentar formatar a ação. Pode tentar falar de outro jeito?";
                }
            }

            setChatHistory(prev => [...prev, { role: 'assistant', content: aiResponseText, type: 'text' }]);

        } catch (error: any) {
            console.error("Erro na Requisição:", error);
            setChatHistory(prev => [...prev, { role: 'assistant', content: "Parece que minha conexão caiu. Tente de novo em alguns segundos.", type: 'error' }]);
        } finally {
            setIsAiLoading(false);
        }
    };

    // Helper simples para o mês
    const getMonthNum = (m: string) => {
        const map: any = { 'Jan': '01', 'Fev': '02', 'Mar': '03', 'Abr': '04', 'Mai': '05', 'Jun': '06', 'Jul': '07', 'Ago': '08', 'Set': '09', 'Out': '10', 'Nov': '11', 'Dez': '12' };
        return map[m] || '01';
    };

    // --- 1. DEFINIÇÃO DOS MODAIS DE AUTH (Para usar em ambas as telas) ---
    // Extraímos isso para uma variável para o código ficar limpo e funcionar na Landing Page também
    // --- 1. DEFINIÇÃO DOS MODAIS DE AUTH (CORRIGIDO) ---


    // --- 2. TELA DE CARREGAMENTO (LOADING STATE) ---
    if (isSessionLoading) {
        return (
            <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-4">
                <ShieldCheck className="text-cyan-500 animate-pulse" size={48} />
                <Loader2 className="text-gray-500 animate-spin" size={24} />
            </div>
        );
    }

    // --- 3. LANDING PAGE (SE NÃO TIVER USUÁRIO) ---
    // --- 3. LANDING PAGE (SE NÃO TIVER USUÁRIO) ---
    if (!user) {
        return (
            <>
                <LandingPage onLoginClick={() => {
                    setIsAuthModalOpen(true);
                    setAuthMode('login');
                    setShowEmailCheck(false);
                }} />

                {/* AQUI ESTÁ A CORREÇÃO: Usamos a tag <AuthModals /> em vez da variável {AuthModals} */}
                <AuthModals
                    isAuthModalOpen={isAuthModalOpen} setIsAuthModalOpen={setIsAuthModalOpen}
                    isChangePasswordOpen={isChangePasswordOpen} setIsChangePasswordOpen={setIsChangePasswordOpen}
                    isTermsOpen={isTermsOpen} setIsTermsOpen={setIsTermsOpen}
                    isPrivacyOpen={isPrivacyOpen} setIsPrivacyOpen={setIsPrivacyOpen}
                    authMode={authMode} setAuthMode={setAuthMode}
                    email={email} setEmail={setEmail}
                    password={password} setPassword={setPassword}
                    newPassword={newPassword} setNewPassword={setNewPassword}
                    termsAccepted={termsAccepted} setTermsAccepted={setTermsAccepted}
                    showEmailCheck={showEmailCheck} setShowEmailCheck={setShowEmailCheck}
                    handleAuth={handleAuth} handleResetPassword={handleResetPassword} handleUpdatePassword={handleUpdatePassword}
                    loadingAuth={loadingAuth} authMessage={authMessage}
                />
            </>
        );
    }

    // --- 4. DASHBOARD / SISTEMA (SE TIVER USUÁRIO) ---
    return (
        <div className={`min-h-screen p-4 md:p-8 font-sans relative transition-colors duration-500 ${getThemeClasses()}`}>

            {/* ... NAVBAR DO SISTEMA (Workspaces e Perfil) ... */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-1 flex gap-1">

                        {/* Botões das Workspaces */}
                        {workspaces.map(ws => (
                            <button key={ws.id} onClick={() => switchWorkspace(ws)} className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${currentWorkspace?.id === ws.id ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>
                                {currentWorkspace?.id === ws.id ? <Layers size={14} className="text-cyan-500" /> : null}
                                {ws.title}
                            </button>
                        ))}

                        <div className="w-px bg-gray-800 mx-1"></div>

                        {/* Botão de Adicionar Nova */}
                        <button onClick={() => setIsNewProfileModalOpen(true)} className="px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-800 hover:text-cyan-400 transition" title="Criar Novo Perfil">
                            <FolderPlus size={16} />
                        </button>

                        {/* NOVO: Botão de Excluir (Só aparece se tiver numa workspace selecionada que não seja a principal) */}
                        {currentWorkspace && currentWorkspace.id && (
                            <button
                                onClick={() => setIsDeleteWorkspaceModalOpen(true)}
                                className="px-3 py-2 rounded-lg text-gray-500 hover:bg-red-950/50 hover:text-red-500 transition"
                                title="Excluir este Perfil"
                            >
                                <Trash2 size={16} />
                            </button>
                        )}

                    </div>
                </div>
            </div>

            {/* MODAL DE EXCLUIR WORKSPACE */}
            {isDeleteWorkspaceModalOpen && currentWorkspace && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[300] p-4 animate-in zoom-in duration-200">
                    <div className="bg-[#111] border border-red-900/50 p-6 rounded-3xl w-full max-w-sm text-center shadow-2xl shadow-red-900/20 relative">
                        <button onClick={() => setIsDeleteWorkspaceModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition">
                            <X size={20} />
                        </button>

                        <div className="flex justify-center mb-4">
                            <div className="bg-red-500/20 p-4 rounded-full">
                                <Trash2 className="text-red-500" size={32} />
                            </div>
                        </div>

                        <h2 className="text-xl font-bold text-white mb-2">Excluir Perfil?</h2>
                        <p className="text-gray-400 text-sm mb-6">
                            Tem certeza que deseja apagar o perfil <strong>{currentWorkspace.title}</strong>? <br /><br />
                            <span className="text-red-400">Esta ação apagará todas as transações vinculadas a este perfil e não pode ser desfeita.</span>
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setIsDeleteWorkspaceModalOpen(false)}
                                disabled={isDeletingWorkspace}
                                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition"
                            >
                                Cancelar
                            </button>

                            <button
                                onClick={async () => {
                                    setIsDeletingWorkspace(true);
                                    try {
                                        // 1. (Opcional) Se o seu banco não tiver "Delete Cascade", você pode precisar apagar as transações primeiro:
                                        // await supabase.from('transactions').delete().eq('workspace_id', currentWorkspace.id);
                                        // await supabase.from('installments').delete().eq('workspace_id', currentWorkspace.id);

                                        // 2. Apaga a Workspace
                                        const { error } = await supabase
                                            .from('workspaces')
                                            .delete()
                                            .eq('id', currentWorkspace.id);

                                        if (error) throw error;

                                        toast.success("Perfil excluído com sucesso!");
                                        setIsDeleteWorkspaceModalOpen(false);

                                        // Volta para o perfil principal e recarrega
                                        window.location.reload();

                                    } catch (error: any) {
                                        console.error(error);
                                        toast.error("Erro ao excluir perfil: " + error.message);
                                    } finally {
                                        setIsDeletingWorkspace(false);
                                    }
                                }}
                                disabled={isDeletingWorkspace}
                                className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-red-900/20"
                            >
                                {isDeletingWorkspace ? <Loader2 className="animate-spin" size={18} /> : "Sim, Excluir"}
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* ... HEADER PRINCIPAL ... */}
            {/* ... HEADER PRINCIPAL (Visual Original + Travas Novas) ... */}
            <CalculatorModal
                isOpen={isCalculatorOpen}
                onClose={() => setIsCalculatorOpen(false)}
                transactions={transactions}
                installments={installments}
                recurring={recurring}
                activeTab={activeTab}
                selectedYear={selectedYear}
            />
            <DashboardHeader
                user={user}
                userPlan={userPlan}
                viewingAs={viewingAs}
                clients={clients}
                switchView={switchView}
                setIsClientModalOpen={setIsClientModalOpen}
                setIsHistoryOpen={setIsHistoryOpen}
                setIsExportModalOpen={setIsExportModalOpen}
                openPricingModal={openPricingModal}
                runTour={runTour}
                setIsProfileModalOpen={setIsProfileModalOpen}
                handleManageSubscription={handleManageSubscription}
                whatsappEnabled={whatsappEnabled}
                toggleWhatsappNotification={toggleWhatsappNotification}
                setIsCustomizationOpen={setIsCustomizationOpen}
                handleCheckout={handleCheckout}
                handleLogout={handleLogout}
                setIsAIOpen={setIsAIOpen}
                setIsCreditCardModalOpen={setIsCreditCardModalOpen}
                openNewTransactionModal={openNewTransactionModal}
                setIsCalculatorOpen={setIsCalculatorOpen}
                handleRemoveClient={handleRemoveClient}
                client={viewingAs}
                setIsImportOpen={setIsImportOpen}
                setIsTutorialOpen={setIsTutorialOpen}

            />
            <TabNavigation
                activeSection={activeSection}
                setActiveSection={setActiveSection}
                goalsCount={goals.length}
                onOpenAI={() => setIsAIOpen(true)}
            />
            <ImportModal
                isOpen={isImportOpen}
                onClose={() => setIsImportOpen(false)}
                userId={getActiveUserId() || user?.id} // Ajuste se seus nomes de variável forem diferentes
                workspaceId={currentWorkspace?.id}     // Ajuste se seus nomes de variável forem diferentes
                onSuccess={() => loadData(getActiveUserId(), currentWorkspace?.id)}
                supabase={supabase}
            />
            <OnboardingTutorial
                isOpen={isTutorialOpen}
                onClose={() => setIsTutorialOpen(false)}
            />


            {/* --- NOVO CARD DE PENDÊNCIAS (SÓ APARECE SE TIVER DÍVIDA) --- */}
            {currentMonthData.accumulatedDebt > 0 && (

                <div className="max-w-4xl mx-auto mb-6 animate-in slide-in-from-top-4">
                    <div className="bg-red-500/10 border border-red-500/50 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-[0_0_30px_rgba(220,38,38,0.2)]">
                        <div className="flex items-center gap-4">
                            <div className="bg-red-500 text-white p-3 rounded-xl">
                                <AlertTriangle size={24} />
                            </div>
                            <div>
                                <h3 className="text-red-400 font-bold text-sm uppercase tracking-wider">Contas Atrasadas (Acumulado)</h3>
                                <p className="text-2xl font-bold text-white">
                                    R$ {currentMonthData.accumulatedDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </p>
                                <p className="text-xs text-gray-400">Isso não desconta do seu saldo atual.</p>
                            </div>
                        </div>
                        <button
                            onClick={() => {
                                checkForPastDueItems(); // Força reabrir o modal para pagar
                                setIsRolloverModalOpen(true);
                            }}
                            className="bg-red-500 hover:bg-red-600 text-white px-6 py-2.5 rounded-xl font-bold transition shadow-lg text-sm whitespace-nowrap"
                        >
                            Resolver Agora
                        </button>
                    </div>
                </div>

            )}
            {/* --- RENDERIZAÇÃO DOS LAYOUTS (Sintaxe Corrigida) --- */}
            {/* =================================================================================
    CONTEÚDO DA ABA: DASHBOARD (FLUXO)
   ================================================================================= */}
            {activeSection === 'dashboard' && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">

                    <YearSelector
                        selectedYear={selectedYear}
                        setSelectedYear={setSelectedYear}
                    />


                    {/* LAYOUTS */}
                    {(currentLayout === 'standard') && (
                        <StandardView
                            selectedYear={selectedYear}

                            // ✅ Filtro de Transações: Mantém o filtro de data (para itens avulsos)
                            transactions={transactions.filter(t => t.date && t.date.endsWith(`/${selectedYear}`))}

                            // ✅ Filtro de Parcelas: PASSE PURO! O StandardView já faz o cálculo matemático
                            installments={installments}

                            recurring={recurring}
                            activeTab={activeTab}
                            months={MONTHS}
                            setActiveTab={setActiveTab}
                            currentMonthData={currentMonthData}
                            previousSurplus={previousSurplus}
                            displayBalance={displayBalance}
                            viewingAs={viewingAs}
                            onTogglePaid={togglePaid}
                            onToggleSkip={toggleSkipMonth}
                            onToggleDelay={toggleDelay}
                            onDelete={handleDelete}
                            onEdit={handleEdit}
                            onTogglePaidMonth={togglePaidMonth}
                            getReceipt={getReceiptForMonth}
                        />
                    )}

                    {(currentLayout === 'trader') && (
                        <TraderView
                            selectedYear={selectedYear} // <--- ADICIONE ISSO
                            transactions={transactions} // Sem filtro, o componente filtra
                            installments={installments}
                            recurring={recurring}
                            activeTab={activeTab} months={MONTHS} setActiveTab={setActiveTab}
                            currentMonthData={currentMonthData} previousSurplus={previousSurplus}
                            displayBalance={displayBalance}
                            onTogglePaid={togglePaid} onTogglePaidMonth={togglePaidMonth}
                            onToggleDelay={toggleDelay} onDelete={handleDelete}
                        />
                    )}

                    {(currentLayout === 'calendar') && (
                        <CalendarView
                            transactions={transactions}
                            installments={installments}
                            recurring={recurring}
                            activeTab={activeTab}
                            months={MONTHS}
                            setActiveTab={setActiveTab}
                            selectedYear={selectedYear} // <--- OBRIGATÓRIO ADICIONAR ISSO
                        />
                    )}

                    {(currentLayout === 'zen') && (
                        <ZenView
                            currentMonthData={currentMonthData}
                            displayBalance={displayBalance}
                            activeTab={activeTab}
                            months={MONTHS}
                            setActiveTab={setActiveTab}
                            selectedYear={selectedYear} // <--- ADICIONADO
                        />
                    )}

                    {(currentLayout === 'timeline') && (
                        <TimelineView
                            transactions={transactions}
                            installments={installments}
                            recurring={recurring}
                            activeTab={activeTab}
                            selectedYear={selectedYear} // <--- ADICIONE ISSO
                        />
                    )}

                    {(currentLayout === 'bento') && (
                        <BentoView
                            currentMonthData={currentMonthData}
                            transactions={transactions}
                            installments={installments}
                            recurring={recurring}
                            activeTab={activeTab}
                            selectedYear={selectedYear}
                            months={MONTHS}
                            onOpenCalendar={() => setCurrentLayout('calendar')}
                            // ✅ Ajustado para o nome correto da sua função:
                            onOpenRollover={() => setIsRolloverModalOpen(true)}
                            pastDueCount={pastDueItems.length}
                        />
                    )}


                    {/* --- MODAIS DE FUNCIONALIDADES --- */}
                    <ProfileModal
                        isOpen={isProfileModalOpen}
                        onClose={() => setIsProfileModalOpen(false)}
                        user={user}
                        userPlan={userPlan} // <--- ADICIONE ESTA LINHA
                    />

                    <ExportModal
                        isOpen={isExportModalOpen}
                        onClose={() => setIsExportModalOpen(false)}
                        user={user}
                        userPlan={userPlan}
                        clients={clients}
                        activeTab={activeTab}
                        selectedYear={selectedYear} // <--- OBRIGATÓRIO ADICIONAR ISSO
                        currentWorkspace={currentWorkspace}
                    />
                    <CreditCardModal isOpen={isCreditCardModalOpen} onClose={() => setIsCreditCardModalOpen(false)} user={user} activeTab={activeTab} contextId={currentWorkspace?.id} onSuccess={() => loadData(getActiveUserId(), currentWorkspace?.id)} />

                    <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} transactions={transactions} installments={installments} recurring={recurring} selectedYear={selectedYear} />

                    <CustomizationModal isOpen={isCustomizationOpen} onClose={() => setIsCustomizationOpen(false)} currentLayout={currentLayout} currentTheme={currentTheme} onSelectLayout={(l) => handleSavePreferences('layout', l)} onSelectTheme={(t) => handleSavePreferences('theme', t)} userPlan={userPlan} />


                </div>
            )}
            <GoalModal
                isOpen={isGoalModalOpen}
                onClose={() => setIsGoalModalOpen(false)}
                onSubmit={handleGoalSubmit}
                editingGoal={editingGoal}
            />
            <PricingModal
                isOpen={isPricingOpen}
                onClose={() => setIsPricingOpen(false)}
                handleCheckout={handleCheckout}
            />
            <TransactionForm
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                formMode={formMode}
                setFormMode={setFormMode}
                formData={formData}
                setFormData={setFormData}
                onSubmit={handleSubmit}
                editingId={editingId}
                uploadingFile={uploadingFile}
                handleFileUpload={handleFileUpload}
                handleRemoveReceipt={handleRemoveReceipt}
                userPlan={userPlan}
            />

            <AiAssistantModal
                isOpen={isAIOpen}
                onClose={() => setIsAIOpen(false)}
                chatHistory={chatHistory}
                isLoading={isAiLoading}
                onSendMessage={askGemini}
                userPlan={userPlan}
            />
            <AuthModals
                isAuthModalOpen={isAuthModalOpen} setIsAuthModalOpen={setIsAuthModalOpen}
                isChangePasswordOpen={isChangePasswordOpen} setIsChangePasswordOpen={setIsChangePasswordOpen}
                isTermsOpen={isTermsOpen} setIsTermsOpen={setIsTermsOpen}
                isPrivacyOpen={isPrivacyOpen} setIsPrivacyOpen={setIsPrivacyOpen}
                authMode={authMode} setAuthMode={setAuthMode}
                email={email} setEmail={setEmail}
                password={password} setPassword={setPassword}
                newPassword={newPassword} setNewPassword={setNewPassword}
                termsAccepted={termsAccepted} setTermsAccepted={setTermsAccepted}
                showEmailCheck={showEmailCheck} setShowEmailCheck={setShowEmailCheck}
                handleAuth={handleAuth} handleResetPassword={handleResetPassword} handleUpdatePassword={handleUpdatePassword}
                loadingAuth={loadingAuth} authMessage={authMessage}
            />



            {/* =================================================================================
    CONTEÚDO DA ABA: METAS (OBJETIVOS) - NOVA TELA EXCLUSIVA
   ================================================================================= */}
            {activeSection === 'goals' && (
                <GoalsView
                    goals={goals}
                    setIsGoalModalOpen={setIsGoalModalOpen}
                    setEditingGoal={setEditingGoal}
                    handleDeleteGoal={handleDeleteGoal}
                />
            )}


            {/* 🥶 MODAL DE ESCOLHA DO STAND-BY */}
            {standbyModal && standbyModal.isOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[999] p-4 animate-in fade-in zoom-in duration-200">
                    <div className="bg-[#0f0f10] border border-gray-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative">
                        <button onClick={() => setStandbyModal(null)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition">
                            <X size={20} />
                        </button>

                        <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 mx-auto ${standbyModal.isRestore ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'}`}>
                            <Clock size={32} />
                        </div>

                        <h3 className="text-xl font-bold text-center text-white mb-2">
                            {standbyModal.isRestore ? 'Restaurar Conta' : 'Congelar Conta'}
                        </h3>
                        <p className="text-gray-400 text-sm text-center mb-6">
                            {standbyModal.isRestore ? 'Como você quer restaurar a conta ' : 'Como você quer colocar a conta '}
                            "<span className="text-white font-bold">{standbyModal.item.title}</span>"?
                        </p>

                        <div className="space-y-3">
                            {standbyModal.isRestore ? (
                                <>
                                    {/* OPÇÕES DE RESTAURAR (VERDE) */}
                                    <button
                                        onClick={() => confirmDelayChoice(standbyModal.origin, standbyModal.item, 'restore_single')}
                                        className="w-full bg-gray-900 border border-gray-800 hover:border-emerald-500/50 text-white p-4 rounded-xl flex flex-col items-center justify-center gap-1 transition group"
                                    >
                                        <span className="font-bold group-hover:text-emerald-400 transition">Restaurar SÓ em {standbyModal.item._targetTag ? standbyModal.item._targetTag.split('/')[0] : activeTab}</span>
                                        <span className="text-xs text-gray-500 text-center">A conta volta a aparecer neste mês, mas continua congelada nos outros.</span>
                                    </button>
                                    <button
                                        onClick={() => confirmDelayChoice(standbyModal.origin, standbyModal.item, 'restore_global')}
                                        className="w-full bg-gray-900 border border-gray-800 hover:border-emerald-500/50 text-white p-4 rounded-xl flex flex-col items-center justify-center gap-1 transition group"
                                    >
                                        <span className="font-bold group-hover:text-emerald-400 transition">Restaurar para SEMPRE</span>
                                        <span className="text-xs text-gray-500 text-center">Remove o congelamento de todos os meses. A conta volta ao normal.</span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    {/* OPÇÕES DE CONGELAR (AZUL/VERMELHO) */}
                                    <button
                                        onClick={() => confirmDelayChoice(standbyModal.origin, standbyModal.item, 'single')}
                                        className="w-full bg-gray-900 border border-gray-800 hover:border-blue-500/50 text-white p-4 rounded-xl flex flex-col items-center justify-center gap-1 transition group"
                                    >
                                        <span className="font-bold group-hover:text-blue-400 transition">Apenas em {standbyModal.item._targetTag ? standbyModal.item._targetTag.split('/')[0] : activeTab}</span>
                                        <span className="text-xs text-gray-500 text-center">A fatura some este mês e o valor acumula para depois.</span>
                                    </button>
                                    <button
                                        onClick={() => confirmDelayChoice(standbyModal.origin, standbyModal.item, 'global')}
                                        className="w-full bg-gray-900 border border-gray-800 hover:border-red-500/50 text-white p-4 rounded-xl flex flex-col items-center justify-center gap-1 transition group"
                                    >
                                        <span className="font-bold group-hover:text-red-400 transition">Todos os meses futuros</span>
                                        <span className="text-xs text-gray-500 text-center">A conta inteira é paralisada e para de aparecer em todos os meses.</span>
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* 🧪 ALERTA E BOTÃO DO MODO SIMULAÇÃO */}
            {isSimulationMode ? (
                <div className="bg-purple-600 border border-purple-400 text-white p-3 rounded-2xl mb-6 shadow-xl shadow-purple-900/50 flex flex-col md:flex-row items-center justify-between gap-4 animate-in slide-in-from-top-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-white/20 p-2 rounded-full animate-pulse">🧪</div>
                        <div>
                            <h3 className="font-bold">Modo Simulação Ativado</h3>
                            <p className="text-xs text-purple-200">Marque e desmarque contas livremente para simular seu saldo. Nada está sendo salvo.</p>
                        </div>
                    </div>
                    <button onClick={toggleSimulationMode} className="bg-black/30 hover:bg-black/50 px-6 py-2 rounded-xl font-bold transition whitespace-nowrap">
                        Sair da Simulação
                    </button>
                </div>
            ) : (
                <div className="flex justify-end mb-4">
                    <button onClick={toggleSimulationMode} className="text-xs bg-purple-900/30 text-purple-400 hover:text-white border border-purple-900 hover:bg-purple-600 px-4 py-1.5 rounded-full transition flex items-center gap-2">
                        🧪 Entrar no Laboratório (Simular Saldo)
                    </button>
                </div>
            )}

            {/* MODAL DE PREÇOS (O QUE TINHA SUMIDO!) */}

            {/* MODAL DE PREÇOS (LIMPO E ATUALIZADO) */}

            {/* MODAL NOVO CLIENTE (CONSULTOR) */}
            {isClientModalOpen && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#111] border border-gray-800 p-6 rounded-3xl w-full max-w-sm">
                        <h3 className="text-lg font-bold text-white mb-4">Novo Cliente</h3>
                        <input type="email" placeholder="E-mail do cliente" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white outline-none mb-4" />
                        <div className="flex gap-2">
                            <button onClick={() => setIsClientModalOpen(false)} className="flex-1 bg-gray-800 text-white py-3 rounded-xl">Cancelar</button>
                            <button onClick={handleAddClient} disabled={addingClient} className="flex-1 bg-cyan-600 text-white py-3 rounded-xl font-bold">{addingClient ? '...' : 'Adicionar'}</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Formulário (Transaction) */}


            {/* MODAL NUDGE (CUTUCÃO DE AUTOMAÇÃO) */}
            {isNudgeOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[250] p-4 animate-in fade-in duration-300">
                    <div className="relative w-full max-w-sm bg-[#0f0f0f] border border-gray-800 rounded-3xl p-6 shadow-2xl overflow-hidden group">

                        {/* Efeito de Glow no fundo */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-cyan-500/20 rounded-full blur-[60px] pointer-events-none"></div>

                        {/* Botão Fechar */}
                        <button
                            onClick={() => setIsNudgeOpen(false)}
                            className="absolute top-3 right-3 p-2 text-gray-500 hover:text-white hover:bg-white/10 rounded-full transition z-20"
                        >
                            <X size={20} />
                        </button>

                        {/* Conteúdo */}
                        <div className="relative z-10 text-center flex flex-col items-center">

                            {/* Ícone Animado */}
                            <div className="w-16 h-16 bg-gradient-to-br from-cyan-900/50 to-blue-900/50 rounded-2xl flex items-center justify-center mb-5 border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                                <Sparkles size={32} className="text-cyan-400 animate-pulse" />
                            </div>

                            <h3 className="text-2xl font-black text-white mb-2">
                                Cansado de digitar?
                            </h3>

                            <p className="text-gray-400 text-sm mb-6 leading-relaxed px-2">
                                Você já fez <b>{addCounter} lançamentos</b> manuais hoje. <br />
                                Imagine mandar um áudio no <b>WhatsApp</b> e a IA lançar tudo sozinha para você?
                            </p>

                            {/* Botão Principal */}
                            <button
                                onClick={() => { setIsNudgeOpen(false); openPricingModal(); }}
                                className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-cyan-900/20 flex items-center justify-center gap-2 group-hover:scale-[1.02] active:scale-95"
                            >
                                <Zap size={18} className="fill-white" /> Quero Automatizar
                            </button>

                            {/* Botão Secundário (Psicológico) */}
                            <button
                                onClick={() => setIsNudgeOpen(false)}
                                className="mt-3 text-xs text-gray-600 hover:text-gray-400 transition"
                            >
                                Prefiro continuar digitando manualmente
                            </button>
                        </div>
                    </div>
                </div>
            )}


            {/* MODAL IA */}
            {/* MODAL DE CRIAR NOVA WORKSPACE (PERFIL) */}
            {isNewProfileModalOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-[300] p-4 animate-in zoom-in duration-200">
                    <div className="bg-[#111] border border-gray-800 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative">
                        <button
                            onClick={() => setIsNewProfileModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-500 hover:text-white transition"
                        >
                            <X size={20} />
                        </button>

                        <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                            <FolderPlus className="text-cyan-500" /> Novo Perfil
                        </h2>
                        <p className="text-gray-400 text-xs mb-6">
                            Crie um novo espaço (ex: Empresa, Projetos) para separar suas finanças.
                        </p>

                        <input
                            type="text"
                            value={newWorkspaceName}
                            onChange={(e) => setNewWorkspaceName(e.target.value)}
                            placeholder="Nome (ex: Empresa)"
                            className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none transition mb-6"
                            autoFocus
                        />

                        <button
                            onClick={handleCreateProfile} // 🟢 A fechadura foi instalada aqui!
                            disabled={isSavingWorkspace}
                            className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20"
                        >
                            {isSavingWorkspace ? <Loader2 className="animate-spin" size={18} /> : "Criar Perfil"}
                        </button>
                    </div>
                </div>
            )}


            {/* 🥶 MODAL DE RESOLVER PENDÊNCIAS */}
            {isRolloverModalOpen && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[300] p-6 animate-in zoom-in duration-300">
                    <div className="bg-[#111] border border-red-900/30 p-8 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6">
                                <AlertTriangle className="text-red-500" size={24} /> Pendências
                            </h2>

                            <div className="max-h-[250px] overflow-y-auto space-y-2 mb-6 pr-2 scrollbar-thin scrollbar-thumb-gray-800">
                                {pastDueItems.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-900/50 rounded-xl border border-gray-800">
                                        <div>
                                            <p className="text-white font-bold text-sm">{item.title}</p>
                                            {/* 🟢 CORREÇÃO: Puxando o mês da nova lógica */}
                                            <p className="text-xs text-gray-500 font-bold uppercase">{item._pastMonth || item.month}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            {/* 🟢 CORREÇÃO: Puxando o valor cravado */}
                                            <span className="text-white font-mono text-sm">
                                                R$ {Number(item._amount || item.amount || item.value || item.value_per_month).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </span>
                                            {/* 🟢 CORREÇÃO: O botão de adiar sabe exatamente a origem (transactions, etc) */}
                                            <button
                                                onClick={() => {
                                                    setIsRolloverModalOpen(false); // Fecha esse modal
                                                    toggleDelay(item._source || item.origin, item); // Abre o modal do Stand-by!
                                                }}
                                                className="text-xs bg-gray-800 text-gray-400 p-2 rounded-lg hover:text-orange-400 hover:bg-orange-500/10 transition"
                                                title="Adiar / Stand-by"
                                            >
                                                <LogOut size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <button onClick={handleMarkAllAsPaid} className="bg-emerald-600 hover:bg-emerald-500 transition text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95">
                                    <CheckSquare size={18} /> Já Paguei Tudo
                                </button>
                                <button onClick={() => setIsRolloverModalOpen(false)} className="bg-gray-800 hover:bg-gray-700 transition text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2 active:scale-95">
                                    <Clock size={18} /> Ver Depois
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Toaster richColors position="top-center" theme={currentTheme === 'light' ? 'light' : 'dark'} />
        </div>
    );
}