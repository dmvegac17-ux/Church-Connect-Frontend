import { Lock, Mail } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { SocialButtons } from "../../components/auth/SocialButtons";
import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { useToast } from "../../components/feedback/useToast";
import { Button } from "../../components/forms/Button";
import { Checkbox } from "../../components/forms/Checkbox";
import { PasswordField } from "../../components/forms/PasswordField";
import { TextField } from "../../components/forms/TextField";
import { AuthLayout } from "../../components/layout/AuthLayout";
import { focusFirstError, isEmail, required } from "../../lib/validators";
import type { UserRole } from "../../types/user";

interface LocationState {
  from?: { pathname: string };
  registered?: boolean;
}

function landingFor(role: UserRole): string {
  return role === "ADMIN" ? "/users" : "/profile";
}

export function LoginPage() {
  const { login, isAuthenticated, role } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const state = (location.state ?? null) as LocationState | null;

  const formRef = useRef<HTMLFormElement>(null);
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [remember, setRemember] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isAuthenticated && role) {
      navigate(landingFor(role), { replace: true });
    }
  }, [isAuthenticated, role, navigate]);

  // Aviso emergente tras un registro exitoso; se limpia el state de navegación
  // para que no reaparezca al refrescar o volver atrás.
  useEffect(() => {
    if (state?.registered) {
      toast.success(
        "Tu cuenta fue creada. Ya puedes iniciar sesión.",
        "Registro exitoso",
      );
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [state?.registered, toast, navigate, location.pathname]);

  const validate = (): boolean => {
    const errors: Record<string, string> = {};
    if (!required(correo)) {
      errors.correo = "El correo es obligatorio.";
    } else if (!isEmail(correo)) {
      errors.correo = "Ingresa un correo válido.";
    }
    if (!required(contrasena)) {
      errors.contrasena = "La contraseña es obligatoria.";
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
      const userRole = await login(
        { correo: correo.trim(), contrasena },
        remember,
      );
      const target = state?.from?.pathname ?? landingFor(userRole);
      navigate(target, { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      tab="login"
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
        <TextField
          label="Correo Electrónico"
          name="correo"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          icon={<Mail className="size-4" />}
          required
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          error={fieldErrors.correo}
        />
        <PasswordField
          label="Contraseña"
          name="contrasena"
          autoComplete="current-password"
          placeholder="••••••••"
          icon={<Lock className="size-4" />}
          required
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          error={fieldErrors.contrasena}
        />

        <div className="flex items-center justify-between gap-3">
          <Checkbox
            name="remember"
            label="Recordarme"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <button
            type="button"
            onClick={() =>
              toast.notify({
                variant: "info",
                title: "Recuperar contraseña",
                message:
                  "Para restablecer tu contraseña, contacta a un administrador.",
              })
            }
            className="text-sm font-medium text-primary hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <Button type="submit" className="w-full" loading={submitting}>
          Iniciar Sesión
        </Button>
      </form>

      <div className="mt-6">
        <SocialButtons />
      </div>
    </AuthLayout>
  );
}
