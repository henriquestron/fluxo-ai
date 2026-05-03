import React, { useState, useEffect } from 'react';
import { X, Megaphone, CheckCircle2, PlayCircle, Sparkles, ChevronLeft, ChevronRight, Image as ImageIcon, Loader2 } from 'lucide-react';
import { supabase } from '@/supabase';

interface ChangelogModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: any; // Mantido por compatibilidade caso o banco demore a responder
}

export default function ChangelogModal({ isOpen, onClose, data }: ChangelogModalProps) {
    const [saving, setSaving] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [loadingLogs, setLoadingLogs] = useState(true);

    // 🟢 Busca o histórico de novidades assim que o modal abre
    useEffect(() => {
        if (isOpen) {
            fetchLogs();
        }
    }, [isOpen]);

    const fetchLogs = async () => {
        setLoadingLogs(true);
        const { data: fetchedLogs } = await supabase
            .from('changelogs')
            .select('*')
            .order('created_at', { ascending: false });

        if (fetchedLogs && fetchedLogs.length > 0) {
            setLogs(fetchedLogs);
        }
        setLoadingLogs(false);
    };

    if (!isOpen || (!data && logs.length === 0)) return null;

    // 🟢 DADOS ATUAIS (Usa o banco ou faz fallback pro props data)
    const currentLog = logs.length > 0 ? logs[currentIndex] : null;
    const displayVersion = currentLog?.version || data?.latest_changelog_version || "Novidade";
    const displayTitle = currentLog?.title || data?.changelog_title || "Chegou novidade no Meu Aliado!";
    const displayContent = currentLog?.content || data?.changelog_text || "Temos novos recursos disponíveis para você aproveitar.";
    const displayVideo = currentLog?.video_url || data?.changelog_video_url;
    const displayImage = currentLog?.image_url;

    // 🟢 FUNÇÃO QUE SALVA NO BANCO O VISTO
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

            // Sempre salva a versão mais recente (index 0) para não mostrar de novo
            const latestVersionToSave = logs.length > 0 ? logs[0].version : data.latest_changelog_version;

            const { error: dbError } = await supabase
                .from('profiles')
                .update({ last_seen_changelog: latestVersionToSave })
                .eq('id', user.id);

            if (dbError) {
                console.error("Erro ao atualizar o perfil no banco:", dbError);
            }

        } catch (error) {
            console.error("Erro inesperado ao salvar visualização do changelog:", error);
        } finally {
            setSaving(false);
            onClose(); 
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

    const embedUrl = getEmbedUrl(displayVideo);
    const showNativePlayer = isDirectVideo(displayVideo);

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-[500] flex items-center justify-center p-4 animate-in fade-in duration-300">
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-3xl w-full max-w-2xl shadow-2xl animate-in zoom-in-95 duration-300 relative max-h-[90vh] flex flex-col overflow-hidden">
                
                {/* HEADER */}
                <div className="bg-gradient-to-r from-fuchsia-900/40 to-purple-900/20 p-6 border-b border-gray-800 flex items-start gap-4 shrink-0">
                    <div className="bg-fuchsia-500/20 p-3 rounded-2xl border border-fuchsia-500/30 text-fuchsia-400 shrink-0 shadow-lg shadow-fuchsia-900/20">
                        <Megaphone size={28} />
                    </div>
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-fuchsia-500 text-black text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest shadow-md">
                                {displayVersion}
                            </span>
                            {currentIndex === 0 && (
                                <span className="text-xs text-fuchsia-400 font-bold flex items-center gap-1"><Sparkles size={12}/> Mais Recente</span>
                            )}
                        </div>
                        <h2 className="text-2xl font-bold text-white leading-tight">
                            {displayTitle}
                        </h2>
                    </div>
                    <button onClick={handleAcknowledge} className="text-gray-500 hover:text-white transition bg-black/20 p-2 rounded-full shrink-0">
                        <X size={20} />
                    </button>
                </div>

                {/* CONTEÚDO */}
                <div className="p-6 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 space-y-6 flex-1">
                    {loadingLogs ? (
                        <div className="flex flex-col items-center justify-center py-10 text-fuchsia-500 gap-2">
                            <Loader2 className="animate-spin" size={32} />
                            <span className="text-sm font-bold text-gray-500">Carregando novidades...</span>
                        </div>
                    ) : (
                        <>
                            {/* 🟢 IMAGEM DA ATUALIZAÇÃO */}
                            {displayImage && (
                                <div className="w-full rounded-2xl overflow-hidden border border-gray-800 shadow-xl bg-black mb-6">
                                    <img src={displayImage} alt="Atualização" className="w-full h-auto object-contain max-h-[300px] border-b border-gray-800/50" />
                                </div>
                            )}

                            {/* TEXTO */}
                            <div className="text-gray-300 text-sm md:text-base leading-relaxed whitespace-pre-wrap">
                                {displayContent}
                            </div>

                            {/* VÍDEO */}
                            {displayVideo && (
                                <div className="mt-6 border-t border-gray-800 pt-6">
                                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                                        <PlayCircle size={14} className="text-fuchsia-500" /> Demonstração em Vídeo
                                    </h3>
                                    
                                    {showNativePlayer ? (
                                        <div className="w-full rounded-2xl overflow-hidden border border-gray-800 shadow-xl bg-black">
                                            <video 
                                                src={displayVideo} 
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
                                            href={displayVideo} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-fuchsia-400 border border-gray-700 p-4 rounded-xl font-bold transition shadow-lg w-full"
                                        >
                                            <PlayCircle size={20} /> Assistir Vídeo da Atualização
                                        </a>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* FOOTER COM NAVEGAÇÃO DE HISTÓRICO */}
                <div className="p-4 sm:p-6 bg-[#111] border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-4 shrink-0">
                    
                    {/* CONTROLES DE NAVEGAÇÃO */}
                    
                    <div className="flex items-center gap-3 w-full sm:w-auto justify-center sm:justify-start">
                        {/* 🟢 SETA ESQUERDA (Volta para a nota mais recente / index menor) */}
                        <button 
                            onClick={() => setCurrentIndex(prev => prev - 1)} 
                            disabled={currentIndex === 0}
                            className="p-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center justify-center"
                            title="Nota Mais Recente"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        
                        <span className="text-xs font-bold text-gray-600 font-mono tracking-widest uppercase">
                            {logs.length > 0 ? `${currentIndex + 1} de ${logs.length}` : '1 de 1'}
                        </span>
                        
                        {/* 🟢 SETA DIREITA (Avança para a nota mais antiga / index maior) */}
                        <button 
                            onClick={() => setCurrentIndex(prev => prev + 1)} 
                            disabled={currentIndex >= logs.length - 1}
                            className="p-2 rounded-lg bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center justify-center"
                            title="Nota Anterior"
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* BOTÃO PRINCIPAL */}
                    <button 
                        onClick={handleAcknowledge} 
                        disabled={saving || loadingLogs}
                        className="w-full sm:w-auto bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold py-3 px-8 rounded-xl transition shadow-lg shadow-fuchsia-900/20 flex items-center justify-center gap-2"
                    >
                        {saving ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />} 
                        {saving ? "Salvando..." : "Incrível, Entendi!"}
                    </button>
                </div>
            </div>
        </div>
    );
}