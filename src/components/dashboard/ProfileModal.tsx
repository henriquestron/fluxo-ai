import React, { useState, useEffect } from 'react';
import { 
  X, User, Lock, Camera, Save, Loader2, Mail, Phone, Link as LinkIcon, 
  Check, Zap, AlertTriangle, Trash2, Briefcase, Bot, Sparkles, Users, 
  Wallet, Settings, Power, Sliders
} from 'lucide-react'; 
import { supabase } from '@/supabase'; 
import { toast } from 'sonner';

// 🟢 Variável de ambiente
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
  const [isAIConfigOpen, setIsAIConfigOpen] = useState(false); 
  
  // States Pessoais
  const [fullName, setFullName] = useState(user.user_metadata?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user.user_metadata?.avatar_url || '');
  
  // STATES DO CONSULTOR (Business)
  const [companyName, setCompanyName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [bio, setBio] = useState('');
  const [companyLogo, setCompanyLogo] = useState('');
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // STATES DO WHATSAPP
  const [whatsapp, setWhatsapp] = useState('');
  const [partnerWhatsapp, setPartnerWhatsapp] = useState('');

  // 🟢 STATES DO CÉREBRO DA IA (Regras e Emoções)
  const [botPersona, setBotPersona] = useState('humorado'); 
  const [humorLevel, setHumorLevel] = useState(5);
  const [sincerityLevel, setSincerityLevel] = useState(5);
  const [formalityLevel, setFormalityLevel] = useState(5);

  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [walletGoals, setWalletGoals] = useState<any[]>([]); 
  const [loadingAI, setLoadingAI] = useState(false);
  const [savingRules, setSavingRules] = useState(false);
  const [savingPhones, setSavingPhones] = useState(false);
  
  // States de Segurança
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  
  // Status de Carregamento Gerais
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // VERIFICAÇÃO DE PLANO
  const canUseWhatsapp = ['pro', 'agent', 'admin'].includes(userPlan || '');
  const isConsultant = ['agent', 'admin'].includes(userPlan || '');

  // 1. BUSCAR DADOS AO ABRIR
  useEffect(() => {
    if (user?.id) {
      const fetchData = async () => {
        setLoadingAI(true);
        
        // 🟢 Busca Whatsapp e Níveis de Emoção
        const { data: settingsData } = await supabase
          .from('user_settings')
          .select('whatsapp_phone, partner_phone, bot_persona, bot_humor_level, bot_sincerity_level, bot_formality_level')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (settingsData) {
            if (settingsData.whatsapp_phone) setWhatsapp(settingsData.whatsapp_phone);
            if (settingsData.partner_phone) setPartnerWhatsapp(settingsData.partner_phone);
            if (settingsData.bot_persona) setBotPersona(settingsData.bot_persona);
            if (settingsData.bot_humor_level) setHumorLevel(settingsData.bot_humor_level);
            if (settingsData.bot_sincerity_level) setSincerityLevel(settingsData.bot_sincerity_level);
            if (settingsData.bot_formality_level) setFormalityLevel(settingsData.bot_formality_level);
        }

        // Busca Dados do Consultor
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
        const { data: wsData } = await supabase
          .from('workspaces') 
          .select('id, title, whatsapp_rule')
          .eq('user_id', user.id);
        
        if (wsData) setWorkspaces(wsData);

        // Busca Caixinhas (Wallets)
        const { data: goalsData } = await supabase
          .from('goals')
          .select('id, title, whatsapp_rule, ai_enabled')
          .eq('user_id', user.id)
          .eq('type', 'wallet');
        
        if (goalsData) setWalletGoals(goalsData);

        setLoadingAI(false);
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
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName, avatar_url: avatarUrl }
      });
      if (authError) throw authError;

      if (isConsultant) {
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ company_name: companyName, cnpj: cnpj, bio: bio })
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

  const handleSavePhones = async () => {
    setSavingPhones(true);
    try {
      const cleanPhone = whatsapp.replace(/\D/g, ''); 
      const cleanPartnerPhone = partnerWhatsapp.replace(/\D/g, ''); 

      if (cleanPartnerPhone && cleanPartnerPhone.length < 10) {
        toast.error("Número do parceiro incompleto. Use DDD + número.");
        setSavingPhones(false);
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

      toast.success("Números de conexão salvos!");
    } catch (error: any) {
      toast.error("Não foi possível salvar os números.");
    } finally {
      setSavingPhones(false);
    }
  };

  // 🟢 SALVA O CÉREBRO E AS EMOÇÕES
  const handleSaveAIConfig = async () => {
    setSavingRules(true);
    try {
      await supabase.from('user_settings')
        .update({ 
            bot_persona: botPersona,
            bot_humor_level: humorLevel,
            bot_sincerity_level: sincerityLevel,
            bot_formality_level: formalityLevel
        })
        .eq('user_id', user.id);

      for (const ws of workspaces) {
        await supabase.from('workspaces').update({ whatsapp_rule: ws.whatsapp_rule }).eq('id', ws.id).eq('user_id', user.id);
      }
      
      for (const wg of walletGoals) {
        await supabase.from('goals').update({ 
            whatsapp_rule: wg.whatsapp_rule, 
            ai_enabled: wg.ai_enabled 
        }).eq('id', wg.id).eq('user_id', user.id);
      }

      toast.success("Cérebro da Luna atualizado! 🧠");
      setIsAIConfigOpen(false);
    } catch (error) {
      toast.error("Erro ao sincronizar regras com o servidor.");
    } finally {
      setSavingRules(false);
    }
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

          {/* ABA 2: WHATSAPP */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              
              <div className="bg-emerald-500/10 border border-emerald-500/20 p-5 rounded-2xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-5">
                    <div>
                        <h3 className="text-emerald-400 font-bold flex items-center gap-2">
                            <Bot size={18} /> Cérebro da IA e WhatsApp
                        </h3>
                        <p className="text-gray-400 text-xs mt-1">Configure os números de conexão e personalize a inteligência.</p>
                    </div>
                    <button 
                        onClick={() => setIsAIConfigOpen(true)}
                        className="w-full sm:w-auto flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-lg shadow-emerald-900/20 whitespace-nowrap"
                    >
                        <Settings size={16} /> Configurar Cérebro
                    </button>
                </div>
                
                <div className="space-y-4 bg-black/40 p-4 rounded-xl border border-gray-800">
                    <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs text-gray-500 font-bold flex items-center gap-1"><User size={12}/> Seu WhatsApp</label>
                          {canUseWhatsapp ? (
                              <span className="bg-emerald-500/20 text-emerald-500 border border-emerald-500/50 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Zap size={10} /> Liberado</span>
                          ) : (
                              <span className="bg-gray-800 text-gray-500 border border-gray-700 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"><Lock size={10} /> Plano Grátis</span>
                          )}
                        </div>
                        <input type="text" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="Ex: 556299999999" className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-white outline-none focus:border-emerald-500 transition" />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 font-bold mb-2 flex items-center gap-1"><Users size={12}/> WhatsApp do Parceiro(a) <span className="font-normal text-[10px]">(Opcional)</span></label>
                        <input type="text" value={partnerWhatsapp} onChange={(e) => setPartnerWhatsapp(e.target.value)} placeholder="Ex: 556288888888" className="w-full bg-gray-900 border border-gray-800 rounded-lg p-3 text-white outline-none focus:border-emerald-500 transition" />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 pt-2">
                      <button onClick={handleSavePhones} disabled={savingPhones} className="flex-1 bg-gray-800 hover:bg-gray-700 text-white font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 border border-gray-700">
                        {savingPhones ? <Loader2 className="animate-spin size-4"/> : <Save size={16}/>} Salvar Números
                      </button>
                      <button onClick={handleConnectWhatsapp} className={`flex-1 py-2.5 rounded-xl font-bold transition flex items-center justify-center gap-2 ${canUseWhatsapp ? 'bg-emerald-600 hover:bg-emerald-500 text-white' : 'bg-gray-800 text-gray-500 border border-gray-700'}`}>
                          {canUseWhatsapp ? <LinkIcon size={16} /> : <Lock size={16} />} Autenticar
                      </button>
                    </div>
                </div>
              </div>

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

      {/* 🟢 SUB-MODAL: CÉREBRO DA IA */}
      {isAIConfigOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[400] flex items-center justify-center p-4 animate-in zoom-in duration-200">
          <div className="bg-[#0a0a0a] border border-gray-800 w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-cyan-500/20 rounded-lg text-cyan-400"><Sparkles size={20}/></div>
                    <div>
                        <h2 className="text-xl font-bold text-white leading-none">Cérebro do WhatsApp</h2>
                        <p className="text-xs text-gray-500 mt-1">Configure o humor e ensine a Luna onde salvar cada gasto.</p>
                    </div>
                </div>
                <button onClick={() => setIsAIConfigOpen(false)} className="text-gray-500 hover:text-white"><X size={24}/></button>
            </div>

            <div className="p-6 overflow-y-auto space-y-8 scrollbar-hide">
                
                {/* 1. SEÇÃO DE PERSONALIDADE (HUMOR E SLIDERS) */}
                <section>
                    <h3 className="text-purple-400 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Sparkles size={14} /> Personalidade da IA
                    </h3>
                    <div className="bg-gray-900/50 border border-gray-800 p-5 rounded-2xl focus-within:border-purple-500/30 transition">
                        <label className="text-sm font-bold text-gray-200 mb-2 block">Estilo de Resposta (Humor)</label>
                        <select 
                            value={botPersona} 
                            onChange={(e) => setBotPersona(e.target.value)} 
                            className="w-full bg-black border border-gray-800 rounded-xl p-3 text-sm text-gray-400 outline-none focus:border-purple-500 appearance-none"
                        >
                            <option value="humorado">😂 Parceiro (Descontraído e Engraçado)</option>
                            <option value="sincero">😠 Pai Bravo (Sincero e Dá Puxão de Orelha)</option>
                            <option value="formal">👔 Executivo (Sério, Objetivo e Formal)</option>
                            <option value="personalizado">🎛️ Personalizado (Ajuste Fino de Emoções)</option>
                        </select>

                        {/* 🟢 SLIDERS CUSTOMIZADOS */}
                        {botPersona === 'personalizado' && (
                            <div className="mt-5 p-5 bg-black rounded-xl border border-gray-800 space-y-6 animate-in fade-in duration-300">
                                <div className="text-center mb-2">
                                    <h4 className="text-sm font-bold text-white flex items-center justify-center gap-2">
                                        <Sliders size={16} className="text-purple-500"/> Painel de Sentimentos
                                    </h4>
                                    <p className="text-[10px] text-gray-500 mt-1">Deslize para calibrar o comportamento da Luna.</p>
                                </div>
                                
                                <div>
                                    <label className="text-xs font-bold mb-3 flex justify-between text-gray-400">
                                        <span className="flex items-center gap-1">🤪 Nível de Humor</span>
                                        <span className="text-purple-400 bg-purple-900/30 px-2 py-0.5 rounded-md">{humorLevel}/10</span>
                                    </label>
                                    <input 
                                        type="range" min="1" max="10" 
                                        value={humorLevel} 
                                        onChange={(e) => setHumorLevel(Number(e.target.value))} 
                                        className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-purple-500" 
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold mb-3 flex justify-between text-gray-400">
                                        <span className="flex items-center gap-1">😠 Nível de Sinceridade (Broncas)</span>
                                        <span className="text-orange-400 bg-orange-900/30 px-2 py-0.5 rounded-md">{sincerityLevel}/10</span>
                                    </label>
                                    <input 
                                        type="range" min="1" max="10" 
                                        value={sincerityLevel} 
                                        onChange={(e) => setSincerityLevel(Number(e.target.value))} 
                                        className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-orange-500" 
                                    />
                                </div>

                                <div>
                                    <label className="text-xs font-bold mb-3 flex justify-between text-gray-400">
                                        <span className="flex items-center gap-1">👔 Nível de Formalidade</span>
                                        <span className="text-cyan-400 bg-cyan-900/30 px-2 py-0.5 rounded-md">{formalityLevel}/10</span>
                                    </label>
                                    <input 
                                        type="range" min="1" max="10" 
                                        value={formalityLevel} 
                                        onChange={(e) => setFormalityLevel(Number(e.target.value))} 
                                        className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-500" 
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                {/* 2. SEÇÃO DE WORKSPACES */}
                <section>
                    <h3 className="text-cyan-400 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Users size={14}/> Áreas de Trabalho (Workspaces)
                    </h3>
                    {loadingAI ? (
                       <div className="flex justify-center"><Loader2 className="animate-spin text-cyan-500" /></div>
                    ) : workspaces.length === 0 ? (
                        <p className="text-sm text-gray-500 bg-gray-900/50 p-4 rounded-xl border border-gray-800">A IA enviará tudo para seu painel principal.</p>
                    ) : (
                        <div className="grid gap-4">
                            {workspaces.map((ws, idx) => (
                                <div key={ws.id} className="bg-gray-900/50 border border-gray-800 p-4 rounded-2xl focus-within:border-cyan-500/30 transition">
                                    <label className="text-sm font-bold text-gray-200 mb-2 flex items-center gap-2">
                                        <div className="w-5 h-5 rounded bg-cyan-900/30 text-cyan-400 flex items-center justify-center text-xs border border-cyan-500/30">{idx + 1}</div>
                                        {ws.title}
                                    </label>
                                    <textarea 
                                        maxLength={300}
                                        value={ws.whatsapp_rule || ''}
                                        onChange={(e) => setWorkspaces(workspaces.map(w => w.id === ws.id ? {...w, whatsapp_rule: e.target.value} : w))}
                                        placeholder="Ex: Use esta área para gastos de empresa e fornecedores..."
                                        className="w-full bg-black border border-gray-800 rounded-xl p-3 text-sm text-gray-400 outline-none focus:border-cyan-500 h-20 resize-none"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* 3. SEÇÃO DE CAIXINHAS (WALLETS) */}
                <section>
                    <h3 className="text-emerald-400 text-xs font-black uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Wallet size={14}/> Caixinhas Mensais (Orçamentos)
                    </h3>
                    {loadingAI ? (
                       <div className="flex justify-center"><Loader2 className="animate-spin text-emerald-500" /></div>
                    ) : walletGoals.length === 0 ? (
                        <p className="text-sm text-gray-500 bg-gray-900/50 p-4 rounded-xl border border-gray-800">Você ainda não tem Caixinhas criadas.</p>
                    ) : (
                        <div className="grid gap-4">
                            {walletGoals.map(wg => (
                                <div key={wg.id} className={`p-4 rounded-2xl border transition ${wg.ai_enabled ? 'bg-emerald-950/10 border-emerald-500/20' : 'bg-gray-900/30 border-gray-800 opacity-60'}`}>
                                    <div className="flex justify-between items-center mb-3">
                                        <label className="text-sm font-bold text-white">{wg.title}</label>
                                        <button 
                                            onClick={() => setWalletGoals(walletGoals.map(g => g.id === wg.id ? {...g, ai_enabled: !g.ai_enabled} : g))}
                                            className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase transition ${wg.ai_enabled ? 'bg-emerald-500 text-black shadow-lg shadow-emerald-500/20' : 'bg-gray-800 text-gray-500'}`}
                                        >
                                            <Power size={10} /> {wg.ai_enabled ? 'Ativa' : 'Inativa'}
                                        </button>
                                    </div>
                                    <textarea 
                                        maxLength={300}
                                        disabled={!wg.ai_enabled}
                                        value={wg.whatsapp_rule || ''}
                                        onChange={(e) => setWalletGoals(walletGoals.map(g => g.id === wg.id ? {...g, whatsapp_rule: e.target.value} : g))}
                                        placeholder="Ex: Tudo que eu falar que é de mercado, açougue ou feira deve sair daqui."
                                        className="w-full bg-black border border-gray-800 rounded-xl p-3 text-sm text-gray-400 outline-none focus:border-emerald-500 h-20 resize-none disabled:cursor-not-allowed"
                                    />
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>

            <div className="p-6 border-t border-gray-800 bg-[#0a0a0a] flex gap-3">
                <button 
                    onClick={() => setIsAIConfigOpen(false)}
                    className="flex-1 bg-gray-900 text-white font-bold py-4 rounded-2xl hover:bg-gray-800 transition border border-gray-800"
                >
                    Voltar
                </button>
                <button 
                    onClick={handleSaveAIConfig}
                    disabled={savingRules}
                    className="flex-[2] bg-white text-black font-black py-4 rounded-2xl hover:bg-gray-200 transition shadow-xl flex items-center justify-center gap-2"
                >
                    {savingRules ? <Loader2 className="animate-spin" /> : <><Save size={18}/> Salvar Cérebro</>}
                </button>
            </div>
          </div>
        </div>
      )}

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