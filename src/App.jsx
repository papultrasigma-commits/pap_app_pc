import React, { useEffect, useMemo, useState } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import { supabase } from "./supabaseClient";

// PAGES
import DashboardPage from "./pages/Dashboard";
import TeamPage from "./pages/Team";
import CreateTeamPage from "./pages/CreateTeam";
import FindTeamPage from "./pages/FindTeam"; 
import FeedPage from "./pages/Feed"; 
import RecruitPage from "./pages/Recruit"; 
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

import {
  LayoutDashboard, Users, Search, Swords, Map, Trophy, 
  Award, User, Settings, LogOut, Shield, Menu, X, Bell, MessageSquare, Handshake, Video, UserPlus, RefreshCcw, Plus, CheckCircle2, Loader2, Gavel
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
  const [isAdmin, setIsAdmin] = useState(false);
  const [userLoading, setUserLoading] = useState(true);
  
  const [myTeam, setMyTeam] = useState(null);
  const [teamLoading, setTeamLoading] = useState(true);
  const [teamRefreshKey, setTeamRefreshKey] = useState(0);
  
  const [nextTraining, setNextTraining] = useState(null);
  const [riotAccount, setRiotAccount] = useState(null); 
  const [invitesCount, setInvitesCount] = useState(0);
  const [unreadNegotiations, setUnreadNegotiations] = useState(0);
  
  const [isCaptainOrVice, setIsCaptainOrVice] = useState(false);

  const [currentUserEmail, setCurrentUserEmail] = useState(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [savedAccounts, setSavedAccounts] = useState([]);
  const [isSwitching, setIsSwitching] = useState(false);

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
    setIsAdmin(false);
    setCurrentUserEmail(null);
    setUserLoading(false);
    setMyTeam(null);
    setTeamLoading(false);
    setNextTraining(null);
    setRiotAccount(null); 
    setInvitesCount(0);
    setUnreadNegotiations(0);
    setIsCaptainOrVice(false);
  };

  const openAccountModal = () => {
    const accounts = JSON.parse(localStorage.getItem("vlr_saved_accounts") || "[]");
    setSavedAccounts(accounts);
    setShowAccountModal(true);
  };

  const switchToExistingAccount = async (account) => {
    if (!account.refreshToken) {
      goToAddAccount();
      return;
    }
    setIsSwitching(true);
    try {
      const { data, error } = await supabase.auth.setSession({
        access_token: account.accessToken,
        refresh_token: account.refreshToken
      });
      if (error) throw error;
      if (data?.session) {
        const accounts = JSON.parse(localStorage.getItem("vlr_saved_accounts") || "[]");
        const updated = accounts.map(acc => 
          acc.email === account.email 
            ? { ...acc, accessToken: data.session.access_token, refreshToken: data.session.refresh_token } 
            : acc
        );
        localStorage.setItem("vlr_saved_accounts", JSON.stringify(updated));
        window.location.reload(); 
      }
    } catch (err) {
      console.error("Sessão expirou ou erro ao trocar:", err);
      goToAddAccount(); 
    }
  };

  const goToAddAccount = () => {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('sb-') && key.endsWith('-auth-token')) {
        localStorage.removeItem(key);
      }
    });
    sessionStorage.setItem("force_login_form", "true");
    window.location.href = "/";
  };

  const handleLogout = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const email = session?.user?.email;

    if (email) {
      const accounts = JSON.parse(localStorage.getItem("vlr_saved_accounts") || "[]");
      const updated = accounts.map(acc => 
        acc.email === email ? { ...acc, refreshToken: null, accessToken: null } : acc
      );
      localStorage.setItem("vlr_saved_accounts", JSON.stringify(updated));
    }

    await supabase.auth.signOut();
    resetSessionUi();
    navigate("/");
    setTeamRefreshKey((k) => k + 1);
  };

  const loadUserName = async () => {
    setUserLoading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const u = userRes?.user;
      if (!u) { setUserName(null); setCurrentUserEmail(null); setIsAdmin(false); return; }
      
      setCurrentUserEmail(u.email); 

      const { data: prof } = await supabase.from("profiles").select("username, is_admin").eq("id", u.id).maybeSingle();
      const finalName = prof?.username || u.user_metadata?.username || u.user_metadata?.name || null;
      
      setUserName(finalName);
      setIsAdmin(prof?.is_admin || false);
    } catch (error) {
      console.error("Erro:", error);
      setUserName(null);
      setCurrentUserEmail(null);
      setIsAdmin(false);
    } finally {
      setUserLoading(false); 
    }
  };

  const loadMyTeamAndInvites = async () => {
    setTeamLoading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      if (!uid) { setMyTeam(null); setIsCaptainOrVice(false); return; }

      const { data: prof } = await supabase.from("profiles").select("is_admin").eq("id", uid).maybeSingle();
      if (prof?.is_admin) {
        setIsAdmin(true);
        setMyTeam(null);
        setTeamLoading(false);
        return;
      }

      const { data: member } = await supabase.from("team_members").select("team_id, role").eq("user_id", uid).maybeSingle();
      const teamId = member?.team_id;
      const isCapOrVice = member?.role === 'owner' || member?.role === 'vice';
      
      setIsCaptainOrVice(isCapOrVice || false);
      
      if (teamId) {
        const { data: team } = await supabase.from("teams").select("id,name,color_id,color_hex,owner_id,created_at,logo_url").eq("id", teamId).maybeSingle();
        if (team) {
          setMyTeam(team);
        } else {
          setMyTeam(null);
          setIsCaptainOrVice(false);
        }
      }

      const { count: teamInvCount } = await supabase.from("team_invites").select("*", { count: 'exact', head: true }).eq("user_id", uid).eq("status", "pending");
      let scrimsReqCount = 0, joinRequestsCount = 0;

      if (teamId && isCapOrVice) {
        const { data: pendingReqs } = await supabase.from('scrim_requests').select('id, scrims!inner(team_id)').eq('status', 'pending').eq('scrims.team_id', teamId);
        scrimsReqCount = pendingReqs?.length || 0;
        const { count: jReqCount } = await supabase.from('team_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending').eq('team_id', teamId);
        joinRequestsCount = jReqCount || 0;
      }
        
      setInvitesCount((teamInvCount || 0) + scrimsReqCount + joinRequestsCount);

    } catch (error) {
      console.error("Erro a carregar equipa/convites:", error);
    } finally {
      setTeamLoading(false); 
    }
  };

  useEffect(() => {
    let mounted = true;
    const sync = async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const u = userRes?.user;
      if (!mounted) return;
      if (!u) { resetSessionUi(); return; }

      try {
        const { data: profile } = await supabase.from('profiles').select('riot_account, is_admin').eq('id', u.id).maybeSingle();
        if (profile?.riot_account) setRiotAccount(profile.riot_account);
        setIsAdmin(profile?.is_admin || false);
      } catch (e) {
        console.error("Erro a ler conta Riot:", e);
      }

      await Promise.all([loadUserName(), loadMyTeamAndInvites()]);
    };
    sync();
    return () => { mounted = false; };
  }, [teamRefreshKey]); 

  const displayName = riotAccount ? riotAccount.name : (userLoading ? "..." : (userName ?? "Admin"));
  const initial = (displayName?.trim()?.[0] || "U").toUpperCase();

  const headerTitle = useMemo(() => {
    const map = {
      "/dashboard": "DASHBOARD",
      "/team": "MINHA EQUIPA",
      "/feed": "FEED DE CLIPES",
      "/find-team": "PROCURAR EQUIPA",
      "/recruit": "RECRUTAR JOGADORES",
      "/create-team": "CRIAR EQUIPA",
      "/scrims": "PROCURAR SCRIMS",
      "/negotiations": "NEGOCIAÇÕES", 
      "/trainings": "TREINOS",
      "/strategies": "ESTRATÉGIAS",
      "/tournaments": "TORNEIOS",
      "/honor": "SISTEMA DE HONRA",
      "/profile": "PERFIL",
      "/settings": "DEFINIÇÕES",
      "/notifications": isAdmin ? "MODERAÇÃO" : "NOTIFICAÇÕES",
      "/chat": "CHAT DA EQUIPA",
    };
    return map[location.pathname] || "DASHBOARD";
  }, [location.pathname, isAdmin]);

  const isStrategies = location.pathname === "/strategies";
  const isChat = location.pathname === "/chat"; 

  return (
    <div className="flex min-h-screen bg-[#0f1112] text-white font-sans selection:bg-red-500 selection:text-white relative">
      
      {/* ========================================================= */}
      {/* 🔴 NOVA DIV PARA ARRASTAR A JANELA NO TOPO DA APLICAÇÃO 🔴 */}
      {/* ========================================================= */}
      <div className="topo-da-app fixed top-0 left-0 w-full h-[30px] z-[100] pointer-events-auto"></div>

      {showAccountModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111] border border-gray-800 p-6 rounded-2xl w-full max-w-sm relative shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            {isSwitching && (
              <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center rounded-2xl">
                <Loader2 className="animate-spin text-red-500 mb-3" size={36} />
                <p className="text-white text-sm font-medium">A trocar de conta...</p>
              </div>
            )}
            
            {/* Adicionada classe 'no-drag' e 'z-[101]' para poder fechar o modal mesmo se bater na área de topo */}
            <button onClick={() => setShowAccountModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors no-drag z-[101]">
              <X size={20} />
            </button>
            <h2 className="text-xl font-bold mb-5 flex items-center gap-2">
              <RefreshCcw size={20} className="text-red-500"/>
              Mudar de Conta
            </h2>
            
            <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar pr-1">
              {savedAccounts.map((acc, idx) => {
                const isActive = acc.email === currentUserEmail;
                return (
                  <div key={idx} onClick={() => !isActive && switchToExistingAccount(acc)} className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all ${isActive ? 'bg-red-500/10 border border-red-500/30' : 'bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 hover:border-gray-600'}`}>
                    <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center font-bold text-white shadow-sm shadow-red-500/20">
                      {(acc.username?.[0] || acc.email?.[0] || "U").toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-white truncate">{acc.username || "Utilizador"}</p>
                      <p className="text-xs text-gray-500 truncate">{acc.email}</p>
                    </div>
                    {isActive && <CheckCircle2 size={18} className="text-red-500 ml-2" />}
                  </div>
                )
              })}
            </div>
            
            <button onClick={goToAddAccount} className="mt-4 w-full py-3.5 rounded-xl border border-dashed border-gray-700 hover:border-gray-500 hover:bg-neutral-900 flex items-center justify-center gap-2 font-medium text-sm text-gray-300 hover:text-white transition-all">
              <Plus size={18} /> Adicionar nova conta
            </button>
          </div>
        </div>
      )}

      {sidebarOpen && <button type="button" aria-label="Fechar menu" className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setSidebarOpen(false)} />}

      <aside className={`fixed md:sticky top-0 h-screen w-72 bg-[#111] border-r border-gray-800 flex flex-col z-30 transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}>
        <div className="p-8 flex items-center gap-4 border-b border-gray-800">
          <div className="w-10 h-10 bg-red-500 flex items-center justify-center rounded shadow-[0_0_15px_rgba(239,68,68,0.5)]">
            <Shield size={20} className="text-white" fill="white" />
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-wider uppercase leading-none">Valorant</h1>
            <span className="text-[10px] text-gray-500 uppercase tracking-[0.2em] font-bold">Team Manager</span>
          </div>
          {/* Adicionada classe 'no-drag' ao botão de fechar do mobile */}
          <button className="ml-auto md:hidden text-gray-400 no-drag z-50 relative" onClick={() => setSidebarOpen(false)} type="button"><X size={24} /></button>
        </div>

        <nav className="flex-1 py-6 px-4 space-y-2 overflow-y-auto custom-scrollbar">
          <div className="px-4 mb-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Principal</div>
          <SidebarItem icon={<LayoutDashboard size={20} />} label="Dashboard" active={location.pathname === "/dashboard"} onClick={() => navigate("/dashboard")} />
          
          {isAdmin ? (
            <>
              <SidebarItem icon={<Gavel size={20} />} label="Moderação (Denúncias)" active={location.pathname === "/notifications"} onClick={() => navigate("/notifications")} />
              <SidebarItem icon={<Video size={20} />} label="Feed da Comunidade" active={location.pathname === "/feed"} onClick={() => navigate("/feed")} />
              <SidebarItem icon={<Trophy size={20} />} label="Gestão de Torneios" active={location.pathname === "/tournaments"} onClick={() => navigate("/tournaments")} />
            </>
          ) : (
            <>
              <SidebarItem icon={<Bell size={20} />} label="Notificações" active={location.pathname === "/notifications"} onClick={() => navigate("/notifications")} badge={invitesCount > 0 ? invitesCount : null} />
              <SidebarItem icon={<Users size={20} />} label="Minha Equipa" active={location.pathname === "/team"} onClick={() => navigate("/team")} />
              {!teamLoading && myTeam && <SidebarItem icon={<MessageSquare size={20} />} label="Chat da Equipa" active={location.pathname === "/chat"} onClick={() => navigate("/chat")} />}
              <SidebarItem icon={<Video size={20} />} label="Feed de Clipes" active={location.pathname === "/feed"} onClick={() => navigate("/feed")} />
              
              {/* === CORREÇÃO: "Recrutar Jogadores" agora está visível para toda a gente === */}
              <SidebarItem icon={<UserPlus size={20} />} label="Recrutar Jogadores" active={location.pathname === "/recruit"} onClick={() => navigate("/recruit")} />
              
              {!teamLoading && !myTeam && <SidebarItem icon={<Search size={20} />} label="Procurar Equipa" active={location.pathname === "/find-team"} onClick={() => navigate("/find-team")} />}
              <SidebarItem icon={<Search size={20} />} label="Procurar Scrims" active={location.pathname === "/scrims"} onClick={() => navigate("/scrims")} />
              {!teamLoading && myTeam && <SidebarItem icon={<Handshake size={20} />} label="Negociações" active={location.pathname === "/negotiations"} onClick={() => navigate("/negotiations")} badge={unreadNegotiations > 0 ? unreadNegotiations : null} />}

              <div className="px-4 mt-8 mb-2 text-[10px] font-bold text-gray-600 uppercase tracking-widest">Gestão</div>
              <SidebarItem icon={<Swords size={20} />} label="Treinos" active={location.pathname === "/trainings"} onClick={() => navigate("/trainings")} />
              <SidebarItem icon={<Map size={20} />} label="Estratégias" active={location.pathname === "/strategies"} onClick={() => navigate("/strategies")} />
              <SidebarItem icon={<Trophy size={20} />} label="Torneios" active={location.pathname === "/tournaments"} onClick={() => navigate("/tournaments")} badge={showTournamentsBadge ? "1" : null} />
              <SidebarItem icon={<Award size={20} />} label="Sistema de Honra" active={location.pathname === "/honor"} onClick={() => navigate("/honor")} />
            </>
          )}
        </nav>

        <div className="p-4 space-y-1 border-t border-gray-800 bg-[#0c0d0e]">
          {!isAdmin && <SidebarItem icon={<User size={20} />} label="Perfil" active={location.pathname === "/profile"} onClick={() => navigate("/profile")} />}
          <SidebarItem icon={<Settings size={20} />} label="Definições" active={location.pathname === "/settings"} onClick={() => navigate("/settings")} />
          <SidebarItem icon={<RefreshCcw size={20} />} label="Trocar de Conta" onClick={openAccountModal} />
          <SidebarItem icon={<LogOut size={20} />} label="Sair" color="text-red-500 hover:bg-red-500/10 hover:text-red-500" onClick={handleLogout} />
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden flex items-center justify-between p-4 border-b border-gray-800 bg-[#111]">
          {/* Adicionada classe 'no-drag' ao botão de abrir menu no mobile */}
          <button onClick={() => setSidebarOpen(true)} className="text-gray-300 no-drag z-50 relative" type="button"><Menu size={24} /></button>
          <span className="font-bold tracking-wider">{headerTitle}</span>
          <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center text-xs font-bold">{initial}</div>
        </div>

        <div className={`flex-1 overflow-y-auto ${isStrategies || isChat ? "p-0 md:p-6" : "p-6 md:p-10"}`}>
          {!isStrategies && !isChat && !location.pathname.startsWith("/profile") && (
            <div className="hidden md:flex justify-between items-center mb-12">
              <div>
                <h2 className="text-gray-400 text-sm font-medium">{isAdmin ? "Bem-vindo," : "Bem-vindo de volta,"}</h2>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  {displayName}
                  {isAdmin && <span className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded uppercase tracking-widest">Admin</span>}
                </h1>
              </div>
            </div>
          )}

          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<DashboardPage myTeam={myTeam} teamLoading={teamLoading} riotAccount={riotAccount} nextTraining={nextTraining} />} />
            <Route path="/notifications" element={<NotificationsPage onTeamJoined={() => { setTeamRefreshKey((k) => k + 1); setInvitesCount(0); }} onAction={() => loadMyTeamAndInvites()} />} />
            <Route path="/chat" element={<ChatPage myTeam={myTeam} userName={displayName} />} />
            <Route path="/negotiations" element={<NegotiationsPage myTeam={myTeam} setGlobalUnread={setUnreadNegotiations} />} />
            
            <Route path="/team" element={<TeamPage refreshKey={teamRefreshKey} onGoFindTeam={() => navigate("/find-team")} onGoCreateTeam={() => navigate("/create-team")} onEditTeam={() => navigate("/create-team")} riotAccount={riotAccount} userName={userName} />} />
            
            <Route path="/create-team" element={<CreateTeamPage existingTeam={myTeam} onCancel={() => navigate("/dashboard")} goFindTeam={() => navigate("/find-team")} onCreated={async () => { await loadMyTeamAndInvites(); setTeamRefreshKey((k) => k + 1); navigate("/team"); }} />} />
            <Route path="/feed" element={<FeedPage />} />
            <Route path="/recruit" element={<RecruitPage />} /> 
            <Route path="/find-team" element={<FindTeamPage onCancel={() => navigate("/dashboard")} onJoined={async () => { await loadMyTeamAndInvites(); setTeamRefreshKey((k) => k + 1); navigate("/team"); }} />} />
            <Route path="/scrims" element={<ScrimsPage myTeam={myTeam} />} />
            <Route path="/trainings" element={<TrainingsPage myTeam={myTeam} />} />
            <Route path="/strategies" element={<div className="h-[calc(100vh-0px)]"><StrategiesPage /></div>} />
            <Route path="/tournaments" element={<TournamentsPage myTeam={myTeam} />} />
            <Route path="/honor" element={<HonorPage myTeam={myTeam} />} />
            <Route path="/settings" element={<SettingsPage riotAccount={riotAccount} setRiotAccount={setRiotAccount} userName={userName} />} />
            
            <Route path="/profile" element={<ProfilePage userName={displayName} riotAccount={riotAccount} />} />
            <Route path="/profile/:userId" element={<ProfilePage userName={displayName} riotAccount={riotAccount} />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}