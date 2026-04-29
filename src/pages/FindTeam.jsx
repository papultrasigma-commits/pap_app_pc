import React, { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import { X, Shield, Globe } from "lucide-react";

export default function FindTeam({ onJoined, onCancel }) {
  const [q, setQ] = useState("");
  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const loadTeams = async () => {
    setLoading(true);
    setErrorMsg("");

    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes?.user?.id;

    let query = supabase
      .from("teams")
      .select("id,name,color_id,color_hex,owner_id,created_at,logo_url")
      .order("created_at", { ascending: false })
      .limit(50);

    if (q.trim()) query = query.ilike("name", `%${q.trim()}%`);
    if (uid) query = query.neq("owner_id", uid);

    const { data, error } = await query;
    setLoading(false);

    if (error) {
      setErrorMsg(`Erro a carregar equipas: ${error.message}`);
      setTeams([]);
      return;
    }

    setTeams(data || []);
  };

  useEffect(() => {
    loadTeams();
  }, []);

  const joinTeam = async (teamId) => {
    setErrorMsg("");
    setJoiningId(teamId);

    const { data: userRes, error: authErr } = await supabase.auth.getUser();
    const uid = userRes?.user?.id;

    if (authErr || !uid) {
      setJoiningId(null);
      setErrorMsg("Tens de estar autenticado.");
      return;
    }

    // VERIFICA SE JÁ EXISTE UM PEDIDO
    const { data: existingReq } = await supabase
      .from("team_requests")
      .select("id")
      .eq("team_id", teamId)
      .eq("user_id", uid)
      .maybeSingle();

    if (existingReq) {
      setJoiningId(null);
      setErrorMsg("Já enviaste um pedido para esta equipa. Aguarda aprovação.");
      return;
    }

    // INSERE O PEDIDO EM VEZ DE ENTRAR DIRETAMENTE
    const { error } = await supabase
      .from("team_requests")
      .insert({ team_id: teamId, user_id: uid, status: "pending" });

    setJoiningId(null);

    if (error) {
      setErrorMsg(`Erro ao enviar pedido: ${error.message}`);
      return;
    }

    alert("Pedido enviado com sucesso! O líder da equipa foi notificado.");
    onJoined?.();
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto pb-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-3xl font-bold text-white">
            Procurar Equipa <span className="text-red-500">.</span>
          </h2>
          <p className="text-gray-400">Pede para entrar numa equipa existente.</p>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-white">
          <X size={24} />
        </button>
      </div>

      <div className="bg-[#181a1b] border border-gray-800 rounded-lg p-4 mb-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Pesquisar pelo nome..."
            className="w-full bg-[#0f1112] border border-gray-800 text-white rounded-lg py-3 px-4"
          />
        </div>
        <button onClick={loadTeams} className="bg-white text-black font-bold py-3 px-6 rounded uppercase text-xs tracking-wider">
          Pesquisar
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-sm p-3 rounded mb-4">
          {errorMsg}
        </div>
      )}

      {loading ? (
        <div className="text-gray-400">A carregar...</div>
      ) : teams.length === 0 ? (
        <div className="bg-[#181a1b] border border-gray-800 rounded-lg p-6 text-gray-400">Sem resultados.</div>
      ) : (
        <div className="space-y-3">
          {teams.map((t) => (
            <div key={t.id} className="bg-[#181a1b] border border-gray-800 rounded-lg p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg border border-gray-700 bg-[#0f1112] flex items-center justify-center overflow-hidden shrink-0">
                  {t.logo_url ? (
                    <img src={t.logo_url} alt={t.name} className="w-full h-full object-cover" />
                  ) : (
                    <Shield size={20} className="text-gray-400" />
                  )}
                </div>
                <div>
                  <div className="text-white font-bold text-lg">{t.name}</div>
                  <div className="text-xs text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2 mt-1">
                    <span className="inline-flex items-center gap-1">
                      <Globe size={12} /> {t.color_id}
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => joinTeam(t.id)}
                disabled={joiningId === t.id}
                className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold py-2 px-6 rounded uppercase text-xs tracking-wider"
              >
                {joiningId === t.id ? "A enviar..." : "Pedir para Entrar"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}