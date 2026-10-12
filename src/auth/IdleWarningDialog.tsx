import { AnimatePresence, motion } from "framer-motion";
import { Clock } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import { Button } from "../components/forms/Button";
import { trapTabKey } from "../components/ui/Overlay";

interface IdleWarningDialogProps {
  /** Segundos que faltan para el cierre; `null` oculta el aviso. */
  secondsLeft: number | null;
  /** Cancela el cierre: la sesión sigue abierta. */
  onStay: () => void;
  /** Confirma el cierre sin esperar la cuenta regresiva. */
  onLogout: () => void;
}

/**
 * Aviso previo al cierre por inactividad. Si nadie responde antes de que
 * termine la cuenta regresiva, la sesión se cierra sola.
 */
export function IdleWarningDialog({
  secondsLeft,
  onStay,
  onLogout,
}: IdleWarningDialogProps) {
  const titleId = useId();
  const bodyId = useId();
  const stayRef = useRef<HTMLButtonElement>(null);
  const open = secondsLeft !== null;

  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.activeElement as HTMLElement | null;
    // El foco va a la opción que conserva el trabajo.
    stayRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        // Es la capa superior: Escape cancela el cierre y nada más.
        e.stopImmediatePropagation();
        e.preventDefault();
        onStay();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      previous?.focus?.();
    };
  }, [open, onStay]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-overlay p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={bodyId}
            className="w-full max-w-[440px] rounded-2xl bg-card p-6 text-foreground shadow-modal"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            onKeyDown={trapTabKey}
          >
            <div className="flex items-start gap-3.5">
              <span
                aria-hidden="true"
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warning-soft text-warning-foreground"
              >
                <Clock className="size-[22px]" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-lg font-extrabold">
                  ¿Sigues ahí?
                </h2>
                <p
                  id={bodyId}
                  className="mt-1.5 text-[15px] leading-normal text-text-secondary"
                >
                  Pasaron 15 minutos sin actividad. Por seguridad cerraremos tu
                  sesión en{" "}
                  {/* `timer`: el lector de pantalla no anuncia cada segundo. */}
                  <strong role="timer" className="font-extrabold text-foreground">
                    {secondsLeft} {secondsLeft === 1 ? "segundo" : "segundos"}
                  </strong>
                  .
                </p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2.5">
              <Button variant="secondary" onClick={onLogout}>
                Cerrar sesión
              </Button>
              <Button onClick={onStay} ref={stayRef}>
                Seguir conectado
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
