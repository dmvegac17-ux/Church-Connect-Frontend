import { useState, type FormEvent } from "react";

import { useAuth } from "../../auth/useAuth";
import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { FullPageSpinner } from "../../components/feedback/Spinner";
import { useToast } from "../../components/feedback/useToast";
import { Button } from "../../components/forms/Button";
import { PasswordField } from "../../components/forms/PasswordField";
import { TextField } from "../../components/forms/TextField";
import { Card, PageHeader } from "../../components/layout/Page";
import { ActiveBadge, RoleBadge } from "../../components/users/Badges";
import { parseValidationErrors } from "../../lib/formErrors";
import { isEmail, required } from "../../lib/validators";
import { userService } from "../../services/userService";
import { ApiError } from "../../types/api";

const MIN_PASSWORD = 8;

export function ProfilePage() {
  const { user, refreshProfile } = useAuth();

  if (!user) {
    return <FullPageSpinner label="Cargando perfil…" />;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi perfil"
        description="Consulta y actualiza tus datos personales."
      />

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <p className="text-lg font-medium text-foreground">
              {user.nombre} {user.apellido ?? ""}
            </p>
            <p className="text-sm text-muted-foreground">{user.correo}</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <RoleBadge role={user.rol} />
            <ActiveBadge active={user.activo} />
          </div>
        </div>
      </Card>

      <ProfileDetailsForm
        userId={user.id}
        initial={{
          nombre: user.nombre,
          apellido: user.apellido ?? "",
          correo: user.correo,
          telefono: user.telefono ?? "",
        }}
        onSaved={refreshProfile}
      />

      <PasswordForm userId={user.id} />
    </div>
  );
}

interface DetailsValues {
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
}

function ProfileDetailsForm({
  userId,
  initial,
  onSaved,
}: {
  userId: string;
  initial: DetailsValues;
  onSaved: () => Promise<void>;
}) {
  const toast = useToast();
  const [values, setValues] = useState<DetailsValues>(initial);
  const [saved, setSaved] = useState<DetailsValues>(initial);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (name: keyof DetailsValues, value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const dirty = JSON.stringify(values) !== JSON.stringify(saved);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors: Record<string, string> = {};
    if (!required(values.nombre)) errors.nombre = "El nombre es obligatorio.";
    if (!required(values.apellido))
      errors.apellido = "El apellido es obligatorio.";
    if (!required(values.correo)) {
      errors.correo = "El correo es obligatorio.";
    } else if (!isEmail(values.correo)) {
      errors.correo = "Ingresa un correo válido.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    const payload: Record<string, string> = {};
    (Object.keys(values) as (keyof DetailsValues)[]).forEach((key) => {
      if (values[key].trim() !== saved[key].trim()) {
        payload[key] = values[key].trim();
      }
    });
    if (Object.keys(payload).length === 0) {
      return;
    }

    setSubmitting(true);
    try {
      await userService.update(userId, payload);
      setSaved(values);
      setFieldErrors({});
      toast.success("Tus datos se actualizaron.", "Perfil actualizado");
      await onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.isValidation) {
        setFieldErrors(parseValidationErrors(err).fieldErrors);
      } else if (err instanceof ApiError && err.status === 400) {
        setFieldErrors({ correo: err.message });
      }
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <h2 className="text-base font-medium text-foreground">
        Datos personales
      </h2>
      {error ? (
        <div className="mt-4">
          <ErrorAlert error={error} onClose={() => setError(null)} />
        </div>
      ) : null}
      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Nombre"
            name="nombre"
            required
            value={values.nombre}
            onChange={(e) => set("nombre", e.target.value)}
            error={fieldErrors.nombre}
          />
          <TextField
            label="Apellido"
            name="apellido"
            required
            value={values.apellido}
            onChange={(e) => set("apellido", e.target.value)}
            error={fieldErrors.apellido}
          />
        </div>
        <TextField
          label="Correo"
          name="correo"
          type="email"
          required
          value={values.correo}
          onChange={(e) => set("correo", e.target.value)}
          error={fieldErrors.correo}
        />
        <TextField
          label="Teléfono"
          name="telefono"
          type="tel"
          hint="Opcional"
          value={values.telefono}
          onChange={(e) => set("telefono", e.target.value)}
          error={fieldErrors.telefono}
        />
        <div className="flex justify-end">
          <Button type="submit" loading={submitting} disabled={!dirty}>
            Guardar cambios
          </Button>
        </div>
      </form>
    </Card>
  );
}

function PasswordForm({ userId }: { userId: string }) {
  const toast = useToast();
  const [contrasena, setContrasena] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors: Record<string, string> = {};
    if (contrasena.length < MIN_PASSWORD) {
      errors.contrasena = `Usa al menos ${MIN_PASSWORD} caracteres.`;
    }
    if (confirmar !== contrasena) {
      errors.confirmar = "Las contraseñas no coinciden.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      // El PUT lleva únicamente `contrasena` (contrato 6.6 / requisito 5).
      await userService.update(userId, { contrasena });
      setContrasena("");
      setConfirmar("");
      toast.success("Tu contraseña se cambió correctamente.", "Contraseña actualizada");
    } catch (err) {
      if (err instanceof ApiError && err.isValidation) {
        setFieldErrors(parseValidationErrors(err).fieldErrors);
      }
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <h2 className="text-base font-medium text-foreground">
        Cambiar contraseña
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Solo puedes cambiar tu propia contraseña.
      </p>
      {error ? (
        <div className="mt-4">
          <ErrorAlert error={error} onClose={() => setError(null)} />
        </div>
      ) : null}
      <form onSubmit={handleSubmit} noValidate className="mt-4 space-y-4">
        <PasswordField
          label="Nueva contraseña"
          name="contrasena"
          autoComplete="new-password"
          required
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          error={fieldErrors.contrasena}
          hint={`Mínimo ${MIN_PASSWORD} caracteres`}
        />
        <PasswordField
          label="Confirmar contraseña"
          name="confirmar"
          autoComplete="new-password"
          required
          value={confirmar}
          onChange={(e) => setConfirmar(e.target.value)}
          error={fieldErrors.confirmar}
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            loading={submitting}
            disabled={!contrasena && !confirmar}
          >
            Actualizar contraseña
          </Button>
        </div>
      </form>
    </Card>
  );
}
