import React, { useState } from 'react';
import AuthGate from './AuthGate.jsx';
import { LogIn, UserPlus, Shield } from 'lucide-react';

export default function HomePage() {
  const [showAuth, setShowAuth] = useState(false);

  // Função para abrir o ecrã de autenticação na aba certa
  const handleOpenAuth = (mode) => {
    // Passamos a informação para o sessionStorage para o Login.jsx saber o que abrir
    sessionStorage.setItem("pws_auth_mode", mode);
    if (mode === 'signup') {
      // Se quiser criar conta, forçamos o formulário em vez de mostrar contas guardadas
      sessionStorage.setItem("force_login_form", "true");
    }
    setShowAuth(true);
  };

  // Se o utilizador já clicou para entrar, mostramos o AuthGate (Sua barreira de login)
  if (showAuth) {
    return <AuthGate onBack={() => setShowAuth(false)} />;
  }

  // O Ecrã Inicial do Cliente (Launcher)
  return (
    <div className="min-h-screen bg-[#0f1112] flex flex-col relative overflow-hidden font-sans selection:bg-red-500 selection:text-white">
      
      {/* Elementos Decorativos de Fundo */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-red-600/10 blur-[120px] rounded-full mix-blend-screen" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-red-900/10 blur-[150px] rounded-full" />
      </div>

      <div className="flex-1 flex flex-col items-center justify-center relative z-10 px-4">
        
        {/* Logo Central */}
        <div className="flex flex-col items-center mb-12 animate-in slide-in-from-bottom-8 fade-in duration-700">
          <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-700 rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(239,68,68,0.4)] mb-6 transform rotate-3 hover:rotate-6 transition-transform">
            <Shield size={48} className="text-white" fill="white" />
          </div>
          <h1 className="text-5xl font-black text-white tracking-tighter uppercase">
            PWS<span className="text-red-500"></span>
          </h1>
          <p className="text-gray-400 mt-3 text-sm font-medium tracking-widest uppercase">
            Practice with scrims
          </p>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md animate-in slide-in-from-bottom-8 fade-in duration-700 delay-150 fill-mode-both">
          
          <button 
            onClick={() => handleOpenAuth('login')}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white px-6 py-4 rounded-xl font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-red-600/20"
          >
            <LogIn size={20} />
            Iniciar Sessão
          </button>

          <button 
            onClick={() => handleOpenAuth('signup')}
            className="flex-1 bg-neutral-900 border border-neutral-700 hover:bg-neutral-800 hover:border-neutral-500 text-white px-6 py-4 rounded-xl font-bold uppercase tracking-wider text-sm flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <UserPlus size={20} />
            Criar Conta
          </button>
          
        </div>

      </div>

      {/* Rodapé do Cliente */}
      <div className="relative z-10 p-6 text-center animate-in fade-in duration-1000 delay-300">
        <p className="text-xs text-neutral-600 font-medium uppercase tracking-widest">
          V. 1.0.0 • Protegido por Supabase Auth
        </p>
      </div>
    </div>
  );
}