import { forwardRef, useId, type TextareaHTMLAttributes } from "react";

import {
  controlClass,
  FieldCounter,
  FieldError,
  HINT_CLASS,
  LABEL_CLASS,
  OptionalMark,
} from "./fieldStyles";

interface TextAreaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  label: string;
  error?: string;
  hint?: string;
  /** Oculta el contador de caracteres aunque se pase `maxLength`. */
  hideCounter?: boolean;
  /** Añade "(opcional)" a la etiqueta. */
  optional?: boolean;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea(
    {
      label,
      error,
      hint,
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
        <textarea
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-required={required || undefined}
          aria-describedby={describedBy}
          className={controlClass(
            Boolean(error),
            `py-2.5 leading-normal ${className}`,
          )}
          {...props}
        />
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
