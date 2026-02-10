import React, { useState, useEffect } from 'react';
import { X, User, Lock, Camera, Save, Loader2, Mail, Phone, Shield, Link as LinkIcon, ExternalLink } from 'lucide-react'; 
import { supabase } from '@/supabase';
import { toast } from 'sonner';

// --- CONFIGURAÇÃO DO BOT ---
// COLOQUE AQUI O NÚMERO DO SEU ROBÔ (O que recebe as mensagens)
// Formato: 55 + DDD + Numero (Sem caracteres especiais)
const BOT_NUMBER = "556293882931"; 

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export default function ProfileModal({ isOpen, onClose, user }: ProfileModalProps) {
  if (!isOpen || !user) return null;

  const [activeTab, setActiveTab] = useState<'details' | 'security'>('details');
  
  // States
  const [fullName, setFullName] = useState(user.user_metadata?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user.user_metadata?.avatar_url || '');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // 1. BUSCAR TELEFONE AO ABRIR
  useEffect(() => {
    if (user?.id) {
      const fetchSettings = async () => {
        const { data, error } = await supabase
          .from('user_settings')
          .select('whatsapp_phone')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (!error && data?.whatsapp_phone) {
          setWhatsapp(data.whatsapp_phone);
        }
      };
      fetchSettings();
    }
  }, [user]);

  // Upload Foto
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
      toast.success("Foto carregada! Clique em Salvar.");

    } catch (error: any) {
      toast.error("Erro no upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Salvar Geral
  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      // 1. Auth
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName, avatar_url: avatarUrl }
      });
      if (authError) throw authError;

      // 2. Tabela user_settings
      const cleanPhone = whatsapp.replace(/\D/g, ''); 
      
      const { error: dbError } = await supabase
        .from('user_settings')
        .upsert({ 
          user_id: user.id, 
          whatsapp_phone: cleanPhone 
        }, { onConflict: 'user_id' });

      if (dbError) throw dbError;

      toast.success("Perfil atualizado!");
      window.location.reload(); 

    } catch (error: any) {
      toast.error("Erro: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Trocar Senha
  const handleChangePassword = async () => {
    if (password !== confirmPassword) return toast.warning("Senhas não conferem.");
    if (password.length < 6) return toast.warning("Mínimo 6 caracteres.");

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: password });

    if (error) toast.error("Erro: " + error.message);
    else {
      toast.success("Senha alterada!");
      setPassword('');
      setConfirmPassword('');
    }
    setLoading(false);
  };

  // --- FUNÇÃO DO LINK MÁGICO ---
  const handleConnectWhatsapp = () => {
    const cleanPhone = whatsapp.replace(/\D/g, '');
    
    if (cleanPhone.length < 10) {
      toast.error("Digite seu número completo com DDD antes de conectar.");
      return;
    }

    // Gera o texto: "Ativar 556299999999"
    const message = `Ativar ${cleanPhone}`;
    
    // Gera o Link do WhatsApp (Deep Link)
    const link = `https://wa.me/${BOT_NUMBER}?text=${encodeURIComponent(message)}`;
    
    // Abre em nova aba
    window.open(link, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[300] p-4 animate-in fade-in duration-300">
      <div className="bg-[#111] border border-gray-800 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0a0a0a]">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <User className="text-purple-500" size={24} /> Meu Perfil
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white transition"><X size={24}/></button>
        </div>

        {/* TABS */}
        <div className="flex border-b border-gray-800 bg-[#0f0f10]">
          <button 
            onClick={() => setActiveTab('details')}
            className={`flex-1 py-4 text-sm font-bold border-b-2 transition ${activeTab === 'details' ? 'border-purple-500 text-purple-400 bg-purple-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            Dados Pessoais
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-4 text-sm font-bold border-b-2 transition ${activeTab === 'security' ? 'border-purple-500 text-purple-400 bg-purple-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
          >
            Segurança
          </button>
        </div>

        {/* CONTENT */}
        <div className="p-8 overflow-y-auto">
          
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative group cursor-pointer w-24 h-24">
                  <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-gray-700 group-hover:border-purple-500 transition shadow-xl">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gray-900 flex items-center justify-center text-gray-600">
                        <User size={40}/>
                      </div>
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

              {/* Inputs */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 font-bold ml-1 mb-1 block">Nome</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition"
                  />
                </div>

                {/* WhatsApp Input */}
                <div>
                  <div className="flex justify-between items-center mb-1 ml-1">
                    <label className="text-xs text-gray-500 font-bold flex items-center gap-1">
                      <Phone size={12} /> WhatsApp (IA)
                    </label>
                    <span className="bg-yellow-500/20 text-yellow-500 border border-yellow-500/50 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Shield size={10} /> PRO
                    </span>
                  </div>
                  
                  <div className="relative">
                    <input 
                      type="text" 
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(e.target.value)}
                      placeholder="55 + DDD + Número"
                      className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition placeholder:text-gray-600"
                    />
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1 ml-1 mb-2">Digite seu número para liberar o botão de conexão.</p>

                  {/* --- BOTÃO DE CONEXÃO NOVO --- */}
                  {whatsapp.length > 8 && (
                    <button 
                      onClick={handleConnectWhatsapp}
                      className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 font-bold py-2.5 rounded-xl transition flex items-center justify-center gap-2 mb-2 group"
                    >
                      <LinkIcon size={16} className="group-hover:rotate-45 transition-transform" /> 
                      Conectar WhatsApp
                      <ExternalLink size={12} className="opacity-50"/>
                    </button>
                  )}
                  {/* ----------------------------- */}

                </div>

                {/* Email */}
                <div>
                  <label className="text-xs text-gray-500 font-bold ml-1 mb-1 block">E-mail</label>
                  <div className="w-full bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-gray-400 flex items-center gap-2 cursor-not-allowed">
                    <Mail size={16}/> {user.email}
                  </div>
                </div>
              </div>

              <button 
                onClick={handleUpdateProfile} 
                disabled={loading || uploading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition shadow-lg flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin"/> : <><Save size={18}/> Salvar</>}
              </button>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl flex items-start gap-3">
                 <Lock className="text-orange-500 mt-1" size={20}/>
                 <div>
                   <h4 className="text-orange-400 font-bold text-sm">Área Sensível</h4>
                   <p className="text-orange-500/70 text-xs mt-1">Alterar senha pode desconectar outros dispositivos.</p>
                 </div>
               </div>

               <div className="space-y-4">
                 <div>
                   <label className="text-xs text-gray-500 font-bold ml-1 mb-1 block">Nova Senha</label>
                   <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none" />
                 </div>
                 <div>
                   <label className="text-xs text-gray-500 font-bold ml-1 mb-1 block">Confirmar</label>
                   <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none" />
                 </div>
               </div>

               <button 
                 onClick={handleChangePassword} 
                 disabled={loading || !password}
                 className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition border border-gray-600 flex items-center justify-center gap-2"
               >
                 {loading ? <Loader2 className="animate-spin"/> : "Atualizar Senha"}
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}