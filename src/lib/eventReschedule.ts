/*
 * Qué pasa con el cronograma cuando cambia el horario de su evento: las
 * actividades pueden moverse con él y, las que aun así queden fuera, hay que
 * decidirlas una por una (ajustar o eliminar). Nada se elimina sin pedirlo.
 * Funciones puras: el formulario solo pinta el plan y lo envía.
 */

/** Qué hacer con una actividad que queda fuera del horario nuevo. */
export type OutsideDecision = "fit" | "remove";

interface Timed {
  id: string;
  hora_inicio: string;
  hora_fin: string;
}

export interface PlannedActivity<T extends Timed> {
  schedule: T;
  /** Horario con el que quedaría (ISO). */
  start: string;
  end: string;
  /** Con el horario nuevo del evento no cabe: exige una decisión. */
  outside: boolean;
  decision?: OutsideDecision;
  /** Se eliminará al guardar. */
  removed: boolean;
  /** Su horario cambia respecto del guardado. */
  moved: boolean;
}

/** Ajuste que se envía al backend junto con el evento. */
export interface ActivityAdjustment {
  id: string;
  hora_inicio?: string;
  hora_fin?: string;
  eliminar?: boolean;
}

const ms = (iso: string) => new Date(iso).getTime();
const iso = (time: number) => new Date(time).toISOString();

/**
 * Cómo quedaría cada actividad con el horario nuevo del evento.
 *
 * - `moveWithEvent`: se corren lo mismo que se corrió el inicio del evento,
 *   conservando su posición relativa.
 * - Las que queden fuera necesitan una decisión: `fit` las mete en el evento
 *   conservando su duración (o las recorta al evento si no caben), y
 *   `remove` las elimina.
 */
export function planActivities<T extends Timed>(
  schedules: readonly T[],
  oldStartIso: string,
  newStartIso: string,
  newEndIso: string,
  moveWithEvent: boolean,
  decisions: Readonly<Record<string, OutsideDecision | undefined>>,
): PlannedActivity<T>[] {
  const delta = moveWithEvent ? ms(newStartIso) - ms(oldStartIso) : 0;
  const from = ms(newStartIso);
  const to = ms(newEndIso);

  return schedules
    .map((schedule) => {
      let start = ms(schedule.hora_inicio) + delta;
      let end = ms(schedule.hora_fin) + delta;
      const outside = start < from || end > to;
      const decision = outside ? decisions[schedule.id] : undefined;

      if (decision === "fit") {
        const duration = Math.min(end - start, to - from);
        start = Math.min(Math.max(start, from), to - duration);
        end = start + duration;
      }

      const removed = decision === "remove";
      return {
        schedule,
        start: iso(start),
        end: iso(end),
        outside,
        decision,
        removed,
        moved:
          !removed &&
          (start !== ms(schedule.hora_inicio) || end !== ms(schedule.hora_fin)),
      };
    })
    .sort((a, b) => ms(a.start) - ms(b.start));
}

/** Las que quedan fuera y todavía no tienen decisión. */
export function unresolved<T extends Timed>(
  plan: readonly PlannedActivity<T>[],
): PlannedActivity<T>[] {
  return plan.filter((item) => item.outside && !item.decision);
}

/** Primer par de actividades que se cruzarían, o `null`. */
export function overlapping<T extends Timed>(
  plan: readonly PlannedActivity<T>[],
): [PlannedActivity<T>, PlannedActivity<T>] | null {
  const kept = plan.filter((item) => !item.removed);
  for (let i = 0; i < kept.length; i++) {
    for (let j = i + 1; j < kept.length; j++) {
      if (ms(kept[i].start) < ms(kept[j].end) && ms(kept[j].start) < ms(kept[i].end)) {
        return [kept[i], kept[j]];
      }
    }
  }
  return null;
}

/** Solo lo que cambia: lo demás no se envía. */
export function adjustmentsOf<T extends Timed>(
  plan: readonly PlannedActivity<T>[],
): ActivityAdjustment[] {
  return plan
    .filter((item) => item.removed || item.moved)
    .map((item) =>
      item.removed
        ? { id: item.schedule.id, eliminar: true }
        : { id: item.schedule.id, hora_inicio: item.start, hora_fin: item.end },
    );
}

/** "2 días después", "1 h 30 min antes"; `""` si el inicio no se movió. */
export function shiftText(oldStartIso: string, newStartIso: string): string {
  const delta = ms(newStartIso) - ms(oldStartIso);
  if (delta === 0) {
    return "";
  }
  const minutes = Math.round(Math.abs(delta) / 60_000);
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  const rest = minutes % 60;
  const parts = [
    days ? `${days} ${days === 1 ? "día" : "días"}` : "",
    hours ? `${hours} h` : "",
    rest ? `${rest} min` : "",
  ].filter(Boolean);
  return `${parts.join(" ")} ${delta > 0 ? "después" : "antes"}`;
}
