import { useCallback, useEffect, useState } from "react";

import { ministryService } from "../services/ministryService";
import type { Ministry } from "../types/ministry";

interface UseMinistryResult {
  ministry: Ministry | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/** Detalle de un ministerio por id (`GET /ministries/{id}`). */
export function useMinistry(id: string | undefined): UseMinistryResult {
  const [ministry, setMinistry] = useState<Ministry | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!id) {
      setMinistry(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    ministryService
      .getById(id, controller.signal)
      .then((result) => {
        setMinistry(result);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setMinistry(null);
        setError(err);
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [id, reloadKey]);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  return { ministry, isLoading, error, refetch };
}
