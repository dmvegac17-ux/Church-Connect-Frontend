interface ActiveSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export function ActiveSwitch({
  checked,
  onChange,
  label = "Usuario activo",
  disabled,
}: ActiveSwitchProps) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm font-medium text-foreground">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-50 ${
          checked ? "bg-primary" : "bg-switch-background"
        }`}
      >
        <span
          className={`inline-block size-5 transform rounded-full bg-card shadow transition ${
            checked ? "translate-x-5" : "translate-x-0.5"
          }`}
        />
      </button>
      <span>{label}</span>
    </label>
  );
}
