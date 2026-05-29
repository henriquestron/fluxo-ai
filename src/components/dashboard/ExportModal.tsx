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

// --- 🟢 MOTORES MATEMÁTICOS EXATOS DO MEU ALIADO ---
const safeArray = (val: any) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try { const p = JSON.parse(val); return Array.isArray(p) ? p : []; } catch { return []; }
    }
    return [];
};

const getStartData = (item: any, fallbackYear: number) => {
    if (item.start_date && item.start_date.includes('/')) {
        const p = item.start_date.split('/'); return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) };
    }
    if (item.date && item.date.includes('/')) {
        const p = item.date.split('/'); return { m: parseInt(p[1]) - 1, y: parseInt(p[2]) };
    }
    if (item.created_at) {
        const d = new Date(item.created_at); return { m: d.getMonth(), y: d.getFullYear() };
    }
    return { m: 0, y: fallbackYear };
};

const isPaid = (item: any, tag: string) => {
    if (!item.paid_months) return false;
    const arr = safeArray(item.paid_months);
    return arr.includes(tag) || arr.includes(tag.split('/')[0]);
};

const getCustomValue = (item: any, tag: string, baseValue: number) => {
    if (!item.custom_values) return baseValue;
    const parsedCustom = typeof item.custom_values === 'string' ? JSON.parse(item.custom_values) : item.custom_values;
    return parsedCustom[tag] !== undefined ? Number(parsedCustom[tag]) : baseValue;
};

const getMonthTotals = (monthIndex: number, trans: any[], inst: any[], recur: any[], year: number) => {
    const monthName = MONTHS[monthIndex];
    const mCode = (monthIndex + 1).toString().padStart(2, '0');
    const dateFilter = `/${mCode}/${year}`;
    const paymentTag = `${monthName}/${year}`;
    const currentYYYYMM = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

    const activeRecurring = recur.filter((r: any) => {
        const pd = isPaid(r, paymentTag);
        if ((r.status === 'delayed' || r.status === 'standby') && !pd) return false;
        const standbyArr = safeArray(r.standby_months);
        if (standbyArr.includes(paymentTag) && !pd) return false;
        if (r.cancelled_from && currentYYYYMM >= r.cancelled_from) return false;

        const { m: startMonth, y: startYear } = getStartData(r, year);
        if (year > startYear) return true;
        if (year === startYear && monthIndex >= startMonth) return true;
        return false;
    });

    const incomeFixed = activeRecurring.filter((r: any) => r.type === 'income' && !safeArray(r.skipped_months).includes(monthName)).reduce((acc: number, curr: any) => acc + getCustomValue(curr, paymentTag, Number(curr.value)), 0);
    const incomeVariable = trans.filter((t: any) => t.type === 'income' && t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby').reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);
    const incomeTotal = incomeFixed + incomeVariable;

    const expenseFixed = activeRecurring.filter((r: any) => r.type === 'expense' && !safeArray(r.skipped_months).includes(monthName)).reduce((acc: number, curr: any) => acc + getCustomValue(curr, paymentTag, Number(curr.value)), 0);
    const expenseVariable = trans.filter((t: any) => t.type === 'expense' && t.date?.includes(dateFilter) && t.status !== 'delayed' && t.status !== 'standby' && !t.linked_goal_id).reduce((acc: number, curr: any) => acc + Number(curr.amount), 0);

    const installTotal = inst.reduce((acc: number, curr: any) => {
        const pd = isPaid(curr, paymentTag);
        if ((curr.status === 'delayed' || curr.status === 'standby') && !pd) return acc;
        const standbyArr = safeArray(curr.standby_months);
        if (standbyArr.includes(paymentTag) && !pd) return acc;
        if (curr.cancelled_from && currentYYYYMM >= curr.cancelled_from) return acc;

        const { m: startMonth, y: startYear } = getStartData(curr, year);
        const monthsDiff = ((year - startYear) * 12) + (monthIndex - startMonth);

        let pastStandbys = 0;
        for (let i = 0; i < monthsDiff; i++) {
            const checkM = (startMonth + i) % 12;
            const checkY = startYear + Math.floor((startMonth + i) / 12);
            if (standbyArr.includes(`${MONTHS[checkM]}/${checkY}`)) pastStandbys++;
        }

        const currentInstNum = 1 + (curr.current_installment || 0) + monthsDiff - pastStandbys;

        if (currentInstNum >= 1 && currentInstNum <= curr.installments_count) {
            return acc + getCustomValue(curr, paymentTag, Number(curr.value_per_month));
        }
        return acc;
    }, 0);

    const expenseTotal = expenseVariable + expenseFixed + installTotal;

    return { inc: incomeTotal, exp: expenseTotal, balance: incomeTotal - expenseTotal };
};


export default function ExportModal({ isOpen, onClose, user, userPlan, clients, activeTab, selectedYear: initialYear, currentWorkspace }: ExportModalProps) {
    if (!isOpen || !user) return null;

    const isAgent = userPlan === 'agent' || userPlan === 'admin';

    const [exportYear, setExportYear] = useState(initialYear);
    const [selectedMonths, setSelectedMonths] = useState<string[]>([activeTab]);
    const [selectedTypes, setSelectedTypes] = useState<string[]>(['income', 'expense', 'fixed', 'installment', 'delayed', 'standby']);
    const [selectedClients, setSelectedClients] = useState<string[]>(isAgent ? [user.id, ...(clients || []).map(c => c.client_id)] : (user ? [user.id] : []));
    
    const [isGenerating, setIsGenerating] = useState(false);
    const [includeDashboard, setIncludeDashboard] = useState(true);

    const sanitizeSheetName = (name: string) => name.replace(/[\\/?*[\]:]/g, "").substring(0, 31);

    const toggleMonth = (m: string) => setSelectedMonths(prev => prev.includes(m) ? prev.filter(i => i !== m) : [...prev, m]);
    const toggleType = (t: string) => setSelectedTypes(prev => prev.includes(t) ? prev.filter(i => i !== t) : [...prev, t]);
    const toggleClient = (id: string) => setSelectedClients(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    const toggleAllMonths = () => setSelectedMonths(selectedMonths.length === MONTHS.length ? [] : MONTHS);
    const toggleAllClients = () => {
        if (selectedClients.length > 0) setSelectedClients([]);
        else setSelectedClients([user.id, ...(clients || []).map(c => c.client_id)]);
    };

    // 🟢 FUNÇÕES DE DESIGN PREMIUM DO EXCEL 
    const setupSheetColumns = (sheet: ExcelJS.Worksheet) => {
        sheet.views = [{ state: 'frozen', xSplit: 0, ySplit: 1, showGridLines: false }];

        sheet.columns = [
            { header: 'Data', key: 'Data', width: 15 },
            { header: 'Mês', key: 'Mes', width: 12 },
            { header: 'Descrição', key: 'Descricao', width: 50 },
            { header: 'Categoria', key: 'Categoria', width: 25 },
            { header: 'Tipo', key: 'Tipo', width: 20 },
            { header: 'Valor (R$)', key: 'Valor', width: 20 },
            { header: 'Status', key: 'Status', width: 15 },
        ];

        const headerRow = sheet.getRow(1);
        headerRow.eachCell((cell) => {
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Segoe UI' };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E7490' } }; // Ciano Escuro
            cell.alignment = { vertical: 'middle', horizontal: 'center' };
            cell.border = { bottom: { style: 'medium', color: { argb: 'FF083344' } } };
        });
        headerRow.height = 30; 
    };

    const styleSheetRows = (sheet: ExcelJS.Worksheet) => {
        sheet.eachRow((row, rowNumber) => {
            if (rowNumber > 1) {
                row.font = { name: 'Segoe UI', size: 11, color: { argb: 'FF374151' } };

                const isEven = rowNumber % 2 === 0;
                const rowColor = isEven ? 'FFF9FAFB' : 'FFFFFFFF';
                
                row.eachCell(c => {
                    c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowColor } };
                    c.border = {
                        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
                    };
                });

                row.getCell('Data').alignment = { horizontal: 'center', vertical: 'middle' };
                row.getCell('Mes').alignment = { horizontal: 'center', vertical: 'middle' };
                row.getCell('Descricao').alignment = { vertical: 'middle' };
                row.getCell('Categoria').alignment = { vertical: 'middle', horizontal: 'center' };
                row.getCell('Tipo').alignment = { vertical: 'middle', horizontal: 'center' };
                row.getCell('Status').alignment = { vertical: 'middle', horizontal: 'center' };
                
                const descCell = row.getCell('Descricao');
                const isSurplusRow = descCell.value === '💰 Saldo Acumulado do Mês Anterior';

                if (isSurplusRow) {
                    row.eachCell(c => c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFEFF' } }); 
                    descCell.font = { bold: true, color: { argb: 'FF0891B2' }, name: 'Segoe UI' }; 
                }

                const valueCell = row.getCell('Valor');
                if (valueCell.value !== undefined && valueCell.value !== null) {
                    valueCell.numFmt = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
                    valueCell.font = { bold: true, color: { argb: 'FF111827' }, name: 'Segoe UI' };
                    valueCell.alignment = { vertical: 'middle', horizontal: 'right' };
                }
                
                const statusCell = row.getCell('Status');
                const statusText = statusCell.value?.toString() || '';

                // 🟢 CORREÇÃO DOS STATUS NO ESTILO
                if (statusText === 'Pago' || statusText === 'Recebido') {
                    statusCell.font = { color: { argb: 'FF059669' }, bold: true, name: 'Segoe UI' }; // Verde
                } else if (statusText === 'Atrasado') {
                    statusCell.font = { color: { argb: 'FFDC2626' }, bold: true, name: 'Segoe UI' }; // Vermelho
                } else if (statusText === 'Stand-by') {
                    statusCell.font = { color: { argb: 'FFD97706' }, italic: true, name: 'Segoe UI' }; // Laranja
                    if (!isSurplusRow) row.getCell('Valor').font = { strike: true, color: { argb: 'FF9CA3AF' } };
                } else if (statusText === 'Pendente' || statusText === 'A Receber') {
                    statusCell.font = { color: { argb: 'FF6B7280' }, italic: true, name: 'Segoe UI' }; // Cinza discreto
                }
                
                row.height = 22;
            }
        });
    };

    const processDataForMonth = (monthStr: string, trans: any[], inst: any[], recur: any[]) => {
        const rows: any[] = [];
        const monthIndex = MONTHS.indexOf(monthStr);
        const monthNum = (monthIndex + 1).toString().padStart(2, '0');
        const dateSuffix = `/${monthNum}/${exportYear}`;
        const paymentTag = `${monthStr}/${exportYear}`;
        const currentYYYYMM = `${exportYear}-${monthNum}`;

        let saldoAnterior = 0;
        for (let i = 0; i < monthIndex; i++) {
            const { balance } = getMonthTotals(i, trans, inst, recur, exportYear);
            saldoAnterior += balance;
        }

        if (saldoAnterior !== 0) {
            rows.push({
                Data: `01/${monthNum}/${exportYear}`,
                Mes: monthStr,
                Descricao: '💰 Saldo Acumulado do Mês Anterior',
                Categoria: 'Caixa Inicial',
                Tipo: saldoAnterior >= 0 ? 'Entrada (Saldo)' : 'Saída (Dívida)',
                Valor: Number(saldoAnterior),
                Status: 'Recebido'
            });
        }

        trans?.forEach(t => {
            if (t.date?.includes(dateSuffix) && !t.linked_goal_id) {
                // 🟢 CORREÇÃO: Nomes de status fazem sentido para Entrada ou Saída
                let status = '';
                if (t.type === 'income') {
                    status = t.is_paid ? 'Recebido' : 'A Receber';
                } else {
                    status = t.is_paid ? 'Pago' : 'Pendente';
                }

                if (t.status === 'standby') status = 'Stand-by';
                else if (t.status === 'delayed') status = 'Atrasado';

                if (status === 'Stand-by' && !selectedTypes.includes('standby')) return;
                if (status === 'Atrasado' && !selectedTypes.includes('delayed')) return;

                if (selectedTypes.includes(t.type)) {
                    rows.push({ Data: t.date, Mes: monthStr, Descricao: t.title, Categoria: t.category, Tipo: t.type === 'income' ? 'Entrada' : 'Saída', Valor: Number(t.amount), Status: status });
                }
            }
        });

        recur?.forEach(r => {
            const { m: sM, y: sY } = getStartData(r, exportYear);
            const isVisible = exportYear > sY || (exportYear === sY && monthIndex >= sM);
            const isCancelled = r.cancelled_from && currentYYYYMM >= r.cancelled_from;
            
            if (isVisible && !isCancelled && !safeArray(r.skipped_months).includes(monthStr)) {
                
                // 🟢 CORREÇÃO: Fixas também podem ser Entradas
                let status = '';
                if (r.type === 'income') {
                    status = isPaid(r, paymentTag) ? 'Recebido' : 'A Receber';
                } else {
                    status = isPaid(r, paymentTag) ? 'Pago' : 'Pendente';
                }

                const isStandby = r.status === 'standby' || safeArray(r.standby_months).includes(paymentTag);
                
                if (isStandby && status !== 'Pago' && status !== 'Recebido') status = 'Stand-by';
                else if (r.status === 'delayed' && status !== 'Pago' && status !== 'Recebido') status = 'Atrasado';

                if (status === 'Stand-by' && !selectedTypes.includes('standby')) return;
                if (status === 'Atrasado' && !selectedTypes.includes('delayed')) return;

                if (selectedTypes.includes('fixed')) {
                    const finalVal = getCustomValue(r, paymentTag, Number(r.value));
                    rows.push({ Data: `Dia ${r.due_day}`, Mes: monthStr, Descricao: r.title, Categoria: r.category, Tipo: r.type === 'income' ? 'Entrada (Fixa)' : 'Saída (Fixa)', Valor: finalVal, Status: status });
                }
            }
        });

        inst?.forEach(i => {
            const isCancelled = i.cancelled_from && currentYYYYMM >= i.cancelled_from;
            if (isCancelled) return;

            const { m: sM, y: sY } = getStartData(i, exportYear);
            const monthsDiff = ((exportYear - sY) * 12) + (monthIndex - sM);
            
            const standbyArr = safeArray(i.standby_months);
            let pastStandbys = 0;
            for (let j = 0; j < monthsDiff; j++) {
                const checkM = (sM + j) % 12;
                const checkY = sY + Math.floor((sM + j) / 12);
                if (standbyArr.includes(`${MONTHS[checkM]}/${checkY}`)) pastStandbys++;
            }

            const actual = 1 + (i.current_installment || 0) + monthsDiff - pastStandbys;

            let status = '';
            if (i.type === 'income') {
                status = isPaid(i, paymentTag) ? 'Recebido' : 'A Receber';
            } else {
                status = isPaid(i, paymentTag) ? 'Pago' : 'Pendente';
            }

            const isStandby = i.status === 'standby' || standbyArr.includes(paymentTag);
            
            if (isStandby && status !== 'Pago' && status !== 'Recebido') status = 'Stand-by';
            else if (i.status === 'delayed' && status !== 'Pago' && status !== 'Recebido') status = 'Atrasado';

            const isCarriedOverDebt = actual > i.installments_count && (status === 'Stand-by' || status === 'Atrasado');

            if ((actual >= 1 && actual <= i.installments_count) || isCarriedOverDebt) {
                
                if (status === 'Stand-by' && !selectedTypes.includes('standby')) return;
                if (status === 'Atrasado' && !selectedTypes.includes('delayed')) return;

                if (selectedTypes.includes('installment')) {
                    const finalVal = getCustomValue(i, paymentTag, Number(i.value_per_month));
                    const displayActual = Math.min(actual, i.installments_count); 
                    
                    rows.push({ 
                        Data: `Dia ${i.due_day}`, 
                        Mes: monthStr, 
                        Descricao: `${i.title} (${displayActual}/${i.installments_count})`, 
                        Categoria: 'Parcelado', 
                        Tipo: i.type === 'income' ? 'Entrada' : 'Saída', 
                        Valor: finalVal, 
                        Status: status 
                    });
                }
            }
        });

        return rows.sort((a,b) => {
            if (a.Descricao === '💰 Saldo Acumulado do Mês Anterior') return -1;
            if (b.Descricao === '💰 Saldo Acumulado do Mês Anterior') return 1;
            const d1 = parseInt(a.Data.match(/\d+/)?.[0] || '99');
            const d2 = parseInt(b.Data.match(/\d+/)?.[0] || '99');
            return d1 - d2;
        });
    };

    // 🟢 PASSAMOS A RECEBER AS METAS (goals) PARA INCLUIR NO DASHBOARD
    const generateDashboardSheet = (workbook: ExcelJS.Workbook, trans: any[], inst: any[], recur: any[], goals: any[], ownerName: string, logoId: number | null) => {
        const sheetName = sanitizeSheetName(`Dash - ${ownerName}`);
        const sheet = workbook.addWorksheet(sheetName);

        sheet.views = [{ showGridLines: false, state: 'frozen', ySplit: 4, xSplit: 0 }];

        sheet.getRow(1).height = 15; 
        sheet.getRow(2).height = 50; 

        if (logoId !== null) {
            sheet.addImage(logoId, {
                tl: { col: 1.2, row: 1.2 }, 
                ext: { width: 150, height: 45 }, 
                editAs: 'oneCell'
            });
        }

        sheet.mergeCells('B3:G3');
        const title = sheet.getCell('B3');
        title.value = `📊 Relatório Executivo Anual - ${exportYear}`;
        title.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI' };
        title.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF083344' } }; 
        title.alignment = { horizontal: 'center', vertical: 'middle' };
        sheet.getRow(3).height = 35;

        const header = sheet.getRow(4);
        header.values = ['', 'MÊS REFERÊNCIA', 'SALDO ANTERIOR', 'ENTRADAS (Receitas)', 'SAÍDAS (Despesas)', 'RESULTADO DO MÊS', 'SALDO ACUMULADO'];
        
        ['B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
            const cell = header.getCell(col);
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Segoe UI' };
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E7490' } };
            cell.alignment = { horizontal: 'center', vertical: 'middle' };
            cell.border = {
                top: { style: 'medium', color: { argb: 'FFFFFFFF' } },
                bottom: { style: 'medium', color: { argb: 'FF083344' } },
                left: { style: 'thin', color: { argb: 'FF164E63' } },
                right: { style: 'thin', color: { argb: 'FF164E63' } }
            };
        });
        header.height = 25;

        let previousSurplus = 0;

        MONTHS.forEach((month, idx) => {
            const { inc, exp, balance } = getMonthTotals(idx, trans, inst, recur, exportYear);
            const saldoAnterior = previousSurplus;
            const saldoMensal = balance;
            const saldoAcumulado = saldoMensal + saldoAnterior;
            previousSurplus = saldoAcumulado;

            const row = sheet.addRow(['', month, saldoAnterior, inc, exp, saldoMensal, saldoAcumulado]);
            row.height = 22;
            
            const rowColor = (idx % 2 === 0) ? 'FFF9FAFB' : 'FFFFFFFF';
            
            ['B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
                const cell = row.getCell(col);
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowColor } };
                cell.font = { name: 'Segoe UI', size: 11, color: { argb: 'FF374151' } };
                cell.border = {
                    bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                    left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                    right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
                };
            });

            ['C', 'D', 'E', 'F', 'G'].forEach(col => {
                row.getCell(col).numFmt = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
                row.getCell(col).alignment = { horizontal: 'right', vertical: 'middle' };
            });
            row.getCell('B').alignment = { horizontal: 'center', vertical: 'middle' };
            
            row.getCell('C').font = { color: { argb: saldoAnterior >= 0 ? 'FF059669' : 'FFDC2626' }, name: 'Segoe UI' };
            row.getCell('F').font = { color: { argb: saldoMensal >= 0 ? 'FF059669' : 'FFDC2626' }, name: 'Segoe UI', bold: true };
            row.getCell('G').font = { color: { argb: saldoAcumulado >= 0 ? 'FF059669' : 'FFDC2626' }, bold: true, name: 'Segoe UI', size: 12 };
        });

        const footerRow = sheet.addRow(['', 'TOTAL NO ANO', '', { formula: 'SUM(D5:D16)' }, { formula: 'SUM(E5:E16)' }, { formula: 'SUM(F5:F16)' }, '']);
        footerRow.height = 30;
        
        ['B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
            const cell = footerRow.getCell(col);
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF083344' } }; 
            cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI' };
            cell.alignment = { horizontal: col === 'B' ? 'center' : 'right', vertical: 'middle' };
            if (['D', 'E', 'F'].includes(col)) cell.numFmt = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
        });
        sheet.mergeCells(`B${sheet.lastRow!.number}:C${sheet.lastRow!.number}`); 

        // 🟢 ADICIONANDO AS CAIXINHAS E METAS AO DASHBOARD
        if (goals && goals.length > 0) {
            const startRow = sheet.lastRow!.number + 4; // Deixa 3 linhas em branco
            
            sheet.mergeCells(`B${startRow}:G${startRow}`);
            const goalsTitle = sheet.getCell(`B${startRow}`);
            goalsTitle.value = `🎯 RESUMO DE CAIXINHAS E METAS`;
            goalsTitle.font = { size: 14, bold: true, color: { argb: 'FFFFFFFF' }, name: 'Segoe UI' };
            goalsTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF083344' } };
            goalsTitle.alignment = { horizontal: 'center', vertical: 'middle' };
            sheet.getRow(startRow).height = 35;

            const gHeader = sheet.getRow(startRow + 1);
            gHeader.values = ['', 'NOME DA META / CAIXINHA', 'TIPO', 'VALOR ATUAL', 'META / LIMITE', 'RESTANTE / FALTA', 'PROGRESSO (%)'];
            
            ['B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
                const cell = gHeader.getCell(col);
                cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Segoe UI' };
                cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0E7490' } };
                cell.alignment = { horizontal: 'center', vertical: 'middle' };
                cell.border = {
                    top: { style: 'medium', color: { argb: 'FFFFFFFF' } },
                    bottom: { style: 'medium', color: { argb: 'FF083344' } },
                    left: { style: 'thin', color: { argb: 'FF164E63' } },
                    right: { style: 'thin', color: { argb: 'FF164E63' } }
                };
            });
            gHeader.height = 25;

            goals.forEach((g, idx) => {
                const isWallet = g.type === 'wallet';
                const cat = isWallet ? '👛 Caixinha' : '🎯 Meta';
                const current = Number(g.current_amount || 0);
                const target = Number(g.target_amount || 0);
                const diff = target - current; // Restante ou Falta
                const pct = target > 0 ? (current / target) : 0;

                const gRow = sheet.addRow(['', g.title, cat, current, target, diff, pct]);
                gRow.height = 22;
                
                const rowColor = (idx % 2 === 0) ? 'FFF9FAFB' : 'FFFFFFFF';
                
                ['B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
                    const cell = gRow.getCell(col);
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowColor } };
                    cell.font = { name: 'Segoe UI', size: 11, color: { argb: 'FF374151' } };
                    cell.border = {
                        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
                        right: { style: 'thin', color: { argb: 'FFE5E7EB' } }
                    };
                });

                gRow.getCell('B').alignment = { horizontal: 'left', vertical: 'middle' };
                gRow.getCell('C').alignment = { horizontal: 'center', vertical: 'middle' };
                
                ['D', 'E', 'F'].forEach(col => {
                    gRow.getCell(col).numFmt = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
                    gRow.getCell(col).alignment = { horizontal: 'right', vertical: 'middle' };
                });

                gRow.getCell('G').numFmt = '0.00%';
                gRow.getCell('G').alignment = { horizontal: 'center', vertical: 'middle' };
                
                if (pct >= 1) {
                    gRow.getCell('G').font = { color: { argb: 'FF059669' }, bold: true, name: 'Segoe UI' }; 
                }
            });
        }

        sheet.getColumn('B').width = 25; // Alargou um pouco o nome para as Metas
        sheet.getColumn('C').width = 20; 
        sheet.getColumn('D').width = 22; 
        sheet.getColumn('E').width = 22; 
        sheet.getColumn('F').width = 22; 
        sheet.getColumn('G').width = 20; 
    };

    const handleExport = async () => {
        if (selectedMonths.length === 0) return toast.warning("Selecione pelo menos um mês.");
        
        if (isAgent && selectedClients.length === 0) {
            return toast.warning("Selecione pelo menos a sua conta ou a de um cliente.");
        }

        setIsGenerating(true);
        const toastId = toast.loading("Gerando arquivo Excel premium...");

        try {
            const workbook = new ExcelJS.Workbook();
            workbook.creator = "Meu Aliado Financeiro";

            let logoId: number | null = null;
            try {
                const response = await fetch('/logo-excel.png');
                if (response.ok) {
                    const blob = await response.blob();
                    const buffer = await blob.arrayBuffer();
                    
                    logoId = workbook.addImage({
                        buffer: buffer,
                        extension: 'png',
                    });
                }
            } catch (logoError) {
                console.error("Erro ao carregar logo:", logoError);
            }
            
            let targets: any[] = [];
            if (isAgent) {
                targets = (clients || []).filter(c => selectedClients.includes(c.client_id));
                if (selectedClients.includes(user.id)) targets.unshift({ client_id: user.id, client_email: 'Minha Conta' });
            } else {
                targets = [{ client_id: user.id, client_email: 'Meus Dados' }];
            }

            for (const target of targets) {
                let workspaceId = null;

                if (target.client_id === user.id && currentWorkspace) {
                    workspaceId = currentWorkspace.id;
                } else {
                    const { data: ws } = await supabase.from('workspaces').select('id').eq('user_id', target.client_id).order('created_at', { ascending: true }).limit(1).maybeSingle();
                    if (ws) workspaceId = ws.id;
                }

                let t, i, r, g;

                // 🟢 PUXANDO A TABELA DE GOALS DO BANCO
                if (workspaceId) {
                    const [resT, resI, resR, resG] = await Promise.all([
                        supabase.from('transactions').select('*').eq('user_id', target.client_id).eq('context', workspaceId),
                        supabase.from('installments').select('*').eq('user_id', target.client_id).eq('context', workspaceId),
                        supabase.from('recurring').select('*').eq('user_id', target.client_id).eq('context', workspaceId),
                        supabase.from('goals').select('*').eq('user_id', target.client_id).eq('context', workspaceId)
                    ]);
                    t = resT.data; i = resI.data; r = resR.data; g = resG.data;
                } else {
                    const [resT, resI, resR, resG] = await Promise.all([
                        supabase.from('transactions').select('*').eq('user_id', target.client_id),
                        supabase.from('installments').select('*').eq('user_id', target.client_id),
                        supabase.from('recurring').select('*').eq('user_id', target.client_id),
                        supabase.from('goals').select('*').eq('user_id', target.client_id)
                    ]);
                    t = resT.data; i = resI.data; r = resR.data; g = resG.data;
                }

                const owner = target.client_email.split('@')[0];

                if (includeDashboard) {
                    // Passamos os `goals` para dentro do Dashboard
                    generateDashboardSheet(workbook, t || [], i || [], r || [], g || [], owner, logoId);
                }

                for (const month of selectedMonths) {
                    const baseName = targets.length > 1 ? `${month} ${owner}` : month;
                    const sheetName = sanitizeSheetName(baseName);
                    
                    const existingSheet = workbook.getWorksheet(sheetName);
                    const finalSheetName = existingSheet ? sanitizeSheetName(`${baseName} 2`) : sheetName;

                    const sheet = workbook.addWorksheet(finalSheetName);
                    setupSheetColumns(sheet);
                    const rows = processDataForMonth(month, t || [], i || [], r || []);
                    rows.forEach((rowItem: any) => sheet.addRow(rowItem));
                    styleSheetRows(sheet);
                }
            }

            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            saveAs(blob, `Relatorio_Premium_${exportYear}_${new Date().toISOString().slice(0,10)}.xlsx`);
            toast.success("Download concluído! Relatório premium gerado.");
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
                        <h2 className="text-xl font-bold text-white flex items-center gap-2"><FileSpreadsheet className="text-emerald-500" size={24} /> Exportar Excel Premium</h2>
                        <p className="text-xs text-gray-500 mt-1">Gere relatórios detalhados com design exclusivo.</p>
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

                    {/* 🟢 SELEÇÃO DE CLIENTES */}
                    {isAgent && (
                        <div className="space-y-3 border-t border-gray-800/50 pt-4 mt-2">
                            <div className="flex justify-between items-end">
                                <h3 className="text-sm font-bold text-emerald-500 uppercase tracking-wider flex items-center gap-2">
                                    <UserCircle2 size={16} /> 4. Clientes (Visão de Consultor)
                                </h3>
                                <button onClick={toggleAllClients} className="text-xs text-emerald-400 hover:underline">Selecionar Todos</button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-[160px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-800 pr-1">
                                
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
                            <span className="text-sm font-bold text-white block">Gerar Dashboard Anual Premium</span>
                            <span className="text-xs text-gray-500">Cria uma aba extra com o resumo total, logo e metas da empresa.</span>
                        </div>
                        <BarChart3 className={`ml-auto shrink-0 ${includeDashboard ? 'text-cyan-500' : 'text-gray-600'}`} size={20}/>
                    </div>
                </div>

                {/* FOOTER */}
                <div className="p-6 border-t border-gray-800 bg-[#0a0a0a] shrink-0">
                    <button onClick={handleExport} disabled={isGenerating} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98]">
                        {isGenerating ? <Loader2 className="animate-spin"/> : <Download size={20}/>}
                        {isGenerating ? "Processando..." : `Baixar Relatório Premium (${exportYear})`}
                    </button>
                </div>
            </div>
        </div>
    );
}