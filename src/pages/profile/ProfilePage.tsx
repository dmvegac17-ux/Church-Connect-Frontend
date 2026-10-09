import { useState, type FormEvent } from "react";

import { useAuth } from "../../auth/useAuth";
import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { FullPageSpinner } from "../../components/feedback/Spinner";
import { useToast } from "../../components/feedback/useToast";
import { Button } from "../../components/forms/Button";
import { PasswordField } from "../../components/forms/PasswordField";
import { TextField } from "../../components/forms/TextField";
import { Card, PageHeader } from "../../components/layout/Page";
import {
  FormStatus,
  PasswordRules,
  passwordPairValid,
} from "../../components/ui/FormStatus";
import { Avatar } from "../../components/ui/primitives";
import { ActiveBadge, RoleBadge } from "../../components/users/Badges";
import { useTouched } from "../../hooks/useTouched";
import { parseValidationErrors } from "../../lib/formErrors";
import { fullNameOf } from "../../lib/people";
import {
  compactErrors,
  DUPLICATE_EMAIL_MESSAGE,
  emailError,
  PASSWORD_MAX_LENGTH,
  PERSON_NAME_MAX,
  personNameError,
  PHONE_MAX,
  PHONE_PLACEHOLDER,
  phoneError,
  sanitizeEmail,
  sanitizePersonName,
  sanitizePhone,
} from "../../lib/validators";
import { userService } from "../../services/userService";
import { ApiError } from "../../types/api";

/** Mi perfil: el mismo formulario para miembro y administrador. */
export function ProfilePage() {
  const { user, refreshProfile } = useAuth();

  if (!user) {
    return <FullPageSpinner label="Cargando perfil…" />;
  }

  const fullName = fullNameOf(user);

  return (
    <div className="mx-auto flex w-full max-w-[820px] flex-col gap-5">
      <PageHeader
        title="Mi perfil"
        description="Consulta y actualiza tus datos personales."
      />

      <Card as="section" className="flex flex-wrap items-center gap-4 px-6 py-5">
        <Avatar name={fullName} tone="primary" className="size-14 text-xl" />
        <div className="min-w-[180px] flex-1">
          <p className="text-lg font-extrabold break-words">{fullName}</p>
          <p className="text-sm break-all text-muted-foreground">{user.correo}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <RoleBadge role={user.rol} />
          <ActiveBadge active={user.activo} />
        </div>
      </Card>

      <ProfileDetailsForm
        // Se reinicia con los datos guardados cuando el perfil se refresca.
        key={`${user.nombre}|${user.apellido}|${user.correo}|${user.telefono}`}
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
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const fields = useTouched<keyof DetailsValues>();

  const set = (name: keyof DetailsValues, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setServerErrors((prev) => {
      if (!(name in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const errors = {
    nombre: personNameError(values.nombre, "nombre", "tu") ?? serverErrors.nombre,
    apellido:
      personNameError(values.apellido, "apellido", "tu") ?? serverErrors.apellido,
    correo: emailError(values.correo) ?? serverErrors.correo,
    telefono: phoneError(values.telefono) ?? serverErrors.telefono,
  };
  const errorCount = Object.keys(compactErrors(errors)).length;
  const changed = (key: keyof DetailsValues) =>
    values[key].trim() !== initial[key].trim();
  const dirty = (Object.keys(values) as (keyof DetailsValues)[]).some(changed);

  // El error se muestra al salir del campo o cuando el valor ya difiere del guardado.
  const shown = (key: keyof DetailsValues) =>
    changed(key) ? errors[key] : fields.visible(errors, key);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    fields.setSubmitted(true);
    if (errorCount > 0 || !dirty) {
      return;
    }

    const payload: Record<string, string> = {};
    (Object.keys(values) as (keyof DetailsValues)[]).forEach((key) => {
      if (changed(key)) {
        payload[key] = values[key].trim();
      }
    });

    setSubmitting(true);
    try {
      await userService.update(userId, payload);
      toast.success("Tus datos se actualizaron.");
      await onSaved();
    } catch (err) {
      if (err instanceof ApiError && err.isValidation) {
        setServerErrors(parseValidationErrors(err).fieldErrors);
        setError(err);
      } else if (err instanceof ApiError && err.status === 400) {
        setServerErrors({ correo: DUPLICATE_EMAIL_MESSAGE });
      } else {
        setError(err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const discard = () => {
    setValues(initial);
    setServerErrors({});
    setError(null);
    fields.reset();
  };

  return (
    <Card className="overflow-hidden">
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-[18px] p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="text-[17px] font-extrabold">Datos personales</h2>
            <p className="text-[13px] text-muted-foreground">
              Todos los campos son obligatorios salvo el teléfono.
            </p>
          </div>
          {error ? (
            <ErrorAlert error={error} onClose={() => setError(null)} />
          ) : null}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-[18px]">
            <TextField
              label="Nombre"
              name="nombre"
              autoComplete="given-name"
              required
              hideCounter
              maxLength={PERSON_NAME_MAX}
              value={values.nombre}
              onChange={(e) => set("nombre", sanitizePersonName(e.target.value))}
              onBlur={() => fields.touch("nombre")}
              error={shown("nombre")}
            />
            <TextField
              label="Apellido"
              name="apellido"
              autoComplete="family-name"
              required
              hideCounter
              maxLength={PERSON_NAME_MAX}
              value={values.apellido}
              onChange={(e) =>
                set("apellido", sanitizePersonName(e.target.value))
              }
              onBlur={() => fields.touch("apellido")}
              error={shown("apellido")}
            />
            <TextField
              label="Correo"
              name="correo"
              type="email"
              autoComplete="email"
              required
              hideCounter
              value={values.correo}
              onChange={(e) => set("correo", sanitizeEmail(e.target.value))}
              onBlur={() => fields.touch("correo")}
              error={shown("correo")}
            />
            <TextField
              label="Teléfono"
              optional
              name="telefono"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder={PHONE_PLACEHOLDER}
              hideCounter
              maxLength={PHONE_MAX}
              value={values.telefono}
              onChange={(e) => set("telefono", sanitizePhone(e.target.value))}
              onBlur={() => fields.touch("telefono")}
              error={shown("telefono")}
              hint="Solo números; el indicativo con + es opcional."
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider bg-surface-alt px-6 py-4">
          <FormStatus
            saving={submitting}
            submitted={fields.submitted}
            errorCount={errorCount}
            dirty={dirty}
            cleanText="Tus datos están al día."
          />
          <div className="flex gap-2.5">
            {dirty ? (
              <Button variant="secondary" onClick={discard} disabled={submitting}>
                Descartar
              </Button>
            ) : null}
            <Button
              type="submit"
              loading={submitting}
              loadingLabel="Guardando…"
              disabled={!dirty || errorCount > 0}
            >
              Guardar cambios
            </Button>
          </div>
        </div>
      </form>
    </Card>
  );
}

function PasswordForm({ userId }: { userId: string }) {
  const toast = useToast();
  const [contrasena, setContrasena] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  const valid = passwordPairValid(contrasena, confirmar);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!valid) {
      return;
    }

    setSubmitting(true);
    try {
      // El PUT lleva únicamente `contrasena` (contrato 6.6 / requisito 5).
      await userService.update(userId, { contrasena });
      setContrasena("");
      setConfirmar("");
      toast.success("Tu contraseña se cambió correctamente.");
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      <form onSubmit={handleSubmit} noValidate>
        <div className="flex flex-col gap-[18px] p-6">
          <div className="flex flex-col gap-1">
            <h2 className="text-[17px] font-extrabold">Cambiar contraseña</h2>
            <p className="text-sm text-muted-foreground">
              Solo puedes cambiar tu propia contraseña.
            </p>
          </div>
          {error ? (
            <ErrorAlert error={error} onClose={() => setError(null)} />
          ) : null}
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,240px),1fr))] gap-[18px]">
            <PasswordField
              label="Nueva contraseña"
              name="contrasena"
              autoComplete="new-password"
              maxLength={PASSWORD_MAX_LENGTH}
              value={contrasena}
              onChange={(e) => setContrasena(e.target.value)}
            />
            <PasswordField
              label="Confirmar contraseña"
              name="confirmar"
              autoComplete="new-password"
              maxLength={PASSWORD_MAX_LENGTH}
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
            />
          </div>
          <PasswordRules password={contrasena} confirm={confirmar} />
        </div>
        <div className="flex justify-end border-t border-divider bg-surface-alt px-6 py-4">
          <Button
            type="submit"
            loading={submitting}
            loadingLabel="Actualizando…"
            disabled={!valid}
          >
            Actualizar contraseña
          </Button>
        </div>
      </form>
    </Card>
  );
}
