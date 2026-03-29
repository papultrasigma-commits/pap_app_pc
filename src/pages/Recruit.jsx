import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, Shield, UserPlus, User, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabaseClient';

const PlayerCard = ({ player, isCaptain, myTeamId, alreadyInvited }) => {
  const navigate = useNavigate();
  const [inviteStatus, setInviteStatus] = useState(alreadyInvited ? 'sent' : 'none');

  const dispName = player.riot_account?.name || player.username || "Agente Desconhecido";
  const avatar = player.avatar_url || "https://media.valorant-api.com/playercards/9fb348bc-41a0-91ad-8a3e-818035c4e561/smallart.png";
  const role = player.main_role || "Flex";

  const handleInvite = async () => {
    if (!myTeamId || !player.id || inviteStatus !== 'none') return;
    setInviteStatus('loading');
    
    try {
      const { error } = await supabase
        .from('team_invites')
        .insert([{ team_id: myTeamId, user_id: player.id, status: 'pending' }]);

      if (!error || error.code === '23505') { 
        setInviteStatus('sent');
      } else {
        console.error("Erro a convidar:", error);
        setInviteStatus('none');
        alert("Erro ao enviar o convite. O jogador já pode ter um pedido pendente.");
      }
    } catch (err) {
      console.error(err);
      setInviteStatus('none');
    }
  };

  return (
    <div className="bg-[#181a1b] border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-all duration-300 flex flex-col h-full group hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)] hover:-translate-y-1">
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <img src={avatar} alt={dispName} className="w-12 h-12 rounded-full border border-gray-700 object-cover" />
            <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-[#181a1b] rounded-full"></span>
          </div>
          <div>
            <h3 className="font-bold text-lg text-white leading-none group-hover:text-red-400 transition-colors truncate max-w-[120px]">
              {dispName}
            </h3>
            {player.riot_account?.tag && (
              <div className="flex items-center gap-1 mt-1 text-gray-500 text-xs">
                <span>#{player.riot_account.tag}</span>
              </div>
            )}
          </div>
        </div>
        
        <span className="px-2 py-1 bg-green-500/10 text-green-500 border border-green-500/20 rounded text-[10px] font-bold tracking-wider uppercase shadow-sm">
          LFT
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 mb-4">
        <div className="bg-[#0f1112] border border-gray-800 rounded-lg p-2.5 flex items-center justify-center text-center gap-2">
          <Shield className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-bold text-gray-300 uppercase tracking-wide">{role}</span>
        </div>
      </div>

      <div className="mb-5 flex-1">
        <p className="text-sm text-gray-400 leading-relaxed line-clamp-3">
          {player.bio ? `"${player.bio}"` : "Este agente está à procura de equipa para competir, mas ainda não adicionou uma biografia."}
        </p>
      </div>

      <div className="mt-auto pt-4 border-t border-gray-800 flex flex-col gap-2">
        <button 
          onClick={() => navigate(`/profile/${player.id}`)}
          className="w-full flex justify-center items-center gap-1.5 px-4 py-2 bg-[#2a2d2e] hover:bg-gray-700 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors"
        >
          <User size={14} />
          Ver Perfil
        </button>

        {isCaptain && (
          <button 
            onClick={handleInvite}
            disabled={inviteStatus !== 'none'}
            className={`w-full flex justify-center items-center gap-1.5 px-4 py-2 text-white text-xs font-bold uppercase tracking-wider rounded transition-colors
              ${inviteStatus === 'sent' 
                ? 'bg-green-500/10 text-green-500 cursor-default border border-green-500/30' 
                : 'bg-red-500 hover:bg-red-600 group-hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]'}`}
          >
            {inviteStatus === 'loading' ? (
              <Loader2 size={14} className="animate-spin" />
            ) : inviteStatus === 'sent' ? (
              <>
                <CheckCircle2 size={14} /> Convite Enviado
              </>
            ) : (
              <>
                <UserPlus size={14} /> Convidar p/ Equipa
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default function RecruitPage() {
  const [players, setPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Estados para saber se quem está a ver a página é capitão
  const [myTeamId, setMyTeamId] = useState(null);
  const [isCaptain, setIsCaptain] = useState(false);
  const [invitedIds, setInvitedIds] = useState(new Set());

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;
      
      let currentTeamId = null;
      let isCap = false;
      let pendingInvites = new Set();

      if (userId) {
        // 1. Verifica se o utilizador é dono ou vice de alguma equipa
        const { data: member } = await supabase
          .from('team_members')
          .select('team_id, role')
          .eq('user_id', userId)
          .maybeSingle();
          
        if (member && (member.role === 'owner' || member.role === 'vice')) {
          currentTeamId = member.team_id;
          isCap = true;
          
          // 2. Carrega logo todos os convites pendentes dessa equipa
          const { data: invites } = await supabase
            .from('team_invites')
            .select('user_id')
            .eq('team_id', currentTeamId)
            .eq('status', 'pending');
            
          if (invites) {
            pendingInvites = new Set(invites.map(inv => inv.user_id));
          }
        }
      }
      
      setMyTeamId(currentTeamId);
      setIsCaptain(isCap);
      setInvitedIds(pendingInvites);

      // 3. Vai buscar os jogadores que estão LFT
      let query = supabase
        .from('profiles')
        .select('id, username, avatar_url, main_role, secondary_role, riot_account, is_lft, bio')
        .eq('is_lft', true);
        
      if (userId) {
        query = query.neq('id', userId); // Esconde o próprio utilizador da lista
      }

      const { data, error } = await query;

      if (error) {
        console.error("Erro ao carregar jogadores LFT:", error);
      } else {
        setPlayers(data || []);
      }
      setLoading(false);
    };
    
    fetchData();
  }, []);

  // Filtragem local dos resultados baseada na pesquisa de texto
  const filteredPlayers = players.filter(player => {
    if (!searchQuery) return true;
    const nameToMatch = player.riot_account?.name || player.username || "";
    return nameToMatch.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="animate-fade-in max-w-7xl mx-auto pb-10">
      <div className="bg-[#181a1b] border border-gray-800 rounded-xl p-6 mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white uppercase tracking-tight flex items-center gap-2">
            Recrutamento <span className="text-red-500">•</span>
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Encontra os agentes que estão disponíveis (LFT) para completar a tua equipa.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Procurar por nome..." 
              className="bg-[#0f1112] border border-gray-800 text-white text-sm rounded-lg pl-9 pr-4 py-2 w-full md:w-64 focus:outline-none focus:border-red-500 transition-colors"
            />
          </div>
          <button className="p-2 bg-[#0f1112] border border-gray-800 rounded-lg hover:border-gray-600 text-gray-400 hover:text-white transition-colors">
            <Filter size={18} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
        </div>
      ) : filteredPlayers.length === 0 ? (
        <div className="text-center py-20 bg-[#181a1b] rounded-xl border border-gray-800">
          <Shield className="w-12 h-12 text-gray-700 mx-auto mb-4 opacity-50" />
          <h2 className="text-lg font-bold text-white mb-2">Sem resultados</h2>
          <p className="text-gray-500 text-sm">Nenhum jogador com a opção LFT ativada foi encontrado.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPlayers.map((player) => (
            <PlayerCard 
              key={player.id} 
              player={player} 
              isCaptain={isCaptain}
              myTeamId={myTeamId}
              alreadyInvited={invitedIds.has(player.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}