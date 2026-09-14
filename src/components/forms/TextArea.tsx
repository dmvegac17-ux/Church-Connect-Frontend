import {
  forwardRef,
  useId,
  type TextareaHTMLAttributes,
} from "react";

interface TextAreaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "id"> {
  label: string;
  error?: string;
  hint?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  function TextArea({ label, error, hint, className = "", ...props }, ref) {
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
        <textarea
          ref={ref}
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`w-full rounded-lg border bg-input-background px-3 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 ${
            error
              ? "border-destructive focus:border-destructive"
              : "border-border focus:border-ring"
          } ${className}`}
          {...props}
        />
        {hint && !error ? (
          <p id={`${id}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        ) : null}
        {error ? (
          <p id={`${id}-error`} className="text-xs font-medium text-destructive">
            {error}
          </p>
        ) : null}
      </div>
    );
  },
);
