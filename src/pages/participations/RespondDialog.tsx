import { AnimatePresence, motion } from "framer-motion";
import { CalendarX, UserCheck } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import { Alert } from "../../components/feedback/ErrorAlert";
import { Button } from "../../components/forms/Button";
import { TextArea } from "../../components/forms/TextArea";
import { trapTabKey } from "../../components/ui/Overlay";
import { clockRange, longDay } from "../../lib/participations";
import type { Invitation } from "../../types/participation";

export const REASON_MAX = 255;

interface RespondDialogProps {
  /** Invitación a responder; `null` cierra el diálogo. */
  invitation: Invitation | null;
  mode: "accept" | "reject";
  reason: string;
  onReasonChange: (value: string) => void;
  busy: boolean;
  /** Error de red o del servidor: la invitación sigue pendiente. */
  error: string | null;
  onSubmit: () => void;
  onClose: () => void;
}

/** Confirmación de aceptar / rechazar una invitación (con motivo opcional). */
export function RespondDialog({
  invitation,
  mode,
  reason,
  onReasonChange,
  busy,
  error,
  onSubmit,
  onClose,
}: RespondDialogProps) {
  const titleId = useId();
  const bodyId = useId();
  const backRef = useRef<HTMLButtonElement>(null);
  const open = invitation !== null;
  const accept = mode === "accept";

  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.activeElement as HTMLElement | null;
    // El foco inicial va a la opción segura.
    backRef.current?.focus();
    return () => previous?.focus?.();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, busy, onClose]);

  return (
    <AnimatePresence>
      {invitation ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-overlay p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !busy && onClose()}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            className="flex max-h-[92vh] w-full max-w-[480px] flex-col gap-3.5 overflow-y-auto rounded-2xl bg-card p-6 shadow-modal"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={trapTabKey}
          >
            <div className="flex items-start gap-3.5">
              <span
                aria-hidden="true"
                className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${
                  accept
                    ? "bg-success-soft text-success"
                    : "bg-destructive-soft text-destructive"
                }`}
              >
                {accept ? (
                  <UserCheck className="size-6" />
                ) : (
                  <CalendarX className="size-6" />
                )}
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <h2 id={titleId} className="text-[19px] font-extrabold">
                  {accept ? "Confirmar participación" : "Rechazar participación"}
                </h2>
                <p className="text-base font-bold break-words">
                  {invitation.actividad.nombre}
                </p>
                <p className="text-sm text-muted-foreground">
                  {invitation.evento.nombre} · {longDay(invitation.actividad.fecha)} ·{" "}
                  {clockRange(
                    invitation.actividad.hora_inicio,
                    invitation.actividad.hora_fin,
                  )}
                </p>
              </div>
            </div>

            <p id={bodyId} className="text-[15px] leading-normal text-text-strong">
              {accept
                ? "El responsable verá que confirmaste. Si después no puedes asistir, avísale con tiempo."
                : "Tu respuesta quedará registrada y el administrador podrá asignar la actividad a otra persona."}
            </p>

            {accept ? null : (
              <TextArea
                label="Motivo"
                optional
                name="motivo-rechazo"
                rows={3}
                maxLength={REASON_MAX}
                placeholder="Ej. Estaré de viaje ese día"
                value={reason}
                disabled={busy}
                onChange={(e) => onReasonChange(e.target.value.slice(0, REASON_MAX))}
              />
            )}

            {error ? <Alert variant="error" message={error} /> : null}

            <div className="mt-1 flex flex-wrap justify-end gap-2.5">
              <Button variant="secondary" onClick={onClose} disabled={busy} ref={backRef}>
                Volver
              </Button>
              <Button
                variant={accept ? "primary" : "danger"}
                onClick={onSubmit}
                loading={busy}
                loadingLabel={accept ? "Confirmando…" : "Enviando…"}
              >
                {error
                  ? "Reintentar"
                  : accept
                    ? "Sí, participaré"
                    : "No podré participar"}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
