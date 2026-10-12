import { CalendarDays, ChevronLeft, ChevronRight, Clock, Info } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import {
  adjustEnd,
  clampTime,
  dateText,
  dayBlocked,
  endBounds,
  hourEnabled,
  joinWall,
  later,
  longDateText,
  minuteEnabled,
  monthGrid,
  MONTHS_LONG,
  nowWall,
  periodEnabled,
  rangeSummary,
  resolveTime,
  startBounds,
  timeText,
  timeWindow,
  to12Hour,
  to24Hour,
  type Bounds,
  type Period,
  type TimeWindow,
} from "../../lib/dateTimeRange";
import { controlClass, FieldError, LABEL_CLASS } from "./fieldStyles";

/** Fechas `YYYY-MM-DD` y horas 24 h `HH:mm`, en hora de Colombia; `""` = sin elegir. */
export interface DateTimeRangeValue {
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
}

export type DateTimeField = keyof DateTimeRangeValue;

interface DateTimeRangePickerProps {
  value: DateTimeRangeValue;
  /** `field` es el control que tocó la persona (el fin puede cambiar con él). */
  onChange: (next: DateTimeRangeValue, field: DateTimeField) => void;
  /** Primer momento elegible (`YYYY-MM-DDTHH:mm`): hoy, o el inicio del evento padre. */
  min?: string;
  /** Último momento elegible: el fin del evento padre. */
  max?: string;
  /** Minutos que deben separar el inicio del fin. */
  minDurationMinutes?: number;
  /** Salto entre minutos ofrecidos (1 = todos). */
  minuteStep?: number;
  /** Todo ocurre ese día (evento de un solo día): no se muestra calendario. */
  fixedDate?: string;
  /** Al elegir un día sin hora, propone la primera hora disponible. */
  autoTime?: boolean;
  errors?: Partial<Record<DateTimeField, string>>;
  labels?: Partial<Record<DateTimeField, string>>;
  /** Etiquetas de 13px (modal de cronograma). */
  compact?: boolean;
}

const LABELS: Record<DateTimeField, string> = {
  startDate: "Fecha de inicio",
  startTime: "Hora de inicio",
  endDate: "Fecha de fin",
  endTime: "Hora de fin",
};

const FULL_DAY: TimeWindow = [0, 23 * 60 + 59];
const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);
const WEEKDAY_HEADERS = ["L", "M", "M", "J", "V", "S", "D"];
const PERIODS: { value: Period; text: string }[] = [
  { value: "AM", text: "a. m." },
  { value: "PM", text: "p. m." },
];

/** "4:00 p. m.", o con su día si no es el mismo que el de referencia. */
function momentText(wall: string, sameDateAs: string): string {
  const [date, time] = wall.split("T");
  return date === sameDateAs ? timeText(time) : `${dateText(date)}, ${timeText(time)}`;
}

/**
 * Selector de un rango de fecha y hora (inicio → fin) para eventos y
 * actividades. Lo que no se puede elegir aparece deshabilitado: días fuera
 * del rango, y horas, minutos y a. m./p. m. que dejarían el fin antes del
 * inicio o fuera de `min`/`max`. Si al mover el inicio el fin deja de valer,
 * se corrige y se avisa, en vez de borrarlo.
 */
export function DateTimeRangePicker({
  value,
  onChange,
  min,
  max,
  minDurationMinutes = 1,
  minuteStep = 1,
  fixedDate,
  autoTime = false,
  errors = {},
  labels = {},
  compact = false,
}: DateTimeRangePickerProps) {
  const [notice, setNotice] = useState("");
  const text = { ...LABELS, ...labels };

  const current: DateTimeRangeValue = {
    ...value,
    startDate: fixedDate ?? value.startDate,
    // Sin día de fin todavía, se asume el del inicio.
    endDate: fixedDate ?? (value.endDate || value.startDate),
  };
  const bounds: Bounds = { min, max };
  const forStart = startBounds(bounds, minDurationMinutes);
  const endBoundsOf = (v: DateTimeRangeValue): Bounds => {
    const start = joinWall(v.startDate, v.startTime);
    return start
      ? endBounds(start, bounds, minDurationMinutes)
      : // Con día de inicio pero sin hora, el fin al menos no va antes de ese día.
        { min: later(min, v.startDate ? `${v.startDate}T00:00` : undefined), max };
  };
  const forEnd = endBoundsOf(current);

  const emit = (draft: DateTimeRangeValue, field: DateTimeField) => {
    const next = { ...draft };
    const fromStart = field === "startDate" || field === "startTime";
    let message = "";

    if (fromStart && next.startDate) {
      const window = timeWindow(next.startDate, forStart);
      if (window && next.startTime) {
        next.startTime = clampTime(next.startTime, window);
      } else if (window && autoTime) {
        next.startTime = clampTime("00:00", window);
      }
      if (!next.endDate || next.endDate < next.startDate) {
        next.endDate = next.startDate;
      }
    }
    if (field === "endDate" && autoTime && !next.endTime) {
      const window = timeWindow(next.endDate, endBoundsOf(next));
      if (window) {
        next.endTime = clampTime("00:00", window);
      }
    }

    const start = joinWall(next.startDate, next.startTime);
    const fixed = adjustEnd(
      start,
      joinWall(next.endDate, next.endTime),
      minDurationMinutes,
      max,
    );
    if (fixed) {
      [next.endDate, next.endTime] = fixed.split("T");
      const when = momentText(fixed, next.startDate);
      message = fromStart
        ? `Ajustamos la hora de fin a ${when} porque cambiaste el inicio.`
        : `Ajustamos la hora de fin a ${when}: debe ser posterior a la de inicio.`;
    }

    setNotice(message);
    onChange(next, field);
  };

  const summary = rangeSummary(
    joinWall(current.startDate, current.startTime),
    joinWall(current.endDate, current.endTime),
  );

  const timeField = (field: "startTime" | "endTime") => {
    const isStart = field === "startTime";
    const date = isStart ? current.startDate : current.endDate;
    return (
      <TimeField
        label={text[field]}
        time={current[field]}
        window={date ? timeWindow(date, isStart ? forStart : forEnd) : FULL_DAY}
        step={minuteStep}
        error={errors[field]}
        compact={compact}
        onChange={(time) => emit({ ...current, [field]: time }, field)}
      />
    );
  };

  return (
    <div className="flex flex-col gap-3">
      {fixedDate ? (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          {timeField("startTime")}
          {timeField("endTime")}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-3.5 md:grid-cols-2">
          <DateField
            label={text.startDate}
            date={current.startDate}
            bounds={forStart}
            error={errors.startDate}
            compact={compact}
            onChange={(date) => emit({ ...current, startDate: date }, "startDate")}
          />
          {timeField("startTime")}
          <DateField
            label={text.endDate}
            date={current.endDate}
            bounds={forEnd}
            error={errors.endDate}
            compact={compact}
            onChange={(date) => emit({ ...current, endDate: date }, "endDate")}
          />
          {timeField("endTime")}
        </div>
      )}

      {notice ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-[10px] border border-info-border bg-info-soft px-3 py-2 text-sm leading-snug text-info-foreground"
        >
          <Info className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
          {notice}
        </p>
      ) : null}
      {summary ? (
        <p
          className={`flex items-start gap-2 font-semibold text-text-strong ${
            compact ? "text-[13px]" : "text-sm"
          }`}
        >
          <Clock className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
          {summary}
        </p>
      ) : null}
    </div>
  );
}

/* ── Fecha: botón que abre un calendario mensual ──────────────────────── */

function DateField({
  label,
  date,
  bounds,
  error,
  compact,
  onChange,
}: {
  label: string;
  date: string;
  bounds: Bounds;
  error?: string;
  compact: boolean;
  onChange: (date: string) => void;
}) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const today = nowWall().split("T")[0];
  const [view, setView] = useState({ year: 0, month: 0 });

  const show = () => {
    // Se abre en el mes del día elegido; si no hay, en el primero elegible.
    const anchor = date || (bounds.min && bounds.min.split("T")[0] > today
      ? bounds.min.split("T")[0]
      : today);
    const [year, month] = anchor.split("-").map(Number);
    setView({ year, month: month - 1 });
    setOpen(true);
  };
  const close = (returnFocus: boolean) => {
    setOpen(false);
    if (returnFocus) {
      buttonRef.current?.focus();
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  // Al abrir (o cambiar de mes), el foco va al día elegido o al primero libre.
  useEffect(() => {
    if (!open) {
      return;
    }
    const grid = gridRef.current;
    const target =
      grid?.querySelector<HTMLButtonElement>('button[aria-pressed="true"]:not(:disabled)') ??
      grid?.querySelector<HTMLButtonElement>("button:not(:disabled)");
    target?.focus();
  }, [open, view]);

  const move = (delta: number) =>
    setView(({ year, month }) => {
      const next = new Date(Date.UTC(year, month + delta, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() };
    });

  const navClass =
    "flex size-9 items-center justify-center rounded-lg text-text-secondary hover:bg-hover-icon hover:text-foreground";

  return (
    <div
      ref={rootRef}
      className="relative flex min-w-0 flex-col gap-1.5"
      onKeyDown={(e) => {
        if (e.key === "Escape" && open) {
          e.stopPropagation();
          close(true);
        }
      }}
    >
      <label htmlFor={id} className={compact ? "text-[13px] font-bold" : LABEL_CLASS}>
        {label}
      </label>
      <button
        ref={buttonRef}
        id={id}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-invalid={error ? true : undefined}
        onClick={() => (open ? close(false) : show())}
        className={controlClass(
          Boolean(error),
          "flex h-[var(--control-h)] items-center justify-between gap-2 text-left",
        )}
      >
        <span className={date ? "" : "text-muted-foreground"}>
          {date ? dateText(date) : "Elegir fecha"}
        </span>
        <CalendarDays className="size-[18px] shrink-0 text-icon-muted" aria-hidden="true" />
      </button>
      {error ? <FieldError>{error}</FieldError> : null}

      {open ? (
        <div
          role="dialog"
          aria-label={`Calendario: ${label}`}
          className="absolute top-full left-0 z-30 mt-1.5 w-[296px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-card p-3 shadow-[0_12px_32px_rgba(0,0,0,0.16)]"
        >
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              className={navClass}
              aria-label="Mes anterior"
              onClick={() => move(-1)}
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </button>
            <span className="text-sm font-extrabold capitalize" aria-live="polite">
              {MONTHS_LONG[view.month]} {view.year}
            </span>
            <button
              type="button"
              className={navClass}
              aria-label="Mes siguiente"
              onClick={() => move(1)}
            >
              <ChevronRight className="size-5" aria-hidden="true" />
            </button>
          </div>
          <div
            className="grid grid-cols-7 gap-0.5 text-center text-xs font-bold text-muted-foreground"
            aria-hidden="true"
          >
            {WEEKDAY_HEADERS.map((day, i) => (
              <span key={i} className="py-1">
                {day}
              </span>
            ))}
          </div>
          <div ref={gridRef} className="grid grid-cols-7 gap-0.5">
            {monthGrid(view.year, view.month)
              .flat()
              .map((day, i) =>
                day ? (
                  <button
                    key={day}
                    type="button"
                    data-date={day}
                    aria-label={longDateText(day)}
                    aria-pressed={day === date}
                    disabled={dayBlocked(day, bounds)}
                    onClick={() => {
                      onChange(day);
                      close(true);
                    }}
                    className={`flex h-9 items-center justify-center rounded-lg text-sm transition-colors disabled:cursor-not-allowed disabled:text-icon-disabled disabled:line-through ${
                      day === date
                        ? "bg-primary font-extrabold text-primary-foreground"
                        : `font-semibold text-foreground enabled:hover:bg-primary-soft ${
                            day === today ? "ring-1 ring-primary ring-inset" : ""
                          }`
                    }`}
                  >
                    {Number(day.slice(8))}
                  </button>
                ) : (
                  <span key={`empty-${i}`} />
                ),
              )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ── Hora: 1–12, minutos y botones a. m. / p. m. ──────────────────────── */

function TimeField({
  label,
  time,
  window,
  step,
  error,
  compact,
  onChange,
}: {
  label: string;
  time: string;
  /** `null`: el día está fuera del rango y no admite ninguna hora. */
  window: TimeWindow | null;
  step: number;
  error?: string;
  compact: boolean;
  onChange: (time: string) => void;
}) {
  const id = useId();
  const current = time ? to12Hour(time) : null;
  const range: TimeWindow = window ?? [1, 0];
  const selectClass = controlClass(Boolean(error), "h-[var(--control-h)] px-2");

  const hourOk = (hour: number) =>
    current
      ? hourEnabled(hour, current.period, range)
      : hourEnabled(hour, "AM", range) || hourEnabled(hour, "PM", range);

  const pickHour = (hour: number) => {
    const period = current?.period ?? (hourEnabled(hour, "AM", range) ? "AM" : "PM");
    onChange(resolveTime(hour, current?.minute ?? 0, period, range));
  };

  const pickPeriod = (period: Period) => {
    // Dentro de esa mitad del día, lo más cercano a la hora que ya había.
    const half: TimeWindow =
      period === "AM"
        ? [range[0], Math.min(range[1], 11 * 60 + 59)]
        : [Math.max(range[0], 12 * 60), range[1]];
    const wanted = current
      ? to24Hour(current.hour12, current.minute, period)
      : period === "AM"
        ? "00:00"
        : "12:00";
    onChange(clampTime(wanted, half));
  };

  const minutes = Array.from({ length: 60 }, (_, m) => m).filter(
    (m) => m % step === 0 || m === current?.minute,
  );

  return (
    <div role="group" aria-labelledby={id} className="flex min-w-0 flex-col gap-1.5">
      <span id={id} className={compact ? "text-[13px] font-bold" : LABEL_CLASS}>
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <select
          aria-label={`${label}: hora`}
          aria-invalid={error ? true : undefined}
          value={current ? String(current.hour12) : ""}
          onChange={(e) => pickHour(Number(e.target.value))}
          className={selectClass}
        >
          <option value="" disabled>
            --
          </option>
          {HOURS.map((hour) => (
            <option key={hour} value={hour} disabled={!hourOk(hour)}>
              {hour}
            </option>
          ))}
        </select>
        <span className="font-bold text-text-secondary" aria-hidden="true">
          :
        </span>
        <select
          aria-label={`${label}: minutos`}
          aria-invalid={error ? true : undefined}
          value={current ? String(current.minute) : ""}
          disabled={!current}
          onChange={(e) =>
            current &&
            onChange(to24Hour(current.hour12, Number(e.target.value), current.period))
          }
          className={selectClass}
        >
          <option value="" disabled>
            --
          </option>
          {minutes.map((minute) => (
            <option
              key={minute}
              value={minute}
              disabled={
                !current ||
                !minuteEnabled(current.hour12, current.period, minute, range)
              }
            >
              {String(minute).padStart(2, "0")}
            </option>
          ))}
        </select>
        <div
          className={`flex h-[var(--control-h)] shrink-0 gap-0.5 rounded-[10px] border bg-field p-0.5 ${
            error ? "border-destructive" : "border-input"
          }`}
        >
          {PERIODS.map(({ value, text }) => {
            const selected = current?.period === value;
            return (
              <button
                key={value}
                type="button"
                aria-pressed={selected}
                disabled={!selected && !periodEnabled(value, range)}
                onClick={() => pickPeriod(value)}
                className={`rounded-lg px-2.5 text-sm font-bold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:text-icon-disabled disabled:line-through ${
                  selected
                    ? "bg-primary text-primary-foreground"
                    : "text-text-secondary enabled:hover:bg-primary-soft"
                }`}
              >
                {text}
              </button>
            );
          })}
        </div>
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}
