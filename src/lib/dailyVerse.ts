import { DAILY_VERSES, type DailyVerse } from "../data/dailyVerses";

/** Día del año (1–365, o 366 en bisiesto) según la fecha local. */
export function dayOfYear(date: Date): number {
  // Se compara en UTC con los componentes locales para que los cambios de
  // horario de verano no desplacen el conteo.
  const today = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  const startOfYear = Date.UTC(date.getFullYear(), 0, 0);
  return Math.round((today - startOfYear) / 86_400_000);
}

/**
 * Versículo que corresponde a la fecha dada. El ciclo dura 365 días: el día
 * 366 de un año bisiesto vuelve al primer versículo, igual que el 1 de enero.
 */
export function verseForDate(date: Date = new Date()): DailyVerse {
  return DAILY_VERSES[(dayOfYear(date) - 1) % DAILY_VERSES.length];
}

/** Milisegundos que faltan para la próxima medianoche local. */
export function msUntilNextDay(date: Date = new Date()): number {
  const next = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + 1,
  );
  return next.getTime() - date.getTime();
}
