import { useCallback, useEffect, useState } from "react";

import { scheduleService } from "../services/scheduleService";
import type { Schedule } from "../types/schedule";

interface UseScheduleResult {
  schedule: Schedule | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/** Detalle de un cronograma por id (`GET /schedules/{id}`). */
export function useSchedule(id: string | undefined): UseScheduleResult {
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!id) {
      setSchedule(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    scheduleService
      .getById(id, controller.signal)
      .then((result) => {
        setSchedule(result);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setSchedule(null);
        setError(err);
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [id, reloadKey]);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  return { schedule, isLoading, error, refetch };
}
