import { CircleAlert } from "lucide-react";
import type { ReactNode } from "react";

/** Etiqueta de campo: 14px / 700. */
export const LABEL_CLASS = "text-sm font-bold text-foreground";

/** Texto de ayuda bajo el campo. */
export const HINT_CLASS = "text-[13px] text-muted-foreground";

/**
 * Base visual de inputs, selects y textareas. El alto (`--control-h`) y el
 * fondo (`--field-bg`) los define el layout que contiene el campo.
 */
export const CONTROL_BASE_CLASS =
  "w-full rounded-[10px] border bg-field px-3 text-[15px] text-foreground transition-colors placeholder:text-muted-foreground focus-visible:border-primary focus-visible:bg-card focus-visible:outline-primary-soft-border focus-visible:outline-offset-0 disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-foreground";

export function controlClass(hasError: boolean, extra = ""): string {
  return `${CONTROL_BASE_CLASS} ${
    hasError ? "border-destructive" : "border-input"
  } ${extra}`;
}

/** Marca "(opcional)" junto a la etiqueta. */
export function OptionalMark() {
  return (
    <span className="font-normal text-muted-foreground"> (opcional)</span>
  );
}

/** Mensaje de error de un campo: icono + texto, no depende solo del color. */
export function FieldError({
  id,
  children,
}: {
  id?: string;
  children: ReactNode;
}) {
  return (
    <p
      id={id}
      role="alert"
      className="flex items-start gap-1.5 text-[13px] text-destructive"
    >
      <CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

/** Contador `n/máx` a la derecha de la etiqueta. */
export function FieldCounter({
  current,
  max,
}: {
  current: number;
  max: number;
}) {
  return (
    <span
      className={`text-[13px] font-normal tabular-nums ${
        current >= max * 0.9 ? "text-destructive" : "text-muted-foreground"
      }`}
    >
      {current}/{max}
    </span>
  );
}
