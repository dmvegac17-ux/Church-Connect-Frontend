import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Calendar,
  CalendarPlus,
  Check,
  Clock,
  MapPin,
  Share2,
  Tag,
  User,
  X,
} from "lucide-react";
import type { ChurchEvent } from "../../types";

interface Props {
  event: ChurchEvent | null;
  onClose: () => void;
  isRsvpd: boolean;
  onToggleRsvp: (eventId: string) => void;
}

export const EventModal: React.FC<Props> = ({
  event,
  onClose,
  isRsvpd,
  onToggleRsvp,
}) => {
  const [copied, setCopied] = useState(false);

  if (!event) return null;

  const handleShare = async () => {
    const text = `${event.title} - ${event.date} (${event.time}) en ${event.location}.`;
    if (navigator.share) {
      await navigator.share({
        title: `${event.title} - Church Connect`,
        text,
        url: window.location.href,
      }).catch(() => {});
    } else {
      await navigator.clipboard.writeText(`${text} ${window.location.href}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCalendar = () => {
    const title = encodeURIComponent(event.title);
    const details = encodeURIComponent(
      `${event.description}\n\nLugar: ${event.location}\nDirección: ${event.address || ""}`
    );
    const location = encodeURIComponent(
      `${event.location}, ${event.address || ""}`
    );
    const url =
      `https://calendar.google.com/calendar/render?action=TEMPLATE` +
      `&text=${title}&details=${details}&location=${location}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-[#163834]/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="relative z-10 my-8 w-full max-w-xl overflow-hidden rounded-3xl border border-[#D5E3E0] bg-white shadow-2xl"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative bg-[#1A4F4A] p-6 text-white sm:p-8">
            <button
              onClick={onClose}
              className="absolute right-5 top-5 rounded-full bg-white/10 p-2 hover:bg-white/20"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
            <span className="mb-3 inline-block rounded-full border border-white/20 bg-white/15 px-3 py-0.5 text-xs font-semibold">
              {event.category}
            </span>
            <h2 className="text-2xl font-extrabold sm:text-3xl">{event.title}</h2>
          </div>

          <div className="space-y-6 p-6 sm:p-8">
            <div>
              <h4 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#648783]">
                Acerca de este evento
              </h4>
              <p className="text-sm leading-relaxed text-[#3A5C58] sm:text-base">
                {event.description}
              </p>
            </div>

            <div className="space-y-3.5 rounded-2xl border border-[#D5E3E0] bg-[#F3F8F7] p-4 sm:p-5">
              <div className="flex gap-3">
                <Calendar className="mt-0.5 h-4 w-4 text-[#1A4F4A]" />
                <div><span className="block text-xs text-[#547370]">Fecha</span><strong>{event.date}</strong></div>
              </div>
              <div className="flex gap-3">
                <Clock className="mt-0.5 h-4 w-4 text-[#1A4F4A]" />
                <div><span className="block text-xs text-[#547370]">Horario</span><strong>{event.time}</strong></div>
              </div>
              <div className="flex gap-3">
                <MapPin className="mt-0.5 h-4 w-4 text-[#1A4F4A]" />
                <div>
                  <span className="block text-xs text-[#547370]">Ubicación</span>
                  <strong>{event.location}</strong>
                  {event.address && <span className="block text-xs text-[#547370]">{event.address}</span>}
                </div>
              </div>
              {event.leader && (
                <div className="flex gap-3">
                  <User className="mt-0.5 h-4 w-4 text-[#1A4F4A]" />
                  <div><span className="block text-xs text-[#547370]">A cargo de</span><strong>{event.leader}</strong></div>
                </div>
              )}
            </div>

            {event.tags?.length ? (
              <div className="flex flex-wrap items-center gap-2">
                <Tag className="h-3.5 w-3.5 text-[#759793]" />
                {event.tags.map((tag) => (
                  <span key={tag} className="rounded-md bg-[#E2ECE9] px-2.5 py-1 text-xs font-medium text-[#2A4D49]">
                    #{tag}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="flex flex-col gap-3 border-t border-[#EEF3F2] pt-4 sm:flex-row">
              <button
                onClick={() => onToggleRsvp(event.id)}
                className="flex-1 rounded-xl bg-[#1A4F4A] px-5 py-3 text-sm font-bold text-white"
              >
                {isRsvpd ? (
                  <span className="flex items-center justify-center gap-2"><Check className="h-4 w-4" />¡Asistencia Confirmada!</span>
                ) : "Confirmar mi Asistencia"}
              </button>
              <button
                onClick={handleCalendar}
                className="rounded-xl border border-[#D0DFDB] bg-[#EAF1EF] px-4 py-3 text-sm font-semibold text-[#2A4D49]"
              >
                <CalendarPlus className="mr-2 inline h-4 w-4" />Calendario
              </button>
              <button
                onClick={handleShare}
                className="rounded-xl border border-[#D0DFDB] bg-[#EAF1EF] px-4 py-3 text-sm font-semibold text-[#2A4D49]"
              >
                {copied ? <Check className="mr-2 inline h-4 w-4" /> : <Share2 className="mr-2 inline h-4 w-4" />}
                {copied ? "¡Copiado!" : "Compartir"}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};