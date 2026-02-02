'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, TrendingDown, DollarSign, Plus, X, List, LayoutGrid, Sparkles, Send, Trash2, AlertCircle, CheckCircle2, Pencil, Clock, AlertTriangle, Check, LogIn, LogOut, User, Eye, EyeOff, CheckSquare, Square, ArrowRight, Crown, ShieldCheck, Mail, Loader2, Lock, BarChart3, Search, Target } from 'lucide-react';
import { supabase } from '@/supabase';

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// --- CARD COMPONENT ---
const Card = ({ title, value, icon: Icon, type, extraLabel, subValueLabel }: any) => (
  <div className={`backdrop-blur-md border p-5 md:p-6 rounded-2xl transition duration-300 group relative overflow-hidden h-full shadow-lg ${type === 'negative' ? 'bg-red-950/20 border-red-900/50' : 'bg-[#0f1219] border-gray-800 hover:border-cyan-500/30'}`}>
    <div className="flex justify-between items-start z-10 relative">
      <div>
        <p className="text-gray-400 text-xs md:text-sm font-medium mb-1 group-hover:text-cyan-400 transition uppercase tracking-wide">{title}</p>
        <h3 className={`text-2xl md:text-3xl font-bold tracking-tight ${type === 'negative' ? 'text-red-500' : 'text-white'}`}>
            R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </h3>
        {extraLabel && <p className="text-[10px] md:text-xs text-emerald-400 mt-2 font-mono bg-emerald-900/20 inline-block px-2 py-1 rounded border border-emerald-900/30">{extraLabel}</p>}
        {subValueLabel && <div className="mt-2 text-xs border-t border-gray-700/50 pt-2 text-gray-400">{subValueLabel}</div>}
      </div>
      <div className={`p-2 md:p-3 rounded-xl ${type === 'expense' || type === 'negative' ? 'bg-red-500/10 text-red-400' : 'bg-cyan-500/10 text-cyan-400'}`}>
        <Icon size={20} className="md:w-6 md:h-6" />
      </div>
    </div>
    <div className={`absolute -top-10 -right-10 w-32 h-32 bg-gradient-to-br ${type === 'negative' ? 'from-red-600/10' : 'from-cyan-600/10'} to-transparent rounded-full blur-3xl pointer-events-none`}></div>
  </div>
);

export default function FinancialDashboard() {
  const currentSystemMonthIndex = new Date().getMonth(); 
  const currentSystemMonthName = MONTHS[currentSystemMonthIndex];

  const [activeTab, setActiveTab] = useState(currentSystemMonthName); 
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  
  // --- AUTH STATES ---
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [showEmailCheck, setShowEmailCheck] = useState(false);

  const [isRolloverModalOpen, setIsRolloverModalOpen] = useState(false);
  const [pastDueItems, setPastDueItems] = useState<any[]>([]);

  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authMessage, setAuthMessage] = useState('');
  const [userPlan, setUserPlan] = useState<string>('free');

  const [transactions, setTransactions] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);
  const [recurring, setRecurring] = useState<any[]>([]);

  const [formMode, setFormMode] = useState<'income' | 'expense' | 'installment' | 'fixed_expense'>('income');
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const initialFormState = { 
      title: '', amount: '', installments: '', dueDay: '', category: 'Outros', targetMonth: currentSystemMonthName, isFixedIncome: false, fixedMonthlyValue: '' 
  };
  const [formData, setFormData] = useState(initialFormState);
  
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState<any>('');
  const [isLoading, setIsLoading] = useState(false);

  // --- AUTH & LOAD ---
  useEffect(() => {
    const checkUser = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
        if(session?.user) fetchUserProfile(session.user.id);
        loadData(session?.user);
    };
    checkUser();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user || null);
        if(session?.user) fetchUserProfile(session.user.id);
        loadData(session?.user);
    });
    return () => subscription.unsubscribe();
  }, []);

  const fetchUserProfile = async (userId: string) => {
      const { data } = await supabase.from('profiles').select('plan_tier').eq('id', userId).single();
      if (data) setUserPlan(data.plan_tier || 'free');
  };

  useEffect(() => {
      if (transactions.length > 0 || installments.length > 0) checkForPastDueItems();
  }, [transactions, installments, recurring]);

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
      setTransactions(newTrans); setInstallments(newInst); setRecurring(newRecur);
      localStorage.setItem('guest_transactions', JSON.stringify(newTrans));
      localStorage.setItem('guest_installments', JSON.stringify(newInst));
      localStorage.setItem('guest_recurring', JSON.stringify(newRecur));
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

  // --- ACTIONS ---
  const handleAuth = async () => {
      setLoadingAuth(true);
      setAuthMessage('');
      
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
          else {
              setShowEmailCheck(true);
          }
      }
      setLoadingAuth(false);
  };

  const handleResetPassword = async () => {
      if (!email) {
          setAuthMessage("⚠️ Digite seu e-mail no campo acima.");
          return;
      }
      setLoadingAuth(true);
      setAuthMessage('');
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}`,
      });

      if (error) {
          setAuthMessage("❌ Erro: " + error.message);
      } else {
          setAuthMessage("✅ Link enviado! Verifique seu e-mail.");
      }
      setLoadingAuth(false);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); window.location.reload(); };

  const handleCheckout = async () => {
      if (!user) { alert("Faça login primeiro!"); return; }
      const btn = document.getElementById('premium-btn');
      if(btn) btn.innerText = "Processando...";
      try {
          const response = await fetch('/api/checkout', {
              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, email: user.email }),
          });
          const data = await response.json();
          if (data.url) window.location.href = data.url; else alert("Erro ao criar pagamento.");
      } catch (e) { alert("Erro de conexão."); }
      if(btn) btn.innerText = "Seja Premium 👑";
  };

  const handleDelete = async (table: string, id: number) => { if(!confirm("Tem certeza?")) return; if (user) { await supabase.from(table).delete().eq('id', id); loadData(user); } else { if (table==='transactions') saveDataLocal(transactions.filter(t=>t.id!==id), installments, recurring); else if(table==='installments') saveDataLocal(transactions, installments.filter(i=>i.id!==id), recurring); else saveDataLocal(transactions, installments, recurring.filter(r=>r.id!==id)); } };
  const togglePaid = async (table: string, id: number, currentStatus: boolean) => { if (user) { await supabase.from(table).update({ is_paid: !currentStatus }).eq('id', id); loadData(user); } else { const updateList = (list: any[]) => list.map(i => i.id === id ? { ...i, is_paid: !currentStatus } : i); if (table === 'transactions') saveDataLocal(updateList(transactions), installments, recurring); } };
  const toggleDelay = async (table: string, item: any) => { const newStatus = item.status === 'delayed' ? 'active' : 'delayed'; if (user) { await supabase.from(table).update({ status: newStatus }).eq('id', item.id); loadData(user); } else { const updateStatus = (list: any[]) => list.map(i => i.id === item.id ? { ...i, status: newStatus } : i); if (table === 'transactions') saveDataLocal(updateStatus(transactions), installments, recurring); else if (table === 'installments') saveDataLocal(transactions, updateStatus(installments), recurring); else saveDataLocal(transactions, installments, updateStatus(recurring)); } if (isRolloverModalOpen) setPastDueItems(prev => prev.filter(i => i.id !== item.id || i.origin !== table)); };
  const toggleSkipMonth = async (item: any) => { const currentSkipped = item.skipped_months || []; const isSkipped = currentSkipped.includes(activeTab); let newSkipped = isSkipped ? currentSkipped.filter((m: string) => m !== activeTab) : [...currentSkipped, activeTab]; if (user) { await supabase.from('recurring').update({ skipped_months: newSkipped }).eq('id', item.id); loadData(user); } else { const newRecur = recurring.map(r => r.id === item.id ? { ...r, skipped_months: newSkipped } : r); saveDataLocal(transactions, installments, newRecur); } };
  const togglePaidMonth = async (table: string, item: any) => { const currentPaid = item.paid_months || []; const isPaid = currentPaid.includes(activeTab); let newPaid = isPaid ? currentPaid.filter((m: string) => m !== activeTab) : [...currentPaid, activeTab]; if (user) { await supabase.from(table).update({ paid_months: newPaid }).eq('id', item.id); loadData(user); } else { const updateList = (list: any[]) => list.map(i => i.id === item.id ? { ...i, paid_months: newPaid } : i); if (table === 'installments') saveDataLocal(transactions, updateList(installments), recurring); if (table === 'recurring') saveDataLocal(transactions, installments, updateList(recurring)); } };

  const handleEdit = (item: any, mode: any) => { setFormMode(mode); setEditingId(item.id); setFormData({ title: item.title, amount: item.amount || item.value || item.total_value || '', installments: item.installments_count || '', dueDay: item.due_day || '', category: item.category || 'Outros', targetMonth: item.target_month || activeTab, isFixedIncome: mode === 'income' && item.category === 'Salário', fixedMonthlyValue: item.fixed_monthly_value || '' }); setIsFormOpen(true); };
  const openNewTransactionModal = () => { setEditingId(null); setFormData({ ...initialFormState, targetMonth: activeTab }); setIsFormOpen(true); };

  const handleSubmit = async () => {
    if (!formData.title || !formData.amount) return;
    const amountVal = parseFloat(formData.amount.toString());
    const fixedInstallmentVal = formData.fixedMonthlyValue ? parseFloat(formData.fixedMonthlyValue.toString()) : null;
    const monthMap: Record<string, string> = { 'Jan': '01', 'Fev': '02', 'Mar': '03', 'Abr': '04', 'Mai': '05', 'Jun': '06', 'Jul': '07', 'Ago': '08', 'Set': '09', 'Out': '10', 'Nov': '11', 'Dez': '12' };
    const dateString = `01/${monthMap[formData.targetMonth]}/2026`; 
    const commonData = { user_id: user?.id };
    const getPayload = () => { if (formMode === 'income') { return formData.isFixedIncome ? { table: 'recurring', data: { ...commonData, title: formData.title, value: amountVal, due_day: 1, category: 'Salário', type: 'income', status: 'active', start_date: dateString } } : { table: 'transactions', data: { ...commonData, title: formData.title, amount: amountVal, type: 'income', date: dateString, category: 'Receita', target_month: formData.targetMonth, status: 'active' } }; } if (formMode === 'expense') return { table: 'transactions', data: { ...commonData, title: formData.title, amount: amountVal, type: 'expense', date: dateString, category: formData.category, target_month: formData.targetMonth, status: 'active' } }; if (formMode === 'installment') { const qtd = parseInt(formData.installments.toString()) || 1; const realValuePerMonth = fixedInstallmentVal ? fixedInstallmentVal : (amountVal / qtd); const targetMonthIndex = MONTHS.indexOf(formData.targetMonth); const startOffset = 1 - targetMonthIndex; return { table: 'installments', data: { ...commonData, title: formData.title, total_value: amountVal, installments_count: qtd, current_installment: startOffset, value_per_month: realValuePerMonth, fixed_monthly_value: fixedInstallmentVal, due_day: parseInt(formData.dueDay.toString()) || 10, status: 'active' } }; } return { table: 'recurring', data: { ...commonData, title: formData.title, value: amountVal, due_day: parseInt(formData.dueDay.toString()) || 10, category: 'Fixa', type: 'expense', status: 'active', start_date: dateString } }; };
    const { table, data } = getPayload(); if (user) { if (editingId) await supabase.from(table).update(data).eq('id', editingId); else await supabase.from(table).insert([data]); loadData(user); } else { const newItem = { ...data, id: editingId || Date.now(), is_paid: false }; if (table === 'transactions') { const list = editingId ? transactions.map(t => t.id === editingId ? newItem : t) : [newItem, ...transactions]; saveDataLocal(list, installments, recurring); } else if (table === 'installments') { const list = editingId ? installments.map(i => i.id === editingId ? newItem : i) : [...installments, newItem]; saveDataLocal(transactions, list, recurring); } else { const list = editingId ? recurring.map(r => r.id === editingId ? newItem : r) : [...recurring, newItem]; saveDataLocal(transactions, installments, list); } }
    setFormData({ ...initialFormState, targetMonth: activeTab }); setEditingId(null); setIsFormOpen(false);
  };

  const getMonthData = (monthName: string) => { const monthIndex = MONTHS.indexOf(monthName); const monthMap: Record<string, string> = { 'Jan': '/01', 'Fev': '/02', 'Mar': '/03', 'Abr': '/04', 'Mai': '/05', 'Jun': '/06', 'Jul': '/07', 'Ago': '/08', 'Set': '/09', 'Out': '/10', 'Nov': '/11', 'Dez': '/12' }; const dateFilter = monthMap[monthName]; const isRecurringActive = (rec: any, checkIndex: number) => { if (!rec.start_date) return true; const startMonthIndex = parseInt(rec.start_date.split('/')[1]) - 1; return checkIndex >= startMonthIndex; }; const incomeFixed = recurring.filter(r => r.type === 'income' && isRecurringActive(r, monthIndex) && !r.skipped_months?.includes(monthName)).reduce((acc, curr) => acc + curr.value, 0); const incomeVariable = transactions.filter(t => t.type === 'income' && t.date?.includes(dateFilter) && t.status !== 'delayed').reduce((acc, curr) => acc + curr.amount, 0); const expenseVariable = transactions.filter(t => t.type === 'expense' && t.date?.includes(dateFilter) && t.status !== 'delayed').reduce((acc, curr) => acc + curr.amount, 0); const expenseFixed = recurring.filter(r => r.type === 'expense' && isRecurringActive(r, monthIndex) && !r.skipped_months?.includes(monthName) && r.status !== 'delayed').reduce((acc, curr) => acc + curr.value, 0); const installTotal = installments.reduce((acc, curr) => { if (curr.status === 'delayed') return acc; const offset = monthIndex; const actualInstallment = curr.current_installment + offset; if (actualInstallment >= 1 && actualInstallment <= curr.installments_count) return acc + curr.value_per_month; return acc; }, 0); const delayedTotal = transactions.filter(t => t.status === 'delayed').reduce((acc, curr) => acc + curr.amount, 0) + installments.filter(i => i.status === 'delayed').reduce((acc, curr) => acc + curr.value, 0) + recurring.filter(r => r.status === 'delayed' && r.type === 'expense').reduce((acc, curr) => acc + curr.value, 0); let accumulatedDebt = 0; for (let i = 0; i < monthIndex; i++) { const pastMonth = MONTHS[i]; installments.forEach(inst => { const pastInst = inst.current_installment + i; if (inst.status !== 'delayed' && pastInst >= 1 && pastInst <= inst.installments_count) { if (!inst.paid_months?.includes(pastMonth)) accumulatedDebt += inst.value_per_month; } }); recurring.filter(r => r.type === 'expense').forEach(rec => { if (rec.status !== 'delayed' && isRecurringActive(rec, i) && !rec.paid_months?.includes(pastMonth) && !rec.skipped_months?.includes(pastMonth)) { accumulatedDebt += rec.value; } }); const pastDateFilter = Object.values(monthMap)[i]; transactions.forEach(t => { if (t.type === 'expense' && t.status !== 'delayed' && t.date?.includes(pastDateFilter) && !t.is_paid) { accumulatedDebt += t.amount; } }) } const totalObligations = expenseVariable + expenseFixed + installTotal + accumulatedDebt; return { income: incomeFixed + incomeVariable, expenseTotal: totalObligations, accumulatedDebt, balance: (incomeFixed + incomeVariable) - totalObligations, delayedTotal }; };
  const currentMonthData = getMonthData(activeTab); let previousSurplus = 0; const currentIndex = MONTHS.indexOf(activeTab); if (currentIndex > 0) { const prevData = getMonthData(MONTHS[currentIndex - 1]); if (prevData.balance > 0) previousSurplus = prevData.balance; } const displayBalance = currentMonthData.balance + previousSurplus;
  
  // --- IA INTELIGENTE (COM CORREÇÃO DE PARCELAS) ---
  const askGemini = async (overridePrompt?: string) => {
    const promptToSend = overridePrompt || aiPrompt;
    if (!promptToSend) return;
    
    setIsLoading(true); 
    setAiResponse('');
    
    // --- ENRIQUECIMENTO DE DADOS PARA ANÁLISE ---
    // Pegamos os 15 maiores gastos do mês para a IA analisar vazamentos
    const topExpenses = transactions
        .filter(t => t.type === 'expense' && t.status !== 'delayed')
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 15);

    const activeInstallments = installments
        .filter(i => i.status !== 'delayed')
        .map(i => ({ title: i.title, parcelas: i.installments_count, valor_mes: i.value_per_month }));

    const fixedCosts = recurring
        .filter(r => r.type === 'expense' && r.status !== 'delayed')
        .map(r => ({ title: r.title, valor: r.value }));

    const contextData = { 
        mes_atual: activeTab, 
        saldo: currentMonthData.balance,
        gastos_totais: currentMonthData.expenseTotal,
        renda: currentMonthData.income,
        maiores_gastos: topExpenses,
        parcelamentos_ativos: activeInstallments,
        contas_fixas: fixedCosts
    };

    // Bloqueio Free
    const isActionIntent = promptToSend.toLowerCase().includes('adicion') || promptToSend.toLowerCase().includes('gast') || promptToSend.toLowerCase().includes('comp');
    if (userPlan === 'free' && isActionIntent) {
        setAiResponse(
            <div className="text-center p-4">
                <p className="mb-4 text-gray-300">🔒 <b>Automação Exclusiva</b><br/>Para lançar contas automaticamente, ative o plano Premium.</p>
                <button onClick={handleCheckout} className="bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold py-3 px-6 rounded-full shadow-lg w-full flex items-center justify-center gap-2"><Crown size={18}/> Ativar Agora</button>
            </div>
        );
        setIsLoading(false); setAiPrompt(''); return;
    }

    try {
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: promptToSend, contextData, userPlan })
        });

        const data = await response.json();
        const text = data.response || "";

        if (userPlan !== 'free') {
            const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const firstBracket = cleanText.search(/\[|\{/);
            const lastBracket = cleanText.search(/\]|\}(?!.*\]|\})/);

            // Só tenta processar JSON se parecer muito com JSON (inicia com [ ou {)
            // Se for análise (texto), pula isso aqui.
            if (firstBracket !== -1 && lastBracket !== -1) {
                const potentialJson = cleanText.substring(firstBracket, lastBracket + 1);
                
                try {
                    const parsed = JSON.parse(potentialJson);
                    const commands = Array.isArray(parsed) ? parsed : [parsed];
                    
                    let itemsAdded = 0;

                    for (const command of commands) {
                        if (command.action === 'add' && user) {
                            let payload: any = { user_id: user.id };
                            const rawData = command.data;

                            if (command.table === 'installments') {
                                const totalVal = rawData.total_value || rawData.amount || rawData.value || 0;
                                const qtd = rawData.installments_count || 1;
                                const currentMonthIndex = MONTHS.indexOf(activeTab);
                                const installmentOffset = 1 - currentMonthIndex;

                                payload = {
                                    ...payload,
                                    title: rawData.title,
                                    total_value: totalVal,
                                    installments_count: qtd,
                                    value_per_month: rawData.value_per_month || (totalVal / qtd),
                                    current_installment: installmentOffset, 
                                    fixed_monthly_value: null,
                                    due_day: rawData.due_day || 10,
                                    status: 'active',
                                    paid_months: []
                                };
                            } 
                            else if (command.table === 'transactions') {
                                payload = {
                                    ...payload,
                                    title: rawData.title,
                                    amount: rawData.amount || rawData.value || 0,
                                    type: rawData.type || 'expense',
                                    category: rawData.category || 'Outros',
                                    date: rawData.date || new Date().toLocaleDateString('pt-BR'),
                                    target_month: rawData.target_month || activeTab, 
                                    status: 'active',
                                    is_paid: true 
                                };
                            }
                            else if (command.table === 'recurring') {
                                payload = {
                                    ...payload,
                                    title: rawData.title,
                                    value: rawData.value || rawData.amount || 0,
                                    type: rawData.type || 'expense',
                                    category: rawData.category || 'Fixa',
                                    start_date: rawData.start_date || `01/${activeTab === 'Jan' ? '01' : '01'}/2026`,
                                    status: 'active',
                                    due_day: rawData.due_day || 10
                                };
                            }

                            const { error } = await supabase.from(command.table).insert([payload]); 
                            if (!error) itemsAdded++;
                        }
                    }

                    if (itemsAdded > 0) {
                        await loadData(user);
                        setAiResponse(`✅ Feito! Registrei ${itemsAdded} lançamentos em ${activeTab}.`);
                        return;
                    }

                } catch (e) { 
                    // Se falhar JSON, assume que é texto de análise
                }
            }
        }
        setAiResponse(text);

    } catch (e) { 
        setAiResponse("Erro de conexão com a IA."); 
    } finally { 
        setIsLoading(false); setAiPrompt(''); 
    } 
  };

  const renderTransactions = () => { const monthMap: Record<string, string> = { 'Jan': '/01', 'Fev': '/02', 'Mar': '/03', 'Abr': '/04', 'Mai': '/05', 'Jun': '/06', 'Jul': '/07', 'Ago': '/08', 'Set': '/09', 'Out': '/10', 'Nov': '/11', 'Dez': '/12' }; const filter = monthMap[activeTab]; const normalItems = transactions.filter(t => t.date?.includes(filter) && t.status !== 'delayed'); const fixedItems = recurring.map(r => { const startMonthIndex = r.start_date ? parseInt(r.start_date.split('/')[1]) - 1 : 0; const currentMonthIndex = MONTHS.indexOf(activeTab); if (currentMonthIndex < startMonthIndex) return null; return { ...r, isFixed: true, isSkipped: r.skipped_months?.includes(activeTab), date: 'Fixo Mensal', amount: r.value }; }).filter(Boolean); const allItems = [...fixedItems, ...normalItems.map(t => ({...t, isFixed: false, isSkipped: false}))]; if (allItems.length === 0) return <p className="text-gray-500 text-center py-8 italic text-sm border border-dashed border-gray-800 rounded-xl">Nenhuma movimentação neste mês.</p>; return allItems.map((item: any) => { if (item.status === 'delayed') return null; const isDimmed = item.isSkipped || item.is_paid; return ( <div key={`${item.isFixed ? 'fix' : 'var'}-${item.id}`} className={`flex justify-between items-center p-4 border rounded-xl group transition ${isDimmed ? 'bg-[#0f1219]/50 border-gray-800/50 opacity-60' : 'bg-[#0f1219] border-gray-800 hover:border-gray-700'}`}> <div className="flex items-center gap-4"> {!item.isFixed && (<button onClick={() => togglePaid('transactions', item.id, item.is_paid)} className={`rounded-full p-1.5 border transition ${item.is_paid ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'border-gray-600 text-transparent hover:border-emerald-500'}`}><Check size={12} /></button>)} {item.isFixed && (<button onClick={() => toggleSkipMonth(item)} className={`rounded-full p-1.5 border transition ${item.isSkipped ? 'bg-gray-800 border-gray-700 text-gray-500' : 'border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10'}`}>{item.isSkipped ? <EyeOff size={12}/> : <Eye size={12}/>}</button>)} <div> <p className={`font-semibold text-sm ${isDimmed ? 'text-gray-500 line-through' : 'text-gray-200'}`}>{item.title} {item.isFixed && <span className="text-[9px] bg-blue-900/30 text-blue-400 px-1.5 py-0.5 rounded ml-1 uppercase tracking-wide">Fixo</span>}</p> <p className="text-xs text-gray-500">{item.isSkipped ? 'PULADO' : item.date}</p> </div> </div> <div className="flex items-center gap-3"> <span className={`font-mono font-medium ${item.type === 'income' ? 'text-emerald-400' : 'text-red-400'}`}>{item.type === 'expense' ? '-' : '+'} {item.amount.toFixed(2)}</span> <div className="flex gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition"> {!item.isFixed && item.type === 'expense' && (<button onClick={() => toggleDelay(item.isFixed ? 'recurring' : 'transactions', item)} className="p-1.5 rounded bg-orange-500/10 text-orange-500 hover:bg-orange-500 hover:text-white" title="Stand-by"><Clock size={14}/></button>)} <button onClick={() => handleEdit(item, item.isFixed ? (item.type === 'income' ? 'income' : 'fixed_expense') : (item.type === 'income' ? 'income' : 'expense'))} className="p-1.5 rounded hover:bg-blue-500/10 text-blue-500"><Pencil size={14}/></button> <button onClick={() => handleDelete(item.isFixed ? 'recurring' : 'transactions', item.id)} className="p-1.5 rounded hover:bg-red-500/10 text-red-500"><Trash2 size={14}/></button> </div> </div> </div> ); }); };
  const renderDelayed = () => { const delayedTrans = transactions.filter(t => t.status === 'delayed').map(t => ({ ...t, _source: 'trans' })); const delayedInst = installments.filter(i => i.status === 'delayed').map(i => ({ ...i, _source: 'inst' })); const delayedRecur = recurring.filter(r => r.status === 'delayed').map(r => ({ ...r, _source: 'recur' })); const delayedItems = [...delayedTrans, ...delayedInst, ...delayedRecur]; if (delayedItems.length === 0) return null; return (<div className="mt-8 border border-red-900/30 bg-red-950/10 rounded-2xl p-6"><h3 className="text-red-400 font-bold flex items-center gap-2 mb-4"><AlertTriangle size={18}/> Em Stand-by (Congelados)</h3><div className="space-y-2">{delayedItems.map((item: any) => (<div key={`del-${item._source}-${item.id}`} className="flex justify-between items-center p-3 bg-red-900/10 rounded-lg border border-red-900/20"><span className="text-red-200 text-sm">{item.title}</span><div className="flex items-center gap-3"><span className="font-mono text-red-400 font-bold">R$ {(item.amount || item.value || item.value_per_month).toFixed(2)}</span><button onClick={() => toggleDelay(item._source === 'trans' ? 'transactions' : item._source === 'inst' ? 'installments' : 'recurring', item)} className="text-xs bg-red-500 text-white px-2 py-1 rounded hover:bg-red-400">Restaurar</button></div></div>))}</div><p className="text-xs text-red-500/50 mt-3 text-center">Estes valores não afetam seu saldo atual.</p></div>) };

  const hasDelayed = currentMonthData.delayedTotal > 0;
  const gridClass = hasDelayed ? "grid-cols-1 md:grid-cols-2 xl:grid-cols-4" : "grid-cols-1 md:grid-cols-3";

  return (
    <div className="min-h-screen bg-[#050505] text-gray-100 p-4 md:p-8 font-sans selection:bg-cyan-500 selection:text-black relative">
      {/* CORREÇÃO: HEADER "MEU ALIADO" */}
      <header className="flex flex-col gap-6 md:flex-row md:justify-between md:items-center mb-10">
        <div className="text-center md:text-left">
          <h1 className="text-4xl font-extrabold text-white flex items-center justify-center md:justify-start gap-2 tracking-tighter">
             <ShieldCheck className="text-cyan-500" size={32} /> Meu<span className="text-cyan-500">Aliado.</span>
          </h1>
          <div className="flex items-center gap-2 mt-1 justify-center md:justify-start text-xs font-medium tracking-wide text-gray-500 uppercase">
             <div className={`w-1.5 h-1.5 rounded-full ${user ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`}></div>
             {user ? `Membro ${userPlan === 'premium' ? 'Premium 👑' : 'Standard'}` : 'Modo Local'}
          </div>
        </div>
        <div className="flex flex-wrap justify-center md:justify-end gap-3 w-full md:w-auto">
            {user ? (<button onClick={handleLogout} className="flex-1 md:flex-none bg-gray-900 border border-gray-800 text-gray-400 px-5 py-3 rounded-xl hover:bg-gray-800 hover:text-white flex items-center justify-center gap-2 whitespace-nowrap transition"><LogOut size={18}/> Sair</button>) : (<button onClick={() => { setIsAuthModalOpen(true); setShowEmailCheck(false); setAuthMode('login'); }} className="flex-1 md:flex-none bg-gray-900 border border-gray-800 text-white px-5 py-3 rounded-xl hover:border-cyan-500/50 flex items-center justify-center gap-2 whitespace-nowrap transition"><LogIn size={18}/> Entrar</button>)}
            {userPlan === 'free' && user && (
                <button id="premium-btn" onClick={handleCheckout} className="flex-1 md:flex-none bg-gradient-to-r from-amber-500 to-orange-600 text-white px-6 py-3 rounded-xl font-bold hover:shadow-[0_0_20px_rgba(245,158,11,0.4)] transition flex items-center justify-center gap-2 whitespace-nowrap">
                    <Crown size={18}/> Seja Premium
                </button>
            )}
            <button onClick={() => setIsAIOpen(true)} className={`flex-1 md:flex-none bg-gradient-to-r ${userPlan === 'premium' ? 'from-cyan-600 to-blue-600' : 'from-gray-800 to-gray-700'} text-white px-5 py-3 rounded-xl font-bold hover:scale-105 transition border border-white/10 flex items-center justify-center gap-2 whitespace-nowrap shadow-lg`}><Sparkles size={18} className={userPlan === 'premium' ? "text-cyan-200" : "text-gray-400"}/> {userPlan === 'premium' ? 'Agente IA' : 'Consultor'}</button>
            <button onClick={openNewTransactionModal} className="flex-1 md:flex-none bg-white text-black px-6 py-3 rounded-xl font-bold hover:bg-gray-200 transition flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(255,255,255,0.1)] whitespace-nowrap"><Plus size={18}/> Novo</button>
        </div>
      </header>

      {/* RESTANTE DO DASHBOARD... */}
      <div className={`grid gap-6 mb-12 ${gridClass}`}>
        <Card title={`Saldo em ${activeTab}`} value={displayBalance} icon={DollarSign} type={displayBalance >= 0 ? 'income' : 'negative'} extraLabel={previousSurplus > 0 ? `+ R$ ${previousSurplus.toFixed(2)} (Sobra)` : null} />
        <Card title="Compromissos do Mês" value={currentMonthData.expenseTotal} icon={TrendingDown} type="expense" subValueLabel={currentMonthData.accumulatedDebt > 0 ? (<span className="text-red-400 font-bold flex items-center gap-1"><AlertCircle size={12}/> + R$ {currentMonthData.accumulatedDebt.toFixed(2)} Pendente Antigo</span>) : null} />
        <Card title="Entradas Previstas" value={currentMonthData.income} icon={CreditCard} type="income" />
        {hasDelayed && (<div className="bg-red-950/30 backdrop-blur-md border border-red-900/50 p-6 rounded-2xl flex flex-col justify-between relative h-full"><div><div className="flex items-center gap-3 text-red-400 mb-2"><Clock size={24} /><h3 className="font-bold">Em Stand-by</h3></div><p className="text-white text-2xl font-bold">R$ {currentMonthData.delayedTotal.toFixed(2)}</p></div><p className="text-xs text-red-400/60 mt-2">Valores congelados propositalmente.</p></div>)}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-1 space-y-6"><h2 className="text-xl font-bold flex items-center gap-2 text-gray-200"><List size={20} className="text-cyan-500"/> Extrato</h2><div className="space-y-3">{renderTransactions()}</div>{renderDelayed()}</div>
        <div className="xl:col-span-2 bg-[#0f1219] border border-gray-800 rounded-3xl p-6 md:p-8">
            <div className="flex justify-between items-center mb-6"><h2 className="text-xl font-bold flex items-center gap-2"><LayoutGrid size={20} className="text-cyan-500"/> Financiamentos & Contas</h2><div className="flex bg-black p-1 rounded-xl border border-gray-800 overflow-x-auto w-full md:w-auto scrollbar-hide">{MONTHS.map((month) => (<button key={month} onClick={() => setActiveTab(month)} className={`px-6 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === month ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>{month}</button>))}</div></div>
            <div className="block md:hidden space-y-3">
                {[...installments, ...recurring.filter(r => r.type === 'expense')].map(item => {
                    const isInstallment = item.installments_count !== undefined;
                    const currentInst = isInstallment ? item.current_installment + MONTHS.indexOf(activeTab) : null;
                    if (isInstallment && (currentInst < 1 || currentInst > item.installments_count)) return null;
                    if (!isInstallment && (item.status === 'delayed' || item.skipped_months?.includes(activeTab))) return null;
                    if (!isInstallment) { const startMonthIndex = item.start_date ? parseInt(item.start_date.split('/')[1]) - 1 : 0; if (MONTHS.indexOf(activeTab) < startMonthIndex) return null; }
                    const isPaid = item.paid_months?.includes(activeTab);
                    const prefix = isInstallment ? 'mob-inst' : 'mob-rec';
                    return (
                        <div key={`${prefix}-${item.id}`} className={`p-4 rounded-xl border ${isPaid ? 'bg-emerald-950/20 border-emerald-900/30' : 'bg-gray-900 border-gray-800'}`}>
                            <div className="flex justify-between mb-2"><span className="font-bold text-white">{item.title}</span><span className="font-mono text-gray-300">R$ {(item.value || item.value_per_month).toFixed(2)}</span></div>
                            <div className="flex justify-between items-center text-xs text-gray-500 mb-4"><span>{isInstallment ? `Parcela ${currentInst}/${item.installments_count}` : 'Recorrente'}</span><span className={`px-2 py-0.5 rounded ${isInstallment ? 'bg-purple-500/10 text-purple-400' : 'bg-blue-500/10 text-blue-400'}`}>{isInstallment ? 'Parcelado' : 'Fixo'}</span></div>
                            <div className="flex justify-between items-center border-t border-gray-800 pt-3">
                                <button onClick={() => togglePaidMonth(isInstallment ? 'installments' : 'recurring', item)} className={`flex items-center gap-2 text-sm font-medium ${isPaid ? 'text-emerald-400' : 'text-gray-400'}`}>{isPaid ? <CheckSquare size={18}/> : <Square size={18}/>} {isPaid ? 'Pago' : 'Marcar'}</button>
                                <div className="flex gap-4"><button onClick={() => toggleDelay(isInstallment ? 'installments' : 'recurring', item)} className="text-orange-400"><Clock size={18}/></button><button onClick={() => handleEdit(item, isInstallment ? 'installment' : 'fixed_expense')} className="text-blue-400"><Pencil size={18}/></button><button onClick={() => handleDelete(isInstallment ? 'installments' : 'recurring', item.id)} className="text-red-400"><Trash2 size={18}/></button></div>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                    <thead><tr className="text-gray-500 text-xs uppercase tracking-wider border-b border-gray-800"><th className="pb-4 pl-2 font-medium">Descrição</th><th className="pb-4 font-medium">Tipo</th><th className="pb-4 font-medium">Status</th><th className="pb-4 pr-2 text-right font-medium">Valor</th><th className="pb-4 w-24 text-right">Pago?</th><th className="pb-4 w-24"></th></tr></thead>
                    <tbody className="text-sm">
                        {installments.map((inst) => {
                            if (inst.status === 'delayed') return null;
                            const currentInst = inst.current_installment + MONTHS.indexOf(activeTab);
                            if (currentInst < 1 || currentInst > inst.installments_count) return null;
                            const isPaid = inst.paid_months?.includes(activeTab);
                            return (
                                <tr key={`desk-inst-${inst.id}`} className={`border-b border-gray-800/50 group transition ${isPaid ? 'bg-emerald-950/10' : 'hover:bg-gray-800/30'}`}>
                                    <td className="py-4 pl-2 font-medium text-white">{inst.title}</td>
                                    <td className="py-4 text-gray-500"><span className="bg-purple-500/10 text-purple-400 px-2 py-1 rounded text-xs">Parcelado</span></td>
                                    <td className="py-4 text-gray-400"><span className="bg-gray-800 text-xs px-2 py-1 rounded text-gray-300 border border-gray-700">{currentInst}/{inst.installments_count}</span></td>
                                    <td className="py-4 pr-2 text-right font-mono text-gray-200">R$ {inst.value_per_month.toFixed(2)}</td>
                                    <td className="py-4 text-right"><button onClick={() => togglePaidMonth('installments', inst)} className={`transition ${isPaid ? 'text-emerald-400 hover:text-emerald-300' : 'text-gray-600 hover:text-white'}`}>{isPaid ? <CheckSquare size={20}/> : <Square size={20}/>}</button></td>
                                    <td className="py-4 text-right flex gap-3 justify-end"><button onClick={() => toggleDelay('installments', inst)} className="text-gray-600 hover:text-orange-500 opacity-0 group-hover:opacity-100 transition"><Clock size={16}/></button><button onClick={() => handleEdit(inst, 'installment')} className="text-gray-600 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition"><Pencil size={16}/></button><button onClick={() => handleDelete('installments', inst.id)} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16}/></button></td>
                                </tr>
                            );
                        })}
                        {recurring.filter(r => r.type === 'expense').map((rec) => {
                             if (rec.status === 'delayed' || rec.skipped_months?.includes(activeTab)) return null;
                             const startMonthIndex = rec.start_date ? parseInt(rec.start_date.split('/')[1]) - 1 : 0;
                             if (MONTHS.indexOf(activeTab) < startMonthIndex) return null;
                             const isPaid = rec.paid_months?.includes(activeTab);
                             return (
                                <tr key={`desk-rec-${rec.id}`} className={`border-b border-gray-800/50 group transition ${isPaid ? 'bg-emerald-950/10' : 'hover:bg-gray-800/30'}`}>
                                    <td className="py-4 pl-2 font-medium text-white">{rec.title}</td>
                                    <td className="py-4 text-gray-500"><span className="bg-blue-500/10 text-blue-400 px-2 py-1 rounded text-xs">Fixo</span></td>
                                    <td className="py-4 text-gray-400 text-xs">Mensal</td>
                                    <td className="py-4 pr-2 text-right font-mono text-gray-200">R$ {rec.value.toFixed(2)}</td>
                                    <td className="py-4 text-right"><button onClick={() => togglePaidMonth('recurring', rec)} className={`transition ${isPaid ? 'text-emerald-400 hover:text-emerald-300' : 'text-gray-600 hover:text-white'}`}>{isPaid ? <CheckSquare size={20}/> : <Square size={20}/>}</button></td>
                                    <td className="py-4 text-right flex gap-3 justify-end"><button onClick={() => toggleDelay('recurring', rec)} className="text-gray-600 hover:text-orange-500 opacity-0 group-hover:opacity-100 transition"><Clock size={16}/></button><button onClick={() => handleEdit(rec, 'fixed_expense')} className="text-gray-600 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition"><Pencil size={16}/></button><button onClick={() => handleDelete('recurring', rec.id)} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={16}/></button></td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
      </div>

      {isFormOpen && (<div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"><div className="bg-[#111] border border-gray-700 p-8 rounded-3xl w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto"><button onClick={() => setIsFormOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={24} /></button><h2 className="text-2xl font-bold mb-6 text-white">{editingId ? 'Editar' : 'Novo Lançamento'}</h2>
            <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 mb-6 flex items-center justify-between"><label className="text-gray-400 text-sm">Mês de Referência:</label><select value={formData.targetMonth} onChange={(e) => setFormData({...formData, targetMonth: e.target.value})} className="bg-black text-white p-2 rounded-lg border border-gray-700 outline-none">{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
            <div className="grid grid-cols-2 gap-2 mb-6"><button onClick={() => setFormMode('income')} className={`py-3 rounded-xl border text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${formMode === 'income' ? 'bg-emerald-500/20 border-emerald-500 text-emerald-500' : 'bg-gray-900 border-gray-800 text-gray-500'}`}><DollarSign size={20}/> Entrada</button><button onClick={() => setFormMode('expense')} className={`py-3 rounded-xl border text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${formMode === 'expense' ? 'bg-red-500/20 border-red-500 text-red-500' : 'bg-gray-900 border-gray-800 text-gray-500'}`}><TrendingDown size={20}/> Gasto</button><button onClick={() => setFormMode('installment')} className={`py-3 rounded-xl border text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${formMode === 'installment' ? 'bg-purple-500/20 border-purple-500 text-purple-500' : 'bg-gray-900 border-gray-800 text-gray-500'}`}><CreditCard size={20}/> Parcelado</button><button onClick={() => setFormMode('fixed_expense')} className={`py-3 rounded-xl border text-sm font-bold transition flex flex-col items-center justify-center gap-1 ${formMode === 'fixed_expense' ? 'bg-blue-500/20 border-blue-500 text-blue-500' : 'bg-gray-900 border-gray-800 text-gray-500'}`}><CheckCircle2 size={20}/> Fixo</button></div><div className="space-y-4">{formMode === 'income' && (<div className="flex items-center gap-3 bg-gray-900 p-3 rounded-lg"><input type="checkbox" id="fixo" checked={formData.isFixedIncome} onChange={(e) => setFormData({...formData, isFixedIncome: e.target.checked})} className="w-5 h-5 rounded accent-emerald-500"/><label htmlFor="fixo" className="text-gray-300 text-sm cursor-pointer select-none">Fixo mensal?</label></div>)}{formMode === 'installment' && (<div className="bg-purple-900/10 p-4 rounded-xl border border-purple-900/30 space-y-3 mb-4"><p className="text-purple-400 text-xs font-bold uppercase mb-2">Financiamento / Valor Personalizado</p><label className="text-gray-400 text-xs block">Valor Real da Parcela (com Juros):</label><input type="number" value={formData.fixedMonthlyValue} onChange={(e) => setFormData({...formData, fixedMonthlyValue: e.target.value})} className="w-full bg-black border border-gray-700 rounded-lg p-2 text-white focus:border-purple-500 outline-none" placeholder="Ex: 850.00"/></div>)}<input type="text" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none" placeholder="Descrição"/><input type="number" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none" placeholder={formMode === 'installment' ? "Valor TOTAL da Dívida" : "Valor (R$)"}/>{formMode === 'installment' && (<div className="flex gap-4"><input type="number" placeholder="Parcelas" value={formData.installments} onChange={(e) => setFormData({...formData, installments: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white outline-none"/><input type="number" placeholder="Dia Venc." value={formData.dueDay} onChange={(e) => setFormData({...formData, dueDay: e.target.value})} className="w-full bg-gray-800 border border-gray-700 rounded-xl p-3 text-white outline-none"/></div>)}<button onClick={handleSubmit} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-4 rounded-xl transition mt-4 shadow-lg shadow-cyan-900/20">{editingId ? 'Salvar Alterações' : 'Adicionar'}</button></div></div></div>)}
      
      {/* --- NOVO MODAL DE AUTENTICAÇÃO --- */}
      {isAuthModalOpen && (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4">
              <div className="bg-[#111] border border-gray-800 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative text-center">
                  <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition"><X size={24} /></button>
                  
                  {/* CABEÇALHO DO MODAL */}
                  <div className="flex justify-center mb-6">
                      <div className="bg-gray-900/50 p-3 rounded-2xl border border-gray-800">
                         {showEmailCheck ? <Mail className="text-cyan-400" size={32} /> : <Lock className="text-cyan-400" size={32} />}
                      </div>
                  </div>

                  {showEmailCheck ? (
                      // TELA DE SUCESSO DO E-MAIL
                      <div className="animate-in fade-in zoom-in duration-300">
                          <h2 className="text-2xl font-bold mb-2 text-white">Verifique seu e-mail</h2>
                          <p className="text-gray-400 text-sm mb-6">Enviamos um link de acesso para <b>{email}</b>. Clique nele para ativar sua conta.</p>
                          <div className="bg-cyan-900/20 text-cyan-400 text-xs p-3 rounded-xl border border-cyan-900/50 mb-6">
                              Dica: Verifique a caixa de Spam.
                          </div>
                          <button onClick={() => { setShowEmailCheck(false); setAuthMode('login'); }} className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">
                              Voltar para Login
                          </button>
                      </div>
                  ) : (
                      // FORMULÁRIO DE LOGIN/CADASTRO
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
                                  <div className="relative">
                                    <Mail className="absolute left-3 top-3.5 text-gray-600" size={16} />
                                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-10 pr-3 text-white focus:border-cyan-500 outline-none transition"/>
                                  </div>
                              </div>
                              <div>
                                  <label className="text-xs text-gray-500 ml-1 mb-1 block">Senha</label>
                                  <div className="relative">
                                    <Lock className="absolute left-3 top-3.5 text-gray-600" size={16} />
                                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-10 pr-3 text-white focus:border-cyan-500 outline-none transition"/>
                                  </div>
                              </div>
                          </div>

                          {authMessage && (
                              <div className={`mt-4 p-3 rounded-lg text-xs flex items-center gap-2 ${authMessage.includes('❌') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>
                                  {authMessage}
                              </div>
                          )}

                          <button onClick={handleAuth} disabled={loadingAuth} className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition mt-6 flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20">
                              {loadingAuth ? <Loader2 className="animate-spin" size={20}/> : (authMode === 'login' ? 'Acessar Conta' : 'Criar Conta')}
                          </button>
                          
                          {authMode === 'login' && (
                              <div className="mt-4 pt-4 border-t border-gray-800">
                                  <button 
                                    onClick={handleResetPassword}
                                    disabled={loadingAuth}
                                    className="text-xs text-gray-500 hover:text-cyan-400 transition underline decoration-gray-700 hover:decoration-cyan-400 underline-offset-4"
                                  >
                                    Esqueci minha senha
                                  </button>
                              </div>
                          )}
                      </div>
                  )}
              </div>
          </div>
      )}

      {isAIOpen && (<div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-4"><div className="bg-[#0f0f13] border border-gray-700 w-full max-w-2xl h-[600px] rounded-3xl shadow-2xl flex flex-col relative overflow-hidden"><div className="p-6 border-b border-gray-800 bg-[#111] flex justify-between items-center z-10"><div className="flex items-center gap-3"><div className="bg-purple-600/20 p-2 rounded-lg"><Sparkles className="text-purple-400" size={24} /></div><h2 className="text-xl font-bold text-white">Consultor IA</h2></div><button onClick={() => setIsAIOpen(false)} className="text-gray-500 hover:text-white"><X /></button></div><div className="flex-1 p-6 overflow-y-auto space-y-4">{aiResponse ? (typeof aiResponse === 'string' ? <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 text-gray-200 leading-relaxed whitespace-pre-line">{aiResponse}</div> : aiResponse) : <p className="text-center text-gray-600 mt-20 italic">"Como está minha saúde financeira?"</p>}{isLoading && <div className="text-purple-400 animate-pulse text-center">Pensando...</div>}</div>
      {/* BARRA DE COMANDOS RÁPIDOS */}
      <div className="px-6 py-2 flex gap-3 overflow-x-auto scrollbar-hide border-t border-gray-800 bg-[#111]">
          <button onClick={() => askGemini("Faça um diagnóstico de risco completo do meu mês atual. Me dê status (Verde/Amarelo/Vermelho) e alertas.")} className="whitespace-nowrap px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-xs font-bold text-cyan-400 border border-cyan-900/30 flex items-center gap-2 transition"><BarChart3 size={14}/> Diagnóstico</button>
          <button onClick={() => askGemini("Analise meus maiores gastos e contas fixas. Onde estou perdendo dinheiro? Tem algo supérfluo?")} className="whitespace-nowrap px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-xs font-bold text-purple-400 border border-purple-900/30 flex items-center gap-2 transition"><Search size={14}/> Detetive</button>
          <button onClick={() => askGemini("Meu saldo está negativo ou apertado. Me dê um plano de 3 passos práticos para sair dessa situação agora.")} className="whitespace-nowrap px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-full text-xs font-bold text-emerald-400 border border-emerald-900/30 flex items-center gap-2 transition"><Target size={14}/> Plano de Resgate</button>
      </div>
      <div className="p-4 bg-[#111] flex gap-2"><input type="text" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && askGemini()} placeholder="Pergunte ou lance um gasto..." className="flex-1 bg-gray-900 border border-gray-700 rounded-xl p-4 text-white outline-none"/><button onClick={() => askGemini()} className="bg-purple-600 hover:bg-purple-700 text-white p-4 rounded-xl"><Send size={24}/></button></div></div></div>)}
      {isRolloverModalOpen && (<div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-50 p-6"><div className="bg-[#111] border border-gray-700 p-8 rounded-3xl w-full max-w-lg shadow-2xl relative"><h2 className="text-2xl font-bold mb-2 text-white flex items-center gap-2"><AlertCircle className="text-orange-500"/> Contas em Aberto</h2><p className="text-gray-400 text-sm mb-6">Existem contas de meses passados que você não marcou como pagas.</p><div className="max-h-[300px] overflow-y-auto space-y-2 mb-6 pr-2">{pastDueItems.map((item, idx) => (<div key={idx} className="flex justify-between items-center p-3 bg-gray-900 rounded-lg border border-gray-800"><div><p className="text-white font-medium text-sm">{item.title}</p><p className="text-xs text-gray-500">{item.month}</p></div><div className="flex items-center gap-3"><span className="text-red-400 font-mono">R$ {item.amount || item.value || item.value_per_month}</span><button onClick={() => toggleDelay(item.origin, item)} className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded border border-orange-500/50 hover:bg-orange-500 hover:text-white transition">Mover p/ Stand-by</button></div></div>))}</div><div className="flex justify-end gap-3"><button onClick={() => setIsRolloverModalOpen(false)} className="bg-white text-black px-6 py-2 rounded-full font-bold hover:bg-gray-200 transition">OK</button></div></div></div>)}
    </div>
  );
}