import { Eye, EyeOff } from "lucide-react";
import {
  forwardRef,
  useId,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import {
  controlClass,
  FieldError,
  HINT_CLASS,
  LABEL_CLASS,
  OptionalMark,
} from "./fieldStyles";

interface PasswordFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> {
  label: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  /** Añade "(opcional)" a la etiqueta. */
  optional?: boolean;
}

/** Cada campo lleva su propio botón de mostrar/ocultar. */
export const PasswordField = forwardRef<HTMLInputElement, PasswordFieldProps>(
  function PasswordField(
    { label, error, hint, icon, optional, className = "", required, ...props },
    ref,
  ) {
    const autoId = useId();
    const id = props.name ? `field-${props.name}` : autoId;
    const [visible, setVisible] = useState(false);
    const describedBy = error
      ? `${id}-error`
      : hint
        ? `${id}-hint`
        : undefined;

    return (
      <div className="flex min-w-0 flex-col gap-1.5">
        <label htmlFor={id} className={LABEL_CLASS}>
          {label}
          {optional ? <OptionalMark /> : null}
        </label>
        <div className="relative">
          {icon ? (
            <span
              className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-icon-muted"
              aria-hidden="true"
            >
              {icon}
            </span>
          ) : null}
          <input
            ref={ref}
            id={id}
            type={visible ? "text" : "password"}
            aria-invalid={error ? true : undefined}
            aria-required={required || undefined}
            aria-describedby={describedBy}
            className={controlClass(
              Boolean(error),
              `h-[var(--control-h)] pr-12 ${icon ? "pl-[42px]" : ""} ${className}`,
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Ocultar contraseña" : "Mostrar contraseña"}
            aria-pressed={visible}
            className="absolute inset-y-0.5 right-0.5 flex w-10 items-center justify-center rounded-lg text-muted-foreground hover:bg-hover-icon hover:text-foreground"
          >
            {visible ? (
              <EyeOff className="size-5" aria-hidden="true" />
            ) : (
              <Eye className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>
        {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
        {hint && !error ? (
          <p id={`${id}-hint`} className={HINT_CLASS}>
            {hint}
          </p>
        ) : null}
      </div>
    );
  },
);
