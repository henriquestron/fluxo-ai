'use client';
import { useState } from 'react';

export default function UpgradeButton({ userId, email }: { userId: string, email: string }) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      // Chama nossa API interna que vai falar com o Stripe
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, email }),
      });
      
      const data = await response.json();
      
      // Redireciona o usuário para a página segura de pagamento do Stripe
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      alert("Erro ao iniciar pagamento.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button 
      onClick={handleCheckout} 
      disabled={loading}
      className="bg-gradient-to-r from-yellow-600 to-orange-500 text-white font-bold py-2 px-4 rounded-full shadow-lg hover:scale-105 transition flex items-center gap-2"
    >
      {loading ? 'Processando...' : '👑 Virar Premium (R$ 29,90)'}
    </button>
  );
}