import { fromDateAndTimeValues, toDateAndTimeValues } from "./format";

/*
 * Límites de inscripción de un evento: hasta cuándo se puede inscribir el
 * público y hasta cuándo puede cancelar. Quien decide es el backend; esto
 * solo convierte entre lo que se escribe en el formulario y lo que viaja.
 */

/** Tope de días de anticipación para cancelar. Igual que en el backend. */
export const CANCELLATION_DAYS_MAX = 365;

const DAY_MS = 86_400_000;

/**
 * Instante que corresponde a una fecha límite de inscripción elegida en el
 * formulario (`YYYY-MM-DD`): el final de ese día, sin pasar del inicio del
 * evento (el día del evento, las inscripciones cierran cuando empieza).
 */
export function registrationDeadlineIso(date: string, startIso: string): string {
  const endOfDay = fromDateAndTimeValues(date, "23:59");
  return new Date(endOfDay).getTime() > new Date(startIso).getTime()
    ? startIso
    : endOfDay;
}

/** Fecha (`YYYY-MM-DD`, hora local) de un límite guardado, para el formulario. */
export function deadlineDateValue(iso: string | null | undefined): string {
  return iso ? toDateAndTimeValues(iso).date : "";
}

/** Último instante para cancelar: `days` días antes del inicio del evento. */
export function cancellationDeadline(startIso: string, days: number): Date {
  return new Date(new Date(startIso).getTime() - days * DAY_MS);
}

/** Hoy como `YYYY-MM-DD`, en la hora local del navegador. */
export function todayDateValue(now: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/**
 * Días de calendario desde hoy hasta el día del evento (`YYYY-MM-DD`); 0 si
 * es hoy o ya pasó. Es el máximo de días límite para cancelar: pedir más
 * anticipación de la que queda cerraría la cancelación en el pasado.
 */
export function daysUntilEventDate(eventDate: string, now: Date = new Date()): number {
  const [year, month, day] = eventDate.split("-").map(Number);
  const eventDay = Date.UTC(year, month - 1, day);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.max(0, Math.round((eventDay - today) / DAY_MS));
}

/**
 * Mensaje de validación de los días límite; `undefined` si el valor sirve.
 * `available` son los días que faltan para el evento; `null` si todavía no
 * se sabe (sin fecha de inicio) o no hay que revisarlo.
 */
export function cancellationDaysError(
  value: string,
  available: number | null = null,
): string | undefined {
  const text = value.trim();
  if (!text) {
    return undefined;
  }
  if (!/^\d+$/.test(text)) {
    return "Usa solo números enteros.";
  }
  const days = Number(text);
  if (days > CANCELLATION_DAYS_MAX) {
    return `El máximo es ${CANCELLATION_DAYS_MAX} días.`;
  }
  if (available !== null && days > available) {
    const when =
      available === 0
        ? "El evento es hoy"
        : available === 1
          ? "El evento es mañana"
          : `El evento es en ${available} días`;
    return `${when}: el máximo es ${available}.`;
  }
  return undefined;
}
