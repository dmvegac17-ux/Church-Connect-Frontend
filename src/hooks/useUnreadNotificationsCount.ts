import { useRefreshSignal } from "../lib/refresh";
import { useCallback, useEffect, useState } from "react";

import { NOTIFICATIONS_CHANGED_EVENT } from "../lib/notificationEvents";
import { notificationService } from "../services/notificationService";

/** Cada cuánto se refresca el conteo en segundo plano. */
const POLL_MS = 30_000;

/**
 * Notificaciones no leídas de la bandeja propia, para el badge del navbar.
 * Pide solo el número (`GET /notificaciones/no-leidas`): no descarga la
 * bandeja. Se refresca siempre, también con la pestaña oculta.
 */
export function useUnreadNotificationsCount(): { count: number; refetch: () => void } {
  const [count, setCount] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    notificationService
      .unreadCount(controller.signal)
      .then(setCount)
      .catch(() => {
        // Silencioso: si falla, el badge simplemente no se actualiza esta vez.
      });

    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    const id = window.setInterval(() => setReloadKey((k) => k + 1), POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    const handler = () => setReloadKey((k) => k + 1);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, handler);
    return () => window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, handler);
  }, []);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);
  useRefreshSignal(refetch);

  return { count, refetch };
}
