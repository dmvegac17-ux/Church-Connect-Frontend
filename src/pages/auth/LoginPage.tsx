import { ArrowLeft, Lock, Mail } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { SocialButtons } from "../../components/auth/SocialButtons";
import { Alert, ErrorAlert } from "../../components/feedback/ErrorAlert";
import { useToast } from "../../components/feedback/useToast";
import { Button } from "../../components/forms/Button";
import { Checkbox } from "../../components/forms/Checkbox";
import { PasswordField } from "../../components/forms/PasswordField";
import { TextField } from "../../components/forms/TextField";
import { AuthHeading, AuthLayout } from "../../components/layout/AuthLayout";
import { HOME_PATH } from "../../config/navigation";
import { useTouched } from "../../hooks/useTouched";
import { emailError, sanitizeEmail } from "../../lib/validators";
import { ApiError } from "../../types/api";

interface LocationState {
  from?: { pathname: string };
  registered?: boolean;
}

const BAD_CREDENTIALS =
  "El correo o la contraseña no son correctos. Revisa los datos e inténtalo de nuevo.";

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const state = (location.state ?? null) as LocationState | null;

  const [view, setView] = useState<"login" | "forgot">("login");
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const fields = useTouched<"correo" | "contrasena">();

  useEffect(() => {
    if (isAuthenticated) {
      navigate(HOME_PATH, { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // Aviso tras un registro que no pudo iniciar sesión solo; se limpia el
  // state de navegación para que no reaparezca al refrescar o volver atrás.
  useEffect(() => {
    if (state?.registered) {
      toast.success("Tu cuenta fue creada. Ya puedes iniciar sesión.");
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [state?.registered, toast, navigate, location.pathname]);

  const errors = {
    correo: emailError(correo),
    contrasena: contrasena ? undefined : "Ingresa tu contraseña.",
  };
  const valid = !errors.correo && !errors.contrasena;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    fields.setSubmitted(true);
    if (!valid) {
      return;
    }

    setSubmitting(true);
    try {
      await login({ correo: correo.trim(), contrasena }, remember);
      // Directo al Inicio que corresponda al rol, sin pantalla intermedia.
      navigate(state?.from?.pathname ?? HOME_PATH, { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (view === "forgot") {
    return (
      <AuthLayout>
        <ForgotPassword
          initialEmail={correo}
          onBack={() => setView("login")}
        />
      </AuthLayout>
    );
  }

  const badCredentials = error instanceof ApiError && error.status === 401;

  return (
    <AuthLayout tab="login">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <AuthHeading
          title="Bienvenido de nuevo"
          description="Ingresa con tu correo y contraseña."
        />

        {badCredentials ? (
          <Alert variant="error" message={BAD_CREDENTIALS} />
        ) : error ? (
          <ErrorAlert error={error} onClose={() => setError(null)} />
        ) : null}

        <TextField
          label="Correo electrónico"
          name="correo"
          type="email"
          autoComplete="email"
          placeholder="tu@email.com"
          icon={<Mail className="size-5" />}
          required
          hideCounter
          value={correo}
          onChange={(e) => setCorreo(sanitizeEmail(e.target.value))}
          onBlur={() => fields.touch("correo")}
          error={fields.visible(errors, "correo")}
        />
        <PasswordField
          label="Contraseña"
          name="contrasena"
          autoComplete="current-password"
          icon={<Lock className="size-5" />}
          required
          value={contrasena}
          onChange={(e) => setContrasena(e.target.value)}
          onBlur={() => fields.touch("contrasena")}
          error={fields.visible(errors, "contrasena")}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Checkbox
            name="remember"
            label="Recordarme"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
          />
          <button
            type="button"
            onClick={() => setView("forgot")}
            className="min-h-8 rounded py-1 text-[15px] font-bold text-primary hover:underline"
          >
            ¿Olvidaste tu contraseña?
          </button>
        </div>

        <Button
          type="submit"
          className="!h-12 !rounded-xl !text-base !font-extrabold"
          loading={submitting}
          loadingLabel="Ingresando…"
          disabled={!valid}
        >
          Iniciar sesión
        </Button>

        <SocialButtons />
      </form>
    </AuthLayout>
  );
}

/**
 * Vista de recuperación dentro de Acceso. El backend todavía no expone un
 * endpoint para enviar el enlace, así que no se confirma un envío que no
 * ocurre: se indica el camino que sí funciona hoy.
 */
function ForgotPassword({
  initialEmail,
  onBack,
}: {
  initialEmail: string;
  onBack: () => void;
}) {
  const [correo, setCorreo] = useState(initialEmail);
  const [touched, setTouched] = useState(false);
  const [requested, setRequested] = useState(false);
  const error = emailError(correo);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!error) {
      setRequested(true);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
      <button
        type="button"
        onClick={onBack}
        className="flex min-h-8 items-center gap-1 self-start rounded py-1 text-sm font-bold text-primary hover:underline"
      >
        <ArrowLeft className="size-[18px]" aria-hidden="true" />
        Volver a iniciar sesión
      </button>
      <AuthHeading
        title="Recupera tu contraseña"
        description="Escribe el correo de tu cuenta para restablecer el acceso."
      />
      <TextField
        label="Correo electrónico"
        name="correo-recuperar"
        type="email"
        autoComplete="email"
        placeholder="tu@email.com"
        icon={<Mail className="size-5" />}
        required
        hideCounter
        value={correo}
        onChange={(e) => {
          setCorreo(sanitizeEmail(e.target.value));
          setRequested(false);
        }}
        onBlur={() => setTouched(true)}
        error={touched ? error : undefined}
      />
      {requested ? (
        <Alert
          variant="info"
          title="El envío automático aún no está disponible"
          message={`Todavía no podemos enviar el enlace a ${correo}. Pide a un administrador de tu iglesia que restablezca tu contraseña; podrá asignarte una nueva al instante.`}
        />
      ) : null}
      <Button
        type="submit"
        className="!h-12 !rounded-xl !text-base !font-extrabold"
        disabled={Boolean(error)}
      >
        Enviar enlace
      </Button>
    </form>
  );
}
