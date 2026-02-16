'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
    CreditCard, TrendingDown, DollarSign, Plus, X, List, LayoutGrid, Sparkles, Send,
    Trash2, AlertCircle, CheckCircle2, Pencil, Clock, AlertTriangle, Check, LogIn,
    LogOut, User, Eye, EyeOff, CheckSquare, Square, ArrowRight, Crown, ShieldCheck,
    Mail, Loader2, Lock, BarChart3, Search, Target, Upload, FileText, ExternalLink,
    Users, ChevronDown, UserPlus, Briefcase, HelpCircle, Star, Zap, Shield, Palette,
    Layout, MousePointerClick, FolderPlus, Layers, FileSpreadsheet, Wallet, Landmark, Rocket, Paperclip, ChevronRight, ChevronLeft,

    // NOVOS ÍCONES PARA O SELETOR 👇
    ShoppingCart, Home, Car, Utensils, GraduationCap, HeartPulse, Plane, Gamepad2, Smartphone

} from 'lucide-react';
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

// COMPONENTES
import StandardView from '@/components/dashboard/StandardView';
import TraderView from '@/components/dashboard/TraderView';
import CustomizationModal from '@/components/dashboard/CustomizationModal';
import ZenView from '@/components/dashboard/ZenView';
import CalendarView from '@/components/dashboard/CalendarView';

// MAPA DE ÍCONES
const ICON_MAP: any = {
    'shopping-cart': ShoppingCart, 'home': Home, 'car': Car, 'utensils': Utensils,
    'zap': Zap, 'graduation-cap': GraduationCap, 'heart-pulse': HeartPulse,
    'plane': Plane, 'gamepad-2': Gamepad2, 'smartphone': Smartphone, 'dollar-sign': DollarSign
};

// LISTA DE BANCOS/CONTAS 🏦
const ACCOUNTS = [
    { id: 'nubank', label: 'Nubank', color: 'bg-[#820AD1]', text: 'text-white' },
    { id: 'inter', label: 'Inter', color: 'bg-[#FF7A00]', text: 'text-white' },
    { id: 'bb', label: 'BB', color: 'bg-[#F8D117]', text: 'text-blue-900' },
    { id: 'itau', label: 'Itaú', color: 'bg-[#EC7000]', text: 'text-white' },
    { id: 'santander', label: 'Santander', color: 'bg-[#CC0000]', text: 'text-white' },
    { id: 'caixa', label: 'Caixa', color: 'bg-[#005CA9]', text: 'text-white' },
    { id: 'bradesco', label: 'Bradesco', color: 'bg-[#CC092F]', text: 'text-white' },
    { id: 'c6', label: 'C6 Bank', color: 'bg-[#222]', text: 'text-white' },
    { id: 'money', label: 'Dinheiro', color: 'bg-emerald-600', text: 'text-white' },
    { id: 'outros', label: 'Outros', color: 'bg-gray-700', text: 'text-gray-300' },
];

// ⚠️ ATUALIZADO: IDs dos Planos Mensais
const STRIPE_PRICES = {
    START: 'price_1SyvGvBVKV78UpHayU9XXe2Q',
    PREMIUM: 'price_1SyvHkBVKV78UpHaHryy3YYP',
    PRO: 'price_1SyvIYBVKV78UpHahHXN0APT',
    AGENT: 'price_1SwQumBVKV78UpHaxUSMAGhW'  // Consultor
};

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

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
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

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
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false); // <--- Adicione junto com os outros states
    const [isSessionLoading, setIsSessionLoading] = useState(true);
    // ... outros estados ...
    // Adicione este estado novo
    const [whatsappEnabled, setWhatsappEnabled] = useState(false);
    const [addCounter, setAddCounter] = useState(0); // Conta quantos itens o usuário adicionou na sessão
    const [isNudgeOpen, setIsNudgeOpen] = useState(false); // Controla o modal de "Cutucão"
    // ... outros states ...
    const [aiInput, setAiInput] = useState('');
    // NOVO: Estado para guardar o arquivo (Base64) antes de enviar
    const [attachment, setAttachment] = useState<{ base64: string, type: 'image' | 'pdf' } | null>(null);
    // NOVO: Referência para o input de arquivo oculto
    const fileInputRef = useRef<HTMLInputElement>(null);
    // ... outros states ...
    const [isAiLoading, setIsAiLoading] = useState(false); // Estado de carregamento da IA
    const [chatHistory, setChatHistory] = useState<any[]>([]); // Histórico da conversa
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

    // --- FORMULÁRIO ---
    const [formMode, setFormMode] = useState<'income' | 'expense' | 'installment' | 'fixed_expense'>('income');
    const [editingId, setEditingId] = useState<number | null>(null);
    const initialFormState = {
        title: '', amount: '', installments: '', dueDay: '', category: 'Outros', targetMonth: currentSystemMonthName, isFixedIncome: false, fixedMonthlyValue: '', receiptUrl: '', icon: '', paymentMethod: 'outros'
    };
    const [formData, setFormData] = useState(initialFormState);
    const [uploadingFile, setUploadingFile] = useState(false);

    // --- AI ---

    const [aiResponse, setAiResponse] = useState<any>('');
    const [isLoading, setIsLoading] = useState(false);

    // --- HELPER: MAPA DE CORES ---
    const getThemeClasses = () => {
        switch (currentTheme) {
            case 'cyberpunk': return 'bg-[#020014] text-pink-50 selection:bg-pink-500 selection:text-white';
            case 'dracula': return 'bg-[#282a36] text-purple-100 selection:bg-purple-500 selection:text-white';
            case 'nubank': return 'bg-[#26004d] text-gray-100 selection:bg-white selection:text-purple-700';
            default: return 'bg-[#050505] text-gray-100 selection:bg-cyan-500 selection:text-black';
        }
    };

    // --- TUTORIAL / TOUR GUIADO ---
    // --- TUTORIAL / TOUR GUIADO (ATUALIZADO) ---
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

    // --- TUTORIAL / TOUR GUIADO (CORRIGIDO) ---
    // --- TUTORIAL / TOUR GUIADO (CORRIGIDO E ÚNICO) ---
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
        if (!item.receipt_url) return null;
        try { const json = JSON.parse(item.receipt_url); return json[month] || null; } catch (e) { return item.receipt_url; }
    };

    // --- AUTH & LOAD INICIAL ---
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
    // Função para ler o arquivo e converter para Base64
    // Função para ler, redimensionar e converter o arquivo
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Se for PDF, não comprimimos (apenas valida tamanho bruto)
        if (file.type === 'application/pdf') {
            if (file.size > 2 * 1024 * 1024) { // Limite 2MB para PDF
                toast.error("PDF muito grande. Máximo 2MB.");
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                setAttachment({ base64: event.target?.result as string, type: 'pdf' });
            };
            reader.readAsDataURL(file);
            return;
        }

        // Se for IMAGEM, vamos redimensionar
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;

            img.onload = () => {
                // Cria um canvas para redimensionar
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Define tamanho máximo (Ex: 1024px) - Mantém a proporção
                const MAX_SIZE = 1024;
                if (width > height) {
                    if (width > MAX_SIZE) {
                        height *= MAX_SIZE / width;
                        width = MAX_SIZE;
                    }
                } else {
                    if (height > MAX_SIZE) {
                        width *= MAX_SIZE / height;
                        height = MAX_SIZE;
                    }
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                // Converte para Base64 com qualidade reduzida (0.7 = 70%)
                // Isso reduz uma foto de 4MB para ~200KB sem perder legibilidade para a IA
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);

                setAttachment({ base64: compressedBase64, type: 'image' });
            };
        };
        reader.readAsDataURL(file);
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
    // --- LÓGICA DE NOTIFICAÇÃO AUTOMÁTICA ---
    // --- LÓGICA DE NOTIFICAÇÃO AUTOMÁTICA ---
    // --- LÓGICA DE NOTIFICAÇÃO (VERSÃO 2.0) ---
    // --- LÓGICA DE NOTIFICAÇÃO (CORRIGIDA COM SOM ONLINE) ---
    // --- LÓGICA DE NOTIFICAÇÃO (SEM SOM + VISUAL GARANTIDO) ---
    // --- LÓGICA DE NOTIFICAÇÃO (CORRIGIDA: 1 VEZ POR DIA APENAS) ---
    // --- LÓGICA DE NOTIFICAÇÃO (CORRIGIDA E BLINDADA) ---
    // --- LÓGICA DE NOTIFICAÇÃO (CORRIGIDA E COM WHATSAPP) ---
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
                body: JSON.stringify({ userId, bills: billsDueToday })
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

    // 👇 ADICIONE ESTE BLOCO AQUI 👇

    // 1. Cria a referência para o final do chat
    const chatEndRef = useRef<HTMLDivElement>(null);

    // 2. Faz o scroll automático sempre que chega mensagem nova
    useEffect(() => {
        if (isAIOpen) {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [chatHistory, isAIOpen]); // Roda quando o histórico ou o modal mudam

    // 👆 FIM DO BLOCO 👆

    // ... resto do código ...

    const loadData = async (userId: string, workspaceId: string) => {
        if (!userId || !workspaceId) return;
        const { data: trans } = await supabase.from('transactions').select('*').eq('user_id', userId).eq('context', workspaceId);
        const { data: inst } = await supabase.from('installments').select('*').eq('user_id', userId).eq('context', workspaceId);
        const { data: recur } = await supabase.from('recurring').select('*').eq('user_id', userId).eq('context', workspaceId);
        if (trans) setTransactions(trans);
        if (inst) setInstallments(inst);
        if (recur) setRecurring(recur);
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
        if (!formData.title || (!formData.amount && !formData.fixedMonthlyValue)) {
            toast.error("Preencha a descrição e o valor.");
            return;
        }

        const activeId = getActiveUserId();
        const context = currentWorkspace?.id;
        const amountVal = parseFloat(formData.amount.toString()) || 0;

        // Monta a data apenas para quem precisa (Transactions e Recurring)
        const monthMapNums: Record<string, string> = { 'Jan': '01', 'Fev': '02', 'Mar': '03', 'Abr': '04', 'Mai': '05', 'Jun': '06', 'Jul': '07', 'Ago': '08', 'Set': '09', 'Out': '10', 'Nov': '11', 'Dez': '12' };
        const dayValue = formData.dueDay ? formData.dueDay.toString().padStart(2, '0') : '01';
        const dateString = `${dayValue}/${monthMapNums[formData.targetMonth]}/${selectedYear}`;

        const getPayload = () => {
            const base = {
                user_id: activeId,
                title: formData.title,
                context: context,
                icon: formData.icon,
                payment_method: formData.paymentMethod || 'outros',
                receipt_url: formData.receiptUrl
            };

            // 1. Receitas
            if (formMode === 'income') {
                return formData.isFixedIncome
                    ? { table: 'recurring', data: { ...base, value: amountVal, due_day: 1, category: 'Salário', type: 'income', status: 'active', start_date: dateString } }
                    : { table: 'transactions', data: { ...base, amount: amountVal, type: 'income', date: dateString, category: 'Receita', target_month: formData.targetMonth, status: 'active' } };
            }

            // 2. Despesas Avulsas
            if (formMode === 'expense') {
                return { table: 'transactions', data: { ...base, amount: amountVal, type: 'expense', date: dateString, category: formData.category, target_month: formData.targetMonth, status: 'active' } };
            }

            // 3. Parcelamentos (❌ SEM COLUNA DATE AQUI)
            if (formMode === 'installment') {
                const qtd = parseInt(formData.installments.toString()) || 1;
                const valuePerMonth = formData.fixedMonthlyValue ? parseFloat(formData.fixedMonthlyValue.toString()) : (amountVal / qtd);
                return {
                    table: 'installments',
                    data: {
                        ...base,
                        total_value: amountVal || (valuePerMonth * qtd),
                        installments_count: qtd,
                        current_installment: 0,
                        value_per_month: valuePerMonth,
                        due_day: parseInt(formData.dueDay.toString()) || 10,
                        status: 'active'
                    }
                };
            }

            // 4. Fixas (USA START_DATE)
            return { table: 'recurring', data: { ...base, value: amountVal, due_day: parseInt(formData.dueDay.toString()) || 10, category: formData.category || 'Fixa', type: 'expense', status: 'active', start_date: dateString } };
        };

        const { table, data } = getPayload();

        try {
            if (editingId) {
                const originalTable = transactions.find(t => t.id === editingId) ? 'transactions' : (installments.find(i => i.id === editingId) ? 'installments' : 'recurring');

                if (originalTable !== table) {
                    await supabase.from(originalTable).delete().eq('id', editingId);
                    await supabase.from(table).insert([data]);
                } else {
                    await supabase.from(table).update(data).eq('id', editingId);
                }
            } else {
                await supabase.from(table).insert([data]);
            }

            toast.success("Salvo com sucesso!");
            setIsFormOpen(false);
            setEditingId(null);
            loadData(activeId!, context);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao salvar no banco.");
        }
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
                        const pYear = startYear + Math.floor(absMonthIndex/12);
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

        // Adiciona mensagem do usuário no chat (interface)
        const userMsg = { role: 'user', content: text, type: 'text' };
        setChatHistory(prev => [...prev, userMsg]);

        try {
            // Prepara o contexto financeiro
            const contextData = {
                saldo_atual: displayBalance,
                receita_mensal: currentMonthData.income,
                despesa_mensal: currentMonthData.expenseTotal,
                transacoes_recentes: transactions.slice(0, 10),
                contas_fixas: recurring,
                parcelamentos_ativos: installments,
                mes_visualizado: activeTab,
                user_plan: userPlan,
                is_consultant: userPlan === 'agent',
                viewing_as_client: viewingAs?.client_id !== user?.id,
                client_name: viewingAs ? viewingAs.client_email : "Você"
            };

            // Prepara imagens (se houver)
            const images = fileBase64 ? [{ base64: fileBase64, mimeType: 'image/jpeg' }] : [];

            // --- PREPARA O HISTÓRICO PARA A API ---
            // Filtra mensagens válidas e mapeia para o formato do Gemini API
            const historyForAi = chatHistory
                .filter(msg => msg.type === 'text') // Ignora erros ou msg de sistema
                .map(msg => ({
                    role: msg.role === 'user' ? 'user' : 'model', // 'assistant' vira 'model'
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
                    history: historyForAi // <--- ENVIA O HISTÓRICO AQUI
                })
            });

            const data = await response.json();

            if (data.error) throw new Error(data.error);

            // --- PROCESSADOR DE AÇÕES (AUTO-MAGIC) ---
            let aiResponseText = data.response;

            // Regex para capturar JSON de comandos
            const jsonMatch = aiResponseText.match(/\[[\s\S]*\]/);

            if (jsonMatch) {
                try {
                    const commands = JSON.parse(jsonMatch[0]);

                    if (Array.isArray(commands)) {
                        let actionsPerformed = 0;
                        const activeId = getActiveUserId();

                        for (const cmd of commands) {
                            if (cmd.action === 'add') {
                                const { error } = await supabase
                                    .from(cmd.table)
                                    .insert([{
                                        ...cmd.data,
                                        user_id: activeId,
                                        context: currentWorkspace?.id
                                    }]);

                                if (!error) actionsPerformed++;
                            }
                        }

                        if (actionsPerformed > 0) {
                            aiResponseText = `✅ Feito! Adicionei ${actionsPerformed} item(s) para você automaticamente. Atualize a página para ver.`;
                            if (user && activeId) loadData(activeId, currentWorkspace?.id);
                        }
                    }
                } catch (e) {
                    console.error("Erro ao processar JSON da IA", e);
                }
            }

            // Adiciona resposta da IA no chat (interface)
            setChatHistory(prev => [...prev, { role: 'assistant', content: aiResponseText, type: 'text' }]);

        } catch (error: any) {
            console.error(error);
            setChatHistory(prev => [...prev, { role: 'assistant', content: "Desculpe, tive um erro ao processar. Tente novamente.", type: 'error' }]);
        } finally {
            setIsAiLoading(false);
        }
    };

    // --- 1. DEFINIÇÃO DOS MODAIS DE AUTH (Para usar em ambas as telas) ---
    // Extraímos isso para uma variável para o código ficar limpo e funcionar na Landing Page também
    // --- 1. DEFINIÇÃO DOS MODAIS DE AUTH (CORRIGIDO) ---
    const AuthModals = (
        <>
            {/* MODAL DE RECUPERAR SENHA */}
            {isChangePasswordOpen && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[300] p-4">
                    <div className="bg-[#111] border border-gray-800 p-8 rounded-3xl w-full max-w-sm text-center shadow-2xl animate-in zoom-in duration-300">
                        <div className="flex justify-center mb-4"><div className="bg-cyan-900/20 p-4 rounded-full"><Lock className="text-cyan-400" size={32} /></div></div>
                        <h2 className="text-2xl font-bold text-white mb-2">Nova Senha</h2>
                        <p className="text-gray-400 text-sm mb-6">Digite sua nova senha para recuperar o acesso.</p>
                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Digite a nova senha..." className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none mb-6" />
                        <button onClick={handleUpdatePassword} disabled={loadingAuth} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-cyan-900/20 flex items-center justify-center gap-2">
                            {loadingAuth ? <Loader2 className="animate-spin" /> : "Salvar Nova Senha"}
                        </button>
                        <button onClick={() => setIsChangePasswordOpen(false)} className="mt-4 text-xs text-gray-500 hover:text-white underline">Cancelar</button>
                    </div>
                </div>
            )}

            {/* MODAL DE LOGIN / CADASTRO */}
            {isAuthModalOpen && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
                    <div className="bg-[#111] border border-gray-800 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative text-center">
                        <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition"><X size={24} /></button>
                        <div className="flex justify-center mb-6">
                            <div className="bg-gray-900/50 p-3 rounded-2xl border border-gray-800">
                                {showEmailCheck ? <Mail className="text-cyan-400" size={32} /> : <Lock className="text-cyan-400" size={32} />}
                            </div>
                        </div>
                        {showEmailCheck ? (
                            <div className="animate-in fade-in zoom-in duration-300">
                                <h2 className="text-2xl font-bold mb-2 text-white">Verifique seu e-mail</h2>
                                <p className="text-gray-400 text-sm mb-6">Enviamos um link de acesso para <b>{email}</b>. Clique nele para ativar sua conta.</p>
                                <div className="bg-cyan-900/20 text-cyan-400 text-xs p-3 rounded-xl border border-cyan-900/50 mb-6">Dica: Verifique a caixa de Spam.</div>
                                <button onClick={() => { setShowEmailCheck(false); setAuthMode('login'); }} className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">Voltar para Login</button>
                            </div>
                        ) : (
                            <div>
                                <div className="flex justify-center mb-6">
                                    <div className="flex bg-black p-1 rounded-xl border border-gray-800">
                                        <button onClick={() => setAuthMode('login')} className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${authMode === 'login' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>Entrar</button>
                                        <button onClick={() => setAuthMode('signup')} className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${authMode === 'signup' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>Criar Conta</button>
                                    </div>
                                </div>
                                <div className="space-y-4 text-left">
                                    <div>
                                        <label className="text-xs text-gray-500 ml-1 mb-1 block">E-mail</label>
                                        <div className="relative"><Mail className="absolute left-3 top-3.5 text-gray-600" size={16} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-10 pr-3 text-white focus:border-cyan-500 outline-none transition" /></div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 ml-1 mb-1 block">Senha</label>
                                        <div className="relative"><Lock className="absolute left-3 top-3.5 text-gray-600" size={16} /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-10 pr-3 text-white focus:border-cyan-500 outline-none transition" /></div>
                                    </div>
                                </div>
                                {authMessage && (<div className={`mt-4 p-3 rounded-lg text-xs flex items-center gap-2 ${authMessage.includes('❌') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>{authMessage}</div>)}

                                {/* CHECKBOX DE TERMOS */}
                                {authMode === 'signup' && (
                                    <div className="flex items-start gap-3 mt-4 mb-2 bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                                        <div className="relative flex items-center">
                                            <input type="checkbox" id="terms" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-600 bg-gray-800 transition-all checked:border-cyan-500 checked:bg-cyan-600" />
                                            <div className="pointer-events-none absolute top-2/4 left-2/4 -translate-y-2/4 -translate-x-2/4 text-white opacity-0 peer-checked:opacity-100"><Check size={14} strokeWidth={4} /></div>
                                        </div>
                                        <label htmlFor="terms" className="text-xs text-gray-400 cursor-pointer select-none leading-relaxed">
                                            Eu concordo com os <button type="button" onClick={() => setIsTermsOpen(true)} className="text-cyan-500 hover:underline font-bold">Termos de Uso</button> e <button type="button" onClick={() => setIsPrivacyOpen(true)} className="text-cyan-500 hover:underline font-bold">Política de Privacidade</button>, e autorizo o processamento dos meus dados financeiros pela IA.
                                        </label>
                                    </div>
                                )}

                                <button onClick={handleAuth} disabled={loadingAuth} className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition mt-6 flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20">
                                    {loadingAuth ? <Loader2 className="animate-spin" size={20} /> : (authMode === 'login' ? 'Acessar Conta' : 'Criar Conta')}
                                </button>
                                {authMode === 'login' && (<div className="mt-4 pt-4 border-t border-gray-800"><button onClick={handleResetPassword} disabled={loadingAuth} className="text-xs text-gray-500 hover:text-cyan-400 transition underline decoration-gray-700 hover:decoration-cyan-400 underline-offset-4">Esqueci minha senha</button></div>)}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* --- AQUI ESTÃO OS MODAIS QUE FALTAVAM --- */}

            {/* MODAL TERMOS DE USO */}
            {isTermsOpen && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[300] p-4">
                    <div className="bg-[#111] border border-gray-800 p-8 rounded-3xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl relative">
                        <button onClick={() => setIsTermsOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={24} /></button>
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><ShieldCheck className="text-cyan-500" /> Termos de Uso</h2>
                        <div className="overflow-y-auto pr-4 text-gray-400 text-sm space-y-4 scrollbar-thin scrollbar-thumb-gray-700">
                            <p><strong>1. Aceitação:</strong> Ao criar uma conta no "Meu Aliado", você concorda com estes termos.</p>
                            <p><strong>2. Uso da IA:</strong> Nosso sistema utiliza Inteligência Artificial para processar seus dados. Você é responsável por conferir os lançamentos.</p>
                            <p><strong>3. Responsabilidade:</strong> O "Meu Aliado" é uma ferramenta de gestão. Não nos responsabilizamos por decisões financeiras.</p>
                            <p><strong>4. Dados:</strong> Seus dados são criptografados e processados de forma segura.</p>
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-800 flex justify-end">
                            <button onClick={() => setIsTermsOpen(false)} className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-xl font-bold transition">Entendi</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL POLÍTICA DE PRIVACIDADE */}
            {isPrivacyOpen && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[300] p-4">
                    <div className="bg-[#111] border border-gray-800 p-8 rounded-3xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl relative">
                        <button onClick={() => setIsPrivacyOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white"><X size={24} /></button>
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Lock className="text-cyan-500" /> Privacidade e Dados</h2>
                        <div className="overflow-y-auto pr-4 text-gray-400 text-sm space-y-4 scrollbar-thin scrollbar-thumb-gray-700">
                            <p><strong>1. LGPD:</strong> Respeitamos sua privacidade e seus direitos como titular dos dados.</p>
                            <p><strong>2. Dados Bancários:</strong> Não salvamos senhas bancárias. Apenas processamos os extratos e comprovantes enviados.</p>
                            <p><strong>3. IA Segura:</strong> Seus dados enviados para a IA são anonimizados e não usados para treinamento público.</p>
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-800 flex justify-end">
                            <button onClick={() => setIsPrivacyOpen(false)} className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2 rounded-xl font-bold transition">Entendi</button>
                        </div>
                    </div>
                </div>
            )}

        </>
    );

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
    if (!user) {
        return (
            <>
                <LandingPage onLoginClick={() => {
                    setIsAuthModalOpen(true);
                    setAuthMode('login');
                    setShowEmailCheck(false);
                }} />
                {AuthModals}
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
            <header className="flex flex-col xl:flex-row gap-6 justify-between items-center mb-6 xl:mb-10 relative z-30">

                {/* ==========================================================
        LADO ESQUERDO: Logo + Consultor (Intacto)
       ========================================================== */}
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

                {/* ==========================================================
        LADO DIREITO: Organizado para Mobile e Desktop
       ========================================================== */}
                <div className="flex flex-col xl:flex-row gap-3 w-full xl:w-auto">

                    {/* GRUPO 1: Utilitários e Menu (Linha de Cima no Mobile / Esquerda no Desktop) */}
                    <div className="flex items-center justify-between xl:justify-start gap-2 w-full xl:w-auto order-1 xl:order-none">

                        {/* Ícones de Ferramentas */}
                        <div className="flex items-center gap-2 bg-gray-900/50 p-1 rounded-xl border border-gray-800">
                            {/* Histórico */}
                            <button
                                id="btn-history"
                                onClick={() => setIsHistoryOpen(true)}
                                className="h-10 w-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-cyan-400 hover:bg-gray-800 transition"
                                title="Ver Gráfico Anual"
                            >
                                <BarChart3 size={20} />
                            </button>

                            {/* Exportar */}
                            <button
                                id="btn-export"
                                onClick={() => {
                                    if (userPlan === 'free') {
                                        toast.error("Recurso Premium", { description: "Assine o plano Start ou superior para exportar." });
                                        openPricingModal();
                                        return;
                                    }
                                    setIsExportModalOpen(true);
                                }}
                                className={`h-10 w-10 flex items-center justify-center rounded-lg transition relative ${userPlan === 'free' ? 'text-gray-600 cursor-not-allowed' : 'text-gray-400 hover:text-emerald-400 hover:bg-gray-800'}`}
                            >
                                <FileSpreadsheet size={20} />
                                {userPlan === 'free' && <Lock size={10} className="absolute top-2 right-2 text-amber-500" />}
                            </button>

                            {/* Ajuda */}
                            <button onClick={runTour} className="h-10 w-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition">
                                <HelpCircle size={20} />
                            </button>
                        </div>

                        {/* Separador (Só Desktop) */}
                        <div className="hidden xl:block w-px h-8 bg-gray-800 mx-1"></div>

                        {/* Notificações e Menu */}
                        <div className="flex items-center gap-2 pl-0 xl:pl-2 xl:border-none">
                            <NotificationBell userId={user.id} />

                            <div id="btn-menu" className="relative z-50">
                                <button
                                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                    className={`h-11 px-3 xl:px-4 bg-gray-900 border border-gray-800 rounded-xl hover:bg-gray-800 flex items-center justify-center gap-2 transition ${isUserMenuOpen ? 'ring-2 ring-cyan-500/50 border-cyan-500/50' : ''}`}
                                >
                                    {user.user_metadata?.avatar_url
                                        ? (<img src={user.user_metadata.avatar_url} className="w-6 h-6 rounded-full object-cover ring-2 ring-gray-700" alt="Avatar" />)
                                        : (<div className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-gray-300"><User size={14} /></div>)
                                    }
                                    {/* Texto "Menu" some no mobile para economizar espaço */}
                                    <span className="hidden md:inline text-gray-400 text-sm font-medium">Menu</span>
                                    <ChevronDown size={14} className="text-gray-500 hidden md:block" />
                                </button>

                                {/* DROPDOWN DO MENU (Código Original Mantido) */}
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

                    {/* GRUPO 2: Ações Principais (Linha de Baixo no Mobile / Direita no Desktop) */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:flex gap-2 xl:gap-3 w-full xl:w-auto order-2 xl:order-none">

                        {/* Botão IA (Ocupa 2 colunas no mobile muito pequeno, ou 1 normal) */}
                        <button
                            id="btn-ai"
                            onClick={() => setIsAIOpen(true)}
                            className={`h-11 px-3 xl:px-5 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm shadow-lg border border-white/5 whitespace-nowrap
                ${['premium', 'pro', 'agent', 'admin'].includes(userPlan)
                                    ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white hover:brightness-110'
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
                        >
                            <Sparkles size={16} className={['premium', 'pro', 'agent', 'admin'].includes(userPlan) ? "text-cyan-200 fill-cyan-200" : ""} />
                            {['premium', 'pro', 'agent', 'admin'].includes(userPlan) ? 'Aliado IA' : 'IA Lite'}
                        </button>

                        {/* Botão Fatura */}
                        <button
                            id="btn-fatura"
                            onClick={() => {
                                if (userPlan === 'free' || userPlan === 'start') {
                                    toast.error("Recurso Premium", { description: "Assine o Premium para lançar faturas em lote!" });
                                    openPricingModal();
                                    return;
                                }
                                setIsCreditCardModalOpen(true);
                            }}
                            className={`h-11 px-3 xl:px-5 rounded-xl font-bold transition flex items-center justify-center gap-2 text-sm shadow-lg border border-white/5 whitespace-nowrap
                ${(userPlan === 'free' || userPlan === 'start')
                                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white'}`}
                        >
                            <CreditCard size={16} /> Fatura
                            {(userPlan === 'free' || userPlan === 'start') && <Lock size={12} className="text-gray-500" />}
                        </button>

                        {/* Botão NOVO (Destaque - Ocupa linha inteira se for tela muito pequena, ou canto) */}
                        <button
                            id="btn-novo"
                            onClick={openNewTransactionModal}
                            className="h-11 col-span-2 sm:col-span-1 bg-white text-black px-4 xl:px-6 rounded-xl font-bold hover:bg-gray-100 transition flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.15)] text-sm active:scale-95 whitespace-nowrap"
                        >
                            <Plus size={18} strokeWidth={3} /> Novo
                        </button>
                    </div>
                </div>
            </header>

            {/* --- SELETOR DE ANO --- */}
            <div className="flex justify-center mb-6 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-4 bg-gray-900/80 backdrop-blur-sm p-1.5 pr-4 rounded-full border border-gray-800 shadow-xl">
                    <div className="flex items-center">
                        <button onClick={() => setSelectedYear(selectedYear - 1)} className="p-2 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition active:scale-95"><ChevronLeft size={18} /></button>
                        <span className="text-xl font-bold text-white min-w-[60px] text-center font-mono">{selectedYear}</span>
                        <button onClick={() => setSelectedYear(selectedYear + 1)} className="p-2 rounded-full hover:bg-gray-700 text-gray-400 hover:text-white transition active:scale-95"><ChevronRight size={18} /></button>
                    </div>
                    {selectedYear !== new Date().getFullYear() && (
                        <button onClick={() => setSelectedYear(new Date().getFullYear())} className="text-[10px] uppercase font-bold text-cyan-500 hover:text-cyan-400 border border-cyan-500/30 px-2 py-1 rounded-md transition">Voltar p/ Hoje</button>
                    )}
                </div>
            </div>
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

            {currentLayout === 'zen' && (
                <ZenView
                    displayBalance={displayBalance} currentMonthData={currentMonthData}
                    activeTab={activeTab} months={MONTHS} setActiveTab={setActiveTab}
                />
            )}

            {currentLayout === 'timeline' && (
                <TimelineView
                    transactions={transactions} installments={installments} recurring={recurring}
                    activeTab={activeTab}
                />
            )}

            {currentLayout === 'bento' && (
                <BentoView
                    currentMonthData={currentMonthData} transactions={transactions}
                    installments={installments} recurring={recurring}
                    onOpenCalendar={() => setCurrentLayout('calendar')}
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

            <ExportModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} user={user} userPlan={userPlan} clients={clients} activeTab={activeTab} />

            <CreditCardModal isOpen={isCreditCardModalOpen} onClose={() => setIsCreditCardModalOpen(false)} user={user} activeTab={activeTab} contextId={currentWorkspace?.id} onSuccess={() => loadData(getActiveUserId(), currentWorkspace?.id)} />

            <HistoryModal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} transactions={transactions} installments={installments} recurring={recurring} />

            <CustomizationModal isOpen={isCustomizationOpen} onClose={() => setIsCustomizationOpen(false)} currentLayout={currentLayout} currentTheme={currentTheme} onSelectLayout={(l) => handleSavePreferences('layout', l)} onSelectTheme={(t) => handleSavePreferences('theme', t)} userPlan={userPlan} />

            {/* MODAL DE PREÇOS (O QUE TINHA SUMIDO!) */}

            {/* MODAL DE PREÇOS (LIMPO E ATUALIZADO) */}
            {isPricingOpen && (
                <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/95 backdrop-blur-xl">
                    {/* Wrapper flexível que garante o scroll correto em qualquer tela */}
                    <div className="flex min-h-full items-center justify-center p-4 text-center md:text-left">

                        <div className="relative w-full max-w-6xl animate-in zoom-in duration-300 bg-[#0a0a0a] md:bg-transparent rounded-3xl md:rounded-none p-6 md:p-0 border border-gray-800 md:border-none shadow-2xl md:shadow-none my-8">

                            {/* Botão Fechar */}
                            <button
                                onClick={() => setIsPricingOpen(false)}
                                className="absolute top-2 right-2 md:-right-12 md:-top-4 text-gray-400 hover:text-white p-2 bg-gray-900/50 md:bg-transparent rounded-full z-50 transition"
                            >
                                <X size={24} className="md:w-8 md:h-8" />
                            </button>

                            {/* Cabeçalho do Modal */}
                            <div className="text-center mb-8 md:mb-12">
                                <h2 className="text-3xl md:text-5xl font-black text-white mb-3">Evolua seu Controle 🚀</h2>
                                <p className="text-gray-400 text-sm md:text-lg px-4">Escolha o poder de fogo ideal para sua vida financeira.</p>
                            </div>

                            {/* GRIDS DOS PLANOS PESSOAIS */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8 md:mb-12 text-left">

                                {/* 1. PLANO START */}
                                <div className="bg-[#111] border border-gray-800 p-6 md:p-8 rounded-3xl flex flex-col hover:border-gray-600 transition group order-1">
                                    <h3 className="text-gray-400 font-bold uppercase tracking-wider mb-2 text-sm">Start</h3>
                                    <div className="text-3xl font-black text-white mb-6">R$ 10<span className="text-sm font-normal text-gray-500">/mês</span></div>
                                    <ul className="space-y-4 mb-8 flex-1 text-sm text-gray-300">
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-gray-600 shrink-0" /> Lançamentos Ilimitados</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-gray-600 shrink-0" /> Gráficos & Histórico</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-gray-600 shrink-0" /> Exportação Excel</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-gray-600 shrink-0" /> IA Lite (Dicas Básicas)</li>
                                        <li className="flex gap-3 text-gray-600 line-through opacity-50"><Smartphone size={18} className="shrink-0" /> Integração WhatsApp</li>
                                    </ul>
                                    <button id="checkout-btn-START" onClick={() => handleCheckout('START')} className="w-full py-3 rounded-xl border border-gray-700 hover:bg-gray-800 text-white font-bold transition">Escolher Start</button>
                                </div>

                                {/* 2. PLANO PREMIUM (PLUS) */}
                                <div className="bg-[#151515] border border-cyan-500/30 p-6 md:p-8 rounded-3xl flex flex-col relative shadow-2xl shadow-cyan-900/20 z-10 order-first md:order-2 transform md:scale-105 my-2 md:my-0 ring-1 ring-cyan-500/20">
                                    <div className="absolute top-0 right-0 bg-cyan-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-2xl">CUSTO-BENEFÍCIO</div>
                                    <h3 className="text-cyan-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-2 text-sm"><Zap size={16} /> Plus</h3>
                                    <div className="text-4xl font-black text-white mb-6">R$ 29,90<span className="text-sm font-normal text-gray-500">/mês</span></div>
                                    <ul className="space-y-4 mb-8 flex-1 text-sm text-white">
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-cyan-500 shrink-0" /> Tudo do Start</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-cyan-500 shrink-0" /> Agente IA Completo</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-cyan-500 shrink-0" /> Múltiplos Perfis</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-cyan-500 shrink-0" /> Leitura de Comprovantes</li>
                                        <li className="flex gap-3 text-gray-500 line-through opacity-50"><Smartphone size={18} className="shrink-0" /> Integração WhatsApp</li>
                                    </ul>
                                    <button id="checkout-btn-PREMIUM" onClick={() => handleCheckout('PREMIUM')} className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:to-blue-500 text-white font-bold transition shadow-lg">Quero o Plus</button>
                                </div>

                                {/* 3. PLANO PRO */}
                                <div className="bg-[#111] border border-purple-500/20 p-6 md:p-8 rounded-3xl flex flex-col hover:border-purple-500/40 transition group relative overflow-hidden order-3">
                                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-purple-600 to-pink-600"></div>
                                    <h3 className="text-purple-400 font-bold uppercase tracking-wider mb-2 flex items-center gap-2 text-sm"><Crown size={16} /> Pro</h3>
                                    <div className="text-3xl font-black text-white mb-6">R$ 39,90<span className="text-sm font-normal text-gray-500">/mês</span></div>
                                    <ul className="space-y-4 mb-8 flex-1 text-sm text-gray-300">
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-purple-500 shrink-0" /> Tudo do Plus</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-purple-500 shrink-0" /> <b>IA no WhatsApp</b> (Áudio)</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-purple-500 shrink-0" /> Notificações via Zap</li>
                                        <li className="flex gap-3"><CheckCircle2 size={18} className="text-purple-500 shrink-0" /> Prioridade no Suporte</li>
                                    </ul>
                                    <button id="checkout-btn-PRO" onClick={() => handleCheckout('PRO')} className="w-full py-3 rounded-xl border border-purple-900/50 hover:bg-purple-900/20 text-white font-bold transition shadow-lg shadow-purple-900/10">Virar Pro</button>
                                </div>
                            </div>

                            {/* 4. PLANO CONSULTOR */}
                            <div className="bg-[#0f0f13] border border-amber-900/30 p-6 md:p-8 rounded-3xl relative overflow-hidden flex flex-col md:flex-row items-center gap-6 md:gap-8 shadow-2xl mb-8 text-left">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-600/10 rounded-full blur-3xl pointer-events-none"></div>
                                <div className="flex-1 relative z-10 text-center md:text-left">
                                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-900/20 border border-amber-500/30 text-amber-500 text-xs font-bold uppercase tracking-wider mb-4">
                                        <Briefcase size={12} /> Área Profissional
                                    </div>
                                    <h3 className="text-2xl md:text-3xl font-black text-white mb-2">Plano Agent</h3>
                                    <p className="text-gray-400 mb-6 text-sm md:text-base">Gerencie a carteira de múltiplos clientes, tenha acesso administrativo e ofereça o app como sua ferramenta oficial.</p>
                                    <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-4 text-sm text-gray-300 font-bold">
                                        <span className="flex items-center gap-2"><Users size={16} className="text-amber-500" /> Gestão de Carteira</span>
                                        <span className="flex items-center gap-2"><Lock size={16} className="text-amber-500" /> Acesso Admin</span>
                                        <span className="flex items-center gap-2"><FileSpreadsheet size={16} className="text-amber-500" /> White-label</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-2 w-full md:w-auto min-w-[200px] relative z-10">
                                    <div className="text-3xl md:text-4xl font-black text-white">R$ 99,90<span className="text-sm font-normal text-gray-500">/mês</span></div>
                                    <button id="checkout-btn-AGENT" onClick={() => handleCheckout('AGENT')} className="w-full px-8 py-4 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl transition shadow-lg shadow-amber-900/20 whitespace-nowrap">
                                        Assinar Agent
                                    </button>
                                </div>
                            </div>

                        </div>
                    </div>
                </div>
            )}
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
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-[#111] border border-gray-700 p-8 rounded-3xl w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setIsFormOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24} /></button>
                        <h2 className="text-2xl font-bold mb-6 text-white">{editingId ? 'Editar' : 'Novo Lançamento'}</h2>

                        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 mb-6 flex items-center justify-between">
                            <label className="text-gray-400 text-sm">Mês de Referência:</label>
                            <select value={formData.targetMonth} onChange={(e) => setFormData({ ...formData, targetMonth: e.target.value })} className="bg-black text-white p-2 rounded-lg border border-gray-700 outline-none">{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}</select>
                        </div>

                        <div className="grid grid-cols-2 gap-2 mb-6">
                            <button onClick={() => setFormMode('income')} className={`py-3 rounded-xl border text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${formMode === 'income' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'bg-gray-900 border-gray-800 text-gray-500'}`}><DollarSign size={20} /> Entrada</button>
                            <button onClick={() => setFormMode('expense')} className={`py-3 rounded-xl border text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${formMode === 'expense' ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-gray-900 border-gray-800 text-gray-500'}`}><TrendingDown size={20} /> Gasto</button>
                            <button onClick={() => setFormMode('installment')} className={`py-3 rounded-xl border text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${formMode === 'installment' ? 'bg-purple-500/20 border-purple-500 text-purple-500' : 'bg-gray-900 border-gray-800 text-gray-500'}`}><CreditCard size={20} /> Parcelado</button>
                            <button onClick={() => setFormMode('fixed_expense')} className={`py-3 rounded-xl border text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${formMode === 'fixed_expense' ? 'bg-blue-500/20 border-blue-500 text-blue-500' : 'bg-gray-900 border-gray-800 text-gray-500'}`}><CheckCircle2 size={20} /> Fixo</button>
                        </div>

                        <div className="space-y-4">
                            {formMode === 'income' && (<div className="flex items-center gap-3 bg-gray-900 p-3 rounded-lg"><input type="checkbox" id="fixo" checked={formData.isFixedIncome} onChange={(e) => setFormData({ ...formData, isFixedIncome: e.target.checked })} className="w-5 h-5 rounded accent-emerald-500" /><label htmlFor="fixo" className="text-gray-300 text-sm cursor-pointer select-none">Fixo mensal?</label></div>)}
                            <input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none" placeholder="Descrição" />

                            {/* Ícones */}
                            <div className="my-4">
                                <label className="text-gray-500 text-xs uppercase font-bold mb-2 block ml-1">Escolha um Ícone</label>
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                    {Object.keys(ICON_MAP).map(iconKey => {
                                        const IconComponent = ICON_MAP[iconKey];
                                        return (
                                            <button key={iconKey} onClick={() => setFormData({ ...formData, icon: iconKey })} className={`p-3 rounded-xl border transition flex-shrink-0 ${formData.icon === iconKey ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-900/50' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'}`}><IconComponent size={20} /></button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Contas / Bancos */}
                            <div className="mb-4">
                                <label className="text-gray-500 text-xs uppercase font-bold mb-2 block ml-1 flex items-center gap-2"><Landmark size={12} /> Conta / Cartão</label>
                                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                    {ACCOUNTS.map(acc => (
                                        <button key={acc.id} onClick={() => setFormData({ ...formData, paymentMethod: acc.id })} className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition border ${formData.paymentMethod === acc.id ? `${acc.color} ${acc.text} border-transparent shadow-md scale-105` : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700'}`}>
                                            {acc.id === 'nubank' && <img src="https://upload.wikimedia.org/wikipedia/commons/f/f7/Nubank_logo_2021.svg" className="w-4 h-4 invert opacity-90" />}
                                            {acc.label}
                                            {formData.paymentMethod === acc.id && <Check size={12} />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="mb-2">
                                <label className="text-xs text-gray-500 ml-1 mb-1 block">{formMode === 'installment' ? "Valor TOTAL da Dívida (Opcional)" : "Valor (R$)"}</label>
                                <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none" placeholder={formMode === 'installment' ? "Ex: 1200.00 (Deixe vazio se souber a parcela)" : "0,00"} />
                            </div>

                            {formMode === 'installment' && (
                                <div className="bg-purple-900/10 p-4 rounded-xl border border-purple-900/30 space-y-3 mb-4 animate-in slide-in-from-top-2">
                                    <p className="text-purple-400 text-xs font-bold uppercase mb-2 flex items-center gap-2"><Sparkles size={12} /> Valor da Parcela</p>
                                    <div>
                                        <label className="text-gray-400 text-xs block mb-1">Valor Mensal (com Juros):</label>
                                        <input type="number" value={formData.fixedMonthlyValue} onChange={(e) => setFormData({ ...formData, fixedMonthlyValue: e.target.value })} className="w-full bg-black border border-gray-700 rounded-lg p-3 text-white focus:border-purple-500 outline-none font-bold text-lg" placeholder="Ex: 850.00" />
                                    </div>
                                </div>
                            )}

                            {formMode === 'installment' && (
                                <div className="flex gap-4">
                                    <input type="number" placeholder="Nº Parcelas" value={formData.installments} onChange={(e) => setFormData({ ...formData, installments: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white outline-none" />
                                    <input type="number" placeholder="Dia Venc." value={formData.dueDay} onChange={(e) => setFormData({ ...formData, dueDay: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white outline-none" />
                                </div>
                            )}

                            {/* UPLOAD DE COMPROVANTE */}
                            {((formMode !== 'installment' && formMode !== 'fixed_expense') || editingId) && (
                                <div className="border border-dashed border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-900/50 transition relative group">
                                    {!formData.receiptUrl && (<input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />)}
                                    {uploadingFile ? (<Loader2 className="animate-spin text-cyan-500" />) : formData.receiptUrl ? (
                                        <div className="flex flex-col items-center z-20">
                                            <FileText className="text-emerald-500 mb-1" size={24} />
                                            <span className="text-xs text-emerald-400 font-bold">Comprovante Anexado!</span>
                                            <div className="flex gap-2 mt-2">
                                                <a href={formData.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] bg-gray-800 px-2 py-1 rounded hover:bg-gray-700 text-white border border-gray-600">Ver</a>
                                                <button type="button" onClick={handleRemoveReceipt} className="text-[10px] bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500 hover:text-white border border-red-500/30 transition">Excluir</button>
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="text-gray-500" size={24} />
                                            <span className="text-xs text-gray-400 group-hover:text-gray-200 transition">Anexar Comprovante (Foto/PDF)</span>
                                        </>
                                    )}
                                </div>
                            )}
                            <button onClick={handleSubmit} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 rounded-xl transition mt-4 shadow-lg shadow-cyan-900/20">{editingId ? 'Salvar Alterações' : 'Adicionar'}</button>
                        </div>
                    </div>
                </div>
            )}

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
            {isAIOpen && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
                    <div className="bg-[#0f0f13] border border-gray-700 w-full max-w-2xl h-[600px] rounded-3xl shadow-2xl flex flex-col relative overflow-hidden">

                        {/* HEADER */}
                        <div className="p-6 border-b border-gray-800 bg-[#111] flex justify-between items-center z-10 shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-900/30 rounded-lg">
                                    <Sparkles size={20} className="text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Consultor IA</h2>
                                    <p className="text-xs text-gray-400">Powered by Gemini 1.5 Flash</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAIOpen(false)} className="text-gray-500 hover:text-white p-2 hover:bg-white/10 rounded-full transition">
                                <X size={20} />
                            </button>
                        </div>

                        {/* CHAT AREA (MENSAGENS) */}
                        <div className="flex-1 p-6 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent bg-[#0f0f13]">
                            {chatHistory.length === 0 ? (
                                // Estado Vazio (Zero mensagens)
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-50 p-8">
                                    <Sparkles size={48} className="text-purple-500 mb-4" />
                                    <h3 className="text-white font-bold mb-2">Como posso ajudar?</h3>
                                    <p className="text-sm text-gray-400">Envie um comprovante, pergunte sobre seus gastos ou peça dicas de economia.</p>
                                </div>
                            ) : (
                                chatHistory.map((msg, idx) => (
                                    <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>

                                        {/* Avatar da IA */}
                                        {msg.role !== 'user' && (
                                            <div className="w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center mr-3 mt-1 shrink-0 border border-purple-500/30">
                                                <Sparkles size={14} className="text-purple-400" />
                                            </div>
                                        )}

                                        {/* Balão da Mensagem */}
                                        <div className={`
                                max-w-[85%] p-4 rounded-2xl text-sm shadow-lg
                                ${msg.role === 'user'
                                                ? 'bg-purple-600 text-white rounded-tr-none'
                                                : 'bg-gray-800 text-gray-100 rounded-tl-none border border-gray-700'}
                            `}>

                                            {/* Chip de Comprovante (Se houver) */}
                                            {msg.content === 'Analisar comprovante...' && (
                                                <div className="flex items-center gap-2 mb-3 text-purple-200 bg-black/20 p-2 rounded-lg text-xs font-bold border border-white/10">
                                                    <FileText size={14} /> Comprovante enviado
                                                </div>
                                            )}

                                            {/* CONTEÚDO DA MENSAGEM (CORRIGIDO) */}
                                            {msg.role === 'user' ? (
                                                <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                            ) : (
                                                <div className="markdown-content text-gray-100">
                                                    <ReactMarkdown
                                                        components={{
                                                            p: ({ node, ...props }) => <p className="mb-3 last:mb-0 leading-relaxed" {...props} />,
                                                            strong: ({ node, ...props }) => <strong className="font-bold text-purple-300" {...props} />,
                                                            ul: ({ node, ...props }) => <ul className="list-disc ml-5 mb-3 space-y-1 marker:text-purple-400" {...props} />,
                                                            li: ({ node, ...props }) => <li className="pl-1" {...props} />,
                                                            h1: ({ node, ...props }) => <h1 className="text-lg font-bold text-white mb-2 mt-4 border-b border-gray-700 pb-1" {...props} />,
                                                            h2: ({ node, ...props }) => <h2 className="text-base font-bold text-white mb-2 mt-3" {...props} />,
                                                            h3: ({ node, ...props }) => <h3 className="text-sm font-bold text-white mb-1" {...props} />
                                                        }}
                                                    >
                                                        {msg.content}
                                                    </ReactMarkdown>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}

                            {/* Loader de Resposta */}
                            {isAiLoading && (
                                <div className="flex justify-start w-full">
                                    <div className="w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center mr-3 mt-1 shrink-0 border border-purple-500/30">
                                        <Sparkles size={14} className="text-purple-400 animate-pulse" />
                                    </div>
                                    <div className="bg-gray-800 text-gray-200 rounded-2xl p-4 flex items-center gap-3 border border-gray-700 rounded-tl-none">
                                        <Loader2 size={18} className="animate-spin text-purple-500" />
                                        <span className="text-xs font-bold animate-pulse text-purple-300">Escrevendo...</span>
                                    </div>
                                </div>
                            )}

                            {/* Scroll Anchor */}
                            <div ref={chatEndRef} />
                        </div>

                        {/* SUGESTÕES RÁPIDAS (RODAPÉ SUPERIOR) */}
                        <div className="px-6 py-2 border-t border-gray-800 bg-[#111]">
                            {userPlan !== 'free' ? (
                                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                                    <button onClick={() => askGemini("Faça um diagnóstico de risco completo...")} className="whitespace-nowrap px-4 py-2 bg-gray-800 hover:bg-gray-700 hover:text-white rounded-full text-xs font-bold text-cyan-400 border border-cyan-900/30 flex items-center gap-2 transition active:scale-95">
                                        <BarChart3 size={14} /> Diagnóstico
                                    </button>
                                    <button onClick={() => askGemini("Analise meus maiores gastos...")} className="whitespace-nowrap px-4 py-2 bg-gray-800 hover:bg-gray-700 hover:text-white rounded-full text-xs font-bold text-purple-400 border border-purple-900/30 flex items-center gap-2 transition active:scale-95">
                                        <Search size={14} /> Detetive
                                    </button>
                                    <button onClick={() => askGemini("Me dê um plano de resgate...")} className="whitespace-nowrap px-4 py-2 bg-gray-800 hover:bg-gray-700 hover:text-white rounded-full text-xs font-bold text-emerald-400 border border-emerald-900/30 flex items-center gap-2 transition active:scale-95">
                                        <Target size={14} /> Plano de Resgate
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 opacity-70">
                                        <button onClick={() => askGemini("O que é Reserva de Emergência?")} className="whitespace-nowrap px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700 rounded-full text-[10px] text-gray-300 border border-gray-700 transition">💡 O que é Reserva?</button>
                                        <button onClick={() => askGemini("Dicas simples para economizar no mercado")} className="whitespace-nowrap px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700 rounded-full text-[10px] text-gray-300 border border-gray-700 transition">🛒 Dicas de Mercado</button>
                                    </div>
                                    <div className="flex justify-between items-center bg-gradient-to-r from-amber-900/20 to-orange-900/20 p-2 rounded-lg border border-amber-900/30 cursor-pointer hover:bg-amber-900/30 transition" onClick={() => { setIsAIOpen(false); openPricingModal(); }}>
                                        <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1 ml-1"><Lock size={10} /> Desbloqueie análises da sua conta</span>
                                        <span className="text-[10px] bg-amber-600 hover:bg-amber-500 text-white px-3 py-1 rounded shadow-lg transition">Virar Premium</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* INPUT AREA (RODAPÉ INFERIOR - RESTAURADO) */}
                        <div className="p-4 border-t border-gray-800 bg-[#111]">

                            {/* Preview de Anexo */}
                            {attachment && (
                                <div className="mb-3 flex items-start animate-in slide-in-from-bottom-2">
                                    <div className="relative group">
                                        {attachment.type === 'image' ? (
                                            <img src={attachment.base64} alt="Preview" className="h-16 w-16 object-cover rounded-xl border border-gray-700 shadow-lg" />
                                        ) : (
                                            <div className="h-16 w-16 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center text-red-400"><FileText size={24} /></div>
                                        )}
                                        <button onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="absolute -top-2 -right-2 bg-gray-900 border border-gray-600 text-gray-400 hover:text-white rounded-full p-1 shadow-md transition"><X size={12} /></button>
                                    </div>
                                    <div className="ml-3 mt-1">
                                        <p className="text-xs text-emerald-500 font-bold flex items-center gap-1"><CheckCircle2 size={12} /> Arquivo pronto</p>
                                        <p className="text-[10px] text-gray-500 max-w-[200px] leading-tight mt-0.5">A IA vai ler os dados deste comprovante.</p>
                                    </div>
                                </div>
                            )}

                            {/* Controles de Input */}
                            <div className="flex gap-2 items-end">
                                <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileSelect} />

                                {/* Botão Clipe */}
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`p-3 rounded-xl border transition mb-[2px] ${attachment ? 'bg-emerald-900/20 text-emerald-500 border-emerald-500/50' : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:bg-gray-700'}`}
                                    title="Anexar Comprovante"
                                >
                                    <Paperclip size={20} />
                                </button>

                                {/* Campo de Texto */}
                                <div className="flex-1 relative">
                                    <textarea
                                        value={aiInput}
                                        onChange={(e) => setAiInput(e.target.value)}
                                        placeholder={attachment ? "Descreva o gasto (opcional)..." : "Digite ou envie comprovante..."}
                                        className="w-full bg-gray-900 text-white placeholder-gray-500 border border-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 resize-none h-12 max-h-32 scrollbar-hide"
                                        style={{ minHeight: '48px' }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                if (aiInput.trim() || attachment) {
                                                    askGemini(aiInput, attachment?.base64 || null);
                                                    setAiInput('');
                                                    setAttachment(null);
                                                    if (fileInputRef.current) fileInputRef.current.value = '';
                                                }
                                            }
                                        }}
                                    />
                                </div>

                                {/* Botão Enviar */}
                                <button
                                    onClick={() => {
                                        if (aiInput.trim() || attachment) {
                                            askGemini(aiInput, attachment?.base64 || null);
                                            setAiInput('');
                                            setAttachment(null);
                                            if (fileInputRef.current) fileInputRef.current.value = '';
                                        }
                                    }}
                                    disabled={isAiLoading || (!aiInput.trim() && !attachment)}
                                    className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition shadow-lg shadow-purple-900/20 mb-[2px]"
                                >
                                    {isAiLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}

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

            {AuthModals}

            <Toaster richColors position="top-center" theme={currentTheme === 'light' ? 'light' : 'dark'} />
        </div>
    );


}
