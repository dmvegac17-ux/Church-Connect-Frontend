/*
 * Orden y horarios de las actividades de un cronograma. Los valores son los
 * de un `datetime-local` (`YYYY-MM-DDTHH:mm`, hora local del navegador).
 */

export interface TimeSlot {
  horaInicio: string;
  horaFin: string;
}

const MINUTE_MS = 60_000;

function toLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function minutesBetween(start: string, end: string): number {
  return (new Date(end).getTime() - new Date(start).getTime()) / MINUTE_MS;
}

function isComplete(slot: TimeSlot): boolean {
  return (
    Boolean(slot.horaInicio && slot.horaFin) &&
    minutesBetween(slot.horaInicio, slot.horaFin) > 0
  );
}

/**
 * Horarios de dos actividades vecinas después de intercambiar su posición.
 * `upper` es la que estaba arriba y `lower` la de abajo; el resultado trae el
 * horario nuevo de cada una (la que sube y la que baja).
 *
 * Cada actividad conserva su duración y entre las dos siguen ocupando el
 * mismo tramo: la que sube empieza donde empezaba la de arriba, y la que
 * baja termina donde terminaba la de abajo. Si había un hueco entre ambas,
 * se conserva.
 *
 *   Alabanza 10:00–10:30 · Estudio 10:30–11:30
 *   → Estudio 10:00–11:00 · Alabanza 11:00–11:30
 *
 * Si a alguna le falta la hora, o el tramo no alcanza (estaban solapadas o
 * en desorden), simplemente intercambian sus horarios tal como estén.
 */
export function swapSlots<U extends TimeSlot, L extends TimeSlot>(
  upper: U,
  lower: L,
): { movedUp: TimeSlot; movedDown: TimeSlot } {
  const plainSwap = {
    movedUp: { horaInicio: upper.horaInicio, horaFin: upper.horaFin },
    movedDown: { horaInicio: lower.horaInicio, horaFin: lower.horaFin },
  };

  if (!isComplete(upper) || !isComplete(lower)) {
    return plainSwap;
  }

  const upperMinutes = minutesBetween(upper.horaInicio, upper.horaFin);
  const lowerMinutes = minutesBetween(lower.horaInicio, lower.horaFin);
  const span = minutesBetween(upper.horaInicio, lower.horaFin);
  if (span < upperMinutes + lowerMinutes) {
    return plainSwap;
  }

  const spanStart = new Date(upper.horaInicio).getTime();
  const spanEnd = new Date(lower.horaFin).getTime();

  return {
    // La de abajo sube: empieza donde empezaba la de arriba.
    movedUp: {
      horaInicio: upper.horaInicio,
      horaFin: toLocalValue(new Date(spanStart + lowerMinutes * MINUTE_MS)),
    },
    // La de arriba baja: termina donde terminaba la de abajo.
    movedDown: {
      horaInicio: toLocalValue(new Date(spanEnd - upperMinutes * MINUTE_MS)),
      horaFin: lower.horaFin,
    },
  };
}

/**
 * Primer hueco libre dentro del horario del evento donde cabe una actividad
 * nueva: su inicio y hasta dónde podría llegar. `null` si el horario está
 * completo. Las actividades sin horario completo no ocupan nada.
 */
export function firstFreeSlot(
  slots: readonly TimeSlot[],
  eventStart: string,
  eventEnd: string,
): TimeSlot | null {
  if (!eventStart || !eventEnd || eventStart >= eventEnd) {
    return null;
  }

  const taken = slots
    .filter(isComplete)
    .map((slot) => ({
      // Lo que quede fuera del evento no cuenta: se recorta a su horario.
      horaInicio: slot.horaInicio < eventStart ? eventStart : slot.horaInicio,
      horaFin: slot.horaFin > eventEnd ? eventEnd : slot.horaFin,
    }))
    .filter((slot) => slot.horaInicio < slot.horaFin)
    .sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));

  let cursor = eventStart;
  for (const slot of taken) {
    if (slot.horaInicio > cursor) {
      return { horaInicio: cursor, horaFin: slot.horaInicio };
    }
    if (slot.horaFin > cursor) {
      cursor = slot.horaFin;
    }
  }
  return cursor < eventEnd ? { horaInicio: cursor, horaFin: eventEnd } : null;
}
