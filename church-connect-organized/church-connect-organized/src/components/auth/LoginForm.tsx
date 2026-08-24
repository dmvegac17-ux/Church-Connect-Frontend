import React, { useState } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

interface Props {
  onSuccess: (email: string) => void;
  onForgotPassword: () => void;
}

export const LoginForm: React.FC<Props> = ({ onSuccess, onForgotPassword }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      onSuccess(email);
    }, 800);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-5">
      <label className="block text-left text-sm font-semibold text-slate-800">
        Correo Electrónico
        <div className="relative mt-1.5">
          <Mail className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="tu@email.com" className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
        </div>
      </label>

      <label className="block text-left text-sm font-semibold text-slate-800">
        Contraseña
        <div className="relative mt-1.5">
          <Lock className="absolute left-3.5 top-3.5 h-5 w-5 text-slate-400" />
          <input type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-11 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200" />
          <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3.5 top-3.5 text-slate-400" aria-label="Mostrar contraseña">
            {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
          </button>
        </div>
      </label>

      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
          <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} className="h-4 w-4 accent-emerald-600" />
          Recordarme
        </label>
        <button type="button" onClick={onForgotPassword} className="text-xs font-medium text-emerald-700 hover:underline">
          ¿Olvidaste tu contraseña?
        </button>
      </div>

      <button type="submit" disabled={isLoading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#166534] px-6 py-3.5 text-base font-semibold text-white hover:bg-[#14532d]">
        {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : "Iniciar Sesión"}
      </button>
    </form>
  );
};