import { AnimatePresence, motion } from "framer-motion";
import { Maximize2, Minimize2, Send, X } from "lucide-react";
import { useEffect, useState } from "react";

import { useToast } from "../../../components/feedback/useToast";
import { sanitizeNotificationHtml } from "../../../lib/sanitizeHtml";
import { notificationService } from "../../../services/notificationService";
import { ApiError } from "../../../types/api";
import type {
  BulkNotificationDTO,
  BulkNotificationResult,
} from "../../../types/notification";
import {
  BulkNotificationForm,
  type BulkNotificationFormValues,
} from "./BulkNotificationForm";
import { BulkResultSummary } from "./BulkResultSummary";

interface ComposeNotificationModalProps {
  open: boolean;
  onClose: () => void;
  /** Se dispara tras un envío que registró al menos una notificación (201/207), para refrescar la bandeja. */
  onSent?: () => void;
}

/**
 * Ventana de redacción estilo Gmail: flotante, no bloquea el resto de la
 * pantalla, con un botón para expandirla. Reemplaza la navegación a una
 * página aparte para enviar notificaciones.
 */
export function ComposeNotificationModal({
  open,
  onClose,
  onSent,
}: ComposeNotificationModalProps) {
  const toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | undefined>(undefined);
  const [result, setResult] = useState<BulkNotificationResult | null>(null);
  const [resetSignal, setResetSignal] = useState(0);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setExpanded(false);
      setResult(null);
      setFormError(undefined);
    }
  }, [open]);

  const handleSubmit = async (values: BulkNotificationFormValues) => {
    if (values.usuariosIds.length === 0) {
      setFormError("Selecciona al menos un destinatario.");
      return;
    }

    setFormError(undefined);
    setResult(null);

    const payload: BulkNotificationDTO = {
      titulo: values.titulo.trim(),
      mensaje: sanitizeNotificationHtml(values.mensaje),
      usuarios_ids: values.usuariosIds,
    };

    setSubmitting(true);
    try {
      const response = await notificationService.createBulk(payload);
      setResult(response);

      if (response.status === 201) {
        toast.success(
          `Se enviaron ${response.meta.exitosas} notificaciones exitosamente.`,
          "Notificación enviada",
        );
        setResetSignal((k) => k + 1);
        onSent?.();
        onClose();
      } else if (response.status === 207) {
        toast.info(
          `Se enviaron ${response.meta.exitosas} notificaciones exitosamente y ${response.meta.fallidas} fallaron.`,
          "Envío parcial",
        );
        onSent?.();
      } else {
        toast.error(
          "Error al procesar la solicitud. Ninguna notificación pudo ser enviada.",
          "Envío fallido",
        );
      }
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.message
          : "Error al procesar la solicitud. Ninguna notificación pudo ser enviada.",
        "Error",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          role="dialog"
          aria-modal="false"
          aria-label="Nueva notificación"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 24 }}
          transition={{ duration: 0.18 }}
          className={
            expanded
              ? "fixed inset-4 z-50 flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl sm:inset-10 md:inset-16"
              : "fixed inset-x-0 bottom-0 z-50 flex h-[34rem] max-h-[85vh] flex-col overflow-hidden rounded-t-xl border border-border bg-card shadow-2xl sm:inset-x-auto sm:bottom-0 sm:right-6 sm:w-[26rem]"
          }
        >
          <div className="flex shrink-0 items-center justify-between gap-2 rounded-t-xl bg-primary px-4 py-3 text-primary-foreground">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Send className="size-4" aria-hidden="true" />
              Nueva notificación
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-label={expanded ? "Restaurar tamaño" : "Expandir"}
                title={expanded ? "Restaurar tamaño" : "Expandir"}
                className="rounded p-1.5 hover:bg-white/15"
              >
                {expanded ? (
                  <Minimize2 className="size-4" aria-hidden="true" />
                ) : (
                  <Maximize2 className="size-4" aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                title="Cerrar"
                className="rounded p-1.5 hover:bg-white/15"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-4 sm:p-6">
            <BulkNotificationForm
              submitting={submitting}
              formError={formError}
              onSubmit={handleSubmit}
              resetSignal={resetSignal}
            />
            {result ? (
              <div className="mt-3 shrink-0">
                <BulkResultSummary result={result} />
              </div>
            ) : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
