import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";

interface TextFieldProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id"> {
  label: string;
  error?: string;
  hint?: string;
  /** Icono decorativo a la izquierda del input. */
  icon?: ReactNode;
}

export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  function TextField(
    { label, error, hint, icon, className = "", ...props },
    ref,
  ) {
    const autoId = useId();
    const id = props.name ? `field-${props.name}` : autoId;
    const describedBy = error
      ? `${id}-error`
      : hint
        ? `${id}-hint`
        : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
          {props.required ? (
            <span className="ml-0.5 text-destructive" aria-hidden="true">
              *
            </span>
          ) : null}
        </label>
        <div className="relative">
          {icon ? (
            <span
              className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-muted-foreground"
              aria-hidden="true"
            >
              {icon}
            </span>
          ) : null}
          <input
            ref={ref}
            id={id}
            aria-invalid={error ? true : undefined}
            aria-describedby={describedBy}
            className={`w-full rounded-lg border bg-input-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 ${
              icon ? "pl-10" : ""
            } ${
              error
                ? "border-destructive focus:border-destructive"
                : "border-border focus:border-ring"
            } ${className}`}
            {...props}
          />
        </div>
        {hint && !error ? (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
        {error ? (
          <p
            id={`${id}-error`}
            className="text-xs font-medium text-destructive"
          >
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
