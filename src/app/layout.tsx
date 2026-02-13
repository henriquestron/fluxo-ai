import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// 1. Identidade Visual (Título da Aba e Descrição)
export const metadata: Metadata = {
  title: "Meu Aliado | Finanças Inteligentes",
  description: "Gerencie suas finanças com Inteligência Artificial.",
  manifest: "/manifest.json", // <--- ISSO AQUI QUE FAZ A MÁGICA
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Aliado",
  },
  formatDetection: {
    telephone: false,
  },
};

// 2. Configuração Mobile (A barra do navegador fica preta para combinar)
export const viewport: Viewport = {
  themeColor: "#050505",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // 3. Configuração de Idioma (pt-BR)
    <html lang="pt-BR" className="dark">
      
      {/* 👇👇👇 ADICIONEI ESTE BLOCO HEAD AQUI 👇👇👇 */}
      <head>
        <script src="https://cdn.jsdelivr.net/npm/driver.js@1.0.1/dist/driver.js.iife.js"></script>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/driver.js@1.0.1/dist/driver.css"/>
      </head>
      {/* 👆👆👆 FIM DO BLOCO HEAD 👆👆👆 */}

      <body
        // Adicionei bg-[#050505] aqui para evitar clarão branco ao carregar
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-[#050505] text-gray-100`}
      >
        {children}
      </body>
    </html>
  );
}