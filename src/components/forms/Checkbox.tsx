import { useId, type InputHTMLAttributes, type ReactNode } from "react";

import { FieldError } from "./fieldStyles";

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
        className="flex min-h-8 cursor-pointer items-start gap-2 py-1 text-[15px] leading-snug text-foreground"
      >
        <input
          id={id}
          type="checkbox"
          aria-invalid={error ? true : undefined}
          className={`mt-0.5 size-[18px] shrink-0 cursor-pointer rounded accent-primary ${className}`}
          {...props}
        />
        <span>{label}</span>
      </label>
      {error ? <FieldError>{error}</FieldError> : null}
    </div>
  );
}
