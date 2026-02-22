import React from 'react';
import { X, Lock, Mail, Loader2, Check, ShieldCheck } from 'lucide-react';

interface AuthModalsProps {
    // Estados de Visibilidade
    isAuthModalOpen: boolean;
    setIsAuthModalOpen: (v: boolean) => void;
    isChangePasswordOpen: boolean;
    setIsChangePasswordOpen: (v: boolean) => void;
    isTermsOpen: boolean;
    setIsTermsOpen: (v: boolean) => void;
    isPrivacyOpen: boolean;
    setIsPrivacyOpen: (v: boolean) => void;

    // Estados do Formulário
    authMode: 'login' | 'signup';
    setAuthMode: (mode: 'login' | 'signup') => void;
    email: string;
    setEmail: (v: string) => void;
    password: string;
    setPassword: (v: string) => void;
    newPassword: string;
    setNewPassword: (v: string) => void;
    termsAccepted: boolean;
    setTermsAccepted: (v: boolean) => void;
    showEmailCheck: boolean;
    setShowEmailCheck: (v: boolean) => void;
    
    // Funções e Status
    handleAuth: () => void;
    handleResetPassword: () => void;
    handleUpdatePassword: () => void;
    loadingAuth: boolean;
    authMessage: string;
}

export default function AuthModals({
    isAuthModalOpen, setIsAuthModalOpen,
    isChangePasswordOpen, setIsChangePasswordOpen,
    isTermsOpen, setIsTermsOpen,
    isPrivacyOpen, setIsPrivacyOpen,
    authMode, setAuthMode,
    email, setEmail,
    password, setPassword,
    newPassword, setNewPassword,
    termsAccepted, setTermsAccepted,
    showEmailCheck, setShowEmailCheck,
    handleAuth, handleResetPassword, handleUpdatePassword,
    loadingAuth, authMessage
}: AuthModalsProps) {

    return (
        <>
            {/* MODAL DE RECUPERAR SENHA */}
            {isChangePasswordOpen && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-md flex items-center justify-center z-[300] p-4">
                    <div className="bg-[#111] border border-gray-800 p-8 rounded-3xl w-full max-w-sm text-center shadow-2xl animate-in zoom-in duration-300">
                        <div className="flex justify-center mb-4"><div className="bg-cyan-900/20 p-4 rounded-full"><Lock className="text-cyan-400" size={32} /></div></div>
                        <h2 className="text-2xl font-bold text-white mb-2">Nova Senha</h2>
                        <p className="text-gray-400 text-sm mb-6">Digite sua nova senha para recuperar o acesso.</p>
                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Digite a nova senha..." className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none mb-6" />
                        <button onClick={handleUpdatePassword} disabled={loadingAuth} className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-xl transition shadow-lg shadow-cyan-900/20 flex items-center justify-center gap-2">
                            {loadingAuth ? <Loader2 className="animate-spin" /> : "Salvar Nova Senha"}
                        </button>
                        <button onClick={() => setIsChangePasswordOpen(false)} className="mt-4 text-xs text-gray-500 hover:text-white underline">Cancelar</button>
                    </div>
                </div>
            )}

            {/* MODAL DE LOGIN / CADASTRO */}
            {isAuthModalOpen && (
                <div className="fixed inset-0 bg-black/90 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
                    <div className="bg-[#111] border border-gray-800 p-8 rounded-3xl w-full max-w-sm shadow-2xl relative text-center">
                        <button onClick={() => setIsAuthModalOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition"><X size={24} /></button>
                        <div className="flex justify-center mb-6">
                            <div className="bg-gray-900/50 p-3 rounded-2xl border border-gray-800">
                                {showEmailCheck ? <Mail className="text-cyan-400" size={32} /> : <Lock className="text-cyan-400" size={32} />}
                            </div>
                        </div>
                        {showEmailCheck ? (
                            <div className="animate-in fade-in zoom-in duration-300">
                                <h2 className="text-2xl font-bold mb-2 text-white">Verifique seu e-mail</h2>
                                <p className="text-gray-400 text-sm mb-6">Enviamos um link de acesso para <b>{email}</b>. Clique nele para ativar sua conta.</p>
                                <div className="bg-cyan-900/20 text-cyan-400 text-xs p-3 rounded-xl border border-cyan-900/50 mb-6">Dica: Verifique a caixa de Spam.</div>
                                <button onClick={() => { setShowEmailCheck(false); setAuthMode('login'); }} className="w-full bg-gray-800 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition flex items-center justify-center gap-2">Voltar para Login</button>
                            </div>
                        ) : (
                            <div>
                                <div className="flex justify-center mb-6">
                                    <div className="flex bg-black p-1 rounded-xl border border-gray-800">
                                        <button onClick={() => setAuthMode('login')} className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${authMode === 'login' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>Entrar</button>
                                        <button onClick={() => setAuthMode('signup')} className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${authMode === 'signup' ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}>Criar Conta</button>
                                    </div>
                                </div>
                                <div className="space-y-4 text-left">
                                    <div>
                                        <label className="text-xs text-gray-500 ml-1 mb-1 block">E-mail</label>
                                        <div className="relative"><Mail className="absolute left-3 top-3.5 text-gray-600" size={16} /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-10 pr-3 text-white focus:border-cyan-500 outline-none transition" /></div>
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 ml-1 mb-1 block">Senha</label>
                                        <div className="relative"><Lock className="absolute left-3 top-3.5 text-gray-600" size={16} /><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" className="w-full bg-gray-900 border border-gray-700 rounded-xl py-3 pl-10 pr-3 text-white focus:border-cyan-500 outline-none transition" /></div>
                                    </div>
                                </div>
                                {authMessage && (<div className={`mt-4 p-3 rounded-lg text-xs flex items-center gap-2 ${authMessage.includes('❌') ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-green-500/10 text-green-400 border border-green-500/20'}`}>{authMessage}</div>)}

                                {/* CHECKBOX DE TERMOS */}
                                {authMode === 'signup' && (
                                    <div className="flex items-start gap-3 mt-4 mb-2 bg-gray-900/50 p-3 rounded-lg border border-gray-800">
                                        <div className="relative flex items-center">
                                            <input type="checkbox" id="terms" checked={termsAccepted} onChange={(e) => setTermsAccepted(e.target.checked)} className="peer h-5 w-5 cursor-pointer appearance-none rounded-md border border-gray-600 bg-gray-800 transition-all checked:border-cyan-500 checked:bg-cyan-600" />
                                            <div className="pointer-events-none absolute top-2/4 left-2/4 -translate-y-2/4 -translate-x-2/4 text-white opacity-0 peer-checked:opacity-100"><Check size={14} strokeWidth={4} /></div>
                                        </div>
                                        <label htmlFor="terms" className="text-xs text-gray-400 cursor-pointer select-none leading-relaxed text-left">
                                            Eu concordo com os <button type="button" onClick={() => setIsTermsOpen(true)} className="text-cyan-500 hover:underline font-bold">Termos de Uso</button> e <button type="button" onClick={() => setIsPrivacyOpen(true)} className="text-cyan-500 hover:underline font-bold">Política de Privacidade</button>, e autorizo o processamento dos meus dados financeiros pela IA.
                                        </label>
                                    </div>
                                )}

                                <button onClick={handleAuth} disabled={loadingAuth} className="w-full bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl transition mt-6 flex items-center justify-center gap-2 shadow-lg shadow-cyan-900/20">
                                    {loadingAuth ? <Loader2 className="animate-spin" size={20} /> : (authMode === 'login' ? 'Acessar Conta' : 'Criar Conta')}
                                </button>

                                {/* AVISO LEGAL OBRIGATÓRIO (Passo 3) */}
                                {authMode === 'signup' && (
                                    <p className="text-center text-[10px] text-gray-500 mt-4 leading-relaxed">
                                        Ao clicar em "Criar Conta", você declara que leu, compreendeu e concorda expressamente com os nossos{' '}
                                        <button type="button" onClick={() => setIsTermsOpen(true)} className="text-cyan-500 hover:text-cyan-400 underline transition">Termos de Uso</button>{' '}
                                        e com nossa{' '}
                                        <button type="button" onClick={() => setIsPrivacyOpen(true)} className="text-cyan-500 hover:text-cyan-400 underline transition">Política de Privacidade</button>.
                                    </p>
                                )}

                                {authMode === 'login' && (<div className="mt-4 pt-4 border-t border-gray-800"><button onClick={handleResetPassword} disabled={loadingAuth} className="text-xs text-gray-500 hover:text-cyan-400 transition underline decoration-gray-700 hover:decoration-cyan-400 underline-offset-4">Esqueci minha senha</button></div>)}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MODAL TERMOS DE USO */}
            {isTermsOpen && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[300] p-4">
                    <div className="bg-[#111] border border-gray-800 p-8 rounded-3xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl relative">
                        <button onClick={() => setIsTermsOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white bg-black/50 p-1 rounded-full"><X size={24} /></button>
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><ShieldCheck className="text-cyan-500" /> Termos de Uso</h2>
                        <div className="overflow-y-auto pr-4 text-gray-400 text-sm space-y-4 scrollbar-thin scrollbar-thumb-gray-700 pb-10">
                            <p><strong>1. Aceitação:</strong> Ao criar uma conta no "Meu Aliado", você concorda expressamente com estes termos.</p>
                            <p><strong>2. Uso da IA:</strong> Nosso sistema utiliza Inteligência Artificial para processar seus dados. Você é responsável por conferir os lançamentos gerados.</p>
                            <p><strong>3. Responsabilidade:</strong> O "Meu Aliado" é uma ferramenta de gestão. Não nos responsabilizamos por decisões financeiras.</p>
                            <p><strong>4. Dados:</strong> Seus dados são criptografados e processados de forma segura.</p>
                            <p><strong>5. Cancelamento e Reembolso:</strong> Você pode cancelar sua assinatura a qualquer momento. Conforme o Art. 49 do Código de Defesa do Consumidor, oferecemos uma garantia de reembolso integral para solicitações feitas em até 7 dias corridos após a primeira compra. Após esse prazo, o cancelamento interrompe a renovação futura, mas não gera estorno de meses já utilizados. Para solicitar o reembolso, entre em contato via Suporte.</p>
                            <div className="mt-4 bg-gray-900/50 p-4 rounded-xl border border-gray-800">
                                <p className="text-gray-300"><strong>6. Isenção de Responsabilidade Financeira e Inteligência Artificial:</strong></p>
                                <p className="mt-2 text-xs leading-relaxed">
                                    O <strong>Meu Aliado</strong> é uma ferramenta de organização gerencial. As análises, sugestões e alertas emitidos pela nossa Inteligência Artificial (Aliado IA) ou pela interface da plataforma possuem caráter estritamente informativo e educacional. <strong>Em nenhuma hipótese configuram recomendação de investimento, aconselhamento financeiro, legal ou contábil profissional.</strong> O usuário é o único responsável por suas decisões financeiras, lucros ou eventuais prejuízos decorrentes de suas escolhas.
                                </p>
                            </div>
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-800 flex justify-end">
                            <button onClick={() => setIsTermsOpen(false)} className="bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-2.5 rounded-xl font-bold transition shadow-lg shadow-cyan-900/20">Entendi</button>
                        </div>
                    </div>
                </div>
            )}

            {/* MODAL POLÍTICA DE PRIVACIDADE */}
            {isPrivacyOpen && (
                <div className="fixed inset-0 bg-black/95 backdrop-blur-xl flex items-center justify-center z-[300] p-4">
                    <div className="bg-[#111] border border-gray-800 p-8 rounded-3xl w-full max-w-2xl h-[80vh] flex flex-col shadow-2xl relative">
                        <button onClick={() => setIsPrivacyOpen(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white bg-black/50 p-1 rounded-full"><X size={24} /></button>
                        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2"><Lock className="text-cyan-500" /> Política de Privacidade (LGPD)</h2>
                        <div className="overflow-y-auto pr-4 text-gray-400 text-sm space-y-4 scrollbar-thin scrollbar-thumb-gray-700 pb-10">
                            <p><strong>1. Conformidade LGPD:</strong> Levamos sua privacidade a sério, em total conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018). Respeitamos rigorosamente seus direitos como titular dos dados.</p>
                            <p><strong>2. Coleta e Uso:</strong> Seus dados financeiros são armazenados de forma segura e utilizados exclusivamente para gerar gráficos, históricos de acompanhamento e garantir o funcionamento interno do sistema.</p>
                            <p><strong>3. Dados Bancários:</strong> Nós <strong>não</strong> salvamos senhas bancárias ou credenciais de acesso de suas instituições financeiras. Apenas processamos os dados de lançamentos e comprovantes que você envia manualmente para a plataforma.</p>
                            <p><strong>4. Inteligência Artificial e Processamento:</strong> A Inteligência Artificial do "Meu Aliado" processa seus inputs (como áudios e textos de gastos) de forma segura no momento da execução, unicamente para categorizar e registrar a transação para você. Seus dados privados <strong>não</strong> são utilizados para treinamento de modelos de IA de terceiros acessíveis ao público.</p>
                            <p><strong>5. Não Comercialização de Dados:</strong> O "Meu Aliado" garante que <strong>nunca</strong> venderá, alugará ou repassará seus dados pessoais, bancários ou padrões de consumo para terceiros, sejam eles bancos, corretoras, agências de publicidade ou anunciantes.</p>
                            <p><strong>6. Seus Direitos e Exclusão:</strong> Você possui o direito inalienável de baixar seus dados (exportação via arquivo Excel) e de solicitar a <strong>exclusão permanente e irrecuperável</strong> da sua conta e de todos os registros associados a ela a qualquer momento através do seu painel de Perfil.</p>
                        </div>
                        <div className="mt-6 pt-6 border-t border-gray-800 flex justify-end">
                            <button onClick={() => setIsPrivacyOpen(false)} className="bg-cyan-600 hover:bg-cyan-700 text-white px-8 py-2.5 rounded-xl font-bold transition shadow-lg shadow-cyan-900/20">Entendi e Concordo</button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}