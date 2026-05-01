"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, Rocket, Users, Settings, Save, ShieldCheck, Tag, Ticket, Megaphone, Video, FileText, History, Trash2, PlusCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const PlanConfigCard = ({ title, prefix, dbPrefix, settings, onChange }: any) => {
  const stripeNormalKey = prefix === 'pro' ? 'stripe_price_pro' : `stripe_${dbPrefix}_normal`;
  const couponKey = `coupon_${prefix}`;

  return (
    <div className="bg-gray-50 dark:bg-[#151515] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4">
      <h3 className="font-bold text-lg border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">{title}</h3>
      <div>
        <label className="text-xs font-bold text-gray-500 uppercase">Descrição (Texto de Venda)</label>
        <textarea
          className="w-full mt-1 p-3 border rounded-lg bg-white dark:bg-[#1a1a1a] text-sm focus:border-cyan-500 outline-none"
          rows={2}
          value={settings[`desc_${prefix}`] || ''}
          onChange={(e) => onChange(`desc_${prefix}`, e.target.value)}
        />
      </div>
      <div className="grid grid-cols-2 gap-4 pt-2">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">Stripe ID (Preço)</label>
          <input type="text" className="w-full mt-1 p-2 border rounded-lg bg-white dark:bg-[#1a1a1a] text-xs font-mono outline-none" value={settings[stripeNormalKey] || ''} onChange={(e) => onChange(stripeNormalKey, e.target.value)} />
        </div>
        <div>
          <label className="text-xs font-bold text-emerald-600 uppercase">Cupom Stripe (Opcional)</label>
          <input type="text" placeholder="Ex: PROMO_PRO" className="w-full mt-1 p-2 border-2 border-emerald-100 dark:border-emerald-900/30 rounded-lg bg-white dark:bg-[#1a1a1a] text-xs font-mono outline-none" value={settings[couponKey] || ''} onChange={(e) => onChange(couponKey, e.target.value)} />
        </div>
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);

  // 🟢 STATES DO CHANGELOG
  const [changelogs, setChangelogs] = useState<any[]>([]);
  const [newChangelog, setNewChangelog] = useState({ version: '', title: '', content: '', video_url: '' });
  const [savingChangelog, setSavingChangelog] = useState(false);

  useEffect(() => {
    checkAdminAndFetchData();
  }, []);

  async function checkAdminAndFetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) { window.location.href = "/"; return; }

    const { data: profile } = await supabase.from("profiles").select("plan_tier").eq("id", user.id).single();

    if (profile?.plan_tier !== "admin") { window.location.href = "/"; return; }

    setIsAdmin(true);
    fetchSettings();
    fetchUsers();
    fetchChangelogs(); // 🟢 Busca o histórico
    setLoading(false);
  }

  async function fetchSettings() {
    const { data } = await supabase.from("app_settings").select("*").single();
    if (data) setSettings(data);
  }

  async function fetchUsers() {
    const { data } = await supabase.from("profiles").select("id, email, plan_tier, created_at").order("created_at", { ascending: false });
    if (data) setUsers(data);
  }

  // 🟢 FUNÇÃO PARA BUSCAR O HISTÓRICO DE NOTAS
  async function fetchChangelogs() {
    const { data } = await supabase.from('changelogs').select('*').order('created_at', { ascending: false });
    if (data) setChangelogs(data);
  }

  // 🟢 FUNÇÃO PARA LANÇAR UMA NOVA NOTA
  async function handleCreateChangelog(e: React.FormEvent) {
    e.preventDefault();
    if (!newChangelog.version || !newChangelog.title || !newChangelog.content) return toast.error("Preencha Versão, Título e Texto!");
    
    setSavingChangelog(true);
    const { error } = await supabase.from('changelogs').insert([{
        version: newChangelog.version,
        title: newChangelog.title,
        content: newChangelog.content,
        video_url: newChangelog.video_url || null
    }]);

    if (error) {
        toast.error("Erro ao lançar novidade!");
        console.error(error);
    } else {
        toast.success("Atualização lançada com sucesso! 🚀");
        setNewChangelog({ version: '', title: '', content: '', video_url: '' });
        fetchChangelogs(); // Atualiza a lista
    }
    setSavingChangelog(false);
  }

  // 🟢 FUNÇÃO PARA APAGAR UMA NOTA DO HISTÓRICO
  async function handleDeleteChangelog(id: string) {
    if (!confirm("Tem certeza que deseja apagar esta nota de atualização?")) return;
    const { error } = await supabase.from('changelogs').delete().eq('id', id);
    if (error) toast.error("Erro ao apagar nota.");
    else {
        toast.success("Nota apagada do histórico.");
        fetchChangelogs();
    }
  }

  const handleSettingChange = (key: string, value: any) => { setSettings((prev: any) => ({ ...prev, [key]: value })); };

  async function saveSettings() {
    const toastId = toast.loading("Salvando configurações do sistema...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/save-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify(settings)
      });
      if (!res.ok) throw new Error("Falha ao salvar no backend.");
      toast.success("Configurações guardadas com sucesso!", { id: toastId });
    } catch (error: any) { toast.error("Erro ao guardar as configurações.", { id: toastId }); }
  }

  async function updateUserPlan(userId: string, newPlan: string) {
    const toastId = toast.loading(`Alterando plano para ${newPlan.toUpperCase()}...`);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ targetUserId: userId, newPlan: newPlan })
      });
      if (!res.ok) throw new Error("Acesso negado.");
      toast.success(`Plano alterado para ${newPlan.toUpperCase()} com sucesso!`, { id: toastId });
      fetchUsers();
    } catch (error: any) { toast.error("Erro ao mudar o plano.", { id: toastId }); }
  }

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
      <ShieldCheck className="w-16 h-16 text-cyan-500 animate-pulse mb-4" />
      <div className="text-xl font-medium text-gray-500 dark:text-gray-400">Verificando credenciais do CEO...</div>
    </div>
  );

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 pb-20">
      {/* HEADER FIXO */}
      <div className="bg-white dark:bg-[#111111] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => window.location.href = '/'} className="p-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl transition-all">
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">Painel do CEO</h1>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">Controle Absoluto</p>
            </div>
          </div>
          <button onClick={saveSettings} className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg active:scale-95">
            <Save size={18} /> <span className="hidden sm:inline">Guardar Preços</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-10">

        {/* MOTOR DE PREÇOS */}
        <section className="bg-white dark:bg-[#111111] p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 relative">
          <div className="flex items-center gap-3 mb-8 border-b border-gray-200 dark:border-gray-800 pb-6">
            <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-500"><Settings size={24} /></div>
            <div>
              <h2 className="text-2xl font-bold">Motor de Lançamento e Preços</h2>
              <p className="text-sm text-gray-500">Controle a promoção global via Cupom</p>
            </div>
          </div>

          {settings && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-cyan-50 dark:bg-cyan-950/20 p-6 rounded-2xl border border-cyan-100 dark:border-cyan-900/30">
                <div>
                  <label className="text-sm font-bold uppercase tracking-wide flex items-center gap-2 mb-2"><Rocket size={16} className="text-cyan-500" /> Promoção</label>
                  <select className={`w-full p-4 border-2 rounded-xl bg-white dark:bg-[#1a1a1a] font-bold outline-none ${settings.is_promo_active ? 'border-emerald-500 text-emerald-500' : 'border-gray-700'}`} value={settings.is_promo_active ? "true" : "false"} onChange={(e) => handleSettingChange("is_promo_active", e.target.value === "true")}>
                    <option value="false">🔴 DESLIGADA</option>
                    <option value="true">🟢 ATIVADA</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-bold uppercase tracking-wide flex items-center gap-2 mb-2"><Ticket size={16} className="text-cyan-500" /> ID Cupom Stripe</label>
                  <input type="text" className="w-full p-4 border border-gray-700 rounded-xl bg-[#1a1a1a] outline-none focus:border-cyan-500" value={settings.stripe_coupon_id || ''} onChange={(e) => handleSettingChange("stripe_coupon_id", e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-bold uppercase tracking-wide flex items-center gap-2 mb-2"><Tag size={16} className="text-cyan-500" /> Frase no Site</label>
                  <input type="text" className="w-full p-4 border border-gray-700 rounded-xl bg-[#1a1a1a] outline-none focus:border-cyan-500" value={settings.promo_text || ''} onChange={(e) => handleSettingChange("promo_text", e.target.value)} />
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PlanConfigCard title="🚀 Plano Start" prefix="start" dbPrefix="start" settings={settings} onChange={handleSettingChange} />
                <PlanConfigCard title="💎 Plano Premium" prefix="premium" dbPrefix="premium" settings={settings} onChange={handleSettingChange} />
                <PlanConfigCard title="⭐ Plano Pro" prefix="pro" dbPrefix="price" settings={settings} onChange={handleSettingChange} />
                <PlanConfigCard title="💼 Plano Agent" prefix="agent" dbPrefix="agent" settings={settings} onChange={handleSettingChange} />
              </div>
            </div>
          )}
        </section>

        {/* 🟢 CENTRAL DE NOTAS DE ATUALIZAÇÃO (CHANGELOG) */}
        <section className="bg-white dark:bg-[#111111] rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-6 md:items-center justify-between bg-fuchsia-950/10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-fuchsia-500/20 border border-fuchsia-500/30 rounded-xl text-fuchsia-400"><Megaphone size={24} /></div>
              <div>
                <h2 className="text-2xl font-bold text-fuchsia-400">Lançamento de Atualizações</h2>
                <p className="text-sm text-gray-500">Crie notas. A última lançada aparecerá para os usuários automaticamente.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2">
            {/* LADO ESQUERDO: FORMULÁRIO */}
            <div className="p-8 border-r border-gray-800">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><PlusCircle size={20} className="text-fuchsia-500"/> Nova Atualização</h3>
                <form onSubmit={handleCreateChangelog} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1 block">Versão</label>
                            <input type="text" placeholder="Ex: v2.1" required className="w-full p-3 border border-gray-700 rounded-xl bg-black outline-none focus:border-fuchsia-500 font-mono" value={newChangelog.version} onChange={(e) => setNewChangelog({...newChangelog, version: e.target.value})} />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1 block">Link de Vídeo</label>
                            <input type="text" placeholder="URL do YouTube" className="w-full p-3 border border-gray-700 rounded-xl bg-black outline-none focus:border-fuchsia-500" value={newChangelog.video_url} onChange={(e) => setNewChangelog({...newChangelog, video_url: e.target.value})} />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1 block">Título Chamativo</label>
                        <input type="text" placeholder="Ex: Cérebro da IA Liberado! 🧠" required className="w-full p-3 border border-gray-700 rounded-xl bg-black outline-none focus:border-fuchsia-500" value={newChangelog.title} onChange={(e) => setNewChangelog({...newChangelog, title: e.target.value})} />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1 block">Texto da Atualização</label>
                        <textarea rows={5} placeholder="Descreva as novidades..." required className="w-full p-3 border border-gray-700 rounded-xl bg-black outline-none focus:border-fuchsia-500 resize-none" value={newChangelog.content} onChange={(e) => setNewChangelog({...newChangelog, content: e.target.value})} />
                    </div>
                    <button type="submit" disabled={savingChangelog} className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-3.5 rounded-xl transition shadow-lg flex items-center justify-center gap-2">
                        {savingChangelog ? <Loader2 className="animate-spin" size={18}/> : <Rocket size={18}/>} Disparar Atualização para os Clientes
                    </button>
                </form>
            </div>

            {/* LADO DIREITO: HISTÓRICO */}
            <div className="bg-[#0a0a0a] p-8">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-gray-300"><History size={20}/> Histórico de Lançamentos</h3>
                
                {changelogs.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-gray-800 rounded-2xl">
                        <p className="text-gray-500 text-sm">Nenhuma atualização registrada.</p>
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 pr-2">
                        {changelogs.map((log, idx) => (
                            <div key={log.id} className={`p-4 rounded-2xl border ${idx === 0 ? 'bg-fuchsia-950/20 border-fuchsia-500/30' : 'bg-[#111] border-gray-800'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-gray-800 text-white text-xs font-mono px-2 py-0.5 rounded">{log.version}</span>
                                        {idx === 0 && <span className="text-[9px] uppercase tracking-widest text-fuchsia-400 font-bold bg-fuchsia-500/10 px-2 py-0.5 rounded-full">Atual</span>}
                                    </div>
                                    <button onClick={() => handleDeleteChangelog(log.id)} className="text-gray-600 hover:text-red-500 transition" title="Apagar Nota">
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                                <h4 className="font-bold text-white mb-1">{log.title}</h4>
                                <p className="text-xs text-gray-500 line-clamp-2">{log.content}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
          </div>
        </section>

        {/* BASE DE CLIENTES */}
        <section className="bg-white dark:bg-[#111111] rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500"><Users size={24} /></div>
              <div>
                <h2 className="text-2xl font-bold">Base de Clientes</h2>
                <p className="text-sm text-gray-500">Acesso livre para alterar assinaturas manualmente</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#151515] text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wider">
                  <th className="p-5 font-bold">E-mail do Cliente</th>
                  <th className="p-5 font-bold">Plano Atual</th>
                  <th className="p-5 font-bold text-right">Ação Rápida</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-[#1a1a1a]/50">
                    <td className="p-5 font-medium">{u.email}</td>
                    <td className="p-5">
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase ${u.plan_tier === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                        {u.plan_tier || 'free'}
                      </span>
                    </td>
                    <td className="p-5 text-right">
                      <select
                        className="text-sm p-2.5 border border-gray-200 rounded-lg outline-none cursor-pointer bg-white dark:bg-[#1a1a1a]"
                        value={u.plan_tier || 'free'}
                        onChange={(e) => updateUserPlan(u.id, e.target.value)}
                      >
                        <option value="free">Mudar para Free</option>
                        <option value="start">🚀 Upgrade para Start</option>
                        <option value="premium">💎 Upgrade para Premium</option>
                        <option value="pro">⭐ Upgrade para Pro</option>
                        <option value="agent">💼 Mudar para Agent</option>
                        <option value="admin">👑 Promover a Admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </div>
    </div>
  );
}