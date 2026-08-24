import React from "react";

interface HeroProps {
  onOpenJoinModal: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onOpenJoinModal }) => (
  <section
    id="inicio"
    className="relative flex min-h-[calc(85vh-4rem)] w-full items-center justify-center overflow-hidden bg-[#DDE7E4] px-4 py-20 text-center sm:px-6"
  >
    <div className="mx-auto flex max-w-3xl flex-col items-center">
      <p className="mb-4 text-sm font-semibold uppercase tracking-[0.3em] text-[#577A75]">
        Bienvenidos
      </p>
      <h1 className="mb-6 font-serif text-5xl text-[#163632] sm:text-7xl">
        Church Connect
      </h1>
      <p className="mb-5 font-serif text-lg italic tracking-wide text-[#375854] sm:text-2xl">
        Conectados con tu fe, conectados contigo
      </p>
      <p className="mx-auto mb-10 max-w-xl text-sm leading-relaxed text-[#4F6E6A] sm:text-base">
        Un lugar de encuentro, fe y esperanza donde todos son bienvenidos.
      </p>
      <button
        onClick={onOpenJoinModal}
        className="rounded-lg bg-[#4D8F87] px-8 py-3.5 text-sm font-medium tracking-wide text-white transition hover:bg-[#3D7871] hover:shadow-md sm:text-base"
      >
        Únete a nosotros
      </button>
    </div>
  </section>
);