import React, { useState } from 'react';
import { X, FileSpreadsheet, Download, Loader2, CheckSquare, Square, HelpCircle, Info, UserCircle2 } from 'lucide-react';
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
}

const MONTHS = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const TYPES = [
  { id: 'income', label: 'Entradas (Receitas)' },
  { id: 'expense', label: 'Saídas (Gastos)' },
  { id: 'fixed', label: 'Contas Fixas' },
  { id: 'installment', label: 'Parcelamentos' },
  { id: 'delayed', label: 'Atrasados' },
  { id: 'standby', label: 'Em Stand-by' }
];

export default function ExportModal({ isOpen, onClose, user, userPlan, clients, activeTab }: ExportModalProps) {
  if (!isOpen) return null;

  const isAgent = userPlan === 'agent' || userPlan === 'admin';

  const [selectedMonths, setSelectedMonths] = useState<string[]>([activeTab]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['income', 'expense', 'fixed', 'installment', 'delayed', 'standby']);
  
  // Se for agente, começa vazio. Se for usuário comum, já vem marcado ele mesmo.
  const [selectedClients, setSelectedClients] = useState<string[]>(isAgent ? [] : [user.id]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  // --- FUNÇÕES DE SELEÇÃO ---
  const toggleMonth = (m: string) => setSelectedMonths(prev => prev.includes(m) ? prev.filter(i => i !== m) : [...prev, m]);
  const toggleType = (t: string) => setSelectedTypes(prev => prev.includes(t) ? prev.filter(i => i !== t) : [...prev, t]);
  const toggleClient = (id: string) => setSelectedClients(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  const toggleAllMonths = () => setSelectedMonths(selectedMonths.length === MONTHS.length ? [] : MONTHS);
  
  const toggleAllClients = () => {
    const allIds = clients.map(c => c.client_id);
    if (isAgent) allIds.push(user.id); 

    if (selectedClients.length === allIds.length) setSelectedClients([]);
    else setSelectedClients(allIds);
  };

  // --- 1. CONFIGURAR ESTRUTURA ---
  const setupSheetColumns = (sheet: ExcelJS.Worksheet) => {
    sheet.columns = [
      { header: 'Data', key: 'Data', width: 15 },
      { header: 'Mês Ref.', key: 'Mes', width: 10 },
      { header: 'Descrição', key: 'Descricao', width: 35 },
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
    headerRow.height = 30;
  };

  // --- 2. ESTILIZAR DADOS ---
  const styleSheetRows = (sheet: ExcelJS.Worksheet) => {
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber > 1) {
        // Pula linhas que são apenas separadores visuais (se houver)
        if (row.getCell('Data').value === null && row.getCell('Mes').value !== null) {
            // Estilo para separadores de mês (opcional, caso implementemos visualização única)
            return; 
        }

        row.getCell('Data').alignment = { horizontal: 'center' };
        row.getCell('Mes').alignment = { horizontal: 'center' };
        
        const valueCell = row.getCell('Valor');
        // Só formata se for número
        if (typeof valueCell.value === 'number') {
            valueCell.numFmt = '"R$" #,##0.00;[Red]-"R$" #,##0.00';
            valueCell.font = { bold: true };
        }
        
        const typeCell = row.getCell('Tipo');
        const statusCell = row.getCell('Status');
        const statusText = statusCell.value?.toString() || '';

        if (statusText === 'Pago') {
            statusCell.font = { color: { argb: 'FF10B981' }, bold: true }; 
            typeCell.font = { color: { argb: 'FF10B981' } };
        } else if (statusText === 'Pendente') {
            statusCell.font = { color: { argb: 'FFEF4444' } }; 
            typeCell.font = { color: { argb: 'FFEF4444' } };
        } else if (statusText === 'Stand-by') {
            statusCell.font = { color: { argb: 'FFCA8A04' }, italic: true }; 
            typeCell.font = { color: { argb: 'FFCA8A04' } };
            valueCell.font = { strike: true, color: { argb: 'FF9CA3AF' } }; 
        } else if (statusText === 'Atrasado') {
            statusCell.font = { color: { argb: 'FFDC2626' }, bold: true }; 
        }
      }
    });
  };

  // --- LÓGICA DE GERAÇÃO ---
  const handleExport = async () => {
    if (selectedMonths.length === 0) return toast.warning("Selecione pelo menos um mês.");
    if (isAgent && selectedClients.length === 0) return toast.warning("Selecione pelo menos um cliente (ou sua conta).");
    
    setIsGenerating(true);
    const toastId = toast.loading("Buscando dados...");

    try {
      const workbook = new ExcelJS.Workbook();
      let targets: any[] = [];

      // DEFINIR ALVOS (CLIENTES OU USUÁRIO)
      if (isAgent) {
          const selectedClientObjects = clients.filter(c => selectedClients.includes(c.client_id));
          targets = [...selectedClientObjects];
          if (selectedClients.includes(user.id)) {
              targets.unshift({ client_id: user.id, client_email: 'Minha Conta (Pessoal)' });
          }
      } else {
          targets = [{ client_id: user.id, client_email: 'Meus Dados' }];
      }

      // --- O PULO DO GATO: MODO INTELIGENTE ---
      // Se tivermos APENAS 1 Alvo (seja o próprio agente ou 1 cliente específico),
      // ativamos o modo "Detalhado" que cria abas por mês.
      const singleTargetMode = targets.length === 1;

      for (const target of targets) {
        const targetId = target.client_id;
        
        // Busca Dados
        const { data: trans } = await supabase.from('transactions').select('*').eq('user_id', targetId);
        const { data: inst } = await supabase.from('installments').select('*').eq('user_id', targetId);
        const { data: recur } = await supabase.from('recurring').select('*').eq('user_id', targetId);

        if (singleTargetMode) {
           // MODO DETALHADO (1 Pessoa selecionada = Abas por Mês)
           // Isso resolve seu problema: quando selecionar só você, cria abas separadas!
           for (const month of selectedMonths) {
              const sheetName = month; // Nome da aba = Mês
              const sheet = workbook.addWorksheet(sheetName); 
              setupSheetColumns(sheet);
              const rows = processDataForMonth(month, trans || [], inst || [], recur || []);
              rows.forEach(r => sheet.addRow(r));
              styleSheetRows(sheet);
           }
        } else {
           // MODO PORTFÓLIO (Várias pessoas = Abas por Cliente)
           let sheetName = target.client_email.split('@')[0].substring(0, 30);
           if (target.client_id === user.id) sheetName = "Minha Conta";

           const sheet = workbook.addWorksheet(sheetName);
           setupSheetColumns(sheet); 
           
           const rows: any[] = [];
           selectedMonths.forEach(month => {
              // Adiciona dados do mês
              const monthData = processDataForMonth(month, trans || [], inst || [], recur || []);
              if (monthData.length > 0) {
                 rows.push(...monthData);
                 // Adiciona uma linha vazia entre meses para separar visualmente
                 rows.push({}); 
              }
           });
           
           rows.forEach(r => sheet.addRow(r));
           styleSheetRows(sheet); 
        }
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, `Relatorio_Financeiro_${Date.now()}.xlsx`);
      
      toast.success("Download Concluído!");
      onClose();

    } catch (error: any) {
      console.error(error);
      toast.error("Erro: " + error.message);
    } finally {
      setIsGenerating(false);
      toast.dismiss(toastId);
    }
  };

  const getMonthFromDate = (dateStr: string) => {
    if (!dateStr) return -1;
    if (dateStr.includes('T')) {
        const parts = dateStr.split('T')[0].split('-'); 
        if (parts.length === 3) return parseInt(parts[1], 10);
    }
    if (dateStr.includes('-')) {
         const parts = dateStr.split('-');
         if (parts.length === 3) return parseInt(parts[1], 10);
    }
    if (dateStr.includes('/')) {
         const parts = dateStr.split('/');
         if (parts.length === 3) return parseInt(parts[1], 10);
    }
    return -1;
  }

  const processDataForMonth = (monthStr: string, trans: any[], inst: any[], recur: any[]) => {
      const rows: any[] = [];
      const targetMonthIndex = MONTHS.indexOf(monthStr);
      const targetMonthNum = targetMonthIndex + 1;

      // 1. Transações
      if (trans) {
        trans.forEach(t => {
           let isMatch = false;
           if (t.target_month && t.target_month.trim() === monthStr) isMatch = true;
           if (!isMatch && t.date) {
               const m = getMonthFromDate(t.date);
               if (m === targetMonthNum) isMatch = true;
           }

           if (isMatch) {
               let finalStatus = 'Pendente';
               if (t.status === 'standby') finalStatus = 'Stand-by';
               else if (t.status === 'delayed') finalStatus = 'Atrasado';
               else if (t.is_paid) finalStatus = 'Pago'; 

               let filterType = t.type; 
               if (finalStatus === 'Stand-by') filterType = 'standby';
               if (finalStatus === 'Atrasado') filterType = 'delayed';

               if (selectedTypes.includes(filterType) || (filterType === 'income' && selectedTypes.includes('income')) || (filterType === 'expense' && selectedTypes.includes('expense'))) {
                 rows.push({
                   Data: t.date ? t.date.split('T')[0] : 'S/D', 
                   Mes: monthStr,
                   Descricao: t.title,
                   Categoria: t.category,
                   Tipo: t.type === 'income' ? 'Entrada' : 'Saída',
                   Valor: t.amount,
                   Status: finalStatus
                 });
               }
           }
        });
      }

      // 2. Recorrentes
      if (recur) {
         recur.forEach(r => {
             let finalStatus = 'Recorrente';
             let filterType = 'fixed';
             if (r.status === 'standby') { finalStatus = 'Stand-by'; filterType = 'standby'; }
             
             if (selectedTypes.includes(filterType)) {
                rows.push({
                    Data: `Dia ${r.due_day}`,
                    Mes: monthStr,
                    Descricao: r.title,
                    Categoria: r.category,
                    Tipo: 'Fixo',
                    Valor: r.value,
                    Status: finalStatus
                });
             }
         });
      }

      // 3. Parcelamentos
      if (inst) {
         inst.forEach(i => {
             let finalStatus = 'Em dia';
             let filterType = 'installment';

             if (i.status === 'standby') { finalStatus = 'Stand-by'; filterType = 'standby'; }
             else if (i.status === 'delayed') { finalStatus = 'Atrasado'; filterType = 'delayed'; }
             else if (i.paid_months && i.paid_months.includes(monthStr)) { finalStatus = 'Pago'; }

             if (selectedTypes.includes(filterType)) {
                 rows.push({
                    Data: `Dia ${i.due_day}`,
                    Mes: monthStr,
                    Descricao: `${i.title} (${i.current_installment}/${i.installments_count})`,
                    Categoria: 'Crédito',
                    Tipo: 'Parcela',
                    Valor: i.value_per_month,
                    Status: finalStatus
                 });
             }
         });
      }

      return rows;
  };

  return (
    <div className="fixed inset-0 bg-black/90 backdrop-blur-sm flex items-center justify-center z-[300] p-4 animate-in fade-in zoom-in duration-300">
      <div className="bg-[#111] border border-gray-800 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* HEADER */}
        <div className="p-6 border-b border-gray-800 bg-[#0a0a0a] flex justify-between items-center relative overflow-hidden">
          {showHelp && <div className="absolute inset-0 bg-blue-900/20 animate-pulse z-0 pointer-events-none"></div>}

          <div className="z-10">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="text-emerald-500" size={24} /> Relatório Excel Pro
            </h2>
            <p className="text-xs text-gray-500 mt-1">Exportação formatada e organizada.</p>
          </div>
          
          <div className="flex items-center gap-2 z-10">
            <button 
                onClick={() => setShowHelp(!showHelp)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold transition border ${showHelp ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_15px_rgba(37,99,235,0.5)]' : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white'}`}
            >
                {showHelp ? <X size={14}/> : <HelpCircle size={14}/>}
                {showHelp ? "Fechar Dicas" : "Como funciona?"}
            </button>
            <button onClick={onClose} className="text-gray-500 hover:text-white p-2 rounded-lg hover:bg-gray-800"><X size={24}/></button>
          </div>
        </div>

        {/* CONTEÚDO */}
        <div className="p-6 overflow-y-auto space-y-8 relative">
          
          {/* SELEÇÃO DE CLIENTES (AGENTE) */}
          {isAgent && (
            <div className="space-y-3 relative">
               {showHelp && (
                  <div className="absolute -top-6 left-0 right-0 z-20 animate-in slide-in-from-bottom-2">
                      <div className="bg-blue-600 text-white text-[10px] px-3 py-1.5 rounded-lg shadow-lg font-bold flex items-center gap-2 w-fit">
                          <Info size={12}/> Selecione 1 pessoa para abas por mês, ou várias para abas por cliente.
                      </div>
                      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-blue-600 ml-4"></div>
                  </div>
              )}
              <div className="flex justify-between items-end">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">1. Selecionar Clientes</h3>
                <button onClick={toggleAllClients} className="text-xs text-emerald-400 hover:underline">
                    {(selectedClients.length === clients.length + 1) ? 'Desmarcar Todos' : 'Marcar Todos'}
                </button>
              </div>
              
              <div className={`flex flex-col gap-2 bg-gray-900/50 p-4 rounded-xl border max-h-60 overflow-y-auto transition ${showHelp ? 'border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.2)]' : 'border-gray-800'}`}>
                
                {/* BOTÃO ESPECIAL DO AGENTE (MEUS DADOS) */}
                <button 
                    onClick={() => toggleClient(user.id)}
                    className={`flex items-center gap-3 text-xs p-3 rounded-lg border transition text-left mb-2 ${selectedClients.includes(user.id) ? 'bg-cyan-900/20 border-cyan-500/50 text-cyan-100 ring-1 ring-cyan-500/50' : 'bg-black border-gray-700 text-gray-400 hover:bg-gray-800'}`}
                >
                    <div className={`p-1 rounded-md ${selectedClients.includes(user.id) ? 'bg-cyan-500 text-black' : 'bg-gray-800 text-gray-500'}`}>
                        {selectedClients.includes(user.id) ? <CheckSquare size={14}/> : <UserCircle2 size={14}/>}
                    </div>
                    <div>
                        <span className="font-bold block text-sm">Minha Conta Pessoal</span>
                        <span className="text-[10px] opacity-70">Incluir meus dados no relatório</span>
                    </div>
                </button>

                {/* LISTA DE CLIENTES */}
                <div className="grid grid-cols-2 gap-2">
                    {clients.map(client => (
                    <button 
                        key={client.client_id} 
                        onClick={() => toggleClient(client.client_id)}
                        className={`flex items-center gap-2 text-xs p-2 rounded-lg border transition text-left ${selectedClients.includes(client.client_id) ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-100' : 'border-gray-700 text-gray-400 hover:bg-gray-800'}`}
                    >
                        {selectedClients.includes(client.client_id) ? <CheckSquare size={14}/> : <Square size={14}/>}
                        <span className="truncate">{client.client_email.split('@')[0]}</span>
                    </button>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* PERÍODO */}
          <div className="space-y-3 relative">
             {showHelp && (
                  <div className="absolute -top-8 left-0 right-0 z-20 animate-in slide-in-from-bottom-2 delay-100">
                      <div className="bg-blue-600 text-white text-[10px] px-3 py-1.5 rounded-lg shadow-lg font-bold flex items-center gap-2 w-fit">
                          <Info size={12}/> {isAgent ? "Dica: Selecione apenas 1 cliente para gerar abas separadas por mês." : "Cada mês selecionado criará uma Aba (Planilha) separada."}
                      </div>
                      <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-blue-600 ml-4"></div>
                  </div>
              )}
            <div className="flex justify-between items-end">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">{isAgent ? '2.' : '1.'} Período</h3>
                <button onClick={toggleAllMonths} className="text-xs text-emerald-400 hover:underline">
                    {selectedMonths.length === MONTHS.length ? 'Limpar' : 'Todos'}
                </button>
            </div>
            <div className={`grid grid-cols-4 md:grid-cols-6 gap-2 p-2 rounded-xl border transition ${showHelp ? 'border-blue-500 bg-blue-900/10' : 'border-transparent'}`}>
                {MONTHS.map(month => (
                    <button 
                        key={month} 
                        onClick={() => toggleMonth(month)}
                        className={`text-xs py-2 rounded-lg border transition font-medium ${selectedMonths.includes(month) ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-600'}`}
                    >
                        {month}
                    </button>
                ))}
            </div>
          </div>

          {/* TIPOS */}
          <div className="space-y-3 relative">
             <h3 className="text-sm font-bold text-white uppercase tracking-wider">{isAgent ? '3.' : '2.'} Tipos de Dados</h3>
             <div className={`grid grid-cols-2 gap-3 p-2 rounded-xl border transition ${showHelp ? 'border-blue-500 bg-blue-900/10' : 'border-transparent'}`}>
                {TYPES.map(type => (
                    <button 
                        key={type.id}
                        onClick={() => toggleType(type.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition text-sm text-left ${selectedTypes.includes(type.id) ? 'bg-gray-800 border-emerald-500 text-emerald-400' : 'bg-gray-900 border-gray-800 text-gray-500 hover:bg-gray-800'}`}
                    >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedTypes.includes(type.id) ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600'}`}>
                            {selectedTypes.includes(type.id) && <CheckSquare size={12} className="text-black"/>}
                        </div>
                        {type.label}
                    </button>
                ))}
             </div>
          </div>

        </div>

        <div className="p-6 border-t border-gray-800 bg-[#0a0a0a]">
            <button 
                onClick={handleExport} 
                disabled={isGenerating}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-emerald-900/20 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
                {isGenerating ? <Loader2 className="animate-spin"/> : <Download size={20}/>}
                {isGenerating ? "Gerando Planilha..." : "Baixar Excel (.xlsx)"}
            </button>
        </div>

      </div>
    </div>
  );
}