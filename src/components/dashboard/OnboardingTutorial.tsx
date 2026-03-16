import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, CheckCircle2, PlaySquare, Sparkles } from 'lucide-react';

// O seu "banco de dados" de vídeos curtos
const TUTORIAL_STEPS = [
    {
        id: 1,
        title: "Botão Novo Lançamento",
        description: "Clique no Botão Novo, para criar um lançamento ao seu perfil. Podem ser lançados entrada, gastos (rotativos), parcelados e fixos. Escolha qual será o icone do lançamento, escreva uma descrição, coloque o valor e pronto! O lançamento já aparece no seu dashboard e no seu fluxo de caixa :)",
        // Coloquei um GIF de exemplo, depois você troca pelo seu MP4 gravando a tela!
        media: "https://res.cloudinary.com/ddkbqzobz/video/upload/v1773597640/Lan%C3%A7amento_u5reze.mp4" 
    },
    {
        id: 2,
        title: "IA no WhatsApp",
        description: "Mande um áudio dizendo 'Gastei 50 no mercado' e nossa IA faz o lançamento sem você precisar abrir o site.",
        media: "https://media.giphy.com/media/3o85xwxr06YNoFdSbm/giphy.mp4"
    }
];
interface TutorialProps {
    isOpen?: boolean;
    onClose?: () => void;
}

export default function OnboardingTutorial({ isOpen, onClose }: TutorialProps) {
    const [viewState, setViewState] = useState<'hidden' | 'prompt' | 'tour'>('hidden');
    const [currentStep, setCurrentStep] = useState(0);

    // 🟢 NOVA LÓGICA: Se o botão do Header foi clicado, abre direto nos vídeos!
    useEffect(() => {
        if (isOpen) {
            setViewState('tour');
            setCurrentStep(0); // Garante que começa do primeiro vídeo
        } else {
            // Se o state mudar para falso no pai, esconde aqui
            if (viewState === 'tour') setViewState('hidden');
        }
    }, [isOpen]);

    // 🟢 LÓGICA ANTIGA: Auto-open na primeira vez
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
        if (onClose) onClose(); // 🟢 Avisa o page.tsx que fechou
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
    // TELA 2: O CARROSSEL DE VÍDEOS
    // ==========================================
    const step = TUTORIAL_STEPS[currentStep];
    const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-500">
            <div className="bg-[#0a0a0a] border border-gray-800 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col md:flex-row animate-in zoom-in-95 duration-500 relative">
                
                <button 
                    onClick={finishTutorial}
                    className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/50 text-gray-400 hover:text-white hover:bg-gray-800 transition"
                >
                    <X size={18} />
                </button>

                {/* Área do Vídeo */}
                <div className="w-full md:w-1/2 bg-[#111] aspect-video md:aspect-auto relative flex items-center justify-center overflow-hidden border-b md:border-b-0 md:border-r border-gray-800">
                    <video 
                        key={step.media} 
                        autoPlay 
                        loop 
                        muted 
                        playsInline
                        className="w-full h-full object-cover opacity-80"
                    >
                        <source src={step.media} type="video/mp4" />
                    </video>
                    <div className="absolute inset-0 from-[#0a0a0a] via-transparent to-transparent  md:from-transparent md:via-transparent md:to-[#0a0a0a]"></div>
                </div>

                {/* Textos e Controles */}
                <div className="w-full md:w-1/2 p-6 md:p-8 flex flex-col justify-between">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-wider mb-4">
                            Passo {currentStep + 1} de {TUTORIAL_STEPS.length}
                        </div>
                        <h2 className="text-xl font-black text-white mb-3">{step.title}</h2>
                        <p className="text-gray-400 text-sm leading-relaxed">
                            {step.description}
                        </p>
                    </div>

                    <div className="mt-8">
                        <div className="flex items-center gap-2 mb-6">
                            {TUTORIAL_STEPS.map((_, idx) => (
                                <div 
                                    key={idx} 
                                    className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentStep ? 'w-6 bg-cyan-500' : 'w-1.5 bg-gray-800'}`}
                                ></div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            <button 
                                onClick={handlePrev}
                                disabled={currentStep === 0}
                                className={`px-4 py-2.5 rounded-xl font-bold text-sm transition ${currentStep === 0 ? 'opacity-0 pointer-events-none' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}
                            >
                                Voltar
                            </button>

                            <button 
                                onClick={handleNext}
                                className={`flex-1 flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition shadow-lg ${isLastStep ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20' : 'bg-white hover:bg-gray-200 text-black shadow-white/10'}`}
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
        </div>
    );
}