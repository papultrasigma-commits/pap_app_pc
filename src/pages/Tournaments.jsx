import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Trophy, Calendar, Users, DollarSign, Swords, CheckCircle2, ShieldAlert, Loader2, Info, Plus, X, Trash2, Crown } from "lucide-react";

export default function Tournaments({ myTeam }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all'); // 'all' ou 'mine'
  
  // SISTEMA DE ADMIN
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: "", description: "", start_date: "", prize_pool: "Sem prémio", max_teams: 16, format: "BO1 / Final BO3"
  });

  const isCaptain = myTeam && currentUser && myTeam.owner_id === currentUser.id;

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
      
      // 👇 MUDA ISTO PARA O TEU EMAIL DE LOGIN! 👇
      const ADMIN_EMAIL = "admin@gmail.com"; 
      
      if (user && user.email === ADMIN_EMAIL) {
        setIsAdmin(true);
      }
    };
    init();
  }, []);

  useEffect(() => {
    fetchTournaments();
  }, [myTeam]);

  const fetchTournaments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          tournament_participants ( id, team_id )
        `)
        .order('start_date', { ascending: true });

      if (error) throw error;
      setTournaments(data || []);
    } catch (err) {
      console.error("Erro ao carregar torneios:", err);
    } finally {
      setLoading(false);
    }
  };

  // --- FUNÇÕES DE ADMIN ---
  const handleCreateTournament = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('tournaments').insert([{
        title: formData.title,
        description: formData.description,
        start_date: formData.start_date,
        prize_pool: formData.prize_pool,
        max_teams: parseInt(formData.max_teams),
        format: formData.format,
        status: 'open'
      }]);

      if (error) throw error;
      
      alert("Torneio criado com sucesso!");
      setIsModalOpen(false);
      setFormData({ title: "", description: "", start_date: "", prize_pool: "Sem prémio", max_teams: 16, format: "BO1 / Final BO3" });
      fetchTournaments();
    } catch (err) {
      console.error(err);
      alert("Erro ao criar o torneio.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTournament = async (tournamentId) => {
    if (!isAdmin) return;
    if (window.confirm("ATENÇÃO: Queres mesmo apagar este torneio? Todas as inscrições serão perdidas.")) {
      try {
        await supabase.from('tournaments').delete().eq('id', tournamentId);
        fetchTournaments();
      } catch (err) {
        console.error(err);
        alert("Erro ao apagar torneio.");
      }
    }
  };
  // ------------------------

  const handleRegister = async (tournamentId) => {
    if (!isCaptain) return alert("Apenas o capitão pode inscrever a equipa.");
    if (!myTeam) return alert("Precisas de estar numa equipa.");

    if (window.confirm("Queres inscrever a tua equipa neste torneio? Certifica-te que todos têm disponibilidade.")) {
      try {
        const { error } = await supabase.from('tournament_participants').insert([{
          tournament_id: tournamentId,
          team_id: myTeam.id
        }]);

        if (error) {
          if (error.code === '23505') alert("A tua equipa já está inscrita neste torneio!");
          else throw error;
        } else {
          alert("Equipa inscrita com sucesso! Boa sorte.");
          fetchTournaments();
        }
      } catch (err) {
        console.error(err);
        alert("Erro ao inscrever no torneio.");
      }
    }
  };

  const handleUnregister = async (tournamentId) => {
    if (!isCaptain) return;
    if (window.confirm("Queres mesmo CANCELAR a inscrição da tua equipa?")) {
      try {
        await supabase.from('tournament_participants').delete().eq('tournament_id', tournamentId).eq('team_id', myTeam?.id);
        fetchTournaments();
      } catch (err) {
        console.error(err);
      }
    }
  };

  const filteredTournaments = tournaments.filter(t => {
    if (activeTab === 'all') return true;
    if (activeTab === 'mine') return t.tournament_participants.some(p => p.team_id === myTeam?.id);
    return true;
  });

  return (
    <div className="animate-fade-in max-w-6xl mx-auto space-y-6 pb-10">
      
      {/* HEADER */}
      <div className="bg-[#181a1b] p-6 rounded-2xl border border-gray-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-3 tracking-wide">
            <Trophy className="text-amber-500" size={28} />
            Torneios Competitivos
          </h1>
          <p className="text-gray-400 text-sm mt-1 flex items-center gap-2">
            Ganha experiência oficial, sobe no ranking e disputa prémios de equipa.
            {isAdmin && <span className="bg-blue-500/10 text-blue-400 text-[10px] px-2 py-0.5 rounded border border-blue-500/20 flex items-center gap-1 font-bold"><Crown size={12} /> ADMIN</span>}
          </p>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* Botão de Admin */}
          {isAdmin && (
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-blue-900/20">
              <Plus size={16} /> Criar Torneio
            </button>
          )}

          {/* Abas */}
          <div className="flex bg-[#0f1112] border border-gray-800 rounded-lg p-1">
            <button onClick={() => setActiveTab('all')} className={`px-6 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'all' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-400 hover:text-white'}`}>
              Explorar
            </button>
            <button onClick={() => setActiveTab('mine')} className={`px-6 py-2 text-sm font-bold rounded-md transition-all ${activeTab === 'mine' ? 'bg-amber-500 text-black shadow-md' : 'text-gray-400 hover:text-white'}`}>
              A Minha Equipa
            </button>
          </div>
        </div>
      </div>

      {!myTeam && !isAdmin && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-4 rounded-xl flex items-center gap-3 text-sm font-medium">
          <ShieldAlert size={20} /> Precisas de te juntar ou criar uma equipa para participares em Torneios.
        </div>
      )}

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500">
          <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-4" />
          <p className="font-bold uppercase tracking-widest text-xs">A procurar competições...</p>
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="text-center py-20 bg-[#181a1b] rounded-xl border border-dashed border-gray-800">
          <Swords className="w-16 h-16 text-gray-600 mx-auto mb-4 opacity-50" />
          <h3 className="text-xl font-bold text-white mb-2">Nenhum Torneio Encontrado</h3>
          <p className="text-gray-500 text-sm max-w-md mx-auto">
            {activeTab === 'mine' ? 'A tua equipa não está inscrita em nenhum torneio atualmente.' : 'Não existem torneios abertos de momento. Volta mais tarde!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredTournaments.map(tournament => {
            const registeredTeamsCount = tournament.tournament_participants?.length || 0;
            const isFull = registeredTeamsCount >= tournament.max_teams;
            const isRegistered = tournament.tournament_participants?.some(p => p.team_id === myTeam?.id);
            const fillPercentage = (registeredTeamsCount / tournament.max_teams) * 100;

            return (
              <div key={tournament.id} className={`bg-[#0f1112] border ${isRegistered ? 'border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]' : 'border-gray-800'} rounded-2xl overflow-hidden flex flex-col hover:border-gray-700 transition-all relative group`}>
                
                {/* Botão de Apagar (Apenas Admin) */}
                {isAdmin && (
                  <button onClick={() => handleDeleteTournament(tournament.id)} className="absolute top-2 right-2 z-20 bg-red-600 text-white p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500 shadow-lg">
                    <Trash2 size={16} />
                  </button>
                )}

                <div className="h-28 bg-gradient-to-r from-gray-900 to-gray-800 relative border-b border-gray-800 p-4 flex items-end">
                  <div className="absolute inset-0 opacity-20 bg-[url('https://media.valorant-api.com/maps/7eaecc1b-4337-bbf6-6ab9-04b8f06b3319/displayicon.png')] bg-cover bg-center"></div>
                  <div className="relative z-10 w-full flex justify-between items-center">
                    <span className="bg-amber-500 text-black text-[10px] font-black px-2.5 py-1 rounded uppercase tracking-widest">
                      {tournament.status === 'open' ? 'Inscrições Abertas' : 'A Decorrer'}
                    </span>
                    {isRegistered && (
                      <span className="flex items-center gap-1 text-green-400 text-xs font-bold bg-green-900/40 px-2 py-1 rounded">
                        <CheckCircle2 size={14} /> Inscrito
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5 flex-1 flex flex-col">
                  <h3 className="font-black text-xl text-white mb-2 tracking-wide leading-tight">{tournament.title}</h3>
                  <p className="text-gray-400 text-sm mb-5 line-clamp-2">{tournament.description}</p>

                  <div className="space-y-3 mb-6 bg-[#181a1b] p-4 rounded-xl border border-gray-800/50">
                    <div className="flex items-center gap-3 text-sm text-gray-300 font-medium">
                      <Calendar size={16} className="text-gray-500" />
                      {new Date(tournament.start_date).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}h
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-300 font-medium">
                      <Swords size={16} className="text-gray-500" />
                      {tournament.format}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-300 font-medium">
                      <DollarSign size={16} className="text-amber-500" />
                      <span className={tournament.prize_pool !== 'Sem prémio' ? 'text-amber-500 font-bold' : ''}>
                        {tournament.prize_pool}
                      </span>
                    </div>
                  </div>

                  <div className="mt-auto mb-5">
                    <div className="flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">
                      <span className="flex items-center gap-1.5"><Users size={14} /> Vagas Preenchidas</span>
                      <span>{registeredTeamsCount} / {tournament.max_teams}</span>
                    </div>
                    <div className="w-full bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-1000 ${isFull ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, fillPercentage)}%` }}></div>
                    </div>
                  </div>

                  {isRegistered ? (
                    <div className="flex gap-2">
                      <button className="w-full py-3 bg-green-500/10 text-green-500 font-bold uppercase tracking-wider text-xs rounded-xl flex justify-center items-center gap-2 cursor-default border border-green-500/20">
                        <CheckCircle2 size={16} /> Equipa Confirmada
                      </button>
                      {isCaptain && (
                        <button onClick={() => handleUnregister(tournament.id)} className="px-4 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors border border-red-500/20 hover:border-red-500 flex justify-center items-center group" title="Cancelar Inscrição">
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  ) : isFull ? (
                    <button disabled className="w-full py-3 bg-gray-800 text-gray-500 font-bold uppercase tracking-wider text-xs rounded-xl flex justify-center items-center gap-2 cursor-not-allowed">
                      <Info size={16} /> Torneio Cheio
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleRegister(tournament.id)}
                      disabled={!isCaptain}
                      className={`w-full py-3 font-bold uppercase tracking-wider text-xs rounded-xl flex justify-center items-center gap-2 transition-all ${isCaptain ? 'bg-amber-500 text-black hover:bg-amber-400 shadow-lg shadow-amber-900/20' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                    >
                      Inscrever Equipa
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL DE CRIAR TORNEIO (ADMIN APENAS) */}
      {isAdmin && isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#181a1b] border border-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0f1112]">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Crown className="text-blue-500" size={20} />
                Painel Admin: Criar Torneio
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>

            <form id="createTournamentForm" onSubmit={handleCreateTournament} className="p-6 overflow-y-auto custom-scrollbar space-y-5">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Título do Torneio</label>
                <input type="text" required placeholder="Ex: VCT Qualifiers" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full bg-[#0f1112] border border-gray-800 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors" />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Descrição Curta</label>
                <textarea required placeholder="Sobre o que é este torneio..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full bg-[#0f1112] border border-gray-800 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors h-20 resize-none"></textarea>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Data e Hora de Início</label>
                  <input type="datetime-local" required value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} className="w-full bg-[#0f1112] border border-gray-800 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Máximo de Equipas</label>
                  <select value={formData.max_teams} onChange={e => setFormData({...formData, max_teams: e.target.value})} className="w-full bg-[#0f1112] border border-gray-800 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors cursor-pointer">
                    <option value="4">4 Equipas</option>
                    <option value="8">8 Equipas</option>
                    <option value="16">16 Equipas</option>
                    <option value="32">32 Equipas</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Prémio (Prize Pool)</label>
                  <input type="text" required placeholder="Ex: 500€ ou Sem prémio" value={formData.prize_pool} onChange={e => setFormData({...formData, prize_pool: e.target.value})} className="w-full bg-[#0f1112] border border-gray-800 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Formato</label>
                  <input type="text" required placeholder="Ex: Eliminação Única BO3" value={formData.format} onChange={e => setFormData({...formData, format: e.target.value})} className="w-full bg-[#0f1112] border border-gray-800 rounded-lg px-4 py-3 text-white focus:border-blue-500 outline-none transition-colors" />
                </div>
              </div>
            </form>

            <div className="p-6 border-t border-gray-800 bg-[#0f1112] shrink-0 flex gap-3">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 bg-[#181a1b] text-gray-300 font-bold uppercase tracking-wider text-xs rounded-lg hover:bg-gray-800 border border-gray-800 transition-colors">
                Cancelar
              </button>
              <button type="submit" form="createTournamentForm" disabled={isSubmitting} className="flex-1 py-3.5 bg-blue-600 text-white font-bold uppercase tracking-wider text-xs rounded-lg hover:bg-blue-500 transition-colors flex justify-center items-center gap-2 shadow-lg shadow-blue-900/20 disabled:opacity-50">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publicar Torneio"}
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}