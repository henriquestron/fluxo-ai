import React, { useState } from 'react';
import { X, UploadCloud, FileSpreadsheet, Loader2, CheckCircle2, ArrowRight, Trash2 } from 'lucide-react';
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

export default function ImportModal({ isOpen, onClose, userId, workspaceId, onSuccess, supabase }: ImportModalProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [statusText, setStatusText] = useState("Selecione sua planilha (.xlsx ou .csv)");
    
    // O estado agora é editável!
    const [reviewData, setReviewData] = useState<any>(null);

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setStatusText("Lendo o arquivo Excel...");

        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const rawJsonData = XLSX.utils.sheet_to_json(worksheet);
            
            setStatusText("A IA está analisando cada conta... 🤖");

            const response = await fetch('/api/import-spreadsheet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ rawData: rawJsonData })
            });

            const result = await response.json();

            if (result.success) {
                setStatusText("Pronto!");
                setReviewData(result.data);
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error("Erro na importação:", error);
            toast.error("Erro ao ler a planilha. Verifique o formato e tente novamente.");
            setStatusText("Houve um erro na leitura.");
        } finally {
            setIsProcessing(false);
        }
    };

    // 🟢 FUNÇÕES PARA EDITAR AS CONTAS NA TELA
    const handleEditItem = (category: string, index: number, field: string, value: any) => {
        const newData = { ...reviewData };
        newData[category][index][field] = value;
        setReviewData(newData);
    };

    const handleRemoveItem = (category: string, index: number) => {
        const newData = { ...reviewData };
        newData[category].splice(index, 1);
        setReviewData(newData);
    };

    // FUNÇÃO PARA SALVAR NO BANCO
    const handleSaveToDatabase = async () => {
        if (!reviewData) return;
        setIsSaving(true);
        const toastId = toast.loading("Salvando contas no banco de dados..."); 

        try {
            const now = new Date();

            if (reviewData.transactions?.length > 0) {
                const transPayload = reviewData.transactions.map((t: any) => ({
                    ...t, user_id: userId, context: workspaceId, created_at: now, status: 'paid', is_paid: true
                }));
                await supabase.from('transactions').insert(transPayload);
            }

            if (reviewData.recurring?.length > 0) {
                const recPayload = reviewData.recurring.map((r: any) => ({
                    ...r, user_id: userId, context: workspaceId, created_at: now, status: 'active'
                }));
                await supabase.from('recurring').insert(recPayload);
            }

            if (reviewData.installments?.length > 0) {
                const instPayload = reviewData.installments.map((i: any) => ({
                    ...i, user_id: userId, context: workspaceId, created_at: now, status: 'active', current_installment: 0
                }));
                await supabase.from('installments').insert(instPayload);
            }

            toast.success("Migração concluída com sucesso! 🎉", { id: toastId });
            onSuccess();
            handleClose();
            
        } catch (error) {
            console.error("Erro ao salvar:", error);
            toast.error("Erro ao salvar no banco de dados.", { id: toastId });
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        setReviewData(null);
        setIsProcessing(false);
        setStatusText("Selecione sua planilha (.xlsx ou .csv)");
        onClose();
    };

    if (!isOpen) return null;

    const totalFound = reviewData 
        ? (reviewData.transactions?.length || 0) + (reviewData.recurring?.length || 0) + (reviewData.installments?.length || 0)
        : 0;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            {/* 🟢 O MODAL CRESCE DINAMICAMENTE: max-w-md para UPLOAD, max-w-3xl para REVISÃO */}
            <div className={`bg-[#0a0a0a] border border-gray-800 rounded-3xl w-full p-8 relative shadow-2xl transition-all duration-500 ease-in-out ${reviewData ? 'max-w-3xl' : 'max-w-md'}`}>
                
                <button onClick={handleClose} disabled={isProcessing || isSaving} className="absolute top-4 right-4 text-gray-500 hover:text-white transition disabled:opacity-50 z-10">
                    <X size={20} />
                </button>

                {!reviewData ? (
                    // TELA 1: UPLOAD (Mesma coisa de antes)
                    <div className="animate-in zoom-in-95 duration-300">
                        <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-500/20">
                                <FileSpreadsheet size={28} className="text-emerald-400" />
                            </div>
                            <h2 className="text-2xl font-black text-white">Importação Mágica</h2>
                            <p className="text-gray-400 text-sm mt-2">Nossa IA vai ler sua planilha e organizar tudo.</p>
                        </div>

                        <div className="relative group">
                            <input 
                                type="file" accept=".xlsx, .csv" onChange={handleFileUpload} disabled={isProcessing}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10"
                            />
                            <div className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-colors ${isProcessing ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-gray-700 bg-[#111] group-hover:border-emerald-500/50 group-hover:bg-emerald-500/5'}`}>
                                {isProcessing ? <Loader2 size={32} className="text-cyan-400 animate-spin mb-3" /> : <UploadCloud size={32} className="text-gray-400 group-hover:text-emerald-400 transition-colors mb-3" />}
                                <p className="text-sm font-bold text-white mb-1">{isProcessing ? 'A IA está lendo...' : 'Clique ou arraste a planilha'}</p>
                                <p className={`text-xs ${isProcessing ? 'text-cyan-400 font-medium' : 'text-gray-500'}`}>{statusText}</p>
                            </div>
                        </div>
                    </div>
                ) : (
                    // TELA 2: LISTA DE CONTAS EDITÁVEIS
                    <div className="animate-in slide-in-from-right-8 duration-300 flex flex-col max-h-[85vh]">
                        <div className="text-center mb-6 shrink-0">
                            <div className="w-12 h-12 bg-cyan-500/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-cyan-500/20">
                                <CheckCircle2 size={24} className="text-cyan-400" />
                            </div>
                            <h2 className="text-2xl font-black text-white">Revise suas Contas</h2>
                            <p className="text-gray-400 text-sm mt-1">
                                Encontramos <span className="text-white font-bold">{totalFound} contas</span>. Altere o que precisar antes de salvar.
                            </p>
                        </div>

                        {/* 🟢 ÁREA COM SCROLL PARA AS CONTAS */}
                        <div className="flex-1 overflow-y-auto pr-2 mb-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent">
                            
                            {/* SESSÃO: TRANSAÇÕES (AVULSAS) */}
                            {reviewData.transactions?.length > 0 && (
                                <div>
                                    <h3 className="text-emerald-400 font-bold mb-3 flex items-center gap-2 border-b border-gray-800 pb-2">
                                        Entradas e Saídas Avulsas <span className="text-xs bg-emerald-500/20 px-2 py-0.5 rounded-full">{reviewData.transactions.length}</span>
                                    </h3>
                                    <div className="space-y-2">
                                        {reviewData.transactions.map((item: any, idx: number) => (
                                            <div key={idx} className="flex gap-2 items-center bg-[#111] p-2 rounded-xl border border-gray-800">
                                                <input 
                                                    type="text" value={item.title} 
                                                    onChange={(e) => handleEditItem('transactions', idx, 'title', e.target.value)}
                                                    className="flex-1 bg-transparent border-none text-sm text-white focus:ring-0 px-2"
                                                />
                                                <div className="w-24 shrink-0 flex items-center bg-gray-900 rounded-lg px-2 border border-gray-700">
                                                    <span className="text-gray-500 text-xs">R$</span>
                                                    <input 
                                                        type="number" value={item.amount} 
                                                        onChange={(e) => handleEditItem('transactions', idx, 'amount', Number(e.target.value))}
                                                        className="w-full bg-transparent border-none text-sm text-right text-white focus:ring-0 p-1"
                                                    />
                                                </div>
                                                <button onClick={() => handleRemoveItem('transactions', idx)} className="text-gray-600 hover:text-red-500 p-2 transition">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* SESSÃO: CONTAS FIXAS */}
                            {reviewData.recurring?.length > 0 && (
                                <div>
                                    <h3 className="text-cyan-400 font-bold mb-3 flex items-center gap-2 border-b border-gray-800 pb-2">
                                        Contas Fixas (Mensais) <span className="text-xs bg-cyan-500/20 px-2 py-0.5 rounded-full">{reviewData.recurring.length}</span>
                                    </h3>
                                    <div className="space-y-2">
                                        {reviewData.recurring.map((item: any, idx: number) => (
                                            <div key={idx} className="flex gap-2 items-center bg-[#111] p-2 rounded-xl border border-gray-800">
                                                <input 
                                                    type="text" value={item.title} 
                                                    onChange={(e) => handleEditItem('recurring', idx, 'title', e.target.value)}
                                                    className="flex-1 bg-transparent border-none text-sm text-white focus:ring-0 px-2"
                                                />
                                                <div className="w-24 shrink-0 flex items-center bg-gray-900 rounded-lg px-2 border border-gray-700">
                                                    <span className="text-gray-500 text-xs">R$</span>
                                                    <input 
                                                        type="number" value={item.value} 
                                                        onChange={(e) => handleEditItem('recurring', idx, 'value', Number(e.target.value))}
                                                        className="w-full bg-transparent border-none text-sm text-right text-white focus:ring-0 p-1"
                                                    />
                                                </div>
                                                <button onClick={() => handleRemoveItem('recurring', idx)} className="text-gray-600 hover:text-red-500 p-2 transition">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* SESSÃO: PARCELADAS */}
                            {reviewData.installments?.length > 0 && (
                                <div>
                                    <h3 className="text-purple-400 font-bold mb-3 flex items-center gap-2 border-b border-gray-800 pb-2">
                                        Compras Parceladas <span className="text-xs bg-purple-500/20 px-2 py-0.5 rounded-full">{reviewData.installments.length}</span>
                                    </h3>
                                    <div className="space-y-2">
                                        {reviewData.installments.map((item: any, idx: number) => (
                                            <div key={idx} className="flex gap-2 items-center bg-[#111] p-2 rounded-xl border border-gray-800">
                                                <input 
                                                    type="text" value={item.title} 
                                                    onChange={(e) => handleEditItem('installments', idx, 'title', e.target.value)}
                                                    className="flex-1 bg-transparent border-none text-sm text-white focus:ring-0 px-2"
                                                />
                                                <div className="w-28 shrink-0 flex items-center bg-gray-900 rounded-lg px-2 border border-gray-700">
                                                    <span className="text-gray-500 text-xs">Total R$</span>
                                                    <input 
                                                        type="number" value={item.total_value} 
                                                        onChange={(e) => handleEditItem('installments', idx, 'total_value', Number(e.target.value))}
                                                        className="w-full bg-transparent border-none text-sm text-right text-white focus:ring-0 p-1"
                                                    />
                                                </div>
                                                <button onClick={() => handleRemoveItem('installments', idx)} className="text-gray-600 hover:text-red-500 p-2 transition">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* BOTÕES DE AÇÃO */}
                        <div className="flex gap-3 shrink-0 pt-4 border-t border-gray-800">
                            <button onClick={() => setReviewData(null)} disabled={isSaving} className="flex-1 bg-transparent border border-gray-700 hover:bg-gray-800 text-gray-300 py-3.5 rounded-xl font-bold transition text-sm">
                                Cancelar
                            </button>
                            <button onClick={handleSaveToDatabase} disabled={isSaving || totalFound === 0} className="flex-[2] bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-bold transition shadow-lg shadow-emerald-900/20 text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                {isSaving ? <Loader2 size={18} className="animate-spin" /> : <>Salvar {totalFound} Contas <ArrowRight size={18} /></>}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}