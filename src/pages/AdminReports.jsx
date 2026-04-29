import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { ShieldAlert, Trash2, CheckCircle, Loader2, Image as ImageIcon, Video, MessageSquare, FileText, User } from 'lucide-react';

export default function AdminReports() {
  const [feedReports, setFeedReports] = useState([]);
  const [userReports, setUserReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('feed');

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      // Buscar Denúncias do Feed (Posts e Comentários)
      const { data: feedData } = await supabase
        .from('feed_reports')
        .select(`
          *,
          reporter:profiles!reporter_id(username, riot_account),
          post:feed_posts!post_id(id, text_content, media_url, media_type, author_name),
          comment:feed_comments!comment_id(id, content, author_name)
        `)
        .order('created_at', { ascending: false });

      setFeedReports(feedData || []);

      // Buscar Denúncias de Utilizadores (Perfil/Chat)
      const { data: userData } = await supabase
        .from('reports')
        .select(`
          *,
          reporter:profiles!reporter_id(username, riot_account),
          reported:profiles!reported_id(username, riot_account)
        `)
        .order('created_at', { ascending: false });

      setUserReports(userData || []);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  // Apagar uma publicação ou comentário
  const handleDeleteContent = async (type, id) => {
    if (!window.confirm(`Tens a certeza que queres apagar este ${type}?`)) return;
    try {
      if (type === 'post') {
        await supabase.from('feed_posts').delete().eq('id', id);
      } else {
        await supabase.from('feed_comments').delete().eq('id', id);
      }
      fetchReports();
    } catch (err) { console.error(err); }
  };

  // Ignorar a denúncia (apenas apaga o report)
  const handleIgnoreReport = async (table, id) => {
    try {
      await supabase.from(table).delete().eq('id', id);
      fetchReports();
    } catch (err) { console.error(err); }
  };

  // Função para BANIR utilizador
  const handleBanUser = async (userId, userName) => {
    if (!window.confirm(`⚠️ AVISO: Tens a certeza que queres BANIR PERMANENTEMENTE o utilizador ${userName}?`)) return;
    
    try {
      // Atualiza o perfil do utilizador para is_banned = true
      const { error } = await supabase.from('profiles').update({ is_banned: true }).eq('id', userId);
      
      if (error) throw error;
      
      alert(`O utilizador ${userName} foi banido com sucesso!`);
      fetchReports(); // Atualiza a lista
    } catch (err) {
      console.error(err);
      alert("Erro ao tentar banir o utilizador.");
    }
  };

  const getReporterName = (reporter) => {
    if (!reporter) return "Desconhecido";
    return reporter.riot_account?.name || reporter.username || "Desconhecido";
  };

  return (
    <div className="max-w-5xl mx-auto animate-fade-in text-white pb-10">
      <div className="flex items-center gap-3 mb-6">
        <ShieldAlert className="w-8 h-8 text-red-500" />
        <h1 className="text-2xl font-bold tracking-tight">Painel de Moderação</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 border-b border-gray-800">
        <button 
          onClick={() => setActiveTab('feed')}
          className={`pb-3 px-2 font-bold transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'feed' ? 'text-white border-red-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
        >
          <FileText size={18} /> Publicações e Comentários
          {feedReports.length > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{feedReports.length}</span>}
        </button>
        <button 
          onClick={() => setActiveTab('users')}
          className={`pb-3 px-2 font-bold transition-colors border-b-2 flex items-center gap-2 ${activeTab === 'users' ? 'text-white border-red-500' : 'text-gray-500 border-transparent hover:text-gray-300'}`}
        >
          <User size={18} /> Denúncias de Utilizadores
          {userReports.length > 0 && <span className="bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full">{userReports.length}</span>}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-10 h-10 text-red-500 animate-spin" /></div>
      ) : activeTab === 'feed' ? (
        <div className="space-y-4">
          {feedReports.length === 0 ? (
            <p className="text-gray-500 text-center py-10 bg-[#181a1b] rounded-xl border border-gray-800">Sem denúncias de publicações pendentes.</p>
          ) : (
            feedReports.map(report => {
              const isPost = !!report.post_id;
              const content = isPost ? report.post?.text_content : report.comment?.content;
              const author = isPost ? report.post?.author_name : report.comment?.author_name;
              const mediaUrl = isPost ? report.post?.media_url : null;
              const mediaType = isPost ? report.post?.media_type : null;
              const isDeleted = isPost ? !report.post : !report.comment;

              return (
                <div key={report.id} className="bg-[#181a1b] border border-gray-800 rounded-xl p-5 shadow-lg flex flex-col md:flex-row gap-6">
                  {/* Detalhes da Denúncia */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-2 py-1 bg-red-500/10 text-red-500 text-[10px] font-bold uppercase rounded border border-red-500/20">
                        {isPost ? 'Publicação' : 'Comentário'}
                      </span>
                      <span className="text-xs text-gray-500">{new Date(report.created_at).toLocaleString('pt-PT')}</span>
                    </div>

                    <div className="space-y-2 text-sm mb-4">
                      <p><span className="text-gray-500">Denunciado por:</span> <strong className="text-blue-400">{getReporterName(report.reporter)}</strong></p>
                      <p><span className="text-gray-500">Motivo:</span> <strong className="text-white bg-gray-800 px-2 py-0.5 rounded text-xs ml-1">{report.reason}</strong></p>
                    </div>

                    {/* Mostrar o conteúdo original */}
                    <div className="bg-[#0f1112] border border-gray-700 rounded-lg p-4 relative">
                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        {isPost ? <FileText size={14}/> : <MessageSquare size={14}/>} Conteúdo Denunciado:
                      </h4>
                      
                      {isDeleted ? (
                        <p className="text-red-400 text-sm font-bold italic">O conteúdo já foi apagado pelo autor.</p>
                      ) : (
                        <>
                          <p className="text-xs text-gray-400 mb-1">Autor: <span className="text-white font-bold">{author}</span></p>
                          {content && <p className="text-sm text-gray-300 whitespace-pre-wrap">{content}</p>}
                          
                          {/* Mídia do Post */}
                          {mediaUrl && (
                            <div className="mt-3 rounded border border-gray-700 overflow-hidden max-w-sm">
                              {mediaType === 'video' ? (
                                <video src={mediaUrl} controls className="w-full max-h-40 object-contain bg-black" />
                              ) : (
                                <img src={mediaUrl} alt="Denunciado" className="w-full max-h-40 object-contain bg-black" />
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex flex-row md:flex-col gap-2 justify-center shrink-0 border-t md:border-t-0 md:border-l border-gray-800 pt-4 md:pt-0 md:pl-4">
                    {!isDeleted && (
                      <button 
                        onClick={() => handleDeleteContent(isPost ? 'post' : 'comment', isPost ? report.post_id : report.comment_id)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-bold transition-colors"
                      >
                        <Trash2 size={16} /> Apagar {isPost ? 'Publicação' : 'Comentário'}
                      </button>
                    )}
                    <button 
                      onClick={() => handleIgnoreReport('feed_reports', report.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-bold transition-colors"
                    >
                      <CheckCircle size={16} /> Ignorar e Fechar
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {userReports.length === 0 ? (
            <p className="text-gray-500 text-center py-10 bg-[#181a1b] rounded-xl border border-gray-800">Sem denúncias de utilizadores pendentes.</p>
          ) : (
            userReports.map(report => (
              <div key={report.id} className="bg-[#181a1b] border border-gray-800 rounded-xl p-5 shadow-lg flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-1 bg-yellow-500/10 text-yellow-500 text-[10px] font-bold uppercase rounded border border-yellow-500/20">Perfil/Chat</span>
                    <span className="text-xs text-gray-500">{new Date(report.created_at).toLocaleString('pt-PT')}</span>
                  </div>
                  <p className="text-sm mb-1"><span className="text-gray-500">Denunciado:</span> <strong className="text-red-400">{getReporterName(report.reported)}</strong></p>
                  <p className="text-sm mb-1"><span className="text-gray-500">Reportado por:</span> <strong className="text-blue-400">{getReporterName(report.reporter)}</strong></p>
                  <p className="text-sm mt-2"><span className="text-gray-500">Motivo:</span> <strong className="text-white bg-gray-800 px-2 py-0.5 rounded text-xs">{report.reason}</strong></p>
                </div>
                <div className="flex flex-col gap-2">
                  <button 
                    onClick={() => handleIgnoreReport('reports', report.id)}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg text-sm font-bold transition-colors"
                  >
                    <CheckCircle size={16} /> Resolver
                  </button>
                  
                  {/* BOTÃO DE BANIR */}
                  <button 
                    onClick={() => handleBanUser(report.reported_id, getReporterName(report.reported))}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition-colors"
                  >
                    <ShieldAlert size={16} /> Banir Utilizador
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}