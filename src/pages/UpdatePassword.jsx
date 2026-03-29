import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

// PAGES
import DashboardPage from "./pages/Dashboard";
import TeamPage from "./pages/Team";
import CreateTeamPage from "./pages/CreateTeam";
import FindTeamPage from "./pages/FindTeam";
import ScrimsPage from "./pages/Scrims";
import TrainingsPage from "./pages/Trainings";
import StrategiesPage from "./pages/Strategies";
import TournamentsPage from "./pages/Tournaments";
import HonorPage from "./pages/Honor";
import ProfilePage from "./pages/Profile";
import SettingsPage from "./pages/Settings";
import NotificationsPage from "./pages/Notifications";
import ChatPage from "./pages/Chat";
import NegotiationsPage from "./pages/Negotiations"; 
import UpdatePasswordPage from "./pages/UpdatePassword"; // <-- IMPORTÁMOS A NOVA PÁGINA AQUI

import {
  LayoutDashboard, Users, Search, Swords, Map, Trophy, 
  Award, User, Settings, LogOut, Shield, Menu, X, Bell, MessageSquare, Handshake
} from "lucide-react";

const SidebarItem = ({ icon, label, active = false, badge = null, onClick, color }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all duration-200 group relative overflow-hidden ${
      active ? "bg-red-500/10 text-red-500" : "text-gray-400 hover:bg-gray-800 hover:text-white"
    } ${color ? color : ""}`}
  >
    {active && <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500" />}
    <span className={`${active ? "text-red-500" : "group-hover:text-white"}`}>{icon}</span>
    <span className="font-medium text-sm tracking-wide">{label}</span>
    {badge && (
      <span className="ml-auto bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
        {badge}
      </span>
    )}
  </button>
);

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [userName, setUserName] = useState(null);
  const [userLoading, setUserLoading] = useState(true);
  const [myTeam, setMyTeam] = useState(null);
  const [teamLoading, setTeamLoading] = useState(true);
  const [teamRefreshKey, setTeamRefreshKey] = useState(0);
  
  const [nextTraining, setNextTraining] = useState(null);
  const [riotAccount, setRiotAccount] = useState(null); 
  const [invitesCount, setInvitesCount] = useState(0);
  const [unreadNegotiations, setUnreadNegotiations] = useState(0);

  const [showTournamentsBadge, setShowTournamentsBadge] = useState(
    localStorage.getItem("seen_tournaments") !== "true"
  );

  useEffect(() => {
    if (location.pathname === "/tournaments") {
      setShowTournamentsBadge(false);
      localStorage.setItem("seen_tournaments", "true");
    }
  }, [location.pathname]);

  const resetSessionUi = () => {
    setUserName(null);
    setUserLoading(false);
    setMyTeam(null);
    setTeamLoading(false);
    setNextTraining(null);
    setRiotAccount(null); 
    setInvitesCount(0);
    setUnreadNegotiations(0);
  };

  const loadUserName = async () => {
    setUserLoading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const u = userRes?.user;
      if (!u) { setUserName(null); return; }
      
      const { data: prof } = await supabase.from("profiles").select("username").eq("id", u.id).maybeSingle();
      const finalName = prof?.username || u.user_metadata?.username || u.user_metadata?.name || null;
      setUserName(finalName);
    } catch (error) {
      console.error("Erro:", error);
      setUserName(null);
    } finally {
      setUserLoading(false); 
    }
  };

  const loadNextTraining = async (teamId) => {
    try {
      const todayIso = new Date().toISOString();
      const { data: training } = await supabase
        .from("team_trainings")
        .select("date")
        .eq("team_id", teamId)
        .gte("date", todayIso)
        .order("date", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (training) {
        const trainDate = new Date(training.date);
        const todayDate = new Date();
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);

        let dayStr = "";
        if (trainDate.toDateString() === todayDate.toDateString()) {
          dayStr = "Hoje";
        } else if (trainDate.toDateString() === tomorrow.toDateString()) {
          dayStr = "Amanhã";
        } else {
          dayStr = trainDate.toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' });
        }

        const timeStr = trainDate.toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' });
        setNextTraining({ time: timeStr, day: dayStr });
      } else {
        setNextTraining(null);
      }
    } catch (err) {
      console.error("Erro a carregar treinos:", err);
    }
  };

  const loadMyTeamAndInvites = async () => {
    setTeamLoading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      if (!uid) { setMyTeam(null); return; }

      const { data: member } = await supabase.from("team_members").select("team_id, role").eq("user_id", uid).maybeSingle();
      const teamId = member?.team_id;
      const isCaptainOrVice = member?.role === 'owner' || member?.role === 'vice';
      
      if (teamId) {
        const { data: team } = await supabase.from("teams").select("id,name,color_id,color_hex,owner_id,created_at").eq("id", teamId).maybeSingle();
        if (!team) {
          await supabase.from("team_members").delete().eq("user_id", uid);
          setMyTeam(null);
        } else {
          setMyTeam(team);
          await loadNextTraining(team.id); 
        }
      } else {
        setMyTeam(null);
      }

      const { count: teamInvCount } = await supabase
        .from("team_invites")
        .select("*", { count: 'exact', head: true })
        .eq("user_id", uid)
        .eq("status", "pending");

      let scrimsReqCount = 0;
      let unreadChatsCount = 0; 
      let joinRequestsCount = 0; 

      if (teamId && isCaptainOrVice) {
        const { data: pendingReqs } = await supabase
          .from('scrim_requests')
          .select('id, scrims!inner(team_id)')
          .eq('status', 'pending')
          .eq('scrims.team_id', teamId);
        scrimsReqCount = pendingReqs?.length || 0;

        const { count: jReqCount } = await supabase
          .from('team_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending')
          .eq('team_id', teamId);
        joinRequestsCount = jReqCount || 0;

        const { data: reqsAsRequester } = await supabase.from('scrim_requests').select('id').eq('requesting_team_id', teamId);
        const { data: reqsAsOwner } = await supabase.from('scrim_requests').select('id, scrims!inner(team_id)').eq('scrims.team_id', teamId);
        const allReqIds = [...(reqsAsRequester?.map(r=>r.id) || []), ...(reqsAsOwner?.map(r=>r.id) || [])];

        if (allReqIds.length > 0) {
          const { count } = await supabase
            .from('scrim_chat_messages')
            .select('*', { count: 'exact', head: true })
            .in('scrim_request_id', allReqIds)
            .neq('user_id', uid) 
            .eq('is_read', false); 
          unreadChatsCount = count || 0;
        }
      }
        
      setInvitesCount((teamInvCount || 0) + scrimsReqCount + joinRequestsCount);
      setUnreadNegotiations(unreadChatsCount);

    } catch (error) {
      console.error("Erro a carregar equipa/convites:", error);
      setMyTeam(null);
    } finally {
      setTeamLoading(false); 
    }
  };

  useEffect(() => {
    if (location.pathname === "/notifications") {
      loadMyTeamAndInvites();
    }
  }, [location.pathname]);

  useEffect(() => {
    let mounted = true;
    const sync = async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const u = userRes?.user;
      if (!mounted) return;
      if (!u) {
        resetSessionUi();
        return;
      }

      try {
        const { data: profile } = await supabase.from('profiles').select('riot_account').eq('id', u.id).maybeSingle();
        if (profile?.riot_account) setRiotAccount(profile.riot_account);
        else setRiotAccount(null);
      } catch (e) {
        console.error("Erro a ler conta Riot:", e);
      }

      await Promise.all([loadUserName(), loadMyTeamAndInvites()]);
    };
    sync();
    return () => { mounted = false; };
  }, [teamRefreshKey]); 

  useEffect(() => {
    if (!myTeam) return;
    const channel = supabase.channel('global-chat-notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'scrim_chat_messages' }, () => {
        loadMyTeamAndInvites();
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'scrim_chat_messages' }, () => {
        loadMyTeamAndInvites();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [myTeam]);

  useEffect(() => {
    if (!teamLoading && myTeam && (location.pathname === "/create-team" || location.pathname === "/find-team")) {
      navigate("/team");
      setTeamRefreshKey((k) => k + 1);
    }
  }, [teamLoading, myTeam, location.pathname, navigate]);

  // 🔴 NOVO: Se estivermos na página de recuperação de senha, mostra apenas a página inteira, sem menu lateral!
  if (location.pathname === "/update-password") {
    return <UpdatePasswordPage />;
  }

  const displayName = riotAccount ? riotAccount.name : (userLoading ? "..." : (userName ?? "Utilizador"));
  const initial = (displayName?.trim()?.[0] || "U").toUpperCase();

  const headerTitle = useMemo(() => {
    const map = {
      "/dashboard": "DASHBOARD",
      "/team": "MINHA EQUIPA",
      "/find-team": "PROCURAR EQUIPA",
      "/create-team": "CRIAR EQUIPA",
      "/scrims": "PROCURAR SCRIMS",
      "/negotiations": "NEGOCIAÇÕES", 
      "/trainings": "TREINOS",
      "/strategies": "ESTRATÉGIAS",
      "/tournaments": "TORNEIOS",
      "/honor": "SISTEMA DE HONRA",
      "/profile": "PERFIL",
      "/settings": "DEFINIÇÕES",
      "/notifications": "NOTIFICAÇÕES",
      "/chat": "CHAT DA EQUIPA",
    };
    return map[location.pathname] || "DASHBOARD";
  }, [location.pathname]);

  const isStrategies = location.pathname === "/strategies";
  const isChat = location.pathname === "/chat"; 

  return (
    <div className="flex min-h-screen bg-[#0f1112] text-white font-sans selection:bg-red-500 selection:text-white">
      {sidebarOpen && (
        <button type="button" aria-label="Fechar menu" className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed md:sticky top-0 h-screen w-72 bg-[#111] border-r border-gray-800 flex flex-col z-30 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="p-8 flex items-center gap-4 border-b border-gray-800">
          <div className="w-10 h-10 bg-red-500 flex items-center justify-center rounded shadow-[0_0_15px_rgba(239,68,68,0.5)]">
            <Shield size={20} className="text-white" fill="white" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-wider uppercase leading-none">Valorant</h1>
            <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold">Team Manager</span>
          </div>
          <button className="ml-auto md:hidden text-gray-400" onClick={() => setSidebarOpen(false)} type="button"><X size={24} /></button>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          <div className="px-4 mb-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Principal</div>
          <SidebarItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={location.pathname === "/dashboard"} onClick={() => navigate("/dashboard")} />
          
          <SidebarItem icon={<Bell size={20} />} label="Notificações" active={location.pathname === "/notifications"} onClick={() => navigate("/notifications")} badge={invitesCount > 0 ? invitesCount : null} />
          
          <SidebarItem icon={<Users size={20} />} label="Minha Equipa" active={location.pathname === "/team"} onClick={() => navigate("/team")} />
          
          {!teamLoading && myTeam && (
            <SidebarItem icon={<MessageSquare size={20} />} label="Chat da Equipa" active={location.pathname === "/chat"} onClick={() => navigate("/chat")} />
          )}

          {!teamLoading && !myTeam && (
            <SidebarItem icon={<Search size={20} />} label="Procurar Equipa" active={location.pathname === "/find-team"} onClick={() => navigate("/find-team")} />
          )}
          <SidebarItem icon={<Search size={20} />} label="Procurar Scrims" active={location.pathname === "/scrims"} onClick={() => navigate("/scrims")} />
          
          {!teamLoading && myTeam && (
            <SidebarItem icon={<Handshake size={20} />} label="Negociações" active={location.pathname === "/negotiations"} onClick={() => navigate("/negotiations")} badge={unreadNegotiations > 0 ? unreadNegotiations : null} />
          )}

          <div className="px-4 mt-8 mb-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Gestão</div>
          <SidebarItem icon={<Swords size={20} />} label="Treinos" active={location.pathname === "/trainings"} onClick={() => navigate("/trainings")} />
          <SidebarItem icon={<Map size={20} />} label="Estratégias" active={location.pathname === "/strategies"} onClick={() => navigate("/strategies")} />
          
          <SidebarItem 
            icon={<Trophy size={20} />} 
            label="Torneios" 
            active={location.pathname === "/tournaments"} 
            onClick={() => navigate("/tournaments")} 
            badge={showTournamentsBadge ? "1" : null} 
          />

          <SidebarItem icon={<Award size={20} />} label="Sistema de Honra" active={location.pathname === "/honor"} onClick={() => navigate("/honor")} />
        </nav>

        <div className="p-4 space-y-1 border-t border-gray-800 bg-[#0c0d0e]">
          <SidebarItem icon={<User size={20} />} label="Perfil" active={location.pathname === "/profile"} onClick={() => navigate("/profile")} />
          <SidebarItem icon={<Settings size={20} />} label="Definições" active={location.pathname === "/settings"} onClick={() => navigate("/settings")} />
          <SidebarItem icon={<LogOut size={20} />} label="Sair" color="text-red-500 hover:bg-red-500/10 hover:text-red-500" onClick={async () => {
              await supabase.auth.signOut();
              resetSessionUi();
              navigate("/");
              setTeamRefreshKey((k) => k + 1);
            }} 
          />
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-800 bg-[#111]">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-300" type="button"><Menu size={24} /></button>
          <span className="font-bold tracking-wider">{headerTitle}</span>
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-xs font-bold">{initial}</div>
        </div>

        <div className={`flex-1 overflow-y-auto ${isStrategies || isChat ? "p-0 md:p-6" : "p-6 md:p-10"}`}>
          {!isStrategies && !isChat && (
            <div className="hidden md:flex justify-between items-center mb-12">
              <div>
                <h2 className="text-gray-400 text-sm font-medium">Bem-vindo de volta,</h2>
                <h1 className="text-3xl font-bold">{displayName}</h1>
              </div>
            </div>
          )}

          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage myTeam={myTeam} teamLoading={teamLoading} riotAccount={riotAccount} nextTraining={nextTraining} />} />
            <Route path="/notifications" element={
              <NotificationsPage 
                onTeamJoined={() => { setTeamRefreshKey((k) => k + 1); setInvitesCount(0); }} 
                onAction={() => loadMyTeamAndInvites()} 
              />} 
            />
            <Route path="/chat" element={<ChatPage myTeam={myTeam} userName={displayName} />} />
            <Route path="/negotiations" element={<NegotiationsPage myTeam={myTeam} setGlobalUnread={setUnreadNegotiations} />} />
            <Route path="/team" element={<TeamPage refreshKey={teamRefreshKey} onGoFindTeam={() => navigate("/find-team")} onGoCreateTeam={() => navigate("/create-team")} riotAccount={riotAccount} userName={userName} />} />
            <Route path="/create-team" element={<CreateTeamPage existingTeam={myTeam} onCancel={() => navigate("/dashboard")} goFindTeam={() => navigate("/find-team")} onCreated={async () => { await loadMyTeamAndInvites(); setTeamRefreshKey((k) => k + 1); navigate("/team"); }} />} />
            <Route path="/find-team" element={<FindTeamPage onCancel={() => navigate("/dashboard")} onJoined={async () => { await loadMyTeamAndInvites(); setTeamRefreshKey((k) => k + 1); navigate("/team"); }} />} />
            <Route path="/scrims" element={<ScrimsPage myTeam={myTeam} />} />
            <Route path="/trainings" element={<TrainingsPage myTeam={myTeam} />} />
            <Route path="/strategies" element={<div className="h-[calc(100vh-0px)]"><StrategiesPage /></div>} />
            <Route path="/tournaments" element={<TournamentsPage myTeam={myTeam} />} />
            <Route path="/honor" element={<HonorPage myTeam={myTeam} />} />
            <Route path="/profile" element={<ProfilePage userName={displayName} riotAccount={riotAccount} />} />
            <Route path="/settings" element={<SettingsPage riotAccount={riotAccount} setRiotAccount={setRiotAccount} userName={userName} />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}