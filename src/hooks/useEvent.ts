import { useRefreshSignal } from "../lib/refresh";
import { useCallback, useEffect, useRef, useState } from "react";

import { eventService } from "../services/eventService";
import type { Event } from "../types/event";

interface UseEventResult {
  event: Event | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/** Detalle de un evento por id (`GET /events/{id}`). */
export function useEvent(id: string | undefined): UseEventResult {
  const [event, setEvent] = useState<Event | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const loadedId = useRef<string | null>(null);

  useEffect(() => {
    if (!id) {
      setEvent(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    // Al recargar el mismo evento se conserva lo visible: el estado (p. ej.
    // la inscripción) cambia en su sitio, sin volver a «Cargando…».
    if (loadedId.current !== id) {
      setIsLoading(true);
    }
    setError(null);

    eventService
      .getById(id, controller.signal)
      .then((result) => {
        loadedId.current = id;
        setEvent(result);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        if (loadedId.current === id) {
          // Falló una recarga en segundo plano: se conserva lo que había.
          return;
        }
        setEvent(null);
        setError(err);
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [id, reloadKey]);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);
  useRefreshSignal(refetch);

  return { event, isLoading, error, refetch };
}
