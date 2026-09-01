import { useCallback, useEffect, useState } from "react";

import { DEFAULT_PAGE_SIZE } from "../config/env";
import { ministryService } from "../services/ministryService";
import type { Ministry } from "../types/ministry";

interface UseMinistriesState {
  ministries: Ministry[];
  total: number;
  isLoading: boolean;
  error: unknown;
}

export interface UseMinistriesResult extends UseMinistriesState {
  page: number;
  pageSize: number;
  pageCount: number;
  setPage: (page: number) => void;
  refetch: () => void;
}

/** Listado de ministerios con paginación server-side (`limit`/`offset` + `meta.totalMinistries`). */
export function useMinistries(
  pageSize: number = DEFAULT_PAGE_SIZE,
): UseMinistriesResult {
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<UseMinistriesState>({
    ministries: [],
    total: 0,
    isLoading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    ministryService
      .list({
        limit: pageSize,
        offset: (page - 1) * pageSize,
        signal: controller.signal,
      })
      .then((result) => {
        setState({
          ministries: result.items,
          total: result.total,
          isLoading: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setState({ ministries: [], total: 0, isLoading: false, error });
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
