/*
 * Lógica del selector de fecha y hora (evento y actividades del cronograma):
 * qué días, horas, minutos y a. m./p. m. se pueden elegir según el rango
 * permitido, y cómo se ajusta el fin cuando cambia el inicio. Son funciones
 * puras: el componente visual solo las pinta.
 *
 * Las fechas se manejan como hora de pared de Colombia, `YYYY-MM-DDTHH:mm`
 * («wall»), y solo se convierten a ISO al entrar o salir del formulario.
 */

export type Period = "AM" | "PM";

/** Colombia no tiene horario de verano: un desfase fijo basta. */
export const BOGOTA_OFFSET_MINUTES = -300;

const MINUTE_MS = 60_000;
const LAST_MINUTE = 23 * 60 + 59;
const pad = (n: number) => String(n).padStart(2, "0");

/* ── Hora de pared ↔ instante ─────────────────────────────────────────── */

/** Milisegundos de una hora de pared, tratada como UTC para poder sumar. */
export function wallToMs(wall: string): number {
  const [date, time] = wall.split("T");
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = time.split(":").map(Number);
  return Date.UTC(year, month - 1, day, hour, minute);
}

export function msToWall(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** Une fecha y hora; `""` si falta alguna de las dos. */
export function joinWall(date: string, time: string): string {
  return date && time ? `${date}T${time}` : "";
}

export function addMinutes(wall: string, minutes: number): string {
  return msToWall(wallToMs(wall) + minutes * MINUTE_MS);
}

/** Hora de pared de Colombia de un instante ISO; `""` si no es una fecha. */
export function isoToWall(iso: string): string {
  const ms = new Date(iso).getTime();
  return Number.isNaN(ms) ? "" : msToWall(ms + BOGOTA_OFFSET_MINUTES * MINUTE_MS);
}

/** Instante ISO (UTC) de una hora de pared de Colombia. */
export function wallToIso(wall: string): string {
  return new Date(wallToMs(wall) - BOGOTA_OFFSET_MINUTES * MINUTE_MS).toISOString();
}

/** Ahora mismo en Colombia. */
export function nowWall(now: Date = new Date()): string {
  return msToWall(now.getTime() + BOGOTA_OFFSET_MINUTES * MINUTE_MS);
}

/* ── 12 h ↔ 24 h ──────────────────────────────────────────────────────── */

/** `"00:15"` → 12:15 a. m.; `"12:00"` → 12:00 p. m. */
export function to12Hour(time: string): { hour12: number; minute: number; period: Period } {
  const [hour, minute] = time.split(":").map(Number);
  return {
    hour12: hour % 12 === 0 ? 12 : hour % 12,
    minute,
    period: hour < 12 ? "AM" : "PM",
  };
}

/** 12:00 a. m. es medianoche (`"00:00"`) y 12:00 p. m. es mediodía (`"12:00"`). */
export function to24Hour(hour12: number, minute: number, period: Period): string {
  const hour = (hour12 % 12) + (period === "PM" ? 12 : 0);
  return `${pad(hour)}:${pad(minute)}`;
}

function minutesOf(time: string): number {
  const [hour, minute] = time.split(":").map(Number);
  return hour * 60 + minute;
}

function timeOf(minutes: number): string {
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`;
}

/* ── Qué se puede elegir ──────────────────────────────────────────────── */

/** Rango permitido, en hora de pared; ambos extremos incluidos. */
export interface Bounds {
  min?: string;
  max?: string;
}

/** Minutos del día `[desde, hasta]` que se pueden elegir. */
export type TimeWindow = readonly [number, number];

/**
 * Ventana de horas elegibles en un día: todo el día, salvo el primero del
 * rango (desde su hora mínima) y el último (hasta su hora máxima). `null`
 * si el día entero queda fuera.
 */
export function timeWindow(date: string, { min, max }: Bounds): TimeWindow | null {
  const [minDate, minTime] = min ? min.split("T") : ["", ""];
  const [maxDate, maxTime] = max ? max.split("T") : ["", ""];
  if ((minDate && date < minDate) || (maxDate && date > maxDate)) {
    return null;
  }
  const from = date === minDate ? minutesOf(minTime) : 0;
  const to = date === maxDate ? minutesOf(maxTime) : LAST_MINUTE;
  return from <= to ? [from, to] : null;
}

/** El día no se puede elegir en el calendario. */
export function dayBlocked(date: string, bounds: Bounds): boolean {
  return timeWindow(date, bounds) === null;
}

function overlaps(from: number, to: number, window: TimeWindow): boolean {
  return from <= window[1] && to >= window[0];
}

export function periodEnabled(period: Period, window: TimeWindow): boolean {
  return period === "AM"
    ? overlaps(0, 11 * 60 + 59, window)
    : overlaps(12 * 60, LAST_MINUTE, window);
}

export function hourEnabled(hour12: number, period: Period, window: TimeWindow): boolean {
  const start = minutesOf(to24Hour(hour12, 0, period));
  return overlaps(start, start + 59, window);
}

export function minuteEnabled(
  hour12: number,
  period: Period,
  minute: number,
  window: TimeWindow,
): boolean {
  const at = minutesOf(to24Hour(hour12, minute, period));
  return at >= window[0] && at <= window[1];
}

/** La hora válida más cercana dentro de la ventana. */
export function clampTime(time: string, window: TimeWindow): string {
  return timeOf(Math.min(Math.max(minutesOf(time), window[0]), window[1]));
}

/**
 * Hora que resulta de elegir hora, minuto y a. m./p. m.: si el minuto ya no
 * cabe en la ventana, se usa el más cercano que sí, sin salir de esa hora
 * (p. ej. inicio 3:45 p. m. → a las 3 p. m. el fin solo puede ser 3:46 o más).
 */
export function resolveTime(
  hour12: number,
  minute: number,
  period: Period,
  window: TimeWindow,
): string {
  const hourStart = minutesOf(to24Hour(hour12, 0, period));
  const from = Math.max(hourStart, window[0]);
  const to = Math.min(hourStart + 59, window[1]);
  if (from > to) {
    return clampTime(to24Hour(hour12, minute, period), window);
  }
  return timeOf(Math.min(Math.max(hourStart + minute, from), to));
}

/* ── Inicio y fin ─────────────────────────────────────────────────────── */

export function later(a: string | undefined, b: string | undefined): string | undefined {
  return a && b ? (a > b ? a : b) : (a ?? b);
}

/** Rango del inicio: debe quedar tiempo para terminar antes del máximo. */
export function startBounds(bounds: Bounds, minDuration: number): Bounds {
  return {
    min: bounds.min,
    max: bounds.max ? addMinutes(bounds.max, -minDuration) : undefined,
  };
}

/** Rango del fin: después del inicio (más la duración mínima). */
export function endBounds(start: string, bounds: Bounds, minDuration: number): Bounds {
  return {
    min: later(bounds.min, start ? addMinutes(start, minDuration) : undefined),
    max: bounds.max,
  };
}

/** El fin es válido para ese inicio. */
export function endIsValid(start: string, end: string, minDuration: number): boolean {
  return wallToMs(end) - wallToMs(start) >= minDuration * MINUTE_MS;
}

/**
 * Fin corregido cuando un cambio en el inicio lo dejó inválido: el inicio
 * más la duración mínima, sin pasar del máximo. `null` si no hay que tocarlo.
 */
export function adjustEnd(
  start: string,
  end: string,
  minDuration: number,
  max?: string,
): string | null {
  if (!start || !end || endIsValid(start, end, minDuration)) {
    return null;
  }
  const next = addMinutes(start, minDuration);
  return max && next > max ? max : next;
}

/* ── Textos ───────────────────────────────────────────────────────────── */

const WEEKDAYS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
const WEEKDAYS_LONG = [
  "domingo",
  "lunes",
  "martes",
  "miércoles",
  "jueves",
  "viernes",
  "sábado",
];
const MONTHS = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
];
export const MONTHS_LONG = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

function weekdayOf(date: string): number {
  return new Date(wallToMs(`${date}T00:00`)).getUTCDay();
}

/** "3:30 p. m." */
export function timeText(time: string): string {
  const { hour12, minute, period } = to12Hour(time);
  return `${hour12}:${pad(minute)} ${period === "AM" ? "a. m." : "p. m."}`;
}

/** "Sáb 14 nov 2026" */
export function dateText(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return `${WEEKDAYS[weekdayOf(date)]} ${day} ${MONTHS[month - 1]} ${year}`;
}

/** "14 nov 3:00 p. m." — para decir entre qué momentos cabe una actividad. */
export function shortMoment(wall: string): string {
  const [date, time] = wall.split("T");
  const [, month, day] = date.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${timeText(time)}`;
}

/** "sábado 14 de noviembre de 2026" — nombre accesible de un día del calendario. */
export function longDateText(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return `${WEEKDAYS_LONG[weekdayOf(date)]} ${day} de ${MONTHS_LONG[month - 1]} de ${year}`;
}

/** "2 h 30 min", "45 min", "3 h". */
export function durationText(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours ? `${hours} h` : "", rest || !hours ? `${rest} min` : ""]
    .filter(Boolean)
    .join(" ");
}

/**
 * "Sáb 14 nov 2026, 3:30 p. m. → 6:00 p. m. (2 h 30 min)". Si termina otro
 * día, el fin lleva su fecha. `""` mientras falte algo o el rango no valga.
 */
export function rangeSummary(start: string, end: string): string {
  if (!start || !end || wallToMs(end) <= wallToMs(start)) {
    return "";
  }
  const [startDate, startTime] = start.split("T");
  const [endDate, endTime] = end.split("T");
  const until =
    endDate === startDate
      ? timeText(endTime)
      : `${dateText(endDate)}, ${timeText(endTime)}`;
  const minutes = (wallToMs(end) - wallToMs(start)) / MINUTE_MS;
  return `${dateText(startDate)}, ${timeText(startTime)} → ${until} (${durationText(minutes)})`;
}

/* ── Calendario ───────────────────────────────────────────────────────── */

/**
 * Semanas (de lunes a domingo) del mes; `null` en las casillas de otros
 * meses. `month` va de 0 a 11.
 */
export function monthGrid(year: number, month: number): (string | null)[][] {
  const first = new Date(Date.UTC(year, month, 1));
  const days = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const lead = (first.getUTCDay() + 6) % 7;
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= days; day++) {
    cells.push(`${year}-${pad(month + 1)}-${pad(day)}`);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }
  return weeks;
}

/* ── Actividades frente al rango del evento ───────────────────────────── */

/** Actividades que quedan (del todo o en parte) fuera del rango del evento. */
export function activitiesOutside<T extends { hora_inicio: string; hora_fin: string }>(
  activities: readonly T[],
  startIso: string,
  endIso: string,
): T[] {
  const start = new Date(startIso).getTime();
  const end = new Date(endIso).getTime();
  return activities.filter(
    (a) =>
      new Date(a.hora_inicio).getTime() < start ||
      new Date(a.hora_fin).getTime() > end,
  );
}
