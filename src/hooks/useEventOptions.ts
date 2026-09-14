import { useCallback, useEffect, useState } from "react";

import { eventService } from "../services/eventService";
import type { Event } from "../types/event";

/** Cuántos eventos se traen para elegir. No hay búsqueda en servidor. */
const EVENT_FETCH_LIMIT = 100;

interface UseEventOptionsResult {
  events: Event[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Eventos disponibles para elegir en un selector (formulario de cronogramas
 * y filtro del listado). Solo lectura; no reemplaza un módulo de Eventos.
 */
export function useEventOptions(): UseEventOptionsResult {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    eventService
      .list({ limit: EVENT_FETCH_LIMIT, offset: 0, signal: controller.signal })
      .then((result) => {
        setEvents(result.items);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(err);
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  return { events, isLoading, error, refetch };
}
