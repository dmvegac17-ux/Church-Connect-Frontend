import { useCallback, useEffect, useState } from "react";

import { DEFAULT_PAGE_SIZE } from "../config/env";
import { eventService } from "../services/eventService";
import type { Event } from "../types/event";

interface UseEventsState {
  events: Event[];
  total: number;
  isLoading: boolean;
  error: unknown;
}

export interface UseEventsResult extends UseEventsState {
  page: number;
  pageSize: number;
  pageCount: number;
  setPage: (page: number) => void;
  refetch: () => void;
}

/** Listado de eventos con paginación server-side (`limit`/`offset` + `meta.totalEvents`). */
export function useEvents(
  pageSize: number = DEFAULT_PAGE_SIZE,
): UseEventsResult {
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<UseEventsState>({
    events: [],
    total: 0,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    eventService
      .list({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        signal: controller.signal,
      })
      .then((result) => {
        setState({
          events: result.items,
          total: result.total,
          isLoading: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setState({ events: [], total: 0, isLoading: false, error });
      });

    return () => controller.abort();
  }, [page, pageSize, reloadKey]);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  const pageCount = Math.max(1, Math.ceil(state.total / pageSize));

  return {
    ...state,
    page,
    pageSize,
    pageCount,
    setPage: (next) => setPage(Math.min(Math.max(1, next), pageCount)),
    refetch,
  };
}
