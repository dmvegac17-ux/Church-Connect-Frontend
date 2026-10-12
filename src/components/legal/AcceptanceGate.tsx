import { ExternalLink, FileCheck2 } from "lucide-react";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { useAuth } from "../../auth/useAuth";
import { ErrorAlert } from "../feedback/ErrorAlert";
import { FullPageSpinner } from "../feedback/Spinner";
import { Button } from "../forms/Button";
import { Checkbox } from "../forms/Checkbox";
import { BrandLogo } from "../layout/BrandLogo";
import { clearHttpCache } from "../../lib/httpClient";
import {
  ACCEPTANCE_PENDING_EVENT,
  legalService,
} from "../../services/legalService";
import { LEGAL_PATHS, type PendingDocument } from "../../types/legal";

/**
 * Paso obligatorio antes de entrar a la aplicación: si la persona tiene
 * documentos legales por aceptar (cuenta creada por un administrador, o una
 * versión nueva que lo exige), se le muestran aquí. Mientras no acepte, el
 * backend le niega todo lo demás, así que no hay nada que cargar detrás.
 */
export function AcceptanceGate({ children }: { children: ReactNode }) {
  const { logout } = useAuth();
  const [pending, setPending] = useState<PendingDocument[] | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const check = useCallback(() => {
    legalService
      .pending()
      .then(setPending)
      // Si no se puede consultar, no se bloquea aquí: el backend sigue
      // negando el acceso a quien tenga algo pendiente.
      .catch(() => setPending([]));
  }, []);

  useEffect(check, [check]);

  // Una versión nueva puede publicarse con la sesión ya abierta: el backend
  // empieza a responder con el bloqueo y hay que mostrar este paso.
  useEffect(() => {
    window.addEventListener(ACCEPTANCE_PENDING_EVENT, check);
    return () => window.removeEventListener(ACCEPTANCE_PENDING_EVENT, check);
  }, [check]);

  if (pending === null) {
    return <FullPageSpinner label="Cargando…" />;
  }
  if (pending.length === 0) {
    return <>{children}</>;
  }

  const handleAccept = async () => {
    setSubmitting(true);
    setError(null);
    try {
      await legalService.accept(pending.map((d) => d.id));
      // Lo que se pidió mientras estaba bloqueada ya no vale.
      clearHttpCache();
      setAccepted(false);
      setPending([]);
    } catch (err) {
      setError(err);
      // Si los documentos cambiaron entre tanto, se muestran los nuevos.
      check();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="bg-linear-to-br from-primary to-primary-hover text-primary-foreground">
        <div className="mx-auto flex w-full max-w-[560px] items-center gap-3 px-5 py-4">
          <BrandLogo className="size-11 shrink-0" />
          <span className="flex flex-col">
            <span className="text-xl leading-tight font-extrabold">Church Connect</span>
            <span className="text-sm text-[#E3ECE5]">Conectados con tu fe</span>
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-[560px] flex-1 flex-col gap-5 px-5 py-8">
        <span
          className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary"
          aria-hidden="true"
        >
          <FileCheck2 className="size-7" />
        </span>
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-extrabold">Antes de continuar</h1>
          <p className="text-[15px] leading-normal text-muted-foreground">
            Para usar la aplicación necesitamos que leas y aceptes{" "}
            {pending.length === 1 ? "este documento" : "estos documentos"}. Se
            abren en otra pestaña.
          </p>
        </div>

        <ul className="flex flex-col gap-2.5">
          {pending.map((doc) => (
            <li key={doc.id}>
              <a
                href={LEGAL_PATHS[doc.tipo]}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3.5 hover:border-primary"
              >
                <span className="flex flex-col">
                  <span className="text-[15px] font-extrabold text-foreground">
                    {doc.titulo}
                  </span>
                  <span className="text-[13px] text-muted-foreground">
                    Versión {doc.version}
                  </span>
                </span>
                <ExternalLink className="size-5 shrink-0 text-primary" aria-hidden="true" />
              </a>
            </li>
          ))}
        </ul>

        {error ? <ErrorAlert error={error} onClose={() => setError(null)} /> : null}

        <Checkbox
          name="acepta-documentos"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          label={
            pending.length === 1
              ? `He leído y acepto: ${pending[0].titulo}.`
              : "He leído y acepto los términos y condiciones y la política de privacidad, y autorizo el tratamiento de mis datos personales."
          }
        />

        <div className="flex flex-col gap-2.5">
          <Button
            className="!h-12 !rounded-xl !text-base !font-extrabold"
            disabled={!accepted}
            loading={submitting}
            loadingLabel="Guardando…"
            onClick={() => void handleAccept()}
          >
            Aceptar y continuar
          </Button>
          <Button variant="ghost" onClick={logout}>
            Cerrar sesión
          </Button>
        </div>
        <p className="text-center text-[13px] text-muted-foreground">
          Si no aceptas no podrás usar la aplicación, pero puedes cerrar sesión
          y volver cuando quieras.
        </p>
      </main>
    </div>
  );
}
