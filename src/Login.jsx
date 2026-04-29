import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Loader2,
  User,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Users,
  Trash2,
  ChevronRight
} from "lucide-react";

const AuthInput = ({
  label,
  type,
  placeholder,
  value,
  onChange,
  icon: Icon,
  error,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword = type === "password";

  return (
    <div className="space-y-1.5 w-full">
      <label className="text-sm font-medium text-neutral-400 ml-1">
        {label}
      </label>

      <div className="relative group">
        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500 group-focus-within:text-red-500 transition-colors">
          <Icon size={18} />
        </div>

        <input
          type={isPassword ? (showPassword ? "text" : "password") : type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`
            w-full bg-neutral-900/50 border rounded-xl py-3 pl-10 pr-10
            text-neutral-100 placeholder-neutral-600 outline-none transition-all
            ${
              error
                ? "border-red-500/50 focus:border-red-500"
                : "border-neutral-800 focus:border-red-600"
            }
            focus:ring-4 focus:ring-red-600/10
          `}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword((s) => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
            aria-label={showPassword ? "Esconder palavra-passe" : "Mostrar palavra-passe"}
            title={showPassword ? "Esconder" : "Mostrar"}
          >
            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1 ml-1 mt-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}
    </div>
  );
};

export default function Login({ onBack, onSuccess }) {
  const [mode, setMode] = useState("login"); 
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const [formData, setFormData] = useState({ name: "", email: "", password: "" });
  const [errors, setErrors] = useState({});
  
  const [savedAccounts, setSavedAccounts] = useState([]);

  useEffect(() => {
    const loadedAccounts = JSON.parse(localStorage.getItem("vlr_saved_accounts") || "[]");
    setSavedAccounts(loadedAccounts);
    
    const forceLogin = sessionStorage.getItem("force_login_form");
    
    if (loadedAccounts.length > 0 && !forceLogin) {
      setMode("saved_accounts");
    } else if (forceLogin) {
      sessionStorage.removeItem("force_login_form");
      setMode("login");
    }
  }, []);

  const validate = () => {
    const newErrors = {};

    if (mode === "signup" && !formData.name.trim()) {
      newErrors.name = "O nome é obrigatório";
    }

    if (!formData.email.trim()) newErrors.email = "O e-mail é obrigatório";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "E-mail inválido";

    if (mode !== "forgot_password") {
      if (!formData.password) newErrors.password = "A palavra-passe é obrigatória";
      else if (formData.password.length < 6) newErrors.password = "Mínimo de 6 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveUsernameForMenu = (username) => {
    localStorage.setItem("pws_username", username || "");
  };

  const addSavedAccount = (email, username, id) => {
    const currentAccounts = JSON.parse(localStorage.getItem("vlr_saved_accounts") || "[]");
    const filteredAccounts = currentAccounts.filter(acc => acc.email !== email);
    
    const newAccounts = [{ email, username, id }, ...filteredAccounts];
    localStorage.setItem("vlr_saved_accounts", JSON.stringify(newAccounts));
    setSavedAccounts(newAccounts);
  };

  const removeSavedAccount = (email, e) => {
    e.stopPropagation();
    const updatedAccounts = savedAccounts.filter(acc => acc.email !== email);
    localStorage.setItem("vlr_saved_accounts", JSON.stringify(updatedAccounts));
    setSavedAccounts(updatedAccounts);
    if (updatedAccounts.length === 0) setMode("login");
  };

  const fetchAndCacheUsername = async (userId) => {
    const { data, error } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", userId)
      .single();

    if (!error && data?.username) {
      saveUsernameForMenu(data.username);
      return data.username;
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);
    setSuccess(false);
    setSuccessMessage("");
    setErrors({});

    try {
      if (mode === "forgot_password") {
        const email = formData.email.trim();
        // O supabase envia um email com link para a rota do update password
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/update-password`, 
        });

        if (error) throw error;

        setSuccess(true);
        setSuccessMessage("Link de recuperação enviado com sucesso!");
        
        // Voltar ao modo de login após alguns segundos (aumentámos o tempo para a pessoa ler o aviso do spam)
        setTimeout(() => {
          setMode("login");
          setSuccess(false);
          setSuccessMessage("");
        }, 8000);
      } 
      else if (mode === "signup") {
        const username = formData.name.trim();
        const email = formData.email.trim();
        const password = formData.password;

        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { username }, 
            emailRedirectTo: window.location.origin,
          },
        });
        
        if (signUpError) throw signUpError;

        saveUsernameForMenu(username);
        setSuccess(true);
        setSuccessMessage("Conta criada com sucesso!");
        
        // Redireciona de volta ao login para entrar na nova conta
        setTimeout(() => {
          setMode("login");
          setSuccess(false);
          setSuccessMessage("");
          setErrors({ email: "Por favor inicie sessão com a sua nova conta." });
        }, 2000);

      } else {
        // Login normal
        const email = formData.email.trim();
        const password = formData.password;

        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;

        const userId = data?.user?.id;
        let fetchedUsername = formData.name;

        if (userId) {
          const dbUsername = await fetchAndCacheUsername(userId);
          if (dbUsername) fetchedUsername = dbUsername;
        }

        addSavedAccount(email, fetchedUsername || "Utilizador", userId);
        
        setSuccess(true);
        setSuccessMessage("Sucesso! A redirecionar...");

        if (onSuccess) onSuccess();
      }
    } catch (err) {
      const message = err?.message || "Erro inesperado.";
      const lower = message.toLowerCase();

      // PROTEÇÃO CONTRA O ERRO DE RATE LIMIT (MUITOS PEDIDOS DE EMAIL)
      if (lower.includes("rate limit") || lower.includes("too many requests")) {
        setErrors({ email: "Muitos pedidos seguidos. O limite de segurança foi atingido, tenta novamente daqui a bocado." });
      } 
      else if (lower.includes("invalid login credentials")) {
        setErrors({ email: "Email ou palavra-passe incorretos." });
      } else if (lower.includes("user already registered")) {
        setErrors({ email: "Este email já está registado." });
      } else if (lower.includes("duplicate") || lower.includes("already exists")) {
        setErrors({ name: "Esse nome já existe. Escolhe outro." });
      } else if (lower.includes("email not confirmed")) {
        setErrors({ email: "Confirma o teu email antes de entrar." });
      } else {
        setErrors({ email: message });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountClick = (acc) => {
    setFormData({ email: acc.email, password: "", name: acc.username || "" });
    setMode("login");
  };

  if (mode === "saved_accounts") {
    return (
      <div className="min-h-screen w-full bg-[#050505] flex items-center justify-center p-4 font-sans selection:bg-red-500/30">
        
        <button
          type="button"
          onClick={() => { if (onBack) onBack(); }}
          className="absolute top-6 left-6 z-[9999] pointer-events-auto cursor-pointer flex items-center justify-center w-11 h-11 rounded-full bg-neutral-900/70 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition"
          aria-label="Voltar"
          title="Voltar"
        >
          <ArrowLeft size={20} />
        </button>

        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-red-900/10 blur-[120px] rounded-full" />
          <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-red-900/10 blur-[120px] rounded-full" />
        </div>

        <div className="relative w-full max-w-md">
          <div className="bg-neutral-900/40 backdrop-blur-xl border border-neutral-800 rounded-3xl p-8 shadow-2xl overflow-hidden relative">

            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-600/10 border border-red-600/20 mb-6">
                <Users className="text-red-500" size={28} />
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">Escolhe uma Conta</h1>
              <p className="text-neutral-500 mt-2 text-sm">Contas guardadas neste dispositivo.</p>
            </div>

            <div className="space-y-3 mb-6">
              {savedAccounts.map((acc, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleAccountClick(acc)}
                  className="group flex items-center justify-between p-4 bg-neutral-900/50 border border-neutral-800 rounded-xl cursor-pointer hover:border-red-500/50 hover:bg-neutral-800/80 transition-all"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold shadow-[0_0_10px_rgba(239,68,68,0.3)]">
                      {(acc.username?.[0] || acc.email?.[0] || "U").toUpperCase()}
                    </div>
                    <div>
                      <p className="text-white font-medium">{acc.username || "Utilizador"}</p>
                      <p className="text-xs flex items-center gap-1 mt-0.5">
                        <span className="text-neutral-500">{acc.email}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={(e) => removeSavedAccount(acc.email, e)}
                      className="p-2 text-neutral-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                      title="Remover conta"
                    >
                      <Trash2 size={16} />
                    </button>
                    <ChevronRight size={18} className="text-neutral-600 group-hover:text-red-500 transition-colors" />
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                setFormData({ name: "", email: "", password: "" });
                setMode("login");
              }}
              className="w-full py-3.5 rounded-xl font-bold text-neutral-300 bg-neutral-900 border border-neutral-800 hover:bg-neutral-800 hover:text-white transition-all flex items-center justify-center gap-2"
            >
              <User size={18} />
              Adicionar nova conta
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#050505] flex items-center justify-center p-4 font-sans selection:bg-red-500/30">
      
      <button
        type="button"
        onClick={() => {
          if (savedAccounts.length > 0 && mode !== "saved_accounts") {
            setMode("saved_accounts");
          } else if (onBack) {
            onBack();
          }
        }}
        className="absolute top-6 left-6 z-[9999] pointer-events-auto cursor-pointer flex items-center justify-center w-11 h-11 rounded-full bg-neutral-900/70 border border-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-800 transition"
        aria-label="Voltar"
        title="Voltar"
      >
        <ArrowLeft size={20} />
      </button>

      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-red-900/10 blur-[120px] rounded-full" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-red-900/10 blur-[120px] rounded-full" />
      </div>

      <div className="relative w-full max-w-md">
        
        {/* MENSAGEM DE SUCESSO APRIMORADA COM AVISO DE SPAM */}
        {success && (
          <div className="absolute -top-24 left-0 right-0 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 py-3 px-4 rounded-xl flex flex-col justify-center animate-in fade-in slide-in-from-top-4 duration-300 z-50 shadow-2xl">
            <div className="flex items-center gap-3">
              <CheckCircle2 size={20} className="shrink-0" />
              <span className="text-sm font-bold">{successMessage || "Sucesso!"}</span>
            </div>
            {mode === "forgot_password" && (
              <p className="text-xs mt-1.5 opacity-90 ml-8 leading-relaxed">
                Verifica a tua caixa de entrada. Se não encontrares o e-mail em 2 minutos, <strong className="underline font-bold text-emerald-400">verifica a pasta de Spam ou Lixo Eletrónico</strong>.
              </p>
            )}
          </div>
        )}

        <div className="bg-neutral-900/40 backdrop-blur-xl border border-neutral-800 rounded-3xl p-8 shadow-2xl overflow-hidden mt-6">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-red-600/10 border border-red-600/20 mb-6 group transition-all duration-500 hover:scale-110">
              <Lock className="text-red-500 group-hover:rotate-12 transition-transform" size={28} />
            </div>

            <h1 className="text-3xl font-bold text-white tracking-tight">
              {mode === "login" ? "Iniciar Sessão" : mode === "signup" ? "Criar Conta" : "Recuperar Conta"}
            </h1>

            <p className="text-neutral-500 mt-2 text-sm">
              {mode === "login"
                ? "Bem-vindo de volta! Introduza os seus dados."
                : mode === "signup"
                ? "Junte-se a nós e comece a sua jornada hoje."
                : "Insira o seu e-mail para receber as instruções de recuperação."}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === "signup" && (
              <AuthInput
                label="Nome de utilizador"
                type="text"
                placeholder="Ex: Thanospx"
                icon={User}
                value={formData.name}
                error={errors.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            )}

            <AuthInput
              label="E-mail"
              type="email"
              placeholder="exemplo@dominio.pt"
              icon={Mail}
              value={formData.email}
              error={errors.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />

            {mode !== "forgot_password" && (
              <AuthInput
                label="Palavra-passe"
                type="password"
                placeholder="••••••••"
                icon={Lock}
                value={formData.password}
                error={errors.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            )}

            {/* BOTÃO ESQUECEU A PALAVRA-PASSE (Apenas no Login) */}
            {mode === "login" && (
              <div className="flex justify-end -mt-2">
                <button
                  type="button"
                  onClick={() => {
  window.location.href = "/forgot-password";
}}
                  
                  className="text-xs font-medium text-neutral-500 hover:text-red-500 transition-colors"
                >
                  Esqueceu a palavra-passe?
                </button>
              </div>
            )}

            <button
              disabled={isLoading || success}
              type="submit"
              className={`
                w-full relative overflow-hidden group py-3.5 rounded-xl font-bold text-white transition-all active:scale-[0.98] mt-2
                ${
                  isLoading
                    ? "bg-red-900/50 cursor-not-allowed"
                    : "bg-red-600 hover:bg-red-700 shadow-xl shadow-red-900/20"
                }
              `}
            >
              <div className="flex items-center justify-center gap-2">
                {isLoading ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <>
                    <span>
                      {mode === "login" ? "Entrar Agora" : mode === "signup" ? "Criar Conta" : "Enviar Link"}
                    </span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </div>
            </button>
          </form>

          {mode === "forgot_password" ? (
            <p className="text-center mt-10 text-sm text-neutral-500">
              Lembrou-se da palavra-passe?
              <button
                type="button"
                onClick={() => {
                  setErrors({});
                  setSuccess(false);
                  setFormData({ ...formData, password: "" });
                  setMode("login");
                }}
                className="ml-2 font-semibold text-red-500 hover:text-red-400 transition-colors"
              >
                Voltar ao Login
              </button>
            </p>
          ) : (
            <p className="text-center mt-10 text-sm text-neutral-500">
              {mode === "login" ? "Ainda não tem conta?" : "Já tem uma conta?"}
              <button
                type="button"
                onClick={() => {
                  setFormData({ name: "", email: "", password: "" });
                  setErrors({});
                  setSuccess(false);
                  setMode(mode === "login" ? "signup" : "login");
                }}
                className="ml-2 font-semibold text-red-500 hover:text-red-400 transition-colors"
              >
                {mode === "login" ? "Registe-se aqui" : "Inicie sessão"}
              </button>
            </p>
          )}
        </div>

        <p className="text-center mt-6 text-[10px] text-neutral-600 uppercase tracking-widest leading-loose">
          Protegido por encriptação AES-256 <br />
          © 2026 Sistema de Autenticação • Todos os direitos reservados
        </p>
      </div>
    </div>
  );
}