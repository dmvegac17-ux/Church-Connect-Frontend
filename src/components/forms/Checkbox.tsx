import { useId, type InputHTMLAttributes, type ReactNode } from "react";

interface CheckboxProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> {
  label: ReactNode;
  error?: string;
}

export function Checkbox({ label, error, className = "", ...props }: CheckboxProps) {
  const autoId = useId();
  const id = props.name ? `check-${props.name}` : autoId;

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={id}
        className="flex cursor-pointer items-start gap-2 text-sm text-foreground"
      >
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          className={`mt-0.5 size-4 shrink-0 rounded border-border text-primary accent-primary focus:ring-2 focus:ring-ring/30 ${className}`}
          {...props}
        />
        <span>{label}</span>
      </label>
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
