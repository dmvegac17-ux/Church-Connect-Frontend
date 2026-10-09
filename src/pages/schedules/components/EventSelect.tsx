import { useId } from "react";

import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { useEventOptions } from "../../../hooks/useEventOptions";

interface EventSelectProps {
  value: string;
  onChange: (eventoId: string) => void;
  error?: string;
  disabled?: boolean;
  name?: string;
  label?: string;
  placeholder?: string;
  /** `true` en selects de filtro, donde "sin selección" es válido (no se marca obligatorio). */
  optional?: boolean;
}

/** Selector de evento alimentado por `useEventOptions` (lectura liviana, sin paginar). */
export function EventSelect({
  value,
  onChange,
  error,
  disabled,
  name = "evento_id",
  label = "Evento",
  placeholder = "Selecciona un evento…",
  optional = false,
}: EventSelectProps) {
  const autoId = useId();
  const id = `field-${name}-${autoId}`;
  const { events, isLoading, error: loadError } = useEventOptions();

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {optional ? null : (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        )}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        disabled={disabled || isLoading}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded-lg border bg-input-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 ${
          error
            ? "border-destructive focus:border-destructive"
            : "border-border focus:border-ring"
        }`}
      >
        <option value="">{isLoading ? "Cargando eventos…" : placeholder}</option>
        {events.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.titulo}
          </option>
        ))}
      </select>
      {loadError ? <ErrorAlert error={loadError} /> : null}
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
