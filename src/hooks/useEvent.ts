import { useCallback, useEffect, useState } from "react";

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

  useEffect(() => {
    if (!id) {
      setEvent(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    eventService
      .getById(id, controller.signal)
      .then((result) => {
        setEvent(result);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setEvent(null);
        setError(err);
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [id, reloadKey]);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  return { event, isLoading, error, refetch };
}
