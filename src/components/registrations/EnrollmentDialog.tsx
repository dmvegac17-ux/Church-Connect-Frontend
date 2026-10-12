import { AnimatePresence, motion } from "framer-motion";
import { Armchair, CalendarX, CircleAlert, UserCheck } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import { eventDateInfo } from "../../lib/eventDates";
import { memberCapacity, seatsLeftText } from "../../lib/capacity";
import type { Event } from "../../types/event";
import { Button } from "../forms/Button";
import { trapTabKey } from "../ui/Overlay";

export type EnrollmentMode = "enroll" | "cancel";

interface EnrollmentDialogProps {
  /** Evento sobre el que se actúa; `null` cierra el diálogo. */
  event: Event | null;
  mode: EnrollmentMode;
  busy: boolean;
  /** El servidor rechazó la operación: el diálogo solo ofrece «Entendido». */
  error: string | null;
  onSubmit: () => void;
  onClose: () => void;
}

/**
 * Confirmación de inscribirse o de cancelar la inscripción. El cupo lo
 * valida el servidor: si se agota mientras el diálogo está abierto, el error
 * se muestra aquí y la inscripción no se registra.
 */
export function EnrollmentDialog({
  event,
  mode,
  busy,
  error,
  onSubmit,
  onClose,
}: EnrollmentDialogProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const open = event !== null;
  const enrolling = mode === "enroll";

  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.activeElement as HTMLElement | null;
    // El foco inicial va a la opción segura.
    closeRef.current?.focus();
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

  const info = event ? eventDateInfo(event) : null;
  const title = enrolling ? "Confirmar inscripción" : "Cancelar inscripción";

  return (
    <AnimatePresence>
      {event && info ? (
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
            className="flex max-h-[92vh] w-full max-w-[460px] flex-col gap-3.5 overflow-y-auto rounded-2xl bg-card p-6 shadow-modal"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            onClick={(e) => e.stopPropagation()}
            onKeyDown={trapTabKey}
          >
            <div className="flex items-start gap-3.5">
              <span
                aria-hidden="true"
                className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${enrolling
                    ? "bg-success-soft text-success"
                    : "bg-destructive-tint text-destructive"
                  }`}
              >
                {enrolling ? (
                  <UserCheck className="size-6" />
                ) : (
                  <CalendarX className="size-6" />
                )}
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <h2 id={titleId} className="text-[19px] font-extrabold">
                  {title}
                </h2>
                <p className="text-base font-bold break-words">{event.titulo}</p>
                <p className="text-sm text-text-secondary">
                  {info.dateLong} · {info.timeRange}
                </p>
                <p className="text-sm break-words text-text-secondary">{event.lugar}</p>
              </div>
            </div>

            {error ? (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-[10px] bg-destructive-tint px-3.5 py-3 text-[15px] leading-snug text-destructive-hover"
              >
                <CircleAlert className="size-5 shrink-0" aria-hidden="true" />
                {error}
              </div>
            ) : enrolling ? (
              <p className="flex items-center gap-2 text-[15px] font-bold text-success-foreground">
                <Armchair className="size-[18px] shrink-0" aria-hidden="true" />
                {seatsLeftText(memberCapacity(event).disponibles)}
              </p>
            ) : (
              <p className="text-[15px] leading-normal text-text-strong">
                Liberarás tu cupo y otra persona podrá tomarlo.
              </p>
            )}

            <div className="mt-1 flex flex-wrap justify-end gap-2.5">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={busy}
                ref={closeRef}
              >
                {error ? "Entendido" : enrolling ? "Volver" : "Mantener inscripción"}
              </Button>
              {error ? null : (
                <Button
                  variant={enrolling ? "primary" : "danger"}
                  onClick={onSubmit}
                  loading={busy}
                  loadingLabel={enrolling ? "Inscribiendo…" : "Cancelando…"}
                >
                  {enrolling ? "Inscribirme" : "Cancelar inscripción"}
                </Button>
              )}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
