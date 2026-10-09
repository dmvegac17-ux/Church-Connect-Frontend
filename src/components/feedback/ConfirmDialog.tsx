import { AnimatePresence, motion } from "framer-motion";
import { TriangleAlert } from "lucide-react";
import { useEffect, useId, useRef } from "react";

import { Button } from "../forms/Button";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  /** Texto del botón de confirmar mientras `loading`. */
  loadingLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  /** Acción alternativa no destructiva (p. ej. "Desactivar en su lugar"). */
  altLabel?: string;
  onAlt?: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  loading = false,
  loadingLabel,
  danger = false,
  onConfirm,
  onCancel,
  altLabel,
  onAlt,
}: ConfirmDialogProps) {
  const titleId = useId();
  const descId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    // El foco inicial va a la opción segura.
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        // La confirmación es la capa superior: se cierra antes que nada más.
        e.stopImmediatePropagation();
        onCancel();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, loading, onCancel]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-overlay p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !loading && onCancel()}
        >
          <motion.div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? descId : undefined}
            className="w-full max-w-[440px] rounded-2xl bg-card p-6 shadow-modal"
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                  danger
                    ? "bg-destructive-soft text-destructive"
                    : "bg-warning-soft text-warning-foreground"
                }`}
                aria-hidden="true"
              >
                <TriangleAlert className="size-[22px]" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id={titleId} className="text-lg font-extrabold text-foreground">
                  {title}
                </h2>
                {description ? (
                  <p
                    id={descId}
                    className="mt-1.5 text-[15px] leading-normal text-text-secondary"
                  >
                    {description}
                  </p>
                ) : null}
              </div>
            </div>
            <div className="mt-6 flex flex-wrap justify-end gap-2.5">
              {altLabel && onAlt ? (
                <Button
                  variant="secondary"
                  onClick={onAlt}
                  disabled={loading}
                  className="mr-auto"
                >
                  {altLabel}
                </Button>
              ) : null}
              <Button
                variant="secondary"
                onClick={onCancel}
                disabled={loading}
                ref={cancelRef}
              >
                {cancelLabel}
              </Button>
              <Button
                variant={danger ? "danger" : "primary"}
                onClick={onConfirm}
                loading={loading}
                loadingLabel={loadingLabel}
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
