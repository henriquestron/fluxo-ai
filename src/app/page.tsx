'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, TrendingDown, DollarSign, Plus, X, List, LayoutGrid, Sparkles, Send, Trash2, AlertCircle, CheckCircle2, Pencil, Clock, AlertTriangle, Check, LogIn, LogOut, User, Eye, EyeOff } from 'lucide-react';
import { GoogleGenerativeAI } from "@google/generative-ai";
import { supabase } from '@/supabase';

// --- CONFIGURAÇÃO ---
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || ""; 
const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// --- CARD COMPONENT ---
const Card = ({ title, value, icon: Icon, type, extraLabel }: any) => (
  <div className={`backdrop-blur-md border p-6 rounded-2xl transition duration-300 group relative overflow-hidden h-full ${type === 'negative' ? 'bg-red-900/10 border-red-800' : 'bg-gray-900/60 border-gray-800 hover:border-purple-500/30'}`}>
    <div className="flex justify-between items-start z-10 relative">
      <div>
        <p className="text-gray-400 text-sm font-medium mb-1 group-hover:text-purple-400 transition">{title}</p>
        <h3 className={`text-3xl font-bold tracking-tight ${type === 'negative' ? 'text-red-500' : 'text-white'}`}>
            R$ {value}
        </h3>
        {extraLabel && <p className="text-xs text-green-400 mt-2 font-mono bg-green-900/30 inline-block px-2 py-1 rounded">{extraLabel}</p>}
      </div>
      <div className={`p-3 rounded-xl ${type === 'expense' || type === 'negative' ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}>
        <Icon size={24} />
      </div>
    </div>
  </div>
);

export default function FinancialDashboard() {
  const [activeTab, setActiveTab] = useState('Fev'); 
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // --- USER STATE ---
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authMessage, setAuthMessage] = useState('');

  // --- DADOS ---
  const [transactions, setTransactions] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [recurring, setRecurring] = useState<any[]>([]);

  // --- ESTADOS AUXILIARES ---
  const [formMode, setFormMode] = useState<'income' | 'expense' | 'installment' | 'fixed_expense'>('income');
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const initialFormState = { 
      title: '', 
      amount: '', 
      installments: '', 
      dueDay: '', 
      category: 'Outros', 
      targetMonth: 'Fev', 
      isFixedIncome: false, 
      fixedMonthlyValue: '' 
  };
  const [formData, setFormData] = useState(initialFormState);
  
  // --- IA ---
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // --- AUTH CHECK & LOAD DATA ---
  useEffect(() => {
    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
        loadData(session?.user);
    };
    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null);
        loadData(session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadData = async (currentUser: any) => {
      if (currentUser) {
          const { data: trans } = await supabase.from('transactions').select('*');
          const { data: inst } = await supabase.from('installments').select('*');
          const { data: recur } = await supabase.from('recurring').select('*');
          if (trans) setTransactions(trans);
          if (inst) setInstallments(inst);
          if (recur) setRecurring(recur);
      } else {
          const localTrans = localStorage.getItem('guest_transactions');
          const localInst = localStorage.getItem('guest_installments');
          const localRecur = localStorage.getItem('guest_recurring');
          setTransactions(localTrans ? JSON.parse(localTrans) : []);
          setInstallments(localInst ? JSON.parse(localInst) : []);
          setRecurring(localRecur ? JSON.parse(localRecur) : []);
      }
  };

  const saveDataLocal = (newTrans: any[], newInst: any[], newRecur: any[]) => {
      setTransactions(newTrans);
      setInstallments(newInst);
      setRecurring(newRecur);
      localStorage.setItem('guest_transactions', JSON.stringify(newTrans));
      localStorage.setItem('guest_installments', JSON.stringify(newInst));
      localStorage.setItem('guest_recurring', JSON.stringify(newRecur));
  };

  // --- AUTH ACTIONS ---
  const handleLoginPassword = async () => {
      setLoadingAuth(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setAuthMessage("Erro: " + error.message);
      else {
          setAuthMessage("Login realizado!");
          setIsAuthModalOpen(false);
          window.location.reload();
      }
      setLoadingAuth(false);
  };

  const handleSignUp = async () => {
      setLoadingAuth(true);
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setAuthMessage("Erro: " + error.message);
      else setAuthMessage("Conta criada! Confirme no seu e-mail.");
      setLoadingAuth(false);
  };

  const handleLoginMagicLink = async () => {
      setLoadingAuth(true);
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) setAuthMessage("Erro: " + error.message);
      else setAuthMessage("Link enviado para seu e-mail!");
      setLoadingAuth(false);
  };

  const handleLogout = async () => {
      await supabase.auth.signOut();
      window.location.reload();
  };

  // --- CRUD ACTIONS ---
  const handleDelete = async (table: string, id: number) => {
      if(!confirm("Tem certeza?")) return;
      if (user) {
          await supabase.from(table).delete().eq('id', id);
          loadData(user);
      } else {
          if (table === 'transactions') saveDataLocal(transactions.filter(t => t.id !== id), installments, recurring);
          if (table === 'installments') saveDataLocal(transactions, installments.filter(i => i.id !== id), recurring);
          if (table === 'recurring') saveDataLocal(transactions, installments, recurring.filter(r => r.id !== id));
      }
  };

  const togglePaid = async (table: string, id: number, currentStatus: boolean) => {
      if (user) {
          await supabase.from(table).update({ is_paid: !currentStatus }).eq('id', id);
          loadData(user);
      } else {
          const updateList = (list: any[]) => list.map(i => i.id === id ? { ...i, is_paid: !currentStatus } : i);
          if (table === 'transactions') saveDataLocal(updateList(transactions), installments, recurring);
      }
  };

  const toggleDelay = async (id: number, currentStatus: string) => {
      const newStatus = currentStatus === 'delayed' ? 'active' : 'delayed';
      if (user) {
          await supabase.from('transactions').update({ status: newStatus }).eq('id', id);
          loadData(user);
      } else {
          const newTrans = transactions.map(t => t.id === id ? { ...t, status: newStatus } : t);
          saveDataLocal(newTrans, installments, recurring);
      }
  };

  const toggleSkipMonth = async (item: any) => {
      const currentSkipped = item.skipped_months || [];
      const isSkipped = currentSkipped.includes(activeTab);
      let newSkipped;
      if (isSkipped) newSkipped = currentSkipped.filter((m: string) => m !== activeTab);
      else newSkipped = [...currentSkipped, activeTab];

      if (user) {
          await supabase.from('recurring').update({ skipped_months: newSkipped }).eq('id', item.id);
          loadData(user);
      } else {
          const newRecur = recurring.map(r => r.id === item.id ? { ...r, skipped_months: newSkipped } : r);
          saveDataLocal(transactions, installments, newRecur);
      }
  };

  const handleEdit = (item: any, mode: any) => {
      setFormMode(mode); setEditingId(item.id);
      setFormData({
          title: item.title, amount: item.amount || item.value || item.total_value || '',
          installments: item.installments_count || '', dueDay: item.due_day || '',
          category: item.category || 'Outros', targetMonth: item.target_month || 'Fev',
          isFixedIncome: mode === 'income' && item.category === 'Salário',
          fixedMonthlyValue: item.fixed_monthly_value || ''
      });
      setIsFormOpen(true);
  };

  const openNewTransactionModal = () => {
      setEditingId(null);
      setFormData({ ...initialFormState, targetMonth: activeTab });
      setIsFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.amount) return;
    const amountVal = parseFloat(formData.amount.toString());
    const fixedInstallmentVal = formData.fixedMonthlyValue ? parseFloat(formData.fixedMonthlyValue.toString()) : null;
    
    const monthMap: Record<string, string> = { 'Jan': '01', 'Fev': '02', 'Mar': '03', 'Abr': '04', 'Mai': '05', 'Jun': '06', 'Jul': '07', 'Ago': '08', 'Set': '09', 'Out': '10', 'Nov': '11', 'Dez': '12' };
    const dateString = `01/${monthMap[formData.targetMonth]}/2026`;

    const commonData = { user_id: user?.id };

    const getPayload = () => {
        if (formMode === 'income') {
            return formData.isFixedIncome 
                ? { table: 'recurring', data: { ...commonData, title: formData.title, value: amountVal, due_day: 1, category: 'Salário', type: 'income' } }
                : { table: 'transactions', data: { ...commonData, title: formData.title, amount: amountVal, type: 'income', date: dateString, category: 'Receita', target_month: formData.targetMonth, status: 'active' } };
        }
        if (formMode === 'expense') return { table: 'transactions', data: { ...commonData, title: formData.title, amount: amountVal, type: 'expense', date: dateString, category: formData.category, target_month: formData.targetMonth, status: 'active' } };
        
        if (formMode === 'installment') {
            const qtd = parseInt(formData.installments.toString()) || 1;
            const realValuePerMonth = fixedInstallmentVal ? fixedInstallmentVal : (amountVal / qtd);
            
            // CORREÇÃO DA LÓGICA DE START (OFFSET)
            // Se eu estou em FEV (index 1), e quero que seja a parcela 1.
            // A fórmula de exibição é: current_installment + monthIndex
            // Então: X + 1 = 1  => X = 0.
            // Fórmula: 1 - targetMonthIndex.
            
            const targetMonthIndex = MONTHS.indexOf(formData.targetMonth);
            const startOffset = 1 - targetMonthIndex;

            return { table: 'installments', data: { ...commonData, title: formData.title, total_value: amountVal, installments_count: qtd, current_installment: startOffset, value_per_month: realValuePerMonth, fixed_monthly_value: fixedInstallmentVal, due_day: parseInt(formData.dueDay.toString()) || 10 } };
        }
        return { table: 'recurring', data: { ...commonData, title: formData.title, value: amountVal, due_day: parseInt(formData.dueDay.toString()) || 10, category: 'Fixa', type: 'expense' } };
    };

    const { table, data } = getPayload();

    if (user) {
        if (editingId) await supabase.from(table).update(data).eq('id', editingId);
        else await supabase.from(table).insert([data]);
        loadData(user);
    } else {
        const newItem = { ...data, id: editingId || Date.now(), is_paid: false };
        if (table === 'transactions') {
            const list = editingId ? transactions.map(t => t.id === editingId ? newItem : t) : [newItem, ...transactions];
            saveDataLocal(list, installments, recurring);
        } else if (table === 'installments') {
            const list = editingId ? installments.map(i => i.id === editingId ? newItem : i) : [...installments, newItem];
            saveDataLocal(transactions, list, recurring);
        } else {
            const list = editingId ? recurring.map(r => r.id === editingId ? newItem : r) : [...recurring, newItem];
            saveDataLocal(transactions, installments, list);
        }
    }

    setFormData({ ...initialFormState, targetMonth: activeTab }); 
    setEditingId(null); setIsFormOpen(false);
  };

  // --- CÁLCULOS FINANCEIROS ---
  const getMonthData = (monthName: string) => {
    const monthIndex = MONTHS.indexOf(monthName);
    const monthMap: Record<string, string> = { 'Jan': '/01', 'Fev': '/02', 'Mar': '/03', 'Abr': '/04', 'Mai': '/05', 'Jun': '/06', 'Jul': '/07', 'Ago': '/08', 'Set': '/09', 'Out': '/10', 'Nov': '/11', 'Dez': '/12' };
    const dateFilter = monthMap[monthName];

    const incomeFixed = recurring.filter(r => r.type === 'income' && !r.skipped_months?.includes(monthName)).reduce((acc, curr) => acc + curr.value, 0);
    const incomeVariable = transactions.filter(t => t.type === 'income' && t.date?.includes(dateFilter) && t.status !== 'delayed').reduce((acc, curr) => acc + curr.amount, 0);
    
    const expenseVariable = transactions.filter(t => t.type === 'expense' && t.date?.includes(dateFilter) && t.status !== 'delayed').reduce((acc, curr) => acc + curr.amount, 0);
    const expenseFixed = recurring.filter(r => r.type === 'expense' && !r.skipped_months?.includes(monthName)).reduce((acc, curr) => acc + curr.value, 0);
    
    // CORREÇÃO DO CÁLCULO DE PARCELAS
    const installTotal = installments.reduce((acc, curr) => {
        const offset = monthIndex; 
        const actualInstallment = curr.current_installment + offset; 
        
        // Se a parcela for < 1 (antes da compra) ou > total (acabou), não soma
        if (actualInstallment >= 1 && actualInstallment <= curr.installments_count) {
            return acc + curr.value_per_month;
        }
        return acc;
    }, 0);

    const delayedTotal = transactions.filter(t => t.status === 'delayed').reduce((acc, curr) => acc + curr.amount, 0);

    return { income: incomeFixed + incomeVariable, expenseTotal: expenseVariable + expenseFixed + installTotal, balance: (incomeFixed + incomeVariable) - (expenseVariable + expenseFixed + installTotal), delayedTotal };
  };

  const currentMonthData = getMonthData(activeTab);
  let previousSurplus = 0;
  const currentIndex = MONTHS.indexOf(activeTab);
  if (currentIndex > 0) {
      const prevData = getMonthData(MONTHS[currentIndex - 1]);
      if (prevData.balance > 0) previousSurplus = prevData.balance;
  }
  const displayBalance = currentMonthData.balance + previousSurplus;

  // --- IA ---
  const askGemini = async () => {
    if (!aiPrompt) return;
    if (!API_KEY) { setAiResponse("⚠️ Configure a API Key"); return; }
    setIsLoading(true); setAiResponse('');
    try {
        const genAI = new GoogleGenerativeAI(API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-pro"});
        const context = `Usuário Vitor. Mês: ${activeTab}. Renda: ${currentMonthData.income}. Gastos: ${currentMonthData.expenseTotal}. Standby: ${currentMonthData.delayedTotal}. Pergunta: ${aiPrompt}`;
        const result = await model.generateContent(context);
        const response = await result.response;
        setAiResponse(response.text());
    } catch (e) { setAiResponse("Erro na IA."); } 
    finally { setIsLoading(false); }
  };

  // --- RENDERIZADORES ---
  const renderTransactions = () => {
     const monthMap: Record<string, string> = { 'Jan': '/01', 'Fev': '/02', 'Mar': '/03', 'Abr': '/04', 'Mai': '/05', 'Jun': '/06', 'Jul': '/07', 'Ago': '/08', 'Set': '/09', 'Out': '/10', 'Nov': '/11', 'Dez': '/12' };
     const filter = monthMap[activeTab];
     const normalItems = transactions.filter(t => t.date?.includes(filter) && t.status !== 'delayed');

     const fixedItems = recurring.map(r => ({
         ...r, isFixed: true, isSkipped: r.skipped_months?.includes(activeTab), date: 'Fixo Mensal', amount: r.value 
     }));

     const allItems = [...fixedItems, ...normalItems.map(t => ({...t, isFixed: false, isSkipped: false}))];

     if (allItems.length === 0) return <p className="text-gray-600 text-center py-4 italic text-sm">Nada por aqui.</p>;

     return allItems.map((item) => {
        const isDimmed = item.isSkipped || item.is_paid;
        return (
            <div key={`${item.isFixed ? 'fix' : 'var'}-${item.id}`} className={`flex justify-between items-center p-4 border rounded-xl group transition ${isDimmed ? 'bg-gray-900/20 border-gray-800 opacity-50' : 'bg-gray-900/40 border-gray-800 hover:bg-gray-900/60'}`}>
                <div className="flex items-center gap-4">
                    {!item.isFixed && (
                        <button onClick={() => togglePaid('transactions', item.id, item.is_paid)} className={`rounded-full p-1 border ${item.is_paid ? 'bg-green-500 border-green-500 text-white' : 'border-gray-600 text-transparent hover:border-green-500'}`}><Check size={12} /></button>
                    )}
                    {item.isFixed && (
                        <button onClick={() => toggleSkipMonth(item)} className={`rounded-full p-1 border ${item.isSkipped ? 'bg-gray-700 border-gray-700 text-gray-400' : 'border-purple-500 text-purple-400 hover:bg-purple-500 hover:text-white'}`}>
                            {item.isSkipped ? <EyeOff size={12}/> : <Eye size={12}/>}
                        </button>
                    )}
                    <div>
                        <p className={`font-semibold text-sm ${isDimmed ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{item.title} {item.isFixed && <span className="text-[10px] bg-gray-800 px-1 rounded ml-1 text-gray-400">FIXO</span>}</p>
                        <p className="text-xs text-gray-500">{item.isSkipped ? 'PULADO NESTE MÊS' : item.date}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <span className={`font-mono font-medium ${item.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>{item.type === 'expense' ? '-' : '+'} {item.amount.toFixed(2)}</span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                        {!item.isFixed && item.type === 'expense' && (<button onClick={() => toggleDelay(item.id, item.status)} className="p-1.5 rounded bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white" title="Stand-by"><Clock size={14}/></button>)}
                        <button onClick={() => handleEdit(item, item.isFixed ? (item.type === 'income' ? 'income' : 'fixed_expense') : (item.type === 'income' ? 'income' : 'expense'))} className="p-1.5 rounded bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white"><Pencil size={14}/></button>
                        <button onClick={() => handleDelete(item.isFixed ? 'recurring' : 'transactions', item.id)} className="p-1.5 rounded bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white"><Trash2 size={14}/></button>
                    </div>
                </div>
            </div>
        );
     });
  };

  const renderDelayed = () => {
      const delayedItems = transactions.filter(t => t.status === 'delayed');
      if (delayedItems.length === 0) return null;
      return (
        <div className="mt-8 border border-red-900/50 bg-red-950/10 rounded-2xl p-6">
            <h3 className="text-red-400 font-bold flex items-center gap-2 mb-4"><AlertTriangle size={18}/> Contas em Stand-by</h3>
            <div className="space-y-2">{delayedItems.map(item => (<div key={item.id} className="flex justify-between items-center p-3 bg-red-900/20 rounded-lg border border-red-900/30"><span className="text-red-200 text-sm">{item.title}</span><div className="flex items-center gap-3"><span className="font-mono text-red-400 font-bold">R$ {item.amount.toFixed(2)}</span><button onClick={() => toggleDelay(item.id, item.status)} className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-400">Restaurar</button></div></div>))}</div>
            <p className="text-xs text-red-500/60 mt-3 text-center">Valores ignorados no saldo atual.</p>
        </div>
      )
  };

  // --- GRID INTELIGENTE ---
  const hasDelayed = currentMonthData.delayedTotal > 0;
  const gridClass = hasDelayed ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-4" : "grid-cols-1 md:grid-cols-3";

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-gray-100 p-4 md:p-8 font-sans selection:bg-purple-500 selection:text-white relative">
      <header className="flex flex-col md:flex-row justify-between items-center mb-10 gap-4">
        <div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">Fluxo AI.</h1>
          <div className="flex items-center gap-2 mt-1">
             <div className={`w-2 h-2 rounded-full ${user ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></div>
             <p className="text-gray-500 text-sm">{user ? 'Online (Nuvem)' : 'Visitante (Local)'}</p>
          </div>
        </div>
        <div className="flex gap-3">
            {user ? (
                <button onClick={handleLogout} className="bg-gray-800 text-white px-5 py-3 rounded-full hover:bg-gray-700 flex items-center gap-2"><LogOut size={18}/> Sair</button>
            ) : (
                <button onClick={() => setIsAuthModalOpen(true)} className="bg-purple-600 text-white px-5 py-3 rounded-full hover:bg-purple-700 flex items-center gap-2 shadow-[0_0_20px_rgba(120,50,255,0.3)]"><LogIn size={18}/> Entrar</button>
            )}
            <button onClick={() => setIsAIOpen(true)} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-5 py-3 rounded-full font-bold hover:scale-105 transition border border-purple-400/30 flex items-center gap-2"><Sparkles size={18} className="text-yellow-300"/> Consultor</button>
            <button onClick={openNewTransactionModal} className="bg-white text-black px-6 py-3 rounded-full font-bold hover:bg-gray-200 transition flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)]"><Plus size={18}/> Novo</button>
        </div>
      </header>

      <div className={`grid gap-6 mb-12 ${gridClass}`}>
        <Card title={`Saldo Disponível (${activeTab})`} value={displayBalance.toFixed(2)} icon={DollarSign} type={displayBalance >= 0 ? 'income' : 'negative'} extraLabel={previousSurplus > 0 ? `+ R$ ${previousSurplus.toFixed(2)} (Sobra)` : null} />
        <Card title="A Pagar (Mês)" value={currentMonthData.expenseTotal.toFixed(2)} icon={TrendingDown} type="expense" />
        <Card title="Entradas" value={currentMonthData.income.toFixed(2)} icon={CreditCard} type="income" />
        
        {hasDelayed && (
             <div className="bg-red-900/20 backdrop-blur-md border border-red-500/50 p-6 rounded-2xl flex flex-col justify-between relative h-full">
                 <div>
                    <div className="flex items-center gap-3 text-red-400 mb-2"><Clock size={24} /><h3 className="font-bold">Em Stand-by</h3></div>
                    <p className="text-white text-2xl font-bold">R$ {currentMonthData.delayedTotal.toFixed(2)}</p>
                 </div>
                 <p className="text-xs text-red-400/60 mt-2">Dívidas não pagas</p>
             </div>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1 space-y-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-gray-200"><List size={20} className="text-purple-500"/> Gastos do Mês</h2>
            <div className="space-y-3">{renderTransactions()}</div>
            {renderDelayed()}
        </div>

        <div className="xl:col-span-2 bg-gray-900/30 border border-gray-800 rounded-3xl p-6 md:p-8">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold flex items-center gap-2"><LayoutGrid size={20} className="text-purple-500"/> Financiamentos & Contas</h2>
                <div className="flex bg-black p-1 rounded-xl border border-gray-800 overflow-x-auto max-w-[200px] md:max-w-none">{MONTHS.map((month) => (<button key={month} onClick={() => setActiveTab(month)} className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${activeTab === month ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>{month}</button>))}</div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead><tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800"><th className="pb-3 pl-2 font-medium">Descrição</th><th className="pb-3 font-medium">Tipo</th><th className="pb-3 font-medium">Situação</th><th className="pb-3 pr-2 text-right font-medium">Valor Real</th><th className="pb-3 w-16"></th></tr></thead>
                    <tbody className="text-sm">
                        {installments.map((inst) => {
                            const currentInst = inst.current_installment + MONTHS.indexOf(activeTab);
                            // CORREÇÃO NA VISUALIZAÇÃO: Se for menor que 1, não mostra (ainda não comprou)
                            if (currentInst < 1 || currentInst > inst.installments_count) return null;
                            return (
                                <tr key={inst.id} className="border-b border-gray-800/50 hover:bg-gray-800/20 group transition">
                                    <td className="py-4 pl-2 font-medium text-white">{inst.title}</td>
                                    <td className="py-4 text-gray-500 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-pink-500"></span>Parcelado</td>
                                    <td className="py-4 text-gray-400"><span className="bg-gray-800 text-xs px-2 py-1 rounded text-gray-300 border border-gray-700">{currentInst}/{inst.installments_count}</span></td>
                                    <td className="py-4 pr-2 text-right font-mono text-gray-200">R$ {inst.value_per_month.toFixed(2)}</td>
                                    <td className="py-4 text-right flex gap-2 justify-end"><button onClick={() => handleEdit(inst, 'installment')} className="text-gray-600 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition"><Pencil size={16}/></button><button onClick={() => handleDelete('installments', inst.id)} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16}/></button></td>
                                </tr>
                            );
                        })}
                        {recurring.filter(r => r.type === 'expense').map((rec) => {
                             if (rec.skipped_months?.includes(activeTab)) return null;
                             return (
                                <tr key={`rec-${rec.id}`} className="border-b border-gray-800/50 hover:bg-gray-800/20 group transition">
                                    <td className="py-4 pl-2 font-medium text-white">{rec.title}</td>
                                    <td className="py-4 text-gray-500 flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-blue-500"></span>Fixo</td>
                                    <td className="py-4 text-gray-400 text-xs">Mensal</td>
                                    <td className="py-4 pr-2 text-right font-mono text-gray-200">R$ {rec.value.toFixed(2)}</td>
                                    <td className="py-4 text-right flex gap-2 justify-end"><button onClick={() => handleEdit(rec, 'fixed_expense')} className="text-gray-600 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition"><Pencil size={16}/></button><button onClick={() => handleDelete('recurring', rec.id)} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16}/></button></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-gray-700 p-8 rounded-3xl w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsFormOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24} /></button>
            <h2 className="text-2xl font-bold mb-6 text-white">{editingId ? 'Editar' : 'Novo Lançamento'}</h2>
            <div className="grid grid-cols-2 gap-2 mb-6">
                <button onClick={() => setFormMode('income')} className={`py-3 rounded-xl border text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${formMode === 'income' ? 'bg-green-500/20 border-green-500 text-green-500' : 'bg-gray-900 border-gray-800 text-gray-500'}`}><DollarSign size={20}/> Entrada</button>
                <button onClick={() => setFormMode('expense')} className={`py-3 rounded-xl border text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${formMode === 'expense' ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-gray-900 border-gray-800 text-gray-500'}`}><TrendingDown size={20}/> Gasto</button>
                <button onClick={() => setFormMode('installment')} className={`py-3 rounded-xl border text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${formMode === 'installment' ? 'bg-pink-500/20 border-pink-500 text-pink-500' : 'bg-gray-900 border-gray-800 text-gray-500'}`}><CreditCard size={20}/> Parcelado</button>
                <button onClick={() => setFormMode('fixed_expense')} className={`py-3 rounded-xl border text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${formMode === 'fixed_expense' ? 'bg-blue-500/20 border-blue-500 text-blue-500' : 'bg-gray-900 border-gray-800 text-gray-500'}`}><CheckCircle2 size={20}/> Fixo</button>
            </div>
            <div className="space-y-4">
                {formMode === 'income' && (<div className="bg-gray-900 p-4 rounded-xl border border-gray-800 space-y-3"><div className="flex items-center justify-between"><label className="text-gray-400 text-sm">Mês:</label><select value={formData.targetMonth} onChange={(e) => setFormData({...formData, targetMonth: e.target.value})} className="bg-black text-white p-2 rounded-lg border border-gray-700 outline-none">{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}</select></div><div className="flex items-center gap-3"><input type="checkbox" id="fixo" checked={formData.isFixedIncome} onChange={(e) => setFormData({...formData, isFixedIncome: e.target.checked})} className="w-5 h-5 rounded accent-purple-500"/><label htmlFor="fixo" className="text-gray-300 text-sm cursor-pointer select-none">Fixo mensal?</label></div></div>)}
                {formMode === 'installment' && (<div className="bg-pink-900/10 p-4 rounded-xl border border-pink-900/30 space-y-3 mb-4"><p className="text-pink-400 text-xs font-bold uppercase mb-2">Financiamento / Valor Personalizado</p><label className="text-gray-400 text-xs block">Valor Real da Parcela (com Juros):</label><input type="number" value={formData.fixedMonthlyValue} onChange={(e) => setFormData({...formData, fixedMonthlyValue: e.target.value})} className="w-full bg-black border border-gray-700 rounded-lg p-2 text-white focus:border-pink-500 outline-none" placeholder="Ex: 850.00"/></div>)}
                <input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none" placeholder="Descrição"/>
                <input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none" placeholder={formMode === 'installment' ? "Valor TOTAL da Dívida" : "Valor (R$)"}/>
                {formMode === 'installment' && (<div className="flex gap-4"><input type="number" placeholder="Parcelas" value={formData.installments} onChange={(e) => setFormData({...formData, installments: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white outline-none"/><input type="number" placeholder="Dia Venc." value={formData.dueDay} onChange={(e) => setFormData({...formData, dueDay: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white outline-none"/></div>)}
                <button onClick={handleSubmit} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-4 rounded-xl transition mt-4 shadow-lg shadow-purple-900/20">{editingId ? 'Salvar Alterações' : 'Adicionar'}</button>
            </div>
          </div>
        </div>
      )}

      {isAuthModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] border border-gray-700 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative text-center">
            <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24} /></button>
            <div className="mb-6 flex justify-center"><div className="bg-purple-600/20 p-4 rounded-full"><User size={32} className="text-purple-400"/></div></div>
            <h2 className="text-2xl font-bold mb-2 text-white">Acesse sua conta</h2>
            <p className="text-gray-400 text-sm mb-6">Salve seus dados na nuvem.</p>
            <div className="space-y-4 text-left">
                <div><label className="text-xs text-gray-500 ml-1">E-mail</label><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none"/></div>
                <div><label className="text-xs text-gray-500 ml-1">Senha</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none"/></div>
            </div>
            <div className="flex flex-col gap-3 mt-6">
                <button onClick={handleLoginPassword} disabled={loadingAuth} className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition">{loadingAuth ? 'Carregando...' : 'Entrar'}</button>
                <button onClick={handleSignUp} disabled={loadingAuth} className="w-full bg-transparent border border-gray-600 hover:border-white text-gray-300 hover:text-white font-bold py-3 rounded-xl transition">Criar conta nova</button>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-800"><button onClick={handleLoginMagicLink} className="text-xs text-purple-400 hover:underline">Esqueci a senha / Entrar sem senha (Magic Link)</button></div>
            {authMessage && <p className={`text-sm mt-4 ${authMessage.includes('Erro') ? 'text-red-400' : 'text-green-400'}`}>{authMessage}</p>}
          </div>
        </div>
      )}

      {isAIOpen && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
             <div className="bg-[#0f0f13] border border-gray-700 w-full max-w-2xl h-[600px] rounded-3xl shadow-2xl flex flex-col relative overflow-hidden">
                <div className="p-6 border-b border-gray-800 bg-[#111] flex justify-between items-center z-10"><div className="flex items-center gap-3"><div className="bg-purple-600/20 p-2 rounded-lg"><Sparkles className="text-purple-400" size={24} /></div><h2 className="text-xl font-bold text-white">Consultor IA</h2></div><button onClick={() => setIsAIOpen(false)} className="text-gray-500 hover:text-white"><X /></button></div>
                <div className="flex-1 p-6 overflow-y-auto space-y-4">{aiResponse ? <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 text-gray-200 leading-relaxed whitespace-pre-line">{aiResponse}</div> : <p className="text-center text-gray-600 mt-20 italic">"Estou endividado?"</p>}{isLoading && <div className="text-purple-400 animate-pulse text-center">Pensando...</div>}</div>
                <div className="p-4 bg-[#111] border-t border-gray-800 flex gap-2"><input type="text" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && askGemini()} placeholder="Pergunte..." className="flex-1 bg-gray-900 border border-gray-700 rounded-xl p-4 text-white outline-none"/><button onClick={askGemini} className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-xl"><Send size={24}/></button></div>
          </div>
        </div>
      )}
    </div>
  );
}