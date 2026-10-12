import { useCallback, useEffect, useRef, useState } from "react";

/*
 * Sesión por uso: mientras la persona usa la plataforma, su sesión se renueva;
 * si pasa `IDLE_LIMIT_MS` sin usarla, se le avisa durante `IDLE_WARNING_MS` y,
 * si no responde, se cierra.
 *
 * «Usar» es interactuar: teclado, clic, toque o desplazamiento. Las consultas
 * automáticas en segundo plano (contadores, sondeos) no cuentan.
 */

/** Tiempo sin uso tras el cual se avisa que la sesión va a cerrarse. */
export const IDLE_LIMIT_MS = 15 * 60_000;
/** Cuánto dura el aviso antes de cerrar: tiempo para decidir seguir o salir. */
export const IDLE_WARNING_MS = 30_000;
/** Con menos de este margen para vencer, el token se renueva si hay uso. */
export const REFRESH_MARGIN_MS = 10 * 60_000;
/** Cada cuánto se revisa la inactividad y el vencimiento. */
const CHECK_MS = 20_000;
/** Con el aviso abierto se revisa cada segundo, para la cuenta regresiva. */
const WARNING_TICK_MS = 1_000;
/** La última actividad se anota como mucho una vez por este intervalo. */
const WRITE_THROTTLE_MS = 5_000;

/** Compartida entre pestañas: usar una mantiene viva la sesión de todas. */
const ACTIVITY_KEY = "cc_last_activity";
/** Motivo del último cierre, para explicarlo en la pantalla de acceso. */
const LOGOUT_REASON_KEY = "cc_logout_reason";

const ACTIVITY_EVENTS = [
  "pointerdown",
  "keydown",
  "wheel",
  "touchstart",
  "scroll",
] as const;

let lastActivity = 0;

function readStored(): number {
  try {
    const value = Number(localStorage.getItem(ACTIVITY_KEY));
    return Number.isFinite(value) ? value : 0;
  } catch {
    return 0;
  }
}

/**
 * Anota que la persona acaba de usar la plataforma. `force` lo escribe de
 * inmediato en el almacenamiento compartido, sin esperar al intervalo.
 */
export function markActivity(now: number = Date.now(), force = false): void {
  const previous = lastActivity;
  lastActivity = now;
  if (!force && now - previous < WRITE_THROTTLE_MS) {
    return;
  }
  try {
    localStorage.setItem(ACTIVITY_KEY, String(now));
  } catch {
    // Sin almacenamiento, la actividad se sigue solo en esta pestaña.
  }
}

/** Milisegundos desde la última actividad, en esta o en otra pestaña. */
export function idleFor(now: number = Date.now()): number {
  const last = Math.max(lastActivity, readStored());
  // Sin registro previo (primera vez) se cuenta desde ahora.
  return last === 0 ? 0 : now - last;
}

/** Olvida la actividad anotada (al cerrar sesión y en pruebas). */
export function resetActivity(): void {
  lastActivity = 0;
  try {
    localStorage.removeItem(ACTIVITY_KEY);
  } catch {
    // Nada que limpiar.
  }
}

export function rememberIdleLogout(): void {
  try {
    sessionStorage.setItem(LOGOUT_REASON_KEY, "idle");
  } catch {
    // El aviso es informativo: sin almacenamiento simplemente no se muestra.
  }
}

/** `true` una sola vez si la sesión anterior se cerró por inactividad. */
export function consumeIdleLogout(): boolean {
  try {
    const idle = sessionStorage.getItem(LOGOUT_REASON_KEY) === "idle";
    sessionStorage.removeItem(LOGOUT_REASON_KEY);
    return idle;
  } catch {
    return false;
  }
}

interface IdleSessionOptions {
  /** Hay sesión abierta. */
  active: boolean;
  /** Vencimiento del token vigente, en milisegundos (`exp * 1000`). */
  expiresAt: number | null;
  /** Venció el aviso sin respuesta: hay que cerrar la sesión. */
  onIdle: () => void;
  /** Hay uso y el token está por vencer: hay que renovarlo. */
  onRefresh: () => void;
}

export interface IdleSession {
  /**
   * Segundos que faltan para el cierre mientras el aviso está abierto;
   * `null` si no hay aviso.
   */
  warningSecondsLeft: number | null;
  /** La persona eligió seguir: cuenta como uso y descarta el aviso. */
  staySignedIn: () => void;
}

/**
 * Vigila la sesión abierta. Tras `IDLE_LIMIT_MS` sin uso abre un aviso con
 * cuenta regresiva; si nadie responde en `IDLE_WARNING_MS`, pide cerrar la
 * sesión. Mientras hay uso, pide renovar el token cuando está por vencer.
 */
export function useIdleSession({
  active,
  expiresAt,
  onIdle,
  onRefresh,
}: IdleSessionOptions): IdleSession {
  // Los callbacks cambian en cada render; el vigilante no debe reiniciarse.
  const handlers = useRef({ onIdle, onRefresh });
  handlers.current = { onIdle, onRefresh };
  const expiry = useRef(expiresAt);
  expiry.current = expiresAt;

  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const warning = secondsLeft !== null;
  // El aviso exige una respuesta: mover el mouse detrás de él no lo descarta.
  const warningRef = useRef(false);
  warningRef.current = warning;

  const check = useCallback(() => {
    const now = Date.now();
    const idle = idleFor(now);

    if (idle >= IDLE_LIMIT_MS + IDLE_WARNING_MS) {
      setSecondsLeft(null);
      handlers.current.onIdle();
      return;
    }
    if (idle >= IDLE_LIMIT_MS) {
      setSecondsLeft(
        Math.max(1, Math.ceil((IDLE_LIMIT_MS + IDLE_WARNING_MS - idle) / 1000)),
      );
      return;
    }
    // Hubo uso (aquí o en otra pestaña): no hay nada que avisar.
    setSecondsLeft(null);
    if (expiry.current !== null && expiry.current - now <= REFRESH_MARGIN_MS) {
      handlers.current.onRefresh();
    }
  }, []);

  useEffect(() => {
    if (!active) {
      setSecondsLeft(null);
      return;
    }

    const onActivity = () => {
      if (!warningRef.current) {
        markActivity();
      }
    };
    // Al volver a la pestaña se revisa de inmediato: en segundo plano el
    // navegador retrasa los temporizadores.
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        check();
      }
    };

    // Una sesión recuperada del almacenamiento puede llevar ya demasiado
    // tiempo sin uso.
    check();

    for (const name of ACTIVITY_EVENTS) {
      window.addEventListener(name, onActivity, { passive: true, capture: true });
    }
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      for (const name of ACTIVITY_EVENTS) {
        window.removeEventListener(name, onActivity, { capture: true });
      }
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [active, check]);

  // El ritmo de revisión depende de si hay una cuenta regresiva en pantalla.
  useEffect(() => {
    if (!active) {
      return;
    }
    const timer = window.setInterval(check, warning ? WARNING_TICK_MS : CHECK_MS);
    return () => window.clearInterval(timer);
  }, [active, warning, check]);

  const staySignedIn = useCallback(() => {
    // Se escribe de inmediato: las demás pestañas también cierran su aviso.
    markActivity(Date.now(), true);
    check();
  }, [check]);

  return { warningSecondsLeft: active ? secondsLeft : null, staySignedIn };
}
