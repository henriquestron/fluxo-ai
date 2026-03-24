import React, { useState } from 'react';
import { X, UploadCloud, FileSpreadsheet, Loader2, CheckCircle2, ArrowRight, Trash2, Info, ImageIcon, MessageSquare, AlertTriangle } from 'lucide-react';
import * as XLSX from 'xlsx';
import { toast } from 'sonner';

interface ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    workspaceId: string;
    onSuccess: () => void;
    supabase: any;
}

const CATEGORIES = ["Alimentação", "Moradia", "Transporte", "Saúde", "Lazer", "Educação", "Fixa", "Eletrônicos", "Outros"];

export default function ImportModal({ isOpen, onClose, userId, workspaceId, onSuccess, supabase }: ImportModalProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [statusText, setStatusText] = useState("");
    
    // Novos estados para o modo Multimodal
    const [textInput, setTextInput] = useState("");
    const [showInfo, setShowInfo] = useState(false);
    const [reviewData, setReviewData] = useState<any>(null);

    const callAI = async (payload: any) => {
        setIsProcessing(true);
        try {
            // 🔴 1. PEGA O CRACHÁ (TOKEN) DO USUÁRIO LOGADO
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) {
                toast.error("Sua sessão expirou. Recarregue a página e tente novamente.");
                return;
            }

            // 🔴 2. ENVIA O ARQUIVO JUNTO COM O CRACHÁ DE SEGURANÇA
            const response = await fetch('/api/import-spreadsheet', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}` // ✅ A MÁGICA ACONTECE AQUI!
                },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.success) {
                setStatusText("Pronto!");
                setReviewData(result.data);
            } else {
                throw new Error(result.error || "Erro desconhecido ao processar.");
            }
        } catch (error: any) {
            console.error("Erro na importação:", error);
            // Mostra o erro exato que o backend retornou (ex: "Imagem muito grande", "Apenas plano Pro", etc)
            toast.error(error.message || "Erro ao ler os dados. Verifique o arquivo e tente novamente.");
            setStatusText("Houve um erro na leitura.");
        } finally {
            setIsProcessing(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setStatusText(`Analisando ${file.name}... 🤖`);
        
        // Se for Excel/CSV
        if (file.name.endsWith('.xlsx') || file.name.endsWith('.csv')) {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const rawJsonData = XLSX.utils.sheet_to_json(worksheet);
            callAI({ rawData: rawJsonData });
        } 
        // Se for Imagem (Foto de caderno, print, recibo)
        else if (file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onload = () => {
                callAI({ imageBase64: reader.result as string, mimeType: file.type });
            };
            reader.readAsDataURL(file);
        } else {
            toast.error("Formato de arquivo não suportado.");
            setStatusText("");
        }
    };

    const handleTextSubmit = () => {
        if (!textInput.trim()) return;
        setStatusText("Lendo suas anotações... 🤖");
        callAI({ textData: textInput });
    };

    // 🟢 FUNÇÕES PARA EDITAR AS CONTAS NA TELA
    const handleEditItem = (table: string, index: number, field: string, value: any) => {
        const newData = { ...reviewData };
        newData[table][index][field] = value;
        setReviewData(newData);
    };

    const handleRemoveItem = (table: string, index: number) => {
        const newData = { ...reviewData };
        newData[table].splice(index, 1);
        setReviewData(newData);
    };

    // FUNÇÃO PARA SALVAR NO BANCO
    // 🟢 FUNÇÃO PARA SALVAR NO BANCO (BLINDADA CONTRA ERROS DO SUPABASE)
    const handleSaveToDatabase = async () => {
        if (!reviewData) return;
        setIsSaving(true);
        const toastId = toast.loading("Salvando contas no banco de dados..."); 

        try {
            const now = new Date();
            let hasError = false;

            // 1. SALVAR AVULSAS
            if (reviewData.transactions?.length > 0) {
                const transPayload = reviewData.transactions.map((t: any) => ({
                    title: t.title,
                    amount: t.amount,
                    type: t.type || 'expense',
                    category: t.category || 'Outros',
                    date: t.date || new Date().toLocaleDateString('pt-BR'),
                    user_id: userId, 
                    context: workspaceId, 
                    created_at: now, 
                    status: 'paid', 
                    is_paid: true
                }));
                const { error } = await supabase.from('transactions').insert(transPayload);
                if (error) { console.error("Erro nas Avulsas:", error); hasError = true; }
            }

            // 2. SALVAR FIXAS
            if (reviewData.recurring?.length > 0) {
                const recPayload = reviewData.recurring.map((r: any) => ({
                    title: r.title,
                    value: r.value !== undefined ? r.value : (r.amount || 0),
                    type: r.type || 'expense',
                    category: r.category || 'Fixa',
                    due_day: r.due_day || 10,
                    user_id: userId, 
                    context: workspaceId, 
                    created_at: now, 
                    status: 'active'
                }));
                const { error } = await supabase.from('recurring').insert(recPayload);
                if (error) { console.error("Erro nas Fixas:", error); hasError = true; }
            }

            // 3. SALVAR PARCELADAS
            if (reviewData.installments?.length > 0) {
                const instPayload = reviewData.installments.map((i: any) => {
                    const qtd = Number(i.installments_count) || 1;
                    const total = Number(i.total_value !== undefined ? i.total_value : (i.amount || i.value || 0));
                    
                    return {
                        title: i.title,
                        total_value: total,
                        installments_count: qtd,
                        value_per_month: i.value_per_month || (total / qtd),
                        due_day: i.due_day || 10,
                        user_id: userId, 
                        context: workspaceId, 
                        created_at: now, 
                        status: 'active', 
                        current_installment: 0,
                        payment_method: 'outros',
                        paid_months: []
                        // 🚫 MÁGICA AQUI: Não mandamos "category" nem "type", senão o Supabase infarta!
                    };
                });
                
                const { error } = await supabase.from('installments').insert(instPayload);
                if (error) { console.error("Erro nas Parceladas:", error); hasError = true; }
            }

            if (hasError) {
                toast.error("Algumas contas deram erro. Verifique o painel.", { id: toastId });
            } else {
                toast.success("Migração concluída com sucesso! 🎉", { id: toastId });
                onSuccess(); // Recarrega o dashboard
                handleClose();
            }
            
        } catch (error) {
            console.error("Erro ao salvar:", error);
            toast.error("Erro geral ao salvar no banco.", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        setReviewData(null);
        setIsProcessing(false);
        setStatusText("");
        setTextInput("");
        setShowInfo(false);
        onClose();
    };

    if (!isOpen) return null;

    const totalFound = reviewData 
        ? (reviewData.transactions?.length || 0) + (reviewData.recurring?.length || 0) + (reviewData.installments?.length || 0)
        : 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <div className={`bg-[#0a0a0a] border border-gray-800 rounded-3xl w-full p-8 relative shadow-2xl transition-all duration-500 ease-in-out ${reviewData ? 'max-w-4xl' : 'max-w-xl'}`}>
                
                <button onClick={handleClose} disabled={isProcessing || isSaving} className="absolute top-4 right-4 text-gray-500 hover:text-white transition disabled:opacity-50 z-10">
                    <X size={20} />
                </button>

                {!reviewData ? (
                    // TELA 1: UPLOAD E TEXTO
                    <div className="animate-in zoom-in-95 duration-300">
                        <div className="flex items-center justify-between mb-6">
                            <div>
                                <h2 className="text-2xl font-black text-white flex items-center gap-2">
                                    <SparklesIcon /> Importação Inteligente
                                </h2>
                                <p className="text-gray-400 text-sm mt-1">Planilhas, fotos ou textos do WhatsApp. A IA cuida do resto.</p>
                            </div>
                            <button onClick={() => setShowInfo(!showInfo)} className="text-cyan-500 hover:bg-cyan-500/10 p-2 rounded-full transition" title="Ver regras de uso">
                                <Info size={24} />
                            </button>
                        </div>

                        {showInfo ? (
                            // TELA DE DICAS
                            <div className="bg-[#111] border border-gray-800 rounded-2xl p-6 mb-2 animate-in fade-in slide-in-from-top-4">
                                <h3 className="text-white font-bold mb-4 flex items-center gap-2"><AlertTriangle size={18} className="text-amber-500"/> Regras para a IA não errar:</h3>
                                <ul className="space-y-3 text-sm text-gray-400">
                                    <li><strong className="text-gray-200">Fotos/Prints:</strong> Evite fotos tremidas. Se a IA não conseguir ler, ela vai ignorar a linha.</li>
                                    <li><strong className="text-gray-200">Textos do WhatsApp:</strong> Tente separar com vírgulas ou linhas. Ex: <span className="bg-gray-800 px-1 rounded text-cyan-400">Mercado 150, Açougue 80 em 2x</span>.</li>
                                    <li><strong className="text-gray-200">O que a IA procura?</strong> Nome da conta, valor e se é parcelado ou fixo.</li>
                                    <li><strong className="text-gray-200">E se ela errar?</strong> Fique tranquilo! Na próxima tela você pode corrigir categorias, valores e parcelas antes de salvar.</li>
                                </ul>
                                <button onClick={() => setShowInfo(false)} className="w-full mt-6 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-xl font-bold transition">Entendi</button>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* DRAG AND DROP - ARQUIVOS */}
                                <div className="relative group">
                                    <input 
                                        type="file" accept=".xlsx, .csv, .png, .jpg, .jpeg" onChange={handleFileUpload} disabled={isProcessing}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                                    />
                                    <div className={`border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-colors ${isProcessing ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-gray-700 bg-[#111] group-hover:border-emerald-500/50 group-hover:bg-emerald-500/5'}`}>
                                        {isProcessing ? <Loader2 size={32} className="text-cyan-400 animate-spin mb-3" /> : (
                                            <div className="flex gap-3 mb-3 text-gray-500 group-hover:text-emerald-400 transition-colors">
                                                <FileSpreadsheet size={28} />
                                                <ImageIcon size={28} />
                                            </div>
                                        )}
                                        <p className="text-sm font-bold text-white mb-1">
                                            {isProcessing ? statusText : 'Clique ou arraste Arquivos / Fotos'}
                                        </p>
                                        <p className="text-xs text-gray-500">Excel, CSV, PNG ou JPG</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 text-gray-600">
                                    <div className="flex-1 h-px bg-gray-800"></div>
                                    <span className="text-xs font-bold uppercase tracking-wider">OU</span>
                                    <div className="flex-1 h-px bg-gray-800"></div>
                                </div>

                                {/* TEXT AREA - WHATSAPP */}
                                <div className="bg-[#111] border border-gray-700 rounded-2xl overflow-hidden focus-within:border-cyan-500/50 transition-colors">
                                    <textarea 
                                        value={textInput}
                                        onChange={(e) => setTextInput(e.target.value)}
                                        disabled={isProcessing}
                                        placeholder="Cole aqui a lista de compras do WhatsApp..."
                                        className="w-full h-24 bg-transparent text-sm text-white p-4 resize-none focus:outline-none placeholder:text-gray-600"
                                    ></textarea>
                                    <div className="bg-gray-900/50 p-2 flex justify-end border-t border-gray-800">
                                        <button 
                                            onClick={handleTextSubmit} 
                                            disabled={isProcessing || !textInput.trim()}
                                            className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:bg-gray-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2"
                                        >
                                            {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <MessageSquare size={14} />}
                                            Processar Texto
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    // TELA 2: LISTA DE CONTAS EDITÁVEIS (AGORA COM CATEGORIA E PARCELAS)
                    <div className="animate-in slide-in-from-right-8 duration-300 flex flex-col max-h-[85vh]">
                        <div className="text-center mb-6 shrink-0">
                            <div className="w-12 h-12 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-cyan-500/20">
                                <CheckCircle2 size={24} className="text-cyan-400" />
                            </div>
                            <h2 className="text-2xl font-black text-white">Revise suas Contas</h2>
                            <p className="text-gray-400 text-sm mt-1">
                                Encontramos <span className="text-white font-bold">{totalFound} contas</span>. Verifique as categorias e parcelas antes de salvar.
                            </p>
                        </div>

                        <div className="flex-1 overflow-y-auto pr-2 mb-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                            
                            {/* AVULSAS */}
                            {reviewData.transactions?.length > 0 && (
                                <div>
                                    <h3 className="text-emerald-400 font-bold mb-3 flex items-center gap-2 border-b border-gray-800 pb-2">Entradas e Saídas Avulsas</h3>
                                    <div className="space-y-2">
                                        {reviewData.transactions.map((item: any, idx: number) => (
                                            <div key={idx} className="flex flex-wrap gap-2 items-center bg-[#111] p-2 rounded-xl border border-gray-800">
                                                <input type="text" value={item.title} onChange={(e) => handleEditItem('transactions', idx, 'title', e.target.value)} className="flex-1 min-w-[120px] bg-transparent border-none text-sm text-white focus:ring-0 px-2" />
                                                
                                                {/* 🟢 SELETOR DE CATEGORIA */}
                                                <select value={item.category || "Outros"} onChange={(e) => handleEditItem('transactions', idx, 'category', e.target.value)} className="w-28 bg-gray-900 border border-gray-700 text-xs text-gray-300 rounded-lg p-1.5 focus:ring-0">
                                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>

                                                <div className="w-24 shrink-0 flex items-center bg-gray-900 rounded-lg px-2 border border-gray-700">
                                                    <span className="text-gray-500 text-xs">R$</span>
                                                    <input type="number" value={item.amount} onChange={(e) => handleEditItem('transactions', idx, 'amount', Number(e.target.value))} className="w-full bg-transparent border-none text-sm text-right text-white focus:ring-0 p-1" />
                                                </div>
                                                <button onClick={() => handleRemoveItem('transactions', idx)} className="text-gray-600 hover:text-red-500 p-2"><Trash2 size={16} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* FIXAS */}
                            {reviewData.recurring?.length > 0 && (
                                <div>
                                    <h3 className="text-cyan-400 font-bold mb-3 flex items-center gap-2 border-b border-gray-800 pb-2">Contas Fixas</h3>
                                    <div className="space-y-2">
                                        {reviewData.recurring.map((item: any, idx: number) => (
                                            <div key={idx} className="flex flex-wrap gap-2 items-center bg-[#111] p-2 rounded-xl border border-gray-800">
                                                <input type="text" value={item.title} onChange={(e) => handleEditItem('recurring', idx, 'title', e.target.value)} className="flex-1 min-w-[120px] bg-transparent border-none text-sm text-white focus:ring-0 px-2" />
                                                
                                                {/* 🟢 SELETOR DE CATEGORIA */}
                                                <select value={item.category || "Fixa"} onChange={(e) => handleEditItem('recurring', idx, 'category', e.target.value)} className="w-28 bg-gray-900 border border-gray-700 text-xs text-gray-300 rounded-lg p-1.5 focus:ring-0">
                                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>

                                                <div className="w-24 shrink-0 flex items-center bg-gray-900 rounded-lg px-2 border border-gray-700">
                                                    <span className="text-gray-500 text-xs">R$</span>
                                                    <input type="number" value={item.value !== undefined ? item.value : (item.amount || 0)} onChange={(e) => handleEditItem('recurring', idx, 'value', Number(e.target.value))} className="w-full bg-transparent border-none text-sm text-right text-white focus:ring-0 p-1" />
                                                </div>
                                                <button onClick={() => handleRemoveItem('recurring', idx)} className="text-gray-600 hover:text-red-500 p-2"><Trash2 size={16} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* PARCELADAS */}
                            {reviewData.installments?.length > 0 && (
                                <div>
                                    <h3 className="text-purple-400 font-bold mb-3 flex items-center gap-2 border-b border-gray-800 pb-2">Compras Parceladas</h3>
                                    <div className="space-y-2">
                                        {reviewData.installments.map((item: any, idx: number) => (
                                            <div key={idx} className="flex flex-wrap gap-2 items-center bg-[#111] p-2 rounded-xl border border-gray-800">
                                                <input type="text" value={item.title} onChange={(e) => handleEditItem('installments', idx, 'title', e.target.value)} className="flex-1 min-w-[120px] bg-transparent border-none text-sm text-white focus:ring-0 px-2" />
                                                
                                                {/* 🟢 SELETOR DE CATEGORIA */}
                                                <select value={item.category || "Outros"} onChange={(e) => handleEditItem('installments', idx, 'category', e.target.value)} className="w-28 bg-gray-900 border border-gray-700 text-xs text-gray-300 rounded-lg p-1.5 focus:ring-0">
                                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>

                                                {/* 🟢 CAIXA DE QUANTIDADE DE PARCELAS */}
                                                <div className="w-16 shrink-0 flex items-center bg-gray-900 rounded-lg px-2 border border-gray-700" title="Quantidade de parcelas">
                                                    <span className="text-gray-500 text-[10px] font-bold">X</span>
                                                    <input type="number" value={item.installments_count || 1} onChange={(e) => handleEditItem('installments', idx, 'installments_count', Number(e.target.value))} className="w-full bg-transparent border-none text-sm text-center text-white focus:ring-0 p-1" />
                                                </div>

                                                <div className="w-24 shrink-0 flex items-center bg-gray-900 rounded-lg px-2 border border-gray-700" title="Valor Total da Compra">
                                                    <span className="text-gray-500 text-[10px]">Total</span>
                                                    <input type="number" value={item.total_value !== undefined ? item.total_value : (item.amount || item.value || 0)} onChange={(e) => handleEditItem('installments', idx, 'total_value', Number(e.target.value))} className="w-full bg-transparent border-none text-sm text-right text-white focus:ring-0 p-1" />
                                                </div>
                                                <button onClick={() => handleRemoveItem('installments', idx)} className="text-gray-600 hover:text-red-500 p-2"><Trash2 size={16} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 shrink-0 pt-4 border-t border-gray-800">
                            <button onClick={() => setReviewData(null)} disabled={isSaving} className="flex-1 bg-transparent border border-gray-700 hover:bg-gray-800 text-gray-300 py-3.5 rounded-xl font-bold transition text-sm">Cancelar</button>
                            <button onClick={handleSaveToDatabase} disabled={isSaving || totalFound === 0} className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-bold transition shadow-lg shadow-emerald-900/20 text-sm flex items-center justify-center gap-2 disabled:opacity-50">
                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <>Salvar {totalFound} Contas <ArrowRight size={18} /></>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// Ícone extra pra deixar o título bonitão
function SparklesIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-400">
            <path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z" />
        </svg>
    )
}