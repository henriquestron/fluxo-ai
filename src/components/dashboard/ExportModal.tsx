import React, { useState, useEffect } from 'react';
import { X, FileSpreadsheet, Download, Loader2, CheckSquare, Square, HelpCircle, Info, UserCircle2, BarChart3, ChevronLeft, ChevronRight } from 'lucide-react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { supabase } from '@/supabase';
import { toast } from 'sonner';

interface ExportModalProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    userPlan: string;
    clients: any[];
    activeTab: string;
    selectedYear: number;
    currentWorkspace?: any;
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const TYPES = [
    { id: 'income', label: 'Entradas (Receitas)' },
    { id: 'expense', label: 'Saídas (Gastos)' },
    { id: 'fixed', label: 'Contas Fixas' },
    { id: 'installment', label: 'Parcelamentos' },
    { id: 'standby', label: 'Itens em Stand-by' },
    { id: 'delayed', label: 'Atrasados' }
];

export default function ExportModal({ isOpen, onClose, user, userPlan, clients, activeTab, selectedYear: initialYear, currentWorkspace }: ExportModalProps) {
    if (!isOpen || !user) return null;

    const isAgent = userPlan === 'agent';

    // --- ESTADOS ---
    const [exportYear, setExportYear] = useState(initialYear);
    const [selectedMonths, setSelectedMonths] = useState<string[]>([activeTab]);
    const [selectedTypes, setSelectedTypes] = useState<string[]>(['income', 'expense', 'fixed', 'installment', 'delayed', 'standby']);
    // 🟢 CORREÇÃO: Já inicia com a conta do Consultor e todos os clientes marcados!
    const [selectedClients, setSelectedClients] = useState<string[]>(isAgent ? [user.id, ...(clients || []).map(c => c.client_id)] : (user ? [user.id] : []));
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [includeDashboard, setIncludeDashboard] = useState(true);

    // --- HELPER: DATAS ---
    const getStartData = (item: any) => {
        if (item.start_date && item.start_date.includes('/')) {
            const p = item.start_date.split('/'); return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) };
        }
        if (item.date && item.date.includes('/')) {
            const p = item.date.split('/'); return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) };
        }
        if (item.created_at) {
            const d = new Date(item.created_at); return { m: d.getMonth(), y: d.getFullYear() };
        }
        return { m: 0, y: exportYear };
    };

    const sanitizeSheetName = (name: string) => {
        let safe = name.replace(/[\\/?*[\]:]/g, "");
        return safe.substring(0, 31);
    };

    // --- FUNÇÕES DE SELEÇÃO ---
    const toggleMonth = (m: string) => setSelectedMonths(prev => prev.includes(m) ? prev.filter(i => i !== m) : [...prev, m]);
    const toggleType = (t: string) => setSelectedTypes(prev => prev.includes(t) ? prev.filter(i => i !== t) : [...prev, t]);
    const toggleClient = (id: string) => setSelectedClients(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    const toggleAllMonths = () => setSelectedMonths(selectedMonths.length === MONTHS.length ? [] : MONTHS);
    const toggleAllClients = () => {
        if (selectedClients.length > 0) setSelectedClients([]);
        else setSelectedClients([user.id, ...(clients || []).map(c => c.client_id)]);
    };

    // --- 1. CONFIGURAR COLUNAS ---
    const setupSheetColumns = (sheet: ExcelJS.Worksheet) => {
        sheet.columns = [
            { header: 'Data', key: 'Data', width: 15 },
            { header: 'Mês', key: 'Mes', width: 10 },
            { header: 'Descrição', key: 'Descricao', width: 40 },
            { header: 'Categoria', key: 'Categoria', width: 20 },
            { header: 'Tipo', key: 'Tipo', width: 15 },
            { header: 'Valor (R$)', key: 'Valor', width: 20 },
            { header: 'Status', key: 'Status', width: 15 },
        ];

        const headerRow = sheet.getRow(1);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
        });
        headerRow.height = 25;
    };

    const styleSheetRows = (sheet: ExcelJS.Worksheet) => {
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                row.getCell('Data').alignment = { horizontal: 'center' };
                row.getCell('Mes').alignment = { horizontal: 'center' };
                
                const valueCell = row.getCell('Valor');
                if (valueCell.value) {
                    valueCell.numFmt = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
                    valueCell.font = { bold: true };
                }
                
                const statusCell = row.getCell('Status');
                const statusText = statusCell.value?.toString() || '';

                if (statusText === 'Pago') {
                    statusCell.font = { color: { argb: 'FF10B981' }, bold: true };
                } else if (statusText === 'Atrasado') {
                    statusCell.font = { color: { argb: 'FFEF4444' }, bold: true };
                } else if (statusText === 'Stand-by') {
                    statusCell.font = { color: { argb: 'FFCA8A04' }, italic: true };
                    row.getCell('Valor').font = { strike: true, color: { argb: 'FF9CA3AF' } };
                }
            }
        });
    };

    // 🟢 HELPER DA IMUNIDADE: Conta paga não pode sumir!
    const isPaidThisMonth = (item: any, tag: string) => {
        if (!item.paid_months) return false;
        return item.paid_months.includes(tag) || item.paid_months.includes(tag.split('/')[0]);
    };

    // --- 3. GERAR DADOS DO MÊS ---
    const processDataForMonth = (monthStr: string, trans: any[], inst: any[], recur: any[]) => {
        const rows: any[] = [];
        const monthIndex = MONTHS.indexOf(monthStr);
        const monthNum = (monthIndex + 1).toString().padStart(2, '0');
        const dateSuffix = `/${monthNum}/${exportYear}`;
        const paymentTag = `${monthStr}/${exportYear}`;

        trans?.forEach(t => {
            if (t.date?.includes(dateSuffix)) {
                let status = t.is_paid ? 'Pago' : 'Pendente';
                if (t.status === 'standby') status = 'Stand-by';
                else if (t.status === 'delayed') status = 'Atrasado';

                const showItem = selectedTypes.includes(t.type) || 
                               (t.status === 'standby' && selectedTypes.includes('standby')) ||
                               (t.status === 'delayed' && selectedTypes.includes('delayed'));

                if (showItem) {
                    rows.push({ Data: t.date, Mes: monthStr, Descricao: t.title, Categoria: t.category, Tipo: t.type === 'income' ? 'Entrada' : 'Saída', Valor: Number(t.amount), Status: status });
                }
            }
        });

        recur?.forEach(r => {
            const { m: sM, y: sY } = getStartData(r);
            const isVisible = exportYear > sY || (exportYear === sY && monthIndex >= sM);
            
            if (isVisible && !r.skipped_months?.includes(monthStr)) {
                let status = isPaidThisMonth(r, paymentTag) ? 'Pago' : 'Pendente';
                const isStandby = r.status === 'standby' || r.standby_months?.includes(paymentTag);
                if (isStandby && status !== 'Pago') status = 'Stand-by';

                const showItem = selectedTypes.includes('fixed') || (status === 'Stand-by' && selectedTypes.includes('standby'));

                if (showItem) {
                    rows.push({ Data: `Dia ${r.due_day}`, Mes: monthStr, Descricao: r.title, Categoria: r.category, Tipo: r.type === 'income' ? 'Entrada (Fixa)' : 'Saída (Fixa)', Valor: Number(r.value), Status: status });
                }
            }
        });

        inst?.forEach(i => {
            const { m: sM, y: sY } = getStartData(i);
            const monthsDiff = ((exportYear - sY) * 12) + (monthIndex - sM);
            const actual = 1 + (i.current_installment || 0) + monthsDiff;

            if (actual >= 1 && actual <= i.installments_count) {
                let status = isPaidThisMonth(i, paymentTag) ? 'Pago' : 'Pendente';
                if (i.status === 'delayed') status = 'Atrasado';
                
                const isStandby = i.status === 'standby' || i.standby_months?.includes(paymentTag);
                if (isStandby && status !== 'Pago') status = 'Stand-by';

                const showItem = selectedTypes.includes('installment') || 
                               (status === 'Stand-by' && selectedTypes.includes('standby')) || 
                               (status === 'Atrasado' && selectedTypes.includes('delayed'));

                if (showItem) {
                    rows.push({ Data: `Dia ${i.due_day}`, Mes: monthStr, Descricao: `${i.title} (${actual}/${i.installments_count})`, Categoria: 'Parcelado', Tipo: 'Saída', Valor: Number(i.value_per_month), Status: status });
                }
            }
        });

        return rows.sort((a,b) => {
            const d1 = parseInt(a.Data.match(/\d+/)?.[0] || '99');
            const d2 = parseInt(b.Data.match(/\d+/)?.[0] || '99');
            return d1 - d2;
        });
    };

    // --- 4. GERAR DASHBOARD ---
    // --- 4. GERAR DASHBOARD ---
    // --- 4. GERAR DASHBOARD ---
    const generateDashboardSheet = (workbook: ExcelJS.Workbook, trans: any[], inst: any[], recur: any[], ownerName: string) => {
        const sheetName = sanitizeSheetName(`Dash - ${ownerName}`);
        const sheet = workbook.addWorksheet(sheetName, { views: [{ showGridLines: false }] });

        // 🟢 MUDOU DE F2 PARA G2 (Para cobrir a nova coluna adicionada)
        sheet.mergeCells('B2:G2');
        const title = sheet.getCell('B2');
        title.value = `DASHBOARD FINANCEIRO ${exportYear}`;
        title.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
        title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };
        title.alignment = { horizontal: 'center' };

        sheet.addRow([]);
        
        // 🟢 ADICIONADA A COLUNA 'SALDO ANTERIOR' E O CABEÇALHO ATUALIZADO
        const header = sheet.addRow(['', 'MÊS', 'SALDO ANTERIOR', 'ENTRADAS', 'SAÍDAS', 'SALDO DO MÊS', 'SALDO ACUMULADO']);
        ['B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
            const cell = header.getCell(col);
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4B5563' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
        });
        header.height = 20;

        // A MÁQUINA DO TEMPO (Efeito Cascata para a Planilha)
        let previousSurplus = 0;

        MONTHS.forEach((month, idx) => {
            const mCode = (idx + 1).toString().padStart(2, '0');
            const dateFilter = `/${mCode}/${exportYear}`;
            const paymentTag = `${month}/${exportYear}`;

            // Entradas
            const inc = (trans.filter(t => t.type === 'income' && t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby').reduce((acc, i) => acc + Number(i.amount), 0)) +
                        (recur.filter(r => {
                            const { m: sM, y: sY } = getStartData(r);
                            const paid = isPaidThisMonth(r, paymentTag);
                            if ((r.status === 'delayed' || r.status === 'standby' || r.standby_months?.includes(paymentTag)) && !paid) return false;
                            return r.type === 'income' && (exportYear > sY || (exportYear === sY && idx >= sM)) && !r.skipped_months?.includes(month);
                        }).reduce((acc, i) => acc + Number(i.value), 0));

            // Saídas
            const exp = (trans.filter(t => t.type === 'expense' && t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby').reduce((acc, i) => acc + Number(i.amount), 0)) +
                        (recur.filter(r => {
                            const { m: sM, y: sY } = getStartData(r);
                            const paid = isPaidThisMonth(r, paymentTag);
                            if ((r.status === 'delayed' || r.status === 'standby' || r.standby_months?.includes(paymentTag)) && !paid) return false;
                            return r.type === 'expense' && (exportYear > sY || (exportYear === sY && idx >= sM)) && !r.skipped_months?.includes(month);
                        }).reduce((acc, i) => acc + Number(i.value), 0)) +
                        (inst.reduce((acc, i) => {
                            const paid = isPaidThisMonth(i, paymentTag);
                            if ((i.status === 'delayed' || i.status === 'standby' || i.standby_months?.includes(paymentTag)) && !paid) return acc;
                            
                            const { m: sM, y: sY } = getStartData(i);
                            const diff = ((exportYear - sY) * 12) + (idx - sM);
                            const act = 1 + (i.current_installment || 0) + diff;
                            return (act >= 1 && act <= i.installments_count) ? acc + Number(i.value_per_month) : acc;
                        }, 0));

            // 🟢 LÓGICA DE SALDO CLARA (Com a nova coluna)
            const saldoAnterior = previousSurplus;
            const saldoMensal = inc - exp;
            const saldoAcumulado = saldoMensal + saldoAnterior;

            // Define o que sobra para o próximo mês da planilha (Arrasta lucro e dívida)
            previousSurplus = saldoAcumulado;

            // 🟢 Passando as 6 colunas de dados agora
            const r = sheet.addRow(['', month, saldoAnterior, inc, exp, saldoMensal, saldoAcumulado]);
            
            // Formatando como Moeda (Da coluna C até a G)
            ['C', 'D', 'E', 'F', 'G'].forEach(col => r.getCell(col).numFmt = '"R$" #,##0.00;[Red]-"R$" #,##0.00');
            
            // Pintando de Verde (Positivo) ou Vermelho (Negativo)
            r.getCell('C').font = { color: { argb: saldoAnterior >= 0 ? 'FF166534' : 'FFDC2626' } };
            r.getCell('F').font = { color: { argb: saldoMensal >= 0 ? 'FF166534' : 'FFDC2626' } };
            r.getCell('G').font = { color: { argb: saldoAcumulado >= 0 ? 'FF166534' : 'FFDC2626' }, bold: true };
        });

        // 🟢 Largura das colunas (Adicionada a Coluna G)
        sheet.getColumn('B').width = 10;
        sheet.getColumn('C').width = 18; // Saldo Anterior
        sheet.getColumn('D').width = 18; // Entradas
        sheet.getColumn('E').width = 18; // Saídas
        sheet.getColumn('F').width = 18; // Saldo do Mês
        sheet.getColumn('G').width = 22; // Saldo Acumulado
    };

    // --- EXPORTAÇÃO FINAL ---
    const handleExport = async () => {
        if (selectedMonths.length === 0) return toast.warning("Selecione pelo menos um mês.");
        
        // 🟢 TRAVA DE SEGURANÇA: Exige ao menos uma conta selecionada (para não dar erro)
        if (isAgent && selectedClients.length === 0) {
            return toast.warning("Selecione pelo menos a sua conta ou a de um cliente.");
        }

        setIsGenerating(true);
        const toastId = toast.loading("Gerando arquivo Excel...");

        try {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = "Meu Aliado Financeiro";
            
            let targets: any[] = [];
            if (isAgent) {
                targets = (clients || []).filter(c => selectedClients.includes(c.client_id));
                if (selectedClients.includes(user.id)) targets.unshift({ client_id: user.id, client_email: 'Minha Conta' });
            } else {
                targets = [{ client_id: user.id, client_email: 'Meus Dados' }];
            }

            // Loop por cada "Pessoa"
            // Loop por cada "Pessoa"
            for (const target of targets) {
                let workspaceId = null;

                // 🟢 A GRANDE SACADA: 
                // Se for o seu próprio usuário, usa EXATAMENTE a aba (workspace) que está aberta na tela!
                if (target.client_id === user.id && currentWorkspace) {
                    workspaceId = currentWorkspace.id;
                } else {
                    // Se for um cliente (Visão do Consultor), pega a primeira área de trabalho do cliente
                    const { data: ws } = await supabase.from('workspaces').select('id').eq('user_id', target.client_id).order('created_at', { ascending: true }).limit(1).maybeSingle();
                    if (ws) workspaceId = ws.id;
                }

                let t, i, r;

                if (workspaceId) {
                    // Puxa APENAS os dados da área de trabalho correta
                    const [resT, resI, resR] = await Promise.all([
                        supabase.from('transactions').select('*').eq('user_id', target.client_id).eq('context', workspaceId),
                        supabase.from('installments').select('*').eq('user_id', target.client_id).eq('context', workspaceId),
                        supabase.from('recurring').select('*').eq('user_id', target.client_id).eq('context', workspaceId)
                    ]);
                    t = resT.data; i = resI.data; r = resR.data;
                } else {
                    // Fallback (caso o usuário seja muito antigo e não tenha workspace)
                    const [resT, resI, resR] = await Promise.all([
                        supabase.from('transactions').select('*').eq('user_id', target.client_id),
                        supabase.from('installments').select('*').eq('user_id', target.client_id),
                        supabase.from('recurring').select('*').eq('user_id', target.client_id)
                    ]);
                    t = resT.data; i = resI.data; r = resR.data;
                }

                const owner = target.client_email.split('@')[0];

                // 1. Gera Dashboard Anual
                if (includeDashboard) {
                    generateDashboardSheet(workbook, t || [], i || [], r || [], owner);
                }

                // 2. Gera Abas Mensais
                for (const month of selectedMonths) {
                    const baseName = targets.length > 1 ? `${month} ${owner}` : month;
                    const sheetName = sanitizeSheetName(baseName);
                    
                    const existingSheet = workbook.getWorksheet(sheetName);
                    const finalSheetName = existingSheet ? sanitizeSheetName(`${baseName} 2`) : sheetName;

                    const sheet = workbook.addWorksheet(finalSheetName);
                    setupSheetColumns(sheet);
                    const rows = processDataForMonth(month, t || [], i || [], r || []);
                    rows.forEach(r => sheet.addRow(r));
                    styleSheetRows(sheet);
                }
            }

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Relatorio_${exportYear}_${new Date().toISOString().slice(0,10)}.xlsx`);
            toast.success("Download concluído!");
            onClose();

        } catch (error: any) {
            console.error(error);
            toast.error("Erro ao gerar: " + error.message);
        } finally {
            setIsGenerating(false);
            toast.dismiss(toastId);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[300] p-4 animate-in fade-in zoom-in duration-300">
            <div className="bg-[#111] border border-gray-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
                
                {/* HEADER */}
                <div className="p-6 border-b border-gray-800 bg-[#0a0a0a] flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2"><FileSpreadsheet className="text-emerald-500" size={24} /> Exportar Excel</h2>
                        <p className="text-xs text-gray-500 mt-1">Gere relatórios detalhados e organizados.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-500 hover:text-white p-2 rounded-lg hover:bg-gray-800"><X size={24}/></button>
                </div>

                {/* BODY (SCROLLABLE) */}
                <div className="p-6 overflow-y-auto space-y-6 scrollbar-thin scrollbar-thumb-gray-800">
                    
                    {/* SELETOR DE ANO */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">1. Ano de Referência</h3>
                        <div className="flex items-center gap-4 bg-black/40 p-2 rounded-2xl border border-gray-800 w-fit">
                            <button onClick={() => setExportYear(p => p - 1)} className="p-2 hover:bg-gray-800 rounded-xl text-gray-400"><ChevronLeft size={20}/></button>
                            <span className="text-xl font-black text-cyan-400 w-20 text-center">{exportYear}</span>
                            <button onClick={() => setExportYear(p => p + 1)} className="p-2 hover:bg-gray-800 rounded-xl text-gray-400"><ChevronRight size={20}/></button>
                        </div>
                    </div>

                    {/* SELETOR DE MESES */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-end">
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">2. Meses</h3>
                            <button onClick={toggleAllMonths} className="text-xs text-emerald-400 hover:underline">Selecionar Todos</button>
                        </div>
                        <div className="grid grid-cols-4 md:grid-cols-6 gap-2 p-2 bg-black/20 rounded-xl">
                            {MONTHS.map(m => (
                                <button key={m} onClick={() => toggleMonth(m)} className={`text-xs py-2 rounded-lg border transition font-medium ${selectedMonths.includes(m) ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-600'}`}>{m}</button>
                            ))}
                        </div>
                    </div>

                    {/* TIPOS DE DADOS */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">3. O que incluir?</h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            {TYPES.map(type => (
                                <button key={type.id} onClick={() => toggleType(type.id)} className={`flex items-center gap-2 p-3 rounded-xl border transition text-sm text-left ${selectedTypes.includes(type.id) ? 'bg-gray-800 border-emerald-500 text-emerald-400' : 'bg-gray-900 border-gray-800 text-gray-500 hover:bg-gray-800'}`}>
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedTypes.includes(type.id) ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600'}`}>
                                        {selectedTypes.includes(type.id) && <CheckSquare size={12} className="text-black"/>}
                                    </div>
                                    <span className="truncate">{type.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* 🟢 SELEÇÃO DE CLIENTES (SÓ PARA AGENTES E ADMINS) */}
                    {isAgent && (
                        <div className="space-y-3 border-t border-gray-800/50 pt-4 mt-2">
                            <div className="flex justify-between items-end">
                                <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-2">
                                    <UserCircle2 size={16} /> 4. Clientes (Visão de Consultor)
                                </h3>
                                <button onClick={toggleAllClients} className="text-xs text-emerald-400 hover:underline">Selecionar Todos</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 pr-1">
                                
                                {/* A CONTA DO PRÓPRIO CONSULTOR */}
                                <button 
                                    onClick={() => toggleClient(user.id)} 
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition text-sm text-left ${selectedClients.includes(user.id) ? 'bg-gray-800 border-emerald-500 text-emerald-400' : 'bg-gray-900 border-gray-800 text-gray-500 hover:bg-gray-800'}`}
                                >
                                    <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedClients.includes(user.id) ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600'}`}>
                                        {selectedClients.includes(user.id) && <CheckSquare size={12} className="text-black"/>}
                                    </div>
                                    <UserCircle2 size={16} className="text-gray-400" />
                                    <span className="truncate font-bold">Minha Conta (Pessoal)</span>
                                </button>

                                {/* A CONTA DOS CLIENTES */}
                                {(clients || []).map(client => (
                                    <button 
                                        key={client.client_id} 
                                        onClick={() => toggleClient(client.client_id)} 
                                        className={`flex items-center gap-3 p-3 rounded-xl border transition text-sm text-left ${selectedClients.includes(client.client_id) ? 'bg-gray-800 border-emerald-500 text-emerald-400' : 'bg-gray-900 border-gray-800 text-gray-500 hover:bg-gray-800'}`}
                                    >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedClients.includes(client.client_id) ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600'}`}>
                                            {selectedClients.includes(client.client_id) && <CheckSquare size={12} className="text-black"/>}
                                        </div>
                                        <span className="truncate">{client.client_email}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* OPÇÃO DE DASHBOARD */}
                    <div className="bg-gray-900/30 p-4 rounded-xl border border-gray-800 flex items-center gap-3 cursor-pointer hover:border-gray-600 transition" onClick={() => setIncludeDashboard(!includeDashboard)}>
                        <div className={`w-5 h-5 rounded flex items-center justify-center border transition shrink-0 ${includeDashboard ? 'bg-cyan-500 border-cyan-500' : 'border-gray-600 bg-transparent'}`}>
                            {includeDashboard && <CheckSquare size={14} className="text-black"/>}
                        </div>
                        <div>
                            <span className="text-sm font-bold text-white block">Gerar Dashboard Anual</span>
                            <span className="text-xs text-gray-500">Cria uma aba extra com o resumo total de {exportYear}.</span>
                        </div>
                        <BarChart3 className={`ml-auto shrink-0 ${includeDashboard ? 'text-cyan-500' : 'text-gray-600'}`} size={20}/>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="p-6 border-t border-gray-800 bg-[#0a0a0a] shrink-0">
                    <button onClick={handleExport} disabled={isGenerating} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]">
                        {isGenerating ? <Loader2 className="animate-spin"/> : <Download size={20}/>}
                        {isGenerating ? "Processando..." : `Baixar Relatório (${exportYear})`}
                    </button>
                </div>
            </div>
        </div>
    );
}