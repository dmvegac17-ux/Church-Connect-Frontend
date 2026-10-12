import { useEffect } from "react";

import { CACHE_TTL_MS } from "../lib/httpClient";

/**
 * Margen sobre la vida de la caché de lecturas: si se consultara justo a los
 * 25 s, la respuesta guardada todavía valdría y no se vería nada nuevo.
 */
const MARGIN_MS = 1_000;

interface Options {
  intervalMs?: number;
  /**
   * Sigue consultando con la pestaña oculta. Para lo que debe estar al día
   * aunque no se esté mirando: notificaciones e invitaciones a participar.
   */
  whenHidden?: boolean;
}

/**
 * Vuelve a consultar en segundo plano: cada vez que la caché de lecturas
 * caduca, y al volver a la pestaña. No muestra carga: quien llama conserva
 * lo que hay en pantalla y solo reemplaza los datos cuando llegan. `refresh`
 * debe ser estable (`useCallback` o el `refetch` de un hook).
 */
export function useBackgroundRefresh(
  refresh: () => void,
  { intervalMs = CACHE_TTL_MS + MARGIN_MS, whenHidden = false }: Options = {},
): void {
  useEffect(() => {
    const tick = () => {
      if (whenHidden || document.visibilityState === "visible") {
        refresh();
      }
    };
    const id = window.setInterval(tick, intervalMs);
    document.addEventListener("visibilitychange", tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [refresh, intervalMs, whenHidden]);
}
