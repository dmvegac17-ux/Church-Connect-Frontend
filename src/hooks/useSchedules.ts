import { useCallback, useEffect, useState } from "react";

import { DEFAULT_PAGE_SIZE } from "../config/env";
import { scheduleService } from "../services/scheduleService";
import type { Schedule } from "../types/schedule";

interface UseSchedulesState {
  schedules: Schedule[];
  total: number;
  isLoading: boolean;
  error: unknown;
}

export interface UseSchedulesResult extends UseSchedulesState {
  page: number;
  pageSize: number;
  pageCount: number;
  setPage: (page: number) => void;
  refetch: () => void;
}

/**
 * Listado de cronogramas con paginación server-side (`limit`/`offset` +
 * `meta.totalSchedules`). Con `eventoId`, el backend devuelve TODOS los
 * cronogramas de ese evento sin paginar, así que la paginación queda fija
 * en "página 1 de 1" mientras el filtro esté activo.
 */
export function useSchedules(
  eventoId: string | undefined,
  pageSize: number = DEFAULT_PAGE_SIZE,
): UseSchedulesResult {
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<UseSchedulesState>({
    schedules: [],
    total: 0,
    isLoading: true,
    error: null,
  });

  const effectivePage = eventoId ? 1 : page;

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    scheduleService
      .list({
        limit: pageSize,
        offset: (effectivePage - 1) * pageSize,
        eventoId,
        signal: controller.signal,
      })
      .then((result) => {
        setState({
          schedules: result.items,
          total: result.total,
          isLoading: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setState({ schedules: [], total: 0, isLoading: false, error });
      });

    return () => controller.abort();
  }, [eventoId, effectivePage, pageSize, reloadKey]);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  const pageCount = eventoId
    ? 1
    : Math.max(1, Math.ceil(state.total / pageSize));

  return {
    ...state,
    page: effectivePage,
    pageSize,
    pageCount,
    setPage: (next) => setPage(Math.min(Math.max(1, next), pageCount)),
    refetch,
  };
}
