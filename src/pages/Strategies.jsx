import React, { useEffect, useMemo, useRef, useState } from "react";

/**
 * Estrategias (React/Vite) - Estilo Valoplant Pro com Valorant-API
 * - 100% Automático: Vai buscar os agentes e habilidades à API oficial.
 * - Suporta novos agentes automaticamente sem atualizar o código.
 * - Leve e rápido, sem necessidade de ficheiros locais!
 */

const MAPS = [
  { id: "abyss", label: "Abyss" },
  { id: "ascent", label: "Ascent" },
  { id: "bind", label: "Bind" },
  { id: "breeze", label: "Breeze" },
  { id: "fracture", label: "Fracture" },
  { id: "haven", label: "Haven" },
  { id: "icebox", label: "Icebox" },
  { id: "lotus", label: "Lotus" },
  { id: "pearl", label: "Pearl" },
  { id: "split", label: "Split" },
  { id: "sunset", label: "Sunset" },
];

const MAP_IMAGES = {
  abyss: "https://media.valorant-api.com/maps/224b0a95-48b9-f703-1bd8-67aca101a61f/displayicon.png",
  ascent: "https://media.valorant-api.com/maps/7eaecc1b-4337-bbf6-6ab9-04b8f06b3319/displayicon.png",
  bind: "https://media.valorant-api.com/maps/2c9d57ec-4431-9c5e-2939-8f9ef6dd5cba/displayicon.png",
  breeze: "https://media.valorant-api.com/maps/2fb9a4fd-47b8-4e7d-a969-74b4046ebd53/displayicon.png",
  fracture: "https://media.valorant-api.com/maps/bbee0284-4f82-97ca-5811-1bb6f686b494/displayicon.png",
  haven: "https://media.valorant-api.com/maps/2bee0dc9-4ffe-519b-1cbd-7fbe763a6047/displayicon.png",
  icebox: "https://media.valorant-api.com/maps/e2ad5c54-4114-a870-9641-8ea21279579a/displayicon.png",
  lotus: "https://media.valorant-api.com/maps/2fe4ed3a-450a-948b-6d6b-e89a78e680a9/displayicon.png",
  pearl: "https://media.valorant-api.com/maps/fd267378-4d1d-484f-ff52-77821ed10dc2/displayicon.png",
  split: "https://media.valorant-api.com/maps/d960549e-485c-e861-8d71-aa9d1aed12a2/displayicon.png",
  sunset: "https://media.valorant-api.com/maps/92584fbe-486a-b1b2-9faa-39b0f486b498/displayicon.png"
};

function mapSrc(mapId) { return MAP_IMAGES[mapId] || MAP_IMAGES.ascent; }

// === LÓGICA DE FORMAS GIGANTES ===
const getSpecialShape = (agent, ability) => {
  if (ability === "AGENT") return null;

  const key = `${agent}_${ability}`;
  const getAgentColor = (a) => {
    const colors = {
      Astra: "rgba(150, 50, 200, 0.7)",
      Viper: "rgba(0, 255, 100, 0.7)",
      Harbor: "rgba(0, 150, 255, 0.7)",
      Brimstone: "rgba(255, 100, 0, 0.7)",
      Clove: "rgba(255, 100, 200, 0.7)",
      Omen: "rgba(100, 0, 255, 0.7)",
      Neon: "rgba(0, 50, 255, 0.7)",
      Phoenix: "rgba(255, 150, 0, 0.7)",
      Killjoy: "rgba(255, 255, 0, 0.2)",
      Fade: "rgba(100, 100, 100, 0.5)",
      Sova: "rgba(0, 200, 255, 0.3)"
    };
    return colors[a] || "rgba(255, 255, 255, 0.3)";
  };

  const color = getAgentColor(agent);

  // A API por vezes retorna em ordens diferentes, mas tentamos manter a correspondência visual
  switch (key) {
    case "Astra_X": case "Viper_E": case "Harbor_E": case "Neon_C": case "Phoenix_C":
      return { type: "wall", color, width: 1400, height: 8, border: `2px solid ${color.replace("0.7", "1")}` };

    case "Astra_C": case "Brimstone_E": case "Clove_E": case "Harbor_Q": 
    case "Omen_E": case "Viper_Q": case "Jett_C": case "Cypher_Q":
      return { type: "smoke", color, size: 90, border: `2px solid ${color.replace("0.7", "1")}` };

    case "Killjoy_X":
      return { type: "ult", color, size: 350, border: "2px dashed #ffff00" };
    case "Viper_X":
      return { type: "ult", color: "rgba(0, 255, 100, 0.4)", size: 300, border: "2px solid #00ff88" };
    case "Brimstone_X":
      return { type: "ult", color: "rgba(255, 100, 0, 0.5)", size: 150 };
    case "Fade_E": case "Sova_E":
      return { type: "recon", color, size: 220, border: `1px solid ${color.replace("0.3", "0.8")}` };

    default:
      return null;
  }
};

export default function StrategiesPage() {
  const [activeStep, setActiveStep] = useState(1);
  const [teamSide, setTeamSide] = useState("ally"); 
  const [drawingMode, setDrawingMode] = useState(false);
  const [mapId, setMapId] = useState("ascent");

  // === ESTADO DA VALORANT API ===
  const [apiAgents, setApiAgents] = useState({});
  const [loadingApi, setLoadingApi] = useState(true);

  const [markers, setMarkers] = useState([]); 
  const [floatingMenu, setFloatingMenu] = useState({ show: false, markerId: null, agent: null, x: 0, y: 0 });

  const mapWrapRef = useRef(null);
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  // === FETCH À VALORANT API ===
  useEffect(() => {
    fetch("https://valorant-api.com/v1/agents?isPlayableCharacter=true")
      .then((res) => res.json())
      .then((data) => {
        const fetchedAgents = {};
        
        data.data.forEach((agent) => {
          // Remove a barra do KAY/O para não dar erros de chaves
          const name = agent.displayName.replace("/", "");
          
          // Mapeia os poderes pela ordem visual da UI do jogo (C, Q, E, X)
          const abs = {};
          const hudKeys = ["C", "Q", "E", "X"];
          let keyIdx = 0;
          
          agent.abilities.forEach((ab) => {
            // Ignorar passivas ou habilidades sem ícone
            if (ab.slot === "Passive" || !ab.displayIcon) return;
            if (keyIdx < 4) {
              abs[hudKeys[keyIdx]] = ab.displayIcon;
              keyIdx++;
            }
          });

          fetchedAgents[name] = {
            icon: agent.displayIcon,
            abilities: abs
          };
        });

        setApiAgents(fetchedAgents);
        setLoadingApi(false);
      })
      .catch((err) => {
        console.error("Erro a carregar API do Valorant", err);
        setLoadingApi(false);
      });
  }, []);

  // Lista dinâmica de agentes ordenados alfabeticamente
  const AGENTS = Object.keys(apiAgents).sort();

  useEffect(() => {
    const resize = () => {
      const wrap = mapWrapRef.current;
      const canvas = canvasRef.current;
      if (!wrap || !canvas) return;
      const r = wrap.getBoundingClientRect();
      canvas.width = Math.floor(r.width);
      canvas.height = Math.floor(r.height);
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [mapId]);

  // --- DESENHO NO CANVAS ---
  const onMouseDownCanvas = (e) => {
    if (!drawingMode || !canvasRef.current) return;
    isDrawing.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    last.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onMouseMoveCanvas = (e) => {
    if (!drawingMode || !isDrawing.current || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctx.strokeStyle = "#00ff88"; 
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(last.current.x, last.current.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    last.current = { x, y };
  };

  const onMouseUpCanvas = () => { isDrawing.current = false; };

  // --- DRAG & DROP PARA O MAPA ---
  const onDragOver = (e) => {
    if (drawingMode) return;
    e.preventDefault(); 
  };

  const onDrop = (e) => {
    if (drawingMode) return;
    e.preventDefault();
    const dataStr = e.dataTransfer.getData("application/json");
    if (!dataStr || !mapWrapRef.current) return;

    try {
      const data = JSON.parse(dataStr);
      if (data.type === "NEW_AGENT" || data.type === "NEW_ABILITY") {
        const rect = mapWrapRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        setMarkers((prev) => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            agent: data.agent,
            ability: data.ability || "AGENT",
            team: teamSide,
            step: activeStep,
            x,
            y,
            angle: 0
          },
        ]);
        setFloatingMenu({ show: false });
      }
    } catch (err) {
      console.error("Erro no drop:", err);
    }
  };

  // --- AÇÕES DO MAPA ---
  const onMapClick = () => {
    if (floatingMenu.show) setFloatingMenu({ show: false, markerId: null, agent: null, x: 0, y: 0 });
  };

  const clearAll = () => {
    setMarkers([]);
    const c = canvasRef.current;
    if (c) c.getContext("2d").clearRect(0, 0, c.width, c.height);
  };

  const clearStep = () => { setMarkers((m) => m.filter((mk) => mk.step !== activeStep)); };
  const filteredMarkers = useMemo(() => markers.filter((m) => m.step === activeStep), [markers, activeStep]);

  // --- INTERAÇÕES COM MARCADORES ---
  const startDragMarker = (id, e) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    const wrap = mapWrapRef.current;
    if (!wrap) return;

    const rect = wrap.getBoundingClientRect();
    const marker = markers.find((m) => m.id === id);
    if (!marker) return;

    const start = { mx: e.clientX, my: e.clientY, x: marker.x, y: marker.y, w: rect.width, h: rect.height };

    const onMove = (ev) => {
      const dx = ((ev.clientX - start.mx) / start.w) * 100;
      const dy = ((ev.clientY - start.my) / start.h) * 100;
      setMarkers((prev) => prev.map((m) => (m.id === id ? { ...m, x: Math.max(0, Math.min(100, m.x + dx)), y: Math.max(0, Math.min(100, m.y + dy)) } : m)));
      start.mx = ev.clientX;
      start.my = ev.clientY;
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const openMarkerMenu = (m, e) => {
    e.stopPropagation();
    if (drawingMode) return;
    const wrap = mapWrapRef.current;
    if (!wrap) return;
    
    const rect = wrap.getBoundingClientRect();
    const pixelX = (m.x / 100) * rect.width + rect.left;
    const pixelY = (m.y / 100) * rect.height + rect.top;

    setFloatingMenu({
      show: true,
      markerId: m.id,
      agent: m.agent,
      x: pixelX + 28, 
      y: pixelY,
    });
  };

  const handleFooterAgentClick = (name, e) => {
    e.stopPropagation();
    const r = e.currentTarget.getBoundingClientRect();
    setFloatingMenu({
      show: true,
      agent: name,
      markerId: null,
      x: r.left + r.width / 2,
      y: r.top - 12
    });
  };

  const addAbilityFromMapMenu = (ability) => {
    if (!floatingMenu.markerId) return;

    const parentMarker = markers.find(m => m.id === floatingMenu.markerId);
    if (!parentMarker) return;

    setMarkers((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        agent: parentMarker.agent,
        ability: ability,
        team: parentMarker.team,
        step: parentMarker.step,
        x: parentMarker.x + 3, 
        y: parentMarker.y + 3,
        angle: 0
      }
    ]);

    setFloatingMenu({ ...floatingMenu, show: false });
  };

  const removeMarker = (id, e) => {
    e.stopPropagation();
    if (confirm("Remover do mapa?")) {
      setMarkers((prev) => prev.filter((m) => m.id !== id));
      setFloatingMenu({ show: false });
    }
  };

  const handleMarkerWheel = (id, e) => {
    e.stopPropagation();
    e.preventDefault(); 
    const delta = e.deltaY > 0 ? 15 : -15; 
    setMarkers((prev) => prev.map((m) => (m.id === id ? { ...m, angle: (m.angle || 0) + delta } : m)));
  };

  return (
    <div style={styles.shell} onClick={() => setFloatingMenu({ ...floatingMenu, show: false })}>
      
      {/* MENU FLUTUANTE DINÂMICO */}
      {floatingMenu.show && floatingMenu.agent && apiAgents[floatingMenu.agent] && (
        <div
          style={{
            ...styles.floatingMenu,
            left: floatingMenu.x,
            top: floatingMenu.y,
            transform: floatingMenu.markerId ? "translate(10px, -50%)" : "translate(-50%, -100%)",
            flexDirection: floatingMenu.markerId ? "column" : "row",
          }}
          onClick={(e) => e.stopPropagation()} 
        >
          {/* Ícone do Agente */}
          <img
            src={apiAgents[floatingMenu.agent].icon}
            alt={floatingMenu.agent}
            style={styles.floatingMenuImg}
            draggable={!floatingMenu.markerId}
            onDragStart={(e) => {
              if (!floatingMenu.markerId) {
                e.dataTransfer.setData("application/json", JSON.stringify({ type: "NEW_AGENT", agent: floatingMenu.agent }));
              }
            }}
            onClick={() => floatingMenu.markerId && setFloatingMenu({ ...floatingMenu, show: false })}
          />
          
          <div style={{ 
            width: floatingMenu.markerId ? "100%" : 1, 
            height: floatingMenu.markerId ? 1 : "100%", 
            background: "rgba(255,255,255,0.2)", 
            margin: floatingMenu.markerId ? "4px 0" : "0 4px" 
          }} />

          {/* Habilidades Dinâmicas da API */}
          {Object.entries(apiAgents[floatingMenu.agent].abilities).map(([abKey, iconUrl]) => (
            <img
              key={abKey}
              src={iconUrl}
              alt={`${floatingMenu.agent} ${abKey}`}
              style={styles.floatingMenuImg}
              draggable={!floatingMenu.markerId} 
              onDragStart={(e) => {
                if (!floatingMenu.markerId) {
                  e.dataTransfer.setData("application/json", JSON.stringify({ type: "NEW_ABILITY", agent: floatingMenu.agent, ability: abKey }));
                }
              }}
              onClick={() => floatingMenu.markerId && addAbilityFromMapMenu(abKey)} 
            />
          ))}
        </div>
      )}

      {/* LEFT PANEL */}
      <aside style={styles.leftPanel} onClick={(e) => e.stopPropagation()}>
        <div style={styles.leftHeader}>
          <div style={styles.leftTitle}>ESTRATÉGIAS</div>
          <div style={styles.leftSub}>Modo Drag & Drop c/ Valorant API</div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.h3}>Sequência</h3>
          <div style={styles.buttonsRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} style={{ ...styles.smallBtn, ...(activeStep === n ? styles.smallBtnActive : null) }} onClick={() => setActiveStep(n)} type="button">{n}</button>
            ))}
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.h3}>Equipa Cor</h3>
          <div style={styles.buttonsRow}>
            <button type="button" style={{ ...styles.midBtn, ...(teamSide === "ally" ? styles.midBtnActive : null) }} onClick={() => setTeamSide("ally")}>👥 Aliados</button>
            <button type="button" style={{ ...styles.midBtn, ...(teamSide === "enemy" ? styles.midBtnActive : null) }} onClick={() => setTeamSide("enemy")}>⚔️ Inimigos</button>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.h3}>Ferramentas</h3>
          <div style={styles.buttonsRowWrap}>
            <button type="button" style={{ ...styles.midBtn, ...(drawingMode ? styles.midBtnActive : null) }} onClick={() => setDrawingMode(true)}>✏️ Desenhar</button>
            <button type="button" style={{ ...styles.midBtn, ...(!drawingMode ? styles.midBtnActive : null) }} onClick={() => setDrawingMode(false)}>🖱️ Cursor</button>
          </div>
        </div>

        <div style={styles.section}>
          <h3 style={styles.h3}>💡 Dicas Pro</h3>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#9aa4b2", lineHeight: 1.6 }}>
            <li><b>Arrasta</b> da barra inferior para o mapa.</li>
            <li><b>Clica na barra inferior</b> para abrir as habilidades.</li>
            <li><b>Clica num agente no mapa</b> e escolhe o poder para o adicionar ao lado.</li>
            <li><b>Scroll</b> em cima de paredes para as rodar.</li>
          </ul>
        </div>

        <div style={styles.section}>
          <h3 style={styles.h3}>Ações</h3>
          <div style={styles.buttonsRowWrap}>
            <button type="button" style={styles.actionBtnDanger} onClick={() => (confirm("Limpar tudo?") ? clearAll() : null)}>🗑️ Limpar</button>
            <button type="button" style={styles.actionBtn} onClick={clearStep}>🧹 Limpar Step {activeStep}</button>
          </div>
        </div>
      </aside>

      {/* CENTER */}
      <section style={styles.center} onClick={(e) => e.stopPropagation()}>
        <select value={mapId} onChange={(e) => { setMapId(e.target.value); clearAll(); }} style={styles.mapSelector}>
          {MAPS.map((m) => (<option key={m.id} value={m.id}>{m.label}</option>))}
        </select>

        {/* MAPA CONTAINER */}
        <div ref={mapWrapRef} style={styles.mapContainer} onClick={onMapClick} onDragOver={onDragOver} onDrop={onDrop}>
          <img src={mapSrc(mapId)} alt={mapId} style={styles.mapImg} draggable={false} />

          <canvas ref={canvasRef} style={{ ...styles.canvas, cursor: drawingMode ? "crosshair" : "default" }} onMouseDown={onMouseDownCanvas} onMouseMove={onMouseMoveCanvas} onMouseUp={onMouseUpCanvas} onMouseLeave={onMouseUpCanvas} />

          {/* RENDERIZAR MARCADORES */}
          {filteredMarkers.map((m) => {
            const isAbility = m.ability && m.ability !== "AGENT";
            const shape = getSpecialShape(m.agent, m.ability);
            
            // Vai buscar à API o ícone certo (Boneco ou Poder)
            const iconUrl = isAbility 
              ? apiAgents[m.agent]?.abilities[m.ability] || apiAgents[m.agent]?.icon 
              : apiAgents[m.agent]?.icon;

            return (
              <div key={m.id} style={{ position: "absolute", left: `${m.x}%`, top: `${m.y}%`, transform: "translate(-50%, -50%)", zIndex: isAbility ? 5 : 10 }}>
                {shape && (
                  <div style={{
                      position: "absolute", top: "50%", left: "50%",
                      transform: `translate(-50%, -50%) rotate(${m.angle || 0}deg)`,
                      width: shape.width || shape.size, height: shape.height || shape.size,
                      borderRadius: shape.type === "wall" ? 4 : "50%",
                      background: shape.color, border: shape.border || "none",
                      pointerEvents: "none", 
                    }}
                  />
                )}

                <div
                  onMouseDown={(e) => startDragMarker(m.id, e)}
                  onClick={(e) => openMarkerMenu(m, e)}
                  onDoubleClick={(e) => removeMarker(m.id, e)}
                  onWheel={(e) => handleMarkerWheel(m.id, e)}
                  style={{ ...styles.marker, borderColor: m.team === "ally" ? "#00b3ff" : "#ff4655", cursor: drawingMode ? "default" : "grab" }}
                >
                  <img
                    src={iconUrl}
                    alt={isAbility ? m.ability : m.agent}
                    style={isAbility ? styles.abilityImg : styles.markerImg}
                    draggable={false}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* FOOTER */}
      <footer style={styles.footer} onClick={(e) => e.stopPropagation()}>
        {loadingApi ? (
          <div style={{ padding: 10, color: "#00ff88", fontWeight: "bold" }}>A carregar Agentes da Riot...</div>
        ) : (
          <div style={styles.agentsContainer}>
            {AGENTS.map((name) => (
              <img
                key={name}
                src={apiAgents[name].icon}
                alt={name}
                title={name}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/json", JSON.stringify({ type: "NEW_AGENT", agent: name }));
                }}
                onClick={(e) => handleFooterAgentClick(name, e)}
                style={styles.agentIcon}
              />
            ))}
          </div>
        )}
      </footer>
    </div>
  );
}

const styles = {
  shell: { height: "100%", width: "100%", display: "grid", gridTemplateColumns: "320px 1fr", gridTemplateRows: "1fr 90px", background: "#0b0f14", color: "#fff", position: "relative" },
  leftPanel: { gridRow: "1 / span 2", background: "rgba(10,14,20,0.95)", borderRight: "1px solid rgba(255,255,255,0.08)", padding: 18, overflow: "auto" },
  leftHeader: { paddingBottom: 14, marginBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.08)" },
  leftTitle: { fontWeight: 900, letterSpacing: 1.2, fontSize: 16 },
  leftSub: { marginTop: 4, color: "#00ff88", fontSize: 12, fontWeight: "bold" },

  section: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: 14, marginBottom: 12 },
  h3: { margin: 0, marginBottom: 10, fontSize: 13, letterSpacing: 0.6 },

  buttonsRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },
  buttonsRowWrap: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 },

  smallBtn: { height: 36, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)", color: "#e5e7eb", fontWeight: 800, cursor: "pointer" },
  smallBtnActive: { background: "rgba(0,255,136,0.18)", borderColor: "rgba(0,255,136,0.45)", color: "#00ff88" },
  midBtn: { height: 38, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.25)", color: "#e5e7eb", fontWeight: 700, cursor: "pointer" },
  midBtnActive: { background: "rgba(0,179,255,0.14)", borderColor: "rgba(0,179,255,0.45)", color: "#00b3ff" },
  actionBtn: { height: 40, borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(0,0,0,0.30)", color: "#fff", fontWeight: 800, cursor: "pointer" },
  actionBtnDanger: { height: 40, borderRadius: 10, border: "1px solid rgba(255,70,85,0.45)", background: "rgba(255,70,85,0.12)", color: "#ff4655", fontWeight: 900, cursor: "pointer" },

  center: { gridColumn: 2, gridRow: 1, position: "relative", padding: 16 },
  mapSelector: { position: "absolute", top: 16, right: 16, zIndex: 10, background: "rgba(0,0,0,0.65)", color: "#fff", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, padding: "10px 12px", fontWeight: 700, outline: "none" },
  mapContainer: { position: "relative", height: "100%", width: "100%", background: "#05070b", borderRadius: 14, overflow: "hidden", border: "1px solid rgba(255,255,255,0.08)" },
  mapImg: { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", padding: "20px", pointerEvents: "none", userSelect: "none" },
  canvas: { position: "absolute", inset: 0, width: "100%", height: "100%" },

  marker: { position: "relative", width: 38, height: 38, borderRadius: "50%", border: "2px solid", background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 15px rgba(0,0,0,0.4)", transition: "transform 0.1s ease" },
  markerImg: { width: "100%", height: "100%", objectFit: "cover", borderRadius: "50%" },
  abilityImg: { width: "100%", height: "100%", objectFit: "contain", padding: 4, borderRadius: "50%" },

  footer: { gridColumn: 2, gridRow: 2, borderTop: "1px solid rgba(255,255,255,0.08)", background: "rgba(10,14,20,0.95)", display: "flex", alignItems: "center", padding: "10px 16px" },
  agentsContainer: { display: "flex", gap: 10, overflowX: "auto", width: "100%", paddingBottom: 6 },
  agentIcon: { width: 54, height: 54, borderRadius: 12, cursor: "grab", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.10)", padding: 4, transition: "transform 0.12s ease" },

  floatingMenu: { position: "fixed", zIndex: 9999, display: "flex", gap: 8, padding: "10px", borderRadius: 12, background: "rgba(15, 20, 30, 0.95)", border: "1px solid rgba(255,255,255,0.2)", boxShadow: "0 12px 30px rgba(0,0,0,0.6)" },
  floatingMenuImg: { width: 40, height: 40, objectFit: "contain", borderRadius: 8, background: "rgba(255,255,255,0.05)", cursor: "pointer", padding: 4, transition: "all 0.1s ease" },
};