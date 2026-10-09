import { useEffect, useState } from "react";

import { INVITATIONS_CHANGED_EVENT } from "../lib/participations";
import { participationService } from "../services/participationService";

/** Cada cuánto se refresca el conteo en segundo plano. */
const POLL_MS = 60_000;

/**
 * Invitaciones propias pendientes de respuesta, para el contador del menú.
 * `GET /participante/invitaciones` exige el rol participante: pasar
 * `enabled: false` para cualquier otro rol y no disparar un 403.
 */
export function usePendingInvitationsCount(enabled: boolean): number {
  const [count, setCount] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setCount(0);
      return;
    }
    const controller = new AbortController();

    participationService
      .listOwn("pendientes", controller.signal)
      .then((result) => setCount(result.conteos.pendientes))
      .catch(() => {
        // Silencioso: si falla, el contador no se actualiza esta vez.
      });

    return () => controller.abort();
  }, [enabled, reloadKey]);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    const refresh = () => setReloadKey((k) => k + 1);
    const id = window.setInterval(refresh, POLL_MS);
    window.addEventListener(INVITATIONS_CHANGED_EVENT, refresh);
    return () => {
      window.clearInterval(id);
      window.removeEventListener(INVITATIONS_CHANGED_EVENT, refresh);
    };
  }, [enabled]);

  return count;
}
