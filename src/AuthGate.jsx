import React, { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import Login from './Login.jsx';
import App from './App.jsx';
import { AlertOctagon } from 'lucide-react';

export default function AuthGate({ onBack }) {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isBanned, setIsBanned] = useState(false);
  const [banDate, setBanDate] = useState(null);

  useEffect(() => {
    let mounted = true;

    const checkAuth = async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      if (data.session) {
        // VERIFICA SE O UTILIZADOR FOI BANIDO PELO ADMIN
        const { data: profile } = await supabase
          .from('profiles')
          .select('banned_until')
          .eq('id', data.session.user.id)
          .single();

        if (profile?.banned_until && new Date(profile.banned_until) > new Date()) {
          setIsBanned(true);
          const dateStr = new Date(profile.banned_until).toLocaleDateString('pt-PT');
          // Se o ano for muito para a frente (ex: 2100), assumimos que é Permanente
          setBanDate(new Date(profile.banned_until).getFullYear() > 2100 ? "Permanente" : dateStr);
          await supabase.auth.signOut(); // Expulsa-o da sessão
        } else {
          setSession(data.session);
        }
      }
      setLoading(false);
    };

    checkAuth();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (_event === 'SIGNED_IN') {
         checkAuth(); // Re-verifica quando faz login
      } else {
         setSession(newSession ?? null);
      }
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  if (loading) return null;

  // ECRÃ DE BANIMENTO
  if (isBanned) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4 animate-fade-in">
        <div className="bg-[#181a1b] border border-red-500/30 p-8 rounded-2xl max-w-md w-full text-center shadow-[0_0_50px_rgba(239,68,68,0.15)]">
          <AlertOctagon size={64} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">Conta Suspensa</h1>
          <p className="text-gray-400 mb-6 text-sm leading-relaxed">
            A tua conta foi suspensa por um Administrador por violares as regras da comunidade. 
            <br /><br />
            Fim da suspensão: <span className="text-red-400 font-bold uppercase">{banDate}</span>
          </p>
          <button onClick={() => window.location.reload()} className="w-full bg-gray-800 text-white font-bold py-3 rounded-lg hover:bg-gray-700 transition uppercase text-xs tracking-wider">
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return session ? <App /> : <Login onBack={onBack} />;
}