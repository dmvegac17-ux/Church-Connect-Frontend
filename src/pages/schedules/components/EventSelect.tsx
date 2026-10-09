import { useId } from "react";

import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import {
  controlClass,
  FieldError,
  LABEL_CLASS,
} from "../../../components/forms/fieldStyles";
import { useEventOptions } from "../../../hooks/useEventOptions";

interface EventSelectProps {
  value: string;
  onChange: (eventoId: string) => void;
  error?: string;
  disabled?: boolean;
  name?: string;
  label?: string;
  placeholder?: string;
  /** Etiqueta pequeña (13px), para barras de filtros. */
  compact?: boolean;
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
  compact = false,
}: EventSelectProps) {
  const autoId = useId();
  const id = `field-${name}-${autoId}`;
  const { events, isLoading, error: loadError } = useEventOptions();

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label
        htmlFor={id}
        className={
          compact ? "text-[13px] font-bold text-text-secondary" : LABEL_CLASS
        }
      >
        {label}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        disabled={disabled || isLoading}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={controlClass(Boolean(error), "h-[var(--control-h)] px-2.5")}
      >
        <option value="">{isLoading ? "Cargando eventos…" : placeholder}</option>
        {events.map((ev) => (
          <option key={ev.id} value={ev.id}>
            {ev.titulo}
          </option>
        ))}
      </select>
      {loadError ? <ErrorAlert error={loadError} /> : null}
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}
