import { useId } from "react";

import { ROLE_LABELS, USER_ROLES, type UserRole } from "../../types/user";

interface RoleSelectProps {
  label?: string;
  value: UserRole;
  onChange: (role: UserRole) => void;
  error?: string;
  disabled?: boolean;
  name?: string;
}

export function RoleSelect({
  label = "Rol",
  value,
  onChange,
  error,
  disabled,
  name = "rol",
}: RoleSelectProps) {
  const autoId = useId();
  const id = `field-${name}-${autoId}`;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value as UserRole)}
        className={`rounded-lg border bg-input-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 ${
          error
            ? "border-destructive focus:border-destructive"
            : "border-border focus:border-ring"
        }`}
      >
        {USER_ROLES.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </select>
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
