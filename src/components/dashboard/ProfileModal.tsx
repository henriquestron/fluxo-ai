import React, { useState, useEffect } from 'react';
import { X, User, Lock, Camera, Save, Loader2, Mail } from 'lucide-react';
import { supabase } from '@/supabase';
import { toast } from 'sonner';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
}

export default function ProfileModal({ isOpen, onClose, user }: ProfileModalProps) {
  if (!isOpen || !user) return null;

  const [activeTab, setActiveTab] = useState<'details' | 'security'>('details');
  const [fullName, setFullName] = useState(user.user_metadata?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(user.user_metadata?.avatar_url || '');
  
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Upload de Foto de Perfil
  const handleAvatarUpload = async (e: any) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `avatar_${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `avatars/${fileName}`;

      // 1. Upload para o Supabase Storage
      const { error: uploadError } = await supabase.storage.from('comprovantes').upload(filePath, file); // Usando o bucket existente 'comprovantes' para facilitar
      if (uploadError) throw uploadError;

      // 2. Pegar URL Pública
      const { data } = supabase.storage.from('comprovantes').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
      toast.success("Foto carregada! Clique em Salvar para confirmar.");

    } catch (error: any) {
      toast.error("Erro no upload: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Salvar Dados (Nome e Foto)
  const handleUpdateProfile = async () => {
    setLoading(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName, avatar_url: avatarUrl }
    });

    if (error) {
      toast.error("Erro ao atualizar perfil.");
    } else {
      toast.success("Perfil atualizado com sucesso!");
      // Força um reload suave para atualizar o header
      window.location.reload(); 
    }
    setLoading(false);
  };

  // Trocar Senha
  const handleChangePassword = async () => {
    if (password !== confirmPassword) {
      return toast.warning("As senhas não coincidem.");
    }
    if (password.length < 6) {
      return toast.warning("A senha deve ter no mínimo 6 caracteres.");
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: password });

    if (error) {
      toast.error("Erro ao trocar senha: " + error.message);
    } else {
      toast.success("Senha alterada! Use a nova senha no próximo login.");
      setPassword('');
      setConfirmPassword('');
    }
    setLoading(false);
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

        {/* CONTEÚDO */}
        <div className="p-8 overflow-y-auto">
          
          {/* ABA 1: DADOS */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              
              {/* AVATAR UPLOAD */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative group cursor-pointer">
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

              {/* INPUTS */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 font-bold ml-1 mb-1 block">Nome de Exibição</label>
                  <input 
                    type="text" 
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Como você quer ser chamado?"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-bold ml-1 mb-1 block">E-mail (Não alterável)</label>
                  <div className="w-full bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-gray-400 flex items-center gap-2 cursor-not-allowed">
                    <Mail size={16}/> {user.email}
                  </div>
                </div>
              </div>

              <button 
                onClick={handleUpdateProfile} 
                disabled={loading || uploading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-purple-900/20 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="animate-spin"/> : <><Save size={18}/> Salvar Alterações</>}
              </button>
            </div>
          )}

          {/* ABA 2: SEGURANÇA */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-orange-500/10 border border-orange-500/20 p-4 rounded-xl flex items-start gap-3">
                <Lock className="text-orange-500 mt-1" size={20}/>
                <div>
                  <h4 className="text-orange-400 font-bold text-sm">Área Sensível</h4>
                  <p className="text-orange-500/70 text-xs mt-1">Ao alterar sua senha, você pode ser desconectado de outros dispositivos.</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 font-bold ml-1 mb-1 block">Nova Senha</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="No mínimo 6 caracteres"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-bold ml-1 mb-1 block">Confirmar Nova Senha</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Digite novamente"
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-purple-500 outline-none transition"
                  />
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