import React, { useState, useRef, useEffect } from 'react';
import { X, Sparkles, Loader2, Send, FileText, Paperclip, CheckCircle2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AiAssistantModalProps {
    isOpen: boolean;
    onClose: () => void;
    chatHistory: any[];
    isLoading: boolean;
    onSendMessage: (text: string, fileBase64: string | null) => void;
    userPlan: string;
}

export default function AiAssistantModal({ isOpen, onClose, chatHistory, isLoading, onSendMessage, userPlan }: AiAssistantModalProps) {
    const [aiInput, setAiInput] = useState('');
    const [attachment, setAttachment] = useState<{ base64: string, type: 'image' | 'pdf' } | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Scroll automático quando chega mensagem nova
    useEffect(() => {
        if (isOpen) {
            chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }
    }, [chatHistory, isOpen]);

    // Lógica de Arquivo (Imagem/PDF)
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = (event) => setAttachment({ base64: event.target?.result as string, type: 'pdf' });
            reader.readAsDataURL(file);
            return;
        }

        // Se for imagem, comprime
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target?.result as string;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_SIZE = 1024;
                
                if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
                else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);
                const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
                setAttachment({ base64: compressedBase64, type: 'image' });
            };
        };
        reader.readAsDataURL(file);
    };

    const handleSend = () => {
        if (!aiInput.trim() && !attachment) return;
        onSendMessage(aiInput, attachment?.base64 || null);
        setAiInput('');
        setAttachment(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
            <div className="bg-[#0f0f13] border border-gray-700 w-full max-w-2xl h-[600px] rounded-3xl shadow-2xl flex flex-col relative overflow-hidden">
                
                {/* HEADER */}
                <div className="p-6 border-b border-gray-800 bg-[#111] flex justify-between items-center z-10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-900/30 rounded-lg">
                            <Sparkles size={20} className="text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Consultor IA</h2>
                            <p className="text-xs text-gray-400">Powered by Gemini 1.5 Flash</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white p-2 hover:bg-white/10 rounded-full transition"><X size={20} /></button>
                </div>

                {/* CHAT AREA */}
                <div className="flex-1 p-6 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-gray-800 bg-[#0f0f13]">
                    {chatHistory.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-50 p-8">
                            <Sparkles size={48} className="text-purple-500 mb-4" />
                            <h3 className="text-white font-bold mb-2">Como posso ajudar?</h3>
                            <p className="text-sm text-gray-400">Envie um comprovante, pergunte sobre seus gastos ou peça dicas.</p>
                        </div>
                    ) : (
                        chatHistory.map((msg, idx) => (
                            <div key={idx} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                {msg.role !== 'user' && (
                                    <div className="w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center mr-3 mt-1 shrink-0 border border-purple-500/30"><Sparkles size={14} className="text-purple-400" /></div>
                                )}
                                <div className={`max-w-[85%] p-4 rounded-2xl text-sm shadow-lg ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-tr-none' : 'bg-gray-800 text-gray-100 rounded-tl-none border border-gray-700'}`}>
                                    {msg.type === 'image' && <div className="flex items-center gap-2 mb-2 bg-black/20 p-2 rounded"><FileText size={14} /> Comprovante enviado</div>}
                                    <div className="markdown-content">
                                        <ReactMarkdown components={{
                                            p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                                            strong: ({ node, ...props }) => <strong className="font-bold text-purple-300" {...props} />,
                                            ul: ({ node, ...props }) => <ul className="list-disc ml-5 mb-2 space-y-1" {...props} />,
                                            li: ({ node, ...props }) => <li className="pl-1" {...props} />
                                        }}>{msg.content}</ReactMarkdown>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    {isLoading && (
                        <div className="flex justify-start w-full">
                            <div className="w-8 h-8 rounded-full bg-purple-900/50 flex items-center justify-center mr-3"><Sparkles size={14} className="text-purple-400 animate-pulse" /></div>
                            <div className="bg-gray-800 text-gray-200 rounded-2xl p-4 flex items-center gap-3 border border-gray-700 rounded-tl-none">
                                <Loader2 size={18} className="animate-spin text-purple-500" />
                                <span className="text-xs font-bold animate-pulse text-purple-300">Escrevendo...</span>
                            </div>
                        </div>
                    )}
                    <div ref={chatEndRef} />
                </div>

                {/* INPUT AREA */}
                <div className="p-4 border-t border-gray-800 bg-[#111]">
                    {attachment && (
                        <div className="mb-3 flex items-start animate-in slide-in-from-bottom-2">
                            <div className="relative group">
                                {attachment.type === 'image' ? <img src={attachment.base64} className="h-16 w-16 object-cover rounded-xl border border-gray-700" /> : <div className="h-16 w-16 bg-gray-800 rounded-xl border border-gray-700 flex items-center justify-center text-red-400"><FileText size={24} /></div>}
                                <button onClick={() => { setAttachment(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="absolute -top-2 -right-2 bg-gray-900 border border-gray-600 text-gray-400 hover:text-white rounded-full p-1"><X size={12} /></button>
                            </div>
                            <div className="ml-3 mt-1"><p className="text-xs text-emerald-500 font-bold flex items-center gap-1"><CheckCircle2 size={12} /> Arquivo pronto</p></div>
                        </div>
                    )}
                    <div className="flex gap-2 items-end">
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileSelect} />
                        <button onClick={() => fileInputRef.current?.click()} className={`p-3 rounded-xl border transition mb-[2px] ${attachment ? 'bg-emerald-900/20 text-emerald-500 border-emerald-500/50' : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'}`}><Paperclip size={20} /></button>
                        <textarea value={aiInput} onChange={(e) => setAiInput(e.target.value)} placeholder={attachment ? "Descreva..." : "Digite ou envie comprovante..."} className="flex-1 bg-gray-900 text-white border border-gray-800 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500/50 resize-none h-12 max-h-32 scrollbar-hide" style={{ minHeight: '48px' }} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }} />
                        <button onClick={handleSend} disabled={isLoading || (!aiInput.trim() && !attachment)} className="bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white p-3 rounded-xl transition mb-[2px]">{isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}