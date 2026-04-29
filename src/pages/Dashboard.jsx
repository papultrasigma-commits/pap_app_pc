import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient"; // <-- Adicionado para verificar o Admin
import { 
  TrendingUp, 
  Target, 
  Shield, 
  Clock, 
  Users, 
  Search, 
  Swords, 
  Map, 
  Trophy, 
  Award, 
  ChevronRight,
  Link as LinkIcon,
  ExternalLink,
  ShieldAlert, // <-- Ícone novo para o Admin
  Gavel
} from "lucide-react";

const StatCard = ({ icon, title, subtitle, trend }) => (
  <div className="bg-[#181a1b] p-4 xl:p-6 rounded-lg border border-gray-800 hover:border-gray-700 transition-all duration-300 relative overflow-hidden group hover:shadow-[0_0_20px_rgba(0,0,0,0.3)]">
    <div className="absolute top-0 right-0 w-20 h-20 xl:w-24 xl:h-24 bg-gradient-to-br from-gray-800/20 to-transparent rounded-bl-full -mr-10 -mt-10 xl:-mr-12 xl:-mt-12 pointer-events-none transition-transform group-hover:scale-110" />
    <div className="flex items-start justify-between mb-3 xl:mb-4">
      <div className="p-2 xl:p-3 bg-[#0f1112] rounded-lg border border-gray-800 group-hover:border-gray-600 transition-colors">{icon}</div>
      {trend && trend !== "-" && <span className="text-[10px] xl:text-xs font-bold text-green-500 bg-green-500/10 px-2 py-1 rounded border border-green-500/20">{trend}</span>}
    </div>
    <div>
      <h3 className="text-xl xl:text-2xl font-bold text-white tracking-tight">{title}</h3>
      <p className="text-[10px] xl:text-xs text-gray-500 font-bold uppercase tracking-wider mt-1">{subtitle}</p>
    </div>
  </div>
);

const MenuCard = ({ icon, title, desc, badge, badgeColor, onClick }) => (
  <button onClick={onClick} className="flex flex-col text-left bg-[#181a1b] p-4 xl:p-6 rounded-lg border border-gray-800 hover:border-red-500/50 hover:bg-[#1f2123] transition-all group h-full relative hover:-translate-y-1">
    <div className="flex justify-between items-start w-full mb-3 xl:mb-4">
      <div className="p-2 xl:p-3 bg-[#0f1112] rounded-lg text-gray-300 group-hover:text-white group-hover:bg-red-500 transition-colors duration-300">{icon}</div>
      {badge && <span className={`text-[9px] xl:text-[10px] font-bold text-white px-2 py-1 rounded uppercase tracking-wider ${badgeColor || "bg-blue-500"}`}>{badge}</span>}
    </div>
    <h3 className="text-base xl:text-lg font-bold text-white mb-1 xl:mb-2 group-hover:text-red-400 transition-colors">{title}</h3>
    <p className="text-xs xl:text-sm text-gray-500 leading-relaxed">{desc}</p>
    <div className="mt-auto pt-4 xl:pt-6 flex items-center text-[10px] xl:text-xs font-bold text-gray-600 uppercase tracking-widest group-hover:text-gray-300 transition-colors">
      Aceder <ChevronRight size={14} className="ml-1 group-hover:translate-x-1 transition-transform" />
    </div>
  </button>
);

const ValorantProfileBanner = ({ riotAccount, onLinkClick }) => {
  if (!riotAccount) {
    return (
      <div className="bg-[#181a1b] border border-gray-800 rounded-lg p-6 xl:p-8 shadow-xl flex flex-col items-center justify-center text-center min-h-[180px] xl:min-h-[200px] mb-6 xl:mb-8 relative overflow-hidden group hover:border-gray-700 transition-all">
        <div className="absolute top-0 right-0 w-40 h-40 xl:w-48 xl:h-48 bg-gradient-to-br from-red-500/5 to-transparent rounded-bl-full -mr-20 -mt-20 xl:-mr-24 xl:-mt-24 pointer-events-none" />
        <div className="p-3 xl:p-4 bg-[#0f1112] border border-gray-800 rounded-xl mb-3 xl:mb-4 text-gray-400 group-hover:text-red-400 transition-colors">
          <Swords size={28} className="xl:w-8 xl:h-8" />
        </div>
        <h3 className="text-lg xl:text-xl font-bold text-white mb-2">Conta Riot Não Vinculada</h3>
        <p className="text-gray-500 text-xs xl:text-sm mb-4 xl:mb-6 max-w-md">
          Vincula a tua conta Valorant para exibires o teu Player Card, nível e acompanhares as tuas estatísticas no Dashboard.
        </p>
        <button 
          onClick={onLinkClick}
          className="bg-red-500 hover:bg-red-600 text-white px-5 xl:px-6 py-2 xl:py-2.5 rounded font-bold uppercase tracking-wider transition-colors text-[10px] xl:text-xs flex items-center gap-2"
        >
          <LinkIcon size={14} className="xl:w-4 xl:h-4" />
          Vincular Conta Agora
        </button>
      </div>
    );
  }

  const trackerUrl = `https://tracker.gg/valorant/profile/riot/${encodeURIComponent(riotAccount.name)}%23${encodeURIComponent(riotAccount.tag)}/overview`;

  return (
    <div className="relative overflow-hidden bg-[#181a1b] border border-gray-800 rounded-lg shadow-xl min-h-[180px] xl:min-h-[220px] mb-6 xl:mb-8 flex flex-col justify-end group hover:border-gray-700 transition-colors">
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-40 transition-opacity duration-500 group-hover:opacity-50" 
        style={{ backgroundImage: `url(${riotAccount.card?.wide || riotAccount.card?.large})` }}
      ></div>
      <div className="absolute inset-0 bg-gradient-to-t from-[#0f1112] via-[#0f1112]/80 to-transparent"></div>
      
      <div className="relative p-5 md:p-6 xl:p-8 flex items-end gap-4 xl:gap-6 z-10">
        <img 
          src={riotAccount.card?.small} 
          alt="Ícone de Perfil" 
          className="w-20 h-20 sm:w-24 sm:h-24 xl:w-28 xl:h-28 rounded-lg shadow-[0_0_15px_rgba(239,68,68,0.3)] border border-red-500/50 object-cover"
        />
        <div className="pb-1">
          <a 
            href={trackerUrl} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-2xl sm:text-3xl xl:text-4xl font-bold text-white flex items-baseline gap-2 tracking-tight drop-shadow-lg hover:text-red-400 transition-colors cursor-pointer"
            title="Ver perfil no Tracker.gg"
          >
            {riotAccount.name} 
            <span className="text-gray-400 font-bold text-lg sm:text-xl xl:text-2xl">#{riotAccount.tag}</span>
            <ExternalLink size={16} className="xl:w-5 xl:h-5 ml-1 opacity-50 hover:opacity-100" />
          </a>
          
          <div className="mt-2 xl:mt-3 inline-flex items-center gap-2 bg-[#0f1112]/80 backdrop-blur-sm px-2.5 xl:px-3 py-1 xl:py-1.5 rounded border border-gray-800">
            <span className="w-1.5 h-1.5 xl:w-2 xl:h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]"></span>
            <p className="text-gray-300 text-[10px] xl:text-xs font-bold uppercase tracking-wider">
              Nível {riotAccount.account_level}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Dashboard({ myTeam, teamLoading, riotAccount, nextTraining }) {
  const navigate = useNavigate(); 
  const [mmrData, setMmrData] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false); // <-- NOVO ESTADO
  const [loadingAdmin, setLoadingAdmin] = useState(true);

  const HENRIK_API_KEY = "HDEV-08f8bd4c-1d92-45d3-9309-e02904f7f8ff";

  useEffect(() => {
    // Verificar se o utilizador atual é Admin
    const checkAdminStatus = async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (userRes?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', userRes.user.id)
          .maybeSingle();
        
        setIsAdmin(profile?.is_admin || false);
      }
      setLoadingAdmin(false);
    };

    checkAdminStatus();
  }, []);

  useEffect(() => {
    // Só carrega os dados do Valorant se NÃO for admin (poupa recursos)
    if (!isAdmin && riotAccount && riotAccount.name && riotAccount.tag) {
      const region = riotAccount.region || "eu"; 
      fetch(`https://api.henrikdev.xyz/valorant/v1/mmr/${region}/${riotAccount.name}/${riotAccount.tag}`, {
        headers: { "Authorization": HENRIK_API_KEY }
      })
      .then(res => res.json())
      .then(data => {
        if (data.status === 200 && data.data) {
          setMmrData(data.data); 
        }
      })
      .catch(err => console.error("Erro a carregar MMR:", err));
    }
  }, [riotAccount, isAdmin]);

  if (loadingAdmin) return <div className="p-10 text-center text-gray-500">A carregar o teu painel...</div>;

  // ==========================================
  // 🛡️ VIEW EXCLUSIVA DO ADMINISTRADOR
  // ==========================================
  if (isAdmin) {
    return (
      <div className="animate-fade-in max-w-6xl mx-auto pb-6 xl:pb-10">
        {/* Banner do Administrador */}
        <div className="bg-[#181a1b] border border-red-500/30 rounded-lg p-6 xl:p-10 shadow-[0_0_30px_rgba(239,68,68,0.15)] flex flex-col items-center justify-center text-center mb-6 xl:mb-10 relative overflow-hidden">
           <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/5 rounded-bl-full -mr-24 -mt-24 pointer-events-none" />
           <div className="absolute bottom-0 left-0 w-48 h-48 bg-red-500/5 rounded-tr-full -ml-16 -mb-16 pointer-events-none" />
           
           <ShieldAlert size={56} className="text-red-500 mb-4 relative z-10" />
           <h2 className="text-3xl xl:text-4xl font-black text-white uppercase tracking-tight relative z-10">
             Modo Administrador
           </h2>
           <p className="text-gray-400 mt-3 max-w-lg text-sm leading-relaxed relative z-10">
             Bem-vindo ao centro de comando. Aqui tens controlo total para moderar a comunidade, gerir denúncias de jogadores e organizar competições.
           </p>
        </div>

        {/* Ferramentas do Administrador (Menos abas, mais diretas) */}
        <div className="mb-8 xl:mb-12">
          <h3 className="text-base xl:text-lg font-bold uppercase tracking-wider text-white border-l-4 border-red-500 pl-3 mb-4 xl:mb-6">
            Ferramentas de Gestão
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 xl:gap-6">
            <MenuCard 
              icon={<Gavel size={24} className="text-white" />} 
              title="Painel de Moderação" 
              desc="Vê as denúncias feitas pela comunidade e aplica banimentos a jogadores tóxicos." 
              onClick={() => navigate("/notifications")} 
              badge="Urgente" 
              badgeColor="bg-red-500" 
            />
            <MenuCard 
              icon={<Trophy size={24} className="text-white" />} 
              title="Gestão de Torneios" 
              desc="Cria novos torneios oficiais, aprova equipas e define as brackets." 
              onClick={() => navigate("/tournaments")} 
            />
            <MenuCard 
              icon={<Users size={24} className="text-white" />} 
              title="Feed da Comunidade" 
              desc="Acompanha o que se passa no site em tempo real e apaga publicações indevidas." 
              onClick={() => navigate("/feed")} 
            />
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // 🎮 VIEW NORMAL DO JOGADOR
  // ==========================================
  const currentRank = mmrData ? mmrData.currenttierpatched : "Sem Rank";
  const currentRR = mmrData ? `${mmrData.ranking_in_tier} RR` : "-";
  const accLevel = riotAccount ? riotAccount.account_level : "0";
  const trainingTime = nextTraining ? nextTraining.time : "--:--";
  const trainingDay = nextTraining ? nextTraining.day : "Sem treinos agendados";

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-6 xl:pb-10">
      <ValorantProfileBanner riotAccount={riotAccount} onLinkClick={() => navigate("/settings")} />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 xl:gap-6 mb-6 xl:mb-8">
        <StatCard icon={<TrendingUp size={20} className="xl:w-6 xl:h-6 text-blue-400" />} title={currentRank} subtitle="Rank Atual" trend={currentRR} />
        <StatCard icon={<Target size={20} className="xl:w-6 xl:h-6 text-red-400" />} title={accLevel} subtitle="Nível da Conta" />
        <StatCard icon={<Shield size={20} className="xl:w-6 xl:h-6 text-teal-400" />} title="Nível 3" subtitle="Honra" />
        <StatCard icon={<Clock size={20} className="xl:w-6 xl:h-6 text-purple-400" />} title={trainingTime} subtitle="Próximo Treino" trend={trainingDay} />
      </div>

      <div className="mb-6 xl:mb-8">
        <div className="bg-[#181a1b] border border-gray-800 rounded-lg p-4 xl:p-5 flex items-center justify-between">
          <div>
            <div className="text-[10px] xl:text-xs font-bold uppercase tracking-widest text-gray-500">Minha Equipa</div>
            {teamLoading ? (
              <div className="h-4 xl:h-5 w-32 bg-gray-700 animate-pulse rounded mt-2"></div>
            ) : myTeam ? (
              <div className="text-white font-bold mt-1 text-base xl:text-lg tracking-tight">{myTeam.name}</div>
            ) : (
              <div className="text-gray-400 mt-1 text-sm">Ainda não tens equipa.</div>
            )}
          </div>

          <div className="flex gap-2">
            {!teamLoading && !myTeam ? (
              <>
                <button onClick={() => navigate("/find-team")} className="bg-white text-black hover:bg-gray-200 font-bold py-1.5 px-3 xl:py-2 xl:px-4 rounded uppercase text-[10px] xl:text-xs tracking-wider transition-colors">
                  Procurar
                </button>
                <button onClick={() => navigate("/create-team")} className="bg-red-500 hover:bg-red-600 text-white font-bold py-1.5 px-3 xl:py-2 xl:px-4 rounded uppercase text-[10px] xl:text-xs tracking-wider transition-colors">
                  Criar
                </button>
              </>
            ) : (
              <button onClick={() => navigate("/team")} className="bg-white text-black hover:bg-gray-200 font-bold py-1.5 px-3 xl:py-2 xl:px-4 rounded uppercase text-[10px] xl:text-xs tracking-wider transition-colors">
                Ver
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="mb-8 xl:mb-12">
        <div className="flex items-center justify-between mb-4 xl:mb-6">
          <h3 className="text-base xl:text-lg font-bold uppercase tracking-wider text-white border-l-4 border-red-500 pl-3">Menu Principal</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 xl:gap-6">
          <MenuCard icon={<Users size={20} className="xl:w-6 xl:h-6 text-white" />} title="Minha Equipa" desc="Ver membros e gerir." onClick={() => navigate("/team")} />
          <MenuCard icon={<Search size={20} className="xl:w-6 xl:h-6 text-white" />} title="Procurar Scrims" desc="Encontra scrims competitivas." onClick={() => navigate("/scrims")} />
          <MenuCard icon={<Swords size={20} className="xl:w-6 xl:h-6 text-white" />} title="Treinos" desc="Agenda e gere sessões da equipa." onClick={() => navigate("/trainings")} />
          <MenuCard icon={<Map size={20} className="xl:w-6 xl:h-6 text-white" />} title="Estratégias" desc="Organiza strats por mapa." onClick={() => navigate("/strategies")} />
          <MenuCard icon={<Trophy size={20} className="xl:w-6 xl:h-6 text-white" />} title="Torneios" desc="Competições e inscrições." onClick={() => navigate("/tournaments")} />
          <MenuCard icon={<Award size={20} className="xl:w-6 xl:h-6 text-white" />} title="Sistema de Honra" desc="A tua reputação na comunidade." onClick={() => navigate("/honor")} />
        </div>
      </div>
    </div>
  );
}