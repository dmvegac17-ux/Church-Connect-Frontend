import { useEffect, useRef, useState, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { FullPageSpinner } from "../../components/feedback/Spinner";
import { useToast } from "../../components/feedback/useToast";
import { ActiveSwitch } from "../../components/forms/ActiveSwitch";
import { Button } from "../../components/forms/Button";
import { PasswordField } from "../../components/forms/PasswordField";
import { RoleSelect } from "../../components/forms/RoleSelect";
import { TextField } from "../../components/forms/TextField";
import { Card, PageHeader } from "../../components/layout/Page";
import { useUser } from "../../hooks/useUser";
import { parseValidationErrors } from "../../lib/formErrors";
import {
  focusFirstError,
  isEmail,
  passwordLengthError,
  required,
} from "../../lib/validators";
import { userService } from "../../services/userService";
import { ApiError } from "../../types/api";
import type { UpdateUserDTO, UserRole } from "../../types/user";

interface FormState {
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  rol: UserRole;
  activo: boolean;
}

export function UserEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { user: currentUser, refreshProfile } = useAuth();
  const { user, isLoading, error: loadError } = useUser(id);
  const formRef = useRef<HTMLFormElement>(null);

  const isSelf = Boolean(id && currentUser?.id === id);
  const canEditPassword = isSelf || currentUser?.rol === "ADMIN";

  const [form, setForm] = useState<FormState | null>(null);
  const [initial, setInitial] = useState<FormState | null>(null);
  const [contrasena, setContrasena] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      return;
    }
    const next: FormState = {
      nombre: user.nombre,
      apellido: user.apellido ?? "",
      correo: user.correo,
      telefono: user.telefono ?? "",
      rol: user.rol,
      activo: user.activo ?? true,
    };
    setForm(next);
    setInitial(next);
  }, [user]);

  if (isLoading || (!form && !loadError)) {
    return <FullPageSpinner label="Cargando usuario…" />;
  }

  if (loadError || !form || !initial || !id) {
    return (
      <div>
        <PageHeader title="Editar usuario" backTo="/users" />
        <ErrorAlert
          error={loadError ?? new Error("No se pudo cargar el usuario.")}
        />
      </div>
    );
  }

  const set = <K extends keyof FormState>(name: K, value: FormState[K]) =>
    setForm((prev) => (prev ? { ...prev, [name]: value } : prev));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors: Record<string, string> = {};
    if (!required(form.nombre)) errors.nombre = "El nombre es obligatorio.";
    if (!required(form.apellido))
      errors.apellido = "El apellido es obligatorio.";
    if (!required(form.correo)) {
      errors.correo = "El correo es obligatorio.";
    } else if (!isEmail(form.correo)) {
      errors.correo = "Ingresa un correo válido.";
    }
    if (canEditPassword && contrasena) {
      const passwordError = passwordLengthError(contrasena);
      if (passwordError) errors.contrasena = passwordError;
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      requestAnimationFrame(() => focusFirstError(formRef.current));
      return;
    }

    const payload: UpdateUserDTO = {};
    if (form.nombre.trim() !== initial.nombre.trim())
      payload.nombre = form.nombre.trim();
    if (form.apellido.trim() !== initial.apellido.trim())
      payload.apellido = form.apellido.trim();
    if (form.correo.trim() !== initial.correo.trim())
      payload.correo = form.correo.trim();
    if (form.telefono.trim() !== initial.telefono.trim())
      payload.telefono = form.telefono.trim();
    if (form.rol !== initial.rol) payload.rol = form.rol;
    if (form.activo !== initial.activo) payload.activo = form.activo;
    if (canEditPassword && contrasena) payload.contrasena = contrasena;

    if (Object.keys(payload).length === 0) {
      toast.info("No hay cambios por guardar.", "Sin cambios");
      return;
    }

    setSubmitting(true);
    try {
      const updated = await userService.update(id, payload);
      toast.success(
        "Los cambios se guardaron correctamente.",
        "Usuario actualizado",
      );
      setContrasena("");
      const next: FormState = {
        nombre: updated.nombre,
        apellido: updated.apellido ?? "",
        correo: updated.correo,
        telefono: updated.telefono ?? "",
        rol: updated.rol,
        activo: updated.activo ?? true,
      };
      setForm(next);
      setInitial(next);
      if (isSelf) {
        await refreshProfile();
      }
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setFieldErrors({ correo: err.message });
      } else if (err instanceof ApiError && err.isValidation) {
        setFieldErrors(parseValidationErrors(err).fieldErrors);
      }
      setError(err);
      requestAnimationFrame(() => focusFirstError(formRef.current));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={`Editar: ${initial.nombre} ${initial.apellido}`.trim()}
        backTo="/users"
      />

      <Card className="max-w-2xl">
        {error ? (
          <div className="mb-4">
            <ErrorAlert error={error} onClose={() => setError(null)} />
          </div>
        ) : null}

        <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Nombre"
              name="nombre"
              required
              value={form.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              error={fieldErrors.nombre}
            />
            <TextField
              label="Apellido"
              name="apellido"
              required
              value={form.apellido}
              onChange={(e) => set("apellido", e.target.value)}
              error={fieldErrors.apellido}
            />
          </div>
          <TextField
            label="Correo"
            name="correo"
            type="email"
            required
            value={form.correo}
            onChange={(e) => set("correo", e.target.value)}
            error={fieldErrors.correo}
          />
          <TextField
            label="Teléfono"
            name="telefono"
            type="tel"
            hint="Opcional"
            value={form.telefono}
            onChange={(e) => set("telefono", e.target.value)}
            error={fieldErrors.telefono}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <RoleSelect
              value={form.rol}
              onChange={(r) => set("rol", r)}
              error={fieldErrors.rol}
            />
            <div className="flex items-end">
              <ActiveSwitch
                checked={form.activo}
                onChange={(v) => set("activo", v)}
              />
            </div>
          </div>

          {canEditPassword ? (
            <PasswordField
              label="Nueva contraseña"
              name="contrasena"
              autoComplete="new-password"
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
              error={fieldErrors.contrasena}
              hint={
                isSelf
                  ? "Entre 8 y 20 caracteres. Déjalo vacío para no cambiarla."
                  : "Como administrador puedes establecer una nueva contraseña para este usuario (entre 8 y 20 caracteres). Déjalo vacío para no cambiarla."
              }
            />
          ) : (
            <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              La contraseña de otro usuario no se puede modificar. El usuario
              debe cambiarla desde su propio perfil.
            </p>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/users")}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              Guardar cambios
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
