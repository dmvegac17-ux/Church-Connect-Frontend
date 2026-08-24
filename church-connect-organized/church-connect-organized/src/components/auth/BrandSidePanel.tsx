import React from "react";
import { Check } from "lucide-react";
import { ChurchLogo } from "./ChurchLogo";

export const BrandSidePanel: React.FC = () => {
  const features = [
    "Acceso a eventos y horarios",
    "Únete a ministerios",
    "Comunidad en línea",
    "Recursos espirituales",
  ];

  return (
    <div className="flex min-h-[580px] w-full flex-col items-center justify-between overflow-hidden bg-gradient-to-b from-[#14532d] via-[#166534] to-[#0f3b20] p-8 text-white lg:w-1/2 lg:p-16">
      <div className="my-auto flex w-full max-w-md flex-col items-center text-center">
        <ChurchLogo size="lg" className="mb-6" />
        <h1 className="mb-4 text-4xl font-extrabold tracking-tight">Church Connect</h1>
        <p className="mb-10 max-w-xs text-lg leading-relaxed text-emerald-100/90">
          Conectados con tu fe,<br />conectados contigo
        </p>
        <div className="w-full space-y-3.5">
          {features.map((feature) => (
            <div key={feature} className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-5 py-3.5 text-left backdrop-blur-md">
              <Check className="h-4 w-4 text-emerald-300" />
              <span className="text-sm font-medium sm:text-base">{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};