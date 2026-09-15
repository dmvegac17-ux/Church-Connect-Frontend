import { useId } from "react";

import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { useUserOptions } from "../../../hooks/useUserOptions";

interface UserSelectProps {
  value: string;
  onChange: (userId: string) => void;
  error?: string;
  disabled?: boolean;
  name?: string;
  label?: string;
}

/**
 * Selector de usuario destinatario, alimentado por `userService.list()`
 * (`GET /users`, solo ADMIN). Solo se usa en el formulario de crear
 * notificación, que ya está detrás de una ruta `requiredRole="ADMIN"`.
 */
export function UserSelect({
  value,
  onChange,
  error,
  disabled,
  name = "usuario_id",
  label = "Destinatario",
}: UserSelectProps) {
  const autoId = useId();
  const id = `field-${name}-${autoId}`;
  const { users, isLoading, error: loadError } = useUserOptions();

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        <span className="ml-0.5 text-destructive" aria-hidden="true">
          *
        </span>
      </label>
      <select
        id={id}
        name={name}
        value={value}
        disabled={disabled || isLoading}
        aria-invalid={error ? true : undefined}
        onChange={(e) => onChange(e.target.value)}
        className={`rounded-lg border bg-input-background px-3 py-2.5 text-sm text-foreground outline-none transition focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 ${
          error
            ? "border-destructive focus:border-destructive"
            : "border-border focus:border-ring"
        }`}
      >
        <option value="">
          {isLoading ? "Cargando usuarios…" : "Selecciona un usuario…"}
        </option>
        {users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.nombre} {u.apellido ?? ""} — {u.correo}
          </option>
        ))}
      </select>
      {loadError ? <ErrorAlert error={loadError} /> : null}
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
