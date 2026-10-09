import { useCallback, useEffect, useRef, useState } from "react";

/** Máximo que aceptan los listados del backend por página. */
const PAGE_LIMIT = 100;
/** Tope de seguridad: 20 páginas (2000 registros). */
const MAX_PAGES = 20;

interface Page<T> {
  items: T[];
  total: number;
}

type PageFetcher<T> = (params: {
  limit: number;
  offset: number;
  signal: AbortSignal;
}) => Promise<Page<T>>;

/** Recorre todas las páginas de un listado paginado del backend. */
export async function fetchAllPages<T>(
  fetchPage: PageFetcher<T>,
  signal: AbortSignal,
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const { items, total } = await fetchPage({
      limit: PAGE_LIMIT,
      offset: page * PAGE_LIMIT,
      signal,
    });
    all.push(...items);
    if (items.length < PAGE_LIMIT || all.length >= total) {
      break;
    }
  }
  return all;
}

export interface UseFullListResult<T> {
  items: T[];
  isLoading: boolean;
  error: unknown;
  refetch: () => void;
  /** Ajuste local inmediato (p. ej. marcar como leída) sin esperar al servidor. */
  setItems: (updater: (items: T[]) => T[]) => void;
}

/**
 * Carga un listado completo para poder buscar, filtrar, contar y paginar
 * en el cliente sobre TODOS los registros (el backend no ofrece búsqueda).
 * `fetchPage` debe ser estable (referencia de módulo o `useCallback`).
 */
export function useFullList<T>(
  fetchPage: PageFetcher<T>,
  enabled: boolean = true,
): UseFullListResult<T> {
  const [items, setItemsState] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(enabled);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const hasLoaded = useRef(false);

  useEffect(() => {
    if (!enabled) {
      setItemsState([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();
    // En recargas se conserva lo visible: sin parpadeo de "Cargando…".
    if (!hasLoaded.current) {
      setIsLoading(true);
    }
    setError(null);

    fetchAllPages(fetchPage, controller.signal)
      .then((result) => {
        hasLoaded.current = true;
        setItemsState(result);
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
  }, [fetchPage, enabled, reloadKey]);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);
  const setItems = useCallback(
    (updater: (items: T[]) => T[]) => setItemsState(updater),
    [],
  );

  return { items, isLoading, error, refetch, setItems };
}
