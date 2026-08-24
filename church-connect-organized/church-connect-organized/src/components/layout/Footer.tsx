import React from "react";
import { Church, Mail, MapPin, Phone } from "lucide-react";

export const Footer: React.FC = () => (
  <footer className="w-full border-t border-[#D8E4E1] bg-[#F3F7F6] py-10">
    <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-4 sm:px-6 md:flex-row lg:px-8">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1A4F4A] text-white">
          <Church className="h-5 w-5" />
        </span>
        <div>
          <h3 className="text-base font-bold text-[#163834]">Church Connect</h3>
          <p className="text-xs text-[#547370]">Conectados con tu fe, conectados contigo</p>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-5 text-xs font-medium text-[#547370]">
        <span><MapPin className="mr-1 inline h-3.5 w-3.5 text-[#1A4F4A]" />Av. Central 1234</span>
        <span><Phone className="mr-1 inline h-3.5 w-3.5 text-[#1A4F4A]" />+1 (555) 019-2834</span>
        <span><Mail className="mr-1 inline h-3.5 w-3.5 text-[#1A4F4A]" />contacto@churchconnect.org</span>
      </div>
    </div>
  </footer>
);