import React, { useEffect, useState } from 'react';
import { X, Briefcase, Users, Lock, FileSpreadsheet, Loader2 } from 'lucide-react';
import { supabase } from '@/supabase';

interface ConsultantPricingModalProps {
    isOpen: boolean;
    onClose: () => void;
    handleCheckout: (plan: 'AGENT') => void;
}

export default function ConsultantPricingModal({ isOpen, onClose, handleCheckout }: ConsultantPricingModalProps) {
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (isOpen) {
            fetchSettings();
        }
    }, [isOpen]);

    async function fetchSettings() {
        setLoading(true);
        const { data } = await supabase.from('app_settings').select('*').single();
        if (data) setSettings(data);
        setLoading(false);
    }

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] overflow-y-auto bg-black/95 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="relative w-full max-w-2xl animate-in zoom-in duration-300">
                
                <button onClick={onClose} className="absolute -top-12 right-0 md:-right-12 md:-top-4 text-gray-400 hover:text-white p-2 bg-gray-900/50 md:bg-transparent rounded-full z-50 transition">
                    <X size={24} className="md:w-8 md:h-8" />
                </button>

                {loading || !settings ? (
                    <div className="flex flex-col items-center justify-center h-64 bg-[#0a0a0a] rounded-3xl border border-gray-800">
                        <Loader2 className="w-12 h-12 text-amber-500 animate-spin mb-4" />
                        <p className="text-gray-400">Carregando seu plano profissional...</p>
                    </div>
                ) : (
                    <div className="bg-[#0f0f13] border border-amber-500/30 p-8 md:p-12 rounded-3xl relative overflow-hidden flex flex-col items-center shadow-2xl shadow-amber-900/20 text-center">
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-amber-600/20 rounded-full blur-3xl pointer-events-none"></div>
                        
                        <div className="relative z-10 w-full flex flex-col items-center">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-900/30 border border-amber-500/50 text-amber-500 text-xs font-bold uppercase tracking-wider mb-6">
                                <Briefcase size={14} /> Licença Profissional
                            </div>
                            
                            <h2 className="text-3xl md:text-5xl font-black text-white mb-4">Plano Agent</h2>
                            <p className="text-gray-400 mb-8 max-w-md mx-auto text-sm md:text-base leading-relaxed">
                                {settings.desc_agent || "Desbloqueie o painel completo para gerenciar seus clientes, contratos e roteamento de IA."}
                            </p>
                            
                            <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-300 font-bold bg-black/50 py-4 px-6 rounded-2xl w-full border border-gray-800 mb-8">
                                <span className="flex items-center gap-2"><Users size={16} className="text-amber-500" /> Gestão de Carteira</span>
                                <span className="flex items-center gap-2"><Lock size={16} className="text-amber-500" /> Acesso Admin VIP</span>
                                <span className="flex items-center gap-2"><FileSpreadsheet size={16} className="text-amber-500" /> Contratos White-label</span>
                            </div>
                            
                            {/* PREÇO DINÂMICO */}
                            <div className="text-4xl md:text-5xl font-black text-white mb-8">
                                {settings.is_promo_active ? (
                                    <div className="flex flex-col items-center">
                                        <span className="text-lg line-through text-gray-500 font-normal mb-1">R$ {settings.price_agent_normal}</span>
                                        <span>R$ {settings.price_agent_promo}<span className="text-lg font-normal text-gray-500">/mês</span></span>
                                    </div>
                                ) : (
                                    <span>R$ {settings.price_agent_normal}<span className="text-lg font-normal text-gray-500">/mês</span></span>
                                )}
                            </div>

                            <button onClick={() => handleCheckout('AGENT')} className="w-full max-w-sm px-8 py-5 bg-amber-600 hover:bg-amber-500 text-white text-lg font-bold rounded-xl transition shadow-lg shadow-amber-900/30">
                                Ativar Assinatura
                            </button>
                            
                            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-gray-500">
                                <Lock size={12} /> Pagamento 100% Seguro
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}