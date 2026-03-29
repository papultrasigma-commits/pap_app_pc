import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { Bell, Check, X as XIcon, ShieldAlert, Swords, UserPlus, Gavel, Trash2, Clock, CheckCircle2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Notifications({ onTeamJoined, onAction }) {
  const [teamInvites, setTeamInvites] = useState([]);
  const [scrimRequests, setScrimRequests] = useState([]);
  const [joinRequests, setJoinRequests] = useState([]);
  
  // ESTADOS DO ADMIN
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminReports, setAdminReports] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const loadAllNotifications = async () => {
    setLoading(true);
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes?.user?.id;

    if (!uid) return setLoading(false);

    // VERIFICAR SE É ADMIN
    const { data: profile } = await supabase.from("profiles").select("is_admin").eq("id", uid).maybeSingle();
    const userIsAdmin = profile?.is_admin || false;
    setIsAdmin(userIsAdmin);

    if (userIsAdmin) {
      try {
        const { data: reports, error } = await supabase
          .from('feed_reports')
          .select(`
            id, reason, status, created_at,
            reporter:profiles!reporter_id(username),
            post:feed_posts!post_id(id, text_content, user_id, author_name),
            comment:feed_comments!comment_id(id, content, user_id, author_name)
          `)
          .eq('status', 'pendente')
          .order('created_at', { ascending: false });
          
        if (error) console.error("Erro no reports:", error);
        setAdminReports(reports || []);
      } catch (err) {
        console.error(err);
      }
    } else {
      // 1. O utilizador recebe convites de equipas para ele se juntar
      const { data: invites } = await supabase.from("team_invites").select("id, team_id, teams(name, color_id)").eq("user_id", uid).eq("status", "pending");
      setTeamInvites(invites || []);

      const { data: member } = await supabase.from("team_members").select("team_id, role").eq("user_id", uid).maybeSingle();

      // 2. Se o utilizador é capitão/vice de uma equipa
      if (member && (member.role === 'owner' || member.role === 'vice')) {
        const { data: sReqs } = await supabase.from('scrim_requests').select('id, status, scrim_id, requesting_team_id, teams:requesting_team_id(name, color_hex), scrims!inner(id, date, time, format, team_id)').eq('status', 'pending').eq('scrims.team_id', member.team_id);
        setScrimRequests(sReqs || []);

        const { data: jReqs } = await supabase.from('team_requests').select('id, team_id, user_id, profiles(username, valorant_rank)').eq('status', 'pending').eq('team_id', member.team_id);
        setJoinRequests(jReqs || []);
      } else {
          setScrimRequests([]);
          setJoinRequests([]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadAllNotifications();
  }, []);

  // --- AÇÕES ADMIN ---
  const handleBanUser = async (reportId, targetUserId, days) => {
    if (!window.confirm(`Tens a certeza que queres banir este utilizador por ${days} dias?`)) return;

    let banDate = new Date();
    if (days === 9999) {
      banDate.setFullYear(banDate.getFullYear() + 100); 
    } else {
      banDate.setDate(banDate.getDate() + days); 
    }

    try {
      const { error: banError } = await supabase.from('profiles').update({ banned_until: banDate }).eq('id', targetUserId);
      if (banError) throw banError;
      
      await supabase.from('feed_reports').update({ status: 'resolvido' }).eq('id', reportId);
      alert("Utilizador banido com sucesso!");
      setAdminReports(prev => prev.filter(r => r.id !== reportId));
    } catch (error) {
      console.error(error);
      alert("Erro ao banir. Verifica o RLS da tabela profiles.");
    }
  };

  const handleDismissReport = async (reportId) => {
    await supabase.from('feed_reports').update({ status: 'ignorado' }).eq('id', reportId);
    setAdminReports(prev => prev.filter(r => r.id !== reportId));
  };

  // --- AÇÕES NORMAIS ---
  
  // 1. JOGADOR ACEITA CONVITE
  const acceptTeamInvite = async (invite) => {
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes?.user?.id;
    if(!uid) return;

    try {
        // Insere na equipa
        const { error: insertError } = await supabase.from('team_members').insert([{ team_id: invite.team_id, user_id: uid, role: 'member' }]);
        if (insertError) throw insertError;

        // Apaga o convite para limpar a base de dados
        await supabase.from('team_invites').delete().eq('id', invite.id);

        // Retira o LFT do jogador
        await supabase.from('profiles').update({ is_lft: false }).eq('id', uid);

        setTeamInvites(prev => prev.filter(i => i.id !== invite.id));
        if (onAction) onAction();
        if (onTeamJoined) onTeamJoined();
        alert("Entraste na equipa com sucesso!");
        navigate('/team');
    } catch (err) {
        console.error("Erro ao aceitar convite:", err);
        alert("Erro! O Supabase bloqueou a entrada. Executaste o SQL para desligar o RLS?");
    }
  };

  // 1.b JOGADOR REJEITA (APAGA) CONVITE
  const rejectTeamInvite = async (inviteId) => {
    try {
      // Usar delete em vez de update para apagar logo o registo
      const { error } = await supabase.from('team_invites').delete().eq('id', inviteId);
      if (error) throw error;

      setTeamInvites(prev => prev.filter(i => i.id !== inviteId));
      if (onAction) onAction();
    } catch (err) {
      console.error("Erro ao rejeitar convite:", err);
      alert("Erro ao apagar convite. Executaste o comando SQL do RLS?");
    }
  };

  // 2. CAPITÃO ACEITA PEDIDO
  const acceptJoinRequest = async (req) => {
    try {
        const { error: insertError } = await supabase.from('team_members').insert([{ team_id: req.team_id, user_id: req.user_id, role: 'member' }]);
        if (insertError) throw insertError;

        // Apaga o pedido depois de aceite
        await supabase.from('team_requests').delete().eq('id', req.id);
        await supabase.from('profiles').update({ is_lft: false }).eq('id', req.user_id);

        setJoinRequests(prev => prev.filter(r => r.id !== req.id));
        if (onAction) onAction();
        alert("Jogador aceite na equipa!");
    } catch (err) {
        console.error("Erro ao aceitar jogador:", err);
        alert("Erro ao aceitar! Verifica o RLS no Supabase.");
    }
  };
  
  // 2.b CAPITÃO REJEITA (APAGA) PEDIDO
  const rejectJoinRequest = async (reqId) => {
    try {
      const { error } = await supabase.from('team_requests').delete().eq('id', reqId);
      if (error) throw error;
      setJoinRequests(prev => prev.filter(r => r.id !== reqId));
      if (onAction) onAction();
    } catch (err) {
      console.error("Erro ao rejeitar jogador:", err);
    }
  };

  // 3. SCRIMS
  const acceptScrimRequest = async (req) => {
      try {
        const { error } = await supabase.from('scrim_requests').update({ status: 'accepted' }).eq('id', req.id);
        if (error) throw error;

        setScrimRequests(prev => prev.filter(r => r.id !== req.id));
        if (onAction) onAction();
        alert("Scrim aceite! O jogo foi agendado.");
      } catch (err) {
        console.error("Erro ao aceitar scrim:", err);
      }
  };

  const rejectScrimRequest = async (reqId) => {
      try {
        const { error } = await supabase.from('scrim_requests').delete().eq('id', reqId);
        if (error) throw error;

        setScrimRequests(prev => prev.filter(r => r.id !== reqId));
        if (onAction) onAction();
      } catch (err) {
        console.error("Erro ao rejeitar scrim:", err);
      }
  };

  if (loading) return <div className="text-gray-400 p-10">A carregar...</div>;

  const hasNoNotifications = isAdmin ? adminReports.length === 0 : (teamInvites.length === 0 && scrimRequests.length === 0 && joinRequests.length === 0);

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
          {isAdmin ? <Gavel className="text-red-500" size={28} /> : <Bell className="text-red-500" size={28} />} 
          {isAdmin ? "Painel de Moderação" : "Notificações"}
        </h1>
        <p className="text-gray-400 mt-2 text-sm">
          {isAdmin ? "Gere as denúncias e o comportamento da comunidade." : "Gere os teus convites para equipas e desafios."}
        </p>
      </div>

      {hasNoNotifications ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center mt-8 bg-[#141617]/50 border border-gray-800/50 rounded-2xl">
          <div className="w-20 h-20 bg-gray-800/30 rounded-full flex items-center justify-center mb-6 shadow-inner border border-gray-800">
            {isAdmin ? <Check size={32} className="text-green-500" /> : <Bell size={32} className="text-gray-600" />}
          </div>
          <h3 className="text-white font-bold text-xl mb-2">{isAdmin ? "Comunidade Limpa!" : "Tudo em dia!"}</h3>
          <p className="text-gray-500 max-w-md mx-auto text-sm leading-relaxed">
            {isAdmin ? "Sem denúncias pendentes. Bom trabalho!" : "Não tens notificações pendentes."}
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          
          {/* ÁREA ADMIN */}
          {isAdmin && adminReports.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <ShieldAlert size={14} className="text-orange-500" /> Denúncias Pendentes
              </h3>
              <div className="space-y-4">
                {adminReports.map((report) => {
                  const isPost = !!report.post;
                  const targetUser = isPost ? report.post : report.comment;
                  const content = isPost ? report.post?.text_content : report.comment?.content;
                  
                  return (
                    <div key={report.id} className="bg-[#181a1b] border border-red-500/30 rounded-xl p-5 shadow-[0_0_20px_rgba(239,68,68,0.05)]">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-800">
                            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                              {isPost ? "Publicação" : "Comentário"}
                            </span>
                            <span className="text-xs text-gray-400">Denunciado por <b className="text-white">{report.reporter?.username || 'Alguém'}</b></span>
                          </div>
                          
                          <p className="text-sm text-white mb-4 border-l-2 border-orange-500 pl-3 py-1">
                            <span className="text-gray-500 font-bold uppercase text-[10px] block mb-1">Motivo:</span>
                            {report.reason}
                          </p>

                          <div className="bg-[#0f1112] p-4 rounded-lg border border-gray-800 relative">
                            <span className="absolute top-0 right-0 mt-3 mr-3 text-[10px] uppercase font-bold text-gray-600 bg-[#181a1b] px-2 py-1 rounded">Conteúdo Analisado</span>
                            <span className="text-gray-400 font-bold text-xs block mb-1">Autor do Conteúdo: <span className="text-red-400">{targetUser?.author_name || 'Desconhecido'}</span></span>
                            <p className="text-sm text-gray-300 italic mt-2">"{content || '[Esta publicação não tem texto, deve conter apenas Imagem/Vídeo]'}"</p>
                          </div>
                        </div>

                        <div className="flex flex-row md:flex-col gap-2 shrink-0 md:w-40 border-t md:border-t-0 md:border-l border-gray-800 pt-4 md:pt-0 md:pl-4">
                          <button onClick={() => handleBanUser(report.id, targetUser?.user_id, 1)} className="w-full bg-orange-500/10 hover:bg-orange-500 text-orange-500 hover:text-white border border-orange-500/20 text-[11px] font-bold px-3 py-2.5 rounded transition-colors flex justify-center items-center gap-2">
                            <Clock size={14} /> Banir 1 Dia
                          </button>
                          <button onClick={() => handleBanUser(report.id, targetUser?.user_id, 7)} className="w-full bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white border border-red-500/20 text-[11px] font-bold px-3 py-2.5 rounded transition-colors flex justify-center items-center gap-2">
                            <Clock size={14} /> Banir 7 Dias
                          </button>
                          <button onClick={() => handleBanUser(report.id, targetUser?.user_id, 9999)} className="w-full bg-gray-800 hover:bg-black text-gray-300 border border-gray-700 hover:border-red-500 text-[11px] font-bold px-3 py-2.5 rounded transition-colors flex justify-center items-center gap-2">
                            <Trash2 size={14} /> Permanente
                          </button>
                          <button onClick={() => handleDismissReport(report.id)} className="w-full text-gray-500 hover:text-white text-[11px] font-bold px-3 py-2 mt-auto transition-colors">
                            Ignorar
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}


          {/* JOGADORES - CONVITES DE EQUIPAS */}
          {!isAdmin && teamInvites.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <UserPlus size={14} className="text-blue-500" /> Convites de Equipas
              </h3>
              <div className="space-y-3">
                {teamInvites.map(invite => (
                  <div key={invite.id} className="bg-[#181a1b] border border-gray-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-white text-base">Foste convidado para: <span className="text-blue-400">{invite.teams?.name}</span></h4>
                      <p className="text-xs text-gray-500 mt-1">O capitão desta equipa convidou-te para te juntares ao plantel.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => acceptTeamInvite(invite)} className="flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-[11px] font-bold uppercase tracking-widest rounded-lg transition-colors shadow-lg shadow-green-500/20">
                        <CheckCircle2 size={16} /> Aceitar
                      </button>
                      <button onClick={() => rejectTeamInvite(invite.id)} className="flex items-center gap-1.5 px-3 py-2 bg-transparent hover:bg-red-500/10 border border-gray-600 hover:border-red-500/50 text-gray-400 hover:text-red-500 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-colors">
                        <XIcon size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CAPITÃES - PEDIDOS DE SCRIM */}
          {!isAdmin && scrimRequests.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Swords size={14} className="text-purple-500" /> Pedidos de Scrim
              </h3>
              <div className="space-y-3">
                {scrimRequests.map(req => (
                  <div key={req.id} className="bg-[#181a1b] border border-gray-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-white text-base">A equipa <span className="text-purple-400">{req.teams?.name}</span> quer jogar contra vocês!</h4>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="px-2 py-0.5 bg-[#0f1112] border border-gray-800 text-gray-300 text-[10px] font-bold rounded uppercase tracking-wider">{req.scrims?.format}</span>
                        <span className="px-2 py-0.5 bg-[#0f1112] border border-gray-800 text-gray-300 text-[10px] font-bold rounded uppercase tracking-wider">{req.scrims?.date}</span>
                        <span className="px-2 py-0.5 bg-[#0f1112] border border-gray-800 text-gray-300 text-[10px] font-bold rounded uppercase tracking-wider">{req.scrims?.time}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => acceptScrimRequest(req)} className="flex items-center gap-1.5 px-4 py-2 bg-green-500 hover:bg-green-600 text-white text-[11px] font-bold uppercase tracking-widest rounded-lg transition-colors shadow-lg shadow-green-500/20">
                        <CheckCircle2 size={16} /> Aceitar
                      </button>
                      <button onClick={() => rejectScrimRequest(req.id)} className="flex items-center gap-1.5 px-3 py-2 bg-transparent hover:bg-red-500/10 border border-gray-600 hover:border-red-500/50 text-gray-400 hover:text-red-500 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-colors">
                        <XIcon size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CAPITÃES - PEDIDOS PARA ENTRAR */}
          {!isAdmin && joinRequests.length > 0 && (
            <div>
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <UserPlus size={14} className="text-yellow-500" /> Pedidos de Entrada
              </h3>
              <div className="space-y-3">
                {joinRequests.map(req => (
                  <div key={req.id} className="bg-[#181a1b] border border-gray-800 rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <h4 className="font-bold text-white text-base">O jogador <span className="text-yellow-400">{req.profiles?.username || 'Desconhecido'}</span> quer juntar-se à equipa!</h4>
                      <p className="text-xs text-gray-500 mt-1">Vai ao perfil do jogador para ver se é o fit ideal antes de aceitar.</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button onClick={() => navigate(`/profile/${req.user_id}`)} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white text-[11px] font-bold uppercase tracking-widest rounded-lg transition-colors">
                        Ver Perfil
                      </button>
                      <button onClick={() => acceptJoinRequest(req)} className="flex items-center gap-1.5 px-3 py-2 bg-green-500/10 hover:bg-green-500 text-green-500 hover:text-white border border-green-500/30 hover:border-green-500 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-colors">
                        <CheckCircle2 size={16} />
                      </button>
                      <button onClick={() => rejectJoinRequest(req.id)} className="flex items-center gap-1.5 px-3 py-2 bg-transparent hover:bg-red-500/10 border border-gray-600 hover:border-red-500/50 text-gray-400 hover:text-red-500 text-[11px] font-bold uppercase tracking-widest rounded-lg transition-colors">
                        <XIcon size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}