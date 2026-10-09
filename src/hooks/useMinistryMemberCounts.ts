import { useEffect, useState } from "react";

import { ministryService } from "../services/ministryService";

/**
 * Número de integrantes de cada ministerio visible. El listado de
 * ministerios no lo incluye, así que se lee `meta.totalMembers` pidiendo un
 * solo registro por ministerio. Si una consulta falla, ese ministerio queda
 * sin conteo (la tarjeta simplemente no lo muestra).
 */
export function useMinistryMemberCounts(
  ministryIds: string[],
  reloadKey: number = 0,
): Record<string, number> {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const key = ministryIds.join(",");

  useEffect(() => {
    const ids = key ? key.split(",") : [];
    if (ids.length === 0) {
      return;
    }
    const controller = new AbortController();

    Promise.allSettled(
      ids.map((id) =>
        ministryService.listMembers(id, {
          limit: 1,
          offset: 0,
          signal: controller.signal,
        }),
      ),
    ).then((results) => {
      if (controller.signal.aborted) {
        return;
      }
      setCounts((prev) => {
        const next = { ...prev };
        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            next[ids[index]] = result.value.total;
          }
        });
        return next;
      });
    });

    return () => controller.abort();
  }, [key, reloadKey]);

  return counts;
}
