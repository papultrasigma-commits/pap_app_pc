import React, { useEffect, useState, useRef } from "react";
import { supabase } from "../supabaseClient";
import { Send, Loader2, MessageSquare, Image as ImageIcon, X, FileVideo, MoreVertical, Users, Trash2, Flag } from "lucide-react";

// --- COMPONENTE DE VÍDEO SINCRONIZADO ---
const ChatVideo = ({ src }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    const syncVolume = (e) => {
      if (videoRef.current && e.detail.source !== videoRef.current) {
        videoRef.current.volume = e.detail.volume;
        videoRef.current.muted = e.detail.muted;
      }
    };
    window.addEventListener('sync-video-volume', syncVolume);
    return () => window.removeEventListener('sync-video-volume', syncVolume);
  }, []);

  return (
    <video 
      ref={videoRef}
      src={src} 
      controls 
      className="w-full max-h-[400px] object-contain bg-black"
      preload="metadata"
      onLoadedMetadata={(e) => {
        const savedVolume = localStorage.getItem('vlr_video_volume');
        const savedMuted = localStorage.getItem('vlr_video_muted');
        if (savedVolume !== null) e.target.volume = parseFloat(savedVolume);
        if (savedMuted !== null) e.target.muted = savedMuted === 'true';
      }}
      onVolumeChange={(e) => {
        localStorage.setItem('vlr_video_volume', e.target.volume);
        localStorage.setItem('vlr_video_muted', e.target.muted);
        
        window.dispatchEvent(new CustomEvent('sync-video-volume', {
          detail: { volume: e.target.volume, muted: e.target.muted, source: e.target }
        }));
      }}
    />
  );
};

export default function Chat({ myTeam, userName }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  
  const [showMenu, setShowMenu] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);

  // === ESTADOS DO REPORT ===
  const [currentUserId, setCurrentUserId] = useState(null);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [isReporting, setIsReporting] = useState(false);
  const [targetUser, setTargetUser] = useState({ id: null, name: "" });
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const menuRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!myTeam) return;

    // === LIMPEZA DE ESTADO AO MUDAR DE EQUIPA ===
    setMessages([]);
    setTeamMembers([]);
    setLoading(true);
    // ============================================

    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setCurrentUserId(data?.user?.id);
    };

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("team_chat_messages")
        .select("*")
        .eq("team_id", myTeam.id)
        .eq("is_deleted", false)
        .order("created_at", { ascending: true });

      if (!error && data) {
        setMessages(data);
        setTimeout(scrollToBottom, 100);
      }
      setLoading(false);
    };

    const fetchTeamMembers = async () => {
      setLoadingMembers(true);
      const { data, error } = await supabase
        .from("team_members")
        .select("role, profiles(username, riot_account)")
        .eq("team_id", myTeam.id);
      
      if (!error && data) {
        const sorted = data.sort((a, b) => {
          const rank = { owner: 1, vice: 2, member: 3 };
          return rank[a.role] - rank[b.role];
        });
        setTeamMembers(sorted);
      }
      setLoadingMembers(false);
    };

    fetchUser();
    fetchMessages();
    fetchTeamMembers();

    const channel = supabase
      .channel(`team_chat_${myTeam.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "team_chat_messages",
          filter: `team_id=eq.${myTeam.id}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            if (!payload.new.is_deleted) {
              setMessages((prev) => [...prev, payload.new]);
              setTimeout(scrollToBottom, 100);
            }
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.is_deleted) {
              setMessages((prev) => prev.filter((msg) => msg.id !== payload.new.id));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [myTeam]);

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (selectedFile.size > 50 * 1024 * 1024) {
      alert("O ficheiro é demasiado grande! O limite máximo é 50MB.");
      return;
    }

    setFile(selectedFile);
    setPreview(URL.createObjectURL(selectedFile));
  };

  const removeFile = () => {
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !file) return;

    setUploading(true);
    let mediaUrl = null;
    let mediaType = null;

    try {
      if (!currentUserId) throw new Error("Não autenticado");

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${currentUserId}-${Date.now()}.${fileExt}`;
        const filePath = `${myTeam.id}/${fileName}`; 

        const { error: uploadError } = await supabase.storage
          .from('chat_media')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('chat_media')
          .getPublicUrl(filePath);

        mediaUrl = publicUrlData.publicUrl;
        mediaType = file.type.startsWith('video/') ? 'video' : 'image';
      }

      const { error } = await supabase.from("team_chat_messages").insert({
        team_id: myTeam.id,
        user_id: currentUserId,
        sender_name: userName || "Jogador",
        message: newMessage.trim(),
        media_url: mediaUrl,
        media_type: mediaType,
        is_deleted: false 
      });

      if (error) throw error;

      setNewMessage("");
      removeFile(); 
    } catch (err) {
      console.error(err);
      alert("Erro ao enviar mensagem: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    const confirmDelete = window.confirm("Tens a certeza que queres apagar esta mensagem?");
    if (!confirmDelete) return;

    try {
      const { error } = await supabase
        .from("team_chat_messages")
        .update({ is_deleted: true }) 
        .eq("id", msgId);

      if (error) throw error;
      
      setMessages((prev) => prev.filter((msg) => msg.id !== msgId));

    } catch (err) {
      console.error(err);
      alert("Erro ao apagar mensagem.");
    }
  };

  // === FUNÇÃO PARA ENVIAR A DENÚNCIA ===
  const handleSubmitReport = async (e) => {
    e.preventDefault();
    if (!reportReason || !currentUserId || !targetUser.id) return;
    
    setIsReporting(true);
    try {
      const { error } = await supabase.from('reports').insert([{
        reporter_id: currentUserId,
        reported_id: targetUser.id,
        reason: reportReason,
        status: 'pending'
      }]);

      if (error) {
        console.error("ERRO DO SUPABASE:", error);
        throw error;
      }

      alert("Denúncia enviada com sucesso. A nossa equipa irá analisar.");
      setShowReportModal(false);
      setReportReason("");
    } catch (err) {
      console.error("ERRO COMPLETO:", err);
      alert("Ocorreu um erro ao enviar a denúncia. Verifica a consola (F12) para mais detalhes.");
    }
    setIsReporting(false);
  };

  if (!myTeam) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500">
        <MessageSquare size={48} className="mb-4 opacity-50" />
        <p>Precisas de estar numa equipa para usar o chat.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-100px)] bg-[#0b0f14] rounded-xl border border-gray-800 overflow-hidden shadow-2xl relative">
      
      {/* HEADER */}
      <div className="relative bg-[#111]/90 backdrop-blur-xl p-5 border-b border-gray-800 flex items-center justify-between z-20 overflow-visible">
        <div 
          className="absolute top-0 left-0 w-full h-[3px] opacity-80"
          style={{ background: `linear-gradient(90deg, ${myTeam.color_hex || "#ef4444"}, transparent)` }}
        />
        
        <div className="flex items-center gap-4">
          <div className="relative">
            <div 
              className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.5)] transform transition-transform hover:scale-105"
              style={{ backgroundColor: myTeam.color_hex || "#ef4444" }}
            >
              <MessageSquare className="text-white drop-shadow-md" size={24} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 border-2 border-[#111] rounded-full shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
          </div>
          
          <div>
            <h2 className="text-white font-black text-xl tracking-wide leading-tight">
              Chat da Equipa
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-sm font-semibold text-gray-400">{myTeam.name}</span>
              <span className="w-1 h-1 rounded-full bg-gray-600"></span>
              <span className="text-xs text-green-400 font-bold uppercase tracking-wider animate-pulse">Online</span>
            </div>
          </div>
        </div>

        {/* MENU DE OPÇÕES */}
        <div className="relative" ref={menuRef}>
          <button 
            onClick={() => setShowMenu(!showMenu)}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors border ${
              showMenu 
                ? "bg-gray-700 text-white border-gray-600" 
                : "bg-gray-800/40 text-gray-400 border-gray-700/50 hover:text-white hover:bg-gray-700"
            }`}
          >
            <MoreVertical size={20} />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-3 w-64 bg-[#181a1b] border border-gray-700 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-50 overflow-hidden animate-fade-in">
              <div className="p-3.5 border-b border-gray-800 bg-[#111] flex items-center gap-2">
                <Users size={16} className="text-gray-400" />
                <h3 className="text-xs font-bold text-gray-300 uppercase tracking-wider">Membros da Equipa</h3>
              </div>
              
              <div className="max-h-60 overflow-y-auto custom-scrollbar p-2 space-y-1">
                {loadingMembers ? (
                  <div className="flex justify-center p-4"><Loader2 className="animate-spin text-red-500" size={20} /></div>
                ) : teamMembers.length === 0 ? (
                  <p className="text-xs text-gray-500 text-center p-4">Sem membros.</p>
                ) : (
                  teamMembers.map((member, idx) => {
                    const riotName = member.profiles?.riot_account?.name;
                    const displayName = riotName || member.profiles?.username || "Jogador";
                    const initial = displayName.charAt(0).toUpperCase();

                    return (
                      <div key={idx} className="flex items-center gap-3 p-2.5 hover:bg-gray-800/60 rounded-lg transition-colors cursor-default">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-xs font-bold text-white border border-gray-600 shadow-sm">
                          {initial}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-200 font-medium truncate max-w-[150px]">
                            {displayName}
                          </span>
                          <span className={`text-[10px] uppercase font-bold tracking-wider ${
                            member.role === 'owner' ? 'text-yellow-500' : 
                            member.role === 'vice' ? 'text-blue-400' : 'text-gray-500'
                          }`}>
                            {member.role === 'owner' ? 'Capitão' : member.role === 'vice' ? 'Vice-Capitão' : 'Membro'}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MENSAGENS */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 custom-scrollbar bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-black/20">
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <Loader2 className="animate-spin text-red-500" size={32} />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-600">
            <p>Ainda não há mensagens. Começa a conversa!</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.sender_name === userName;

            return (
              <div key={msg.id || index} className={`flex flex-col ${isMe ? "items-end" : "items-start"} animate-fade-in`}>
                <span className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 ml-1 mr-1">
                  {isMe ? "Tu" : msg.sender_name}
                </span>
                
                <div 
                  className={`max-w-[85%] md:max-w-[70%] flex flex-col rounded-2xl shadow-md overflow-hidden ${
                    isMe 
                      ? "bg-red-600 text-white rounded-tr-sm" 
                      : "bg-[#1a1d1e] border border-gray-800 text-gray-200 rounded-tl-sm"
                  }`}
                >
                  
                  {msg.media_url && msg.media_type === 'image' && (
                    <a href={msg.media_url} target="_blank" rel="noreferrer" className="block w-full bg-[#05070b]">
                      <img 
                        src={msg.media_url} 
                        alt="Anexo" 
                        className="w-full h-auto max-h-[400px] object-contain hover:opacity-90 transition-opacity cursor-pointer" 
                      />
                    </a>
                  )}

                  {msg.media_url && msg.media_type === 'video' && (
                    <ChatVideo src={msg.media_url} />
                  )}

                  {msg.message && (
                    <div className={`px-4 py-3 ${msg.media_url ? 'pt-2.5' : ''}`}>
                      <p className="text-[15px] whitespace-pre-wrap break-words leading-relaxed">{msg.message}</p>
                    </div>
                  )}
                </div>
                
                {/* ZONA DE TIMESTAMP E BOTÕES */}
                <div className="flex items-center gap-2 mt-1 mr-1 ml-1">
                  <span className="text-[9px] text-gray-600">
                    {new Date(msg.created_at).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  
                  {isMe ? (
                    <button 
                      onClick={() => handleDeleteMessage(msg.id)}
                      className="text-gray-600 hover:text-red-500 transition-colors p-1 rounded-md"
                      title="Apagar mensagem"
                    >
                      <Trash2 size={12} />
                    </button>
                  ) : (
                    <button 
                      onClick={() => {
                        setTargetUser({ id: msg.user_id, name: msg.sender_name });
                        setShowReportModal(true);
                      }}
                      className="text-gray-600 hover:text-red-500 transition-colors p-1 rounded-md ml-1"
                      title="Denunciar Utilizador"
                    >
                      <Flag size={12} />
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ZONA DE INPUT DE MENSAGEM */}
      <div className="bg-[#111] border-t border-gray-800 p-4 z-10">
        {preview && (
          <div className="mb-3 relative inline-block animate-fade-in">
            <button onClick={removeFile} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-transform hover:scale-110 z-10"><X size={14} /></button>
            {file?.type.startsWith('video/') ? (
              <div className="w-24 h-24 bg-gray-900 rounded-xl flex items-center justify-center border-2 border-gray-700 shadow-md"><FileVideo className="text-gray-500" size={32} /></div>
            ) : (
              <img src={preview} alt="Preview" className="w-24 h-24 object-cover rounded-xl border-2 border-gray-700 shadow-md" />
            )}
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex gap-3 items-end">
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="p-3.5 bg-[#181a1b] hover:bg-gray-800 border border-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors h-[50px] shrink-0 flex items-center justify-center">
            <ImageIcon size={22} />
          </button>
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*,video/mp4,video/webm" className="hidden" />

          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escreve uma mensagem para a equipa..."
            className="flex-1 bg-[#181a1b] border border-gray-800 rounded-xl p-3.5 text-[15px] text-white focus:outline-none focus:border-red-500 transition-colors resize-none max-h-32 custom-scrollbar shadow-inner"
            rows="1"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); }
            }}
          />

          <button type="submit" disabled={uploading || (!newMessage.trim() && !file)} className="bg-red-600 hover:bg-red-700 disabled:bg-red-900/50 disabled:cursor-not-allowed text-white p-3.5 rounded-xl transition-transform hover:scale-[1.02] active:scale-[0.98] h-[50px] shrink-0 flex items-center justify-center shadow-[0_4px_15px_rgba(220,38,38,0.3)]">
            {uploading ? <Loader2 size={22} className="animate-spin" /> : <Send size={22} />}
          </button>
        </form>
      </div>

      {/* === MODAL DE DENÚNCIA === */}
      {showReportModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-[#181a1b] border border-gray-800 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-[#1f2122]/30">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Flag size={18} className="text-red-500" />
                Denunciar Utilizador
              </h2>
              <button onClick={() => setShowReportModal(false)} className="text-gray-500 hover:text-white transition-colors p-1.5 rounded-full hover:bg-gray-800">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSubmitReport} className="p-5">
              <p className="text-sm text-gray-400 mb-4">
                Por que motivo estás a denunciar o utilizador <strong className="text-white">{targetUser.name}</strong>?
              </p>
              
              <div className="space-y-3 mb-6">
                {[
                  { id: 'comportamento_toxico', label: 'Comportamento Tóxico / Assédio' },
                  { id: 'cheat_hack', label: 'Uso de Cheats ou Hacks' },
                  { id: 'spam_scam', label: 'Spam ou Tentativa de Scam' },
                  { id: 'perfil_falso', label: 'Perfil Falso (Fake)' },
                  { id: 'conteudo_inadequado', label: 'Nome ou Avatar Inadequado' }
                ].map(motivo => (
                  <label key={motivo.id} className="flex items-center gap-3 cursor-pointer group p-2 rounded-lg hover:bg-[#1f2122] transition-colors border border-transparent hover:border-gray-800">
                    <input 
                      type="radio" 
                      name="reportReason" 
                      value={motivo.id}
                      checked={reportReason === motivo.id}
                      onChange={(e) => setReportReason(e.target.value)}
                      className="w-4 h-4 accent-red-500 bg-gray-800 border-gray-600"
                      required
                    />
                    <span className="text-sm text-gray-300 group-hover:text-white">{motivo.label}</span>
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-800">
                <button 
                  type="button" 
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-sm font-bold text-gray-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={isReporting || !reportReason}
                  className="flex items-center justify-center gap-2 px-5 py-2 bg-red-500 hover:bg-red-600 disabled:bg-gray-800 disabled:text-gray-500 text-white rounded-lg text-sm font-bold transition-colors"
                >
                  {isReporting ? <Loader2 size={16} className="animate-spin" /> : "Enviar Denúncia"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}