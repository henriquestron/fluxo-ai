import React, { useState } from 'react';
import { X, Megaphone, CheckCircle2, PlayCircle, Sparkles } from 'lucide-react';
import { supabase } from '@/supabase';

interface ChangelogModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any;
}

export default function ChangelogModal({ isOpen, onClose, data }: ChangelogModalProps) {
    const [saving, setSaving] = useState(false);

    if (!isOpen || !data) return null;

    // 🟢 FUNÇÃO QUE SALVA NO BANCO (AGORA CHAMADA TANTO PELO BOTÃO QUANTO PELO 'X')
    const handleAcknowledge = async () => {
        setSaving(true);
        try {
            const { data: { user }, error: authError } = await supabase.auth.getUser();
            
            if (authError || !user) {
                console.error("Sessão não encontrada ao tentar salvar o changelog.");
                setSaving(false);
                onClose();
                return;
            }

            const { error: dbError } = await supabase
                .from('profiles')
                .update({ last_seen_changelog: data.latest_changelog_version })
                .eq('id', user.id);

            if (dbError) {
                console.error("Erro ao atualizar o perfil no banco:", dbError);
            }

        } catch (error) {
            console.error("Erro inesperado ao salvar visualização do changelog:", error);
        } finally {
            setSaving(false);
            onClose(); // Fecha o modal no final de tudo
        }
    };

    const getEmbedUrl = (url: string) => {
        if (!url) return null;
        if (url.includes('youtube.com/watch?v=')) {
            return url.replace('watch?v=', 'embed/').split('&')[0];
        }
        if (url.includes('youtu.be/')) {
            return url.replace('youtu.be/', 'youtube.com/embed/').split('?')[0];
        }
        return null;
    };

    const isDirectVideo = (url: string) => {
        if (!url) return false;
        return url.toLowerCase().includes('cloudinary.com') || url.toLowerCase().endsWith('.mp4');
    };

    const embedUrl = getEmbedUrl(data.changelog_video_url);
    const showNativePlayer = isDirectVideo(data.changelog_video_url);

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[500] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-3xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300 relative max-h-[90vh] flex flex-col overflow-hidden">
                
                {/* HEADER */}
                <div className="bg-gradient-to-r from-fuchsia-900/40 to-purple-900/20 p-6 border-b border-gray-800 flex items-start gap-4">
                    <div className="bg-fuchsia-500/20 p-3 rounded-2xl border border-fuchsia-500/30 text-fuchsia-400 shrink-0 shadow-lg shadow-fuchsia-900/20">
                        <Megaphone size={28} />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-fuchsia-500 text-black text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest shadow-md">
                                {data.latest_changelog_version || "Novidade"}
                            </span>
                            <span className="text-xs text-fuchsia-400 font-bold flex items-center gap-1"><Sparkles size={12}/> Nova Atualização</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white leading-tight">
                            {data.changelog_title || "Chegou novidade no Meu Aliado!"}
                        </h2>
                    </div>
                    {/* 🟢 CORREÇÃO AQUI: O botão 'X' agora chama o handleAcknowledge */}
                    <button onClick={handleAcknowledge} className="text-gray-500 hover:text-white transition bg-black/20 p-2 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {/* CONTEÚDO */}
                <div className="p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 space-y-6">
                    
                    <div className="text-gray-300 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                        {data.changelog_text || "Temos novos recursos disponíveis para você aproveitar."}
                    </div>

                    {data.changelog_video_url && (
                        <div className="mt-6 border-t border-gray-800 pt-6">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <PlayCircle size={14} className="text-fuchsia-500" /> Demonstração em Vídeo
                            </h3>
                            
                            {showNativePlayer ? (
                                <div className="w-full rounded-2xl overflow-hidden border border-gray-800 shadow-xl bg-black">
                                    <video 
                                        src={data.changelog_video_url} 
                                        controls 
                                        preload="metadata"
                                        className="w-full h-auto max-h-[350px] object-contain outline-none"
                                    >
                                        Seu navegador não suporta vídeos HTML5.
                                    </video>
                                </div>
                            ) : embedUrl ? (
                                <div className="aspect-video w-full rounded-2xl overflow-hidden border border-gray-800 shadow-xl bg-black">
                                    <iframe 
                                        src={embedUrl} 
                                        className="w-full h-full" 
                                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                                        allowFullScreen
                                    ></iframe>
                                </div>
                            ) : (
                                <a 
                                    href={data.changelog_video_url} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-fuchsia-400 border border-gray-700 p-4 rounded-xl font-bold transition shadow-lg w-full"
                                >
                                    <PlayCircle size={20} /> Assistir Vídeo da Atualização
                                </a>
                            )}
                        </div>
                    )}
                </div>

                {/* FOOTER */}
                <div className="p-6 bg-[#111] border-t border-gray-800 flex justify-end">
                    <button 
                        onClick={handleAcknowledge} 
                        disabled={saving}
                        className="w-full sm:w-auto bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-3 px-8 rounded-xl transition shadow-lg shadow-fuchsia-900/20 flex items-center justify-center gap-2"
                    >
                        <CheckCircle2 size={18} /> {saving ? "Salvando..." : "Incrível, Entendi!"}
                    </button>
                </div>
            </div>
        </div>
    );
}