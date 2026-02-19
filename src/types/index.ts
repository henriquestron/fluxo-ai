// --- DADOS FINANCEIROS ---

export interface Transaction {
    id: number;
    user_id: string;
    title: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
    date: string;
    target_month: string;
    status: 'paid' | 'pending' | 'delayed' | 'standby';
    is_paid?: boolean; // Algumas tabelas usam is_paid, outras status
    receipt_url?: string | null;
    receipts?: Record<string, string>;
    icon?: string;
    payment_method?: string;
}

export interface Installment {
    id: number;
    user_id: string;
    title: string;
    total_value: number;
    installments_count: number;
    current_installment: number;
    value_per_month: number;
    due_day: number;
    status: 'active' | 'finished' | 'standby' | 'delayed';
    paid_months?: string[]; // Lista de meses pagos (ex: "Jan/2026")
    receipt_url?: string | null;
    receipts?: Record<string, string>;
    created_at?: string;
    start_date?: string;
    icon?: string;
    context?: string;
}

export interface Recurring {
    id: number;
    user_id: string;
    title: string;
    value: number;
    type: 'income' | 'expense';
    category: string;
    due_day: number;
    status: 'active' | 'inactive' | 'standby' | 'delayed';
    paid_months?: string[];
    skipped_months?: string[];
    receipt_url?: string | null;
    receipts?: Record<string, string>;
    start_date?: string;
    icon?: string;
    context?: string;
}

export interface Goal {
    id: number;
    user_id: string;
    title: string;
    target_amount: number;
    current_amount: number;
    deadline: string | null;
    icon: string;
    color: string;
}

// --- SISTEMA & USUÁRIO ---

export interface ClientUser {
    id: string;
    client_email: string;
    role: 'client';
    status?: string;
    manager_id?: string;
}

export interface UserSettings {
    whatsapp_phone?: string;
    whatsapp_id?: string;
    full_name?: string;
    notify_whatsapp?: boolean;
}

export interface Workspace {
    id: string;
    user_id: string;
    title: string;
    created_at?: string;
}