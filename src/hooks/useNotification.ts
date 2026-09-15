import { useCallback, useEffect, useState } from "react";

import { notificationService } from "../services/notificationService";
import type { Notification } from "../types/notification";

interface UseNotificationResult {
  notification: Notification | null;
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
}

/** Detalle de una notificación por id (`GET /notificaciones/{id}`). */
export function useNotification(id: string | undefined): UseNotificationResult {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isLoading, setIsLoading] = useState(Boolean(id));
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!id) {
      setNotification(null);
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    setIsLoading(true);
    setError(null);

    notificationService
      .getById(id, controller.signal)
      .then((result) => {
        setNotification(result);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setNotification(null);
        setError(err);
        setIsLoading(false);
      });

    return () => controller.abort();
  }, [id, reloadKey]);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  return { notification, isLoading, error, refetch };
}
