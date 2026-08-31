import { useCallback, useEffect, useState } from "react";

import { userService } from "../services/userService";
import type { User } from "../types/user";

interface UseUserResult {
  user: User | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/** Detalle de un usuario por id (`GET /users/{id}`). */
export function useUser(id: string | undefined): UseUserResult {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!id) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    userService
      .getById(id, controller.signal)
      .then((result) => {
        setUser(result);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setUser(null);
        setError(err);
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [id, reloadKey]);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  return { user, isLoading, error, refetch };
}
