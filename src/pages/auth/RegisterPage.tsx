import { Lock, Mail, Phone, User } from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { Button } from "../../components/forms/Button";
import { Checkbox } from "../../components/forms/Checkbox";
import { PasswordField } from "../../components/forms/PasswordField";
import { TextField } from "../../components/forms/TextField";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { ApiError } from "../../types/api";
import { parseValidationErrors } from "../../lib/formErrors";
import {
  focusFirstError,
  isEmail,
  passwordLengthError,
  required,
} from "../../lib/validators";

export function RegisterPage() {
  const { register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);

  const [values, setValues] = useState({
    nombre: "",
    apellido: "",
    correo: "",
    telefono: "",
    contrasena: "",
    confirmar: "",
  });
  const [acepta, setAcepta] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const setField =
    (name: keyof typeof values) => (e: ChangeEvent<HTMLInputElement>) =>
      setValues((prev) => ({ ...prev, [name]: e.target.value }));

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!required(values.nombre)) errors.nombre = "El nombre es obligatorio.";
    if (!required(values.apellido))
      errors.apellido = "El apellido es obligatorio.";
    if (!required(values.correo)) {
      errors.correo = "El correo es obligatorio.";
    } else if (!isEmail(values.correo)) {
      errors.correo = "Ingresa un correo válido.";
    }
    if (!required(values.contrasena)) {
      errors.contrasena = "La contraseña es obligatoria.";
    } else {
      const passwordError = passwordLengthError(values.contrasena);
      if (passwordError) errors.contrasena = passwordError;
    }
    if (values.confirmar !== values.contrasena) {
      errors.confirmar = "Las contraseñas no coinciden.";
    }
    if (!acepta) {
      errors.acepta = "Debes aceptar los términos y condiciones.";
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      requestAnimationFrame(() => focusFirstError(formRef.current));
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validate()) {
      return;
    }

    setSubmitting(true);
    try {
      await register({
        nombre: values.nombre.trim(),
        apellido: values.apellido.trim(),
        correo: values.correo.trim(),
        contrasena: values.contrasena,
        telefono: values.telefono.trim() || undefined,
      });
      navigate("/login", { replace: true, state: { registered: true } });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setFieldErrors((prev) => ({ ...prev, correo: err.message }));
      } else if (err instanceof ApiError && err.isValidation) {
        const { fieldErrors: mapped } = parseValidationErrors(err);
        setFieldErrors((prev) => ({ ...prev, ...mapped }));
      }
      setError(err);
      requestAnimationFrame(() => focusFirstError(formRef.current));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      tab="register"
      footer="Al registrarte, aceptas recibir comunicaciones de nuestra iglesia"
    >
      {error ? (
        <div className="mb-4">
          <ErrorAlert error={error} onClose={() => setError(null)} />
        </div>
      ) : null}

      <form
        ref={formRef}
        onSubmit={handleSubmit}
        noValidate
        className="space-y-4"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField
            label="Nombre"
            name="nombre"
            autoComplete="given-name"
            placeholder="Juan"
            icon={<User className="size-4" />}
            required
            value={values.nombre}
            onChange={setField("nombre")}
            error={fieldErrors.nombre}
          />
          <TextField
            label="Apellido"
            name="apellido"
            autoComplete="family-name"
            placeholder="Pérez"
            icon={<User className="size-4" />}
            required
            value={values.apellido}
            onChange={setField("apellido")}
            error={fieldErrors.apellido}
          />
        </div>
        <TextField
          label="Correo Electrónico"
          name="correo"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          icon={<Mail className="size-4" />}
          required
          value={values.correo}
          onChange={setField("correo")}
          error={fieldErrors.correo}
        />
        <TextField
          label="Teléfono"
          name="telefono"
          type="tel"
          autoComplete="tel"
          placeholder="(123) 456-7890"
          icon={<Phone className="size-4" />}
          hint="Opcional"
          value={values.telefono}
          onChange={setField("telefono")}
          error={fieldErrors.telefono}
        />
        <PasswordField
          label="Contraseña"
          name="contrasena"
          autoComplete="new-password"
          placeholder="••••••••"
          icon={<Lock className="size-4" />}
          required
          value={values.contrasena}
          onChange={setField("contrasena")}
          error={fieldErrors.contrasena}
          hint="Entre 8 y 20 caracteres"
        />
        <PasswordField
          label="Confirmar contraseña"
          name="confirmar"
          autoComplete="new-password"
          placeholder="••••••••"
          icon={<Lock className="size-4" />}
          required
          value={values.confirmar}
          onChange={setField("confirmar")}
          error={fieldErrors.confirmar}
        />

        <Checkbox
          name="acepta"
          label="Acepto los términos y condiciones y la política de privacidad"
          checked={acepta}
          onChange={(e) => setAcepta(e.target.checked)}
          error={fieldErrors.acepta}
        />

        <Button type="submit" className="w-full" loading={submitting}>
          Crear Cuenta
        </Button>
      </form>
    </AuthLayout>
  );
}
