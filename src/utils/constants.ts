import { ShoppingCart, Home, Car, Utensils, GraduationCap, HeartPulse, Plane, Gamepad2, Smartphone, DollarSign, Zap } from 'lucide-react';

// Meses do Sistema
export const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

// IDs dos Preços do Stripe
export const STRIPE_PRICES = {
    START: 'price_1SyvGvBVKV78UpHayU9XXe2Q',
    PREMIUM: 'price_1SyvHkBVKV78UpHaHryy3YYP',
    PRO: 'price_1SyvIYBVKV78UpHahHXN0APT',
    AGENT: 'price_1SwQumBVKV78UpHaxUSMAGhW'
};

// Bancos e Cores
export const ACCOUNTS = [
    { id: 'nubank', label: 'Nubank', color: 'bg-[#820AD1]', text: 'text-white' },
    { id: 'inter', label: 'Inter', color: 'bg-[#FF7A00]', text: 'text-white' },
    { id: 'bb', label: 'BB', color: 'bg-[#F8D117]', text: 'text-blue-900' },
    { id: 'itau', label: 'Itaú', color: 'bg-[#EC7000]', text: 'text-white' },
    { id: 'santander', label: 'Santander', color: 'bg-[#CC0000]', text: 'text-white' },
    { id: 'caixa', label: 'Caixa', color: 'bg-[#005CA9]', text: 'text-white' },
    { id: 'bradesco', label: 'Bradesco', color: 'bg-[#CC092F]', text: 'text-white' },
    { id: 'c6', label: 'C6 Bank', color: 'bg-[#222]', text: 'text-white' },
    { id: 'money', label: 'Dinheiro', color: 'bg-emerald-600', text: 'text-white' },
    { id: 'outros', label: 'Outros', color: 'bg-gray-700', text: 'text-gray-300' },
];

// Mapa de Ícones para Categorias/Metas
export const ICON_MAP: any = {
    'shopping-cart': ShoppingCart, 'home': Home, 'car': Car, 'utensils': Utensils,
    'zap': Zap, 'graduation-cap': GraduationCap, 'heart-pulse': HeartPulse,
    'plane': Plane, 'gamepad-2': Gamepad2, 'smartphone': Smartphone, 'dollar-sign': DollarSign
};