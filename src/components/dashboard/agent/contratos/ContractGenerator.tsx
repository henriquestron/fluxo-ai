import React, { useState } from 'react';
import { FileSignature, Printer, ShieldCheck, X, User, FileUp, Loader2 } from 'lucide-react';
import { supabase } from '@/supabase';
import { toast } from 'sonner';

// 🟢 Agora recebemos 'client' (o cliente selecionado na tela) em vez da lista 'clients'
export default function ContractGenerator({ consultant, client, onClose }: any) {

    // Puxa os dados direto do cliente atual de forma automática
    const clientName = client?.full_name || client?.client_email?.split('@')[0] || '';
    const clientCPF = client?.cpf || '';

    const [contractValue, setContractValue] = useState('');
    const [contractDuration, setContractDuration] = useState('6');
    const [city, setCity] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [consultantName, setConsultantName] = useState(consultant?.user_metadata?.full_name || consultant?.name || '');
    const [consultantDoc, setConsultantDoc] = useState(''); // Para você digitar seu CPF ou CNPJ

    const handlePrint = () => {
        window.print();
    };

    // 🟢 FUNÇÃO DE UPLOAD DO CONTRATO ASSINADO
    const handleUploadSigned = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !client) return;

        setIsUploading(true);
        try {
            const fileName = `contrato_${client.id}_${Date.now()}.pdf`;

            // 1. Sobe para o Storage (Certifique-se de que o bucket 'contracts' existe no Supabase)
            const { error: uploadError } = await supabase.storage
                .from('contracts')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // 2. Pega a URL pública
            const { data: { publicUrl } } = supabase.storage.from('contracts').getPublicUrl(fileName);

            // 3. Salva o link na tabela manager_clients
            const { error: dbError } = await supabase
                .from('manager_clients')
                .update({ contract_url: publicUrl })
                .eq('id', client.id);

            if (dbError) throw dbError;
            await supabase.from('notifications').insert({
                user_id: client.client_id, // ID do cliente
                title: 'Contrato Disponível 📝',
                message: `${consultant?.user_metadata?.full_name || 'Seu consultor'} assinou o contrato. Baixe, assine no Gov.br e nos envie a versão final!`,
                type: 'info',
                action_data: publicUrl
            });

            toast.success("Contrato salvo e cliente notificado com sucesso! 🚀");
            onClose();
            toast.success("Contrato assinado salvo com sucesso! O cliente já pode visualizar.");
            onClose();
        } catch (error: any) {
            toast.error("Erro no upload: " + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm overflow-y-auto p-4 sm:p-8 font-sans">
            <div className="max-w-4xl mx-auto mb-8 bg-[#111] p-6 rounded-2xl border border-gray-800 print:hidden relative mt-10 shadow-2xl">
                {/* 🟢 TELA DE BLOQUEIO SE O CONTRATO JÁ EXISTIR */}
                {client?.contract_url ? (
                    <div className="text-center py-10">
                        <div className="bg-emerald-500/10 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ShieldCheck size={40} className="text-emerald-500" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">Contrato Já Enviado!</h3>
                        <p className="text-gray-400 mb-8 max-w-md mx-auto">
                            Você já gerou e enviou o contrato para <strong>{clientName}</strong>. Agora é só aguardar a assinatura do cliente pelo painel dele.
                        </p>

                        <div className="flex items-center justify-center gap-4">
                            <a
                                href={client?.contract_url}
                                target="_blank"
                                className="bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-xl transition flex items-center gap-2"
                            >
                                <FileSignature size={18} /> Ver Contrato Enviado
                            </a>
                            <button
                                onClick={onClose}
                                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-xl transition"
                            >
                                Voltar ao Painel
                            </button>
                        </div>
                    </div>
                ) : (
                    /* 🟢 SE NÃO TIVER CONTRATO, MOSTRA O FORMULÁRIO NORMAL QUE VOCÊ JÁ TEM */
                    <>
                        <div className="flex items-center gap-4 mb-6">
                            <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                                <FileSignature className="text-cyan-500" /> Gerador de Contrato
                            </h2>
                        </div>

                        {/* ... Todo o resto do seu código de inputs e a folha A4 ... */}
                    </>
                )}
                <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-white transition">
                    <X size={24} />
                </button>

                <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                        <FileSignature className="text-cyan-500" /> Gerador de Contrato
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* 🟢 EXIBIÇÃO DO CLIENTE ATUAL (Sem caixa de seleção) */}
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Cliente em Atendimento</label>
                        <div className="mt-1 bg-gray-900/50 border border-gray-800 rounded-xl p-4 text-cyan-400 font-bold flex items-center gap-3">
                            <div className="bg-cyan-500/10 p-2 rounded-lg"><User size={20} /></div>
                            <div>
                                <p className="text-sm text-white">{clientName}</p>
                                <p className="text-xs text-gray-400">CPF: {clientCPF || 'Não informado'}</p>
                            </div>
                        </div>
                    </div>
                    {/* 🟢 DADOS DA CONTRATADA (O CONSULTOR) */}
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Seu Nome / Razão Social</label>
                        <input
                            type="text"
                            placeholder="Nome da sua empresa ou seu nome..."
                            value={consultantName}
                            onChange={(e) => setConsultantName(e.target.value)}
                            className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Seu CPF / CNPJ</label>
                        <input
                            type="text"
                            placeholder="00.000.000/0001-00"
                            value={consultantDoc}
                            onChange={(e) => setConsultantDoc(e.target.value)}
                            className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Valor da Consultoria (R$)</label>
                        <input
                            type="text"
                            placeholder="Ex: 1500,00"
                            value={contractValue}
                            onChange={(e) => setContractValue(e.target.value)}
                            className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Duração (Meses)</label>
                        <input
                            type="number"
                            value={contractDuration}
                            onChange={(e) => setContractDuration(e.target.value)}
                            className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase">Cidade de Foro</label>
                        <input
                            type="text"
                            placeholder="Ex: Goiânia - GO"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none"
                        />
                    </div>
                </div>

                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handlePrint}
                        disabled={!client || !contractValue || !city}
                        className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-xl transition flex items-center gap-2 disabled:opacity-50"
                    >
                        <Printer size={18} /> Salvar PDF para Assinar
                    </button>
                </div>

                {/* 🟢 ÁREA DE UPLOAD DO CONTRATO ASSINADO */}
                <div className="mt-8 pt-6 border-t border-gray-800">
                    <label className="text-sm font-bold text-gray-400 block mb-3">Já assinou no Gov.br? Envie o arquivo final para o cliente:</label>
                    <div className="flex items-center gap-3">
                        <label className="flex-1 bg-gray-900 border-2 border-dashed border-gray-700 hover:border-cyan-500/50 rounded-xl p-4 transition cursor-pointer text-center group">
                            <input type="file" accept=".pdf" className="hidden" onChange={handleUploadSigned} disabled={isUploading} />
                            <div className="flex flex-col items-center gap-2">
                                {isUploading ? (
                                    <Loader2 className="animate-spin text-cyan-500" size={24} />
                                ) : (
                                    <FileUp className="text-gray-500 group-hover:text-cyan-400 transition" size={24} />
                                )}
                                <span className="text-xs text-gray-400 font-medium">
                                    {isUploading ? 'Enviando documento...' : 'Clique para selecionar o contrato assinado (.pdf)'}
                                </span>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            {/* A FOLHA DO CONTRATO (Visível na tela e na impressão) */}
            <div className="max-w-[210mm] mx-auto bg-white text-black p-[20mm] shadow-2xl min-h-[297mm] print:shadow-none print:p-0">
                <div className="flex justify-between items-center border-b-2 border-gray-200 pb-6 mb-8">
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-wider">{consultant?.user_metadata?.full_name || consultant?.name || "Nome do Consultor"}</h1>
                        <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Consultoria Financeira Estratégica</p>
                    </div>
                    <div className="text-right">
                        <div className="flex items-center gap-1 text-cyan-600 font-black text-xl justify-end">
                            <ShieldCheck size={24} /> Meu Aliado.
                        </div>
                        <p className="text-[10px] text-gray-400 uppercase mt-1">Plataforma Oficial</p>
                    </div>
                </div>

                <h2 className="text-center text-lg font-bold underline uppercase mb-8">Contrato de Prestação de Serviços de Consultoria Financeira</h2>

                <div className="text-sm leading-relaxed space-y-6 text-justify">

                    <p>
                        Pelo presente instrumento particular, de um lado <strong>{consultantName || "[SEU NOME OU EMPRESA]"}</strong>, portador(a) do CPF/CNPJ nº {consultantDoc || "[SEU CPF/CNPJ]"}, doravante denominado(a) <strong>CONTRATADA</strong>, e de outro lado <strong>{clientName || "[NOME DO CLIENTE]"}</strong>, portador(a) do CPF nº {clientCPF || "[CPF DO CLIENTE]"}, doravante denominado(a) <strong>CONTRATANTE</strong>, celebram o presente contrato mediante as cláusulas a seguir:
                    </p>

                    <div>
                        <h3 className="font-bold mb-1">Cláusula 1ª - Do Objeto</h3>
                        <p>O presente contrato tem como objeto a prestação de serviços de Consultoria Financeira Pessoal, englobando análise de fluxo de caixa, mapeamento de dívidas e planejamento estratégico financeiro através da plataforma "Meu Aliado". <strong>A CONTRATADA não atua como corretora, gestora de fundos ou analista de valores mobiliários (CVM), não realizando recomendação direta de compra ou venda de ativos financeiros.</strong></p>
                    </div>

                    <div>
                        <h3 className="font-bold mb-1">Cláusula 2ª - Dos Honorários e Condições</h3>
                        <p>Pelos serviços prestados, o CONTRATANTE pagará à CONTRATADA o valor total de <strong>R$ {contractValue || "______,__"}</strong>. O acompanhamento terá a duração de <strong>{contractDuration} meses</strong> a partir da data de assinatura deste termo.</p>
                    </div>

                    <div>
                        <h3 className="font-bold mb-1">Cláusula 3ª - Da Confidencialidade (LGPD)</h3>
                        <p>A CONTRATADA compromete-se a manter sigilo absoluto sobre as informações financeiras, senhas (que não devem ser compartilhadas sob nenhuma hipótese) e dados pessoais do CONTRATANTE, em estrita conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).</p>
                    </div>

                    <p className="mt-8 text-center">
                        E, por estarem assim justos e contratados, firmam o presente instrumento.
                    </p>

                    <p className="text-right mt-8">
                        {city || "[Cidade]"}, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.
                    </p>

                    <div className="flex justify-between mt-24 px-8">
                        <div className="text-center w-64">
                            <div className="border-t border-black mb-2"></div>
                            <p className="font-bold">{consultantName || "Nome do Consultor"}</p>
                            <p className="text-xs text-gray-500">CONTRATADA</p>
                        </div>
                        <div className="text-center w-64">
                            <div className="border-t border-black mb-2"></div>
                            <p className="font-bold">{clientName || "Nome do Cliente"}</p>
                            <p className="text-xs text-gray-500">CONTRATANTE</p>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    body * { visibility: hidden; }
                    .print\\:shadow-none { box-shadow: none !important; }
                    .print\\:p-0 { padding: 0 !important; }
                    .max-w-\\[210mm\\] { max-width: none; width: 100%; margin: 0; }
                    .max-w-\\[210mm\\], .max-w-\\[210mm\\] * { visibility: visible; }
                    .max-w-\\[210mm\\] { position: absolute; left: 0; top: 0; }
                    .print\\:hidden { display: none !important; }
                }
            `}</style>
        </div>
    );
}