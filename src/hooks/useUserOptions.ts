import { useCallback, useEffect, useState } from "react";

import { userService } from "../services/userService";
import type { User } from "../types/user";

/** Cuántos usuarios se traen para elegir. No hay búsqueda en servidor. */
const USER_FETCH_LIMIT = 100;

interface UseUserOptionsResult {
  users: User[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Usuarios disponibles para elegir como destinatario de una notificación.
 * `GET /users` es **solo ADMIN**: pasar `enabled: false` en cualquier
 * contexto donde el usuario actual no sea ADMIN para no disparar un 403.
 */
export function useUserOptions(enabled: boolean = true): UseUserOptionsResult {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setUsers([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    userService
      .list({ limit: USER_FETCH_LIMIT, offset: 0, signal: controller.signal })
      .then((result) => {
        setUsers(result.items);
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
  }, [enabled, reloadKey]);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  return { users, isLoading, error, refetch };
}
