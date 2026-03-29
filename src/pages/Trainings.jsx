import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Calendar, CheckCircle2, Clock, Plus, Video, 
  Swords, SprayCan, Trash2, X, ChevronRight, CalendarClock,
  ShieldAlert
} from 'lucide-react';

export default function TrainingsView({ myTeam }) {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState(null); 
  
  // Estados do Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSession, setNewSession] = useState({ title: '', tag: '', type: 'Aim', date: '', duration: '60' });

  // Verificação centralizada de permissões (Só dono e vice)
  const canManageTrainings = myRole === 'owner' || myRole === 'vice';

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myTeam]);

  // --- LER DADOS (TREINOS E CARGO DO UTILIZADOR) ---
  const loadData = async () => {
    if (!myTeam) {
      setLoading(false);
      return;
    }

    setLoading(true);

    // 1. Descobrir qual é o cargo do utilizador logado
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes?.user?.id;
    if (uid) {
      const { data: member } = await supabase
        .from('team_members')
        .select('role')
        .eq('team_id', myTeam.id)
        .eq('user_id', uid)
        .maybeSingle();
      
      if (member) setMyRole(member.role);
    }

    // 2. Carregar os treinos da equipa
    const { data, error } = await supabase
      .from('team_trainings')
      .select('*')
      .eq('team_id', myTeam.id)
      .order('date', { ascending: true });

    if (error) {
      console.error("Erro a carregar treinos:", error);
    } else {
      setSessions(data || []);
    }
    setLoading(false);
  };

  const getCurrentDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const getIcon = (type) => {
    const className = "text-white opacity-80";
    switch(type) {
      case 'Aim': return <Swords size={20} className={className} />;
      case 'VOD': return <Video size={20} className={className} />;
      case 'Scrim': return <ShieldAlert size={20} className={className} />;
      default: return <SprayCan size={20} className={className} />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "Data por definir";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-PT', { 
      weekday: 'long', day: 'numeric', month: 'numeric', hour: '2-digit', minute: '2-digit' 
    }).format(date);
  };

  // --- APAGAR TREINO NO SUPABASE ---
  const handleDelete = async (id) => {
    // BLOQUEIO DE SEGURANÇA
    if (!canManageTrainings) {
      alert("⚠️ Apenas o Capitão e o Vice-Capitão podem apagar treinos.");
      return;
    }

    if (window.confirm("Tens a certeza que queres apagar este treino?")) {
      const { error } = await supabase.from('team_trainings').delete().eq('id', id);
      if (error) {
        alert("Erro ao apagar treino!");
      } else {
        setSessions(sessions.filter(s => s.id !== id));
      }
    }
  };

  // --- MARCAR TREINO COMO CONCLUÍDO/AGENDADO ---
  const handleToggleComplete = async (session) => {
    // BLOQUEIO DE SEGURANÇA
    if (!canManageTrainings) {
      alert("⚠️ Apenas o Capitão e o Vice-Capitão podem alterar o estado dos treinos.");
      return;
    }

    // Se estiver concluído, volta a agendado. Se não, marca como concluído.
    const newStatus = session.status === "CONCLUÍDO" ? "AGENDADO" : "CONCLUÍDO";
    
    const { error } = await supabase
      .from('team_trainings')
      .update({ status: newStatus })
      .eq('id', session.id);

    if (error) {
      alert("Erro ao atualizar o estado do treino!");
      console.error(error);
    } else {
      // Atualizar a lista localmente sem ter de recarregar a página
      setSessions(sessions.map(s => s.id === session.id ? { ...s, status: newStatus } : s));
    }
  };

  // --- ADICIONAR TREINO NO SUPABASE ---
  const handleAddSession = async () => {
    // BLOQUEIO DE SEGURANÇA
    if (!canManageTrainings) {
      alert("⚠️ Apenas o Capitão e o Vice-Capitão podem agendar novos treinos.");
      return;
    }

    if (!myTeam) {
      alert("Precisas de estar numa equipa para criar treinos.");
      return;
    }

    if (!newSession.title || !newSession.date) {
      alert("Por favor preenche o título e a data.");
      return;
    }

    const selectedDate = new Date(newSession.date);
    const now = new Date();
    
    if (selectedDate < now) {
      alert("⚠️ Não é possível agendar treinos para o passado.");
      return;
    }

    const sessionData = {
      team_id: myTeam.id,
      title: newSession.title,
      type: newSession.type,
      date: selectedDate.toISOString(),
      duration: parseInt(newSession.duration),
      tag: newSession.tag,
      status: "AGENDADO"
    };
    
    const { data, error } = await supabase.from('team_trainings').insert([sessionData]).select().single();

    if (error) {
      alert("Erro ao criar treino! Verifica se a tabela 'team_trainings' tem a coluna 'status'.");
      console.error(error);
    } else {
      setSessions([...sessions, data]);
      setIsModalOpen(false); // Fecha o menu
      setNewSession({ title: '', tag: '', type: 'Aim', date: '', duration: '60' }); // Limpa os dados
    }
  };

  const StatCard = ({ icon, value, label, colorClass }) => (
    <div className="bg-[#1f2937]/40 border border-white/5 p-5 rounded-xl flex items-center gap-4 hover:bg-[#1f2937]/60 transition-colors backdrop-blur-sm">
      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${colorClass} bg-opacity-20`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-black text-white leading-none">{value}</div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">{label}</div>
      </div>
    </div>
  );

  // Ecrã de Loading
  if (loading) return (
    <div className="absolute inset-0 w-full h-full bg-[#0f1923] flex items-center justify-center">
      <div className="text-white font-bold text-xl animate-pulse">A carregar treinos...</div>
    </div>
  );

  // Ecrã de "Sem Equipa"
  if (!myTeam) return (
    <div className="absolute inset-0 w-full h-full bg-[#0f1923] p-8">
      <div className="bg-[#181a1b] border border-gray-800 rounded-xl p-6 text-center max-w-2xl mx-auto mt-20">
        <ShieldAlert size={48} className="mx-auto text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Sem Equipa</h2>
        <p className="text-gray-400">Tens de estar numa equipa para veres ou agendares treinos.</p>
      </div>
    </div>
  );

  // Calcular as estatísticas corretas
  const completedSessions = sessions.filter(s => s.status === "CONCLUÍDO").length;
  const scheduledSessions = sessions.filter(s => s.status !== "CONCLUÍDO").length;
  const totalHours = Math.floor(sessions.reduce((acc, curr) => acc + curr.duration, 0) / 60);

  return (
    <div className="absolute inset-0 w-full h-full bg-[#0f1923] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
      <div className="min-h-full w-full p-8 font-sans text-white">
        <div className="max-w-7xl mx-auto pb-20">
          
          {/* === CABEÇALHO === */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-2 h-2 rounded-full bg-[#ff4655] animate-pulse"/>
                <span className="text-xs font-bold text-[#ff4655] uppercase tracking-widest">Gestão de Equipa</span>
              </div>
              <h1 className="text-4xl font-black tracking-tight">Treinos<span className="text-[#ff4655]">.</span></h1>
              <p className="text-slate-400 mt-2 max-w-xl">Agenda scrims, treinos de mira e revisões de VOD. Mantém a equipa sincronizada e pronta para competir.</p>
            </div>

            {/* O Botão Novo Treino só aparece para o Capitão/Vice */}
            {canManageTrainings && (
              <button 
                onClick={() => setIsModalOpen(true)}
                className="bg-[#ff4655] hover:bg-[#ff2b3f] text-white px-6 py-3 rounded-lg font-bold uppercase text-xs tracking-wider flex items-center gap-2 transition-all shadow-[0_0_15px_rgba(255,70,85,0.3)] hover:shadow-[0_0_25px_rgba(255,70,85,0.5)] transform hover:-translate-y-0.5 active:translate-y-0"
              >
                <Plus size={18} strokeWidth={3} />
                Novo Treino
              </button>
            )}
          </div>

          {/* === ESTATÍSTICAS === */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <StatCard icon={<Calendar size={20} className="text-blue-400" />} colorClass="bg-blue-500/10 border border-blue-500/20" value={scheduledSessions} label="Agendados" />
            <StatCard icon={<CheckCircle2 size={20} className="text-green-400" />} colorClass="bg-green-500/10 border border-green-500/20" value={completedSessions} label="Concluídos" />
            <StatCard icon={<Clock size={20} className="text-purple-400" />} colorClass="bg-purple-500/10 border border-purple-500/20" value={`${totalHours}h`} label="Horas Totais" />
          </div>

          {/* === LISTA DE TREINOS === */}
          <div className="bg-[#181a1b] border border-white/5 rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1f2937]/30">
              <div className="flex items-center gap-3">
                <div className="w-1 h-6 bg-[#ff4655] rounded-full"/>
                <h3 className="font-bold text-lg">Sessões da Equipa</h3>
              </div>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">{sessions.length} SESSÕES TOTAIS</span>
            </div>

            <div className="p-4 space-y-2">
              {sessions.map((session) => {
                const isCompleted = session.status === "CONCLUÍDO";

                return (
                  <div key={session.id} className={`group flex items-center justify-between p-4 rounded-xl border transition-all ${isCompleted ? 'border-green-500/20 bg-[#1f2937]/40 opacity-70' : 'border-transparent hover:border-slate-700 hover:bg-[#1f2937] bg-[#141617]'}`}>
                    <div className="flex items-center gap-5 overflow-hidden">
                      <div className={`w-12 h-12 rounded-lg bg-[#0a0f14] border border-white/5 flex items-center justify-center transition-all shrink-0 ${isCompleted ? 'text-green-500 border-green-500/30' : 'group-hover:border-[#ff4655]/50'}`}>
                        {getIcon(session.type)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className={`font-bold text-lg truncate ${isCompleted ? 'text-green-400 line-through' : 'text-white'}`}>{session.title}</h4>
                          {isCompleted && <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-widest border border-green-500/30">Feito</span>}
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1.5 capitalize"><CalendarClock size={14} /> {formatDate(session.date)}</span>
                          <span className="w-1 h-1 rounded-full bg-slate-600"/>
                          <span>{session.duration} min</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6 shrink-0 pl-4">
                      <div className="text-right hidden sm:block">
                        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-1">Foco</span>
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold border ${isCompleted ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-[#00f0ff] bg-[#00f0ff]/10 border-[#00f0ff]/20'}`}>{session.tag || "Geral"}</span>
                      </div>
                      
                      {/* Botões de Ação só aparecem para Capitão/Vice */}
                      {canManageTrainings && (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => handleToggleComplete(session)} 
                            className={`p-2 rounded-lg transition-colors ${isCompleted ? 'text-green-400 bg-green-500/10 hover:bg-green-500/20' : 'text-slate-600 hover:text-green-400 hover:bg-green-500/10'}`} 
                            title={isCompleted ? "Desmarcar conclusão" : "Marcar como concluído"}
                          >
                            <CheckCircle2 size={18} />
                          </button>
                          
                          <button 
                            onClick={() => handleDelete(session.id)} 
                            className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors" 
                            title="Apagar Treino"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {sessions.length === 0 && (
                <div className="text-center py-20 opacity-50">
                  <Calendar size={48} className="mx-auto mb-4 text-slate-600"/>
                  <p>Nenhum treino agendado</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* === MODAL DE ADICIONAR TREINO === */}
      {isModalOpen && canManageTrainings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#181a1b] border border-white/10 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-white/5 flex justify-between items-center bg-[#1f2937]/50">
              <h3 className="font-bold text-lg text-white">Novo Agendamento</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors"><X size={20}/></button>
            </div>
            <div className="p-6 space-y-5">
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Título</label>
                <input type="text" value={newSession.title} onChange={(e) => setNewSession({...newSession, title: e.target.value})} className="w-full bg-[#0a0f14] border border-slate-700 rounded-lg p-3 text-white focus:border-[#ff4655] outline-none" placeholder="Ex: Scrim vs Team" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Tipo</label>
                  <div className="relative">
                    <select value={newSession.type} onChange={(e) => setNewSession({...newSession, type: e.target.value})} className="w-full bg-[#0a0f14] border border-slate-700 rounded-lg p-3 text-white appearance-none focus:border-[#ff4655] outline-none">
                      <option value="Aim">Aim Lab</option>
                      <option value="Scrim">Scrim</option>
                      <option value="VOD">VOD Review</option>
                      <option value="Theory">Teoria</option>
                    </select>
                    <ChevronRight size={16} className="absolute right-3 top-3.5 text-slate-500 rotate-90 pointer-events-none"/>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Duração (min)</label>
                  <input type="number" value={newSession.duration} onChange={(e) => setNewSession({...newSession, duration: e.target.value})} className="w-full bg-[#0a0f14] border border-slate-700 rounded-lg p-3 text-white focus:border-[#ff4655] outline-none" />
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Data e Hora</label>
                <input type="datetime-local" value={newSession.date} min={getCurrentDateTime()} onChange={(e) => setNewSession({...newSession, date: e.target.value})} className="w-full bg-[#0a0f14] border border-slate-700 rounded-lg p-3 text-white focus:border-[#ff4655] outline-none scheme-dark" />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Foco / Tag</label>
                <input type="text" value={newSession.tag} onChange={(e) => setNewSession({...newSession, tag: e.target.value})} className="w-full bg-[#0a0f14] border border-slate-700 rounded-lg p-3 text-white focus:border-[#ff4655] outline-none" placeholder="Ex: Defesa no B" />
              </div>
            </div>
            <div className="p-6 bg-[#1f2937]/30 border-t border-white/5 flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 rounded-lg text-slate-400 hover:text-white font-bold text-sm">Cancelar</button>
              <button onClick={handleAddSession} className="px-6 py-2.5 rounded-lg bg-[#ff4655] hover:bg-[#ff2b3f] text-white font-bold text-sm shadow-lg shadow-red-500/20">Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}