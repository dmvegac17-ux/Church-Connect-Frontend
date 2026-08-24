import React, { useMemo, useState } from "react";
import { Calendar, Search, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { EventCategory, ChurchEvent } from "../../types";
import { CATEGORIES, INITIAL_EVENTS } from "../../data/eventsData";
import { EventCard } from "./EventCard";
import { EventModal } from "./EventModal";

export const EventSection: React.FC = () => {
  const [category, setCategory] = useState<EventCategory>("Todos");
  const [query, setQuery] = useState("");
  const [selectedEvent, setSelectedEvent] = useState<ChurchEvent | null>(null);
  const [rsvps, setRsvps] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem("church_connect_rsvps") || "[]"));
    } catch {
      return new Set();
    }
  });

  const filtered = useMemo(() => {
    const normalized = query.toLowerCase().trim();
    return INITIAL_EVENTS.filter((event) => {
      const matchesCategory = category === "Todos" || event.category === category;
      const matchesSearch =
        !normalized ||
        event.title.toLowerCase().includes(normalized) ||
        event.description.toLowerCase().includes(normalized) ||
        event.location.toLowerCase().includes(normalized) ||
        event.leader?.toLowerCase().includes(normalized) ||
        event.tags?.some((tag) => tag.toLowerCase().includes(normalized));
      return matchesCategory && matchesSearch;
    });
  }, [category, query]);

  const toggleRsvp = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setRsvps((current) => {
      const next = new Set(current);
      next.has(id) ? next.delete(id) : next.add(id);
      localStorage.setItem("church_connect_rsvps", JSON.stringify([...next]));
      return next;
    });
  };

  return (
    <section id="eventos" className="w-full bg-[#EEF3F2] px-4 py-20 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#D5E3E0] bg-white">
            <Calendar className="h-8 w-8 text-[#1A4F4A]" />
          </div>
          <h2 className="mb-3 text-3xl font-extrabold tracking-tight text-[#163834] sm:text-5xl">
            Próximos Eventos
          </h2>
          <p className="mb-7 text-base leading-relaxed text-[#4E706C] sm:text-lg">
            Descubre las actividades y eventos preparados para ti y tu familia.
          </p>

          <div className="relative mx-auto max-w-md">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-[#759793]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre, lugar o tema..."
              className="w-full rounded-xl border border-[#D5E3E0] bg-white py-2.5 pl-10 pr-10 text-sm outline-none focus:border-[#1A4F4A] focus:ring-2 focus:ring-[#1A4F4A]/20"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute right-3 top-2.5 rounded-md p-1 text-[#759793]"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="mb-8 flex justify-center overflow-x-auto">
          <div className="flex gap-1.5 rounded-full border border-[#D3E0DC] bg-[#E2ECE9] p-1.5">
            {CATEGORIES.map((item) => (
              <button
                key={item.name}
                onClick={() => setCategory(item.name)}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition sm:text-sm ${
                  category === item.name
                    ? "bg-[#1A4F4A] text-white"
                    : "text-[#2A4D49] hover:bg-[#D5E3DF]"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-[#547370]">
            No se encontraron eventos con esos filtros.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((event, index) => (
                <motion.div
                  key={event.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.25, delay: index * 0.04 }}
                >
                  <EventCard
                    event={event}
                    onSelect={setSelectedEvent}
                    isRsvpd={rsvps.has(event.id)}
                    onToggleRsvp={toggleRsvp}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <EventModal
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        isRsvpd={selectedEvent ? rsvps.has(selectedEvent.id) : false}
        onToggleRsvp={(id) => toggleRsvp(id)}
      />
    </section>
  );
};