'use client';

import React, { useState, useEffect } from 'react';
import {
    CreditCard, TrendingDown, DollarSign, Plus, X, List, LayoutGrid, Sparkles, Send,
    Trash2, AlertCircle, CheckCircle2, Pencil, Clock, AlertTriangle, Check, LogIn,
    LogOut, User, Eye, EyeOff, CheckSquare, Square, ArrowRight, Crown, ShieldCheck,
    Mail, Loader2, Lock, BarChart3, Search, Target, Upload, FileText, ExternalLink,
    Users, ChevronDown, UserPlus, Briefcase, HelpCircle, Star, Zap, Shield, Palette,
    Layout, MousePointerClick, FolderPlus, Layers, FileSpreadsheet,
    // NOVOS ÍCONES PARA O SELETOR 👇
    ShoppingCart, Home, Car, Utensils, GraduationCap, HeartPulse, Plane, Gamepad2, Smartphone
} from 'lucide-react'; import { supabase } from '@/supabase';
import { driver } from "driver.js";
import "driver.js/dist/driver.css";
import TimelineView from '@/components/dashboard/TimelineView';
import BentoView from '@/components/dashboard/BentoView';
import { Toaster, toast } from 'sonner';
import ProfileModal from '@/components/dashboard/ProfileModal';
import ExportModal from '@/components/dashboard/ExportModal';

// COMPONENTES
import StandardView from '@/components/dashboard/StandardView';
import TraderView from '@/components/dashboard/TraderView';
import CustomizationModal from '@/components/dashboard/CustomizationModal';
import ZenView from '@/components/dashboard/ZenView';
import CalendarView from '@/components/dashboard/CalendarView';
// Se tiver criado o Zen e Calendar, importe aqui:
// import ZenView from '@/components/dashboard/ZenView';
// import CalendarView from '@/components/dashboard/CalendarView';
// MAPA DE ÍCONES (Para o Seletor do Formulário)
const ICON_MAP: any = {
    'shopping-cart': ShoppingCart, 'home': Home, 'car': Car, 'utensils': Utensils,
    'zap': Zap, 'graduation-cap': GraduationCap, 'heart-pulse': HeartPulse,
    'plane': Plane, 'gamepad-2': Gamepad2, 'smartphone': Smartphone, 'dollar-sign': DollarSign
};

const STRIPE_PRICES = {
    PREMIUM: 'price_1SwQtoBVKV78UpHa2QmMCB6v',
    PRO: 'price_1SwlpKBVKV78UpHa8vfm11Uo',
    AGENT: 'price_1SwQumBVKV78UpHaxUSMAGhW'
};

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function FinancialDashboard() {
    const currentSystemMonthIndex = new Date().getMonth();
    const currentSystemMonthName = MONTHS[currentSystemMonthIndex];
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [newPassword, setNewPassword] = useState('');

    // --- ESTADOS GLOBAIS ---
    const [activeTab, setActiveTab] = useState(currentSystemMonthName);
    // Exemplo (se estiver usando TypeScript explícito)
    const [currentLayout, setCurrentLayout] = useState<'standard' | 'trader' | 'zen' | 'calendar' | 'timeline' | 'bento'>('standard');
    const [currentTheme, setCurrentTheme] = useState('default');
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    // --- WORKSPACES (PERFIS DE DADOS) ---
    const [workspaces, setWorkspaces] = useState<any[]>([]);
    const [currentWorkspace, setCurrentWorkspace] = useState<any>(null); // O ID do perfil atual
    const [isNewProfileModalOpen, setIsNewProfileModalOpen] = useState(false);
    const [newProfileName, setNewProfileName] = useState('');

    // --- MODAIS ---
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isAIOpen, setIsAIOpen] = useState(false);
    const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
    const [isPricingOpen, setIsPricingOpen] = useState(false);
    const [isClientModalOpen, setIsClientModalOpen] = useState(false);
    const [isRolloverModalOpen, setIsRolloverModalOpen] = useState(false);
    const [isCustomizationOpen, setIsCustomizationOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);

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
        title: '', amount: '', installments: '', dueDay: '', category: 'Outros', targetMonth: currentSystemMonthName, isFixedIncome: false, fixedMonthlyValue: '', receiptUrl: '', icon: ''
    };
    const [formData, setFormData] = useState(initialFormState);
    const [uploadingFile, setUploadingFile] = useState(false);

    // --- AI ---
    const [aiPrompt, setAiPrompt] = useState('');
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
    // --- TOUR GUIADO ---
    // --- TUTORIAL / TOUR GUIADO (VERSÃO FUSION COMPLETA) ---
    const runTour = () => {
        // 1. Verifica se a biblioteca carregou
        const driver = (window as any).driver?.js?.driver;
        if (!driver) return;

        // --- ROTEIRO DO AGENTE (Consultor) ---
        const agentSteps = [
            {
                element: '#agent-bar',
                popover: {
                    title: '🕵️ Painel do Consultor',
                    description: 'Esta barra roxa é sua central de comando. Só você vê isso.',
                    side: "bottom", align: 'start'
                }
            },
            {
                element: '#client-selector',
                popover: {
                    title: '📂 Seus Clientes',
                    description: 'Aqui ficam as carteiras dos seus clientes. Clique para entrar na conta deles e gerenciar tudo como se fosse eles.',
                    side: "bottom", align: 'start'
                }
            },
            {
                element: '#btn-add-client',
                popover: {
                    title: '➕ Adicionar Cliente',
                    description: 'Cadastre um novo cliente pelo e-mail. Se ele já tiver conta, ele vira PRO automaticamente e vincula a você.',
                    side: "left", align: 'start'
                }
            },
            {
                element: '#card-saldo',
                popover: {
                    title: '👁️ Visão Dinâmica',
                    description: 'Quando você seleciona um cliente, o saldo e os gráficos mostram a realidade DELE, não a sua.',
                    side: "bottom", align: 'start'
                }
            },
            {
                element: '#btn-export',
                popover: {
                    title: '📊 Relatórios em Excel',
                    description: 'Precisa enviar dados para o contador ou analisar offline? Clique aqui para gerar planilhas detalhadas e profissionais.',
                    side: "bottom",
                    align: 'end'
                }
            }


        ];

        // --- ROTEIRO PADRÃO (Restaurado com seus textos originais) ---
        const standardSteps = [
            {
                element: '#logo-area',
                popover: { title: 'Olá! Sou seu Aliado 🛡️', description: 'Vou te ajudar a dominar suas finanças.' }
            },
            // Só mostra o passo de Login se o botão existir (usuário deslogado)
            ...(document.getElementById('btn-login') ? [{
                element: '#btn-login',
                popover: { title: 'Salve na Nuvem ☁️', description: 'Crie sua conta para acessar em qualquer lugar.' }
            }] : []),
            {
                element: '#btn-novo',
                popover: { title: 'Lançar Contas', description: 'Clique aqui para adicionar gastos, salários ou parcelas.' }
            },
            {
                element: '#btn-export',
                popover: {
                    title: '📊 Relatórios em Excel',
                    description: 'Precisa enviar dados para o contador ou analisar offline? Clique aqui para gerar planilhas detalhadas e profissionais.',
                    side: "bottom",
                    align: 'end'
                }
            },
            {
                element: '#card-saldo',
                popover: { title: 'Seu Termômetro 🌡️', description: 'Aqui fica o saldo final. Verde é lucro, Vermelho é alerta!' }
            },
            {
                element: '#btn-ai',
                popover: { title: 'Cérebro Financeiro 🧠', description: 'Fale com a IA para analisar gastos ou pedir dicas.' }
            }
        ];

        // Adiciona o passo dos "Controles" dinamicamente (se houver contas na tela)
        const firstActionGroup = document.getElementById('action-group-0');
        if (firstActionGroup) {
            standardSteps.push({
                element: '#action-group-0',
                popover: { title: 'Controles 🎮', description: 'Use os ícones na lista para pagar, adiar ou editar contas.' }
            });
        }

        // --- DECISÃO: QUAL TOUR RODAR? ---
        const steps = (userPlan === 'agent') ? agentSteps : standardSteps;

        // Configuração e Start
        const driverObj = driver({
            showProgress: true,
            animate: true,
            steps: steps,
            nextBtnText: 'Próximo ->',
            prevBtnText: 'Anterior',
            doneBtnText: 'Entendi!',
            overlayColor: 'rgba(0,0,0,0.8)'
        });

        driverObj.drive();
    };
    // --- AUTO-RUN DO TUTORIAL (SÓ NA PRIMEIRA VEZ) ---
    useEffect(() => {
        // 1. Verifica se é Agente e se o Driver.js já carregou
        if (userPlan === 'agent' && (window as any).driver) {

            // 2. Verifica no "cérebro" do navegador se já mostramos o tour
            const hasSeenTour = localStorage.getItem('has_seen_agent_tour_v1');

            if (!hasSeenTour) {
                // 3. Pequeno delay para garantir que a barra roxa renderizou
                setTimeout(() => {
                    runTour();
                    // 4. Marca como "visto" para não mostrar de novo
                    localStorage.setItem('has_seen_agent_tour_v1', 'true');
                }, 1500); // 1.5 segundos de espera
            }
        }
    }, [userPlan]); // Roda sempre que o plano do usuário carregar

    useEffect(() => {
        const hasSeenTour = localStorage.getItem('hasSeenTour_v3');
        if (!hasSeenTour) { setTimeout(() => { runTour(); localStorage.setItem('hasSeenTour_v3', 'true'); }, 1500); }
    }, [userPlan, transactions]);

    const getReceiptForMonth = (item: any, month: string) => {
        if (!item.receipt_url) return null;
        try { const json = JSON.parse(item.receipt_url); return json[month] || null; }
        catch (e) { return item.receipt_url; }
    };

    // --- AUTH & LOAD INICIAL ---
    // --- AUTH & LOAD INICIAL (ATUALIZADO) ---
    // --- AUTH & LOAD INICIAL (VERSÃO BLINDADA) ---
    useEffect(() => {
        const checkUser = async () => {
            try {
                // 1. Verifica se tem #access_token e type=recovery na URL (O Pulo do Gato)
                const hash = window.location.hash;
                if (hash && hash.includes('type=recovery')) {
                    console.log("🚨 Link de recuperação detectado via URL!");
                    setIsChangePasswordOpen(true); // Força o modal a abrir
                }

                const { data, error } = await supabase.auth.getSession();
                if (error) { await supabase.auth.signOut(); setUser(null); return; }

                const currentUser = data.session?.user || null;
                setUser(currentUser);

                if (currentUser) {
                    fetchUserProfile(currentUser.id);
                    fetchWorkspaces(currentUser.id);
                }
            } catch (e) { setUser(null); }
        };
        checkUser();

        // ESCUTA EVENTOS (Mantemos como backup)
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("🔔 Evento Auth:", event); // Para você ver no console (F12)

            if (event === 'PASSWORD_RECOVERY') {
                setIsChangePasswordOpen(true);
            }
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

    // --- GESTÃO DE WORKSPACES ---
    const fetchWorkspaces = async (userId: string, forceSelectFirst = false) => {
        const { data } = await supabase.from('workspaces').select('*').eq('user_id', userId).order('created_at', { ascending: true });

        if (data && data.length > 0) {
            setWorkspaces(data);

            // Lógica melhorada: Se forçar (ao trocar de cliente) OU se não tiver nenhum selecionado
            if (forceSelectFirst || !currentWorkspace) {
                setCurrentWorkspace(data[0]);
                loadData(userId, data[0].id); // Carrega dados IMEDIATAMENTE com o workspace certo
            }
        } else {
            // Fallback: Cria o 'Pessoal' se não existir
            const { data: newW } = await supabase.from('workspaces').insert({ user_id: userId, title: 'Pessoal' }).select().single();
            if (newW) {
                setWorkspaces([newW]);
                setCurrentWorkspace(newW);
                loadData(userId, newW.id);
            }
        }
    };

    const handleCreateProfile = async () => {
        // --- TRAVA 1: USUÁRIO LOCAL (SEM CONTA) ---
        // ... dentro das travas ...
        if (!user) {
            setIsNewProfileModalOpen(false);
            toast.info("Recurso na Nuvem Necessário", { description: "Crie uma conta gratuita para salvar seus perfis." }); // Troquei
            setIsAuthModalOpen(true);
            return;
        }

        if (userPlan === 'free' && workspaces.length >= 1) {
            setIsNewProfileModalOpen(false);
            toast.error("Limite de Perfis Atingido", { description: "Seja Premium para criar múltiplos perfis." }); // Troquei
            openPricingModal();
            return;
        }

        // --- CRIAÇÃO DO PERFIL (Se passou pelas travas) ---
        if (!newProfileName) return;
        const { data, error } = await supabase.from('workspaces').insert({
            user_id: user.id,
            title: newProfileName
        }).select().single();

        if (data) {
            setWorkspaces([...workspaces, data]);
            setCurrentWorkspace(data);
            setNewProfileName('');
            setIsNewProfileModalOpen(false);
            setTransactions([]); setInstallments([]); setRecurring([]);
        }
    };

    const switchWorkspace = (workspace: any) => {
        if (workspace.id === currentWorkspace?.id) return;
        setCurrentWorkspace(workspace);

        // EFEITO DE LIMPEZA (O que você pediu!)
        setTransactions([]);
        setInstallments([]);
        setRecurring([]);

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

    const fetchClients = async (managerId: string) => {
        const { data, error } = await supabase.from('manager_clients').select('*').eq('manager_id', managerId);
        if (data) setClients(data);
    };

    const handleAddClient = async () => {
        if (!newClientEmail) return toast.warning("Digite o e-mail do cliente."); // Troquei

        setAddingClient(true);
        const { error } = await supabase.from('manager_clients').insert({ manager_id: user.id, client_email: newClientEmail, status: 'active' });

        if (error) {
            toast.error("Erro ao adicionar: " + error.message); // Troquei
        } else {
            setNewClientEmail('');
            setIsClientModalOpen(false);
            fetchClients(user.id);
            toast.success("Cliente adicionado com sucesso! 🎉"); // Troquei
        }
        setAddingClient(false);
    };

    const switchView = async (client: any | null) => {
        setViewingAs(client); // Define visualmente que está vendo o cliente

        const targetUserId = client ? client.client_id : user?.id;

        if (targetUserId) {
            // AQUI ESTÁ A CORREÇÃO:
            // Passamos 'true' para forçar o sistema a pegar o workspace do cliente
            // e esquecer o seu workspace de agente temporariamente.
            await fetchWorkspaces(targetUserId, true);
        }
    };

    useEffect(() => {
        if (transactions.length > 0 || installments.length > 0) checkForPastDueItems();
    }, [transactions, installments, recurring]);

    // --- LOAD DATA (AGORA RECEBE O WORKSPACE ID) ---
    const loadData = async (userId: string, workspaceId: string) => {
        if (!userId || !workspaceId) return;

        // Se for 'context' antigo (texto), pode precisar migrar, mas vamos assumir que o ID vai ser salvo na coluna context
        const { data: trans } = await supabase.from('transactions').select('*').eq('user_id', userId).eq('context', workspaceId);
        const { data: inst } = await supabase.from('installments').select('*').eq('user_id', userId).eq('context', workspaceId);
        const { data: recur } = await supabase.from('recurring').select('*').eq('user_id', userId).eq('context', workspaceId);

        if (trans) setTransactions(trans);
        if (inst) setInstallments(inst);
        if (recur) setRecurring(recur);
    };

    const saveDataLocal = (newTrans: any[], newInst: any[], newRecur: any[]) => {
        // Modo offline simplificado (salva apenas no slot generico por enquanto)
        setTransactions(newTrans); setInstallments(newInst); setRecurring(newRecur);
        localStorage.setItem(`guest_transactions`, JSON.stringify(newTrans));
        localStorage.setItem(`guest_installments`, JSON.stringify(newInst));
        localStorage.setItem(`guest_recurring`, JSON.stringify(newRecur));
    };

    const checkForPastDueItems = () => {
        const overdueItems: any[] = [];
        const currentIdx = MONTHS.indexOf(currentSystemMonthName);
        for (let i = 0; i < currentIdx; i++) {
            const pastMonthName = MONTHS[i];
            const pastMonthMap: Record<string, string> = { 'Jan': '/01', 'Fev': '/02', 'Mar': '/03', 'Abr': '/04', 'Mai': '/05', 'Jun': '/06', 'Jul': '/07', 'Ago': '/08', 'Set': '/09', 'Out': '/10', 'Nov': '/11', 'Dez': '/12' };
            const dateFilter = pastMonthMap[pastMonthName];
            transactions.forEach(t => { if (t.type === 'expense' && t.date?.includes(dateFilter) && !t.is_paid && t.status !== 'delayed') overdueItems.push({ ...t, origin: 'transactions', month: pastMonthName }); });
            installments.forEach(inst => { const pastInstNum = inst.current_installment + i; if (pastInstNum >= 1 && pastInstNum <= inst.installments_count) { if (!inst.paid_months?.includes(pastMonthName) && inst.status !== 'delayed') overdueItems.push({ ...inst, origin: 'installments', month: pastMonthName, amount: inst.value_per_month }); } });
            recurring.forEach(rec => { const startMonthIndex = rec.start_date ? parseInt(rec.start_date.split('/')[1]) - 1 : 0; if (i >= startMonthIndex && rec.type === 'expense' && !rec.paid_months?.includes(pastMonthName) && !rec.skipped_months?.includes(pastMonthName) && rec.status !== 'delayed') { overdueItems.push({ ...rec, origin: 'recurring', month: pastMonthName, amount: rec.value }); } });
        }
        if (overdueItems.length > 0) { setPastDueItems(overdueItems); setTimeout(() => setIsRolloverModalOpen(true), 1000); }
    };

    const handleAuth = async () => {
        setLoadingAuth(true); setAuthMessage('');
        if (authMode === 'login') {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) setAuthMessage("❌ " + error.message);
            else { setAuthMessage("✅ Login realizado!"); setTimeout(() => { setIsAuthModalOpen(false); window.location.reload(); }, 1000); }
        } else {
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) setAuthMessage("❌ " + error.message); else setShowEmailCheck(true);
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
        if (!newPassword) return toast.warning("Digite a nova senha."); // Troquei

        setLoadingAuth(true);
        const { error } = await supabase.auth.updateUser({ password: newPassword });

        if (error) {
            toast.error("Erro ao atualizar: " + error.message); // Troquei
        } else {
            toast.success("Senha atualizada com sucesso! 🔒"); // Troquei
            setIsChangePasswordOpen(false);
            setNewPassword('');
        }
        setLoadingAuth(false);
    };

    const handleLogout = async () => { await supabase.auth.signOut(); window.location.reload(); };

    const openPricingModal = () => { if (!user) { setIsAuthModalOpen(true); setAuthMessage("✨ Crie uma conta grátis."); return; } setIsPricingOpen(true); };

    const handleCheckout = async (planType: 'PREMIUM' | 'PRO' | 'AGENT') => {
        const btn = document.getElementById(`checkout-btn-${planType}`);
        if (btn) btn.innerText = "Processando...";
        const priceId = STRIPE_PRICES[planType];
        try {
            const response = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, email: user.email, priceId }), });
            const data = await response.json();
            if (data.url) window.location.href = data.url;
            else toast.error("Erro ao criar pagamento."); // Troquei
        } catch (e) {
            toast.error("Erro de conexão. Tente novamente."); // Troquei
        }
        if (btn) btn.innerText = "Assinar Agora";
    };
    // ... outras funções ...

    const handleManageSubscription = async () => {
        if (!user) return;

        if (userPlan === 'free') {
            toast.info("Sem assinatura ativa", { description: "Faça o upgrade para ter o que gerenciar!" });
            openPricingModal();
            return;
        }

        const toastId = toast.loading("Abrindo portal de assinatura...");

        try {
            // 1. PEGAR A SESSÃO ATUAL PARA OBTER O TOKEN
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) {
                throw new Error("Sessão inválida. Faça login novamente.");
            }

            // 2. ENVIAR O TOKEN NO HEADER (Authorization)
            const response = await fetch('/api/portal', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // <--- O PULO DO GATO 🐈
                }
            });

            const data = await response.json();

            if (data.url) {
                window.location.href = data.url;
            } else {
                // Se der erro, joga pro catch
                throw new Error(data.error || "Não foi possível abrir o portal.");
            }
        } catch (error: any) {
            console.error(error);
            toast.error("Erro ao abrir portal", { description: error.message });
        } finally {
            toast.dismiss(toastId);
        }
    };

    const getActiveUserId = () => viewingAs ? viewingAs.client_id : user?.id;

    // --- CRUD (AGORA USA O WORKSPACE ATUAL) ---
    const handleDelete = async (table: string, id: number) => {
        if (!confirm("Tem certeza?")) return;
        const activeId = getActiveUserId();
        if (user && activeId) { await supabase.from(table).delete().eq('id', id); loadData(activeId, currentWorkspace?.id); }
        else { if (table === 'transactions') saveDataLocal(transactions.filter(t => t.id !== id), installments, recurring); else if (table === 'installments') saveDataLocal(transactions, installments.filter(i => i.id !== id), recurring); else saveDataLocal(transactions, installments, recurring.filter(r => r.id !== id)); }
    };

    const togglePaid = async (table: string, id: number, currentStatus: boolean) => {
        const activeId = getActiveUserId();
        if (user && activeId) { await supabase.from(table).update({ is_paid: !currentStatus }).eq('id', id); loadData(activeId, currentWorkspace?.id); } else { const updateList = (list: any[]) => list.map(i => i.id === id ? { ...i, is_paid: !currentStatus } : i); if (table === 'transactions') saveDataLocal(updateList(transactions), installments, recurring); }
    };

    const toggleDelay = async (table: string, item: any) => {
        const newStatus = item.status === 'delayed' ? 'active' : 'delayed'; const activeId = getActiveUserId();
        if (user && activeId) { await supabase.from(table).update({ status: newStatus }).eq('id', item.id); loadData(activeId, currentWorkspace?.id); } else { const updateStatus = (list: any[]) => list.map(i => i.id === item.id ? { ...i, status: newStatus } : i); if (table === 'transactions') saveDataLocal(updateStatus(transactions), installments, recurring); else if (table === 'installments') saveDataLocal(transactions, updateStatus(installments), recurring); else saveDataLocal(transactions, installments, updateStatus(recurring)); } if (isRolloverModalOpen) setPastDueItems(prev => prev.filter(i => i.id !== item.id || i.origin !== table));
    };

    const toggleSkipMonth = async (item: any) => {
        const currentSkipped = item.skipped_months || []; const isSkipped = currentSkipped.includes(activeTab); let newSkipped = isSkipped ? currentSkipped.filter((m: string) => m !== activeTab) : [...currentSkipped, activeTab]; const activeId = getActiveUserId();
        if (user && activeId) { await supabase.from('recurring').update({ skipped_months: newSkipped }).eq('id', item.id); loadData(activeId, currentWorkspace?.id); } else { const newRecur = recurring.map(r => r.id === item.id ? { ...r, skipped_months: newSkipped } : r); saveDataLocal(transactions, installments, newRecur); }
    };

    const togglePaidMonth = async (table: string, item: any) => {
        const currentPaid = item.paid_months || []; const isPaid = currentPaid.includes(activeTab); let newPaid = isPaid ? currentPaid.filter((m: string) => m !== activeTab) : [...currentPaid, activeTab]; const activeId = getActiveUserId();
        if (user && activeId) { await supabase.from(table).update({ paid_months: newPaid }).eq('id', item.id); loadData(activeId, currentWorkspace?.id); } else { const updateList = (list: any[]) => list.map(i => i.id === item.id ? { ...i, paid_months: newPaid } : i); if (table === 'installments') saveDataLocal(transactions, updateList(installments), recurring); if (table === 'recurring') saveDataLocal(transactions, installments, updateList(recurring)); }
    };

    const handleEdit = (item: any, mode: any) => { setFormMode(mode); setEditingId(item.id); const currentReceipt = getReceiptForMonth(item, activeTab); setFormData({ title: item.title, amount: item.amount || item.value || item.total_value || '', installments: item.installments_count || '', dueDay: item.due_day || '', category: item.category || 'Outros', targetMonth: item.target_month || activeTab, isFixedIncome: mode === 'income' && item.category === 'Salário', fixedMonthlyValue: item.fixed_monthly_value || '', receiptUrl: currentReceipt || '', icon: item.icon || '' }); setIsFormOpen(true); };
    const openNewTransactionModal = () => { setEditingId(null); setFormData({ ...initialFormState, targetMonth: activeTab }); setIsFormOpen(true); };

    const handleFileUpload = async (e: any) => {
        const file = e.target.files[0];
        if (!file || !user) return;
        setUploadingFile(true);
        try { const fileExt = file.name.split('.').pop(); const fileName = `${user.id}/${Date.now()}.${fileExt}`; const { error: uploadError } = await supabase.storage.from('comprovantes').upload(fileName, file); if (uploadError) throw uploadError; const { data } = supabase.storage.from('comprovantes').getPublicUrl(fileName); setFormData({ ...formData, receiptUrl: data.publicUrl }); } catch (error: any) { toast.error("Erro no upload: " + error.message); } finally { setUploadingFile(false); }
    };

    const handleRemoveReceipt = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); if (confirm("Tem certeza?")) setFormData({ ...formData, receiptUrl: '' }); };

    const handleSubmit = async () => {
        // 1. Verificação de Plano Free
        const totalItems = transactions.length + installments.length + recurring.length;
        const FREE_LIMIT = 50;
        // ... trava do plano free ...
        if (userPlan === 'free' && totalItems >= FREE_LIMIT && !editingId) {
            toast.error("Limite Grátis Atingido!", { description: "Você já usou seus 50 lançamentos mensais." }); // Troquei
            openPricingModal();
            return;
        }

        // 2. Validação Básica
        if (!formData.title || !formData.amount) return;

        // 3. Preparação dos Dados
        const amountVal = parseFloat(formData.amount.toString());
        const fixedInstallmentVal = formData.fixedMonthlyValue ? parseFloat(formData.fixedMonthlyValue.toString()) : null;
        const monthMap: Record<string, string> = { 'Jan': '01', 'Fev': '02', 'Mar': '03', 'Abr': '04', 'Mai': '05', 'Jun': '06', 'Jul': '07', 'Ago': '08', 'Set': '09', 'Out': '10', 'Nov': '11', 'Dez': '12' };
        const dateString = `01/${monthMap[formData.targetMonth]}/2026`;
        const context = currentWorkspace?.id;

        // 4. Lógica do Comprovante (Mantida)
        let finalReceiptData: string | null = formData.receiptUrl;
        if ((formMode === 'installment' || formMode === 'fixed_expense') && editingId) {
            const originalItem = [...installments, ...recurring].find(i => i.id === editingId);
            if (originalItem) {
                let receiptJson: any = {};
                try { receiptJson = originalItem.receipt_url ? JSON.parse(originalItem.receipt_url) : {}; } catch { }
                receiptJson[formData.targetMonth] = formData.receiptUrl;
                finalReceiptData = JSON.stringify(receiptJson);
            }
        } else if ((formMode === 'installment' || formMode === 'fixed_expense') && !editingId) {
            finalReceiptData = formData.receiptUrl ? JSON.stringify({ [formData.targetMonth]: formData.receiptUrl }) : null;
        }

        const activeId = getActiveUserId();

        // --- O PULO DO GATO ESTÁ AQUI 👇 ---
        // Criamos um objeto base que TEM O ÍCONE e usamos ele em todos os tipos
        const baseData = {
            user_id: activeId,
            receipt_url: finalReceiptData,
            context: context,
            icon: formData.icon // <--- AQUI! Garantindo que o ícone vai pra todo mundo
        };

        const getPayload = () => {
            if (formMode === 'income') {
                return formData.isFixedIncome
                    ? { table: 'recurring', data: { ...baseData, title: formData.title, value: amountVal, due_day: 1, category: 'Salário', type: 'income', status: 'active', start_date: dateString } }
                    : { table: 'transactions', data: { ...baseData, title: formData.title, amount: amountVal, type: 'income', date: dateString, category: 'Receita', target_month: formData.targetMonth, status: 'active' } };
            }
            if (formMode === 'expense') {
                return { table: 'transactions', data: { ...baseData, title: formData.title, amount: amountVal, type: 'expense', date: dateString, category: formData.category, target_month: formData.targetMonth, status: 'active' } };
            }
            if (formMode === 'installment') {
                const qtd = parseInt(formData.installments.toString()) || 1;
                const realValuePerMonth = fixedInstallmentVal ? fixedInstallmentVal : (amountVal / qtd);
                const targetMonthIndex = MONTHS.indexOf(formData.targetMonth);
                const startOffset = 1 - targetMonthIndex;
                return { table: 'installments', data: { ...baseData, title: formData.title, total_value: amountVal, installments_count: qtd, current_installment: startOffset, value_per_month: realValuePerMonth, fixed_monthly_value: fixedInstallmentVal, due_day: parseInt(formData.dueDay.toString()) || 10, status: 'active' } };
            }
            // Fixed Expense
            return { table: 'recurring', data: { ...baseData, title: formData.title, value: amountVal, due_day: parseInt(formData.dueDay.toString()) || 10, category: 'Fixa', type: 'expense', status: 'active', start_date: dateString } };
        };

        const { table, data } = getPayload();

        // 5. Envio ao Supabase
        if (user && activeId) {
            if (editingId) await supabase.from(table).update(data).eq('id', editingId);
            else await supabase.from(table).insert([data]);
            loadData(activeId, context);
        } else {
            // Modo Local (Sem Login)
            const newItem = { ...data, id: editingId || Date.now(), is_paid: false };
            if (table === 'transactions') { const list = editingId ? transactions.map(t => t.id === editingId ? newItem : t) : [newItem, ...transactions]; saveDataLocal(list, installments, recurring); }
            else if (table === 'installments') { const list = editingId ? installments.map(i => i.id === editingId ? newItem : i) : [...installments, newItem]; saveDataLocal(transactions, list, recurring); }
            else { const list = editingId ? recurring.map(r => r.id === editingId ? newItem : r) : [...recurring, newItem]; saveDataLocal(transactions, installments, list); }
        }

        // Limpeza
        setFormData({ ...initialFormState, targetMonth: activeTab });
        setEditingId(null);
        setIsFormOpen(false);
    };

    // --- CALCULA DADOS DO MÊS (CORRIGIDO E ORGANIZADO) ---
    const getMonthData = (monthName: string) => {
        const monthIndex = MONTHS.indexOf(monthName);
        const monthMap: Record<string, string> = { 'Jan': '/01', 'Fev': '/02', 'Mar': '/03', 'Abr': '/04', 'Mai': '/05', 'Jun': '/06', 'Jul': '/07', 'Ago': '/08', 'Set': '/09', 'Out': '/10', 'Nov': '/11', 'Dez': '/12' };
        const dateFilter = monthMap[monthName];

        const isRecurringActive = (rec: any, checkIndex: number) => {
            if (!rec.start_date) return true;
            const startMonthIndex = parseInt(rec.start_date.split('/')[1]) - 1;
            return checkIndex >= startMonthIndex;
        };

        const incomeFixed = recurring.filter(r => r.type === 'income' && isRecurringActive(r, monthIndex) && !r.skipped_months?.includes(monthName)).reduce((acc, curr) => acc + curr.value, 0);
        const incomeVariable = transactions.filter(t => t.type === 'income' && t.date?.includes(dateFilter) && t.status !== 'delayed').reduce((acc, curr) => acc + curr.amount, 0);
        const incomeTotal = incomeFixed + incomeVariable;

        const expenseVariable = transactions.filter(t => t.type === 'expense' && t.date?.includes(dateFilter) && t.status !== 'delayed').reduce((acc, curr) => acc + curr.amount, 0);
        const expenseFixed = recurring.filter(r => r.type === 'expense' && isRecurringActive(r, monthIndex) && !r.skipped_months?.includes(monthName) && r.status !== 'delayed').reduce((acc, curr) => acc + curr.value, 0);

        const installTotal = installments.reduce((acc, curr) => {
            if (curr.status === 'delayed') return acc;
            const offset = monthIndex;
            const actualInstallment = curr.current_installment + offset;
            if (actualInstallment >= 1 && actualInstallment <= curr.installments_count) return acc + curr.value_per_month;
            return acc;
        }, 0);

        // AQUI ESTAVA O PROBLEMA: Agora ele soma (value_per_month OU value)
        const delayedTotal =
            transactions.filter(t => t.status === 'delayed').reduce((acc, curr) => acc + curr.amount, 0) +
            installments.filter(i => i.status === 'delayed').reduce((acc, curr) => acc + (curr.value_per_month || curr.value || 0), 0) +
            recurring.filter(r => r.status === 'delayed' && r.type === 'expense').reduce((acc, curr) => acc + curr.value, 0);

        let accumulatedDebt = 0;
        for (let i = 0; i < monthIndex; i++) {
            const pastMonth = MONTHS[i];
            installments.forEach(inst => {
                const pastInst = inst.current_installment + i;
                if (inst.status !== 'delayed' && pastInst >= 1 && pastInst <= inst.installments_count) {
                    if (!inst.paid_months?.includes(pastMonth)) accumulatedDebt += inst.value_per_month;
                }
            });
            recurring.filter(r => r.type === 'expense').forEach(rec => {
                if (rec.status !== 'delayed' && isRecurringActive(rec, i) && !rec.paid_months?.includes(pastMonth) && !rec.skipped_months?.includes(pastMonth)) {
                    accumulatedDebt += rec.value;
                }
            });
            const pastDateFilter = Object.values(monthMap)[i];
            transactions.forEach(t => {
                if (t.type === 'expense' && t.status !== 'delayed' && t.date?.includes(pastDateFilter) && !t.is_paid) {
                    accumulatedDebt += t.amount;
                }
            })
        }

        const totalObligations = expenseVariable + expenseFixed + installTotal + accumulatedDebt;

        return { income: incomeTotal, expenseTotal: totalObligations, accumulatedDebt, balance: incomeTotal - totalObligations, delayedTotal };
    };

    const currentMonthData = getMonthData(activeTab);
    let previousSurplus = 0;
    const currentIndex = MONTHS.indexOf(activeTab);
    if (currentIndex > 0) { const prevData = getMonthData(MONTHS[currentIndex - 1]); if (prevData.balance > 0) previousSurplus = prevData.balance; }
    const displayBalance = currentMonthData.balance + previousSurplus;

    // --- FUNÇÃO IA CORRIGIDA (IDENTIDADE + ÍCONES) ---
    // --- FUNÇÃO IA "CENTRO DE COMANDO" ---
    // --- FUNÇÃO IA "CENTRO DE COMANDO" (BUSCA INTELIGENTE) ---
    // --- FUNÇÃO IA "CENTRO DE COMANDO" (AGORA COM MODO CARTEIRA) ---
    // --- FUNÇÃO IA COMPLETA (PORTFÓLIO + DETETIVE + TRAVA FREE) ---
    const askGemini = async (overridePrompt?: string) => {
        const promptToSend = overridePrompt || aiPrompt;
        if (!promptToSend) return;

        setIsLoading(true);
        setAiResponse('');
        setAiPrompt('');

        const promptLower = promptToSend.toLowerCase();
        let targetContextData = null;

        // --- MODO 1: VISÃO DE PORTFÓLIO (TODOS OS CLIENTES) ---
        const isPortfolioRequest = ['todos', 'geral', 'carteira', 'resumo dos clientes', 'visão geral'].some(k => promptLower.includes(k));

        if ((userPlan === 'agent' || userPlan === 'admin') && clients.length > 0 && isPortfolioRequest) {
            setAiResponse(`📊 Compilando relatório da carteira (${clients.length} clientes)...`);

            const clientIds = clients.map(c => c.client_id);
            const { data: allTrans } = await supabase.from('transactions').select('user_id, amount, type').in('user_id', clientIds).eq('status', 'active');
            const { data: allInst } = await supabase.from('installments').select('user_id, value_per_month').in('user_id', clientIds).eq('status', 'active');
            const { data: allRecur } = await supabase.from('recurring').select('user_id, value, type').in('user_id', clientIds).eq('status', 'active');

            const portfolioSummary = clients.map(client => {
                const cId = client.client_id;
                const cName = client.client_email.split('@')[0];
                const cTrans = allTrans?.filter(t => t.user_id === cId) || [];
                const cInst = allInst?.filter(i => i.user_id === cId) || [];
                const cRecur = allRecur?.filter(r => r.user_id === cId) || [];

                const income = cTrans.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0) +
                    cRecur.filter(r => r.type === 'income').reduce((acc, curr) => acc + curr.value, 0);

                const expense = cTrans.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0) +
                    cRecur.filter(r => r.type === 'expense').reduce((acc, curr) => acc + curr.value, 0) +
                    cInst.reduce((acc, curr) => acc + curr.value_per_month, 0);

                return { cliente: cName, renda: income, gastos: expense, saldo: income - expense, status: (income - expense) < 0 ? 'CRÍTICO 🚨' : 'SAUDÁVEL ✅' };
            });

            targetContextData = {
                report_type: 'PORTFOLIO_ANALYSIS',
                resumo_carteira: portfolioSummary,
                is_consultant: true,
                client_name: "Toda a Carteira"
            };
        }

        // --- MODO 2: DETETIVE (BUSCA ESPECÍFICA) ---
        if (!targetContextData && (userPlan === 'agent' || userPlan === 'admin') && clients.length > 0) {
            const mentionedClient = clients.find(c => {
                const emailPrefix = c.client_email.split('@')[0].toLowerCase();
                const nameParts = emailPrefix.split(/[._-]/);
                return nameParts.some((part: string) => part.length > 3 && promptLower.includes(part));
            });

            if (mentionedClient) {
                setAiResponse(`🔍 Consultando: ${mentionedClient.client_email}...`);
                const targetId = mentionedClient.client_id;

                const { data: trans } = await supabase.from('transactions').select('*').eq('user_id', targetId).eq('status', 'active');
                const { data: inst } = await supabase.from('installments').select('*').eq('user_id', targetId).eq('status', 'active');
                const { data: recur } = await supabase.from('recurring').select('*').eq('user_id', targetId).eq('status', 'active');

                const _trans = trans || []; const _inst = inst || []; const _recur = recur || [];

                const income = _trans.filter((t: any) => t.type === 'income').reduce((acc: number, curr: any) => acc + curr.amount, 0) +
                    _recur.filter((r: any) => r.type === 'income').reduce((acc: number, curr: any) => acc + curr.value, 0);

                const expense = _trans.filter((t: any) => t.type === 'expense').reduce((acc: number, curr: any) => acc + curr.amount, 0) +
                    _recur.filter((r: any) => r.type === 'expense').reduce((acc: number, curr: any) => acc + curr.value, 0) +
                    _inst.reduce((acc: number, curr: any) => acc + (curr.value_per_month || 0), 0);

                targetContextData = {
                    mes_atual: activeTab,
                    saldo: income - expense,
                    gastos_totais: expense,
                    renda: income,
                    maiores_gastos: _trans.filter((t: any) => t.type === 'expense').sort((a: any, b: any) => b.amount - a.amount).slice(0, 5).map((t: any) => `${t.title} (R$ ${t.amount})`),
                    parcelamentos_ativos: _inst.map((i: any) => ({ title: i.title, valor_mes: i.value_per_month, faltam: i.installments_count - i.current_installment })),
                    contas_fixas: _recur.filter((r: any) => r.type === 'expense').map((r: any) => ({ title: r.title, valor: r.value })),
                    is_consultant: true,
                    viewing_as_client: true,
                    client_name: mentionedClient.client_email.split('@')[0]
                };
            }
        }

        // --- MODO 3: VISÃO PADRÃO ---
        if (!targetContextData) {
            const topExpenses = transactions.filter(t => t.type === 'expense' && t.status !== 'delayed').sort((a, b) => b.amount - a.amount).slice(0, 15);
            const activeInstallments = installments.filter(i => i.status !== 'delayed').map(i => ({ title: i.title, parcelas: i.installments_count, valor_mes: i.value_per_month }));
            const fixedCosts = recurring.filter(r => r.type === 'expense' && r.status !== 'delayed').map(r => ({ title: r.title, valor: r.value }));
            const clientNameOnScreen = viewingAs ? (viewingAs.client_email?.split('@')[0] || "Cliente") : "Você";

            targetContextData = {
                mes_atual: activeTab,
                saldo: currentMonthData.balance,
                gastos_totais: currentMonthData.expenseTotal,
                renda: currentMonthData.income,
                maiores_gastos: topExpenses,
                parcelamentos_ativos: activeInstallments,
                contas_fixas: fixedCosts,
                is_consultant: (userPlan === 'agent' || userPlan === 'admin'),
                viewing_as_client: !!viewingAs,
                client_name: clientNameOnScreen
            };
        }

        const context = currentWorkspace?.id;

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: promptToSend, contextData: targetContextData, userPlan })
            });

            const data = await response.json();
            const text = data.response || "";

            // --- LÓGICA DE COMANDOS (ADD/LANÇAR) ---
            // Só tenta executar comandos se NÃO for relatório de portfólio
            if (!targetContextData.report_type) {
                const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
                const firstBracket = cleanText.search(/\[|\{/);
                const lastBracket = cleanText.search(/\]|\}(?!.*\]|\})/);

                if (firstBracket !== -1 && lastBracket !== -1) {
                    const potentialJson = cleanText.substring(firstBracket, lastBracket + 1);
                    try {
                        const parsed = JSON.parse(potentialJson);
                        const commands = Array.isArray(parsed) ? parsed : [parsed];

                        // --- TRAVA DE SEGURANÇA DO PLANO FREE 🔒 ---
                        // Se a IA mandou comando de adicionar, mas o usuário é FREE
                        if (userPlan === 'free' && commands.some((c: any) => c.action === 'add')) {
                            setAiResponse(`🔒 **Funcionalidade Bloqueada**\n\nNo plano Lite, eu posso analisar seus dados e tirar dúvidas, mas **não tenho permissão para lançar contas automaticamente**.\n\nPor favor, faça o upgrade para que eu possa gerenciar seus lançamentos.`);
                            setIsLoading(false);
                            return; // PARE TUDO AQUI
                        }
                        // --------------------------------------------

                        let itemsAdded = 0;
                        for (const command of commands) {
                            const activeId = getActiveUserId();
                            if (command.action === 'add' && user && activeId) {
                                let payload: any = { user_id: activeId, context: context };
                                const rawData = command.data;
                                const todayDate = new Date().toLocaleDateString('pt-BR');
                                let validDate = rawData.date;
                                if (!validDate || validDate === 'DD/MM/AAAA' || validDate.includes('DD/MM')) validDate = todayDate;

                                const aiIcon = rawData.icon || null;

                                if (command.table === 'installments') {
                                    const totalVal = rawData.total_value || rawData.amount || rawData.value || 0;
                                    const qtd = rawData.installments_count || 1;
                                    const currentMonthIndex = MONTHS.indexOf(activeTab);
                                    const installmentOffset = 1 - currentMonthIndex;
                                    payload = { ...payload, title: rawData.title, total_value: totalVal, installments_count: qtd, value_per_month: rawData.value_per_month || (totalVal / qtd), current_installment: installmentOffset, fixed_monthly_value: null, due_day: rawData.due_day || 10, status: 'active', paid_months: [], icon: aiIcon };
                                }
                                else if (command.table === 'transactions') {
                                    payload = { ...payload, title: rawData.title, amount: rawData.amount || rawData.value || 0, type: rawData.type || 'expense', category: rawData.category || 'Outros', date: validDate, target_month: rawData.target_month || activeTab, status: 'active', is_paid: true, icon: aiIcon };
                                }
                                else if (command.table === 'recurring') {
                                    let validStartDate = rawData.start_date;
                                    if (!validStartDate || validStartDate.includes('DD/MM')) validStartDate = `01/${activeTab === 'Jan' ? '01' : '02'}/2026`;
                                    payload = { ...payload, title: rawData.title, value: rawData.value || rawData.amount || 0, type: rawData.type || 'expense', category: rawData.category || 'Fixa', start_date: validStartDate, status: 'active', due_day: rawData.due_day || 10, icon: aiIcon };
                                }
                                const { error } = await supabase.from(command.table).insert([payload]);
                                if (!error) itemsAdded++;
                            }
                        }
                        if (itemsAdded > 0) {
                            await loadData(getActiveUserId(), context);
                            setAiResponse(`✅ Feito! Registrei ${itemsAdded} lançamentos.`);
                            setIsLoading(false);
                            return;
                        }
                    } catch (e) { }
                }
            }

            setAiResponse(text);
        } catch (e) {
            setAiResponse("Erro ao consultar a base de dados.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={`min-h-screen p-4 md:p-8 font-sans relative transition-colors duration-500 ${getThemeClasses()}`}>

            {/* HEADER DE WORKSPACES (NOVO!) */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2">
                    <div className="bg-gray-900 border border-gray-800 rounded-xl p-1 flex gap-1">
                        {workspaces.map(ws => (
                            <button
                                key={ws.id}
                                onClick={() => switchWorkspace(ws)}
                                className={`px-4 py-2 rounded-lg text-xs font-bold transition flex items-center gap-2 ${currentWorkspace?.id === ws.id ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                            >
                                {currentWorkspace?.id === ws.id ? <Layers size={14} className="text-cyan-500" /> : null}
                                {ws.title}
                            </button>
                        ))}
                        <button onClick={() => setIsNewProfileModalOpen(true)} className="px-3 py-2 rounded-lg text-gray-500 hover:bg-gray-800 hover:text-white transition" title="Criar Novo Perfil"><FolderPlus size={14} /></button>
                    </div>
                </div>
            </div>

            <header className="flex flex-col xl:flex-row gap-6 justify-between items-center mb-10">
                <div id="logo-area" className="text-center md:text-left"><h1 className="text-4xl font-extrabold text-white flex items-center justify-center md:justify-start gap-2 tracking-tighter"><ShieldCheck className="text-cyan-500" size={32} /> Meu<span className="text-cyan-500">Aliado.</span></h1>

                    {/* DROPDOWN DE CLIENTES */}
                    <div id="menu-clientes" className="flex items-center gap-2 mt-2 justify-center md:justify-start">
                        {/* BARRA DO AGENTE (SUBSTITUI O MENU ANTIGO) */}
                        {(userPlan === 'agent' || userPlan === 'admin') && (
                            <div id="agent-bar" className="w-full bg-purple-950/30 border-b border-purple-500/20 p-2 mb-4 overflow-x-auto">
                                <div className="max-w-7xl mx-auto flex items-center gap-4 px-2">
                                    <div className="flex items-center gap-2 text-purple-400 min-w-fit font-bold uppercase text-xs tracking-wider">
                                        <Briefcase size={16} /> Painel Consultor
                                    </div>

                                    <div className="h-6 w-px bg-purple-500/20"></div>

                                    {/* SELETOR DE CLIENTES (COM ID PARA O TOUR) */}
                                    <div id="client-selector" className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1">
                                        <button
                                            onClick={() => switchView(null)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition whitespace-nowrap ${!viewingAs ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/50' : 'text-purple-300 hover:bg-purple-900/40'}`}
                                        >
                                            <User size={12} /> Minha Carteira
                                        </button>

                                        {/* Lista de Clientes */}
                                        {clients.map(client => (
                                            <button
                                                key={client.id}
                                                onClick={() => switchView(client)}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs transition whitespace-nowrap ${viewingAs?.id === client.id ? 'bg-purple-600 text-white shadow-lg' : 'text-purple-300 hover:bg-purple-900/40'}`}
                                            >
                                                <div className={`w-1.5 h-1.5 rounded-full ${client.client_id ? 'bg-emerald-400' : 'bg-orange-500'}`}></div>
                                                {client.client_email.split('@')[0]}
                                            </button>
                                        ))}
                                    </div>

                                    {/* BOTÃO ADICIONAR (COM ID PARA O TOUR) */}
                                    <button
                                        id="btn-add-client"
                                        onClick={() => setIsClientModalOpen(true)}
                                        className="ml-auto flex items-center gap-1 text-xs bg-purple-600 hover:bg-purple-500 text-white px-3 py-1.5 rounded-lg transition shadow-lg shadow-purple-900/20 whitespace-nowrap"
                                    >
                                        <UserPlus size={12} /> <span className="hidden md:inline">Novo Cliente</span>
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* BOTÕES DE AÇÃO (MOBILE FIX 📱) */}
                <div className="flex flex-wrap justify-center xl:justify-end gap-3 w-full xl:w-auto items-center">
                    {/* BOTÃO EXPORTAR (COM TRAVA PREMIUM 🔒) */}
                    <button
                        id="btn-export"
                        onClick={() => {
                            // SE FOR FREE, BLOQUEIA E VENDE O PEIXE 🐟
                            if (userPlan === 'free') {
                                toast.error("Recurso Premium", {
                                    description: "A exportação de relatórios profissionais é exclusiva para assinantes."
                                });
                                openPricingModal(); // Abre a tela de pagamento
                                return;
                            }
                            // SE FOR PRO/AGENT, LIBERA
                            setIsExportModalOpen(true);
                        }}
                        className={`h-12 w-12 flex items-center justify-center rounded-xl transition shadow-lg border relative ${userPlan === 'free' ? 'bg-gray-900 text-gray-500 border-gray-800 hover:bg-gray-800' : 'bg-gray-900 text-emerald-500 border-emerald-900/30 hover:bg-emerald-900/20'}`}
                        title={userPlan === 'free' ? "Exportar Excel (Bloqueado)" : "Exportar Relatório Excel"}
                    >
                        <FileSpreadsheet size={20} />
                        {/* Cadeado pequeno indicando bloqueio */}
                        {userPlan === 'free' && (
                            <div className="absolute -top-1 -right-1 bg-gray-800 rounded-full p-0.5 border border-gray-700">
                                <Lock size={10} className="text-amber-500" />
                            </div>
                        )}
                    </button>

                    {user ? (

                        <div className="relative">
                            {/* Botão Menu com ONCLICK (Clique) em vez de Hover */}
                            <button
                                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                                className={`h-12 bg-gray-900 border border-gray-800 text-gray-400 px-6 rounded-xl hover:bg-gray-800 hover:text-white flex items-center justify-center gap-2 whitespace-nowrap transition ${isUserMenuOpen ? 'border-gray-600 text-white' : ''}`}
                            >
                                {/* Se tiver avatar, mostra ele pequeno, senão mostra ícone User */}
                                {user.user_metadata?.avatar_url ? (
                                    <img src={user.user_metadata.avatar_url} className="w-5 h-5 rounded-full object-cover border border-gray-600" />
                                ) : (
                                    <User size={18} />
                                )}
                                Menu
                            </button>
                            {/* BOTÃO EXPORTAR (NOVO) */}

                            {/* Menu Dropdown Controlado por Estado */}
                            {isUserMenuOpen && (
                                <>
                                    {/* Fundo invisível para fechar ao clicar fora */}
                                    <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)}></div>

                                    <div className="absolute top-full right-0 pt-2 w-56 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                        <div className="bg-[#111] border border-gray-800 rounded-xl shadow-2xl overflow-hidden relative">
                                            <div className="p-2 space-y-1">

                                                {/* CABEÇALHO DO MENU (AVATAR + NOME) */}
                                                <div className="px-3 py-3 border-b border-gray-800 mb-1">
                                                    <div className="flex items-center gap-3">
                                                        {user.user_metadata?.avatar_url ? (
                                                            <img src={user.user_metadata.avatar_url} className="w-9 h-9 rounded-full border border-gray-600 object-cover shadow-sm" />
                                                        ) : (
                                                            <div className="w-9 h-9 rounded-full bg-gray-800 flex items-center justify-center text-gray-400 border border-gray-700"><User size={16} /></div>
                                                        )}
                                                        <div className="overflow-hidden">
                                                            <p className="text-white text-xs font-bold truncate max-w-[120px]" title={user.user_metadata?.full_name}>{user.user_metadata?.full_name || "Usuário"}</p>
                                                            <p className="text-gray-500 text-[10px] truncate max-w-[120px]" title={user.email}>{user.email}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* BOTÃO MEU PERFIL */}
                                                <button onClick={() => { setIsUserMenuOpen(false); setIsProfileModalOpen(true); }} className="w-full text-left px-3 py-2.5 rounded-lg text-xs flex items-center gap-2 text-gray-300 hover:bg-gray-800 hover:text-white transition font-medium">
                                                    <User size={14} className="text-cyan-500" /> Meu Perfil
                                                </button>

                                                {/* NOVO: GERENCIAR ASSINATURA (Só aparece se NÃO for Free) 💳 */}
                                                {userPlan !== 'free' && (
                                                    <button onClick={() => { setIsUserMenuOpen(false); handleManageSubscription(); }} className="w-full text-left px-3 py-2.5 rounded-lg text-xs flex items-center gap-2 text-gray-300 hover:bg-gray-800 hover:text-white transition font-medium">
                                                        <CreditCard size={14} className="text-emerald-500" /> Gerenciar Assinatura
                                                    </button>
                                                )}


                                                {/* PERSONALIZAR VISUAL */}
                                                {(userPlan === 'pro' || userPlan === 'agent') && (
                                                    <button onClick={() => { setIsUserMenuOpen(false); setIsCustomizationOpen(true); }} className="w-full text-left px-3 py-2.5 rounded-lg text-xs flex items-center gap-2 text-gray-300 hover:bg-gray-800 hover:text-white transition font-medium">
                                                        <Palette size={14} className="text-purple-500" /> Personalizar Visual
                                                    </button>
                                                )}

                                                {/* VIRAR CONSULTOR */}
                                                {userPlan !== 'agent' && (
                                                    <button onClick={() => { setIsUserMenuOpen(false); handleCheckout('AGENT'); }} className="w-full text-left px-3 py-2.5 rounded-lg text-xs flex items-center gap-2 text-gray-300 hover:bg-gray-800 hover:text-white transition font-medium">
                                                        <Briefcase size={14} className="text-amber-500" /> Virar Consultor
                                                    </button>
                                                )}

                                                <div className="h-px bg-gray-800 my-1 mx-2"></div>

                                                {/* LOGOUT */}
                                                <button onClick={handleLogout} className="w-full text-left px-3 py-2.5 rounded-lg text-xs flex items-center gap-2 text-red-400 hover:bg-red-950/20 font-medium">
                                                    <LogOut size={14} /> Sair da Conta
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ) : (<button id="btn-login" onClick={() => { setIsAuthModalOpen(true); setShowEmailCheck(false); setAuthMode('login'); }} className="h-12 bg-gray-900 border border-gray-800 text-white px-6 rounded-xl hover:border-cyan-500/50 flex items-center justify-center gap-2 whitespace-nowrap transition"><LogIn size={18} /> Entrar</button>)}

                    {userPlan === 'free' && user && (<button id="premium-btn" onClick={openPricingModal} className="h-12 bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition flex items-center justify-center gap-2 whitespace-nowrap"><Crown size={18} /> Seja Premium</button>)}

                    {/* BOTÃO IA COM TRAVAS DE SEGURANÇA 🔒 */}
                    {/* BOTÃO IA (LIBERADO PARA FREE, MAS LIMITADO) */}
                    <button
                        id="btn-ai"
                        onClick={() => {
                            // TRAVA 1: Login Obrigatório
                            if (!user) {
                                setIsAuthModalOpen(true);
                                setAuthMessage("✨ Entre para conversar com sua IA Financeira.");
                                return;
                            }
                            // REMOVIDA A TRAVA DO PLANO FREE AQUI!

                            // ABRE A IA
                            setIsAIOpen(true);
                        }}
                        className={`h-12 bg-gradient-to-r ${userPlan === 'premium' || userPlan === 'agent' || userPlan === 'pro' ? 'from-cyan-600 to-blue-600' : 'from-gray-800 to-gray-700'} text-white px-6 rounded-xl font-bold hover:scale-105 transition border border-white/10 flex items-center justify-center gap-2 whitespace-nowrap shadow-lg`}
                    >
                        <Sparkles size={18} className={userPlan === 'premium' || userPlan === 'agent' || userPlan === 'pro' ? "text-cyan-200" : "text-gray-400"} />
                        {userPlan === 'premium' || userPlan === 'agent' || userPlan === 'pro' ? 'Agente IA' : 'IA Lite'}
                    </button>

                    <button id="btn-novo" onClick={openNewTransactionModal} className="h-12 bg-white text-black px-6 rounded-xl font-bold hover:bg-gray-200 transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.1)] whitespace-nowrap"><Plus size={18} /> Novo</button>
                    <button onClick={runTour} className="h-12 w-12 flex items-center justify-center bg-gray-900 text-gray-400 hover:text-white rounded-xl border border-gray-800" title="Ajuda / Tour"><HelpCircle size={18} /></button>
                </div>
            </header>

            {/* RENDERIZAÇÃO DO LAYOUT */}
            {(currentLayout === 'standard' || currentLayout === 'zen' || currentLayout === 'calendar') && (
                <StandardView
                    transactions={transactions}
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
            {/* MODAL DE PERFIL */}
            <ProfileModal
                isOpen={isProfileModalOpen}
                onClose={() => setIsProfileModalOpen(false)}
                user={user}
            />
            {currentLayout === 'trader' && (
                <TraderView
                    transactions={transactions}
                    installments={installments}
                    recurring={recurring}
                    activeTab={activeTab}
                    months={MONTHS}
                    setActiveTab={setActiveTab}
                    currentMonthData={currentMonthData}
                    previousSurplus={previousSurplus}
                    displayBalance={displayBalance}
                    onTogglePaid={togglePaid}
                    onToggleDelay={toggleDelay}
                    onDelete={handleDelete}
                />
            )}
            {/* LAYOUT CALENDÁRIO */}
            {currentLayout === 'calendar' && (
                <CalendarView
                    transactions={transactions}
                    installments={installments}
                    recurring={recurring}
                    activeTab={activeTab}
                    months={MONTHS}
                    setActiveTab={setActiveTab}
                />
            )}
            {/* MODAL DE EXPORTAÇÃO EXCEL */}
            <ExportModal
                isOpen={isExportModalOpen}
                onClose={() => setIsExportModalOpen(false)}
                user={user}
                userPlan={userPlan}
                clients={clients}
                activeTab={activeTab}
            />
            {/* LAYOUT ZEN */}
            {currentLayout === 'zen' && (
                <ZenView
                    displayBalance={displayBalance}
                    currentMonthData={currentMonthData}
                    activeTab={activeTab}
                    months={MONTHS}
                    setActiveTab={setActiveTab}
                />
            )}
            {/* NOVO: TIMELINE VIEW */}
            {currentLayout === 'timeline' && (
                <TimelineView
                    transactions={transactions}
                    activeTab={activeTab}
                />
            )}

            {/* NOVO: BENTO VIEW */}
            {currentLayout === 'bento' && (
                <BentoView
                    currentMonthData={currentMonthData}
                    transactions={transactions}
                    installments={installments}
                    recurring={recurring}

                    // LIGANDO OS BOTÕES 👇
                    onOpenCalendar={() => setCurrentLayout('calendar')} // Muda a tela pra Calendário
                    onOpenRollover={() => setIsRolloverModalOpen(true)} // Abre o modal de Contas Atrasadas
                />
            )}

            {/* MODAL DE PERSONALIZAÇÃO */}
            <CustomizationModal
                isOpen={isCustomizationOpen}
                onClose={() => setIsCustomizationOpen(false)}
                currentLayout={currentLayout}
                currentTheme={currentTheme}
                onSelectLayout={(l) => handleSavePreferences('layout', l)}
                onSelectTheme={(t) => handleSavePreferences('theme', t)}
                userPlan={userPlan}
            />

            {/* MODAL NOVO PERFIL */}
            {isNewProfileModalOpen && (
                <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[300] p-4">
                    <div className="bg-[#111] border border-gray-800 p-6 rounded-3xl w-full max-w-sm">
                        <h3 className="text-lg font-bold text-white mb-4">Novo Perfil de Dados</h3>
                        <input
                            type="text"
                            placeholder="Nome (Ex: Investimentos, Loja)"
                            value={newProfileName}
                            onChange={(e) => setNewProfileName(e.target.value)}
                            className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white outline-none mb-4"
                        />
                        <div className="flex gap-2">
                            <button onClick={() => setIsNewProfileModalOpen(false)} className="flex-1 bg-gray-800 text-white py-3 rounded-xl">Cancelar</button>
                            <button onClick={handleCreateProfile} className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold">Criar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* OUTROS MODAIS (FORMULÁRIO, PREÇOS, AUTH, IA) - MANTIDOS IGUAIS */}
            {isFormOpen && (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-[#111] border border-gray-700 p-8 rounded-3xl w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto"><button onClick={() => setIsFormOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24} /></button><h2 className="text-2xl font-bold mb-6 text-white">{editingId ? 'Editar' : 'Novo Lançamento'}</h2>
                <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 mb-6 flex items-center justify-between"><label className="text-gray-400 text-sm">Mês de Referência:</label><select value={formData.targetMonth} onChange={(e) => setFormData({ ...formData, targetMonth: e.target.value })} className="bg-black text-white p-2 rounded-lg border border-gray-700 outline-none">{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
                <div className="grid grid-cols-2 gap-2 mb-6"><button onClick={() => setFormMode('income')} className={`py-3 rounded-xl border text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${formMode === 'income' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'bg-gray-900 border-gray-800 text-gray-500'}`}><DollarSign size={20} /> Entrada</button><button onClick={() => setFormMode('expense')} className={`py-3 rounded-xl border text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${formMode === 'expense' ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-gray-900 border-gray-800 text-gray-500'}`}><TrendingDown size={20} /> Gasto</button><button onClick={() => setFormMode('installment')} className={`py-3 rounded-xl border text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${formMode === 'installment' ? 'bg-purple-500/20 border-purple-500 text-purple-500' : 'bg-gray-900 border-gray-800 text-gray-500'}`}><CreditCard size={20} /> Parcelado</button><button onClick={() => setFormMode('fixed_expense')} className={`py-3 rounded-xl border text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${formMode === 'fixed_expense' ? 'bg-blue-500/20 border-blue-500 text-blue-500' : 'bg-gray-900 border-gray-800 text-gray-500'}`}><CheckCircle2 size={20} /> Fixo</button></div><div className="space-y-4">{formMode === 'income' && (<div className="flex items-center gap-3 bg-gray-900 p-3 rounded-lg"><input type="checkbox" id="fixo" checked={formData.isFixedIncome} onChange={(e) => setFormData({ ...formData, isFixedIncome: e.target.checked })} className="w-5 h-5 rounded accent-emerald-500" /><label htmlFor="fixo" className="text-gray-300 text-sm cursor-pointer select-none">Fixo mensal?</label></div>)}{formMode === 'installment' && (<div className="bg-purple-900/10 p-4 rounded-xl border border-purple-900/30 space-y-3 mb-4"><p className="text-purple-400 text-xs font-bold uppercase mb-2">Financiamento / Valor Personalizado</p><label className="text-gray-400 text-xs block">Valor Real da Parcela (com Juros):</label><input type="number" value={formData.fixedMonthlyValue} onChange={(e) => setFormData({ ...formData, fixedMonthlyValue: e.target.value })} className="w-full bg-black border border-gray-700 rounded-lg p-2 text-white focus:border-purple-500 outline-none" placeholder="Ex: 850.00" /></div>)}<input type="text" value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none" placeholder="Descrição" />
                    <div className="my-4">
                        <label className="text-gray-500 text-xs uppercase font-bold mb-2 block ml-1">Escolha um Ícone</label>
                        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                            {Object.keys(ICON_MAP).map(iconKey => {
                                const IconComponent = ICON_MAP[iconKey];
                                return (
                                    <button
                                        key={iconKey}
                                        onClick={() => setFormData({ ...formData, icon: iconKey })}
                                        className={`p-3 rounded-xl border transition flex-shrink-0 ${formData.icon === iconKey ? 'bg-cyan-600 border-cyan-400 text-white shadow-lg shadow-cyan-900/50' : 'bg-gray-800 border-gray-700 text-gray-400 hover:bg-gray-700 hover:text-white'}`}
                                    >
                                        <IconComponent size={20} />
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                    <input type="number" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none" placeholder={formMode === 'installment' ? "Valor TOTAL da Dívida" : "Valor (R$)"} />{formMode === 'installment' && (<div className="flex gap-4"><input type="number" placeholder="Parcelas" value={formData.installments} onChange={(e) => setFormData({ ...formData, installments: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white outline-none" /><input type="number" placeholder="Dia Venc." value={formData.dueDay} onChange={(e) => setFormData({ ...formData, dueDay: e.target.value })} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white outline-none" /></div>)}
                    {/* AREA DE UPLOAD DE COMPROVANTE */}
                    {((formMode !== 'installment' && formMode !== 'fixed_expense') || editingId) && (
                        <div className="border border-dashed border-gray-700 rounded-xl p-4 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-gray-900/50 transition relative group">
                            {!formData.receiptUrl && (
                                <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
                            )}
                            {uploadingFile ? (
                                <Loader2 className="animate-spin text-cyan-500" />
                            ) : formData.receiptUrl ? (
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
                    <button onClick={handleSubmit} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 rounded-xl transition mt-4 shadow-lg shadow-cyan-900/20">{editingId ? 'Salvar Alterações' : 'Adicionar'}</button></div></div></div>)}

            {isPricingOpen && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[200] p-4 overflow-y-auto">
                    <div className="w-full max-w-5xl">
                        <div className="flex justify-end mb-4"><button onClick={() => setIsPricingOpen(false)} className="text-gray-400 hover:text-white"><X size={32} /></button></div>
                        <div className="text-center mb-10"><h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">Escolha seu Nível.</h2><p className="text-gray-400">Do controle básico à automação total com IA.</p></div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-[#111] border border-gray-800 rounded-3xl p-8 flex flex-col relative opacity-80 hover:opacity-100 transition"><h3 className="text-xl font-bold text-gray-400 mb-2">Inicial</h3><div className="text-4xl font-black text-white mb-6">Grátis</div><ul className="space-y-4 mb-8 flex-1"><li className="flex gap-3 text-sm text-gray-400"><CheckCircle2 size={18} /> <span>Até 50 lançamentos/mês</span></li><li className="flex gap-3 text-sm text-gray-400"><CheckCircle2 size={18} /> <span>Dashboard Básico</span></li><li className="flex gap-3 text-sm text-gray-600"><X size={18} /> <span>Sem Inteligência Artificial</span></li><li className="flex gap-3 text-sm text-gray-600"><X size={18} /> <span>Sem Upload de Comprovantes</span></li></ul><button className="w-full bg-gray-800 text-white font-bold py-4 rounded-xl cursor-default opacity-50">Seu Plano Atual</button></div>
                            <div className="bg-[#0f1219] border border-amber-500/30 rounded-3xl p-8 flex flex-col relative transform hover:scale-105 transition shadow-2xl shadow-amber-900/20"><div className="absolute top-0 right-0 bg-amber-500 text-black text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">MAIS POPULAR</div><h3 className="text-xl font-bold text-amber-500 mb-2">Aliado Plus +</h3><div className="text-4xl font-black text-white mb-1">R$ 29,90</div><div className="text-xs text-gray-500 mb-6 uppercase tracking-wide">Pagamento Único</div><ul className="space-y-4 mb-8 flex-1"><li className="flex gap-3 text-sm text-gray-200"><Zap className="text-amber-500" size={18} /> <span><b>Ilimitado:</b> Lance sem travas</span></li><li className="flex gap-3 text-sm text-gray-200"><Sparkles className="text-purple-400" size={18} /> <span><b>Agente IA:</b> Diagnósticos e Dicas</span></li><li className="flex gap-3 text-sm text-gray-200"><FileText className="text-emerald-400" size={18} /> <span><b>Arquivo:</b> Guarde seus Recibos</span></li><li className="flex gap-3 text-sm text-gray-200"><Star className="text-cyan-400" size={18} /> <span>Acesso Vitalício</span></li></ul><button id="checkout-btn-PREMIUM" onClick={() => handleCheckout('PREMIUM')} className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold py-4 rounded-xl hover:shadow-lg hover:shadow-amber-500/20 transition">Escolher Plus</button></div>
                            <div className="bg-[#0a0a0a] border border-purple-500/50 rounded-3xl p-8 flex flex-col relative overflow-hidden group"><div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 to-cyan-900/10 opacity-0 group-hover:opacity-100 transition duration-500"></div><h3 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400 mb-2">Aliado PRO</h3><div className="text-4xl font-black text-white mb-1">R$ 59,90</div><div className="text-xs text-gray-500 mb-6 uppercase tracking-wide">Pagamento Único</div><ul className="space-y-4 mb-8 flex-1 relative z-10"><li className="flex gap-3 text-sm text-white"><Crown className="text-purple-400" size={18} /> <span><b>Tudo do Plus incluso</b></span></li><li className="flex gap-3 text-sm text-gray-300"><Palette className="text-pink-400" size={18} /> <span><b>Temas:</b> Personalize as cores</span></li><li className="flex gap-3 text-sm text-gray-300"><Layout className="text-blue-400" size={18} /> <span><b>Layouts:</b> Trader, Calendar, Zen</span></li><li className="flex gap-3 text-sm text-gray-300"><MousePointerClick className="text-green-400" size={18} /> <span><b>Ícones Customizáveis</b></span></li></ul><button id="checkout-btn-PRO" onClick={() => handleCheckout('PRO')} className="w-full bg-gray-800 border border-purple-500/50 text-white font-bold py-4 rounded-xl hover:bg-purple-900/20 hover:border-purple-400 transition relative z-10">Virar PRO</button></div>
                        </div>
                        <div className="mt-12 text-center border-t border-gray-800 pt-8"><p className="text-gray-500 text-sm mb-4">Você é Contador ou Consultor Financeiro?</p><button onClick={() => handleCheckout('AGENT')} className="text-purple-400 text-sm hover:text-purple-300 underline decoration-purple-500/30 underline-offset-4">Conheça o Plano para Profissionais</button></div>
                    </div>
                </div>
            )}

            {/* --- AQUI ESTÁ O QUE FALTAVA (INSIRA ISSO AGORA!) --- */}
            {isChangePasswordOpen && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[300] p-4">
                    <div className="bg-[#111] border border-gray-800 p-8 rounded-3xl w-full max-w-sm text-center shadow-2xl">
                        <div className="flex justify-center mb-4">
                            <div className="bg-cyan-900/20 p-4 rounded-full"><Lock className="text-cyan-400" size={32} /></div>
                        </div>
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
            {/* --------------------------------------------------- */}

            {isAuthModalOpen && (<div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-4"><div className="bg-[#111] border border-gray-800 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative text-center"><button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition"><X size={24} /></button><div className="flex justify-center mb-6"><div className="bg-gray-900/50 p-3 rounded-2xl border border-gray-800">{showEmailCheck ? <Mail className="text-cyan-400" size={32} /> : <Lock className="text-cyan-400" size={32} />}</div></div>{showEmailCheck ? (<div className="animate-in fade-in zoom-in duration-300"><h2 className="text-2xl font-bold mb-2 text-white">Verifique seu e-mail</h2><p className="text-gray-400 text-sm mb-6">Enviamos um link de acesso para <b>{email}</b>. Clique nele para ativar sua conta.</p><div className="bg-cyan-900/20 text-cyan-400 text-xs p-3 rounded-xl border border-cyan-900/50 mb-6">Dica: Verifique a caixa de Spam.</div><button onClick={() => { setShowEmailCheck(false); setAuthMode('login'); }} className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">Voltar para Login</button></div>) : (<div><div className="flex justify-center mb-6"><div className="flex bg-black p-1 rounded-xl border border-gray-800"><button onClick={() => setAuthMode('login')} className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${authMode === 'login' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>Entrar</button><button onClick={() => setAuthMode('signup')} className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${authMode === 'signup' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>Criar Conta</button></div></div><div className="space-y-4 text-left"><div><label className="text-xs text-gray-500 ml-1 mb-1 block">E-mail</label><div className="relative"><Mail className="absolute left-3 top-3.5 text-gray-600" size={16} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-10 pr-3 text-white focus:border-cyan-500 outline-none transition" /></div></div><div><label className="text-xs text-gray-500 ml-1 mb-1 block">Senha</label><div className="relative"><Lock className="absolute left-3 top-3.5 text-gray-600" size={16} /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-10 pr-3 text-white focus:border-cyan-500 outline-none transition" /></div></div></div>{authMessage && (<div className={`mt-4 p-3 rounded-lg text-xs flex items-center gap-2 ${authMessage.includes('❌') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>{authMessage}</div>)}<button onClick={handleAuth} disabled={loadingAuth} className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition mt-6 flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20">{loadingAuth ? <Loader2 className="animate-spin" size={20} /> : (authMode === 'login' ? 'Acessar Conta' : 'Criar Conta')}</button>{authMode === 'login' && (<div className="mt-4 pt-4 border-t border-gray-800"><button onClick={handleResetPassword} disabled={loadingAuth} className="text-xs text-gray-500 hover:text-cyan-400 transition underline decoration-gray-700 hover:decoration-cyan-400 underline-offset-4">Esqueci minha senha</button></div>)}</div>)}</div></div>)}
            {isClientModalOpen && (<div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"><div className="bg-[#111] border border-gray-800 p-6 rounded-3xl w-full max-w-sm"><h3 className="text-lg font-bold text-white mb-4">Novo Cliente</h3><input type="email" placeholder="E-mail do cliente" value={newClientEmail} onChange={(e) => setNewClientEmail(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white outline-none mb-4" /><div className="flex gap-2"><button onClick={() => setIsClientModalOpen(false)} className="flex-1 bg-gray-800 text-white py-3 rounded-xl">Cancelar</button><button onClick={handleAddClient} disabled={addingClient} className="flex-1 bg-cyan-600 text-white py-3 rounded-xl font-bold">{addingClient ? '...' : 'Adicionar'}</button></div></div></div>)}
            {isAIOpen && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
                    <div className="bg-[#0f0f13] border border-gray-700 w-full max-w-2xl h-[600px] rounded-3xl shadow-2xl flex flex-col relative overflow-hidden">

                        {/* CABEÇALHO */}
                        <div className="p-6 border-b border-gray-800 bg-[#111] flex justify-between items-center z-10">
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${userPlan === 'free' ? 'bg-gray-800 text-gray-400' : 'bg-purple-600/20 text-purple-400'}`}>
                                    <Sparkles size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                        Consultor IA
                                        {userPlan === 'free' && <span className="text-[10px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded border border-gray-700">LITE</span>}
                                    </h2>
                                    <p className="text-xs text-gray-500">Seu assistente financeiro pessoal</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAIOpen(false)} className="text-gray-500 hover:text-white transition bg-gray-800/50 p-2 rounded-full hover:bg-gray-700"><X size={20} /></button>
                        </div>

                        {/* ÁREA DE CHAT */}
                        <div className="flex-1 p-6 overflow-y-auto space-y-4 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                            {aiResponse ? (
                                typeof aiResponse === 'string' ?
                                    <div className="bg-gray-800/40 p-6 rounded-2xl rounded-tl-none border border-gray-700/50 text-gray-200 leading-relaxed whitespace-pre-line shadow-inner animate-in slide-in-from-left-2 duration-300">
                                        {aiResponse}
                                    </div> : aiResponse
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                                    <Sparkles size={48} className="mb-4 text-purple-500" />
                                    <p className="text-gray-400 font-medium">"Como posso te ajudar hoje?"</p>
                                    <p className="text-xs text-gray-600 mt-2 max-w-xs">
                                        {userPlan === 'free'
                                            ? "Posso tirar dúvidas sobre economia, investimentos e organização financeira."
                                            : "Posso analisar seus dados, encontrar padrões de gastos e sugerir melhorias."}
                                    </p>
                                </div>
                            )}
                            {isLoading && (
                                <div className="flex items-center gap-2 text-purple-400 text-sm bg-purple-900/10 p-3 rounded-xl w-fit animate-pulse">
                                    <Loader2 size={16} className="animate-spin" /> Analisando...
                                </div>
                            )}
                        </div>

                        {/* ÁREA DE BOTÕES RÁPIDOS (INTELIGENTE) */}
                        <div className="px-6 py-2 border-t border-gray-800 bg-[#111]">
                            {userPlan !== 'free' ? (
                                // BOTÕES PREMIUM (AÇÕES REAIS)
                                <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2">
                                    <button onClick={() => askGemini("Faça um diagnóstico de risco completo...")} className="whitespace-nowrap px-4 py-2 bg-gray-800 hover:bg-gray-700 hover:text-white rounded-full text-xs font-bold text-cyan-400 border border-cyan-900/30 flex items-center gap-2 transition active:scale-95"><BarChart3 size={14} /> Diagnóstico</button>
                                    <button onClick={() => askGemini("Analise meus maiores gastos...")} className="whitespace-nowrap px-4 py-2 bg-gray-800 hover:bg-gray-700 hover:text-white rounded-full text-xs font-bold text-purple-400 border border-purple-900/30 flex items-center gap-2 transition active:scale-95"><Search size={14} /> Detetive</button>
                                    <button onClick={() => askGemini("Me dê um plano de resgate...")} className="whitespace-nowrap px-4 py-2 bg-gray-800 hover:bg-gray-700 hover:text-white rounded-full text-xs font-bold text-emerald-400 border border-emerald-900/30 flex items-center gap-2 transition active:scale-95"><Target size={14} /> Plano de Resgate</button>
                                </div>
                            ) : (
                                // BOTÕES FREE (EDUCATIVOS - ENGAGEMENT)
                                <div className="flex flex-col gap-2">
                                    <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 opacity-70">
                                        <button onClick={() => askGemini("O que é Reserva de Emergência?")} className="whitespace-nowrap px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700 rounded-full text-[10px] text-gray-300 border border-gray-700 transition">💡 O que é Reserva?</button>
                                        <button onClick={() => askGemini("Dicas simples para economizar no mercado")} className="whitespace-nowrap px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700 rounded-full text-[10px] text-gray-300 border border-gray-700 transition">🛒 Dicas de Mercado</button>
                                        <button onClick={() => askGemini("Como começar a investir com pouco?")} className="whitespace-nowrap px-3 py-1.5 bg-gray-800/50 hover:bg-gray-700 rounded-full text-[10px] text-gray-300 border border-gray-700 transition">💰 Investir com Pouco</button>
                                    </div>
                                    {/* CTA DE VENDA DISCRETO MAS VISÍVEL */}
                                    <div className="flex justify-between items-center bg-gradient-to-r from-amber-900/20 to-orange-900/20 p-2 rounded-lg border border-amber-900/30">
                                        <span className="text-[10px] text-amber-500 font-bold flex items-center gap-1 ml-1"><Lock size={10} /> Desbloqueie análises da sua conta</span>
                                        <button onClick={() => { setIsAIOpen(false); openPricingModal(); }} className="text-[10px] bg-amber-600 hover:bg-amber-500 text-white px-3 py-1 rounded shadow-lg transition">Virar Premium</button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* INPUT */}
                        <div className="p-4 bg-[#111] flex gap-2 pt-2">
                            <div className="relative flex-1">
                                <input
                                    type="text"
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && askGemini()}
                                    disabled={isLoading}
                                    placeholder={userPlan === 'free' ? "Tire uma dúvida sobre finanças..." : "Pergunte ou lance um gasto..."}
                                    className="w-full bg-gray-900 border border-gray-700 rounded-xl py-4 pl-4 pr-10 text-white outline-none focus:border-purple-500 focus:bg-gray-800 transition disabled:opacity-50"
                                />
                                {/* REMOVIDO O 'TITLE' QUE DAVA ERRO NO TYPESCRIPT */}
                                {userPlan === 'free' && <Lock size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600" />}
                            </div>
                            <button
                                onClick={() => askGemini()}
                                disabled={!aiPrompt.trim() || isLoading}
                                className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed text-white p-4 rounded-xl shadow-lg shadow-purple-900/20 transition active:scale-95"
                            >
                                <Send size={24} />
                            </button>
                        </div>
                    </div>
                    <Toaster richColors position="top-center" theme={currentTheme === 'light' ? 'light' : 'dark'} />
                </div>

            )}      {isRolloverModalOpen && (<div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-6"><div className="bg-[#111] border border-gray-700 p-8 rounded-3xl w-full max-w-lg shadow-2xl relative"><h2 className="text-2xl font-bold mb-2 text-white flex items-center gap-2"><AlertCircle className="text-orange-500" /> Contas em Aberto</h2><p className="text-gray-400 text-sm mb-6">Existem contas de meses passados que você não marcou como pagas.</p><div className="max-h-[300px] overflow-y-auto space-y-2 mb-6 pr-2">{pastDueItems.map((item, idx) => (<div key={idx} className="flex justify-between items-center p-3 bg-gray-900 rounded-lg border border-gray-800"><div><p className="text-white font-medium text-sm">{item.title}</p><p className="text-xs text-gray-500">{item.month}</p></div><div className="flex items-center gap-3"><span className="text-red-400 font-mono">R$ {item.amount || item.value || item.value_per_month}</span><button onClick={() => toggleDelay(item.origin, item)} className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded border border-orange-500/50 hover:bg-orange-500 hover:text-white transition">Mover p/ Stand-by</button></div></div>))}</div><div className="flex justify-end gap-3"><button onClick={() => setIsRolloverModalOpen(false)} className="bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-gray-200 transition">OK</button></div></div></div>)}
        </div>
    );
}
