import React, { useState } from "react";
import { supabase } from "../supabaseClient";
import { Mail, Loader2, ArrowRight, CheckCircle2, AlertCircle } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setMsg("");
    setError("");
    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    if (error) {
      setError(error.message);
    } else {
      setMsg("Email enviado! Verifica a tua caixa de entrada.");
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen w-full bg-[#050505] flex items-center justify-center p-4 font-sans selection:bg-red-500/30">
      <div className="relative w-full max-w-md">
        <div className="bg-neutral-900/40 backdrop-blur-xl border border-neutral-800 rounded-3xl p-8 shadow-2xl relative">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-600/10 border border-red-600/20 mb-6">
              <Mail className="text-red-500" size={28} />
            </div>

            <h1 className="text-3xl font-bold text-white tracking-tight">
              Recuperar Palavra-passe
            </h1>

            <p className="text-neutral-500 mt-2 text-sm">
              Mete o teu email e enviamos-te um link para criares uma nova.
            </p>
          </div>

          <form onSubmit={handleReset} className="space-y-5">
            <div className="space-y-1.5 w-full">
              <label className="text-sm font-medium text-neutral-400 ml-1">
                Email
              </label>

              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-red-500 transition-colors">
                  <Mail size={18} />
                </div>

                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="teuemail@email.com"
                  required
                  className="w-full bg-neutral-900/50 border border-neutral-800 rounded-xl py-3 pl-10 pr-4 text-neutral-100 outline-none focus:border-red-600 focus:ring-4 focus:ring-red-600/10 transition-all"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-500 flex items-center gap-1 ml-1">
                <AlertCircle size={12} /> {error}
              </p>
            )}

            {msg && (
              <p className="text-xs text-emerald-500 flex items-center gap-1 ml-1">
                <CheckCircle2 size={12} /> {msg}
              </p>
            )}

            <button
              disabled={isLoading || !email}
              type="submit"
              className={`w-full relative overflow-hidden group py-3.5 rounded-xl font-bold text-white transition-all active:scale-[0.98] mt-4 
                ${
                  isLoading
                    ? "bg-red-900/50 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700 shadow-xl shadow-red-900/20"
                }`}
            >
              <div className="flex items-center justify-center gap-2">
                {isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <span>Enviar link</span>
                    <ArrowRight
                      size={18}
                      className="group-hover:translate-x-1 transition-transform"
                    />
                  </>
                )}
              </div>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}