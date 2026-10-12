import { useEffect } from "react";

import { clearHttpCache } from "./httpClient";

/*
 * «Actualizar»: un solo botón, en la barra de la aplicación, que pone al día
 * lo que se esté viendo en cualquier pantalla. Vacía la caché de lecturas y
 * avisa a los datos cargados para que se vuelvan a pedir en segundo plano,
 * sin perder filtros, formularios ni lo que está en pantalla.
 */

const REFRESH_EVENT = "app:refresh";

/** Pide lo último al servidor para todo lo que está a la vista. */
export function requestRefresh(): void {
  clearHttpCache();
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

/**
 * Vuelve a consultar cuando se pulsa «Actualizar». `refresh` debe ser
 * estable (`useCallback` o el `refetch` de un hook).
 */
export function useRefreshSignal(refresh: () => void): void {
  useEffect(() => {
    window.addEventListener(REFRESH_EVENT, refresh);
    return () => window.removeEventListener(REFRESH_EVENT, refresh);
  }, [refresh]);
}
