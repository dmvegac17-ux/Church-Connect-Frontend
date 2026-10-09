/** Formatea una fecha ISO del backend a algo legible en es-CO. */
export function formatDate(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleDateString("es-CO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

/** Formatea una fecha+hora ISO del backend a algo legible en es-CO. */
export function formatDateTime(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleString("es-CO", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Formatea solo la hora (`HH:mm`) local de un ISO datetime del backend. */
export function formatTime(iso: string | null): string {
  if (!iso) {
    return "—";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  return date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Formatea minutos como `"1h 30m"` / `"45m"` / `"0m"`. Negativo antepone `-`. */
export function formatDurationMinutes(totalMinutes: number): string {
  const sign = totalMinutes < 0 ? "-" : "";
  const abs = Math.round(Math.abs(totalMinutes));
  const hours = Math.floor(abs / 60);
  const minutes = abs % 60;
  if (hours === 0) {
    return `${sign}${minutes}m`;
  }
  return `${sign}${hours}h ${minutes}m`;
}

/** Convierte un ISO datetime del backend al valor local que espera un `<input type="datetime-local">`. */
export function toDatetimeLocalValue(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** Convierte el valor de un `<input type="datetime-local">` (hora local) a ISO datetime para el backend. */
export function fromDatetimeLocalValue(local: string): string {
  return new Date(local).toISOString();
}

/**
 * Divide un ISO datetime del backend en fecha (`YYYY-MM-DD`) y hora (`HH:mm`)
 * locales, para usar en un `<input type="date">` + `<input type="time">`
 * separados en vez de un único `datetime-local` (cuyo selector nativo del
 * navegador arranca en la hora actual y dificulta elegir cualquier hora libremente).
 */
export function toDateAndTimeValues(iso: string): { date: string; time: string } {
  const full = toDatetimeLocalValue(iso);
  if (!full) {
    return { date: "", time: "" };
  }
  const [date, time] = full.split("T");
  return { date, time };
}

/** Combina una fecha (`YYYY-MM-DD`) y una hora (`HH:mm`) locales en un ISO datetime para el backend. */
export function fromDateAndTimeValues(date: string, time: string): string {
  return fromDatetimeLocalValue(`${date}T${time}`);
}
