import { useId } from "react";

interface ActiveSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  /** Explica por qué está deshabilitado (p. ej. la propia cuenta). */
  hint?: string;
}

/** Interruptor Activo/Inactivo: el estado también se dice con texto. */
export function ActiveSwitch({
  checked,
  onChange,
  label = "Estado",
  disabled,
  hint,
}: ActiveSwitchProps) {
  const id = useId();

  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className="text-sm font-bold text-foreground">
        {label}
      </span>
      <div className="flex h-[var(--control-h)] items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          aria-labelledby={`${id}-label`}
          aria-describedby={hint ? `${id}-hint` : undefined}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
            checked ? "bg-primary" : "bg-switch-background"
          }`}
        >
          <span
            className={`inline-block size-[22px] transform rounded-full bg-card shadow transition-transform ${
              checked ? "translate-x-[23px]" : "translate-x-[3px]"
            }`}
          />
        </button>
        <span className="text-[15px] text-foreground">
          {checked ? "Activo" : "Inactivo"}
        </span>
      </div>
      {hint ? (
        <p id={`${id}-hint`} className="text-[13px] text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
