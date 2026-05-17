"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/supabase";
import {
  Loader2,
  ArrowRight,
  CheckCircle2,
  Instagram,
  MessageCircle,
  Briefcase,
  ShieldCheck,
  Star,
  TrendingUp,
  Lock,
  Share2,
  Check,
  Sparkles,
  Calendar,
  BarChart3,
  Award,
  X,
  ChevronDown,
  Heart,
} from "lucide-react";

import AuthModals from "@/components/auth/AuthModals";

export default function ConsultantLandingPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [consultant, setConsultant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Estados do modal de autenticação
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showEmailCheck, setShowEmailCheck] = useState(false);
  const [isNewConsultant, setIsNewConsultant] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [authMessage, setAuthMessage] = useState("");

  // Efeito de gradiente que segue o mouse
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setMousePosition({
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
        });
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  // Buscar dados do consultor
  useEffect(() => {
    async function fetchConsultant() {
      if (!slug) return;
      setErrorDetails(null);
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "company_name, company_logo, bio, page_welcome_text, social_instagram, social_whatsapp, plan_tier, page_primary_color, page_accent_color, slug"
        )
        .eq("slug", slug)
        .single();

      if (error) {
        console.error("Erro Supabase:", error);
        setErrorDetails(`Erro ao buscar consultor: ${error.message}`);
        setConsultant(null);
      } else if (data) {
        if (data.plan_tier === "agent" || data.plan_tier === "admin") {
          setConsultant(data);
        } else {
          setErrorDetails(`Acesso negado: plano ${data.plan_tier} não possui permissão.`);
          setConsultant(null);
        }
      } else {
        setErrorDetails("Consultor não encontrado.");
        setConsultant(null);
      }
      setLoading(false);
    }
    fetchConsultant();
  }, [slug]);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${consultant?.company_name || "Consultor"} | MeuAliado`,
          text: "Conheça meus serviços financeiros exclusivos.",
          url,
        });
      } catch (err) {
        console.log(err);
      }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [consultant]);

  const handleAuth = async () => {
    setLoadingAuth(true);
    setAuthMessage("");
    try {
      if (authMode === "signup") {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setShowEmailCheck(true);
        setAuthMessage("Conta criada! Verifique seu e-mail.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        window.location.href = "/";
      }
    } catch (err: any) {
      setAuthMessage(`❌ ${err.message}`);
    } finally {
      setLoadingAuth(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) return setAuthMessage("❌ Digite seu e-mail primeiro.");
    setLoadingAuth(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoadingAuth(false);
    if (error) setAuthMessage(`❌ ${error.message}`);
    else setAuthMessage("✅ Link de recuperação enviado.");
  };

  const handleUpdatePassword = async () => {
    // placeholder
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center">
        <div className="relative">
          <div className="absolute inset-0 rounded-full bg-amber-500/30 blur-xl animate-pulse" />
          <Loader2 className="w-14 h-14 text-amber-500 animate-spin relative" />
        </div>
        <p className="text-gray-500 font-mono text-xs mt-6 tracking-widest">CARREGANDO PORTAL</p>
      </div>
    );
  }

  if (!consultant) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-center p-6">
        <div className="bg-red-500/10 p-5 rounded-full mb-6 border border-red-500/30">
          <Lock size={48} className="text-red-400" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2">Acesso Restrito</h1>
        <p className="text-gray-400 mb-4 max-w-md">
          {errorDetails || "Este link é inválido ou o consultor não possui assinatura ativa."}
        </p>
        <button
          onClick={() => router.push("/")}
          className="bg-gray-800 hover:bg-gray-700 px-6 py-2.5 rounded-xl text-sm font-bold transition"
        >
          Voltar ao início
        </button>
      </div>
    );
  }

  const primaryColor = consultant.page_primary_color || "#f59e0b";
  const accentColor = consultant.page_accent_color || "#06b6d4";

  return (
    <>
      <Head>
        <title>{consultant.company_name} | Consultoria Financeira</title>
        <meta name="description" content={consultant.page_welcome_text || consultant.bio || "Organize suas finanças com um consultor especializado."} />
        <meta property="og:title" content={`${consultant.company_name} | MeuAliado`} />
        <meta property="og:description" content={consultant.bio || "Consultoria profissional"} />
        {consultant.company_logo && <meta property="og:image" content={consultant.company_logo} />}
        <meta name="twitter:card" content="summary_large_image" />
      </Head>

      <div
        ref={containerRef}
        className="relative min-h-screen overflow-x-hidden bg-black text-white"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}px ${mousePosition.y}px, rgba(245,158,11,0.08), transparent 50%)`,
        }}
      >
        {/* Glow fixo de fundo */}
        <div className="fixed inset-0 bg-gradient-to-br from-gray-950 via-black to-gray-950 -z-10" />
        <div className="fixed top-1/3 left-1/4 w-96 h-96 bg-cyan-900/20 rounded-full blur-[120px] -z-5" />
        <div className="fixed bottom-1/3 right-1/4 w-96 h-96 bg-amber-900/20 rounded-full blur-[120px] -z-5" />

        {/* Header */}
        <div className="w-full p-6 flex justify-between items-center relative z-20 max-w-6xl mx-auto">
          <div className="flex items-center gap-2 text-xl font-black tracking-tighter">
            <ShieldCheck className="text-amber-500" size={28} />
            <span className="bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">MeuAliado.</span>
          </div>
          <button
            onClick={handleShare}
            className="backdrop-blur-md bg-white/5 px-4 py-2 rounded-full border border-white/10 text-sm font-medium flex items-center gap-2 hover:bg-white/10 transition"
          >
            {copied ? <Check size={16} className="text-green-400" /> : <Share2 size={16} />}
            {copied ? "Link copiado" : "Compartilhar"}
          </button>
        </div>

        <div className="relative z-10 max-w-4xl mx-auto px-4 py-8 md:py-12 animate-fade-in-up">
          {/* Card principal */}
          <div className="bg-gray-900/40 backdrop-blur-2xl border border-gray-800/60 rounded-3xl shadow-2xl overflow-hidden transition-all duration-500 hover:shadow-amber-500/10">
            {/* Banner dinâmico */}
            <div
              className="h-40 md:h-56 w-full relative"
              style={{ background: `linear-gradient(135deg, ${primaryColor}40, ${accentColor}30, #111)` }}
            >
              <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
            </div>

            <div className="px-6 pb-12 md:px-12 flex flex-col items-center text-center -mt-16 md:-mt-20">
              {/* Avatar */}
              <div className="relative group">
                <div
                  className="absolute inset-0 rounded-full blur-xl opacity-70 transition duration-500 group-hover:blur-2xl"
                  style={{ background: `radial-gradient(circle, ${primaryColor}, ${accentColor})` }}
                />
                <div className="w-32 h-32 md:w-44 md:h-44 rounded-full border-[5px] border-gray-900 bg-gray-800 flex items-center justify-center shadow-2xl relative overflow-hidden">
                  {consultant.company_logo ? (
                    <img src={consultant.company_logo} alt={consultant.company_name} className="w-full h-full object-cover" />
                  ) : (
                    <Briefcase size={56} className="text-gray-500" />
                  )}
                </div>
              </div>

              {/* Badges */}
              <div className="flex gap-2 mt-5 mb-3 flex-wrap justify-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-black uppercase">
                  <Star size={12} className="fill-amber-400" /> Credenciado
                </span>
                {consultant.plan_tier === "admin" && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[11px] font-black uppercase">
                    <Award size={12} /> Expert
                  </span>
                )}
              </div>

              <h1 className="text-3xl md:text-5xl font-black bg-gradient-to-r from-white via-white to-gray-400 bg-clip-text text-transparent">
                {consultant.company_name}
              </h1>
              {consultant.bio && (
                <p className="text-gray-300 max-w-lg mx-auto mt-4 mb-8 text-base md:text-lg leading-relaxed">
                  {consultant.bio}
                </p>
              )}

              {/* Links sociais */}
              {(consultant.social_instagram || consultant.social_whatsapp) && (
                <div className="flex flex-wrap justify-center gap-4 mb-12 w-full">
                  {consultant.social_whatsapp && (
                    <a
                      href={`https://wa.me/${consultant.social_whatsapp.replace(/\D/g, "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 min-w-[160px] flex items-center justify-center gap-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] px-5 py-3 rounded-xl transition-all duration-300 text-sm font-bold hover:scale-105"
                    >
                      <MessageCircle size={18} /> WhatsApp
                    </a>
                  )}
                  {consultant.social_instagram && (
                    <a
                      href={`https://instagram.com/${consultant.social_instagram.replace("@", "")}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 min-w-[160px] flex items-center justify-center gap-2 bg-gradient-to-r from-pink-500/10 to-purple-500/10 hover:from-pink-500/20 hover:to-purple-500/20 border border-pink-500/30 text-pink-400 px-5 py-3 rounded-xl transition-all duration-300 text-sm font-bold hover:scale-105"
                    >
                      <Instagram size={18} /> Instagram
                    </a>
                  )}
                </div>
              )}

              {/* Serviços (mock) */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full mb-12">
                {[
                  { icon: BarChart3, title: "Planejamento Financeiro", desc: "Controle de gastos e orçamento" },
                  { icon: TrendingUp, title: "Estratégia de Investimentos", desc: "Carteira alinhada aos seus objetivos" },
                  { icon: Calendar, title: "Acompanhamento Contínuo", desc: "Reuniões e relatórios mensais" },
                ].map((service, idx) => (
                  <div
                    key={idx}
                    className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-4 text-center hover:bg-white/10 transition duration-300 hover:-translate-y-1"
                  >
                    <service.icon className="w-8 h-8 mx-auto mb-2 text-amber-400" />
                    <h4 className="font-bold text-sm">{service.title}</h4>
                    <p className="text-gray-400 text-xs mt-1">{service.desc}</p>
                  </div>
                ))}
              </div>

              {/* Call to Action */}
              <div
                className="w-full rounded-2xl p-[1px] relative overflow-hidden"
                style={{ background: `linear-gradient(135deg, ${primaryColor}, ${accentColor})` }}
              >
                <div className="bg-gray-950/95 backdrop-blur-md rounded-2xl p-6 md:p-8 text-left relative">
                  <div className="absolute -right-6 -top-6 opacity-10 pointer-events-none">
                    <Sparkles size={140} strokeWidth={0.5} />
                  </div>
                  <h3 className="text-xl md:text-2xl font-bold mb-2 flex items-center gap-2">
                    Convite Exclusivo <Sparkles size={20} className="text-amber-400" />
                  </h3>
                  <p className="text-gray-300 mb-6 leading-relaxed">
                    {consultant.page_welcome_text ||
                      "Crie sua conta gratuita e tenha acesso à plataforma de gestão financeira com relatórios inteligentes, controle de metas e suporte direto."}
                  </p>
                  <ul className="space-y-3 mb-8">
                    {[
                      "Painel financeiro interativo em tempo real",
                      "Relatórios com IA e análises preditivas",
                      "Metas e cofrinho para objetivos",
                      "Comunicação direta com seu consultor",
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-center gap-3 text-sm text-gray-200">
                        <div className="bg-cyan-500/20 p-1 rounded-full">
                          <CheckCircle2 size={16} className="text-cyan-400" />
                        </div>
                        {item}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => {
                      setIsAuthModalOpen(true);
                      setAuthMode("signup");
                    }}
                    className="w-full bg-gradient-to-r from-white to-gray-200 hover:from-gray-100 hover:to-white text-gray-950 font-black py-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 transform hover:scale-[1.02] active:scale-95 shadow-lg"
                  >
                    Criar Conta Gratuita <ArrowRight size={18} />
                  </button>
                  <p className="text-center text-gray-500 text-xs mt-4">Sem compromisso • Cancelamento grátis</p>
                </div>
              </div>

              <div className="mt-8 flex items-center gap-2 text-gray-500 text-xs">
                <Lock size={12} />
                <span>Dados criptografados e protegidos</span>
              </div>
            </div>
          </div>

          <div className="text-center mt-10 text-xs text-gray-600">
            Tecnologia fornecida por MeuAliado © {new Date().getFullYear()}
          </div>
        </div>
      </div>

      {/* Modal de autenticação */}
      <AuthModals
        isAuthModalOpen={isAuthModalOpen}
        setIsAuthModalOpen={setIsAuthModalOpen}
        isChangePasswordOpen={isChangePasswordOpen}
        setIsChangePasswordOpen={setIsChangePasswordOpen}
        isTermsOpen={isTermsOpen}
        setIsTermsOpen={setIsTermsOpen}
        isPrivacyOpen={isPrivacyOpen}
        setIsPrivacyOpen={setIsPrivacyOpen}
        authMode={authMode}
        setAuthMode={setAuthMode}
        email={email}
        setEmail={setEmail}
        password={password}
        setPassword={setPassword}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        termsAccepted={termsAccepted}
        setTermsAccepted={setTermsAccepted}
        showEmailCheck={showEmailCheck}
        setShowEmailCheck={setShowEmailCheck}
        isConsultant={isNewConsultant}
        setIsConsultant={setIsNewConsultant}
        companyName={companyName}
        setCompanyName={setCompanyName}
        cnpj={cnpj}
        setCnpj={setCnpj}
        handleAuth={handleAuth}
        handleResetPassword={handleResetPassword}
        handleUpdatePassword={handleUpdatePassword}
        loadingAuth={loadingAuth}
        authMessage={authMessage}
      />

      <style jsx global>{`
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.7s cubic-bezier(0.2, 0.9, 0.4, 1.1) forwards;
        }
      `}</style>
    </>
  );
}

function Head({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}