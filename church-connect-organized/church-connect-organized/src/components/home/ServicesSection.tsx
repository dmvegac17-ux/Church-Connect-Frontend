import React from "react";
import { ArrowRight, BookOpen, Calendar, Clock, Users } from "lucide-react";
import type { ServiceItem } from "../../types";
import { SERVICES_DATA } from "../../data/churchData";

interface Props {
  onSelectService: (service: ServiceItem) => void;
}

export const ServicesSection: React.FC<Props> = ({ onSelectService }) => {
  const getIcon = (type: ServiceItem["iconType"]) => {
    if (type === "estudio") return <BookOpen className="h-5 w-5" />;
    if (type === "oracion") return <Users className="h-5 w-5" />;
    return <Calendar className="h-5 w-5" />;
  };

  return (
    <section id="servicios" className="w-full bg-[#DDE7E4] px-6 py-20 sm:px-10 sm:py-28">
      <div className="mx-auto max-w-6xl">
        <div className="mb-16 text-center">
          <span className="mb-3 block text-xs font-semibold uppercase tracking-widest text-[#577A75]">
            01. SERVICIOS
          </span>
          <h2 className="mb-4 font-serif text-3xl text-[#163632] sm:text-5xl">
            Horarios de Reunión
          </h2>
          <p className="mx-auto max-w-2xl text-sm text-[#4F6E6A] sm:text-base">
            Te invitamos a participar en nuestros servicios semanales de alabanza y enseñanza.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          {SERVICES_DATA.map((service) => (
            <button
              key={service.id}
              type="button"
              onClick={() => onSelectService(service)}
              className="group flex flex-col justify-between rounded-xl border border-[#BFCFC9] bg-[#D3E1DC]/80 p-8 text-left transition hover:bg-[#C9D9D3] hover:shadow-md"
            >
              <div>
                <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-[#B9D0C9] text-[#376962] transition group-hover:scale-105">
                  {getIcon(service.iconType)}
                </div>
                <h3 className="mb-3 font-serif text-xl font-bold text-[#163632]">
                  {service.title}
                </h3>
                <div className="mb-4 flex items-center gap-2 text-xs font-medium text-[#3E615D] sm:text-sm">
                  <Clock className="h-4 w-4" />
                  {service.schedule}
                </div>
                <p className="text-xs leading-relaxed text-[#4F6E6A] sm:text-sm">
                  {service.description}
                </p>
              </div>
              <div className="mt-8 flex items-center justify-between border-t border-[#BFCFC9]/60 pt-4 text-xs font-semibold text-[#32615B]">
                <span>Más información</span>
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
};