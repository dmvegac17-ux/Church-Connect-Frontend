import {
  Ban,
  CircleCheck,
  CircleX,
  Hourglass,
  Repeat,
  TimerOff,
  Undo2,
  type LucideIcon,
} from "lucide-react";

import type { PillTone } from "../components/ui/primitives";
import { ApiError } from "../types/api";
import type { ResponseStatus } from "../types/participation";

/* Presentación de invitaciones: fechas en America/Bogota y textos por estado. */

const LOCALE = "es-CO";
const TIME_ZONE = "America/Bogota";
const DAY_MS = 86_400_000;

/** Se emite cuando cambia una invitación propia (refresca el contador del menú). */
export const INVITATIONS_CHANGED_EVENT = "cc:invitations-changed";

function parts(
  date: Date,
  options: Intl.DateTimeFormatOptions,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    ...options,
  }).formatToParts(date)) {
    result[part.type] = part.value;
  }
  return result;
}

function toDate(value: string): Date {
  // `YYYY-MM-DD` es un día de calendario en Bogotá: se ancla al mediodía
  // para que ninguna zona horaria del navegador lo mueva de día.
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00-05:00` : value);
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "17 oct 2026" */
export function shortDate(value: string | null): string {
  if (!value) {
    return "—";
  }
  const p = parts(toDate(value), { day: "numeric", month: "short", year: "numeric" });
  return `${p.day} ${p.month.replace(".", "")} ${p.year}`;
}

/** "11 oct" */
export function dayMonth(value: string | null): string {
  if (!value) {
    return "—";
  }
  const p = parts(toDate(value), { day: "numeric", month: "short" });
  return `${p.day} ${p.month.replace(".", "")}`;
}

/** "Sábado, 17 de octubre" */
export function longDay(value: string): string {
  const p = parts(toDate(value), { weekday: "long", day: "numeric", month: "long" });
  return `${capitalize(p.weekday)}, ${p.day} de ${p.month}`;
}

/** Mes abreviado en mayúsculas y día: `{ month: "OCT", day: "17" }`. */
export function dateBlock(value: string): { month: string; day: string } {
  const p = parts(toDate(value), { day: "2-digit", month: "short" });
  return { month: p.month.replace(".", "").toUpperCase(), day: p.day };
}

/** "7:00 p. m." */
export function clockTime(iso: string): string {
  return new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function clockRange(startIso: string, endIso: string): string {
  return `${clockTime(startIso)} – ${clockTime(endIso)}`;
}

/** Día de calendario en Bogotá como número de día (para restar fechas). */
function bogotaDayNumber(date: Date): number {
  const p = parts(date, { year: "numeric", month: "2-digit", day: "2-digit" });
  return Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day)) / DAY_MS;
}

/** Días de calendario (Bogotá) desde hoy hasta `value`. Negativo si ya pasó. */
export function daysUntil(value: string, now: Date = new Date()): number {
  return bogotaDayNumber(toDate(value)) - bogotaDayNumber(now);
}

/** Fecha (`YYYY-MM-DD`, Bogotá) que resulta de sumar `days` a hoy. */
export function dateInDays(days: number, now: Date = new Date()): string {
  const p = parts(new Date(now.getTime() + days * DAY_MS), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return `${p.year}-${p.month}-${p.day}`;
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

interface StatusMeta {
  label: string;
  icon: LucideIcon;
  tone: PillTone;
  /** Estados cerrados sin acción: la tarjeta se atenúa. */
  muted?: boolean;
}

export const STATUS_META: Record<ResponseStatus, StatusMeta> = {
  pendiente: { label: "Pendiente", icon: Hourglass, tone: "warning" },
  aceptada: { label: "Aceptada", icon: CircleCheck, tone: "success" },
  rechazada: { label: "Rechazada", icon: CircleX, tone: "danger" },
  vencida: { label: "Vencida", icon: TimerOff, tone: "neutral", muted: true },
  cancelada: { label: "Cancelada", icon: Ban, tone: "neutral", muted: true },
  reasignada: { label: "Reasignada", icon: Repeat, tone: "neutral", muted: true },
  revocada: { label: "Revocada", icon: Undo2, tone: "neutral", muted: true },
};

/** Estado actual que el backend adjunta a un `409` (`data.estado_actual`). */
export function conflictStatus(error: unknown): ResponseStatus | null {
  if (!(error instanceof ApiError) || error.status !== 409) {
    return null;
  }
  const data = error.payload?.data as { estado_actual?: string } | null | undefined;
  const status = data?.estado_actual;
  return status && status in STATUS_META ? (status as ResponseStatus) : null;
}

/** Datos que acompañan a un `422` de plazo o participante. */
export function validationField(
  error: unknown,
): "dias_para_confirmar" | "participante_id" | null {
  if (!(error instanceof ApiError) || error.status !== 422) {
    return null;
  }
  const data = error.payload?.data as { campo?: string } | null | undefined;
  if (data?.campo === "dias_para_confirmar" || data?.campo === "participante_id") {
    return data.campo;
  }
  // Un entero mal formado lo rechaza el esquema, sin `campo`.
  return error.errors.some((e) => e.includes("dias_para_confirmar"))
    ? "dias_para_confirmar"
    : null;
}
