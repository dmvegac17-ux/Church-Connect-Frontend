import React, { useState } from "react";
import { Church, Menu, X } from "lucide-react";

interface NavbarProps {
  onOpenJoinModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenJoinModal }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <nav className="sticky top-0 z-40 w-full bg-[#132C28] text-white shadow-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6 sm:h-20 sm:px-10">
        <button
          type="button"
          onClick={() => scrollToSection("inicio")}
          className="flex items-center gap-3"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/20 bg-white/10">
            <Church className="h-5 w-5 text-[#86C2BA]" />
          </span>
          <span className="font-serif text-xl tracking-wide sm:text-2xl">
            Church Connect
          </span>
        </button>

        <div className="hidden items-center gap-8 text-sm font-medium md:flex">
          <button onClick={() => scrollToSection("inicio")}>Inicio</button>
          <button onClick={() => scrollToSection("servicios")}>Servicios</button>
          <button onClick={() => scrollToSection("eventos")}>Eventos</button>
          <button onClick={() => scrollToSection("contacto")}>Contacto</button>
          <button
            onClick={onOpenJoinModal}
            className="rounded-lg bg-[#458B82] px-4 py-2 hover:bg-[#3D7871]"
          >
            Únete
          </button>
        </div>

        <button
          type="button"
          className="p-2 md:hidden"
          onClick={() => setMobileMenuOpen((value) => !value)}
          aria-label="Abrir menú"
        >
          {mobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {mobileMenuOpen && (
        <div className="space-y-2 border-t border-white/10 bg-[#0F2420] px-6 py-4 md:hidden">
          {[
            ["inicio", "Inicio"],
            ["servicios", "Servicios"],
            ["eventos", "Eventos"],
            ["contacto", "Contacto"],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => scrollToSection(id)}
              className="block w-full py-2 text-left"
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => {
              setMobileMenuOpen(false);
              onOpenJoinModal();
            }}
            className="mt-2 w-full rounded-lg bg-[#458B82] py-2.5"
          >
            Únete a nosotros
          </button>
        </div>
      )}
    </nav>
  );
};