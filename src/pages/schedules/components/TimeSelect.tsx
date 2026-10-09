import { useId } from "react";

import {
  controlClass,
  FieldError,
  HINT_CLASS,
  LABEL_CLASS,
} from "../../../components/forms/fieldStyles";

interface TimeSelectProps {
  label: string;
  /** Valor combinado 24h `HH:mm`, o `""` si no se ha elegido nada. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  name?: string;
  /** Hora mínima permitida, 24h `HH:mm` (inclusive). Deshabilita horas/minutos anteriores. */
  minTime?: string;
  /** Hora máxima permitida, 24h `HH:mm` (inclusive). Deshabilita horas/minutos posteriores. */
  maxTime?: string;
  disabled?: boolean;
  /** Etiqueta de 13px (modal de cronograma). */
  compact?: boolean;
}

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

const HOURS_12 = Array.from({ length: 12 }, (_, i) =>
  String(i + 1).padStart(2, "0"),
);
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

type Period = "AM" | "PM";

function to12Hour(hour24: number): { hour12: string; period: Period } {
  const period: Period = hour24 < 12 ? "AM" : "PM";
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return { hour12: String(hour12).padStart(2, "0"), period };
}

function to24Hour(hour12: number, period: Period): number {
  const h = hour12 % 12;
  return period === "PM" ? h + 12 : h;
}

/**
 * Selector de hora en formato 12h (con AM/PM) hecho de tres `<select>`
 * planos — hora 01–12, minuto 00–59, AM/PM — alineados en una misma fila,
 * en vez de `<input type="time">`: el picker nativo del navegador/SO muestra
 * una lista desplazable con solo unos pocos valores visibles a la vez, lo
 * que hace parecer que no se puede elegir cualquier hora/minuto.
 * Internamente el valor sigue viajando en 24h (`HH:mm`) para el resto del
 * formulario y para el backend. Con `minTime`/`maxTime`, las opciones fuera
 * del rango quedan deshabilitadas.
 */
export function TimeSelect({
  label,
  value,
  onChange,
  error,
  hint,
  name = "hora",
  minTime,
  maxTime,
  disabled,
  compact = false,
}: TimeSelectProps) {
  const autoId = useId();
  const id = `field-${name}-${autoId}`;
  const [hh24Str, mm] = value ? value.split(":") : ["", ""];
  const hh24 = hh24Str === "" ? null : Number(hh24Str);
  const { hour12, period } =
    hh24 === null ? { hour12: "", period: "" as const } : to12Hour(hh24);

  const minMinutes = minTime ? toMinutes(minTime) : null;
  const maxMinutes = maxTime ? toMinutes(maxTime) : null;
  const hasRange = minMinutes !== null || maxMinutes !== null;

  const hourIntersectsRange = (candidateHh24: number): boolean => {
    const start = candidateHh24 * 60;
    const end = start + 59;
    if (minMinutes !== null && end < minMinutes) {
      return false;
    }
    if (maxMinutes !== null && start > maxMinutes) {
      return false;
    }
    return true;
  };

  const inRange = (total: number): boolean =>
    (minMinutes === null || total >= minMinutes) &&
    (maxMinutes === null || total <= maxMinutes);

  const selectClass = controlClass(
    Boolean(error),
    "h-[var(--control-h)] min-w-0 flex-1 px-2",
  );

  const emit = (nextHour12: string, nextPeriod: string, nextMm: string) => {
    const hour12Num = Number(nextHour12 || "12");
    let periodValue: Period = nextPeriod === "PM" ? "PM" : "AM";
    // Sin a. m./p. m. elegido, se toma el que cae dentro del rango permitido.
    if (!nextPeriod && hasRange && !hourIntersectsRange(to24Hour(hour12Num, "AM"))) {
      periodValue = "PM";
    }
    const hh = to24Hour(hour12Num, periodValue);
    let minutes = Number(nextMm || "0");
    // Al cambiar de hora, el minuto se ajusta al primero permitido.
    if (hasRange && !inRange(hh * 60 + minutes)) {
      const firstValid = MINUTES.map(Number).find((m) => inRange(hh * 60 + m));
      if (firstValid !== undefined) {
        minutes = firstValid;
      }
    }
    onChange(
      `${String(hh).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`,
    );
  };

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label
        htmlFor={id}
        className={compact ? "text-[13px] font-bold text-foreground" : LABEL_CLASS}
      >
        {label}
      </label>
      <div className="flex items-center gap-1.5">
        <select
          id={id}
          aria-label={`${label}: hora`}
          aria-invalid={error ? true : undefined}
          disabled={disabled}
          value={hour12}
          onChange={(e) => emit(e.target.value, period, mm)}
          className={selectClass}
        >
          <option value="" disabled>
            HH
          </option>
          {HOURS_12.map((h) => {
            const hNum = Number(h);
            const optionDisabled =
              hasRange &&
              !hourIntersectsRange(to24Hour(hNum, "AM")) &&
              !hourIntersectsRange(to24Hour(hNum, "PM"));
            return (
              <option key={h} value={h} disabled={optionDisabled}>
                {h}
              </option>
            );
          })}
        </select>
        <span className="font-bold text-muted-foreground" aria-hidden="true">
          :
        </span>
        <select
          aria-label={`${label}: minutos`}
          aria-invalid={error ? true : undefined}
          disabled={disabled}
          value={mm}
          onChange={(e) => emit(hour12, period, e.target.value)}
          className={selectClass}
        >
          <option value="" disabled>
            MM
          </option>
          {MINUTES.map((m) => (
            <option
              key={m}
              value={m}
              disabled={hh24 !== null && !inRange(hh24 * 60 + Number(m))}
            >
              {m}
            </option>
          ))}
        </select>
        <select
          aria-label={`${label}: a. m. o p. m.`}
          aria-invalid={error ? true : undefined}
          disabled={disabled}
          value={period}
          onChange={(e) => emit(hour12, e.target.value, mm)}
          className={selectClass}
        >
          <option value="" disabled>
            —
          </option>
          {(["AM", "PM"] as const).map((p) => (
            <option
              key={p}
              value={p}
              disabled={
                hour12 !== "" &&
                hasRange &&
                !hourIntersectsRange(to24Hour(Number(hour12), p))
              }
            >
              {p === "AM" ? "a. m." : "p. m."}
            </option>
          ))}
        </select>
      </div>
      {error ? <FieldError>{error}</FieldError> : null}
      {hint && !error ? <p className={HINT_CLASS}>{hint}</p> : null}
    </div>
  );
}
