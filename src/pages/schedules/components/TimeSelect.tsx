import { useId } from "react";

interface TimeSelectProps {
  label: string;
  /** Valor combinado 24h `HH:mm`, o `""` si no se ha elegido nada. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
  name?: string;
  /** Hora mínima permitida, 24h `HH:mm` (inclusive). Deshabilita horas/minutos anteriores. */
  minTime?: string;
  /** Hora máxima permitida, 24h `HH:mm` (inclusive). Deshabilita horas/minutos posteriores. */
  maxTime?: string;
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
 * planos — hora 01–12, minuto 00–59, AM/PM — en vez de `<input type="time">`:
 * el picker nativo del navegador/SO muestra una lista desplazable con solo
 * unos pocos valores visibles a la vez, lo que hace parecer que no se puede
 * elegir cualquier hora/minuto. Con `<select>` se ven todas las opciones sin
 * scroll. Internamente el valor sigue viajando en 24h (`HH:mm`) para el resto
 * del formulario y para el backend.
 */
export function TimeSelect({
  label,
  value,
  onChange,
  error,
  name = "hora",
  minTime,
  maxTime,
}: TimeSelectProps) {
  const autoId = useId();
  const id = `field-${name}-${autoId}`;
  const [hh24Str, mm] = value ? value.split(":") : ["", ""];
  const hh24 = hh24Str === "" ? null : Number(hh24Str);
  const { hour12, period } = hh24 === null ? { hour12: "", period: "" as const } : to12Hour(hh24);

  const minMinutes = minTime ? toMinutes(minTime) : null;
  const maxMinutes = maxTime ? toMinutes(maxTime) : null;

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

  const selectClass = `w-full rounded-lg border bg-input-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 ${
    error
      ? "border-destructive focus:border-destructive"
      : "border-border focus:border-ring"
  }`;

  const emit = (nextHour12: string, nextPeriod: string, nextMm: string) => {
    const hour12Num = Number(nextHour12 || "12");
    const periodValue: Period = nextPeriod === "PM" ? "PM" : "AM";
    const hh = to24Hour(hour12Num, periodValue);
    onChange(`${String(hh).padStart(2, "0")}:${nextMm || "00"}`);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        <span className="ml-0.5 text-destructive" aria-hidden="true">
          *
        </span>
      </label>
      <div className="flex items-center gap-2">
        <select
          id={id}
          aria-label={`${label} — hora`}
          aria-invalid={error ? true : undefined}
          value={hour12}
          onChange={(e) => emit(e.target.value, period, mm)}
          className={selectClass}
        >
          <option value="" disabled>
            HH
          </option>
          {HOURS_12.map((h) => {
            const hNum = Number(h);
            const disabled =
              (minMinutes !== null || maxMinutes !== null) &&
              !hourIntersectsRange(to24Hour(hNum, "AM")) &&
              !hourIntersectsRange(to24Hour(hNum, "PM"));
            return (
              <option key={h} value={h} disabled={disabled}>
                {h}
              </option>
            );
          })}
        </select>
        <span className="text-muted-foreground" aria-hidden="true">
          :
        </span>
        <select
          aria-label={`${label} — minutos`}
          aria-invalid={error ? true : undefined}
          value={mm}
          onChange={(e) => emit(hour12, period, e.target.value)}
          className={selectClass}
        >
          <option value="" disabled>
            MM
          </option>
          {MINUTES.map((m) => {
            const disabled =
              hh24 !== null &&
              (() => {
                const total = hh24 * 60 + Number(m);
                return (
                  (minMinutes !== null && total < minMinutes) ||
                  (maxMinutes !== null && total > maxMinutes)
                );
              })();
            return (
              <option key={m} value={m} disabled={disabled}>
                {m}
              </option>
            );
          })}
        </select>
        <select
          aria-label={`${label} — a. m. / p. m.`}
          aria-invalid={error ? true : undefined}
          value={period}
          onChange={(e) => emit(hour12, e.target.value, mm)}
          className={selectClass}
        >
          <option value="" disabled>
            AM/PM
          </option>
          {(["AM", "PM"] as const).map((p) => {
            const disabled =
              hour12 !== "" &&
              (minMinutes !== null || maxMinutes !== null) &&
              !hourIntersectsRange(to24Hour(Number(hour12), p));
            return (
              <option key={p} value={p} disabled={disabled}>
                {p === "AM" ? "a. m." : "p. m."}
              </option>
            );
          })}
        </select>
      </div>
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
