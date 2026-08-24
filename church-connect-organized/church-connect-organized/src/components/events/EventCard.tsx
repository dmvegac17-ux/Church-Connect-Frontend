import React from "react";
import { Calendar, Check, Clock, Info, MapPin } from "lucide-react";
import type { ChurchEvent } from "../../types";
import { CATEGORIES } from "../../data/eventsData";

interface Props {
  event: ChurchEvent;
  onSelect: (event: ChurchEvent) => void;
  isRsvpd: boolean;
  onToggleRsvp: (eventId: string, e: React.MouseEvent) => void;
}

export const EventCard: React.FC<Props> = ({
  event,
  onSelect,
  isRsvpd,
  onToggleRsvp,
}) => {
  const category = CATEGORIES.find((item) => item.name === event.category);

  return (
    <article
      onClick={() => onSelect(event)}
      className="group flex cursor-pointer flex-col justify-between rounded-2xl border border-[#D5E3E0] bg-white p-5 transition hover:border-[#1A4F4A]/40 hover:shadow-md sm:p-6"
    >
      <div>
        <div className="mb-2 flex items-start justify-between gap-3">
          <h3 className="line-clamp-1 text-base font-bold text-[#163834] transition group-hover:text-[#1A4F4A] sm:text-lg">
            {event.title}
          </h3>
          <span
            className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
              category?.badgeBgClass ?? "bg-slate-50"
            } ${category?.badgeTextClass ?? "text-slate-700"} ${
              category?.badgeBorderClass ?? "border-slate-200"
            }`}
          >
            {event.category}
          </span>
        </div>
        <p className="mb-5 line-clamp-2 text-xs leading-relaxed text-[#547370] sm:text-sm">
          {event.description}
        </p>
      </div>

      <div className="space-y-2.5 border-t border-[#EEF3F2] pt-4 text-xs font-medium text-[#4E706C] sm:text-sm">
        <div className="flex items-center gap-2.5">
          <Calendar className="h-4 w-4 text-[#759793]" /> {event.date}
        </div>
        <div className="flex items-center gap-2.5">
          <Clock className="h-4 w-4 text-[#759793]" /> {event.time}
        </div>
        <div className="flex items-center gap-2.5">
          <MapPin className="h-4 w-4 text-[#759793]" /> {event.location}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[#EEF3F2] pt-3 text-xs">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelect(event);
          }}
          className="flex items-center gap-1 font-semibold text-[#1A4F4A]"
        >
          <Info className="h-3.5 w-3.5" />
          Ver detalles
        </button>
        <button
          type="button"
          onClick={(e) => onToggleRsvp(event.id, e)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1 font-semibold ${
            isRsvpd
              ? "bg-[#1A4F4A] text-white"
              : "bg-[#EAF1EF] text-[#2A4D49]"
          }`}
        >
          {isRsvpd && <Check className="h-3.5 w-3.5" />}
          {isRsvpd ? "Asistiré" : "Confirmar"}
        </button>
      </div>
    </article>
  );
};