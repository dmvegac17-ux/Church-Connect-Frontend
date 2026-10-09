import { useMemo, useState } from "react";

import { isUpcoming, sortEventsForDisplay } from "../lib/eventDates";
import { normalizeText } from "../lib/people";
import type { Event } from "../types/event";
import type { SegmentedTab } from "../components/ui/primitives";

export type EventTab = "upcoming" | "past" | "all";

/**
 * Filtro de eventos compartido por el listado de miembro y la tabla de
 * administración: tabs Próximos / Pasados / Todos (con conteo) y búsqueda
 * por nombre o lugar.
 */
export function useEventFilters(events: Event[]) {
  const [tab, setTab] = useState<EventTab>("upcoming");
  const [query, setQuery] = useState("");

  return useMemo(() => {
    const now = new Date();
    const sorted = sortEventsForDisplay(events, now);
    const upcoming = sorted.filter((e) => isUpcoming(e, now));
    const past = sorted.filter((e) => !isUpcoming(e, now));
    const byTab = tab === "upcoming" ? upcoming : tab === "past" ? past : sorted;

    const q = normalizeText(query);
    const visible = q
      ? byTab.filter(
          (e) =>
            normalizeText(e.titulo).includes(q) ||
            normalizeText(e.lugar).includes(q),
        )
      : byTab;

    const tabs: SegmentedTab<EventTab>[] = [
      { value: "upcoming", label: "Próximos", count: upcoming.length },
      { value: "past", label: "Pasados", count: past.length },
      { value: "all", label: "Todos", count: sorted.length },
    ];

    return {
      tab,
      setTab,
      query,
      setQuery,
      tabs,
      visible,
      total: sorted.length,
      clear: () => {
        setQuery("");
        setTab("all");
      },
    };
  }, [events, tab, query]);
}
