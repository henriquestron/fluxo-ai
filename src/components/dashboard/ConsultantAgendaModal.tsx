import React, { useState, useEffect } from 'react';
import { X, Calendar as CalIcon, Clock, Users,Calendar, Plus, Video, FileText, Loader2, Trash2, CheckCircle2, ChevronRight } from 'lucide-react';
import { supabase } from '@/supabase';
import { toast } from 'sonner';

export default function ConsultantAgendaModal({ isOpen, onClose, consultant, clients }: any) {
    // 🟢 1. O React exige que TODOS os States fiquem aqui no topo (sem nenhum 'return' antes)
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    // Controles de Tela
    const [isCreating, setIsCreating] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null);

    // Campos do Novo Agendamento
    const [title, setTitle] = useState('');
    const [date, setDate] = useState('');
    const [time, setTime] = useState('');
    const [selectedClientId, setSelectedClientId] = useState('');
    const [meetingLink, setMeetingLink] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    // Campos de Edição
    const [editNotes, setEditNotes] = useState('');
    const [editStatus, setEditStatus] = useState('scheduled');
    const [isUpdating, setIsUpdating] = useState(false);

    useEffect(() => {
        // Só busca os dados se o modal estiver aberto e o consultor existir
        if (isOpen && consultant) {
            fetchAppointments();
        }
    }, [consultant, isOpen]);

    const fetchAppointments = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('appointments')
            .select(`
                *,
                client:manager_clients(client_email, full_name)
            `)
            .eq('consultant_id', consultant.id)
            .order('date', { ascending: true });

        if (error) {
            toast.error("Erro ao carregar agenda: " + error.message);
        } else {
            setAppointments(data || []);
            // Atualiza o card selecionado se ele foi editado
            if (selectedAppointment) {
                const updatedSelected = data?.find(a => a.id === selectedAppointment.id);
                if (updatedSelected) setSelectedAppointment(updatedSelected);
            }
        }
        setLoading(false);
    };

    // 🟢 CRIAR NOVA REUNIÃO
    const handleCreate = async () => {
        if (!title || !date || !time) return toast.warning("Preencha título, data e hora.");
        setSaving(true);

        const dateTimeStr = `${date}T${time}:00`;
        const dateObj = new Date(dateTimeStr);

        const payload: any = {
            consultant_id: consultant.id,
            title,
            date: dateObj.toISOString(),
            status: 'scheduled',
            meeting_link: meetingLink || null,
            notes: notes || null
        };

        if (selectedClientId) {
            payload.client_id = selectedClientId;
        }

        const { error } = await supabase.from('appointments').insert([payload]);

        if (error) {
            toast.error("Erro ao agendar: " + error.message);
        } else {
            // 🟢 NOTIFICAÇÃO CORRIGIDA (Sem ativar o botão de Contrato)
            if (selectedClientId) {
                const { data: clientData } = await supabase
                    .from('manager_clients')
                    .select('client_id, full_name')
                    .eq('id', selectedClientId)
                    .single();

                if (clientData && clientData.client_id) {
                    const dataFormatada = dateObj.toLocaleDateString('pt-BR');
                    let msgNotificacao = `Seu consultor marcou: "${title}" para o dia ${dataFormatada} às ${time}.`;
                    if (meetingLink) msgNotificacao += ` \n🔗 Link da chamada: ${meetingLink}`;

                    await supabase.from('notifications').insert([{
                        user_id: clientData.client_id, 
                        title: '📅 Reunião Agendada!',
                        message: msgNotificacao,
                        type: 'info',
                        is_read: false,
                        action_data: null // 🟢 NULL força o sininho a não mostrar o botão de contrato!
                    }]);
                }
            }

            toast.success("Reunião agendada!");
            setIsCreating(false);
            resetForm();
            fetchAppointments();
        }
        setSaving(false);
    };

    // 🟢 SALVAR ANOTAÇÕES (ATA) E STATUS
    const handleUpdateAppointment = async () => {
        if (!selectedAppointment) return;
        setIsUpdating(true);

        const { error } = await supabase
            .from('appointments')
            .update({ notes: editNotes, status: editStatus })
            .eq('id', selectedAppointment.id);

        if (error) {
            toast.error("Erro ao salvar: " + error.message);
        } else {
            toast.success("Anotações salvas com sucesso!");
            fetchAppointments();
        }
        setIsUpdating(false);
    };

    const handleDelete = async (id: string, e: any) => {
        e.stopPropagation(); // Evita abrir o card ao clicar na lixeira
        if (!confirm("Tem certeza que deseja cancelar esta reunião?")) return;
        
        const { error } = await supabase.from('appointments').delete().eq('id', id);
        if (error) toast.error("Erro ao cancelar: " + error.message);
        else {
            toast.success("Reunião cancelada.");
            if (selectedAppointment?.id === id) setSelectedAppointment(null);
            fetchAppointments();
        }
    };

    const handleSelectCard = (app: any) => {
        setSelectedAppointment(app);
        setIsCreating(false);
        setEditNotes(app.notes || '');
        setEditStatus(app.status || 'scheduled');
    };

    const handleOpenCreate = () => {
        setIsCreating(true);
        setSelectedAppointment(null);
    };

    const resetForm = () => {
        setTitle(''); setDate(''); setTime(''); setSelectedClientId(''); setMeetingLink(''); setNotes('');
    };
    if (!isOpen || !consultant) return null;
    return (
        <div className="fixed inset-0 z-[300] bg-black/90 backdrop-blur-sm overflow-y-auto p-4 sm:p-8 flex justify-center items-start animate-in fade-in duration-300">
            <div className="bg-[#111] border border-gray-800 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden mt-10 relative">
                
                {/* HEADER */}
                <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0a0a0a]">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <CalIcon className="text-cyan-500" size={24} /> Minha Agenda e CRM
                    </h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white transition"><X size={24}/></button>
                </div>

                <div className="flex flex-col md:flex-row h-full max-h-[75vh]">
                    
                    {/* COLUNA ESQUERDA: LISTA DE REUNIÕES */}
                    <div className="w-full md:w-5/12 border-r border-gray-800 p-4 sm:p-6 overflow-y-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Próximos Compromissos</h3>
                            <button onClick={handleOpenCreate} className={`p-2 rounded-xl text-white font-bold transition flex items-center justify-center gap-2 ${isCreating ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30' : 'bg-cyan-600 hover:bg-cyan-500'}`}>
                                {isCreating ? <X size={18}/> : <Plus size={18}/>}
                            </button>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-10"><Loader2 className="animate-spin text-cyan-500" size={32} /></div>
                        ) : appointments.length === 0 ? (
                            <div className="text-center py-12 border border-dashed border-gray-800 rounded-2xl">
                                <CalIcon size={40} className="text-gray-700 mx-auto mb-3" />
                                <p className="text-gray-500 text-sm">Sua agenda está vazia.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {appointments.map(app => {
                                    const d = new Date(app.date);
                                    const isPast = d < new Date();
                                    const isSelected = selectedAppointment?.id === app.id;
                                    const isCompleted = app.status === 'completed';
                                    
                                    return (
                                        <div 
                                            key={app.id} 
                                            onClick={() => handleSelectCard(app)}
                                            className={`p-4 rounded-2xl border transition cursor-pointer group 
                                                ${isSelected ? 'bg-cyan-900/20 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.1)]' : 
                                                  isCompleted ? 'bg-emerald-900/10 border-emerald-900/30 opacity-70 hover:border-emerald-500/50' : 
                                                  isPast ? 'bg-gray-900/50 border-gray-800 opacity-60 hover:border-gray-600' : 
                                                  'bg-[#1a1a1a] border-gray-700 hover:border-cyan-500/50'}`
                                            }
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <h4 className={`font-bold text-sm ${isCompleted ? 'text-emerald-500 line-through' : 'text-white'}`}>{app.title}</h4>
                                                <div className="flex items-center gap-2">
                                                    {isCompleted && <CheckCircle2 size={14} className="text-emerald-500" />}
                                                    <button onClick={(e) => handleDelete(app.id, e)} className="text-gray-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"><Trash2 size={14}/></button>
                                                </div>
                                            </div>
                                            
                                            <div className="space-y-1.5 mt-2">
                                                <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
                                                    <Clock size={12} className={isSelected ? "text-cyan-400" : "text-gray-500"} />
                                                    {d.toLocaleDateString('pt-BR')} às {d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                                {app.client && (
                                                    <div className="flex items-center gap-2 text-xs text-gray-400">
                                                        <Users size={12} className="text-purple-500" />
                                                        {app.client.full_name || app.client.client_email}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>

                    {/* COLUNA DIREITA: FORMULÁRIO DE CRIAÇÃO OU EDIÇÃO */}
                    <div className="w-full md:w-7/12 p-4 sm:p-8 bg-[#0f0f10] overflow-y-auto pb-12">
                        
                        {/* ESTADO 1: CRIANDO NOVA REUNIÃO */}
                        {isCreating ? (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-4 max-w-lg mx-auto">
                                <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider border-b border-gray-800 pb-3 mb-4 flex items-center gap-2"><Plus size={16}/> Novo Agendamento</h3>
                                
                                <div>
                                    <label className="text-xs text-gray-500 font-bold ml-1 mb-1 block">Assunto / Título *</label>
                                    <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Diagnóstico Financeiro" className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none transition" />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-gray-500 font-bold ml-1 mb-1 block">Data *</label>
                                        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none transition [color-scheme:dark]" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-gray-500 font-bold ml-1 mb-1 block">Hora *</label>
                                        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none transition [color-scheme:dark]" />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 font-bold ml-1 mb-1 block">Vincular a um Cliente (Opcional)</label>
                                    <select value={selectedClientId} onChange={(e) => setSelectedClientId(e.target.value)} className="w-full bg-gray-900 border border-gray-700 rounded-xl p-3 text-white focus:border-cyan-500 outline-none transition cursor-pointer">
                                        <option value="">Sem vínculo (Compromisso pessoal)</option>
                                        {clients?.map((c: any) => (
                                            <option key={c.id} value={c.id}>{c.full_name || c.client_email}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="text-xs text-gray-500 font-bold ml-1 mb-1 block">Link da Chamada (Meet, Zoom)</label>
                                    <div className="flex items-center bg-gray-900 border border-gray-700 rounded-xl px-3 focus-within:border-cyan-500 transition">
                                        <Video size={16} className="text-gray-500" />
                                        <input type="url" value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://..." className="w-full bg-transparent p-3 text-white outline-none" />
                                    </div>
                                </div>

                                <button onClick={handleCreate} disabled={saving} className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold py-3 rounded-xl transition shadow-lg flex items-center justify-center gap-2 mt-6">
                                    {saving ? <Loader2 className="animate-spin"/> : "Agendar e Notificar Cliente"}
                                </button>
                            </div>
                        ) : 
                        
                        /* ESTADO 2: VENDO/EDITANDO REUNIÃO EXISTENTE */
                        selectedAppointment ? (
                            <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6 max-w-lg mx-auto">
                                <div className="flex justify-between items-start border-b border-gray-800 pb-4">
                                    <div>
                                        <h3 className="text-lg font-bold text-white mb-1">{selectedAppointment.title}</h3>
                                        <div className="flex items-center gap-4 text-xs text-gray-400">
                                            <span className="flex items-center gap-1"><Clock size={14} className="text-cyan-500"/> {new Date(selectedAppointment.date).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
                                            {selectedAppointment.client && <span className="flex items-center gap-1"><Users size={14} className="text-purple-500"/> {selectedAppointment.client.full_name || selectedAppointment.client.client_email}</span>}
                                        </div>
                                    </div>
                                    <select 
                                        value={editStatus} 
                                        onChange={(e) => setEditStatus(e.target.value)} 
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold outline-none cursor-pointer border ${editStatus === 'completed' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : editStatus === 'canceled' ? 'bg-red-500/10 text-red-400 border-red-500/30' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'}`}
                                    >
                                        <option value="scheduled">Agendada</option>
                                        <option value="completed">Concluída</option>
                                        <option value="canceled">Cancelada</option>
                                    </select>
                                </div>

                                {selectedAppointment.meeting_link && (
                                    <div className="bg-gray-900/50 p-4 rounded-xl border border-gray-800 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg"><Video size={18}/></div>
                                            <div>
                                                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Sala de Reunião</p>
                                                <p className="text-sm text-gray-300 truncate max-w-[200px]">{selectedAppointment.meeting_link}</p>
                                            </div>
                                        </div>
                                        <a href={selectedAppointment.meeting_link} target="_blank" className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold transition">Entrar</a>
                                    </div>
                                )}

                                <div>
                                    <label className="text-xs text-gray-400 font-bold ml-1 mb-2 flex items-center gap-2"><FileText size={14}/> Ata da Reunião / Anotações</label>
                                    <textarea 
                                        value={editNotes} 
                                        onChange={(e) => setEditNotes(e.target.value)} 
                                        placeholder="Escreva aqui o resumo do que foi discutido, próximos passos, metas definidas..." 
                                        className="w-full bg-black border border-gray-800 rounded-xl p-4 text-gray-300 focus:border-cyan-500 outline-none transition resize-none h-48 sm:h-64 leading-relaxed" 
                                    />
                                </div>

                                <button onClick={handleUpdateAppointment} disabled={isUpdating} className="w-full bg-white hover:bg-gray-200 text-black font-bold py-3 rounded-xl transition shadow-lg flex items-center justify-center gap-2">
                                    {isUpdating ? <Loader2 className="animate-spin"/> : "Salvar Alterações"}
                                </button>
                            </div>
                        ) : 
                        
                        /* ESTADO 3: NADA SELECIONADO (TELA VAZIA) */
                        (
                            <div className="h-full flex flex-col items-center justify-center text-center text-gray-500 space-y-4 py-20 animate-in fade-in duration-500">
                                <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center border border-gray-800 shadow-inner">
                                    <Calendar size={32} className="text-gray-600" />
                                </div>
                                <div>
                                    <h4 className="text-gray-300 font-bold mb-1 text-lg">Central de Atendimentos</h4>
                                    <p className="text-sm max-w-xs mx-auto leading-relaxed">Selecione uma reunião ao lado para gerenciar as anotações ou clique em "+" para agendar.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}