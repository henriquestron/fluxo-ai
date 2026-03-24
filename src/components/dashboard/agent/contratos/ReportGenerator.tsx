import React, { useState } from 'react';
import { FileText, X, Printer, Sparkles, Loader2, TrendingDown, TrendingUp, Check, Edit3 } from 'lucide-react';
import { supabase } from '@/supabase'; // 🟢 Adicione isso no topo

interface ReportGeneratorProps {
    consultant: any;
    client: any;
    onClose: () => void;
}

export default function ReportGenerator({ consultant, client, onClose }: ReportGeneratorProps) {
    const [isGeneratingAI, setIsGeneratingAI] = useState(false);
    const [aiReport, setAiReport] = useState<string | null>(null);
    const [isEditingMode, setIsEditingMode] = useState(false);

    // Dados de exemplo para o cabeçalho
    const reportDate = new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const clientName = client?.full_name || client?.client_email?.split('@')[0] || 'Cliente';

    // 🟢 FUNÇÃO FAKE DA IA (Vamos plugar a IA de verdade no próximo passo)
    // 🟢 FUNÇÃO REAL CONECTADA AO BANCO E À IA
    // 🟢 FUNÇÃO REAL CONECTADA À SUA API DE CHAT
    // 🟢 FUNÇÃO REAL CONECTANDO NA NOVA ROTA
    const handleGenerateAI = async () => {
        setIsGeneratingAI(true);
        setAiReport(null);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;
            if (!token) throw new Error("Sessão inválida. Faça login novamente.");

            const currentMonth = String(new Date().getMonth() + 1).padStart(2, '0');
            const currentYear = new Date().getFullYear();

            // O Payload agora é muito mais simples e focado
            const payload = {
                clientId: client.client_id || client.id,
                clientName: clientName,
                consultantName: consultant?.user_metadata?.full_name || "Consultor",
                month: currentMonth,
                year: currentYear
            };

            // 🟢 CHAMANDO A NOVA ROTA
            const response = await fetch('/api/report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || "Erro na geração do relatório");
            }

            const result = await response.json();

            // Pega o relatório e joga na tela
            if (result.report) {
                setAiReport(result.report);
            } else {
                setAiReport("Relatório vazio retornado pela API.");
            }

        } catch (err: any) {
            console.error("Erro na geração do relatório:", err);
            setAiReport(`Erro ao gerar o relatório: ${err.message}`);
        } finally {
            setIsGeneratingAI(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };
    // 🟢 FORMATADOR MÁGICO: Transforma o texto da IA em HTML bonito
    const formatReportText = (text: string) => {
        if (!text) return { __html: '' };

        // 1. Remove as marcações chatas de bloco de código (```markdown e ```)
        let formatted = text.replace(/```markdown/gi, '').replace(/```/g, '');

        // 2. Transforma ### Título em Título Grande e destacado
        formatted = formatted.replace(/### (.*)/g, '<h3 class="text-xl font-black text-indigo-900 mt-8 mb-3 border-b pb-2 border-gray-200">$1</h3>');

        // 3. Transforma **texto** em Negrito real
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong class="text-gray-900 font-bold">$1</strong>');

        // 4. Garante que as quebras de linha funcionem
        formatted = formatted.replace(/\n/g, '<br />');

        return { __html: formatted };
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm print:p-0 print:bg-white">

            <div className="bg-gray-900 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col border border-gray-800 print:border-none print:shadow-none print:w-full print:h-full print:max-h-none print:rounded-none">

                {/* 🟢 HEADER DO MODAL (Não sai na impressão) */}
                <div className="flex justify-between items-center p-6 border-b border-gray-800 print:hidden">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-500/20 p-2 rounded-xl text-indigo-400">
                            <FileText size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Relatório de Consultoria</h2>
                            <p className="text-sm text-gray-400">Diagnóstico e Plano de Ação com IA</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition bg-gray-800 p-2 rounded-xl">
                        <X size={24} />
                    </button>
                </div>

                {/* 🟢 ÁREA DE SCROLL E BOTÕES (Não sai na impressão) */}
                <div className="p-6 overflow-y-auto flex-1 bg-black/50 print:hidden flex flex-col gap-4 items-center">

                    <div className="flex gap-4 w-full max-w-3xl">
                        <button
                            onClick={handleGenerateAI}
                            disabled={isGeneratingAI}
                            className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                        >
                            {isGeneratingAI ? <Loader2 className="animate-spin" size={20} /> : <Sparkles size={20} />}
                            {isGeneratingAI ? 'Analisando dados do cliente...' : 'Gerar Análise com IA'}
                        </button>
                        {aiReport && (
                            <button
                                onClick={() => setIsEditingMode(!isEditingMode)}
                                className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2 border border-gray-700"
                            >
                                {isEditingMode ? <Check size={20} className="text-emerald-400" /> : <Edit3 size={20} className="text-amber-400" />}
                                <span className="hidden sm:inline">{isEditingMode ? 'Salvar Edição' : 'Editar Texto'}</span>
                            </button>
                        )}
                        <button
                            onClick={handlePrint}
                            disabled={!aiReport || isEditingMode}
                            className="bg-gray-800 hover:bg-gray-700 disabled:opacity-50 text-white font-bold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2 border border-gray-700"
                        >
                            <Printer size={20} /> Imprimir / PDF
                        </button>
                    </div>

                    <p className="text-xs text-gray-500 text-center">
                        Para salvar em PDF, clique em Imprimir e escolha "Salvar como PDF" no seu navegador.
                    </p>
                </div>

                {/* 🟢 A FOLHA A4 BRANCA (É isso aqui que sai na impressão) */}
                {aiReport && (
                    <div className="bg-gray-200 p-8 overflow-y-auto print:p-0 print:overflow-visible flex justify-center">

                        <div className="bg-white text-black w-full max-w-[21cm] min-h-[29.7cm] h-max p-12 shadow-md print:shadow-none print:p-8 relative">

                            {/* CABEÇALHO DO DOCUMENTO */}
                            <div className="border-b-2 border-indigo-600 pb-6 mb-8 flex justify-between items-end">
                                <div>
                                    <h1 className="text-3xl font-black text-indigo-950 uppercase tracking-tighter">
                                        Diagnóstico <span className="text-indigo-600">Financeiro</span>
                                    </h1>
                                    <p className="text-gray-500 text-sm mt-1 uppercase tracking-widest font-bold">Meu Aliado Consultoria</p>
                                </div>
                                <div className="text-right text-sm text-gray-600">
                                    <p><span className="font-bold">Cliente:</span> {clientName}</p>
                                    <p><span className="font-bold">Data:</span> <span className="capitalize">{reportDate}</span></p>
                                    <p><span className="font-bold">Consultor:</span> {consultant?.user_metadata?.full_name || 'Consultor Parceiro'}</p>
                                </div>
                            </div>

                            {/* CONTEÚDO GERADO PELA IA */}
                            {isEditingMode ? (
                                <textarea
                                    value={aiReport}
                                    onChange={(e) => setAiReport(e.target.value)}
                                    className="w-full min-h-[500px] p-4 border-2 border-indigo-500/50 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 bg-indigo-50/30 resize-y font-mono text-sm leading-relaxed"
                                    placeholder="Edite o texto do relatório aqui..."
                                />
                            ) : (
                                <div
                                    className="text-gray-700 text-[15px] leading-relaxed"
                                    dangerouslySetInnerHTML={formatReportText(aiReport)}
                                />
                                )}
                            {/* RODAPÉ E ASSINATURA */}
                            <div className="mt-20 pt-8 border-t border-gray-300">
                                <div className="flex justify-between items-center text-xs text-gray-500">
                                    <p>Este relatório foi gerado com base nos dados fornecidos até a presente data.</p>
                                    <p>Página 1 de 1</p>
                                </div>
                                <div className="mt-16 text-center">
                                    <div className="w-64 h-px bg-black mx-auto mb-2"></div>
                                    <p className="font-bold text-gray-800">{consultant?.user_metadata?.full_name || 'Consultor Parceiro'}</p>
                                    <p className="text-xs text-gray-500">Consultor Financeiro - Meu Aliado</p>
                                </div>
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}