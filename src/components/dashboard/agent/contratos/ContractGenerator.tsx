import React, { useState, useEffect } from 'react';
import { FileSignature, Printer, ShieldCheck, X, User, FileUp, Loader2, Pencil } from 'lucide-react';
import { supabase } from '@/supabase';
import { toast } from 'sonner';

export default function ContractGenerator({ consultant, client, onClose, companyLogoUrl }: any) {

    const clientName = client?.full_name || client?.client_email?.split('@')[0] || '';
    const clientCPF = client?.cpf || '';

    const [contractValue, setContractValue] = useState('');
    const [contractDuration, setContractDuration] = useState('6');
    const [isUploading, setIsUploading] = useState(false);
    
    // 🟢 PUXANDO DADOS AUTOMÁTICOS DO CONSULTOR
    const [consultantName, setConsultantName] = useState(consultant?.company_name || consultant?.user_metadata?.full_name || consultant?.name || '');
    const [consultantDoc, setConsultantDoc] = useState(consultant?.cnpj || ''); 

    // Opcionais
    const [paymentMethod, setPaymentMethod] = useState('a_vista');
    const [installments, setInstallments] = useState('');
    const [penaltyFee, setPenaltyFee] = useState(''); 
    const [interestRate, setInterestRate] = useState(''); 
    const [noticePeriod, setNoticePeriod] = useState('30'); 

    const [states, setStates] = useState<any[]>([]);
    const [cities, setCities] = useState<any[]>([]);
    const [selectedUF, setSelectedUF] = useState('');
    const [selectedCityName, setSelectedCityName] = useState('');
    const [city, setCity] = useState('');

    useEffect(() => {
        fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome')
            .then(res => res.json())
            .then(data => setStates(data))
            .catch(() => console.error("Erro ao buscar estados"));
    }, []);

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

    useEffect(() => {
        if (selectedCityName && selectedUF) {
            setCity(`${selectedCityName} - ${selectedUF}`);
        } else {
            setCity('');
        }
    }, [selectedCityName, selectedUF]);

    const handleDocChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value.replace(/\D/g, ''); 
        
        if (value.length <= 11) {
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d)/, '$1.$2');
            value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
        } else {
            value = value.replace(/^(\d{2})(\d)/, '$1.$2');
            value = value.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
            value = value.replace(/\.(\d{3})(\d)/, '.$1/$2');
            value = value.replace(/(\d{4})(\d{1,2})$/, '$1-$2');
        }
        setConsultantDoc(value.substring(0, 18));
    };

    const handlePrint = () => {
        window.print();
    };

    const handleUploadSigned = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !client) return;

        setIsUploading(true);
        try {
            const fileName = `contrato_${client.id}.pdf`;

            const { error: uploadError } = await supabase.storage
                .from('contracts')
                .upload(fileName, file, { upsert: true });

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage.from('contracts').getPublicUrl(fileName);
            const finalUrl = `${publicUrl}?v=${Date.now()}`;

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

    const isFormValid = client && consultantName && consultantDoc && contractValue && city; // 🟢 Doc agora é obrigatório para salvar

    return (
        <div id="modal-wrapper" className="fixed inset-0 z-[200] bg-black/95 backdrop-blur-sm overflow-y-auto p-4 sm:p-8 font-sans print:absolute print:top-0 print:left-0 print:w-full print:h-auto print:bg-white print:p-0 print:m-0 print:overflow-visible">
            
            <div className="max-w-5xl mx-auto mb-8 bg-[#111] p-6 rounded-2xl border border-gray-800 print:hidden relative mt-10 shadow-2xl">
                
                <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-white transition z-10">
                    <X size={24} />
                </button>

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
                            <button onClick={onClose} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-6 rounded-xl transition">
                                Voltar ao Painel
                            </button>
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="flex items-center gap-4 mb-6 border-b border-gray-800 pb-4">
                            <h2 className="text-2xl font-bold flex items-center gap-2 text-white">
                                <FileSignature className="text-cyan-500" /> Gerador de Contrato Premium
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            
                            <div className="space-y-4">
                                <h3 className="text-cyan-400 font-bold text-sm border-b border-gray-800 pb-1">1. Partes Envolvidas</h3>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Cliente Atual</label>
                                    <div className="mt-1 bg-gray-900/50 border border-gray-800 rounded-xl p-3 text-white flex items-center gap-3">
                                        <User size={16} className="text-cyan-500" />
                                        <div className="flex-1 truncate">
                                            <p className="text-sm font-bold truncate">{clientName}</p>
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Seu Nome / Empresa *</label>
                                    <input type="text" value={consultantName} onChange={(e) => setConsultantName(e.target.value)} className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none" />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Seu CPF / CNPJ *</label>
                                    <input type="text" value={consultantDoc} onChange={handleDocChange} placeholder="000.000.000-00" className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none" />
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-cyan-400 font-bold text-sm border-b border-gray-800 pb-1">2. Valores e Condições</h3>
                                <div className="flex gap-2">
                                    <div className="w-1/2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Valor (R$) *</label>
                                        <input type="text" placeholder="1500,00" value={contractValue} onChange={(e) => setContractValue(e.target.value)} className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none" />
                                    </div>
                                    <div className="w-1/2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Meses</label>
                                        <input type="number" value={contractDuration} onChange={(e) => setContractDuration(e.target.value)} className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none" />
                                    </div>
                                </div>
                                
                                <div className="flex gap-2">
                                    <div className={paymentMethod === 'parcelado' ? 'w-1/2' : 'w-full'}>
                                        <label className="text-xs font-bold text-gray-500 uppercase">Pagamento</label>
                                        <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none cursor-pointer">
                                            <option value="a_vista">À Vista</option>
                                            <option value="parcelado">Parcelado</option>
                                        </select>
                                    </div>
                                    {paymentMethod === 'parcelado' && (
                                        <div className="w-1/2 animate-in fade-in">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Parcelas</label>
                                            <input type="number" placeholder="Ex: 3" value={installments} onChange={(e) => setInstallments(e.target.value)} className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none" />
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    <div className="w-1/2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Multa Atraso (%)</label>
                                        <input type="number" placeholder="Opcional" value={penaltyFee} onChange={(e) => setPenaltyFee(e.target.value)} className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none" />
                                    </div>
                                    <div className="w-1/2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Juros ao Mês (%)</label>
                                        <input type="number" placeholder="Opcional" value={interestRate} onChange={(e) => setInterestRate(e.target.value)} className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none" />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-cyan-400 font-bold text-sm border-b border-gray-800 pb-1">3. Regras e Assinatura</h3>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Aviso Prévio Cancelamento (Dias)</label>
                                    <input type="number" value={noticePeriod} onChange={(e) => setNoticePeriod(e.target.value)} className="w-full mt-1 bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none" />
                                </div>

                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase">Estado e Cidade de Foro *</label>
                                    <div className="flex gap-2 mt-1">
                                        <select value={selectedUF} onChange={(e) => { setSelectedUF(e.target.value); setSelectedCityName(''); }} className="bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none w-1/3 cursor-pointer">
                                            <option value="">UF</option>
                                            {states.map(s => (<option key={s.sigla} value={s.sigla}>{s.nome}</option>))}
                                        </select>
                                        <select value={selectedCityName} onChange={(e) => setSelectedCityName(e.target.value)} disabled={!selectedUF} className={`w-2/3 bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none ${!selectedUF ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                                            <option value="">Selecione a cidade</option>
                                            {cities.map(c => (<option key={c.id} value={c.nome}>{c.nome}</option>))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 mb-2 bg-cyan-900/20 border border-cyan-500/30 p-4 rounded-xl flex items-start sm:items-center gap-3 text-cyan-400 text-sm">
                            <Pencil className="shrink-0 mt-0.5 sm:mt-0" size={20} />
                            <p><strong>Truque do Consultor:</strong> O contrato abaixo funciona como o Word! Preencha os dados acima e, se precisar de regras específicas, <strong>clique no texto branco abaixo para reescrever, adicionar ou apagar cláusulas livremente</strong> antes de salvar o PDF.</p>
                        </div>

                        <div className="mt-4 flex justify-end">
                            <button onClick={handlePrint} disabled={!isFormValid} className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 px-8 rounded-xl transition flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed">
                                <Printer size={20} /> Salvar PDF para Assinar
                            </button>
                        </div>

                        <div className="mt-8 pt-6 border-t border-gray-800">
                            <label className="text-sm font-bold text-gray-400 block mb-3">Já assinou no Gov.br? Envie o arquivo final para o cliente:</label>
                            <label className="flex-1 bg-gray-900 border-2 border-dashed border-gray-700 hover:border-cyan-500/50 rounded-xl p-4 transition cursor-pointer text-center group block">
                                <input type="file" accept=".pdf" className="hidden" onChange={handleUploadSigned} disabled={isUploading} />
                                <div className="flex flex-col items-center gap-2">
                                    {isUploading ? (<Loader2 className="animate-spin text-cyan-500" size={24} />) : (<FileUp className="text-gray-500 group-hover:text-cyan-400 transition" size={24} />)}
                                    <span className="text-xs text-gray-400 font-medium">{isUploading ? 'Enviando documento...' : 'Clique para selecionar o contrato assinado (.pdf)'}</span>
                                </div>
                            </label>
                        </div>
                    </>
                )}
            </div>

            <div id="print-area" className="w-full max-w-[210mm] mx-auto bg-white text-black p-6 sm:p-10 md:p-[20mm] shadow-2xl min-h-max md:min-h-[297mm] print:shadow-none print:p-0 print:m-0 relative break-words group">
                
                <div id="print-header" className="flex flex-col md:flex-row justify-between items-center md:items-start border-b-2 border-gray-200 pb-4 mb-6 gap-4 text-center md:text-left">
                    <div id="print-header-left" className="flex flex-col md:flex-row items-center gap-4">
                        {companyLogoUrl && (
                            <img src={companyLogoUrl} alt="Logo" className="max-w-[120px] max-h-[60px] object-contain" />
                        )}
                        <div>
                            <h1 className="text-xl font-black uppercase tracking-wider">{consultantName || consultant?.user_metadata?.full_name || consultant?.name || "Nome do Consultor"}</h1>
                            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Consultoria Financeira Estratégica</p>
                        </div>
                    </div>
                    
                    <div id="print-header-right" className="text-center md:text-right mt-2 md:mt-0">
                        <div className="flex items-center justify-center md:justify-end gap-1 text-cyan-600 font-black text-lg">
                            <ShieldCheck size={20} /> Meu Aliado.
                        </div>
                        <p className="text-[10px] text-gray-400 uppercase mt-1">Plataforma Oficial</p>
                    </div>
                </div>

                <div 
                    contentEditable={true}
                    suppressContentEditableWarning={true}
                    className="text-[12px] md:text-[13px] leading-snug space-y-4 text-justify outline-none hover:bg-gray-100 focus:bg-white p-2 -mx-2 rounded-lg transition"
                >
                    <h2 className="text-center text-sm md:text-base font-bold underline uppercase mb-6">CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE CONSULTORIA FINANCEIRA</h2>

                    <p>
                        Pelo presente instrumento particular, de um lado <strong>{consultantName || "[SEU NOME OU EMPRESA]"}</strong>, inscrito(a) no CPF/CNPJ nº {consultantDoc || "[SEU CPF/CNPJ]"}, doravante denominado(a) <strong>CONTRATADA</strong>, e de outro lado <strong>{clientName || "[NOME DO CLIENTE]"}</strong>, inscrito(a) no CPF nº {clientCPF || "[CPF DO CLIENTE]"}, doravante denominado(a) <strong>CONTRATANTE</strong>, têm entre si justo e contratado o seguinte:
                    </p>

                    <div>
                        <h3 className="font-bold mb-1">CLÁUSULA 1ª – DO OBJETO</h3>
                        <p>O presente contrato tem como objeto a prestação de serviços de Consultoria Financeira Pessoal, incluindo:</p>
                        <ul className="list-disc pl-5 mt-1 space-y-0.5">
                            <li>Análise de fluxo de caixa</li>
                            <li>Mapeamento de receitas, despesas e dívidas</li>
                            <li>Planejamento financeiro estratégico</li>
                            <li>Acompanhamento financeiro</li>
                        </ul>
                        <p className="mt-1">Os serviços serão realizados com o apoio da plataforma digital "Meu Aliado".</p>
                        <p className="mt-1"><strong>Parágrafo único:</strong> A CONTRATADA não atua como corretora, gestora de investimentos ou analista de valores mobiliários, não realizando recomendações diretas de compra ou venda de ativos financeiros.</p>
                    </div>

                    <div>
                        <h3 className="font-bold mb-1">CLÁUSULA 2ª – DO USO DA PLATAFORMA</h3>
                        <p>O CONTRATANTE declara estar ciente de que:</p>
                        <ul className="list-disc pl-5 mt-1 space-y-0.5">
                            <li>A plataforma Meu Aliado será utilizada para registro e análise das informações financeiras;</li>
                            <li>É de sua responsabilidade manter os dados atualizados e corretos;</li>
                            <li>O acesso à conta é pessoal e intransferível.</li>
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-bold mb-1">CLÁUSULA 3ª – DOS HONORÁRIOS E FORMA DE PAGAMENTO</h3>
                        <p>Pelos serviços prestados, o CONTRATANTE pagará à CONTRATADA o valor de <strong>R$ {contractValue || "______,__"}</strong>, podendo ser pago da seguinte forma:</p>
                        <ul className="list-none pl-2 mt-1 space-y-0.5">
                            <li>( {paymentMethod === 'a_vista' ? 'X' : ' '} ) À vista</li>
                            <li>( {paymentMethod === 'parcelado' ? 'X' : ' '} ) Parcelado em <strong>{paymentMethod === 'parcelado' ? (installments || '___') : '___'}</strong> vezes</li>
                        </ul>
                        
                        {(penaltyFee || interestRate) && (
                            <>
                                <p className="mt-1">Em caso de atraso no pagamento, será aplicada:</p>
                                <ul className="list-disc pl-5 mt-1 space-y-0.5">
                                    {penaltyFee && <li>Multa de <strong>{penaltyFee}%</strong> sobre o valor devido</li>}
                                    {interestRate && <li>Juros de <strong>{interestRate}%</strong> ao mês</li>}
                                </ul>
                            </>
                        )}
                    </div>

                    <div>
                        <h3 className="font-bold mb-1">CLÁUSULA 4ª – DO PRAZO</h3>
                        <p>O presente contrato terá duração de <strong>{contractDuration} meses</strong>, iniciando-se na data de sua assinatura.</p>
                    </div>

                    <div>
                        <h3 className="font-bold mb-1">CLÁUSULA 5ª – DO ESCOPO DO SERVIÇO</h3>
                        <p><strong>A prestação do serviço inclui:</strong> Acompanhamento financeiro periódico, análise de dados financeiros e orientações estratégicas.</p>
                        <p className="mt-1"><strong>Não estão inclusos:</strong> Atendimento ilimitado fora dos canais definidos, execução direta de operações financeiras e garantia de resultados financeiros específicos.</p>
                    </div>

                    <div>
                        <h3 className="font-bold mb-1">CLÁUSULA 6ª – DAS RESPONSABILIDADES</h3>
                        <p><strong>A CONTRATADA compromete-se a:</strong> Prestar os serviços com profissionalismo e sigilo e utilizar as informações apenas para fins de consultoria.</p>
                        <p className="mt-1"><strong>O CONTRATANTE compromete-se a:</strong> Fornecer informações verídicas, utilizar a plataforma corretamente e tomar decisões financeiras de forma consciente.</p>
                        <p className="mt-1"><strong>Parágrafo único:</strong> As decisões financeiras tomadas são de responsabilidade exclusiva do CONTRATANTE.</p>
                    </div>

                    <div>
                        <h3 className="font-bold mb-1">CLÁUSULA 7ª – DA CONFIDENCIALIDADE</h3>
                        <p>As partes comprometem-se a manter sigilo absoluto sobre todas as informações compartilhadas, em conformidade com a Lei Geral de Proteção de Dados (LGPD).</p>
                    </div>

                    <div>
                        <h3 className="font-bold mb-1">CLÁUSULA 8ª – DA RESCISÃO</h3>
                        <p>O presente contrato poderá ser rescindido por qualquer das partes mediante aviso prévio de <strong>{noticePeriod} dias</strong>.</p>
                        <p className="mt-1">Em caso de cancelamento antecipado: Não haverá devolução de valores já pagos (salvo acordo entre as partes).</p>
                    </div>

                    <div>
                        <h3 className="font-bold mb-1">CLÁUSULA 9ª – DAS DISPOSIÇÕES GERAIS</h3>
                        <p>Este contrato não estabelece vínculo empregatício entre as partes. O serviço prestado é de natureza consultiva. A CONTRATADA não garante resultados financeiros específicos.</p>
                    </div>

                    <div>
                        <h3 className="font-bold mb-1">CLÁUSULA 10ª – DA ASSINATURA DIGITAL</h3>
                        <p>As partes concordam que este contrato poderá ser assinado eletronicamente, tendo validade jurídica, podendo incluir: Registro de data e hora, Endereço de IP e Identificação do dispositivo.</p>
                    </div>

                    <p className="mt-6 text-center italic">
                        E, por estarem de acordo, firmam o presente instrumento.
                    </p>

                    <p className="text-right mt-6">
                        {city || "[Cidade]"}, {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}.
                    </p>

                    <div className="flex justify-between mt-16 px-8">
                        <div className="text-center w-56">
                            <div className="border-t border-black mb-2"></div>
                            <p className="font-bold">{consultantName || "Nome do Consultor"}</p>
                            <p className="text-[10px] text-gray-500">CONTRATADA</p>
                        </div>
                        <div className="text-center w-56">
                            <div className="border-t border-black mb-2"></div>
                            <p className="font-bold">{clientName || "Nome do Cliente"}</p>
                            <p className="text-[10px] text-gray-500">CONTRATANTE</p>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @media print {
                    @page { 
                        size: A4; 
                        margin: 15mm; 
                    }
                    body {
                        visibility: hidden !important;
                        background-color: white !important;
                    }
                    #modal-wrapper {
                        visibility: visible !important;
                    }
                    #print-header {
                        display: flex !important;
                        flex-direction: row !important;
                        justify-content: space-between !important;
                        align-items: flex-start !important;
                    }
                    #print-header-left {
                        display: flex !important;
                        flex-direction: row !important;
                        align-items: center !important;
                        gap: 1rem !important;
                    }
                    #print-header-right {
                        text-align: right !important;
                    }
                    h3, p, ul {
                        page-break-inside: avoid;
                    }
                }
            `}</style>
        </div>
    );
}