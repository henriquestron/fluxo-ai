import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, CheckCircle2, PlaySquare, Sparkles } from 'lucide-react';

// O seu "banco de dados" de vídeos curtos
const TUTORIAL_STEPS = [
    {
        id: 1,
        title: "Botão Novo Lançamento",
        description: "Clique no Botão Novo, para criar um lançamento ao seu perfil. Podem ser lançados entrada, gastos (rotativos), parcelados e fixos. Escolha qual será o icone do lançamento, escreva uma descrição, coloque o valor e pronto! O lançamento já aparece no seu dashboard e no seu fluxo de caixa :)",
        media: "https://res.cloudinary.com/ddkbqzobz/video/upload/v1773597640/Lan%C3%A7amento_u5reze.mp4" 
    },
    {
        id: 2,
        title: "Botão Fatura Rápida",
        description: "Adicione as faturas do seu cartão sem precisar de adicionar uma conta de cada vez, clicando no botão de faturas, você pode adicionar suas contas parceladas e rotativas no seu banco correspondente, e o sistema se encarrega de criar os lançamentos mensais automaticamente, sem você precisar se preocupar em criar um por um :)",
        media: "https://res.cloudinary.com/ddkbqzobz/video/upload/v1773623405/fatura_q4bmzh.mp4"
    },
    {
        id: 3,
        title: "Aliado IA",
        description: "Utilize a nossa IA para lançar suas contas, simular suas despesas futuras, perguntar a sua situação financeira para os proximos meses, para ter uma visão clara do seu fluxo de caixa, e se preparar para os meses mais apertados.",
        media: "https://res.cloudinary.com/ddkbqzobz/video/upload/v1773624400/IA_Aliado_r2gqkq.mp4"
    }
];

interface TutorialProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function OnboardingTutorial({ isOpen, onClose }: TutorialProps) {
    const [viewState, setViewState] = useState<'hidden' | 'prompt' | 'tour'>('hidden');
    const [currentStep, setCurrentStep] = useState(0);

    // Se o botão do Header foi clicado, abre direto nos vídeos!
    useEffect(() => {
        if (isOpen) {
            setViewState('tour');
            setCurrentStep(0);
        } else {
            if (viewState === 'tour') setViewState('hidden');
        }
    }, [isOpen]);

    // Auto-open na primeira vez
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
        if (currentStep < TUTORIAL_STEPS.length - 1) {
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
                        <button 
                            onClick={startTour}
                            className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-gray-200 transition shadow-lg shadow-white/10 flex items-center justify-center gap-2"
                        >
                            <PlaySquare size={18} /> Sim, ver tutorial rápido
                        </button>
                        <button 
                            onClick={finishTutorial}
                            className="w-full bg-transparent text-gray-500 font-bold py-3 rounded-xl hover:text-white hover:bg-gray-900 transition"
                        >
                            Não, eu me viro sozinho
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ==========================================
    // TELA 2: O CARROSSEL DE VÍDEOS (NOVO LAYOUT CINEMA)
    // ==========================================
    const step = TUTORIAL_STEPS[currentStep];
    const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-500">
            {/* 🟢 MODAL MAIS LARGO (max-w-4xl) e EMPILHADO */}
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-3xl w-full max-w-4xl p-6 md:p-8 relative shadow-2xl animate-in zoom-in-95 duration-500 flex flex-col">
                
                <button 
                    onClick={finishTutorial}
                    className="absolute top-4 right-4 z-20 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-gray-400 hover:text-white hover:bg-gray-800 transition backdrop-blur-md"
                >
                    <X size={18} />
                </button>

                {/* Textos no Topo */}
                <div className="text-center mb-6">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-wider mb-3">
                        Passo {currentStep + 1} de {TUTORIAL_STEPS.length}
                    </div>
                    <h2 className="text-2xl font-black text-white mb-2">{step.title}</h2>
                    <p className="text-gray-400 text-sm max-w-2xl mx-auto leading-relaxed">
                        {step.description}
                    </p>
                </div>

                {/* 🟢 ÁREA DO VÍDEO: aspect-video garante 16:9, object-contain não corta nada */}
                <div className="w-full aspect-video bg-black rounded-2xl overflow-hidden mb-8 border border-gray-800/80 shadow-inner relative">
                    <video 
                        key={step.media} 
                        autoPlay 
                        loop 
                        muted 
                        playsInline
                        className="w-full h-full object-contain"
                    >
                        <source src={step.media} type="video/mp4" />
                    </video>
                </div>

                {/* Controles na Base */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                    {/* Pontinhos de Progresso */}
                    <div className="flex items-center gap-2 order-2 sm:order-1">
                        {TUTORIAL_STEPS.map((_, idx) => (
                            <div 
                                key={idx} 
                                className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-6 bg-cyan-500' : 'w-1.5 bg-gray-800'}`}
                            ></div>
                        ))}
                    </div>

                    {/* Botões de Navegação */}
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
                                <>Concluir <CheckCircle2 size={16}/></>
                            ) : (
                                <>Próximo <ChevronRight size={16}/></>
                            )}
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}