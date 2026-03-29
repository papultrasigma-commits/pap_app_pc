import React, { useState, useEffect, useRef } from "react";
import { supabase } from "../supabaseClient";
import { X, Shield, CheckCircle, Image as ImageIcon, Loader2 } from "lucide-react";
import * as tf from '@tensorflow/tfjs';
import * as nsfwjs from 'nsfwjs';

const TEAM_COLORS = [
  { id: "red", bg: "bg-red-500", hex: "#ef4444", label: "Valorant Red" },
  { id: "blue", bg: "bg-blue-500", hex: "#3b82f6", label: "Cyan Blue" },
  { id: "purple", bg: "bg-purple-500", hex: "#a855f7", label: "Reyna Purple" },
  { id: "green", bg: "bg-green-500", hex: "#22c55e", label: "Viper Green" },
  { id: "yellow", bg: "bg-yellow-500", hex: "#eab308", label: "Killjoy Yellow" },
];

export default function CreateTeam({ onCancel, onCreated, existingTeam, goFindTeam }) {
  const [teamName, setTeamName] = useState(existingTeam?.name || "");
  const [selectedColor, setSelectedColor] = useState(
    TEAM_COLORS.find((c) => c.id === existingTeam?.color_id) || TEAM_COLORS[0]
  );
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // === ESTADOS PARA O LOGOTIPO E IA ===
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(existingTeam?.logo_url || null);
  const [aiModel, setAiModel] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    // Carregar modelo da Google (NSFW.js) para as equipas
    const loadAiModel = async () => {
      try {
        const model = await nsfwjs.load();
        setAiModel(model);
      } catch (err) {
        console.error("Erro ao carregar modelo de IA:", err);
      }
    };
    loadAiModel();
  }, []);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  // === Função da IA: SUPER RIGOROSA ===
  const isContentInappropriate = async (predictions) => {
    console.log("Valores analisados pela IA: ", predictions);
    
    const inappropriate = predictions.find(p => {
      // Tolerância Quase Zero (2%) para Pornografia real ou Hentai (Cartoons explícitos)
      if (p.className === 'Porn' || p.className === 'Hentai') return p.probability > 0.02;
      
      // Tolerância Muito Baixa (45%) para a categoria "Sexy" (Decotes acentuados, lingerie, etc)
      if (p.className === 'Sexy') return p.probability > 0.45;
      
      return false;
    });
    
    return inappropriate !== undefined;
  };

  const analyzeImage = (fileUrl) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = fileUrl;
      img.crossOrigin = "anonymous";
      img.onload = async () => {
        const predictions = await aiModel.classify(img);
        resolve(await isContentInappropriate(predictions));
      };
      img.onerror = () => resolve(false);
    });
  };

  const createOrSaveTeam = async () => {
    setErrorMsg("");
    const name = teamName.trim();
    if (!name) return setErrorMsg("Escolhe um nome para a equipa.");

    setSaving(true);
    setIsAnalyzing(true);

    const { data: userRes, error: authErr } = await supabase.auth.getUser();
    const uid = userRes?.user?.id;

    if (authErr || !uid) {
      setSaving(false);
      setIsAnalyzing(false);
      return setErrorMsg("Tens de estar autenticado.");
    }

    let finalLogoUrl = existingTeam?.logo_url || null;

    // AVALIAÇÃO DO LOGOTIPO PELA IA
    if (logoFile && aiModel) {
      const isInappropriate = await analyzeImage(logoPreview);
      
      if (isInappropriate) {
        alert("O emblema foi bloqueado pela IA! O nosso filtro é rigoroso contra imagens muito sugestivas, decotes acentuados ou conteúdo explícito.");
        setSaving(false);
        setIsAnalyzing(false);
        setLogoFile(null);
        setLogoPreview(existingTeam?.logo_url || null); // Reverte para o original
        return; // Para o processo de criação
      }

      // Se passou na IA, faz o upload
      try {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${uid}_${Math.random()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage.from('team_logos').upload(fileName, logoFile);
        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage.from('team_logos').getPublicUrl(fileName);
        finalLogoUrl = publicUrlData.publicUrl;
      } catch (err) {
        console.error("Erro ao fazer upload da imagem:", err);
        setErrorMsg("Erro ao enviar o logótipo.");
        setSaving(false);
        setIsAnalyzing(false);
        return;
      }
    }
    setIsAnalyzing(false);

    const payload = { 
      name, 
      color_id: selectedColor.id, 
      color_hex: selectedColor.hex,
      logo_url: finalLogoUrl // Guardar o URL do emblema
    };

    if (existingTeam) {
      // UPDATE: Permite que o Vice-Capitão ou Líder edite sem dar erro de owner_id
      const { error: updateErr } = await supabase.from("teams").update(payload).eq("id", existingTeam.id);
      
      if (updateErr) {
        setSaving(false);
        return setErrorMsg(`Erro a editar equipa: ${updateErr.message}`);
      }

      // Devolver a equipa recém-atualizada à interface principal
      const { data: updatedTeam } = await supabase.from("teams").select("*").eq("id", existingTeam.id).single();
      setSaving(false);
      onCreated?.(updatedTeam);

    } else {
      // INSERT: Se estiver a criar uma equipa nova do zero
      payload.owner_id = uid;
      
      const { data: insertedTeam, error: insertErr } = await supabase.from("teams").insert([payload]).select().single();
      
      if (insertErr || !insertedTeam) {
        setSaving(false);
        return setErrorMsg(`Erro a criar equipa: ${insertErr?.message}`);
      }

      // Definir criador como Líder
      const { error: memErr } = await supabase
        .from("team_members")
        .insert({ team_id: insertedTeam.id, user_id: uid, role: "owner" });

      setSaving(false);
      if (memErr) return setErrorMsg(`Erro a associar membro: ${memErr.message}`);

      onCreated?.(insertedTeam);
    }
  };

  return (
    <div className="animate-fade-in max-w-6xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">{existingTeam ? "Editar Equipa" : "Criar Equipa"}</h2>
          {!existingTeam && (
            <p className="text-gray-400 text-sm">
              Ou então{" "}
              <button onClick={goFindTeam} className="text-white underline hover:text-red-400">
                procura uma equipa
              </button>
              .
            </p>
          )}
        </div>
        <button onClick={onCancel} className="text-gray-500 hover:text-white">
          <X size={24} />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
        <div className="lg:col-span-7 space-y-8">
          <div className="space-y-6">
            
            {/* === UPLOAD DE LOGÓTIPO === */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Emblema da Equipa (Opcional)</label>
              <div className="flex items-center gap-4">
                <input 
                  type="file" 
                  accept="image/jpeg,image/png,image/gif,image/webp" 
                  ref={fileInputRef} 
                  className="hidden" 
                  onChange={handleFileSelect} 
                />
                <button 
                  onClick={() => fileInputRef.current.click()} 
                  className="bg-[#181a1b] hover:bg-gray-800 border border-gray-800 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors text-sm"
                  type="button"
                >
                  <ImageIcon size={18} className="text-red-400" /> Escolher Imagem
                </button>
                {logoPreview && (
                  <button onClick={() => {setLogoPreview(null); setLogoFile(null)}} className="text-gray-500 hover:text-red-500 text-xs uppercase font-bold tracking-widest" type="button">
                    Remover
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase">Nome da Equipa</label>
              <input
                type="text"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="w-full bg-[#181a1b] border border-gray-800 text-white rounded-lg py-3 px-4 outline-none focus:border-red-500"
                placeholder="Ex: Sentinels"
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-500 uppercase">Cor Principal</label>
              <div className="flex gap-3">
                {TEAM_COLORS.map((color) => (
                  <button
                    key={color.id}
                    onClick={() => setSelectedColor(color)}
                    className={`w-10 h-10 rounded-lg ${color.bg} flex items-center justify-center hover:scale-110 transition-transform`}
                    type="button"
                  >
                    {selectedColor.id === color.id && <CheckCircle size={16} className="text-white" />}
                  </button>
                ))}
              </div>
            </div>

            {errorMsg && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-300 text-sm p-3 rounded">
                {errorMsg}
              </div>
            )}

            <div className="pt-6 flex gap-4">
              <button onClick={createOrSaveTeam} disabled={saving || isAnalyzing} className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-3 rounded disabled:opacity-50 flex items-center justify-center gap-2 uppercase tracking-wider text-sm transition-colors shadow-lg shadow-red-500/20">
                {(saving || isAnalyzing) && <Loader2 size={16} className="animate-spin" />}
                {isAnalyzing ? "A Analisar IA..." : saving ? "A Guardar..." : existingTeam ? "Guardar Equipa" : "Criar Equipa"}
              </button>
            </div>
          </div>
        </div>

        {/* === PREVIEW DA EQUIPA === */}
        <div className="lg:col-span-5">
          <div className="bg-[#181a1b] rounded-xl overflow-hidden border border-gray-800 shadow-2xl">
            <div className={`h-32 ${selectedColor.bg} transition-colors duration-300`} />
            <div className="p-6 relative">
              <div className="w-24 h-24 bg-[#0f1112] border-4 border-[#181a1b] rounded-xl absolute -top-12 flex items-center justify-center overflow-hidden shadow-lg">
                {logoPreview ? (
                  <img src={logoPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Shield size={32} className="text-gray-700" />
                )}
              </div>
              <div className="mt-14">
                <h2 className="text-2xl font-bold text-white break-words leading-tight">{teamName || "Nome da Equipa"}</h2>
                <p className="text-xs text-gray-500 mt-1 uppercase font-bold tracking-widest">{selectedColor.label}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}