import { useCallback, useEffect, useState } from "react";

import { notificationService } from "../services/notificationService";

/** Límite máximo permitido por `GET /notificaciones`; también el punto de corte del badge ("99+"). */
const UNREAD_SAMPLE_LIMIT = 100;

/** Cada cuánto se refresca el conteo en segundo plano. */
const POLL_MS = 30_000;

/**
 * Cuenta las notificaciones no leídas de la bandeja propia para el badge del
 * navbar. La API no expone un contador dedicado, así que se aproxima
 * contando `leida: false` dentro de la primera página al límite máximo
 * (`UNREAD_SAMPLE_LIMIT`); si hay 100 o más no leídas, la UI ya muestra "99+"
 * de todas formas, así que la aproximación no afecta lo que ve el usuario.
 */
export function useUnreadNotificationsCount(): { count: number; refetch: () => void } {
  const [count, setCount] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    notificationService
      .list({ limit: UNREAD_SAMPLE_LIMIT, offset: 0, signal: controller.signal })
      .then((result) => {
        setCount(result.items.filter((n) => !n.leida).length);
      })
      .catch(() => {
        // Silencioso: si falla, el badge simplemente no se actualiza esta vez.
      });

    return () => controller.abort();
  }, [reloadKey]);

  useEffect(() => {
    const id = window.setInterval(() => setReloadKey((k) => k + 1), POLL_MS);
    return () => window.clearInterval(id);
  }, []);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  return { count, refetch };
}
