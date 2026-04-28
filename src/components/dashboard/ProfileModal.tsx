import React, { useState, useEffect } from 'react';
import { X, User, Lock, Camera, Save, Loader2, Mail, Phone, Shield, Link as LinkIcon, ExternalLink, Copy, Check, Zap, AlertTriangle, Trash2, Briefcase, Bot, Sparkles, MessageSquare, Users, FileText, AlignLeft } from 'lucide-react'; 
import { supabase } from '@/supabase'; 
import { toast } from 'sonner';

// 🟢 CORREÇÃO: Variável de ambiente (Nunca deixar exposto no JS do cliente)
const BOT_NUMBER = process.env.NEXT_PUBLIC_BOT_NUMBER || "";

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  userPlan: string;
}

export default function ProfileModal({ isOpen, onClose, user, userPlan }: ProfileModalProps) {
  if (!isOpen || !user) return null;

  const [activeTab, setActiveTab] = useState<'details' | 'whatsapp' | 'security'>('details');
  
  // States Pessoais
  const [fullName, setFullName] = useState(user.user_metadata?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user.user_metadata?.avatar_url || '');
  
  // 🟢 STATES DO CONSULTOR (Business)
  const [companyName, setCompanyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [bio, setBio] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // STATES DO WHATSAPP (Modo Casal)
  const [whatsapp, setWhatsapp] = useState('');
  const [partnerWhatsapp, setPartnerWhatsapp] = useState('');

  // STATES DAS WORKSPACES PARA ROTEAMENTO DA IA
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  
  // States de Segurança
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Status de Carregamento Gerais
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // VERIFICAÇÃO DE PLANO
  const canUseWhatsapp = ['pro', 'agent', 'admin'].includes(userPlan || '');
  const isConsultant = ['agent', 'admin'].includes(userPlan || '');

  // 1. BUSCAR DADOS AO ABRIR
  useEffect(() => {
    if (user?.id) {
      const fetchData = async () => {
        // Busca Whatsapp
        const { data: settingsData } = await supabase
          .from('user_settings')
          .select('whatsapp_phone, partner_phone')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (settingsData?.whatsapp_phone) setWhatsapp(settingsData.whatsapp_phone);
        if (settingsData?.partner_phone) setPartnerWhatsapp(settingsData.partner_phone);

        // 🟢 Busca Dados do Consultor na tabela Profiles
        const { data: profileData } = await supabase
          .from('profiles')
          .select('company_logo, company_name, cnpj, bio')
          .eq('id', user.id)
          .maybeSingle();

        if (profileData) {
          if (profileData.company_logo) setCompanyLogo(profileData.company_logo);
          if (profileData.company_name) setCompanyName(profileData.company_name);
          if (profileData.cnpj) setCnpj(profileData.cnpj);
          if (profileData.bio) setBio(profileData.bio);
        }

        // Busca Workspaces
        setLoadingWorkspaces(true);
        const { data: wsData } = await supabase
          .from('workspaces') 
          .select('id, title, whatsapp_rule')
          .eq('user_id', user.id);
        
        if (wsData) setWorkspaces(wsData);
        setLoadingWorkspaces(false);
      };
      fetchData();
    }
  }, [user]);

  const handleAvatarUpload = async (e: any) => {
    try {
      setUploading(true);
      const file = e.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('comprovantes').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('comprovantes').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
      toast.success("Foto carregada! Clique em Salvar para confirmar.");

    } catch (error: any) {
      console.error("Erro no upload do avatar:", error);
      toast.error("Erro ao enviar a imagem. Tente novamente.");
    } finally {
      setUploading(false);
    }
  };

  const handleLogoUpload = async (e: any) => {
    try {
      setUploadingLogo(true);
      const file = e.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `logo_${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`; 

      const { error: uploadError } = await supabase.storage.from('logos').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('logos').getPublicUrl(filePath);
      
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ company_logo: data.publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      setCompanyLogo(data.publicUrl);
      toast.success("Logo atualizada!");

    } catch (error: any) {
      console.error("Erro no upload da logo:", error);
      toast.error("Erro ao atualizar a logo. Tente novamente.");
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      // 1. Atualiza os dados básicos de Autenticação (Nome e Avatar)
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName, avatar_url: avatarUrl }
      });
      if (authError) throw authError;

      // 2. 🟢 Se for consultor, atualiza os dados da Empresa na tabela profiles
      if (isConsultant) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({
            company_name: companyName,
            cnpj: cnpj,
            bio: bio
          })
          .eq('id', user.id);
          
        if (profileError) throw profileError;
      }

      toast.success("Perfil atualizado com sucesso!");
      setTimeout(() => { window.location.reload(); }, 1000);
    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);
      toast.error("Não foi possível salvar os dados. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWhatsappSettings = async () => {
    setSavingRules(true);
    try {
      const cleanPhone = whatsapp.replace(/\D/g, ''); 
      const cleanPartnerPhone = partnerWhatsapp.replace(/\D/g, ''); 

      if (cleanPartnerPhone && cleanPartnerPhone.length < 10) {
        toast.error("Número do parceiro incompleto. Use DDD + número.");
        setSavingRules(false);
        return;
      }

      const { error: dbError } = await supabase
        .from('user_settings')
        .upsert({ 
            user_id: user.id, 
            whatsapp_phone: cleanPhone,
            partner_phone: cleanPartnerPhone || null 
        }, { onConflict: 'user_id' });
      
      if (dbError) throw dbError;

      if (workspaces.length > 0) {
        for (const ws of workspaces) {
          await supabase
            .from('workspaces')
            .update({ whatsapp_rule: ws.whatsapp_rule })
            .eq('id', ws.id)
            .eq('user_id', user.id);
        }
      }

      toast.success("Configurações da IA salvas com sucesso! 🤖");
    } catch (error: any) {
      console.error("Erro ao salvar regras da IA:", error);
      toast.error("Não foi possível salvar as configurações. Tente novamente.");
    } finally {
      setSavingRules(false);
    }
  };

  const handleRuleChange = (id: any, newRule: string) => {
      setWorkspaces(prev => prev.map(ws => ws.id === id ? { ...ws, whatsapp_rule: newRule } : ws));
  };

  const handleChangePassword = async () => {
    if (password !== confirmPassword) return toast.warning("Senhas não conferem.");
    if (password.length < 6) return toast.warning("Mínimo 6 caracteres.");
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: password });
    
    if (error) {
        console.error("Erro ao trocar senha:", error);
        toast.error("Erro ao atualizar a senha. Tente novamente.");
    } else {
      toast.success("Senha alterada com sucesso!");
      setPassword('');
      setConfirmPassword('');
    }
    setLoading(false);
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });

      if (!res.ok) throw new Error("Falha na resposta da API.");

      await supabase.auth.signOut();
      toast.success("Conta e todos os dados foram excluídos.");
      setTimeout(() => { window.location.reload(); }, 1500);
    } catch (error: any) {
      console.error("Erro ao excluir conta:", error);
      toast.error("Não foi possível excluir a conta. Contate o suporte.");
      setIsDeleting(false);
    }
  };

  const handleConnectWhatsapp = () => {
    if (!canUseWhatsapp) return toast.error("Recurso Bloqueado 🔒", { description: "Exclusivo dos planos Pro e Agent." });
    const cleanPhone = whatsapp.replace(/\D/g, '');
    if (cleanPhone.length < 10) return toast.error("Número principal incompleto.");
    if (!BOT_NUMBER) return toast.error("Erro de configuração. Contate o suporte.");

    const link = `https://wa.me/${BOT_NUMBER}?text=${encodeURIComponent(`Ativar ${cleanPhone}`)}`;
    window.open(link, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[300] p-4 animate-in fade-in duration-300">
      <div className="bg-[#111] border border-gray-800 w-full max-w-xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0a0a0a]">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            Configurações {isConsultant && <span className="bg-purple-900/30 text-purple-400 border border-purple-500/30 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">Consultor</span>}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition"><X size={24}/></button>
        </div>

        {/* TABS */}
        <div className="flex border-b border-gray-800 bg-[#0f0f10] overflow-x-auto scrollbar-hide">
          <button onClick={() => setActiveTab('details')} className={`flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold border-b-2 transition min-w-max ${activeTab === 'details' ? 'border-purple-500 text-purple-400 bg-purple-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
            <User size={16} /> Perfil
          </button>
          
          <button onClick={() => setActiveTab('whatsapp')} className={`flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold border-b-2 transition min-w-max ${activeTab === 'whatsapp' ? 'border-emerald-500 text-emerald-400 bg-emerald-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
            <Bot size={16} /> WhatsApp IA
          </button>

          <button onClick={() => setActiveTab('security')} className={`flex items-center justify-center gap-2 px-4 py-4 text-sm font-bold border-b-2 transition min-w-max ${activeTab === 'security' ? 'border-orange-500 text-orange-400 bg-orange-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}>
            <Lock size={16} /> Segurança
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-6 sm:p-8 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800">
          
          {/* ABA 1: DADOS PESSOAIS */}
          {activeTab === 'details' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="flex flex-col items-center gap-4">
                <div className="relative group cursor-pointer w-24 h-24">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-700 group-hover:border-purple-500 transition shadow-xl">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-900 flex items-center justify-center text-gray-600"><User size={40}/></div>
                    )}
                  </div>
                  <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition rounded-full cursor-pointer">
                    <Camera className="text-white" size={24}/>
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  </label>
                  {uploading && <div className="absolute inset-0 bg-black/70 flex items-center justify-center rounded-full"><Loader2 className="animate-spin text-purple-500"/></div>}
                </div>
                <p className="text-xs text-gray-500">Clique na foto para alterar</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 font-bold ml-1 mb-1 block">Nome do Usuário</label>
                  <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition" />
                </div>

                <div>
                  <label className="text-xs text-gray-500 font-bold ml-1 mb-1 block">E-mail de Acesso</label>
                  <div className="w-full bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-gray-500 flex items-center gap-2 cursor-not-allowed">
                    <Mail size={16}/> {user.email}
                  </div>
                </div>

                {/* 🟢 BLOCO VIP DO CONSULTOR */}
                {isConsultant && (
                  <div className="mt-8 bg-gradient-to-b from-purple-900/20 to-transparent border border-purple-500/20 p-5 rounded-2xl space-y-5">
                    <div className="flex items-center gap-2 border-b border-purple-500/20 pb-3">
                        <Briefcase className="text-purple-400" size={18} />
                        <h3 className="text-purple-400 font-bold text-sm uppercase tracking-wider">Cartão de Visita do Consultor</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs text-gray-400 font-bold ml-1 mb-1 block">Nome da Empresa</label>
                            <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Ex: VH Consultoria" className="w-full bg-black border border-gray-800 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition" />
                        </div>
                        <div>
                            <label className="text-xs text-gray-400 font-bold ml-1 mb-1 block">CNPJ ou CPF</label>
                            <input type="text" value={cnpj} onChange={(e) => setCnpj(e.target.value)} placeholder="00.000.000/0000-00" className="w-full bg-black border border-gray-800 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition" />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs text-gray-400 font-bold ml-1 mb-1 block">Sua Biografia / Especialidade</label>
                        <textarea value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Ex: Especialista em recuperação de crédito e organização financeira para autônomos..." className="w-full bg-black border border-gray-800 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition resize-none h-20" />
                    </div>

                    <div className="bg-black/50 p-4 rounded-xl border border-gray-800 flex flex-col sm:flex-row items-center gap-4">
                      {companyLogo ? (
                        <img src={companyLogo} alt="Logo" className="w-16 h-16 object-contain bg-white rounded-lg border border-gray-700 p-1 shrink-0" />
                      ) : (
                        <div className="w-16 h-16 bg-gray-900 rounded-lg border border-gray-800 flex items-center justify-center text-gray-600 text-[10px] text-center p-2 shrink-0">Sem Logo</div>
                      )}
                      <div className="flex-1 text-center sm:text-left">
                        <label className={`cursor-pointer inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition shadow-lg shadow-purple-900/20 ${uploadingLogo ? 'opacity-50' : ''}`}>
                          {uploadingLogo ? <Loader2 className="animate-spin" size={14}/> : <Camera size={14}/>}
                          {uploadingLogo ? "Enviando..." : "Atualizar Logomarca"}
                          <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} disabled={uploadingLogo} />
                        </label>
                        <p className="text-[10px] text-gray-500 mt-2 leading-tight">Essa imagem aparecerá no topo dos contratos e nos relatórios gerados para seus clientes.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <button onClick={handleUpdateProfile} disabled={loading || uploading} className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold py-3.5 rounded-xl transition shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2 mt-4">
                {loading ? <Loader2 className="animate-spin"/> : <><Save size={18}/> Salvar Dados do Perfil</>}
              </button>
            </div>
          )}

          {/* ABA 2: WHATSAPP IA E ROTEAMENTO */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              
              {/* Conexão do Número */}
              <div>
                <h3 className="text-emerald-400 font-bold flex items-center gap-2 mb-1">
                  <Phone size={18} /> 1. Conexão do Dispositivo
                </h3>
                <p className="text-gray-400 text-xs mb-4">Autorize o Bot a receber seus gastos. Você pode adicionar um número extra para compartilhar o painel com seu parceiro(a).</p>
                
                <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-800 space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs text-gray-500 font-bold flex items-center gap-1"><User size={12}/> Seu WhatsApp</label>
                      {canUseWhatsapp ? (
                          <span className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/50 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Zap size={10} /> Liberado</span>
                      ) : (
                          <span className="bg-gray-800 text-gray-500 border border-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Lock size={10} /> Plano Grátis</span>
                      )}
                    </div>
                    <input type="text" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="Ex: 556299999999" className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition" />
                  </div>

                  <div>
                    <label className="text-xs text-gray-500 font-bold mb-2 flex items-center gap-1"><Users size={12}/> WhatsApp do Parceiro(a) <span className="font-normal text-[10px]">(Opcional)</span></label>
                    <input type="text" value={partnerWhatsapp} onChange={(e) => setPartnerWhatsapp(e.target.value)} placeholder="Ex: 556288888888" className="w-full bg-black border border-gray-700 rounded-xl p-3 text-white focus:border-emerald-500 outline-none transition" />
                  </div>
                  
                  <button onClick={handleConnectWhatsapp} className={`w-full py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 mt-2 ${canUseWhatsapp ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>
                      {canUseWhatsapp ? <LinkIcon size={16} /> : <Lock size={16} />} {canUseWhatsapp ? "Autenticar Conta" : "Bloqueado"}
                  </button>
                </div>
              </div>

              {/* Regras de Roteamento Inteligente */}
              <div>
                <h3 className="text-cyan-400 font-bold flex items-center gap-2 mb-1">
                  <Sparkles size={18} /> 2. Roteamento Inteligente
                </h3>
                <p className="text-gray-400 text-xs mb-4 leading-relaxed">
                  A IA analisa suas notas fiscais e decide em qual área de trabalho salvar. Escreva regras claras (ex: "Gastos de mercado e lazer" ou "Despesas de anúncios e fornecedores").
                </p>

                {loadingWorkspaces ? (
                  <div className="flex items-center justify-center py-6"><Loader2 className="animate-spin text-cyan-500" /></div>
                ) : workspaces.length === 0 ? (
                  <div className="bg-gray-900/50 border border-gray-800 p-4 rounded-xl text-center">
                    <p className="text-sm text-gray-400">Você só possui a área de trabalho principal. A IA enviará tudo para lá automaticamente.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {workspaces.map((ws, index) => (
                      <div key={ws.id} className="bg-gray-900 border border-gray-700 focus-within:border-cyan-500/50 rounded-xl p-4 transition">
                        <label className="text-sm text-white font-bold flex items-center gap-2 mb-2">
                          <div className="w-5 h-5 rounded bg-cyan-900/30 text-cyan-400 flex items-center justify-center text-xs border border-cyan-500/30">{index + 1}</div>
                          {ws.title}
                        </label>
                        <textarea 
                          maxLength={300}
                          value={ws.whatsapp_rule || ''}
                          onChange={(e) => handleRuleChange(ws.id, e.target.value)}
                          placeholder="Ex: Aqui entram apenas gastos de supermercado, farmácia, combustível do meu carro pessoal e contas de casa."
                          className="w-full bg-black border border-gray-800 rounded-lg p-3 text-sm text-gray-300 focus:border-cyan-500 outline-none resize-none h-24"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button onClick={handleSaveWhatsappSettings} disabled={savingRules} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl transition shadow-lg flex items-center justify-center gap-2 mt-4">
                {savingRules ? <Loader2 className="animate-spin"/> : <><Save size={18}/> Salvar Configurações da IA</>}
              </button>
            </div>
          )}

          {/* ABA 3: SEGURANÇA E PRIVACIDADE */}
          {activeTab === 'security' && (
             <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
               <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl flex items-start gap-3">
                 <Lock className="text-orange-500 mt-1" size={20}/>
                 <div>
                   <h4 className="text-orange-400 font-bold text-sm">Atualizar Senha</h4>
                   <p className="text-orange-500/70 text-xs mt-1">Sugerimos usar uma senha forte e única para proteger seus dados financeiros.</p>
                 </div>
               </div>

               <div className="space-y-4">
                 <div>
                   <label className="text-xs text-gray-500 font-bold ml-1 mb-1 block">Nova Senha</label>
                   <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-orange-500 outline-none" />
                 </div>
                 <div>
                   <label className="text-xs text-gray-500 font-bold ml-1 mb-1 block">Confirmar</label>
                   <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-orange-500 outline-none" />
                 </div>
               </div>

               <button onClick={handleChangePassword} disabled={loading || !password} className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition border border-gray-600 flex items-center justify-center gap-2">
                 {loading ? <Loader2 className="animate-spin"/> : "Atualizar Senha"}
               </button>

               <div className="h-px bg-gray-800 w-full my-6"></div>

               <div className="bg-red-500/5 border border-red-500/20 p-5 rounded-xl">
                 <h4 className="text-red-500 font-bold flex items-center gap-2 mb-2"><AlertTriangle size={18}/> Zona de Risco</h4>
                 <p className="text-gray-400 text-xs mb-4 leading-relaxed">
                   De acordo com a LGPD, você tem o direito de apagar sua conta. Esta ação <strong>excluirá todos os seus dados financeiros, históricos e metas imediatamente.</strong> Esta ação é irreversível.
                 </p>
                 <button onClick={() => setIsDeleteModalOpen(true)} className="w-full bg-red-500/10 hover:bg-red-600 text-red-500 hover:text-white font-bold py-2.5 rounded-lg transition border border-red-500/20 hover:border-red-600 flex items-center justify-center gap-2">
                   <Trash2 size={16}/> Excluir Minha Conta Permanentemente
                 </button>
               </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE CONFIRMAÇÃO DE EXCLUSÃO */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[400] p-4 animate-in zoom-in duration-200">
          <div className="bg-[#111] border border-red-900/50 p-6 rounded-3xl w-full max-w-sm text-center shadow-2xl shadow-red-900/20">
             <div className="flex justify-center mb-4">
               <div className="bg-red-500/20 p-4 rounded-full"><AlertTriangle className="text-red-500" size={32} /></div>
             </div>
             <h2 className="text-xl font-bold text-white mb-2">Você tem certeza absoluta?</h2>
             <p className="text-gray-400 text-sm mb-6">
               Isso apagará seu cadastro e <strong>todos os seus registros financeiros</strong> para sempre. Você perderá o acesso à plataforma.
             </p>
             <div className="flex gap-3">
               <button onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition">
                 Cancelar
               </button>
               <button onClick={handleDeleteAccount} disabled={isDeleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">
                 {isDeleting ? <Loader2 className="animate-spin" size={18}/> : "Sim, Excluir"}
               </button>
             </div>
          </div>
        </div>
      )}

    </div>
  );
}