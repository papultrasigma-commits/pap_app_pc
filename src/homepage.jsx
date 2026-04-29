import React, { useEffect, useState } from "react";
import AuthGate from "./AuthGate.jsx";
import { supabase } from "./supabaseClient";

export default function HomePage() {
  const [showAuth, setShowAuth] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data }) => {
        if (data.session) {
          // CORRIGIDO: Volta a usar a tua lógica original em vez de forçar o link!
          setShowAuth(true);
        }
      })
      .catch(console.error)
      .finally(() => {
        setCheckingSession(false); 
      });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setShowAuth(false); 
      } else if (event === 'SIGNED_IN') {
        setShowAuth(true); // CORRIGIDO!
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const openAuth = (mode) => {
    sessionStorage.setItem("pws_auth_mode", mode);
    setShowAuth(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    if (!showAuth) return;

    const wanted = sessionStorage.getItem("pws_auth_mode") || "login";
    let tries = 0;
    const tick = () => {
      tries += 1;
      const buttons = Array.from(document.querySelectorAll("button"));
      const btnLogin = buttons.find((b) => (b.textContent || "").trim() === "Login");
      const btnSignup = buttons.find((b) => (b.textContent || "").trim() === "Registo");

      if (wanted === "signup" && btnSignup) {
        btnSignup.click();
        return;
      }
      if (wanted === "login" && btnLogin) {
        btnLogin.click();
        return;
      }

      if (tries < 60) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [showAuth]);

  useEffect(() => {
    if (showAuth) return;
    const anchors = document.querySelectorAll('a[href^="#"]');
    const handle = (e) => {
      e.preventDefault();
      const href = e.currentTarget.getAttribute("href");
      const target = document.querySelector(href);
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
    };
    anchors.forEach((a) => a.addEventListener("click", handle));
    return () => anchors.forEach((a) => a.removeEventListener("click", handle));
  }, [showAuth]);

  useEffect(() => {
    if (showAuth) return;
    const o = { threshold: 0.1, rootMargin: "0px 0px -100px 0px" };
    const obs = new IntersectionObserver((entries) => {
      entries.forEach((n) => {
        if (n.isIntersecting) {
          n.target.style.opacity = "1";
          n.target.style.transform = "translateY(0)";
        }
      });
    }, o);

    const els = document.querySelectorAll(".feature-card,.stat-card,.step-card,.honor-way-card,.honor-level-card");
    els.forEach((e) => {
      e.style.opacity = "0";
      e.style.transform = "translateY(30px)";
      e.style.transition = "opacity .6s ease, transform .6s ease";
      obs.observe(e);
    });

    return () => obs.disconnect();
  }, [showAuth]);

  if (checkingSession) return <div className="min-h-screen bg-[#0f1419]" />;

  if (showAuth) return <AuthGate onBack={() => setShowAuth(false)} />;

  return (
    <>
      <style>{`
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;background:#0f1419;color:#fff;overflow-x:hidden}
nav{background:rgba(15,20,25,.98);padding:1.2rem 5%;display:flex;justify-content:space-between;align-items:center;position:fixed;width:100%;top:0;z-index:1000;backdrop-filter:blur(10px);border-bottom:1px solid rgba(255,255,255,.05)}
.logo{display:flex;align-items:center;gap:.5rem;font-size:1.5rem;font-weight:bold}
.logo-icon{width:32px;height:32px;border:3px solid #ff4655;border-radius:50%;display:flex;align-items:center;justify-content:center;position:relative}
.logo-icon::before{content:'';width:12px;height:12px;background:#ff4655;border-radius:50%}
.logo-text{color:#fff}.logo-text span{color:#ff4655}
.nav-links{display:flex;gap:3rem;list-style:none}
.nav-links a{color:#a0a0a0;text-decoration:none;font-weight:500;transition:color .3s;font-size:.95rem}
.nav-links a:hover{color:#fff}
.nav-buttons{display:flex;gap:1rem}
.btn-entrar{background:transparent;color:#fff;padding:.7rem 1.5rem;border:none;cursor:pointer;font-weight:600;transition:color .3s}
.btn-entrar:hover{color:#ff4655}
.btn-criar{background:linear-gradient(135deg,#ff4655,#fd4556);color:#fff;padding:.7rem 1.8rem;border:none;border-radius:5px;cursor:pointer;font-weight:600;text-transform:uppercase;font-size:.85rem;letter-spacing:.5px;transition:all .3s}
.btn-criar:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(255,70,85,.4)}
.hero{margin-top:80px;padding:8rem 5% 4rem;text-align:center;position:relative;background:linear-gradient(180deg,rgba(15,20,25,0) 0%,rgba(15,20,25,.8) 100%),url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 600"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" style="stop-color:%23ff4655;stop-opacity:0.3"/><stop offset="100%" style="stop-color:%230f1419;stop-opacity:0.8"/></linearGradient></defs><path d="M0,0 L1200,0 L1200,600 L0,600 Z" fill="url(%23g)"/><polygon points="300,200 400,100 500,300" fill="%23ff4655" opacity="0.1"/><polygon points="700,150 850,50 900,250" fill="%2300ffb3" opacity="0.08"/><polygon points="100,400 250,350 200,500" fill="%23ff4655" opacity="0.12"/></svg>') center/cover;min-height:70vh;display:flex;flex-direction:column;justify-content:center}
.hero-badge{display:inline-flex;align-items:center;gap:.5rem;background:rgba(0,255,179,.1);border:1px solid rgba(0,255,179,.3);padding:.4rem 1rem;border-radius:20px;margin:0 auto 2rem;font-size:.85rem;color:#00ffb3;max-width:fit-content}
.badge-dot{width:8px;height:8px;background:#00ffb3;border-radius:50%;animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.hero h1{font-size:4rem;margin-bottom:1.5rem;line-height:1.2}
.hero h1 .highlight{color:#ff4655}
.hero h1 .subtitle{display:block;color:#8a8a8a;font-size:3rem}
.hero p{font-size:1.2rem;color:#a0a0a0;margin-bottom:3rem;max-width:800px;margin-left:auto;margin-right:auto;line-height:1.8}
.hero-buttons{display:flex;gap:1.5rem;justify-content:center;flex-wrap:wrap;margin-bottom:4rem}
.btn-comecar{background:linear-gradient(135deg,#ff4655,#fd4556);color:#fff;padding:1rem 2.5rem;border:none;border-radius:5px;cursor:pointer;font-weight:600;font-size:1rem;display:flex;align-items:center;gap:.5rem;transition:all .3s;text-transform:uppercase;letter-spacing:.5px}
.btn-comecar:hover{transform:translateY(-3px);box-shadow:0 15px 40px rgba(255,70,85,.5)}
.btn-procurar{background:transparent;color:#fff;padding:1rem 2.5rem;border:2px solid #2a2a2a;border-radius:5px;cursor:pointer;font-weight:600;font-size:1rem;transition:all .3s;text-transform:uppercase;letter-spacing:.5px}
.btn-procurar:hover{border-color:#fff;background:rgba(255,255,255,.05)}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:3rem;max-width:900px;margin:0 auto}
.stat-card{background:rgba(26,32,39,.5);padding:2rem;border-radius:10px;border:1px solid rgba(255,255,255,.05);text-align:center}
.stat-icon{font-size:2.5rem;margin-bottom:1rem;color:#ff4655}
.stat-number{font-size:2.5rem;font-weight:bold;color:#fff;margin-bottom:.5rem}
.stat-label{color:#8a8a8a;font-size:.95rem}
.how-it-works,.features{padding:6rem 5%;background:#0f1419}
.steps-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:2rem;max-width:1400px;margin:0 auto}
.step-card{background:rgba(26,32,39,.4);padding:2.5rem 2rem;border-radius:12px;border:1px solid rgba(255,255,255,.05);text-align:center;position:relative;transition:all .3s}
.step-card:hover{transform:translateY(-10px);border-color:rgba(255,70,85,.3);background:rgba(26,32,39,.6)}
.step-number{position:absolute;top:-15px;left:50%;transform:translateX(-50%);width:40px;height:40px;background:linear-gradient(135deg,#ff4655,#fd4556);border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:1.2rem;color:#fff;box-shadow:0 5px 20px rgba(255,70,85,.4)}
.step-icon{font-size:3rem;margin:1rem 0}
.step-card h3{color:#fff;margin-bottom:1rem;font-size:1.3rem}
.step-card p{color:#8a8a8a;line-height:1.7;font-size:.95rem}
.section-header{text-align:center;margin-bottom:4rem}
.section-title{font-size:2.5rem;margin-bottom:1rem}
.section-title .highlight{color:#ff4655}
.section-subtitle{color:#8a8a8a;font-size:1.1rem}
.features-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:2rem;max-width:1400px;margin:0 auto}
.feature-card{background:rgba(26,32,39,.4);padding:2.5rem;border-radius:12px;border:1px solid rgba(255,255,255,.05);transition:all .3s;position:relative;overflow:hidden}
.feature-card::before{content:'';position:absolute;top:0;left:0;width:100%;height:3px;background:linear-gradient(90deg,#ff4655,transparent);transform:scaleX(0);transition:transform .3s}
.feature-card:hover::before{transform:scaleX(1)}
.feature-card:hover{transform:translateY(-10px);border-color:rgba(255,70,85,.3);background:rgba(26,32,39,.6)}
.feature-icon{width:60px;height:60px;background:rgba(255,70,85,.1);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:2rem;margin-bottom:1.5rem}
.feature-card h3{color:#fff;margin-bottom:1rem;font-size:1.4rem}
.feature-card p{color:#8a8a8a;line-height:1.7;font-size:.95rem}
.honor-system{padding:6rem 5%;background:#0a0e12}
.exclusive-badge{display:inline-flex;align-items:center;gap:.5rem;background:rgba(255,184,0,.1);border:1px solid rgba(255,184,0,.3);padding:.4rem 1rem;border-radius:20px;margin:0 auto 1.5rem;font-size:.85rem;color:#ffb800;max-width:fit-content}
.honor-content{display:grid;grid-template-columns:1fr 1fr;gap:4rem;max-width:1400px;margin:0 auto}
.honor-ways h3,.honor-levels h3{color:#fff;font-size:1.8rem;margin-bottom:2rem;text-align:left}
.honor-way-card{background:rgba(26,32,39,.4);padding:1.5rem;border-radius:10px;border:1px solid rgba(255,255,255,.05);display:flex;align-items:center;gap:1.5rem;margin-bottom:1rem;transition:all .3s}
.honor-way-card:hover{border-color:rgba(255,184,0,.3);background:rgba(26,32,39,.6)}
.honor-way-icon{width:50px;height:50px;background:rgba(255,184,0,.1);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:1.5rem;flex-shrink:0}
.honor-way-info h4{color:#fff;margin-bottom:.3rem;font-size:1.1rem}
.honor-way-info p{color:#8a8a8a;font-size:.9rem;line-height:1.5}
.honor-benefits{background:rgba(0,255,179,.05);border:1px solid rgba(0,255,179,.2);padding:1.5rem;border-radius:10px;margin-top:2rem}
.honor-benefits h4{color:#00ffb3;margin-bottom:1rem;font-size:1.1rem}
.honor-benefits ul{list-style:none;padding:0}
.honor-benefits li{color:#8a8a8a;padding:.5rem 0;padding-left:1.5rem;position:relative;font-size:.9rem}
.honor-benefits li::before{content:'•';color:#00ffb3;position:absolute;left:0;font-weight:bold}
.honor-level-card{background:rgba(26,32,39,.4);padding:1.5rem;border-radius:10px;border:1px solid rgba(255,255,255,.05);display:flex;align-items:center;gap:1.5rem;margin-bottom:1rem;transition:all .3s}
.honor-level-card:hover{transform:translateX(10px)}
.honor-level-card.bronze:hover{border-color:rgba(205,127,50,.5)}
.honor-level-card.silver:hover{border-color:rgba(192,192,192,.5)}
.honor-level-card.gold:hover{border-color:rgba(255,215,0,.5)}
.honor-level-card.platinum:hover{border-color:rgba(0,255,179,.5)}
.honor-level-card.diamond:hover{border-color:rgba(185,242,255,.5)}
.level-icon{width:50px;height:50px;display:flex;align-items:center;justify-content:center;font-size:2rem;flex-shrink:0}
.level-info{flex:1;display:flex;justify-content:space-between;align-items:center}
.level-info h4{color:#fff;font-size:1.2rem}
.level-points{color:#8a8a8a;font-size:.9rem}
.tournaments{padding:6rem 5%;background:#0f1419}
.compete-badge{display:inline-flex;align-items:center;gap:.5rem;background:rgba(255,70,85,.1);border:1px solid rgba(255,70,85,.3);padding:.4rem 1rem;border-radius:20px;margin:0 auto 1.5rem;font-size:.85rem;color:#ff4655;max-width:fit-content}
.tournament-types{display:grid;grid-template-columns:repeat(2,1fr);gap:2rem;max-width:1000px;margin:0 auto 5rem}
.tournament-type-card{background:rgba(26,32,39,.4);padding:2.5rem;border-radius:12px;border:1px solid rgba(255,255,255,.05);text-align:center;transition:all .3s}
.tournament-type-card.free:hover{border-color:rgba(0,255,179,.4);transform:translateY(-5px)}
.tournament-type-card.premium:hover{border-color:rgba(255,215,0,.4);transform:translateY(-5px)}
.type-icon{font-size:3rem;margin-bottom:1rem}
.tournament-type-card h3{color:#fff;font-size:1.5rem;margin-bottom:1rem}
.tournament-type-card p{color:#8a8a8a;line-height:1.7;margin-bottom:1.5rem}
.type-benefit{background:rgba(0,255,179,.1);color:#00ffb3;padding:.7rem 1.2rem;border-radius:20px;font-size:.9rem;font-weight:600;display:inline-block}
.tournament-type-card.premium .type-benefit{background:rgba(255,215,0,.1);color:#ffd700}
.upcoming-section{max-width:1000px;margin:0 auto}
.upcoming-title{color:#fff;font-size:1.8rem;margin-bottom:2rem;text-align:center}
.tournament-list{display:flex;flex-direction:column;gap:1.5rem}
.tournament-item{background:rgba(26,32,39,.4);padding:2rem;border-radius:12px;border:1px solid rgba(255,255,255,.05);display:grid;grid-template-columns:auto 1fr auto auto;gap:2rem;align-items:center;transition:all .3s}
.tournament-item:hover{border-color:rgba(255,70,85,.3);background:rgba(26,32,39,.6);transform:translateX(5px)}
.tournament-icon{width:60px;height:60px;background:rgba(255,70,85,.1);border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:2rem}
.tournament-info h4{color:#fff;font-size:1.3rem;margin-bottom:.5rem}
.tournament-details{display:flex;gap:1.5rem;color:#8a8a8a;font-size:.9rem}
.tournament-prize{color:#ffd700;font-weight:600;font-size:1.1rem}
.tournament-status{padding:.6rem 1.2rem;border-radius:20px;font-size:.85rem;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
.tournament-status.open{background:rgba(0,255,179,.15);color:#00ffb3;border:1px solid rgba(0,255,179,.3)}
.tournament-status.spots{background:rgba(255,70,85,.15);color:#ff4655;border:1px solid rgba(255,70,85,.3)}
.tournament-status.soon{background:rgba(138,138,138,.15);color:#8a8a8a;border:1px solid rgba(138,138,138,.3)}
footer{background:rgba(15,20,25,.95);padding:2rem 5%;text-align:center;border-top:1px solid rgba(255,255,255,.05);margin-top:4rem}
footer p{color:#8a8a8a;font-size:.9rem}

@media (max-width: 1440px) {
  .hero { min-height: 60vh; padding: 6rem 5% 3rem; }
  .hero h1 { font-size: 3rem; margin-bottom: 1rem; }
  .hero h1 .subtitle { font-size: 2.2rem; }
  .hero p { font-size: 1rem; margin-bottom: 2rem; max-width: 700px; }
  .hero-buttons { margin-bottom: 3rem; }
  .stat-card { padding: 1.2rem; }
  .stat-number { font-size: 2rem; }
  .section-title { font-size: 2rem; }
  .step-card, .feature-card, .tournament-type-card { padding: 1.5rem; }
  .step-card h3, .feature-card h3, .tournament-type-card h3 { font-size: 1.2rem; }
  .honor-way-card, .honor-level-card { padding: 1rem; gap: 1rem; }
  .tournament-item { padding: 1.5rem; gap: 1.5rem; }
  .how-it-works, .features, .honor-system, .tournaments { padding: 4rem 5%; }
}

@media (max-width:1024px){
.features-grid,.steps-grid{grid-template-columns:repeat(2,1fr)}
.honor-content{grid-template-columns:1fr;gap:3rem}
.tournament-types{grid-template-columns:1fr}
.tournament-item{grid-template-columns:auto 1fr;gap:1.5rem}
.tournament-prize{grid-column:1/3;justify-self:start;margin-top:.5rem}
.tournament-status{grid-column:1/3;justify-self:start}
}
@media (max-width:768px){
.hero h1{font-size:2.5rem}
.hero h1 .subtitle{font-size:2rem}
.nav-links{display:none}
.features-grid,.steps-grid,.stats{grid-template-columns:1fr}
.stats{gap:1.5rem}
.tournament-item{grid-template-columns:1fr;text-align:center}
.tournament-icon{margin:0 auto}
.tournament-details{flex-direction:column;gap:.5rem}
}
      `}</style>

      <nav>
        <div className="logo">
          <div className="logo-icon"></div>
          <div className="logo-text">PWS<span></span></div>
        </div>

        <ul className="nav-links">
          <li><a href="#funcionalidades">Funcionalidades</a></li>
          <li><a href="#como-funciona">Como Funciona</a></li>
          <li><a href="#sistema-honra">Sistema de Honra</a></li>
          <li><a href="#torneios">Torneios</a></li>
        </ul>

        <div className="nav-buttons">
          <button className="btn-entrar" onClick={() => openAuth("login")}>ENTRAR</button>
          <button className="btn-criar" onClick={() => openAuth("signup")}>CRIAR CONTA</button>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-badge">
          <span className="badge-dot"></span>
          A melhor plataforma para encontrar a tua equipa
        </div>

        <h1>
          Encontra a tua <span className="highlight">EQUIPA</span>
          <span className="subtitle">Domina o jogo</span>
        </h1>

        <p>
          Conecta-te com jogadores de Valorant, forma a equipa perfeita, treina estratégias e compete em torneios.
          Tudo numa só plataforma.
        </p>

        <div className="hero-buttons">
          <div className="nav-buttons">
            <button className="btn-comecar" onClick={() => openAuth("signup")}>Começar agora</button>
          </div>

          <button className="btn-procurar" onClick={() => openAuth("signup")}>Procurar EQUIPA</button>
        </div>

        <div className="stats">
          <div className="stat-card">
            <div className="stat-icon">👥</div>
            <div className="stat-number">10K+</div>
            <div className="stat-label">Jogadores Ativos</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-number">500+</div>
            <div className="stat-label">Equipas Formadas</div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🎯</div>
            <div className="stat-number">2K+</div>
            <div className="stat-label">Treinos Realizados</div>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="how-it-works">
        <div className="section-header">
          <h2 className="section-title">Como <span className="highlight">Funciona</span></h2>
          <p className="section-subtitle">Começa a jogar com a tua equipa em apenas 4 passos simples</p>
        </div>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <div className="step-icon">👤</div>
            <h3>Cria a tua Conta</h3>
            <p>Regista-te gratuitamente e configura o teu perfil com as tuas preferências de jogo.</p>
          </div>

          <div className="step-card">
            <div className="step-number">2</div>
            <div className="step-icon">🔍</div>
            <h3>Procura ou Cria Equipa</h3>
            <p>Encontra uma equipa que se encaixe no teu estilo ou cria a tua própria.</p>
          </div>

          <div className="step-card">
            <div className="step-number">3</div>
            <div className="step-icon">👥</div>
            <h3>Junta-te à Equipa</h3>
            <p>Conecta-te com os teus companheiros no Discord e organiza as sessões de jogo.</p>
          </div>

          <div className="step-card">
            <div className="step-number">4</div>
            <div className="step-icon">⚔️</div>
            <h3>Treina e Compete</h3>
            <p>Agenda treinos, desenvolve estratégias e participa em torneios.</p>
          </div>
        </div>
      </section>

      <section id="funcionalidades" className="features">
        <div className="section-header">
          <h2 className="section-title">Tudo o que <span className="highlight">precisas</span></h2>
          <p className="section-subtitle">Funcionalidades completas para elevar o teu jogo ao próximo nível</p>
        </div>

        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon" style={{ color: "#ff4655" }}>👥</div>
            <h3>Criar Equipa</h3>
            <p>Cria a tua própria equipa, adiciona membros e define os objetivos do grupo. Cada equipa tem o seu perfil único.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ color: "#00ffb3" }}>🔍</div>
            <h3>Procurar Equipa</h3>
            <p>Encontra equipas que procuram jogadores com o teu estilo de jogo, horários e ambições competitivas.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ color: "#ffb800" }}>⚔️</div>
            <h3>Treinos</h3>
            <p>Organiza treinos com outras equipas. Sistema de matchmaking baseado em pontuação para partidas equilibradas.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ color: "#a855f7" }}>🗺️</div>
            <h3>Estratégias</h3>
            <p>Cria estratégias personalizadas para cada mapa. O capitão edita, a equipa visualiza e executa.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ color: "#ffd700" }}>⭐</div>
            <h3>Sistema de Honra</h3>
            <p>Ganha pontos de honra por bom comportamento, pontualidade e atitude positiva. Maior honra = mais jogos.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon" style={{ color: "#ff4655" }}>🏆</div>
            <h3>Torneios</h3>
            <p>Participa em torneios gratuitos ou pagos. Compete, ganha prémios e sobe no ranking competitivo.</p>
          </div>
        </div>
      </section>

      <section id="sistema-honra" className="honor-system">
        <div className="section-header">
          <div className="exclusive-badge"><span>🛡️</span> Sistema Exclusivo</div>
          <h2 className="section-title">Sistema de <span className="highlight">Honra</span></h2>
          <p className="section-subtitle">Quanto maior a tua honra, mais fácil será encontrar jogos de treino e equipas de qualidade</p>
        </div>

        <div className="honor-content">
          <div className="honor-ways">
            <h3>Como Ganhar Honra</h3>

            <div className="honor-way-card">
              <div className="honor-way-icon">⏰</div>
              <div className="honor-way-info">
                <h4>Pontualidade</h4>
                <p>Chega a horas aos treinos e ganha pontos de honra.</p>
              </div>
            </div>

            <div className="honor-way-card">
              <div className="honor-way-icon">💚</div>
              <div className="honor-way-info">
                <h4>Atitude Positiva</h4>
                <p>Sê amigável e respeitoso com todos os jogadores.</p>
              </div>
            </div>

            <div className="honor-way-card">
              <div className="honor-way-icon">⭐</div>
              <div className="honor-way-info">
                <h4>Comportamento</h4>
                <p>Mantém uma boa conduta em todas as partidas.</p>
              </div>
            </div>

            <div className="honor-benefits">
              <h4>📈 Benefícios de Alta Honra</h4>
              <ul>
                <li>Prioridade na procura de partidas</li>
                <li>Badge exclusivo no perfil</li>
                <li>Acesso a torneios premium</li>
              </ul>
            </div>
          </div>

          <div className="honor-levels">
            <h3>Níveis de Honra</h3>

            <div className="honor-level-card bronze">
              <div className="level-icon">🥉</div>
              <div className="level-info">
                <h4>Bronze</h4>
                <p className="level-points">0-100 pontos</p>
              </div>
            </div>

            <div className="honor-level-card silver">
              <div className="level-icon">🥈</div>
              <div className="level-info">
                <h4>Prata</h4>
                <p className="level-points">101-300 pontos</p>
              </div>
            </div>

            <div className="honor-level-card gold">
              <div className="level-icon">🥇</div>
              <div className="level-info">
                <h4>Ouro</h4>
                <p className="level-points">301-600 pontos</p>
              </div>
            </div>

            <div className="honor-level-card platinum">
              <div className="level-icon">💎</div>
              <div className="level-info">
                <h4>Platina</h4>
                <p className="level-points">601-1000 pontos</p>
              </div>
            </div>

            <div className="honor-level-card diamond">
              <div className="level-icon">💠</div>
              <div className="level-info">
                <h4>Diamante</h4>
                <p className="level-points">1001+ pontos</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="torneios" className="tournaments">
        <div className="section-header">
          <div className="compete-badge"><span>🏆</span> Compete e Ganha</div>
          <h2 className="section-title">Torneios <span className="highlight">Regulares</span></h2>
          <p className="section-subtitle">Participa em torneios semanais, ganha prémios e sobe no ranking competitivo</p>
        </div>

        <div className="tournament-types">
          <div className="tournament-type-card free">
            <div className="type-icon">⚡</div>
            <h3>Torneio Gratuito</h3>
            <p>Torneios sem entrada. Perfeitos para treinar e ganhar experiência competitiva.</p>
            <div className="type-benefit">💡 Experiência + Honra</div>
          </div>

          <div className="tournament-type-card premium">
            <div className="type-icon">👑</div>
            <h3>Torneio Premium</h3>
            <p>Torneios com taxa de entrada. 90% do valor vai para prémios, 10% para manutenção.</p>
            <div className="type-benefit">💰 Prémios Monetários</div>
          </div>
        </div>

        <div className="upcoming-section">
          <h3 className="upcoming-title">Próximos Torneios</h3>
          <div className="tournament-list">
            <div className="tournament-item">
              <div className="tournament-icon">🏆</div>
              <div className="tournament-info">
                <h4>Weekly Showdown</h4>
                <div className="tournament-details">
                  <span>📅 Sábado, 20:00</span>
                  <span>👥 16 Equipas</span>
                </div>
              </div>
              <div className="tournament-prize">Gratuito</div>
              <div className="tournament-status open">INSCRIÇÕES ABERTAS</div>
            </div>

            <div className="tournament-item">
              <div className="tournament-icon">🏆</div>
              <div className="tournament-info">
                <h4>Pro League Cup</h4>
                <div className="tournament-details">
                  <span>📅 Domingo, 18:00</span>
                  <span>👥 32 Equipas</span>
                </div>
              </div>
              <div className="tournament-prize">€500 Prize Pool</div>
              <div className="tournament-status spots">9 VAGAS</div>
            </div>

            <div className="tournament-item">
              <div className="tournament-icon">🏆</div>
              <div className="tournament-info">
                <h4>Rising Stars</h4>
                <div className="tournament-details">
                  <span>📅 Próxima Semana</span>
                  <span>👥 64 Equipas</span>
                </div>
              </div>
              <div className="tournament-prize">€1000 Prize Pool</div>
              <div className="tournament-status soon">EM BREVE</div>
            </div>
          </div>
        </div>
      </section>

      <footer>
        <p>&copy; 2025 PWS - Projeto PAP de Francisco Filipe | Todos os direitos reservados</p>
        <p style={{ marginTop: ".5rem" }}>Valorant é uma marca registada da Riot Games, Inc.</p>
      </footer>
    </>
  );
}