import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { Search, Swords, Calendar, Clock, Shield, Plus, X, Loader2, Target, Trash2 } from "lucide-react";

export default function Scrims({ myTeam }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [feedScrims, setFeedScrims] = useState([]);
  
  // Modal Criar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ date: "", time: "", format: "BO1", rank_range: "" });

  const isCaptain = myTeam && currentUser && myTeam.owner_id === currentUser.id;

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user);
    };
    init();
  }, []);

  useEffect(() => {
    fetchFeedScrims();
  }, []);

  const fetchFeedScrims = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('scrims')
        .select(`*, teams:team_id (name, color_hex)`)
        .eq('status', 'open')
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;
      setFeedScrims(data || []);
    } catch (err) {
      console.error("Erro ao carregar mural:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateScrim = async (e) => {
    e.preventDefault();
    if (!isCaptain) return;
    
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('scrims').insert([{
        team_id: myTeam.id,
        date: formData.date,
        time: formData.time,
        format: formData.format,
        rank_range: formData.rank_range,
        status: 'open'
      }]);

      if (error) throw error;
      
      setIsModalOpen(false);
      setFormData({ date: "", time: "", format: "BO1", rank_range: "" });
      fetchFeedScrims();
      alert("Anúncio de Scrim publicado no Mural Público!");
    } catch (err) {
      console.error("Erro ao criar scrim:", err);
      alert("Erro ao publicar o Scrim.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestScrim = async (scrimId) => {
    if (!isCaptain) return alert("Apenas o capitão pode enviar desafios.");
    if (!myTeam) return alert("Precisas de estar numa equipa.");

    try {
      const { error } = await supabase.from('scrim_requests').insert([{
        scrim_id: scrimId,
        requesting_team_id: myTeam.id,
        status: 'pending'
      }]);

      if (error) {
        if (error.code === '23505') return alert("Já enviaste um desafio para este Scrim!");
        throw error;
      }
      alert("Desafio enviado! O capitão adversário receberá uma notificação nas suas Negociações.");
    } catch (err) {
      console.error("Erro ao enviar pedido:", err);
    }
  };

  const handleDeleteScrim = async (scrimId) => {
    if (!isCaptain || !window.confirm("Queres mesmo apagar o teu anúncio?")) return;
    try {
      await supabase.from('scrims').delete().eq('id', scrimId);
      fetchFeedScrims();
    } catch (err) {
      console.error("Erro ao apagar scrim:", err);
    }
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto space-y-6 pb-10">
      
      {/* HEADER */}
      <div className="bg-[#181a1b] p-6 rounded-2xl border border-gray-800 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <Swords className="text-red-500" size={28} />
            Mural de Scrims
          </h1>
          <p className="text-gray-400 text-sm mt-1">Procura equipas disponíveis e envia desafios para treinar.</p>
        </div>

        {isCaptain && (
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded-lg font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-red-500/20 shrink-0">
            <Plus size={16} /> Publicar Anúncio
          </button>
        )}
      </div>

      {!myTeam && (
        <div className="bg-amber-500/10 border border-amber-500/20 text-amber-500 p-4 rounded-xl flex items-center gap-3 text-sm font-medium">
          <Shield size={20} /> Precisas de te juntar ou criar uma equipa para participares em Scrims.
        </div>
      )}

      {/* CONTEÚDO: MURAL PÚBLICO ÚNICO */}
      <div className="bg-[#0f1112] rounded-2xl p-6 border border-gray-800 min-h-[400px]">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin text-red-500 mb-4" />
            <p className="font-bold uppercase tracking-widest text-xs">A carregar mural...</p>
          </div>
        ) : feedScrims.length === 0 ? (
          <div className="text-center py-20 bg-[#181a1b] rounded-xl border border-dashed border-gray-800">
            <Search className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">Nenhum Scrim aberto</h3>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">Não há equipas à procura de adversários de momento.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {feedScrims.map((scrim) => {
              const isMyScrim = myTeam && scrim.team_id === myTeam.id;

              return (
                <div key={scrim.id} className={`bg-[#181a1b] border ${isMyScrim ? 'border-red-500/30' : 'border-gray-800'} rounded-xl p-5 hover:border-gray-700 transition-all flex flex-col h-full relative overflow-hidden group`}>
                  <div className="absolute top-0 left-0 w-1.5 h-full" style={{ backgroundColor: scrim.teams?.color_hex || '#ef4444' }} />
                  
                  <div className="flex justify-between items-start mb-4 pl-2">
                    <h3 className="font-black text-lg text-white tracking-wide truncate pr-2">
                      {scrim.teams?.name || 'Equipa'} {isMyScrim && <span className="text-[10px] bg-red-500 text-white px-2 py-0.5 rounded ml-2 align-middle">O MEU ANÚNCIO</span>}
                    </h3>
                    <span className="bg-red-500/10 text-red-500 text-[10px] font-bold px-2.5 py-1 rounded uppercase tracking-widest border border-red-500/20 shrink-0">
                      {scrim.format}
                    </span>
                  </div>

                  <div className="space-y-2.5 mb-6 flex-1 pl-2">
                    <div className="flex items-center gap-3 text-gray-300 text-sm font-medium">
                      <div className="p-1.5 bg-gray-800 rounded text-gray-400"><Calendar size={14} /></div>
                      {new Date(scrim.date).toLocaleDateString('pt-PT', { weekday: 'short', day: '2-digit', month: 'long' })}
                    </div>
                    <div className="flex items-center gap-3 text-gray-300 text-sm font-medium">
                      <div className="p-1.5 bg-gray-800 rounded text-gray-400"><Clock size={14} /></div>
                      {scrim.time.substring(0, 5)}h
                    </div>
                    {scrim.rank_range && (
                      <div className="flex items-center gap-3 text-gray-300 text-sm font-medium">
                        <div className="p-1.5 bg-gray-800 rounded text-gray-400"><Target size={14} /></div>
                        {scrim.rank_range}
                      </div>
                    )}
                  </div>

                  {isCaptain && !isMyScrim && (
                    <button onClick={() => handleRequestScrim(scrim.id)} className="w-full py-3 bg-[#0f1112] hover:bg-red-500 hover:text-white text-gray-300 font-bold uppercase tracking-wider text-xs rounded transition-colors border border-gray-800 hover:border-red-500 flex justify-center items-center gap-2">
                      <Shield size={16} /> Enviar Desafio
                    </button>
                  )}

                  {isMyScrim && (
                     <button onClick={() => handleDeleteScrim(scrim.id)} className="w-full py-3 bg-red-500/5 hover:bg-red-500 text-red-500 hover:text-white font-bold uppercase tracking-wider text-xs rounded transition-colors border border-red-500/20 hover:border-red-500 flex justify-center items-center gap-2">
                     <Trash2 size={16} /> Apagar Anúncio
                   </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* MODAL PARA CRIAR SCRIM */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#181a1b] border border-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0f1112]">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Swords className="text-red-500" size={20} />
                Publicar Anúncio
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateScrim} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Data</label>
                  <input type="date" required min={new Date().toISOString().split('T')[0]} value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full bg-[#0f1112] border border-gray-800 rounded px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Hora</label>
                  <input type="time" required value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} className="w-full bg-[#0f1112] border border-gray-800 rounded px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Formato da Partida</label>
                <select value={formData.format} onChange={e => setFormData({...formData, format: e.target.value})} className="w-full bg-[#0f1112] border border-gray-800 rounded px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors cursor-pointer">
                  <option value="BO1">Melhor de 1 (BO1)</option>
                  <option value="BO3">Melhor de 3 (BO3)</option>
                  <option value="BO5">Melhor de 5 (BO5)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Restrição de Elo (Opcional)</label>
                <input type="text" placeholder="Ex: Apenas Ascendentes / Imortais" value={formData.rank_range} onChange={e => setFormData({...formData, rank_range: e.target.value})} className="w-full bg-[#0f1112] border border-gray-800 rounded px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors" />
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3.5 bg-[#0f1112] text-gray-300 font-bold uppercase tracking-wider text-xs rounded-lg hover:bg-gray-800 border border-gray-800 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="flex-1 py-3.5 bg-red-500 text-white font-bold uppercase tracking-wider text-xs rounded-lg hover:bg-red-600 transition-colors flex justify-center items-center gap-2 shadow-lg shadow-red-900/20">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publicar Anúncio"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}