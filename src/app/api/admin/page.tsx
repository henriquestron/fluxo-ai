"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, Rocket, Users, Settings, Save, ShieldCheck, Tag } from "lucide-react";

// Inicializa o Supabase no lado do cliente
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  // Estados para as configurações (O Controlo Remoto)
  const [settings, setSettings] = useState<any>(null);

  // Estados para os utilizadores
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    checkAdminAndFetchData();
  }, []);

  async function checkAdminAndFetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/";
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("plan_tier")
      .eq("id", user.id)
      .single();

    if (profile?.plan_tier !== "admin") {
      window.location.href = "/";
      return;
    }

    setIsAdmin(true);
    fetchSettings();
    fetchUsers();
    setLoading(false);
  }

  async function fetchSettings() {
    const { data } = await supabase.from("app_settings").select("*").single();
    if (data) setSettings(data);
  }

  async function fetchUsers() {
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (data) setUsers(data);
  }

  async function saveSettings() {
    try {
      const res = await fetch('/api/admin/save-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });

      if (!res.ok) throw new Error("Falha ao salvar");

      alert("✅ Configurações de Lançamento guardadas com sucesso!");
    } catch (error) {
      alert("❌ Erro ao guardar as configurações! Verifique o console.");
    }
  }
  async function updateUserPlan(userId: string, newPlan: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      const res = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserId: userId,
          newPlan: newPlan,
          adminId: user.id
        })
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || 'Erro desconhecido');
      }

      alert(`✅ Plano alterado para ${newPlan.toUpperCase()} com sucesso!`);
      fetchUsers();

    } catch (error: any) {
      alert("❌ Erro ao mudar o plano: " + error.message);
    }
  }

  // Componente Auxiliar para renderizar os campos de cada plano
  const PlanConfigCard = ({ title, prefix, dbPrefix }: { title: string, prefix: string, dbPrefix: string }) => {
    // Tratamento especial para o PRO porque usámos nomes diferentes nas colunas originais
    const stripeNormalKey = prefix === 'pro' ? 'stripe_price_pro' : `stripe_${dbPrefix}_normal`;
    const stripePromoKey = prefix === 'pro' ? 'stripe_price_promo' : `stripe_${dbPrefix}_promo`;

    return (
      <div className="bg-gray-50 dark:bg-[#151515] p-6 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-4">
        <h3 className="font-bold text-lg border-b border-gray-200 dark:border-gray-700 pb-2 mb-4">{title}</h3>

        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">Descrição (Texto de Venda)</label>
          <textarea
            className="w-full mt-1 p-3 border rounded-lg bg-white dark:bg-[#1a1a1a] text-sm focus:border-cyan-500 outline-none"
            rows={2}
            value={settings[`desc_${prefix}`] || ''}
            onChange={(e) => setSettings({ ...settings, [`desc_${prefix}`]: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Preço Normal (Ecrã)</label>
            <input
              type="text"
              className="w-full mt-1 p-2 border rounded-lg bg-white dark:bg-[#1a1a1a] text-sm focus:border-cyan-500 outline-none"
              value={settings[`price_${prefix}_normal`] || ''}
              onChange={(e) => setSettings({ ...settings, [`price_${prefix}_normal`]: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-cyan-600 uppercase">Preço Promo (Ecrã)</label>
            <input
              type="text"
              className="w-full mt-1 p-2 border-2 border-cyan-200 dark:border-cyan-900/50 rounded-lg bg-white dark:bg-[#1a1a1a] text-sm focus:border-cyan-500 outline-none"
              value={settings[`price_${prefix}_promo`] || ''}
              onChange={(e) => setSettings({ ...settings, [`price_${prefix}_promo`]: e.target.value })}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Stripe ID (Normal)</label>
            <input
              type="text"
              className="w-full mt-1 p-2 border rounded-lg bg-white dark:bg-[#1a1a1a] text-xs font-mono focus:border-cyan-500 outline-none"
              value={settings[stripeNormalKey] || ''}
              onChange={(e) => setSettings({ ...settings, [stripeNormalKey]: e.target.value })}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-cyan-600 uppercase">Stripe ID (Promo)</label>
            <input
              type="text"
              className="w-full mt-1 p-2 border-2 border-cyan-200 dark:border-cyan-900/50 rounded-lg bg-white dark:bg-[#1a1a1a] text-xs font-mono focus:border-cyan-500 outline-none"
              value={settings[stripePromoKey] || ''}
              onChange={(e) => setSettings({ ...settings, [stripePromoKey]: e.target.value })}
            />
          </div>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]">
      <ShieldCheck className="w-16 h-16 text-cyan-500 animate-pulse mb-4" />
      <div className="text-xl font-medium text-gray-500 dark:text-gray-400">A verificar credenciais do CEO...</div>
    </div>
  );

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-gray-100 pb-20">

      {/* HEADER DO PAINEL */}
      <div className="bg-white dark:bg-[#111111] border-b border-gray-200 dark:border-gray-800 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.location.href = '/'}
              className="p-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl transition-all"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-500 to-blue-500 bg-clip-text text-transparent">Painel do CEO</h1>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-widest">Controlo Absoluto</p>
            </div>
          </div>

          <button
            onClick={saveSettings}
            className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-lg hover:shadow-cyan-500/50 active:scale-95"
          >
            <Save size={18} />
            <span className="hidden sm:inline">Guardar Modificações</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 space-y-10">

        {/* BLOCO 1: GESTÃO DE PROMOÇÕES E PLANOS */}
        <section className="bg-white dark:bg-[#111111] p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 relative">
          <div className="flex items-center gap-3 mb-8 border-b border-gray-200 dark:border-gray-800 pb-6">
            <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-500"><Settings size={24} /></div>
            <div>
              <h2 className="text-2xl font-bold">Motor de Lançamento e Preços</h2>
              <p className="text-sm text-gray-500">Gere as promoções e os dados do Stripe de todos os planos</p>
            </div>
          </div>

          {settings && (
            <div className="space-y-8">
              {/* CHAVE MESTRA DA PROMOÇÃO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-cyan-50 dark:bg-cyan-950/20 p-6 rounded-2xl border border-cyan-100 dark:border-cyan-900/30">
                <div>
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2 mb-2">
                    <Rocket size={16} className="text-cyan-500" /> Status Global da Promoção
                  </label>
                  <select
                    className={`w-full p-4 border-2 rounded-xl bg-white dark:bg-[#1a1a1a] font-bold transition-all outline-none ${settings.is_promo_active ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400' : 'border-gray-200 dark:border-gray-700'}`}
                    value={settings.is_promo_active ? "true" : "false"}
                    onChange={(e) => setSettings({ ...settings, is_promo_active: e.target.value === "true" })}
                  >
                    <option value="false">🔴 DESLIGADA (Site mostra preços normais)</option>
                    <option value="true">🟢 ATIVADA (Site risca preço antigo e mostra desconto)</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide flex items-center gap-2 mb-2">
                    <Tag size={16} className="text-cyan-500" /> Frase de Destaque no Site
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Oferta de Black Friday!"
                    className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-[#1a1a1a] outline-none focus:border-cyan-500 font-medium"
                    value={settings.promo_text || ''}
                    onChange={(e) => setSettings({ ...settings, promo_text: e.target.value })}
                  />
                </div>
              </div>

              {/* GRELHA DOS 4 PLANOS */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <PlanConfigCard title="🚀 Plano Start" prefix="start" dbPrefix="start" />
                <PlanConfigCard title="💎 Plano Premium" prefix="premium" dbPrefix="premium" />
                <PlanConfigCard title="⭐ Plano Pro" prefix="pro" dbPrefix="price" />
                <PlanConfigCard title="💼 Plano Agent" prefix="agent" dbPrefix="agent" />
              </div>
            </div>
          )}
        </section>

        {/* BLOCO 2: GESTÃO DE CLIENTES */}
        <section className="bg-white dark:bg-[#111111] rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-purple-500/10 rounded-xl text-purple-500"><Users size={24} /></div>
              <div>
                <h2 className="text-2xl font-bold">Base de Clientes</h2>
                <p className="text-sm text-gray-500">Acesso livre para alterar assinaturas manualmente</p>
              </div>
            </div>
            <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 rounded-lg font-bold text-gray-600 dark:text-gray-300">
              {users.length} Registos
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#151515] text-gray-500 dark:text-gray-400 text-sm uppercase tracking-wider">
                  <th className="p-5 font-bold">E-mail do Cliente</th>
                  <th className="p-5 font-bold">Data de Registo</th>
                  <th className="p-5 font-bold">Plano Atual</th>
                  <th className="p-5 font-bold text-right">Controlo de Acesso</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 dark:hover:bg-[#1a1a1a]/50 transition-colors">
                    <td className="p-5 font-medium">{u.email}</td>
                    <td className="p-5 text-gray-500 dark:text-gray-400">
                      {new Date(u.created_at).toLocaleDateString("pt-PT", { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="p-5">
                      <span className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wide ${u.plan_tier === 'admin' ? 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400' :
                          u.plan_tier === 'pro' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400' :
                            u.plan_tier === 'premium' ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' :
                              u.plan_tier === 'start' ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-400' :
                                u.plan_tier === 'agent' ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400' :
                                  'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                        {u.plan_tier || 'free'}
                      </span>
                    </td>
                    <td className="p-5 text-right">
                      <select
                        className="text-sm p-2.5 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-[#1a1a1a] cursor-pointer focus:ring-2 focus:ring-cyan-500/50 outline-none font-medium"
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