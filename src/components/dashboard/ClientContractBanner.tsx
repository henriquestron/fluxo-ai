import React, { useState } from 'react';
import { FileSignature, Download, FileUp, Loader2, CheckCircle } from 'lucide-react';
import { supabase } from '@/supabase';
import { toast } from 'sonner';

interface ClientContractBannerProps {
    contractUrl: string;
    managerClientId: number; // O ID da linha na tabela manager_clients
    onUploadSuccess: () => void;
}

export default function ClientContractBanner({ contractUrl, managerClientId, onUploadSuccess }: ClientContractBannerProps) {
    const [isUploading, setIsUploading] = useState(false);

    const handleClientUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const fileName = `contrato_finalizado_${managerClientId}_${Date.now()}.pdf`;
            
            // 1. Sobe a versão final com as duas assinaturas
            const { error: uploadError } = await supabase.storage
                .from('contracts')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // 2. Pega a URL nova
            const { data: { publicUrl } } = supabase.storage.from('contracts').getPublicUrl(fileName);

            // 3. Atualiza o banco sobrescrevendo com a versão final
            const { error: dbError } = await supabase
                .from('manager_clients')
                .update({ contract_url: publicUrl, status: 'contract_signed' }) // Pode mudar o status para saber que fechou 100%
                .eq('id', managerClientId);

            if (dbError) throw dbError;

            toast.success("Contrato finalizado enviado! Tudo certo.");
            onUploadSuccess(); // Recarrega os dados da tela
        } catch (error: any) {
            toast.error("Erro ao enviar: " + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    if (!contractUrl) return null;

    return (
        <div className="max-w-4xl mx-auto mb-6 animate-in slide-in-from-top-4">
            <div className="bg-cyan-900/20 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-[0_0_20px_rgba(6,182,212,0.15)]">
                
                <div className="flex items-center gap-4 text-center md:text-left w-full md:w-auto">
                    <div className="hidden sm:flex bg-cyan-500 text-black p-3 rounded-xl shrink-0">
                        <FileSignature size={24} />
                    </div>
                    <div>
                        <h3 className="text-cyan-400 font-bold text-sm uppercase tracking-wider">Ação Necessária: Contrato de Consultoria</h3>
                        <p className="text-gray-300 text-sm mt-1">
                            Seu consultor enviou o contrato. Baixe, assine digitalmente e envie a versão final.
                        </p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    {/* Botão de Baixar */}
                    <a 
                        href={contractUrl}
                        target="_blank"
                        className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2.5 rounded-xl font-bold transition text-sm flex items-center justify-center gap-2 border border-gray-700 whitespace-nowrap"
                    >
                        <Download size={16} /> Baixar PDF
                    </a>

                    {/* Botão de Enviar (Upload) */}
                    <label className="bg-cyan-600 hover:bg-cyan-500 text-white px-4 py-2.5 rounded-xl font-bold transition shadow-lg text-sm flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap">
                        <input type="file" accept=".pdf" className="hidden" onChange={handleClientUpload} disabled={isUploading} />
                        {isUploading ? <Loader2 className="animate-spin" size={16} /> : <FileUp size={16} />}
                        {isUploading ? 'Enviando...' : 'Enviar Assinado'}
                    </label>
                </div>

            </div>
        </div>
    );
}