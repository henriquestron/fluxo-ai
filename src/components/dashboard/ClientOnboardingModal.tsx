import React, { useState } from 'react';
import { X, ShieldCheck, User, FileText, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface ClientOnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (name: string, cpf: string) => Promise<void>;
    consultantName?: string;
}

export default function ClientOnboardingModal({ isOpen, onClose, onConfirm, consultantName = "seu consultor" }: ClientOnboardingModalProps) {
    const [name, setName] = useState('');
    const [cpf, setCpf] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    // 🟢 MÁSCARA DE CPF EM TEMPO REAL
    const handleCpfChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, ''); // Remove tudo que não é número
        
        if (value.length <= 11) {
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        }
        setCpf(value);
    };

    const handleSave = async () => {
        if (name.trim().length < 5) {
            toast.warning("Por favor, insira seu nome completo.");
            return;
        }
        if (cpf.replace(/\D/g, '').length !== 11) {
            toast.warning("Por favor, insira um CPF válido com 11 dígitos.");
            return;
        }

        setIsSaving(true);
        try {
            // A função onConfirm vai fazer o update no banco e aceitar o convite
            await onConfirm(name, cpf);
            toast.success("Dados salvos e conta vinculada com sucesso! 🎉");
            onClose();
        } catch (error: any) {
            console.error("Erro no onboarding:", error);
            toast.error("Ocorreu um erro ao salvar. Tente novamente.");
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-[#111] border border-gray-800 w-full max-w-md rounded-3xl shadow-2xl relative overflow-hidden">
                
                {/* HEADER BLINDADO */}
                <div className="p-6 border-b border-gray-800 bg-[#0a0a0a] flex items-center gap-4">
                    <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20">
                        <ShieldCheck className="text-emerald-500" size={28} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Quase lá!</h2>
                        <p className="text-gray-400 text-xs mt-1">
                            Complete seu perfil para vincular sua conta.
                        </p>
                    </div>
                    <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-white transition bg-gray-900 p-2 rounded-full">
                        <X size={18} />
                    </button>
                </div>

                {/* CORPO DO FORMULÁRIO */}
                <div className="p-6 space-y-5">
                    <div className="bg-cyan-900/10 border border-cyan-500/20 p-4 rounded-xl flex items-start gap-3">
                        <FileText className="text-cyan-500 shrink-0 mt-0.5" size={18} />
                        <p className="text-xs text-gray-300 leading-relaxed">
                            Para gerar seu <strong>Contrato de Consultoria</strong> com {consultantName}, precisamos dos seus dados oficiais. Eles são criptografados e protegidos pela LGPD.
                        </p>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1 block mb-1">Nome Completo</label>
                        <div className="relative">
                            <User className="absolute left-3 top-3.5 text-gray-600" size={18} />
                            <input 
                                type="text" 
                                placeholder="Digite seu nome completo..." 
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-emerald-500 outline-none transition"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase ml-1 block mb-1">CPF</label>
                        <div className="relative">
                            <FileText className="absolute left-3 top-3.5 text-gray-600" size={18} />
                            <input 
                                type="text" 
                                placeholder="000.000.000-00" 
                                value={cpf}
                                onChange={handleCpfChange}
                                maxLength={14}
                                className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-10 pr-4 text-white focus:border-emerald-500 outline-none transition font-mono"
                            />
                        </div>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="p-6 border-t border-gray-800 bg-[#0a0a0a]">
                    <button 
                        onClick={handleSave} 
                        disabled={isSaving || name.length < 5 || cpf.length !== 14}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-800 disabled:text-gray-500 text-white font-bold py-3.5 rounded-xl transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                    >
                        {isSaving ? (
                            <><Loader2 className="animate-spin" size={20} /> Salvando e Vinculando...</>
                        ) : (
                            <><CheckCircle2 size={20} /> Confirmar e Vincular Conta</>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}