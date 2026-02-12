import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* --- 1. CONFIGURAÇÕES DE BLINDAGEM VISUAL --- */
  
  // Remove o cabeçalho 'X-Powered-By: Next.js' 
  // (Dificulta que hackers saibam qual tecnologia você usa)
  poweredByHeader: false,

  // DESATIVA os Source Maps em produção. 
  // Isso é o mais importante: torna o código no "Inspecionar Elemento" 
  // ilegível para humanos, dificultando a cópia da lógica.
  productionBrowserSourceMaps: false,

  // Ativa o modo estrito do React (Bom para evitar bugs silenciosos)
  reactStrictMode: true,

  /* --- 2. CABEÇALHOS DE SEGURANÇA (HTTP HEADERS) --- */
  async headers() {
    return [
      {
        // Aplica essas regras de segurança em TODAS as rotas do site
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload' // Força HTTPS por 2 anos
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN' // Impede que outros sites coloquem seu app num iframe (Anti-Clonagem)
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff' // Impede o navegador de "adivinhar" tipos de arquivo (Anti-Injeção)
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin' // Protege a privacidade da URL de origem
          }
        ],
      },
    ];
  },
};

export default nextConfig;