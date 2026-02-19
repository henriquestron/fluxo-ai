'use client';
import React, { useState, useEffect, useRef } from 'react';
import {
    CreditCard, TrendingDown, DollarSign, Plus, X, List, LayoutGrid, Sparkles, Send,
    Trash2, AlertCircle, CheckCircle2, Pencil, Clock, AlertTriangle, Check, LogIn,
    LogOut, User, Eye, EyeOff, CheckSquare, Square, ArrowRight, Crown, ShieldCheck, Edit2, Calendar,
    Mail, Loader2, Lock, BarChart3, Search, Target, Upload, FileText, ExternalLink,
    Users, ChevronDown, UserPlus, Briefcase, HelpCircle, Star, Zap, Shield, Palette,
    Layout, MousePointerClick, FolderPlus, Layers, FileSpreadsheet, Wallet, Landmark, Rocket, Paperclip, ChevronRight, ChevronLeft,
    ShoppingCart, Home, Car, Utensils, GraduationCap, HeartPulse, Plane, Gamepad2, Smartphone
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
import CreditCardModal from '@/components/dashboard/CreditCardModal'; // <--- IMPORTAÇÃO NOVA
import HistoryModal from '@/components/dashboard/HistoryModal'; // <--- Adicione lá em cima
import NotificationBell from '@/components/dashboard/NotificationBell';
import LandingPage from '@/components/LandingPage'; // <--- ADICIONE ISSO
import { MONTHS, STRIPE_PRICES, ACCOUNTS, ICON_MAP } from '@/utils/constants'; // <--- IMPORT NOVO
import PricingModal from '@/components/dashboard/PricingModal';
import TransactionForm from '@/components/dashboard/TransactionForm';
import AiAssistantModal from '@/components/dashboard/AiAssistantModal';
import AuthModals from '@/components/auth/AuthModals';
import DashboardHeader from '@/components/dashboard/DashboardHeader';
import GoalsView from '@/components/dashboard/GoalsView';
import TabNavigation from '@/components/dashboard/TabNavigation';
import YearSelector from '@/components/dashboard/YearSelector';
// COMPONENTES
import StandardView from '@/components/dashboard/StandardView';
import TraderView from '@/components/dashboard/TraderView';
import CustomizationModal from '@/components/dashboard/CustomizationModal';
import ZenView from '@/components/dashboard/ZenView';
import CalendarView from '@/components/dashboard/CalendarView';
import GoalModal from '@/components/dashboard/GoalModal'; // <--- ADICIONE ISSO
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
    const [isNewProfileModalOpen, setIsNewProfileModalOpen] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');

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
    const initialFormState = {
        title: '', amount: '', installments: '', dueDay: '', category: 'Outros', targetMonth: currentSystemMonthName, isFixedIncome: false, fixedMonthlyValue: '', receiptUrl: '', icon: '', paymentMethod: 'outros'
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

        // Filtra elementos que não existem na tela para não quebrar o tour
        finalSteps = finalSteps.filter(step => document.querySelector(step.element));

        // --- 3. EXECUÇÃO ---
        const driverObj = driverLib({
            showProgress: true,
            animate: true,
            allowClose: true,        // <--- Garante que o X funcione
            overlayClickNext: false, // Evita pular passos ao clicar fora (opcional)
            keyboardControl: true,   // Permite fechar com ESC

            // Textos dos botões
            nextBtnText: 'Próximo →',
            prevBtnText: '← Voltar',
            doneBtnText: 'Concluir 🚀',

            steps: finalSteps,

            // ⚠️ Removi o 'onDestroyStarted' que estava travando o fechamento
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

    const getReceiptForMonth = (item: any, month: string) => {
        // 1. Tenta pegar pela Tag Mês/Ano (Novo Padrão)
        const tag = `${month}/${selectedYear}`;
        if (item.receipts && item.receipts[tag]) {
            return item.receipts[tag];
        }

        // 2. Tenta pegar pela Tag Mês (Legado - para parcelas antigas de 2026)
        if (item.receipts && item.receipts[month]) {
            return item.receipts[month];
        }

        // 3. Fallback: Se for uma Despesa Avulsa (que só tem 1 data), usa o receipt_url antigo
        if (item.receipt_url && (!item.installments_count && !item.start_date)) {
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
        if (!user) { setIsNewProfileModalOpen(false); setIsAuthModalOpen(true); return; }

        // 🔒 TRAVA: Free e Start não podem ter múltiplos perfis. Apenas Premium e acima.
        if ((userPlan === 'free' || userPlan === 'start') && workspaces.length >= 1) {
            toast.error("Limite de Perfis", {
                description: "Para gerenciar múltiplas contas/perfis, faça o upgrade para o Premium."
            });
            setIsNewProfileModalOpen(false);
            openPricingModal();
            return;
        }

        if (!newProfileName) return;
        const { data } = await supabase.from('workspaces').insert({ user_id: user.id, title: newProfileName }).select().single();
        if (data) {
            setWorkspaces([...workspaces, data]);
            setCurrentWorkspace(data);
            setNewProfileName('');
            setIsNewProfileModalOpen(false);
            setTransactions([]); setInstallments([]); setRecurring([]);
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

        const monthMap: Record<number, string> = {
            0: 'Jan', 1: 'Fev', 2: 'Mar', 3: 'Abr', 4: 'Mai', 5: 'Jun',
            6: 'Jul', 7: 'Ago', 8: 'Set', 9: 'Out', 10: 'Nov', 11: 'Dez'
        };
        const currentMonthName = monthMap[today.getMonth()];

        // 🔥 NOVA TAG: Agora buscamos por "Jan/2026"
        const currentPaymentTag = `${currentMonthName}/${currentYear}`;

        // 2. Identificar contas vencendo HOJE (Lógica Corrigida)
        const billsDueToday = [
            // Transações: Filtra pelo dia/mês E pelo ano atual
            ...transactions.filter(t =>
                t.type === 'expense' &&
                !t.is_paid &&
                t.status !== 'delayed' &&
                t.status !== 'standby' &&
                t.date?.startsWith(`${dayStr}/`) &&
                t.date?.endsWith(`/${currentYear}`)
            ),

            // Recorrentes: Checa a nova tag de pagamento (Ex: Jan/2026)
            ...recurring.filter(r =>
                r.type === 'expense' &&
                r.due_day === dayNum &&
                r.status !== 'delayed' &&
                r.status !== 'standby' &&
                !r.paid_months?.includes(currentPaymentTag) && // <-- Check corrigido
                !r.paid_months?.includes(currentMonthName)     // <-- Check legado (opcional)
            ),

            // Parcelas: Checa a nova tag de pagamento
            ...installments.filter(i =>
                i.due_day === dayNum &&
                i.status !== 'delayed' &&
                i.status !== 'standby' &&
                !i.paid_months?.includes(currentPaymentTag) // <-- Check corrigido
            )
        ];

        // Se não tiver contas hoje, encerra.
        if (billsDueToday.length === 0) return;

        // 3. VERIFICAÇÃO DE SEGURANÇA (Anti-Duplicidade)
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const startOfDayISO = startOfDay.toISOString();

        const { data: existingNotifs } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', userId)
            .eq('title', 'Contas Vencendo Hoje! 💸')
            .gte('created_at', startOfDayISO)
            .limit(1);

        if (existingNotifs && existingNotifs.length > 0) {
            console.log("🔕 Notificação diária já enviada. Ignorando...");
            return;
        }

        // 4. Criação da Notificação e disparo do WhatsApp
        const messageSignature = `Você tem ${billsDueToday.length} conta(s) para pagar hoje. Não esqueça!`;

        const { error } = await supabase.from('notifications').insert({
            user_id: userId,
            title: 'Contas Vencendo Hoje! 💸',
            message: messageSignature,
            type: 'warning',
            is_read: false
        });

        if (!error) {
            toast.warning("Atenção: Contas Vencendo Hoje!", {
                description: messageSignature,
                duration: 5000,
                icon: <AlertTriangle className="text-orange-500" />
            });

            console.log("📤 Enviando comando para WhatsApp...");
            fetch('/api/check-notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId,
                    bills: billsDueToday,
                    forceSend: false // <-- Adicione isso para ignorar a trava da API
                })
            })
                .then(res => res.json())
                .then(data => {
                    if (data.success) console.log("✅ WhatsApp enviado!");
                    else console.log("⚠️ WhatsApp ignorado:", data.reason);
                })
                .catch(err => console.error("❌ Erro API WhatsApp:", err));
        }
    };

    const fetchClients = async (managerId: string) => {
        const { data } = await supabase.from('manager_clients').select('*').eq('manager_id', managerId);
        if (data) setClients(data);
    };

    const handleAddClient = async () => {
        if (!newClientEmail) return toast.warning("Digite o e-mail do cliente.");
        setAddingClient(true);
        const { error } = await supabase.from('manager_clients').insert({ manager_id: user.id, client_email: newClientEmail, status: 'active' });
        if (error) { toast.error("Erro ao adicionar: " + error.message); }
        else {
            setNewClientEmail('');
            setIsClientModalOpen(false);
            fetchClients(user.id);
            toast.success("Cliente adicionado com sucesso! 🎉");
        }
        setAddingClient(false);
    };

    const switchView = async (client: any | null) => {
        setViewingAs(client);
        const targetUserId = client ? client.client_id : user?.id;
        if (targetUserId) { await fetchWorkspaces(targetUserId, true); }
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

    const checkForPastDueItems = () => {
        // 🔒 TRAVA DE SESSÃO: Se já mostrou nesta sessão, não mostra de novo
        if (sessionStorage.getItem('hasShownRollover')) return;

        const now = new Date();
        const currentRealMonth = now.getMonth();
        const currentRealYear = now.getFullYear();
        const todayDay = now.getDate();

        const overdueItems: any[] = [];

        // Helper de Data
        const getStartData = (item: any) => {
            if (item.date && item.date.includes('/')) {
                const p = item.date.split('/');
                return { d: parseInt(p[0]), m: parseInt(p[1]) - 1, y: parseInt(p[2]) };
            } else if (item.created_at) {
                const d = new Date(item.created_at);
                return { d: d.getDate(), m: d.getMonth(), y: d.getFullYear() };
            }
            return { d: 1, m: 0, y: currentRealYear };
        };

        // 1. Transações
        transactions.forEach(t => {
            if (t.type === 'expense' && !t.is_paid && t.status !== 'delayed' && t.status !== 'standby') {
                const { m, y } = getStartData(t);
                if (y < currentRealYear || (y === currentRealYear && m < currentRealMonth)) {
                    overdueItems.push({ ...t, origin: 'transactions', month: `${MONTHS[m]}/${y}` });
                }
            }
        });

        // 2. Parcelas
        installments.forEach(inst => {
            if (inst.status !== 'delayed' && inst.status !== 'standby') {
                const { d: startDay, m: startMonth, y: startYear } = getStartData(inst);
                const monthsDiff = ((currentRealYear - startYear) * 12) + (currentRealMonth - startMonth);

                for (let i = 0; i <= monthsDiff; i++) {
                    const checkInstNumber = 1 + (inst.current_installment || 0) + i;
                    if (checkInstNumber >= 1 && checkInstNumber <= inst.installments_count) {
                        const absMonthIndex = startMonth + i;
                        const checkYear = startYear + Math.floor(absMonthIndex / 12);
                        const checkMonthIndex = absMonthIndex % 12;

                        if (checkYear > currentRealYear || (checkYear === currentRealYear && checkMonthIndex > currentRealMonth)) continue;
                        if (checkYear === currentRealYear && checkMonthIndex === currentRealMonth && todayDay < inst.due_day) continue;

                        const checkMonthName = MONTHS[checkMonthIndex];
                        if (!inst.paid_months?.includes(checkMonthName)) {
                            const alreadyAdded = overdueItems.find(o => o.id === inst.id && o.origin === 'installments');
                            if (!alreadyAdded) overdueItems.push({ ...inst, origin: 'installments', month: `${checkMonthName}/${checkYear}`, amount: inst.value_per_month });
                        }
                    }
                }
            }
        });

        if (overdueItems.length > 0) {
            setPastDueItems(overdueItems);
            setTimeout(() => {
                setIsRolloverModalOpen(true);
                sessionStorage.setItem('hasShownRollover', 'true'); // ✅ Marca como visto
            }, 1500);
        }
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
        const priceId = STRIPE_PRICES[planType];
        try {
            const response = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, email: user.email, priceId }), });
            const data = await response.json();
            if (data.url) window.location.href = data.url; else toast.error("Erro ao criar pagamento.");
        } catch (e) { toast.error("Erro de conexão. Tente novamente."); }
        if (btn) btn.innerText = "Assinar Agora";
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
        const activeId = getActiveUserId();
        if (user && activeId) { await supabase.from(table).delete().eq('id', id); loadData(activeId, currentWorkspace?.id); }
        else {
            if (table === 'transactions') saveDataLocal(transactions.filter(t => t.id !== id), installments, recurring);
            else if (table === 'installments') saveDataLocal(transactions, installments.filter(i => i.id !== id), recurring); else saveDataLocal(transactions, installments, recurring.filter(r => r.id !== id));
        }
    };

    const togglePaid = async (table: string, id: number, currentStatus: boolean) => {
        const activeId = getActiveUserId();
        if (user && activeId) { await supabase.from(table).update({ is_paid: !currentStatus }).eq('id', id); loadData(activeId, currentWorkspace?.id); }
        else {
            const updateList = (list: any[]) => list.map(i => i.id === id ? { ...i, is_paid: !currentStatus } : i);
            if (table === 'transactions') saveDataLocal(updateList(transactions), installments, recurring);
        }
    };

    // --- FUNÇÕES DO ROLLOVER (ITEM 7 REFINADO) ---

    // 1. Marcar TUDO como pago (Esqueci de dar baixa)
    const handleMarkAllAsPaid = async () => {
        if (!confirm(`Confirmar pagamento de ${pastDueItems.length} contas atrasadas?`)) return;

        const activeId = getActiveUserId();
        if (!activeId) return;

        const toastId = toast.loading("Atualizando contas...");

        for (const item of pastDueItems) {
            if (item.origin === 'transactions') {
                // Transação simples: marca is_paid = true
                await supabase.from('transactions').update({ is_paid: true }).eq('id', item.id);
            }
            else if (item.origin === 'installments' || item.origin === 'recurring') {
                // Parcelas/Fixas: Adiciona o nome do mês ao array de pagos
                // item.month vem no formato "Fev" ou "Fev/2026" do modal
                const monthName = item.month.includes('/') ? item.month.split('/')[0] : item.month;

                // Busca o array atual para não perder dados
                const currentPaid = item.paid_months || [];

                // Só adiciona se já não estiver lá
                if (!currentPaid.includes(monthName)) {
                    const newPaidList = [...currentPaid, monthName];
                    const table = item.origin === 'installments' ? 'installments' : 'recurring';
                    await supabase.from(table).update({ paid_months: newPaidList }).eq('id', item.id);
                }
            }
        }

        toast.dismiss(toastId);
        toast.success("Tudo em dia! Você é incrível. 🚀");
        setPastDueItems([]); // Limpa a lista visualmente
        setIsRolloverModalOpen(false);
        loadData(activeId, currentWorkspace?.id);
    };

    // 2. Calcular o Total Atrasado
    const totalPastDue = pastDueItems.reduce((acc, item) => {
        const val = item.amount || item.value || item.value_per_month || 0;
        return acc + val;
    }, 0);

    const toggleDelay = async (origin: string, item: any) => {
        // Mapeia a "origin" do modal para o nome real da tabela no banco
        const tableMap: Record<string, string> = {
            'transactions': 'transactions',
            'installments': 'installments',
            'recurring': 'recurring'
        };
        const table = tableMap[origin] || origin;

        // Se já está delayed ou standby, volta para active. Senão, vira standby.
        const newStatus = (item.status === 'delayed' || item.status === 'standby') ? 'active' : 'standby';
        const activeId = getActiveUserId();

        if (user && activeId) {
            await supabase.from(table).update({ status: newStatus }).eq('id', item.id);
            // Recarrega os dados para atualizar o Card de Standby e os Totais
            loadData(activeId, currentWorkspace?.id);
        }

        // Remove visualmente do Modal de Pendências imediatamente
        if (isRolloverModalOpen) {
            setPastDueItems(prev => prev.filter(i => i.id !== item.id || i.origin !== origin));
            // Se acabar os itens, fecha o modal
            if (pastDueItems.length <= 1) setIsRolloverModalOpen(false);
        }

        toast.success(newStatus === 'active' ? "Reativado!" : "Movido para Stand-by (Não soma no total)");
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

        // AGORA SALVAMOS: "Mar/2026" ao invés de só "Mar"
        // Isso impede que o pagamento de um ano conte para o outro
        const monthTag = `${activeTab}/${selectedYear}`;

        let newPaidList;

        // Verifica se já tem a tag exata "Mar/2026"
        if (currentPaid.includes(monthTag)) {
            // Se tem, remove (desmarcar)
            newPaidList = currentPaid.filter((m: string) => m !== monthTag);
        } else {
            // Se não tem, adiciona
            newPaidList = [...currentPaid, monthTag];

            // LIMPEZA LEGADA: Remove tags antigas sem ano (ex: "Mar") para não dar conflito
            // Isso conserta automaticamente dados velhos quando você clica
            newPaidList = newPaidList.filter((m: string) => m !== activeTab);
        }

        const activeId = getActiveUserId();
        if (user && activeId) {
            await supabase.from(table).update({ paid_months: newPaidList }).eq('id', item.id);
            loadData(activeId, currentWorkspace?.id);
        } else {
            // Modo offline (se estiver usando)
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

        const dayValue = formData.dueDay ? formData.dueDay.toString().padStart(2, '0') : '01';
        const monthValue = monthMapNums[formData.targetMonth] || '01';

        // Criamos uma data no formato ISO (YYYY-MM-DD) para o banco aceitar no created_at
        // Usamos 12:00:00 para evitar problemas de fuso horário que jogam a data para o dia anterior
        const isoDateForDatabase = `${selectedYear}-${monthValue}-${dayValue}T12:00:00Z`;
        const dateStringBR = `${dayValue}/${monthValue}/${selectedYear}`;

        // 2. Lógica de Comprovantes (Preservando o que você já tem)
        let originalItem: any = null;
        if (editingId) {
            originalItem = transactions.find(t => t.id === editingId) ||
                installments.find(i => i.id === editingId) ||
                recurring.find(r => r.id === editingId);
        }

        let updatedReceipts = { ...(originalItem?.receipts || {}) };
        const tag = `${formData.targetMonth}/${selectedYear}`;

        if (formData.receiptUrl) {
            updatedReceipts[tag] = formData.receiptUrl;
        } else if (!editingId) {
            // Se for novo e não tiver URL, limpa
            updatedReceipts = {};
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
                receipt_url: formData.receiptUrl || (originalItem?.receipt_url || null)
            };

            // --- RECEITAS ---
            if (formMode === 'income') {
                return formData.isFixedIncome
                    ? { table: 'recurring', data: { ...base, value: amountVal, due_day: 1, category: 'Salário', type: 'income', status: 'active', created_at: isoDateForDatabase } }
                    : { table: 'transactions', data: { ...base, amount: amountVal, type: 'income', date: dateStringBR, category: 'Receita', target_month: formData.targetMonth, status: 'active', created_at: isoDateForDatabase } };
            }

            // --- DESPESAS AVULSAS ---
            if (formMode === 'expense') {
                return { table: 'transactions', data: { ...base, amount: amountVal, type: 'expense', date: dateStringBR, category: formData.category, target_month: formData.targetMonth, status: 'active', created_at: isoDateForDatabase } };
            }

            // --- PARCELAMENTOS (LÓGICA ADAPTADA) ---
            if (formMode === 'installment') {
                const qtd = parseInt(formData.installments.toString()) || 1;
                // Prioriza o valor mensal se preenchido, senão divide o total
                const valuePerMonth = fixedVal > 0 ? fixedVal : (amountVal / qtd);
                const totalValue = amountVal > 0 ? amountVal : (valuePerMonth * qtd);

                return {
                    table: 'installments',
                    data: {
                        ...base,
                        total_value: totalValue,
                        installments_count: qtd,
                        current_installment: 0, // 0 significa que no mês da "created_at" ele será 1
                        value_per_month: valuePerMonth,
                        due_day: parseInt(formData.dueDay.toString()) || 10,
                        status: 'active',
                        // Como você não tem start_date, forçamos o created_at para o mês de início
                        created_at: isoDateForDatabase
                    }
                };
            }

            // --- DESPESAS FIXAS ---
            return { table: 'recurring', data: { ...base, value: amountVal, due_day: parseInt(formData.dueDay.toString()) || 10, category: formData.category || 'Fixa', type: 'expense', status: 'active', created_at: isoDateForDatabase } };
        };

        const { table, data } = getPayload();

        // 4. Execução no Supabase
        try {
            let result;
            if (editingId) {
                // Verifica se mudou de tabela ao editar
                const originalTable = transactions.find(t => t.id === editingId) ? 'transactions' : (installments.find(i => i.id === editingId) ? 'installments' : 'recurring');

                if (originalTable !== table) {
                    await supabase.from(originalTable).delete().eq('id', editingId);
                    result = await supabase.from(table).insert([data]);
                } else {
                    result = await supabase.from(table).update(data).eq('id', editingId);
                }
            } else {
                result = await supabase.from(table).insert([data]);
            }

            if (result.error) throw result.error;

            toast.success("Dados salvos com sucesso!");
            setIsFormOpen(false);
            setEditingId(null);

            // Recarrega os dados para atualizar a tela
            if (activeId) loadData(activeId, context);

        } catch (error: any) {
            console.error("Erro ao salvar:", error);
            toast.error("Erro ao salvar: " + error.message);
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

        // Tag de pagamento atual (ex: "Jan/2027")
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

        // 1. RECORRENTES (CORREÇÃO DO BUG DE JANEIRO 2027)
        const activeRecurring = recurring.filter(r => {
            if (r.status === 'standby' || r.status === 'delayed') return false;

            const { m: startMonth, y: startYear } = getStartData(r);

            // CASO 1: Ano selecionado é MAIOR que o início (Ex: 2027 > 2026)
            // MOSTRA SEMPRE! Não importa se é Janeiro e a conta é de Março/26.
            if (selectedYear > startYear) return true;

            // CASO 2: Mesmo ano (Ex: 2026 == 2026)
            // Mostra só se o mês já chegou
            if (selectedYear === startYear && monthIndex >= startMonth) return true;

            return false;
        });

        // Helper para checar pagamento (Compatibilidade: checa "Mar/2026" OU "Mar")
        const isPaid = (item: any, tag: string) => {
            if (!item.paid_months) return false;
            // Prioriza a tag com ano. Se não tiver ano salvo, aceita a tag simples (legado)
            return item.paid_months.includes(tag) || item.paid_months.includes(tag.split('/')[0]);
        };

        // --- CÁLCULO DE ENTRADAS ---
        const incomeFixed = activeRecurring.filter(r => r.type === 'income' && !r.skipped_months?.includes(monthName)).reduce((acc, curr) => acc + Number(curr.value), 0);
        const incomeVariable = transactions.filter(t => t.type === 'income' && t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby').reduce((acc, curr) => acc + Number(curr.amount), 0);
        const incomeTotal = incomeFixed + incomeVariable;

        // --- CÁLCULO DE SAÍDAS DO MÊS ---
        const expenseFixed = activeRecurring.filter(r => r.type === 'expense' && !r.skipped_months?.includes(monthName)).reduce((acc, curr) => acc + Number(curr.value), 0);
        const expenseVariable = transactions.filter(t => t.type === 'expense' && t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby').reduce((acc, curr) => acc + Number(curr.amount), 0);

        const installTotal = installments.reduce((acc, curr) => {
            if (curr.status === 'delayed' || curr.status === 'standby') return acc;
            const { m: startMonth, y: startYear } = getStartData(curr);
            const monthsDiff = ((selectedYear - startYear) * 12) + (monthIndex - startMonth);
            const currentInstNum = 1 + (curr.current_installment || 0) + monthsDiff;

            if (currentInstNum >= 1 && currentInstNum <= curr.installments_count) {
                return acc + Number(curr.value_per_month);
            }
            return acc;
        }, 0);

        // --- STAND-BY ---
        const delayedTotal =
            transactions.filter(t => t.status === 'delayed' || t.status === 'standby').reduce((acc, curr) => acc + Number(curr.amount), 0) +
            installments.filter(i => i.status === 'delayed' || i.status === 'standby').reduce((acc, curr) => acc + (Number(curr.value_per_month) || Number(curr.value) || 0), 0) +
            recurring.filter(r => (r.status === 'delayed' || r.status === 'standby') && r.type === 'expense').reduce((acc, curr) => acc + Number(curr.value), 0);

        // --- DÍVIDA ACUMULADA ---
        let accumulatedDebt = 0;

        // A. Transações
        transactions.forEach(t => {
            if (t.type === 'expense' && !t.is_paid && t.status !== 'standby' && t.status !== 'delayed') {
                const { m, y } = getStartData(t);
                if (y < selectedYear || (y === selectedYear && m < monthIndex)) {
                    accumulatedDebt += Number(t.amount);
                }
            }
        });

        // B. Parcelas
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

                        // Checa se está pago usando ANO (Ex: Mar/2026)
                        const paymentTag = `${pMonthName}/${pYear}`;
                        if (!isPaid(inst, paymentTag)) {
                            accumulatedDebt += Number(inst.value_per_month);
                        }
                    }
                }
            }
        });

        // C. RECORRENTES (Correção do Loop)
        recurring.forEach(rec => {
            if (rec.type === 'expense' && rec.status !== 'standby' && rec.status !== 'delayed') {
                const { m: startMonth, y: startYear } = getStartData(rec);
                const totalMonthsSinceStart = ((selectedYear - startYear) * 12) + (monthIndex - startMonth);

                for (let i = 0; i < totalMonthsSinceStart; i++) {
                    const absMonthIndex = startMonth + i;
                    const checkYear = startYear + Math.floor(absMonthIndex / 12);
                    const checkMonthName = MONTHS[absMonthIndex % 12];
                    const checkTag = `${checkMonthName}/${checkYear}`;

                    if (!isPaid(rec, checkTag) && !rec.skipped_months?.includes(checkMonthName)) {
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
    if (currentIndex > 0) { const prevData = getMonthData(MONTHS[currentIndex - 1]); if (prevData.balance > 0) previousSurplus = prevData.balance; }
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
                transacoes_do_mes: transactions.slice(0, 15).map(t => ({ ...t, date: t.date })),
                contas_fixas: recurring.filter(r => r.status === 'active'),
                parcelamentos_ativos: installments.filter(i => i.status === 'active'),
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

            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: text,
                    contextData,
                    userPlan,
                    images,
                    history: historyForAi,
                    selectedYear
                })
            });

            const data = await response.json();
            if (data.error) throw new Error(data.error);

            let aiResponseText = data.response;
            const jsonMatch = aiResponseText.match(/\[[\s\S]*\]/);

            if (jsonMatch) {
                try {
                    let cleanJson = jsonMatch[0].replace(/```json/g, '').replace(/```/g, '').trim();
                    const commands = JSON.parse(cleanJson);

                    if (Array.isArray(commands)) {
                        let actionsPerformed = 0;
                        const activeId = getActiveUserId();

                        for (const cmd of commands) {
                            if (cmd.action === 'add') {
                                // 1. TRATAMENTO DE DATA
                                let finalDate = cmd.data.date;
                                if (finalDate && finalDate.split('/').length === 2) finalDate = `${finalDate}/${selectedYear}`;
                                if (!finalDate && cmd.data.target_month) {
                                    const map: any = { 'Jan': '01', 'Fev': '02', 'Mar': '03', 'Abr': '04', 'Mai': '05', 'Jun': '06', 'Jul': '07', 'Ago': '08', 'Set': '09', 'Out': '10', 'Nov': '11', 'Dez': '12' };
                                    finalDate = `01/${map[cmd.data.target_month] || '01'}/${selectedYear}`;
                                }

                                // 2. WHITELIST (Só passa o que o banco aceita)
                                // Isso remove campos alucinados pela IA como "is_paid", "confidence", etc.
                                const safeData: any = {
                                    user_id: activeId,
                                    context: currentWorkspace?.id,
                                    title: cmd.data.title,
                                    amount: cmd.data.amount || cmd.data.value || 0, // Aceita value ou amount
                                    type: cmd.data.type,
                                    category: cmd.data.category || 'Outros',
                                    icon: cmd.data.icon || 'dollar-sign',
                                    status: cmd.data.status || 'active'
                                };

                                // Campos específicos por tabela
                                if (cmd.table === 'transactions') {
                                    safeData.date = finalDate;
                                    safeData.target_month = cmd.data.target_month || activeTab;
                                    // Se a IA mandou 'paid', garantimos que o status seja 'paid'
                                    if (cmd.data.is_paid === true) safeData.is_paid = true; // Só inclui se sua tabela tiver essa coluna, se não tiver, REMOVA essa linha.
                                    // Se sua tabela usa APENAS o campo 'status'='paid', use esta linha:
                                    // if (cmd.data.is_paid === true || cmd.data.status === 'paid') safeData.status = 'paid';
                                }

                                if (cmd.table === 'installments') {
                                    safeData.total_value = cmd.data.total_value || (safeData.amount * (cmd.data.installments_count || 1));
                                    safeData.installments_count = cmd.data.installments_count || 1;
                                    safeData.current_installment = 0; // Sempre começa do 0
                                    safeData.value_per_month = cmd.data.value_per_month || safeData.amount;
                                    safeData.due_day = parseInt(cmd.data.due_day) || 10;
                                    // Removemos amount da tabela installments se ela não tiver essa coluna específica
                                    delete safeData.amount;
                                }

                                if (cmd.table === 'recurring') {
                                    safeData.value = safeData.amount; // Recurring usa 'value'
                                    delete safeData.amount;
                                    safeData.due_day = parseInt(cmd.data.due_day) || 10;
                                    safeData.start_date = finalDate; // Recurring usa start_date
                                }

                                // 3. INSERÇÃO
                                const { error } = await supabase.from(cmd.table).insert([safeData]);

                                if (!error) {
                                    actionsPerformed++;
                                } else {
                                    console.error("Erro detalhado Supabase:", JSON.stringify(error, null, 2)); // Log detalhado
                                }
                            }
                        }

                        if (actionsPerformed > 0) {
                            aiResponseText = `✅ Pronto! Adicionei ${actionsPerformed} item(s) com sucesso.`;
                            if (user && activeId) loadData(activeId, currentWorkspace?.id);
                        }
                    }
                } catch (e) {
                    console.error("Erro JSON IA", e);
                }
            }

            setChatHistory(prev => [...prev, { role: 'assistant', content: aiResponseText, type: 'text' }]);

        } catch (error: any) {
            console.error(error);
            setChatHistory(prev => [...prev, { role: 'assistant', content: "Erro técnico.", type: 'error' }]);
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
                        {workspaces.map(ws => (
                            <button key={ws.id} onClick={() => switchWorkspace(ws)} className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${currentWorkspace?.id === ws.id ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>
                                {currentWorkspace?.id === ws.id ? <Layers size={14} className="text-cyan-500" /> : null}
                                {ws.title}
                            </button>
                        ))}
                        <button onClick={() => setIsNewProfileModalOpen(true)} className="px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-800 hover:text-white transition" title="Criar Novo Perfil"><FolderPlus size={14} /></button>
                    </div>
                </div>
            </div>

            {/* ... HEADER PRINCIPAL ... */}
            {/* ... HEADER PRINCIPAL (Visual Original + Travas Novas) ... */}
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
            />
            <TabNavigation
                activeSection={activeSection}
                setActiveSection={setActiveSection}
                goalsCount={goals.length}
                onOpenAI={() => setIsAIOpen(true)}
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


            {isRolloverModalOpen && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[300] p-6 animate-in zoom-in duration-300">
                    <div className="bg-[#111] border border-red-900/30 p-8 rounded-3xl w-full max-w-lg shadow-2xl relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-6"><AlertTriangle className="text-red-500" size={24} /> Pendências</h2>
                            <div className="max-h-[250px] overflow-y-auto space-y-2 mb-6 pr-2 scrollbar-thin scrollbar-thumb-gray-800">
                                {pastDueItems.map((item, idx) => (
                                    <div key={idx} className="flex justify-between items-center p-3 bg-gray-900/50 rounded-xl border border-gray-800">
                                        <div><p className="text-white font-bold text-sm">{item.title}</p><p className="text-xs text-gray-500">{item.month}</p></div>
                                        <div className="flex items-center gap-3"><span className="text-white font-mono text-sm">R$ {(item.amount || item.value || item.value_per_month).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span><button onClick={() => toggleDelay(item.origin, item)} className="text-xs bg-gray-800 text-gray-400 p-2 rounded-lg hover:text-orange-400"><LogOut size={14} /></button></div>
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <button onClick={handleMarkAllAsPaid} className="bg-emerald-600 text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2"><CheckSquare size={18} /> Já Paguei Tudo</button>
                                <button onClick={() => setIsRolloverModalOpen(false)} className="bg-gray-800 text-white py-3 px-4 rounded-xl font-bold flex items-center justify-center gap-2"><Clock size={18} /> Ver Depois</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <Toaster richColors position="top-center" theme={currentTheme === 'light' ? 'light' : 'dark'} />
        </div>
    );
}