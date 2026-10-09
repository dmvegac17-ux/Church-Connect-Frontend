import type { Event } from "../types/event";

/* Presentación de fechas de eventos: bloque de fecha, rangos y textos relativos. */

const LOCALE = "es-CO";
const DAY_MS = 86_400_000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Mes abreviado en mayúsculas, sin punto: "OCT". */
export function monthAbbr(date: Date): string {
  return date
    .toLocaleDateString(LOCALE, { month: "short" })
    .replace(".", "")
    .toUpperCase();
}

/** Hora en 12 h: "6:00 a. m.". */
export function timeLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleTimeString(LOCALE, { hour: "numeric", minute: "2-digit" });
}

export function timeRangeLabel(startIso: string, endIso: string): string {
  return `${timeLabel(startIso)} – ${timeLabel(endIso)}`;
}

/** "martes 14 de octubre de 2026". */
export function longDateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "mar, 14 oct 2026" — para tablas y subtítulos. */
export function shortDateLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date
    .toLocaleDateString(LOCALE, {
      weekday: "short",
      day: "numeric",
      month: "short",
      year: "numeric",
    })
    .replace(/\./g, "");
}

/** Fecha larga de hoy para los saludos: "Viernes, 9 de octubre de 2026". */
export function todayLabel(now: Date = new Date()): string {
  return capitalize(
    now.toLocaleDateString(LOCALE, {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }),
  );
}

export function greetingFor(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 12) {
    return "Buenos días";
  }
  return hour < 19 ? "Buenas tardes" : "Buenas noches";
}

export interface EventDateInfo {
  /** "OCT" */
  month: string;
  /** "14", o "14–16" si dura varios días dentro del mismo mes. */
  day: string;
  /** Solo en eventos de varios días que cruzan de mes: "hasta 2 NOV". */
  spanLabel?: string;
  isMultiDay: boolean;
  isPast: boolean;
  /** "Próximo" | "En curso" | "Finalizado" */
  statusLabel: string;
  /** Fecha completa, o "Del martes 14 al jueves 16 de octubre de 2026". */
  dateLong: string;
  /** "6:00 a. m. – 11:00 a. m." (mismo día) o inicio y fin por separado. */
  timeRange: string;
  /** "Hoy", "Mañana", "En 5 días · martes"; vacío si ya pasó. */
  relative: string;
}

export function eventDateInfo(event: Event, now: Date = new Date()): EventDateInfo {
  const start = new Date(event.fecha_inicio);
  const end = new Date(event.fecha_fin);
  const isMultiDay = startOfDay(start).getTime() !== startOfDay(end).getTime();
  const isPast = end.getTime() < now.getTime();
  const isOngoing = !isPast && start.getTime() <= now.getTime();
  const sameMonth =
    start.getMonth() === end.getMonth() &&
    start.getFullYear() === end.getFullYear();

  let dateLong = capitalize(longDateLabel(event.fecha_inicio));
  if (isMultiDay) {
    const from = start.toLocaleDateString(LOCALE, {
      weekday: "long",
      day: "numeric",
      ...(sameMonth ? {} : { month: "long" }),
    });
    dateLong = `Del ${from} al ${longDateLabel(event.fecha_fin)}`;
  }

  const diffDays = Math.round(
    (startOfDay(start).getTime() - startOfDay(now).getTime()) / DAY_MS,
  );
  let relative = "";
  if (isOngoing) {
    relative = "En curso";
  } else if (!isPast) {
    const weekday = start.toLocaleDateString(LOCALE, { weekday: "long" });
    relative =
      diffDays === 0
        ? "Hoy"
        : diffDays === 1
          ? "Mañana"
          : `En ${diffDays} días · ${weekday}`;
  }

  return {
    month: monthAbbr(start),
    day:
      isMultiDay && sameMonth
        ? `${start.getDate()}–${end.getDate()}`
        : String(start.getDate()),
    spanLabel:
      isMultiDay && !sameMonth
        ? `hasta ${end.getDate()} ${monthAbbr(end)}`
        : undefined,
    isMultiDay,
    isPast,
    statusLabel: isPast ? "Finalizado" : isOngoing ? "En curso" : "Próximo",
    dateLong,
    timeRange: isMultiDay
      ? `Inicia ${timeLabel(event.fecha_inicio)} · Termina ${timeLabel(event.fecha_fin)}`
      : timeRangeLabel(event.fecha_inicio, event.fecha_fin),
    relative,
  };
}

/** Próximos primero (del más cercano al más lejano); pasados después, del más reciente al más antiguo. */
export function sortEventsForDisplay(events: Event[], now: Date = new Date()): Event[] {
  const upcoming = events
    .filter((e) => new Date(e.fecha_fin).getTime() >= now.getTime())
    .sort(
      (a, b) =>
        new Date(a.fecha_inicio).getTime() - new Date(b.fecha_inicio).getTime(),
    );
  const past = events
    .filter((e) => new Date(e.fecha_fin).getTime() < now.getTime())
    .sort(
      (a, b) =>
        new Date(b.fecha_inicio).getTime() - new Date(a.fecha_inicio).getTime(),
    );
  return [...upcoming, ...past];
}

export function isUpcoming(event: Event, now: Date = new Date()): boolean {
  return new Date(event.fecha_fin).getTime() >= now.getTime();
}

/** "Cronograma · 3 actividades" / "1 actividad". */
export function activitiesLabel(count: number): string {
  return `${count} ${count === 1 ? "actividad" : "actividades"}`;
}
