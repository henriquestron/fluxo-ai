import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Crown, MessageCircle, Check, Trash2, Pencil, Clock, Target, ChevronRight, FileUp, Calculator, BarChart3, ChevronLeft, CheckCircle2, PlaySquare, Sparkles, Plus, CreditCard, FileSpreadsheet, Bot, ImageIcon, Smartphone, Palette, User, Briefcase, FileSignature, FileText, UserPlus } from 'lucide-react';

// 🟢 1. TUTORIAIS GERAIS (Para todo mundo)
const TUTORIAL_STEPS = [
    {
        id: 1,
        title: "Botão Novo Lançamento",
        description: (
            <>
                Clique no botão <span className="inline-flex items-center gap-1 bg-white text-black px-2 py-0.5 rounded-md text-[11px] font-bold mx-1 whitespace-nowrap shadow-[0_0_10px_rgba(255,255,255,0.15)]"><Plus size={12} /> Novo</span> para criar um registro no seu perfil. Podem ser lançados entradas, gastos (rotativos), parcelados e fixos. Escolha qual será o ícone, escreva a descrição, coloque o valor e pronto! Ele já aparece no seu dashboard e no seu fluxo de caixa :)
            </>
        ),
        media: "https://res.cloudinary.com/ddkbqzobz/video/upload/v1773597640/Lan%C3%A7amento_u5reze.mp4"
    },
    {
        id: 2,
        title: "Importar Contas",
        description: (
            <>
                Tem anotações de gastos no WhatsApp ou no caderno? Clique na área <span className="inline-flex items-center gap-1 border border-dashed border-gray-600 bg-[#111] text-gray-400 px-2 py-0.5 rounded-md text-[11px] font-bold mx-1 whitespace-nowrap"><FileUp size={12} /> Importar</span>. Você pode puxar planilhas (.xlsx), fotos ou colar os textos. Com a ajuda da nossa IA Mágica, o sistema vai ler tudo e criar as contas de uma só vez!
            </>
        ),
        media: "https://res.cloudinary.com/ddkbqzobz/video/upload/v1773705218/Importar_Contas_phnzoy.mp4"
    },
    {
        id: 3,
        title: "Ações Rápidas",
        description: (
            <>
                Aprenda a realizar o pagamento clicando em <span className="inline-flex items-center justify-center bg-gray-800/50 p-1 rounded-md mx-0.5 shadow-sm"><Check size={12} className="text-emerald-500" /></span>. Precisa adiar? Coloque a conta em modo standby no ícone <span className="inline-flex items-center justify-center bg-gray-800/50 p-1 rounded-md mx-0.5 shadow-sm"><Clock size={12} className="text-orange-400" /></span>. Realize a edição <span className="inline-flex items-center justify-center bg-gray-800/50 p-1 rounded-md mx-0.5 shadow-sm"><Pencil size={12} className="text-cyan-400" /></span> para alterar valores ou datas, e saiba como excluir <span className="inline-flex items-center justify-center bg-gray-800/50 p-1 rounded-md mx-0.5 shadow-sm"><Trash2 size={12} className="text-red-400" /></span> o que não é mais necessário. Controle total na ponta do mouse!
            </>
        ),
        media: "https://res.cloudinary.com/ddkbqzobz/video/upload/v1773709847/Fun%C3%A7%C3%A3o_pagar_cso13u.mp4"
    },
    {
        id: 4,
        title: "Fatura Rápida",
        description: (
            <>
                Adicione as faturas do seu cartão de uma vez só! Clicando no botão <span className="inline-flex items-center gap-1 bg-purple-600 text-white px-2 py-0.5 rounded-md text-[11px] font-bold mx-1 uppercase tracking-wider shadow-sm"><CreditCard size={12} /> Faturas</span>, você pode adicionar suas contas parceladas e rotativas no banco correspondente. O sistema se encarrega de criar os lançamentos mensais automaticamente para você :)
            </>
        ),
        media: "https://res.cloudinary.com/ddkbqzobz/video/upload/v1773623405/fatura_q4bmzh.mp4"
    },
    {
        id: 5,
        title: "Aliado IA",
        description: (
            <>
                Utilize o <span className="inline-flex items-center gap-1.5 bg-[#111] border border-gray-800 text-white px-2 py-0.5 rounded-md text-[11px] font-bold mx-1 whitespace-nowrap"><span className="p-0.5 bg-purple-900/30 rounded flex items-center justify-center"><Sparkles size={10} className="text-purple-400" /></span> Aliado IA</span> para lançar suas contas conversando, simular despesas futuras e perguntar sobre sua situação financeira para os próximos meses. Tenha uma visão clara do seu fluxo de caixa e se prepare como um profissional.
            </>
        ),
        media: "https://res.cloudinary.com/ddkbqzobz/video/upload/v1773624400/IA_Aliado_r2gqkq.mp4"
    },
    {
        id: 6,
        title: "Gráficos, Planilhas e Calculadora",
        description: (
            <>
                Utilize as ferramentas de <span className="inline-flex items-center gap-1.5 bg-[#111] border border-gray-800 text-white px-2 py-0.5 rounded-md text-[11px] font-bold mx-1 whitespace-nowrap"><span className="p-0.5 bg-purple-900/30 rounded flex items-center justify-center gap-1"><BarChart3 size={10} className="text-purple-400" /><FileSpreadsheet size={10} className="text-purple-400" /><Calculator size={10} className="text-purple-400" /></span> Gráficos, Planilhas e Calculadora</span> para analisar seus dados, gerar planilhas personalizadas e fazer cálculos rápidos sem sair do aplicativo. Tenha o poder da análise financeira na ponta dos dedos, integrado diretamente ao seu fluxo de caixa.
            </>
        ),
        media: "https://res.cloudinary.com/ddkbqzobz/video/upload/v1773706925/Fun%C3%A7%C3%B5es_Plani._calc._grafi._rb5edv.mp4"
    },
    {
        id: 7,
        title: "Perfis e Metas",
        description: (
            <>
                Precisa separar as finanças de casa de outras responsabilidades? Crie um <span className="inline-flex items-center gap-1 bg-[#111] border border-gray-800 text-white px-2 py-0.5 rounded-md text-[11px] font-bold mx-1 whitespace-nowrap"><FolderPlus size={12} className="text-cyan-500" /> Novo Perfil</span> para manter tudo organizado em espaços diferentes. Além disso, você pode definir seus objetivos clicando em <span className="inline-flex items-center gap-1 bg-[#111] border border-gray-800 text-white px-2 py-0.5 rounded-md text-[11px] font-bold mx-1 whitespace-nowrap"><Target size={12} className="text-orange-500" /> Nova Meta</span> e acompanhar de perto suas maiores conquistas financeiras!
            </>
        ),
        media: "https://res.cloudinary.com/ddkbqzobz/video/upload/v1773709796/Workspace_e_Metas_sq7knz.mp4"
    },
    {
        id: 8,
        title: "Perfil, Personalização e Zap",
        description: (
            <>
                Acesse o seu menu para deixar o sistema com a sua cara! Em <span className="inline-flex items-center gap-1 bg-[#111] border border-gray-800 text-gray-300 px-2 py-0.5 rounded-md text-[11px] font-bold mx-1 whitespace-nowrap"><User size={12} className="text-cyan-500" /> Meu Perfil</span>, você altera seu nome, senha e cadastra seu número. Acesse <span className="inline-flex items-center gap-1 bg-[#111] border border-gray-800 text-gray-300 px-2 py-0.5 rounded-md text-[11px] font-bold mx-1 whitespace-nowrap"><Palette size={12} className="text-purple-500" /> Tema e Cores</span> para mudar o layout e as cores do site. E não esqueça de ativar as <span className="inline-flex items-center gap-1 bg-[#111] border border-gray-800 text-gray-300 px-2 py-0.5 rounded-md text-[11px] font-bold mx-1 whitespace-nowrap"><Smartphone size={12} className="text-emerald-500" /> Notificações Zap <span className="w-5 h-3 bg-emerald-500/80 rounded-full flex items-center justify-end px-[1px] ml-1"><span className="w-2 h-2 bg-white rounded-full shadow-sm"></span></span></span> para receber alertas de contas direto no seu celular!
            </>
        ),
        media: "https://res.cloudinary.com/ddkbqzobz/video/upload/v1773711874/Personaliza%C3%A7%C3%B5es_e_Perfil_lgc2v6.mp4"
    },
    {
        id: 9,
        title: "Integração WhatsApp IA",
        description: (
            <>
                Leve o Meu Aliado para o seu WhatsApp! Envie a mensagem <span className="inline-flex items-center bg-green-900/40 border border-green-500/30 text-green-400 px-2 py-0.5 rounded-md text-[11px] font-mono mx-1">ativar seu-numero</span> para o nosso bot. <strong>Importante:</strong> após enviar, aguarde alguns segundos enquanto o sistema vincula sua conta e verifica seu <span className="inline-flex items-center gap-1 bg-gradient-to-r from-yellow-500 to-amber-600 text-white px-2 py-0.5 rounded-md text-[11px] font-bold mx-1 uppercase tracking-wider shadow-sm"><Crown size={12} /> Plano Pro</span>. A IA não responderá de imediato nesta etapa. Depois de ativado, é só conversar! Mande um áudio pedindo para adicionar um gasto ou pergunte como está sua situação financeira. <span className="inline-flex items-center gap-1 bg-[#111] border border-gray-800 text-gray-300 px-2 py-0.5 rounded-md text-[11px] font-bold mx-1 whitespace-nowrap"><MessageCircle size={12} className="text-green-500" /> WhatsApp IA</span>
            </>
        ),
        media: "https://res.cloudinary.com/ddkbqzobz/video/upload/v1773713078/Whatsapp_jkdp2n.mp4"
    }
];

// 🟢 2. TUTORIAIS DO CONSULTOR (Exclusivos para Agent/Admin)
const CONSULTANT_TUTORIAL_STEPS = [
    {
        id: 1,
        title: "Gerenciamento de Clientes",
        description: (
            <>
                Como consultor, você possui a barra roxa no topo da tela. Clique em <span className="inline-flex items-center gap-1 bg-purple-600/20 text-purple-300 px-2 py-0.5 rounded-md text-[11px] font-bold mx-1 whitespace-nowrap"><UserPlus size={10} /> Add</span> para enviar um convite por e-mail para seu cliente. Assim que ele aceitar, o nome dele aparecerá na barra. Basta clicar no nome para entrar na conta dele e gerenciar todas as finanças!
            </>
        ),
        media: "" // 🔴 COLOQUE AQUI O LINK DO VÍDEO NO CLOUDINARY
    },
    {
        id: 2,
        title: "Gerador de Contratos",
        description: (
            <>
                Fechou negócio? Clique no botão <span className="inline-flex items-center justify-center bg-cyan-500/10 border border-cyan-500/20 text-cyan-500 p-1 rounded-md mx-0.5"><FileSignature size={12} /></span> para abrir o Gerador de Contrato. Preencha os dados, gere o PDF, assine no Gov.br e faça o upload da versão final. O seu cliente receberá uma notificação na hora para visualizar o documento!
            </>
        ),
        media: "" // 🔴 COLOQUE AQUI O LINK DO VÍDEO NO CLOUDINARY
    },
    {
        id: 3,
        title: "Relatórios IA para Clientes",
        description: (
            <>
                Mostre valor para o seu cliente gerando diagnósticos rápidos! Selecione um cliente e clique no botão <span className="inline-flex items-center justify-center bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 p-1 rounded-md mx-0.5"><FileText size={12} /></span>. Nossa Inteligência Artificial vai analisar o saldo e os gastos do mês, criando um relatório visual e profissional, pronto para imprimir em PDF e enviar no WhatsApp dele.
            </>
        ),
        media: "" // 🔴 COLOQUE AQUI O LINK DO VÍDEO NO CLOUDINARY
    }
];


// 🟢 3. ATUALIZAMOS A INTERFACE PARA RECEBER O PLANO DO USUÁRIO
interface TutorialProps {
    isOpen?: boolean;
    onClose?: () => void;
    userPlan?: string;
}

export default function OnboardingTutorial({ isOpen, onClose, userPlan }: TutorialProps) {
    const [viewState, setViewState] = useState<'hidden' | 'prompt' | 'tour'>('hidden');
    const [currentStep, setCurrentStep] = useState(0);

    // 🟢 CONTROLE DAS ABAS (Geral vs Consultor)
    const [activeTab, setActiveTab] = useState<'general' | 'consultant'>('general');

    // Define qual lista de vídeos usar com base na aba selecionada
    const activeSteps = activeTab === 'general' ? TUTORIAL_STEPS : CONSULTANT_TUTORIAL_STEPS;
    const isConsultant = ['agent', 'admin'].includes(userPlan || '');

    useEffect(() => {
        if (isOpen) {
            setViewState('tour');
            setCurrentStep(0);
        } else {
            if (viewState === 'tour') setViewState('hidden');
        }
    }, [isOpen]);

    useEffect(() => {
        const hasSeenTutorial = localStorage.getItem('meualiado_tutorial_seen');
        if (!hasSeenTutorial && !isOpen) {
            const timer = setTimeout(() => setViewState('prompt'), 1000);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    const finishTutorial = () => {
        setViewState('hidden');
        localStorage.setItem('meualiado_tutorial_seen', 'true');
        if (onClose) onClose();
    };

    const startTour = () => {
        setViewState('tour');
    };

    const handleNext = () => {
        if (currentStep < activeSteps.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            finishTutorial();
        }
    };

    const handlePrev = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    if (viewState === 'hidden') return null;

    // ==========================================
    // TELA 1: A PERGUNTA INICIAL (OPT-IN)
    // ==========================================
    if (viewState === 'prompt') {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in zoom-in duration-500">
                <div className="bg-[#0a0a0a] border border-gray-800 rounded-3xl w-full max-w-md p-8 text-center shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-purple-500"></div>

                    <div className="w-16 h-16 bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/5">
                        <Sparkles size={28} className="text-cyan-400" />
                    </div>

                    <h2 className="text-2xl font-black text-white mb-3">Bem-vindo ao Meu Aliado!</h2>
                    <p className="text-gray-400 text-sm mb-8 leading-relaxed">
                        Preparamos um tour rápido de 1 minuto para te mostrar onde ficam os botões principais. Deseja ver agora?
                    </p>

                    <div className="flex flex-col gap-3">
                        <button onClick={startTour} className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-gray-200 transition shadow-lg shadow-white/10 flex items-center justify-center gap-2">
                            <PlaySquare size={18} /> Sim, ver tutorial rápido
                        </button>
                        <button onClick={finishTutorial} className="w-full bg-transparent text-gray-500 font-bold py-3 rounded-xl hover:text-white hover:bg-gray-900 transition">
                            Não, eu me viro sozinho
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // TELA 2: O CARROSSEL DE VÍDEOS (COM ABAS PARA CONSULTORES)
    // ==========================================
    const step = activeSteps[currentStep];
    const isLastStep = currentStep === activeSteps.length - 1;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-500">
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-3xl w-full max-w-4xl p-6 md:p-8 relative shadow-2xl animate-in zoom-in-95 duration-500 flex flex-col max-h-[90vh] overflow-y-auto scrollbar-hide">
                <button onClick={finishTutorial} className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-gray-400 hover:text-white hover:bg-gray-800 transition backdrop-blur-md">
                    <X size={18} />
                </button>

                {/* 🟢 ABAS DE NAVEGAÇÃO (Aparecem apenas se for consultor/admin) */}
                {isConsultant && (
                    <div className="flex border-b border-gray-800 mb-6 mt-2 mx-auto w-full max-w-sm">
                        <button
                            onClick={() => { setActiveTab('general'); setCurrentStep(0); }}
                            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition flex items-center justify-center gap-2 ${activeTab === 'general' ? 'border-cyan-500 text-cyan-400 bg-cyan-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                        >
                            <Sparkles size={16} /> Básicos
                        </button>
                        <button
                            onClick={() => { setActiveTab('consultant'); setCurrentStep(0); }}
                            className={`flex-1 py-2.5 text-xs sm:text-sm font-bold border-b-2 transition flex items-center justify-center gap-2 ${activeTab === 'consultant' ? 'border-purple-500 text-purple-400 bg-purple-500/5' : 'border-transparent text-gray-500 hover:text-gray-300'}`}
                        >
                            <Briefcase size={16} /> Consultor
                        </button>
                    </div>
                )}

                {/* Textos no Topo */}
                <div className="text-center mb-6">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider mb-3 ${activeTab === 'consultant' ? 'bg-purple-500/10 border border-purple-500/20 text-purple-400' : 'bg-cyan-500/10 border border-cyan-500/20 text-cyan-400'}`}>
                        Passo {currentStep + 1} de {activeSteps.length}
                    </div>
                    <h2 className="text-xl md:text-2xl font-black text-white mb-2">{step.title}</h2>

                    <p className="text-gray-400 text-xs md:text-sm max-w-2xl mx-auto leading-relaxed">
                        {step.description}
                    </p>
                </div>

                <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden mb-6 border border-gray-800/80 shadow-inner relative flex items-center justify-center flex-shrink-0">                    {step.media ? (
                    <video key={step.media} autoPlay loop muted playsInline className="w-full h-full object-contain">
                        <source src={step.media} type="video/mp4" />
                    </video>
                ) : (
                    <div className="text-gray-600 flex flex-col items-center gap-2">
                        <PlaySquare size={48} className="opacity-50" />
                        <p className="text-sm">Vídeo em breve</p>
                    </div>
                )}
                </div>

                {/* Controles na Base */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mt-auto">
                    <div className="flex items-center gap-2 order-2 sm:order-1">
                        {activeSteps.map((_, idx) => (
                            <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? (activeTab === 'consultant' ? 'w-6 bg-purple-500' : 'w-6 bg-cyan-500') : 'w-1.5 bg-gray-800'}`}></div>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto order-1 sm:order-2">
                        <button
                            onClick={handlePrev}
                            disabled={currentStep === 0}
                            className={`px-4 py-2.5 rounded-xl font-bold text-sm transition ${currentStep === 0 ? 'opacity-0 pointer-events-none' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                        >
                            Voltar
                        </button>

                        <button
                            onClick={handleNext}
                            className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl font-bold text-sm transition shadow-lg ${isLastStep ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20' : 'bg-white hover:bg-gray-200 text-black shadow-white/10'}`}
                        >
                            {isLastStep ? (
                                <>Concluir <CheckCircle2 size={16} /></>
                            ) : (
                                <>Próximo <ChevronRight size={16} /></>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}