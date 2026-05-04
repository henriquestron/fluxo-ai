"use client";

import { useEffect, useState, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, Rocket, Users, Settings, Save, ShieldCheck, Tag, Ticket, Megaphone, Video, FileText, History, Trash2, PlusCircle, Loader2, ImagePlus, X, Lightbulb, Bold, Italic, List, ListOrdered, Link as LinkIcon } from "lucide-react";
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

  // 🟢 STATES DA CENTRAL DE COMUNICAÇÃO (Com o novo campo "type")
  const [changelogs, setChangelogs] = useState<any[]>([]);
  const [newChangelog, setNewChangelog] = useState({ type: 'Atualização', version: '', title: '', content: '', video_url: '', image_url: '' });
  const [savingChangelog, setSavingChangelog] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false); 
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    checkAdminAndFetchData();
  }, []);

  const insertFormatting = (prefix: string, suffix: string = '') => {
      if (!textareaRef.current) return;
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const text = newChangelog.content;
      const selectedText = text.substring(start, end);
      
      // Monta o texto novo com as tags (ex: **palavra**)
      const newText = text.substring(0, start) + prefix + selectedText + suffix + text.substring(end);
      
      setNewChangelog({ ...newChangelog, content: newText });
      
      // Devolve o cursor pro lugar certo logo após atualizar o state
      setTimeout(() => {
          textarea.focus();
          textarea.setSelectionRange(start + prefix.length, end + prefix.length);
      }, 0);
  };

  async function checkAdminAndFetchData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) { window.location.href = "/"; return; }

    const { data: profile } = await supabase.from("profiles").select("plan_tier").eq("id", user.id).single();

    if (profile?.plan_tier !== "admin") { window.location.href = "/"; return; }

    setIsAdmin(true);
    fetchSettings();
    fetchUsers();
    fetchChangelogs();
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

  async function fetchChangelogs() {
    const { data } = await supabase.from('changelogs').select('*').order('created_at', { ascending: false });
    if (data) setChangelogs(data);
  }

  const handleImageUpload = async (e: any) => {
    try {
      setUploadingImage(true);
      const file = e.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `changelog_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage.from('changelogs').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('changelogs').getPublicUrl(filePath);
      
      setNewChangelog(prev => ({ ...prev, image_url: data.publicUrl }));
      toast.success("Imagem anexada com sucesso!");

    } catch (error: any) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao enviar a imagem. Tente novamente.");
    } finally {
      setUploadingImage(false);
    }
  };

  async function handleCreateChangelog(e: React.FormEvent) {
    e.preventDefault();
    if (!newChangelog.version || !newChangelog.title || !newChangelog.content) return toast.error("Preencha Versão, Título e Texto!");
    
    setSavingChangelog(true);

    // 🟢 MÁGICA: Adiciona o prefixo no título para que o Front-End reconheça o tipo de aviso!
    const finalTitle = newChangelog.type === 'Atualização' 
        ? newChangelog.title 
        : `${newChangelog.type}: ${newChangelog.title}`;

    const { error } = await supabase.from('changelogs').insert([{
        version: newChangelog.version,
        title: finalTitle,
        content: newChangelog.content,
        video_url: newChangelog.video_url || null,
        image_url: newChangelog.image_url || null 
    }]);

    if (error) {
        toast.error("Erro ao lançar mensagem!");
        console.error(error);
    } else {
        toast.success("Mensagem disparada com sucesso! 🚀");
        setNewChangelog({ type: 'Atualização', version: '', title: '', content: '', video_url: '', image_url: '' });
        fetchChangelogs();
    }
    setSavingChangelog(false);
  }

  async function handleDeleteChangelog(id: string) {
    if (!confirm("Tem certeza que deseja apagar esta nota?")) return;
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

        {/* 🟢 CENTRAL DE NOTAS E AVISOS */}
        <section className="bg-white dark:bg-[#111111] rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="p-8 border-b border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-6 md:items-center justify-between bg-fuchsia-950/10">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-fuchsia-500/20 border border-fuchsia-500/30 rounded-xl text-fuchsia-400"><Megaphone size={24} /></div>
              <div>
                <h2 className="text-2xl font-bold text-fuchsia-400">Central de Comunicação</h2>
                <p className="text-sm text-gray-500">Envie atualizações, dicas e mensagens motivacionais para a base.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2">
            {/* LADO ESQUERDO: FORMULÁRIO */}
            <div className="p-8 border-r border-gray-800">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2"><PlusCircle size={20} className="text-fuchsia-500"/> Disparar Mensagem</h3>
                <form onSubmit={handleCreateChangelog} className="space-y-5">
                    
                    {/* 🟢 SELETOR DE TIPO */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="col-span-1">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1 block flex items-center gap-1">Tipo <Lightbulb size={12}/></label>
                            <select 
                                className="w-full p-3 border border-gray-700 rounded-xl bg-black outline-none focus:border-fuchsia-500"
                                value={newChangelog.type}
                                onChange={(e) => setNewChangelog({...newChangelog, type: e.target.value})}
                            >
                                <option value="Atualização">Atualização (Cinza)</option>
                                <option value="Novidade">Novidade (Azul)</option>
                                <option value="Dica">Dica (Amarelo)</option>
                                <option value="Importante">Importante (Roxo)</option>
                            </select>
                        </div>
                        <div className="col-span-2">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1 block">Título</label>
                            <input type="text" placeholder="Ex: Cérebro da IA Liberado! 🧠" required className="w-full p-3 border border-gray-700 rounded-xl bg-black outline-none focus:border-fuchsia-500" value={newChangelog.title} onChange={(e) => setNewChangelog({...newChangelog, title: e.target.value})} />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1 block">Versão / Tag (Para o Canto Superior)</label>
                        <input type="text" placeholder="Ex: v2.1 ou DICA #1" required className="w-full p-3 border border-gray-700 rounded-xl bg-black outline-none focus:border-fuchsia-500 font-mono" value={newChangelog.version} onChange={(e) => setNewChangelog({...newChangelog, version: e.target.value})} />
                    </div>
                    
                    {/* 🟢 MÍDIA DA ATUALIZAÇÃO (FOTO OU VÍDEO) */}
                    <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800 space-y-4">
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Mídia de Apoio (Opcional)</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><Video size={14}/> Link do YouTube</label>
                                <input type="text" placeholder="https://youtu.be/..." className="w-full p-2.5 border border-gray-700 rounded-lg bg-black text-sm outline-none focus:border-fuchsia-500" value={newChangelog.video_url} onChange={(e) => setNewChangelog({...newChangelog, video_url: e.target.value})} />
                            </div>
                            
                            <div>
                                <label className="text-xs text-gray-500 mb-1 flex items-center gap-1"><ImagePlus size={14}/> Imagem / Print Screen</label>
                                {newChangelog.image_url ? (
                                    <div className="relative w-full h-10 bg-black rounded-lg border border-fuchsia-500/50 flex items-center justify-between px-3 overflow-hidden">
                                        <span className="text-xs text-fuchsia-400 truncate">Imagem Anexada</span>
                                        <button type="button" onClick={() => setNewChangelog({...newChangelog, image_url: ''})} className="text-gray-400 hover:text-red-400 bg-black/50 p-1 rounded-md z-10"><X size={14}/></button>
                                        <img src={newChangelog.image_url} alt="Preview" className="absolute inset-0 opacity-20 object-cover w-full h-full pointer-events-none" />
                                    </div>
                                ) : (
                                    <label className={`w-full h-10 border border-gray-700 border-dashed rounded-lg bg-black text-sm outline-none hover:border-fuchsia-500 hover:text-fuchsia-400 transition cursor-pointer flex items-center justify-center gap-2 text-gray-400 ${uploadingImage ? 'opacity-50 pointer-events-none' : ''}`}>
                                        {uploadingImage ? <Loader2 className="animate-spin" size={16}/> : <ImagePlus size={16}/>}
                                        {uploadingImage ? "Enviando..." : "Anexar Imagem"}
                                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-1 block">Texto Detalhado</label>
                        
                        <div className="border border-gray-700 rounded-xl overflow-hidden bg-black focus-within:border-fuchsia-500 transition-colors shadow-inner">
                            {/* 🟢 BARRA DE FERRAMENTAS (TOOLBAR) */}
                            <div className="flex items-center gap-1 bg-gray-900/50 p-2 border-b border-gray-700/50">
                                <button type="button" onClick={() => insertFormatting('**', '**')} className="p-1.5 hover:bg-gray-700 rounded-md text-gray-400 hover:text-white transition-colors" title="Negrito">
                                    <Bold size={16} />
                                </button>
                                <button type="button" onClick={() => insertFormatting('*', '*')} className="p-1.5 hover:bg-gray-700 rounded-md text-gray-400 hover:text-white transition-colors" title="Itálico">
                                    <Italic size={16} />
                                </button>
                                <div className="w-px h-4 bg-gray-700 mx-2"></div>
                                <button type="button" onClick={() => insertFormatting('\n- ')} className="p-1.5 hover:bg-gray-700 rounded-md text-gray-400 hover:text-white transition-colors" title="Lista de Pontos">
                                    <List size={16} />
                                </button>
                                <button type="button" onClick={() => insertFormatting('\n1. ')} className="p-1.5 hover:bg-gray-700 rounded-md text-gray-400 hover:text-white transition-colors" title="Lista Numerada">
                                    <ListOrdered size={16} />
                                </button>
                                <div className="w-px h-4 bg-gray-700 mx-2"></div>
                                <button type="button" onClick={() => insertFormatting('[', '](https://seulink.com)')} className="p-1.5 hover:bg-gray-700 rounded-md text-gray-400 hover:text-white transition-colors" title="Adicionar Link">
                                    <LinkIcon size={16} />
                                </button>
                            </div>

                            {/* CAIXA DE TEXTO */}
                            <textarea 
                                ref={textareaRef}
                                rows={12} 
                                placeholder="Descreva as novidades ou a dica motivacional. Selecione uma palavra e use os botões acima para formatar..." 
                                required 
                                className="w-full p-4 bg-transparent outline-none resize-y min-h-[200px] text-gray-200" 
                                value={newChangelog.content} 
                                onChange={(e) => setNewChangelog({...newChangelog, content: e.target.value})} 
                            />
                        </div>
                    </div>

                    <button type="submit" disabled={savingChangelog} className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-4 rounded-xl transition shadow-lg flex items-center justify-center gap-2 text-lg">
                        {savingChangelog ? <Loader2 className="animate-spin" size={20}/> : <Rocket size={20}/>} Disparar para os Clientes
                    </button>
                </form>
            </div>

            {/* LADO DIREITO: HISTÓRICO */}
            <div className="bg-[#0a0a0a] p-8">
                <h3 className="font-bold text-lg mb-6 flex items-center gap-2 text-gray-300"><History size={20}/> Histórico de Lançamentos</h3>
                
                {changelogs.length === 0 ? (
                    <div className="text-center py-10 border border-dashed border-gray-800 rounded-2xl">
                        <p className="text-gray-500 text-sm">Nenhuma mensagem registrada.</p>
                    </div>
                ) : (
                    <div className="space-y-4 max-h-[800px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 pr-2">
                        {changelogs.map((log, idx) => (
                            <div key={log.id} className={`p-5 rounded-2xl border ${idx === 0 ? 'bg-fuchsia-950/20 border-fuchsia-500/30' : 'bg-[#111] border-gray-800'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className="bg-gray-800 text-white text-xs font-mono px-2 py-0.5 rounded">{log.version}</span>
                                        {idx === 0 && <span className="text-[9px] uppercase tracking-widest text-fuchsia-400 font-bold bg-fuchsia-500/10 px-2 py-0.5 rounded-full">Atual</span>}
                                    </div>
                                    <button onClick={() => handleDeleteChangelog(log.id)} className="text-gray-600 hover:text-red-500 transition" title="Apagar Nota">
                                        <Trash2 size={16}/>
                                    </button>
                                </div>
                                <h4 className="font-bold text-white mb-2 text-lg">{log.title}</h4>
                                <p className="text-sm text-gray-400 line-clamp-3 whitespace-pre-wrap">{log.content}</p>
                                
                                {/* Mostrar badge se tiver mídia */}
                                {(log.video_url || log.image_url) && (
                                    <div className="mt-4 flex gap-2">
                                        {log.image_url && <span className="text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-1 rounded flex items-center gap-1"><ImagePlus size={10}/> Tem Imagem</span>}
                                        {log.video_url && <span className="text-[10px] bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-1 rounded flex items-center gap-1"><Video size={10}/> Tem Vídeo</span>}
                                    </div>
                                )}
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