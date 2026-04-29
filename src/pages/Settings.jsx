import React, { useState, useEffect } from "react";
import { 
  CheckCircle, AlertCircle, Loader2, Link as LinkIcon, 
  Unlink, Swords, User, Shield, Save, Lock, Camera
} from "lucide-react";
import { supabase } from "../supabaseClient";

export default function Settings({ riotAccount, setRiotAccount, userName }) {
  // --- ESTADOS: RIOT GAMES ---
  const [isLinking, setIsLinking] = useState(false);
  const [riotName, setRiotName] = useState("");
  const [riotTag, setRiotTag] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // --- ESTADOS: FUNÇÕES & AVATAR ---
  const [mainRole, setMainRole] = useState("Não definida");
  const [secRole, setSecRole] = useState("Não definida");
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [isSavingRoles, setIsSavingRoles] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [roleMessage, setRoleMessage] = useState({ type: "", text: "" });
  const [avatarMessage, setAvatarMessage] = useState({ type: "", text: "" });

  // --- ESTADOS: MUDAR SENHA ---
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: "", text: "" });

  const HENRIK_API_KEY = "HDEV-08f8bd4c-1d92-45d3-9309-e02904f7f8ff"; 

  useEffect(() => {
    const fetchProfileData = async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (userRes?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('main_role, secondary_role, avatar_url')
          .eq('id', userRes.user.id)
          .maybeSingle();
        
        if (profile) {
          if (profile.main_role) setMainRole(profile.main_role);
          if (profile.secondary_role) setSecRole(profile.secondary_role);
          if (profile.avatar_url) setAvatarUrl(profile.avatar_url);
        }
      }
    };
    fetchProfileData();
  }, []);

  // ==========================================
  // LÓGICA: UPLOAD DE IMAGEM DE PERFIL
  // ==========================================
  const handleAvatarUpload = async (e) => {
    try {
      setIsUploadingAvatar(true);
      setAvatarMessage({ type: "", text: "" });

      const file = e.target.files[0];
      if (!file) return;

      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      if (!uid) throw new Error("Utilizador não autenticado.");

      // 1. Fazer upload da imagem para o bucket "avatars"
      const fileExt = file.name.split('.').pop();
      const fileName = `avatar-${Math.random()}.${fileExt}`;
      const filePath = `${uid}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // 2. Obter o URL público da imagem
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      // 3. Guardar o URL na tabela profiles
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', uid);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      setAvatarMessage({ type: "success", text: "Imagem de perfil atualizada!" });
      setTimeout(() => setAvatarMessage({ type: "", text: "" }), 4000);
      
      // Recarrega a página levemente para atualizar a imagem na barra lateral caso a tenhas configurado lá
      window.location.reload(); 
    } catch (error) {
      console.error("Erro a fazer upload:", error);
      setAvatarMessage({ type: "error", text: "Erro ao atualizar a imagem." });
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // ==========================================
  // LÓGICA: MUDAR SENHA
  // ==========================================
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMessage({ type: "", text: "" });

    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "A senha deve ter pelo menos 6 caracteres." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "As senhas não coincidem." });
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;

      setPasswordMessage({ type: "success", text: "Senha atualizada com sucesso!" });
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordMessage({ type: "", text: "" }), 4000);
    } catch (err) {
      setPasswordMessage({ type: "error", text: "Erro ao alterar a senha: " + err.message });
    } finally {
      setIsChangingPassword(false);
    }
  };

  // ==========================================
  // LÓGICA: GUARDAR FUNÇÕES
  // ==========================================
  const handleSaveRoles = async () => {
    setIsSavingRoles(true);
    setRoleMessage({ type: "", text: "" });
    
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes?.user) throw new Error("Utilizador não autenticado.");

      const { error } = await supabase
        .from('profiles')
        .update({ main_role: mainRole, secondary_role: secRole })
        .eq('id', userRes.user.id);

      if (error) throw error;
      
      setRoleMessage({ type: "success", text: "Funções atualizadas com sucesso!" });
      setTimeout(() => setRoleMessage({ type: "", text: "" }), 3000);
      
    } catch (err) {
      console.error("Erro ao guardar funções:", err);
      setRoleMessage({ type: "error", text: "Erro ao guardar. Verifica a tua ligação." });
    } finally {
      setIsSavingRoles(false);
    }
  };

  // ==========================================
  // LÓGICA: VINCULAR CONTA RIOT
  // ==========================================
  const handleLink = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      if (!uid) throw new Error("Utilizador não autenticado.");

      const response = await fetch(
        `https://api.henrikdev.xyz/valorant/v1/account/${encodeURIComponent(riotName)}/${encodeURIComponent(riotTag)}`, 
        { headers: { "Authorization": HENRIK_API_KEY } }
      );
      const data = await response.json();

      if (data.status !== 200 || !data.data) {
        throw new Error(data.message || "Conta não encontrada. Verifica o teu Riot ID e Tag.");
      }

      const puuid = data.data.puuid;
      
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('riot_puuid', puuid)
        .maybeSingle();

      if (existingUser && existingUser.id !== uid) {
        throw new Error("Esta conta Riot já se encontra vinculada a outro jogador na plataforma!");
      }

      const accountData = {
        name: data.data.name,
        tag: data.data.tag,
        puuid: puuid,
        region: data.data.region,
        account_level: data.data.account_level,
        card: {
          small: data.data.card.small,
          large: data.data.card.large,
          wide: data.data.card.wide
        }
      };

      const { error: dbError } = await supabase
        .from('profiles')
        .update({ 
          riot_account: accountData,
          riot_puuid: puuid
        })
        .eq('id', uid);

      if (dbError) {
        if (dbError.code === '23505') { 
           throw new Error("Esta conta Riot já se encontra vinculada a outro jogador na plataforma!");
        }
        throw dbError;
      }
      
      setRiotAccount(accountData);
      setIsLinking(false); 
      setSuccessMsg("Conta Valorant vinculada com sucesso e protegida!");
      setTimeout(() => setSuccessMsg(""), 4000);
      setRiotName("");
      setRiotTag("");
      
    } catch (err) {
      console.error("Erro na API:", err);
      setError(err.message || "Erro ao procurar conta. Verifica os teus dados ou a chave da API.");
    } finally {
      setLoading(false);
    }
  };

  const handleUnlink = async () => {
    if (!window.confirm("Tens a certeza que queres desvincular a tua conta Valorant?")) return;

    const { data: userRes } = await supabase.auth.getUser();
    if (userRes?.user) {
      await supabase
        .from('profiles')
        .update({ 
          riot_account: null,
          riot_puuid: null 
        })
        .eq('id', userRes.user.id);
    }

    setRiotAccount(null);
    setRiotName("");
    setRiotTag("");
    setSuccessMsg("Conta Valorant desvinculada com sucesso.");
    setTimeout(() => setSuccessMsg(""), 4000);
  };

  return (
    <div className="animate-fade-in max-w-4xl mx-auto pb-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight">Definições da Conta</h1>
        <p className="text-gray-400 mt-2">Gere as tuas preferências, segurança e dados pessoais.</p>
      </div>

      {successMsg && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-xl flex items-center gap-2 text-green-500 font-bold shadow-lg">
          <CheckCircle size={20} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* SECÇÃO: SEGURANÇA (MUDAR SENHA) */}
      <div className="bg-[#181a1b] border border-gray-800 rounded-lg overflow-hidden mb-8 shadow-sm">
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
          <Lock className="text-blue-500" size={24} />
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">Segurança</h2>
            <p className="text-sm text-gray-500 mt-1">Altera a tua palavra-passe de acesso à plataforma.</p>
          </div>
        </div>
        
        <div className="p-6 bg-[#0f1112]">
          {passwordMessage.text && (
            <div className={`mb-6 p-3 rounded flex items-center gap-2 text-sm font-bold ${passwordMessage.type === "success" ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"}`}>
              {passwordMessage.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
              {passwordMessage.text}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nova Senha</label>
              <input 
                type="password" 
                required 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres" 
                className="w-full bg-[#181a1b] border border-gray-800 rounded px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Confirmar Nova Senha</label>
              <input 
                type="password" 
                required 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repete a senha" 
                className="w-full bg-[#181a1b] border border-gray-800 rounded px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors"
              />
            </div>
            
            <div className="md:col-span-2 flex justify-end mt-2">
              <button 
                type="submit"
                disabled={isChangingPassword || !newPassword || !confirmPassword}
                className="bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white px-6 py-2.5 rounded font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2"
              >
                {isChangingPassword ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                Atualizar Senha
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* SECÇÃO: CONEXÕES RIOT GAMES */}
      <div className="bg-[#181a1b] border border-gray-800 rounded-lg overflow-hidden mb-8 shadow-sm">
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
          <LinkIcon className="text-red-500" size={24} />
          <div>
            <h2 className="text-xl font-bold text-white tracking-wide">Contas Vinculadas</h2>
            <p className="text-sm text-gray-500 mt-1">Vincula jogos para sincronizar estatísticas automaticamente.</p>
          </div>
        </div>

        <div className="p-6">
          <div className="bg-[#0f1112] border border-gray-800 rounded-lg p-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-red-500 rounded-lg flex items-center justify-center text-white shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                  <Swords size={28} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Riot Games / Valorant</h3>
                  {riotAccount ? (
                    <div className="flex items-center gap-2 mt-1 text-green-500 text-sm font-medium">
                      <CheckCircle size={16} />
                      <span>Vinculado como <strong className="text-white">{riotAccount.name}#{riotAccount.tag}</strong></span>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500 mt-1">Sincroniza o teu rank e player card no dashboard.</p>
                  )}
                </div>
              </div>

              <div>
                {!isLinking && !riotAccount && (
                  <button onClick={() => setIsLinking(true)} className="bg-red-500 hover:bg-red-600 text-white px-5 py-2.5 rounded font-bold uppercase tracking-wider text-xs transition-colors w-full md:w-auto">
                    Vincular Conta
                  </button>
                )}
                {!isLinking && riotAccount && (
                  <button onClick={handleUnlink} className="border border-gray-700 hover:border-red-500 hover:text-red-500 text-gray-300 px-5 py-2.5 rounded font-bold uppercase tracking-wider text-xs transition-colors w-full md:w-auto flex items-center justify-center gap-2">
                    <Unlink size={16} />
                    Desvincular
                  </button>
                )}
              </div>
            </div>

            {isLinking && (
              <div className="mt-6 pt-6 border-t border-gray-800 animate-fade-in">
                <h4 className="text-white font-bold mb-4">Insere os teus dados da Riot Games</h4>
                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded flex items-center gap-2 text-red-400 text-sm">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                )}
                <form onSubmit={handleLink} className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Riot ID</label>
                    <input type="text" required value={riotName} onChange={(e) => setRiotName(e.target.value)} placeholder="Ex: TenZ" className="w-full bg-[#181a1b] border border-gray-800 rounded px-4 py-2.5 text-white focus:outline-none focus:border-red-500 transition-colors" />
                  </div>
                  <div className="w-full sm:w-32">
                    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tagline</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-600 font-bold">#</span>
                      <input type="text" required value={riotTag} onChange={(e) => setRiotTag(e.target.value.replace('#', ''))} placeholder="0000" className="w-full bg-[#181a1b] border border-gray-800 rounded pl-8 pr-4 py-2.5 text-white focus:outline-none focus:border-red-500 transition-colors" />
                    </div>
                  </div>
                  <div className="flex items-end gap-2 mt-4 sm:mt-0">
                    <button type="button" onClick={() => { setIsLinking(false); setError(""); }} className="px-4 py-2.5 border border-gray-700 hover:bg-gray-800 text-gray-300 rounded font-bold text-xs uppercase tracking-wider transition-colors h-[42px]">Cancelar</button>
                    <button type="submit" disabled={loading || !riotName || !riotTag} className="bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white px-6 py-2.5 rounded font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2 h-[42px] min-w-[120px]">
                      {loading ? <Loader2 size={16} className="animate-spin" /> : "Procurar"}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SECÇÃO: DETALHES DE PERFIL, AVATAR E FUNÇÕES */}
      <div className="bg-[#181a1b] border border-gray-800 rounded-lg overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <User className="text-gray-400" size={24} />
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">Dados Pessoais e Funções</h2>
              <p className="text-sm text-gray-500 mt-1">O teu perfil de utilizador, imagem e funções no jogo.</p>
            </div>
          </div>
          <Shield className="text-gray-600" size={24} />
        </div>
        
        <div className="p-6 bg-[#0f1112]">

          {/* NOVO: FOTO DE PERFIL */}
          <div className="flex items-center gap-6 mb-8 bg-[#181a1b] border border-gray-800 rounded-lg p-5">
            <div className="relative">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#0f1112] border-2 border-gray-700 overflow-hidden flex items-center justify-center shadow-inner">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User size={40} className="text-gray-600" />
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-2 bg-blue-500 rounded-full cursor-pointer hover:bg-blue-600 transition-colors shadow-lg border-2 border-[#181a1b]" title="Alterar Foto">
                {isUploadingAvatar ? <Loader2 size={14} className="animate-spin text-white" /> : <Camera size={14} className="text-white" />}
                <input type="file" accept="image/png, image/jpeg, image/gif, image/webp" className="hidden" onChange={handleAvatarUpload} disabled={isUploadingAvatar} />
              </label>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Foto de Perfil</h3>
              <p className="text-xs md:text-sm text-gray-500 mb-2">Formatos suportados: JPG, PNG ou GIF.</p>
              {avatarMessage.text && (
                <div className={`text-xs font-bold flex items-center gap-1 ${avatarMessage.type === "success" ? "text-green-500" : "text-red-500"}`}>
                  {avatarMessage.type === "success" ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  {avatarMessage.text}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Nome de Utilizador</label>
                 <div className="w-full bg-[#181a1b] border border-gray-800 rounded px-4 py-3 text-gray-300 font-medium">
                    {userName || "A carregar nome..."}
                 </div>
              </div>
              <div>
                 <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Riot ID Associado</label>
                 <div className="w-full bg-[#181a1b] border border-gray-800 rounded px-4 py-3 text-white font-medium">
                    {riotAccount ? `${riotAccount.name} #${riotAccount.tag}` : "Nenhuma conta vinculada"}
                 </div>
              </div>
          </div>

          <div className="mt-8 border-t border-gray-800 pt-8">
              <h3 className="text-lg font-bold text-white mb-6 border-l-4 border-red-500 pl-3">As Minhas Funções</h3>
              
              {roleMessage.text && (
                <div className={`mb-6 p-3 rounded flex items-center gap-2 text-sm font-bold ${roleMessage.type === "success" ? "bg-green-500/10 text-green-500 border border-green-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"}`}>
                  {roleMessage.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                  {roleMessage.text}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Função Principal</label>
                  <select 
                    value={mainRole} 
                    onChange={(e) => setMainRole(e.target.value)}
                    className="w-full bg-[#181a1b] border border-gray-800 rounded px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors cursor-pointer"
                  >
                    <option value="Não definida">Selecionar...</option>
                    <option value="Controlador">Controlador</option>
                    <option value="Duelista">Duelista</option>
                    <option value="Iniciador">Iniciador</option>
                    <option value="Sentinela">Sentinela</option>
                    <option value="Flex">Flex (Todas)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Função Secundária</label>
                  <select 
                    value={secRole} 
                    onChange={(e) => setSecRole(e.target.value)}
                    className="w-full bg-[#181a1b] border border-gray-800 rounded px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors cursor-pointer"
                  >
                    <option value="Não definida">Nenhuma / Selecionar...</option>
                    <option value="Controlador">Controlador</option>
                    <option value="Duelista">Duelista</option>
                    <option value="Iniciador">Iniciador</option>
                    <option value="Sentinela">Sentinela</option>
                    <option value="Flex">Flex (Todas)</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button 
                  onClick={handleSaveRoles}
                  disabled={isSavingRoles}
                  className="bg-red-500 hover:bg-red-600 disabled:bg-red-500/50 text-white px-6 py-2.5 rounded font-bold uppercase tracking-wider text-xs transition-colors flex items-center justify-center gap-2"
                >
                  {isSavingRoles ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  Guardar Funções
                </button>
              </div>
          </div>
        </div>
      </div>
    </div>
  );
}