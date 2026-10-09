import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { Button } from "../../components/forms/Button";
import { Checkbox } from "../../components/forms/Checkbox";
import { PasswordField } from "../../components/forms/PasswordField";
import { TextField } from "../../components/forms/TextField";
import { AuthHeading, AuthLayout } from "../../components/layout/AuthLayout";
import {
  PasswordRules,
  passwordPairValid,
} from "../../components/ui/FormStatus";
import { HOME_PATH } from "../../config/navigation";
import { useTouched } from "../../hooks/useTouched";
import { parseValidationErrors } from "../../lib/formErrors";
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
import { ApiError } from "../../types/api";

type Field = "nombre" | "apellido" | "correo" | "telefono" | "acepta";

export function RegisterPage() {
  const { register, login, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState({
    nombre: "",
    apellido: "",
    correo: "",
    telefono: "",
    contrasena: "",
    confirmar: "",
  });
  const [acepta, setAcepta] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const fields = useTouched<Field>();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(HOME_PATH, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const set = (name: keyof typeof values, value: string) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    // El error del servidor deja de aplicar en cuanto el campo cambia.
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
    acepta: acepta
      ? undefined
      : "Debes aceptar los términos para crear tu cuenta.",
  };
  const passwordsOk = passwordPairValid(values.contrasena, values.confirmar);
  const valid = Object.keys(compactErrors(errors)).length === 0 && passwordsOk;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    fields.setSubmitted(true);
    if (!valid) {
      return;
    }

    const correo = values.correo.trim();
    setSubmitting(true);
    try {
      await register({
        nombre: values.nombre.trim(),
        apellido: values.apellido.trim(),
        correo,
        contrasena: values.contrasena,
        telefono: values.telefono.trim() || undefined,
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setServerErrors({ correo: DUPLICATE_EMAIL_MESSAGE });
      } else if (err instanceof ApiError && err.isValidation) {
        setServerErrors(parseValidationErrors(err).fieldErrors);
        setError(err);
      } else {
        setError(err);
      }
      setSubmitting(false);
      return;
    }

    // Cuenta creada: entra directo al Inicio como miembro.
    try {
      await login({ correo, contrasena: values.contrasena });
      navigate(HOME_PATH, { replace: true });
    } catch {
      // La cuenta existe pero no se pudo abrir la sesión: que entre a mano.
      navigate("/login", { replace: true, state: { registered: true } });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout tab="register">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <AuthHeading
          title="Crea tu cuenta"
          description="Todos los campos son obligatorios salvo el teléfono."
        />

        {error ? (
          <ErrorAlert error={error} onClose={() => setError(null)} />
        ) : null}

        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-3.5">
          <TextField
            label="Nombre"
            name="nombre"
            autoComplete="given-name"
            placeholder="Juan"
            required
            hideCounter
            maxLength={PERSON_NAME_MAX}
            value={values.nombre}
            onChange={(e) => set("nombre", sanitizePersonName(e.target.value))}
            onBlur={() => fields.touch("nombre")}
            error={fields.visible(errors, "nombre")}
          />
          <TextField
            label="Apellido"
            name="apellido"
            autoComplete="family-name"
            placeholder="Pérez"
            required
            hideCounter
            maxLength={PERSON_NAME_MAX}
            value={values.apellido}
            onChange={(e) => set("apellido", sanitizePersonName(e.target.value))}
            onBlur={() => fields.touch("apellido")}
            error={fields.visible(errors, "apellido")}
          />
        </div>
        <TextField
          label="Correo electrónico"
          name="correo"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          required
          hideCounter
          value={values.correo}
          onChange={(e) => set("correo", sanitizeEmail(e.target.value))}
          onBlur={() => fields.touch("correo")}
          error={fields.visible(errors, "correo") ?? serverErrors.correo}
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
          error={fields.visible(errors, "telefono")}
        />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,180px),1fr))] gap-3.5">
          <PasswordField
            label="Contraseña"
            name="contrasena"
            autoComplete="new-password"
            required
            maxLength={PASSWORD_MAX_LENGTH}
            value={values.contrasena}
            onChange={(e) => set("contrasena", e.target.value)}
          />
          <PasswordField
            label="Confirmar contraseña"
            name="confirmar"
            autoComplete="new-password"
            required
            maxLength={PASSWORD_MAX_LENGTH}
            value={values.confirmar}
            onChange={(e) => set("confirmar", e.target.value)}
          />
        </div>
        <PasswordRules
          password={values.contrasena}
          confirm={values.confirmar}
        />

        <Checkbox
          name="acepta"
          label="Acepto los términos y condiciones y la política de privacidad"
          checked={acepta}
          onChange={(e) => {
            setAcepta(e.target.checked);
            fields.touch("acepta");
          }}
          error={fields.visible(errors, "acepta")}
        />

        <Button
          type="submit"
          className="!h-12 !rounded-xl !text-base !font-extrabold"
          loading={submitting}
          loadingLabel="Creando cuenta…"
          disabled={!valid}
        >
          Crear cuenta
        </Button>
        <p className="text-center text-[13px] text-muted-foreground">
          Al registrarte, aceptas recibir comunicaciones de nuestra iglesia
        </p>
      </form>
    </AuthLayout>
  );
}
