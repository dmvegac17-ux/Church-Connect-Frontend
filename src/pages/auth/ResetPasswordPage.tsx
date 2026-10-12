import { CircleCheck, Lock, TimerOff } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";

import { Alert, ErrorAlert } from "../../components/feedback/ErrorAlert";
import { Spinner } from "../../components/feedback/Spinner";
import { Button, buttonClass } from "../../components/forms/Button";
import { PasswordField } from "../../components/forms/PasswordField";
import { AuthHeading, AuthLayout } from "../../components/layout/AuthLayout";
import {
  PasswordRules,
  passwordPairValid,
} from "../../components/ui/FormStatus";
import { PASSWORD_MAX_LENGTH } from "../../lib/validators";
import { authService, resetLinkProblem } from "../../services/authService";

/** Segundos que se muestra el mensaje de éxito antes de ir al inicio de sesión. */
const REDIRECT_SECONDS = 5;

const MISSING_LINK =
  "A este enlace le falta información. Ábrelo de nuevo desde el correo o solicita otro.";

/**
 * Pantalla a la que lleva el enlace del correo (`?token=…`): elegir una
 * contraseña nueva. Antes de mostrar el formulario comprueba que el enlace
 * siga sirviendo, para no hacer escribir a nadie en un enlace vencido.
 */
export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get("token") ?? "";

  const [checking, setChecking] = useState(Boolean(token));
  const [linkProblem, setLinkProblem] = useState<string | null>(
    token ? null : MISSING_LINK,
  );
  const [contrasena, setContrasena] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!token) {
      return;
    }
    let cancelled = false;
    authService
      .validateResetLink(token)
      .catch((err: unknown) => {
        if (!cancelled) {
          // Sin respuesta clara del servidor se deja intentar: al enviar se
          // sabrá si el enlace sirve.
          setLinkProblem(resetLinkProblem(err));
        }
      })
      .finally(() => {
        if (!cancelled) {
          setChecking(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    if (!done) {
      return;
    }
    const timer = window.setTimeout(
      () => navigate("/login", { replace: true }),
      REDIRECT_SECONDS * 1000,
    );
    return () => window.clearTimeout(timer);
  }, [done, navigate]);

  const valid = passwordPairValid(contrasena, confirmar);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!valid) {
      return;
    }
    setSubmitting(true);
    try {
      await authService.resetPassword(token, contrasena);
      setDone(true);
    } catch (err) {
      const problem = resetLinkProblem(err);
      if (problem) {
        // Venció o se usó mientras se escribía.
        setLinkProblem(problem);
      } else {
        setError(err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout>
      {checking ? (
        <div className="py-10 text-center text-muted-foreground">
          <Spinner label="Comprobando el enlace…" />
        </div>
      ) : done ? (
        <div className="flex flex-col gap-4">
          <span
            className="flex size-14 items-center justify-center rounded-full bg-success-soft text-success-foreground"
            aria-hidden="true"
          >
            <CircleCheck className="size-7" />
          </span>
          <AuthHeading
            title="Tu contraseña se cambió"
            description="Ya puedes iniciar sesión con la nueva. Por seguridad cerramos las sesiones que estaban abiertas con la anterior."
          />
          <p className="text-sm text-muted-foreground" role="status">
            Te llevamos a iniciar sesión en unos segundos…
          </p>
          <Link
            to="/login"
            replace
            className={buttonClass("primary", "md", "!h-12 !rounded-xl !text-base !font-extrabold")}
          >
            Ir a iniciar sesión
          </Link>
        </div>
      ) : linkProblem ? (
        <div className="flex flex-col gap-4">
          <span
            className="flex size-14 items-center justify-center rounded-full bg-warning-soft text-warning-foreground"
            aria-hidden="true"
          >
            <TimerOff className="size-7" />
          </span>
          <AuthHeading
            title="Este enlace ya no sirve"
            description={linkProblem}
          />
          <Link
            to="/login"
            state={{ forgot: true }}
            className={buttonClass("primary", "md", "!h-12 !rounded-xl !text-base !font-extrabold")}
          >
            Solicitar un enlace nuevo
          </Link>
          <Link
            to="/login"
            className="self-start text-sm font-bold text-primary hover:underline"
          >
            Volver a iniciar sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <AuthHeading
            title="Elige una contraseña nueva"
            description="Escríbela dos veces para confirmar que quedó bien."
          />
          {error ? <ErrorAlert error={error} onClose={() => setError(null)} /> : null}
          <PasswordField
            label="Nueva contraseña"
            name="contrasena"
            autoComplete="new-password"
            icon={<Lock className="size-5" />}
            required
            maxLength={PASSWORD_MAX_LENGTH}
            value={contrasena}
            onChange={(e) => setContrasena(e.target.value)}
          />
          <PasswordField
            label="Confirmar contraseña"
            name="confirmar"
            autoComplete="new-password"
            icon={<Lock className="size-5" />}
            required
            maxLength={PASSWORD_MAX_LENGTH}
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
          />
          <PasswordRules password={contrasena} confirm={confirmar} />
          <Alert
            variant="info"
            message="Al cambiarla se cerrarán las sesiones que estén abiertas en otros dispositivos."
          />
          <Button
            type="submit"
            className="!h-12 !rounded-xl !text-base !font-extrabold"
            loading={submitting}
            loadingLabel="Guardando…"
            disabled={!valid}
          >
            Cambiar contraseña
          </Button>
        </form>
      )}
    </AuthLayout>
  );
}
