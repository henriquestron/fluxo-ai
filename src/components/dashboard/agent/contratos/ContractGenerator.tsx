import React, { useState, useEffect } from 'react';
import { FileSignature, Printer, ShieldCheck, X, User, FileUp, Loader2 } from 'lucide-react';
import { supabase } from '@/supabase';
import { toast } from 'sonner';

export default function ContractGenerator({ consultant, client, onClose, companyLogoUrl }: any) {

    // Puxa os dados direto do cliente atual de forma automática
    const clientName = client?.full_name || client?.client_email?.split('@')[0] || '';
    const clientCPF = client?.cpf || '';

    const [contractValue, setContractValue] = useState('');
    const [contractDuration, setContractDuration] = useState('6');
    const [isUploading, setIsUploading] = useState(false);
    const [consultantName, setConsultantName] = useState(consultant?.user_metadata?.full_name || consultant?.name || '');
    const [consultantDoc, setConsultantDoc] = useState(''); 

    // 🟢 Novos Estados para IBGE (Estado e Cidade)
    const [states, setStates] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);
    const [selectedUF, setSelectedUF] = useState('');
    const [selectedCityName, setSelectedCityName] = useState('');
    const [city, setCity] = useState(''); // O estado final que vai pro contrato

    // 🟢 Busca os Estados do IBGE ao abrir
    useEffect(() => {
        fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
            .then(res => res.json())
            .then(data => setStates(data))
            .catch(() => console.error("Erro ao buscar estados"));
    }, []);

    // 🟢 Busca as cidades sempre que o Estado (UF) mudar
    useEffect(() => {
        if (selectedUF) {
            fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedUF}/municipios`)
                .then(res => res.json())
                .then(data => setCities(data))
                .catch(() => console.error("Erro ao buscar cidades"));
        } else {
            setCities([]);
        }
    }, [selectedUF]);

    // 🟢 Atualiza a cidade final no formato "Cidade - UF"
    useEffect(() => {
        if (selectedCityName && selectedUF) {
            setCity(`${selectedCityName} - ${selectedUF}`);
        } else {
            setCity('');
        }
    }, [selectedCityName, selectedUF]);

    // 🟢 MÁSCARA AUTOMÁTICA DE CPF/CNPJ
    const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, ''); // Tira tudo que não é número
        
        if (value.length <= 11) {
            // Máscara de CPF
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        } else {
            // Máscara de CNPJ
            value = value.replace(/^(\d{2})(\d)/, '$1.$2');
            value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
            value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
            value = value.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
        }
        setConsultantDoc(value.substring(0, 18)); // Limita o tamanho máximo
    };

    const handlePrint = () => {
        window.print();
    };

    // 🟢 FUNÇÃO DE UPLOAD DO CONTRATO ASSINADO (Atualizada para Sobrescrever)
    const handleUploadSigned = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !client) return;

        setIsUploading(true);
        try {
            // 1. Nome FIXO para este cliente. Sem Date.now() no nome do arquivo!
            const fileName = `contrato_${client.id}.pdf`;

            // 2. Sobe para o Storage passando a opção UPSERT (Isso apaga o arquivo velho e põe o novo)
            const { error: uploadError } = await supabase.storage
                .from('contracts')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            // 3. Pega a URL pública
            const { data: { publicUrl } } = supabase.storage.from('contracts').getPublicUrl(fileName);

            // 4. O TRUQUE DO CACHE: Adicionamos o timestamp na URL (não no arquivo) 
            // para forçar o navegador a baixar a versão nova em vez de usar a memória.
            const finalUrl = `${publicUrl}?v=${Date.now()}`;

            // 5. Salva o link final no banco
            const { error: dbError } = await supabase
                .from('manager_clients')
                .update({ contract_url: finalUrl })
                .eq('id', client.id);

            if (dbError) throw dbError;
            
            await supabase.from('notifications').insert({
                user_id: client.client_id,
                title: 'Contrato Atualizado 📝',
                message: `Uma nova versão do contrato foi anexada. Confira!`,
                type: 'info',
                action_data: finalUrl
            });

            toast.success("Contrato atualizado com sucesso! 🚀");
            onClose();
        } catch (error: any) {
            toast.error("Erro no upload: " + error.message);
        } finally {
            setIsUploading(false);
        }
    };

    // Validação para habilitar o botão de imprimir
    const isFormValid = client && contractValue && city && (consultantDoc.length === 14 || consultantDoc.length === 18);

    return (
        <div className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm overflow-y-auto p-4 sm:p-8 font-sans">
            <div className="max-w-4xl mx-auto mb-8 bg-[#111] p-6 rounded-2xl border border-gray-800 print:hidden relative mt-10 shadow-2xl">
                
                <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-white transition z-10">
                    <X size={24} />
                </button>

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
                    /* 🟢 SE NÃO TIVER CONTRATO, MOSTRA O FORMULÁRIO NORMAL */
                    <>
                        <div className="flex items-center gap-4 mb-6">
                            <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                                <FileSignature className="text-cyan-500" /> Gerador de Contrato
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* EXIBIÇÃO DO CLIENTE ATUAL */}
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
                            
                            {/* DADOS DA CONTRATADA (O CONSULTOR) */}
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
                                <label className="text-xs font-bold text-gray-500 uppercase flex items-center gap-2">
                                    Seu CPF / CNPJ 
                                    {consultantDoc.length > 0 && consultantDoc.length < 14 && <span className="text-red-500 text-[10px]">Documento incompleto</span>}
                                </label>
                                <input
                                    type="text"
                                    placeholder="000.000.000-00 ou 00.000.000/0001-00"
                                    value={consultantDoc}
                                    onChange={handleDocChange}
                                    className={`w-full mt-1 bg-gray-900 border rounded-xl p-3 text-white outline-none transition ${consultantDoc.length > 0 && consultantDoc.length < 14 ? 'border-red-500/50 focus:border-red-500' : 'border-gray-700 focus:border-cyan-500'}`}
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
                            
                            {/* 🟢 SELEÇÃO DE ESTADO E CIDADE VIA IBGE */}
                            <div className="md:col-span-2">
                                <label className="text-xs font-bold text-gray-500 uppercase">Estado e Cidade de Foro</label>
                                <div className="flex gap-2 mt-1">
                                    <select
                                        value={selectedUF}
                                        onChange={(e) => {
                                            setSelectedUF(e.target.value);
                                            setSelectedCityName(''); // Reseta a cidade ao mudar o estado
                                        }}
                                        className="bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none w-1/3 cursor-pointer"
                                    >
                                        <option value="">UF</option>
                                        {states.map(s => (
                                            <option key={s.sigla} value={s.sigla}>{s.nome}</option>
                                        ))}
                                    </select>
                                    
                                    <select
                                        value={selectedCityName}
                                        onChange={(e) => setSelectedCityName(e.target.value)}
                                        disabled={!selectedUF}
                                        className={`w-2/3 bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none ${!selectedUF ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                                    >
                                        <option value="">Selecione a cidade</option>
                                        {cities.map(c => (
                                            <option key={c.id} value={c.nome}>{c.nome}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={handlePrint}
                                disabled={!isFormValid}
                                className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-xl transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    </>
                )}
            </div>

            {/* A FOLHA DO CONTRATO */}
            <div id="print-area" className="max-w-[210mm] mx-auto bg-white text-black p-[20mm] shadow-2xl min-h-[297mm] print:shadow-none print:p-0 print:min-h-0 print:m-0 relative">
                
                {/* 🟢 CABEÇALHO ORIGINAL PRESERVADO (Com a Logo adicionada) */}
                <div className="flex justify-between items-center border-b-2 border-gray-200 pb-6 mb-8">
                    <div className="flex items-center gap-4">
                        {/* Se o consultor subiu a logo, ela aparece aqui à esquerda */}
                        {companyLogoUrl && (
                            <img 
                                src={companyLogoUrl} 
                                alt="Logo do Consultor" 
                                className="max-w-[120px] max-h-[60px] object-contain" 
                            />
                        )}
                        <div>
                            <h1 className="text-2xl font-black uppercase tracking-wider">{consultantName || consultant?.user_metadata?.full_name || consultant?.name || "Nome do Consultor"}</h1>
                            <p className="text-sm text-gray-500 font-bold uppercase tracking-widest">Consultoria Financeira Estratégica</p>
                        </div>
                    </div>
                    
                    {/* Selo do Meu Aliado (Intacto!) */}
                    <div className="text-right">
                        <div className="flex items-center gap-1 text-cyan-600 font-black text-xl justify-end">
                            <ShieldCheck size={24} /> Meu Aliado.
                        </div>
                        <p className="text-[10px] text-gray-400 uppercase mt-1">Plataforma Oficial</p>
                    </div>
                </div>

                {/* 🟢 O SEU TEXTO ORIGINAL INTACTO */}
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

            {/* 🟢 CSS BLINDADO PARA MATAR A 2ª PÁGINA */}
            <style>{`
                @media print {
                    /* Zera margens do navegador e fixa tamanho A4 */
                    @page { 
                        size: A4; 
                        margin: 0; 
                    }
                    
                    /* Oculta scrollbar e define limites firmes no body */
                    html, body {
                        width: 210mm;
                        height: 297mm;
                        margin: 0 !important;
                        padding: 0 !important;
                        overflow: hidden !important; 
                    }
                    
                    body * { visibility: hidden; }
                    
                    body { 
                        -webkit-print-color-adjust: exact; 
                        print-color-adjust: exact; 
                    }
                    
                    /* Traz o contrato para frente e obriga a caber na tela */
                    #print-area, #print-area * { visibility: visible; }
                    #print-area { 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        width: 210mm;
                        height: 297mm;
                        margin: 0 !important;
                        padding: 15mm !important; /* Margem interna simulando a borda da página */
                        box-sizing: border-box;
                        box-shadow: none !important;
                    }
                }
            `}</style>
        </div>
    );
}