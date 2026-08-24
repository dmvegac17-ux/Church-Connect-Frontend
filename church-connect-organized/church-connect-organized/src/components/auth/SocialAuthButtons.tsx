import React from "react";

interface Props {
  onSocialLogin: (provider: "google" | "facebook") => void;
}

export const SocialAuthButtons: React.FC<Props> = ({ onSocialLogin }) => (
  <div className="mt-6 w-full">
    <div className="my-6 flex items-center justify-center">
      <div className="w-full border-t border-slate-300" />
      <span className="bg-[#f8fafc] px-3 text-xs font-medium uppercase tracking-wider text-slate-500">
        O continúa con
      </span>
    </div>
    <div className="grid grid-cols-2 gap-3.5">
      <button onClick={() => onSocialLogin("google")} className="rounded-xl border border-slate-300 bg-white py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
        Google
      </button>
      <button onClick={() => onSocialLogin("facebook")} className="rounded-xl border border-slate-300 bg-white py-3 text-sm font-medium text-slate-700 hover:bg-slate-50">
        Facebook
      </button>
    </div>
    <p className="mt-6 text-center text-[11px] leading-relaxed text-slate-500">
      Al registrarte aceptas recibir comunicaciones y actualizaciones de nuestra iglesia.
    </p>
  </div>
);