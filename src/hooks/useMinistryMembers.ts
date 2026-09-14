import { useCallback, useEffect, useState } from "react";

import { DEFAULT_PAGE_SIZE } from "../config/env";
import { ministryService } from "../services/ministryService";
import type { MinistryMember } from "../types/ministry";

interface UseMinistryMembersState {
  members: MinistryMember[];
  total: number;
  isLoading: boolean;
  error: unknown;
}

export interface UseMinistryMembersResult extends UseMinistryMembersState {
  page: number;
  pageSize: number;
  pageCount: number;
  setPage: (page: number) => void;
  refetch: () => void;
}

/**
 * Miembros de un ministerio con paginación server-side
 * (`limit`/`offset` + `meta.totalMembers`).
 */
export function useMinistryMembers(
  ministryId: string | undefined,
  pageSize: number = DEFAULT_PAGE_SIZE,
): UseMinistryMembersResult {
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState<UseMinistryMembersState>({
    members: [],
    total: 0,
    isLoading: Boolean(ministryId),
    error: null,
  });

  useEffect(() => {
    if (!ministryId) {
      setState({ members: [], total: 0, isLoading: false, error: null });
      return;
    }

    const controller = new AbortController();
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    ministryService
      .listMembers(ministryId, {
        limit: pageSize,
        offset: (page - 1) * pageSize,
        signal: controller.signal,
      })
      .then((result) => {
        setState({
          members: result.items,
          total: result.total,
          isLoading: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setState({ members: [], total: 0, isLoading: false, error });
      });

    return () => controller.abort();
  }, [ministryId, page, pageSize, reloadKey]);

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
