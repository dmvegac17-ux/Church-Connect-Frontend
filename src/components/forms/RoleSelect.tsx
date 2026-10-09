import { useId } from "react";

import { ROLE_LABELS, USER_ROLES, type UserRole } from "../../types/user";
import {
  controlClass,
  FieldError,
  HINT_CLASS,
  LABEL_CLASS,
} from "./fieldStyles";

interface RoleSelectProps {
  label?: string;
  value: UserRole;
  onChange: (role: UserRole) => void;
  error?: string;
  disabled?: boolean;
  name?: string;
  hint?: string;
}

export function RoleSelect({
  label = "Rol",
  value,
  onChange,
  error,
  disabled,
  name = "rol",
  hint,
}: RoleSelectProps) {
  const autoId = useId();
  const id = `field-${name}-${autoId}`;

  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className={LABEL_CLASS}>
        {label}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        disabled={disabled}
        aria-invalid={error ? true : undefined}
        aria-describedby={hint ? `${id}-hint` : undefined}
        onChange={(e) => onChange(e.target.value as UserRole)}
        className={controlClass(Boolean(error), "h-[var(--control-h)] px-2.5")}
      >
        {USER_ROLES.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </select>
      {error ? <FieldError>{error}</FieldError> : null}
      {hint && !error ? (
        <p id={`${id}-hint`} className={HINT_CLASS}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}
