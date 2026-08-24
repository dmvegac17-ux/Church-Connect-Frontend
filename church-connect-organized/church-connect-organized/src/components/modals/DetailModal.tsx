import React from "react";
import { CalendarPlus, Clock, Mail, MapPin, Phone, User, X } from "lucide-react";
import type { ContactInfoItem, ServiceItem } from "../../types";

interface Props {
  service: ServiceItem | null;
  contactItem: ContactInfoItem | null;
  onClose: () => void;
  onOpenJoinModal: () => void;
}

export const DetailModal: React.FC<Props> = ({
  service,
  contactItem,
  onClose,
  onOpenJoinModal,
}) => {
  if (!service && !contactItem) return null;

  const addServiceToCalendar = () => {
    if (!service) return;
    const title = encodeURIComponent(`${service.title} - Church Connect`);
    const details = encodeURIComponent(
      `${service.description}\n\nLíder: ${service.leader || ""}\nLugar: ${service.fullLocation || ""}`
    );
    const location = encodeURIComponent(service.fullLocation || "Church Connect");
    window.open(
      `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&details=${details}&location=${location}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
      <div className="fixed inset-0 bg-[#163632]/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 my-8 w-full max-w-lg overflow-hidden rounded-2xl border border-[#BDD0CB] bg-[#F4F8F7] shadow-2xl">
        <div className={`relative p-6 text-white sm:p-8 ${service ? "bg-[#132C28]" : "bg-[#35251F]"}`}>
          <button onClick={onClose} className="absolute right-5 top-5 rounded-full bg-white/10 p-2" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
          <span className="mb-3 inline-block rounded-full bg-white/15 px-3 py-0.5 text-xs font-semibold">
            {service ? "01. SERVICIOS" : "02. CONTACTO"}
          </span>
          <h2 className="font-serif text-2xl sm:text-3xl">
            {service?.title ?? contactItem?.title}
          </h2>
        </div>

        {service ? (
          <div className="space-y-6 p-6 sm:p-8">
            <p className="text-sm leading-relaxed text-[#254A45] sm:text-base">{service.description}</p>
            <div className="space-y-3 rounded-xl border border-[#CADBD5] bg-[#E4EFEA] p-4 text-sm">
              <div className="flex gap-3"><Clock className="h-4 w-4 text-[#4D8F87]" /> <strong>{service.schedule}</strong></div>
              {service.fullLocation && <div className="flex gap-3"><MapPin className="h-4 w-4 text-[#4D8F87]" /> <strong>{service.fullLocation}</strong></div>}
              {service.leader && <div className="flex gap-3"><User className="h-4 w-4 text-[#4D8F87]" /> <strong>{service.leader}</strong></div>}
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button onClick={addServiceToCalendar} className="flex-1 rounded-lg bg-[#4D8F87] px-4 py-3 text-sm font-medium text-white">
                <CalendarPlus className="mr-2 inline h-4 w-4" /> Añadir al calendario
              </button>
              <button onClick={() => { onClose(); onOpenJoinModal(); }} className="rounded-lg bg-[#D4E4DF] px-4 py-3 text-sm font-semibold text-[#1D403C]">
                Confirmar asistencia
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6 p-6 sm:p-8">
            <p className="text-sm leading-relaxed text-[#4E3A33]">
              Estamos preparando todos los canales de comunicación para estar aún más cerca de ti.
            </p>
            <div className="flex items-center gap-4 rounded-xl border border-[#D9CCC4] bg-[#EFE8E4] p-4">
              {contactItem?.iconType === "location" && <MapPin className="h-6 w-6 text-[#528F87]" />}
              {contactItem?.iconType === "phone" && <Phone className="h-6 w-6 text-[#528F87]" />}
              {contactItem?.iconType === "email" && <Mail className="h-6 w-6 text-[#528F87]" />}
              <div>
                <span className="block text-xs text-[#7A635B]">{contactItem?.title}</span>
                <strong className="text-sm text-[#35251F]">{contactItem?.detail}</strong>
              </div>
            </div>
            <button onClick={() => { onClose(); onOpenJoinModal(); }} className="w-full rounded-lg bg-[#4D8F87] py-3 text-sm font-medium text-white">
              Enviar Mensaje o Petición Directa
            </button>
          </div>
        )}
      </div>
    </div>
  );
};