import React from "react";
import { Mail, MapPin, Phone } from "lucide-react";
import type { ContactInfoItem } from "../../types";
import { CONTACT_ITEMS } from "../../data/churchData";

interface Props {
  onSelectContact: (item: ContactInfoItem) => void;
}

export const ContactSection: React.FC<Props> = ({ onSelectContact }) => {
  const icons = {
    location: <MapPin className="h-6 w-6 text-[#72ACA4]" />,
    phone: <Phone className="h-6 w-6 text-[#72ACA4]" />,
    email: <Mail className="h-6 w-6 text-[#72ACA4]" />,
  };

  return (
    <section id="contacto" className="w-full bg-[#35251F] px-6 py-20 text-white sm:px-10 sm:py-28">
      <div className="mx-auto max-w-5xl text-center">
        <span className="mb-3 block text-xs font-semibold uppercase tracking-widest text-[#D4B5A8]/80">
          02. CONTACTO
        </span>
        <h2 className="mb-4 font-serif text-3xl text-[#F5EBE6] sm:text-5xl">
          Estamos Aquí para Ti
        </h2>
        <p className="mx-auto mb-16 max-w-xl text-sm leading-relaxed text-[#D4B5A8]/90 sm:text-base">
          ¿Tienes preguntas? ¿Necesitas oración? No dudes en contactarnos.
        </p>

        <div className="mx-auto grid max-w-3xl grid-cols-1 gap-10 sm:grid-cols-3">
          {CONTACT_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectContact(item)}
              className="group flex flex-col items-center"
            >
              <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full border border-[#72ACA4]/40 bg-[#528F87]/25 transition group-hover:scale-105 group-hover:bg-[#528F87]/40 sm:h-20 sm:w-20">
                {icons[item.iconType]}
              </span>
              <h3 className="mb-1 font-serif text-base text-[#F5EBE6] sm:text-lg">
                {item.title}
              </h3>
              <span className="text-xs font-light text-[#D4B5A8]/70 sm:text-sm">
                {item.subtitle}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-24 border-t border-[#4E3A33] pt-8 text-xs text-[#D4B5A8]/50">
          © 2026 Church Connect. Todos los derechos reservados.
        </div>
      </div>
    </section>
  );
};