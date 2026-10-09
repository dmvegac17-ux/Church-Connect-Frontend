import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

import {
  controlClass,
  FieldCounter,
  FieldError,
  HINT_CLASS,
  LABEL_CLASS,
  OptionalMark,
} from "./fieldStyles";

interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  error?: string;
  hint?: string;
  /** Icono decorativo a la izquierda del input. */
  icon?: ReactNode;
  /** Oculta el contador de caracteres aunque se pase `maxLength`. */
  hideCounter?: boolean;
  /** Añade "(opcional)" a la etiqueta. */
  optional?: boolean;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    {
      label,
      error,
      hint,
      icon,
      hideCounter,
      optional,
      className = "",
      required,
      ...props
    },
    ref,
  ) {
    const autoId = useId();
    const id = props.name ? `field-${props.name}` : autoId;
    const describedBy = error
      ? `${id}-error`
      : hint
        ? `${id}-hint`
        : undefined;
    const showCounter = !hideCounter && typeof props.maxLength === "number";
    const currentLength =
      typeof props.value === "string" ? props.value.length : 0;

    return (
      <div className="flex min-w-0 flex-col gap-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <label htmlFor={id} className={LABEL_CLASS}>
            {label}
            {optional ? <OptionalMark /> : null}
          </label>
          {showCounter ? (
            <FieldCounter
              current={currentLength}
              max={props.maxLength as number}
            />
          ) : null}
        </div>
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
            aria-invalid={error ? true : undefined}
            aria-required={required || undefined}
            aria-describedby={describedBy}
            className={controlClass(
              Boolean(error),
              `h-[var(--control-h)] ${icon ? "pl-[42px]" : ""} ${className}`,
            )}
            {...props}
          />
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
