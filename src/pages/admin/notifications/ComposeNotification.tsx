import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  ChevronUp,
  Maximize2,
  Minimize2,
  Send,
  X,
} from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { useAuth } from "../../../auth/useAuth";
import { ConfirmDialog } from "../../../components/feedback/ConfirmDialog";
import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { useToast } from "../../../components/feedback/useToast";
import { Button } from "../../../components/forms/Button";
import { RichTextEditor } from "../../../components/forms/RichTextEditor";
import { TextField } from "../../../components/forms/TextField";
import { useFullList } from "../../../hooks/useFullList";
import { htmlToPlainText } from "../../../lib/htmlText";
import {
  clearDraft,
  EMPTY_DRAFT,
  loadDraft,
  saveDraft,
} from "../../../lib/notificationDraft";
import { sanitizeNotificationHtml } from "../../../lib/sanitizeHtml";
import { notificationService } from "../../../services/notificationService";
import { userService } from "../../../services/userService";
import { ApiError } from "../../../types/api";
import {
  NOTIFICATION_TITULO_MAX_LENGTH,
  type BulkNotificationDTO,
  type BulkNotificationResult,
} from "../../../types/notification";
import { BulkResultSummary } from "./BulkResultSummary";
import { RecipientsField } from "./RecipientsField";

const MENSAJE_MAX = 2000;

interface ComposeNotificationProps {
  open: boolean;
  onClose: () => void;
  /** Minimizada: solo queda la barra de título; lo escrito se conserva. */
  minimized: boolean;
  onMinimizedChange: (minimized: boolean) => void;
  /** Se dispara tras un envío que registró al menos una notificación (201/207), para refrescar la bandeja. */
  onSent?: () => void;
}

/**
 * Redactor estilo correo: ventana flotante que no bloquea la bandeja, con
 * botones para minimizarla y expandirla. Lo escrito se guarda como borrador
 * en este navegador: cerrar la ventana o salir de Notificaciones no lo
 * pierde; solo se borra al enviarlo o al descartarlo.
 */
export function ComposeNotification({
  open,
  onClose,
  minimized,
  onMinimizedChange: setMinimized,
  onSent,
}: ComposeNotificationProps) {
  const toast = useToast();
  const { user } = useAuth();
  const userId = user?.id;
  // El borrador guardado se lee una sola vez, al montar.
  const [draft] = useState(() => loadDraft(userId) ?? EMPTY_DRAFT);
  const users = useFullList(userService.list, open);
  const [expanded, setExpanded] = useState(false);
  const [recipients, setRecipients] = useState<string[]>(draft.recipients);
  const [titulo, setTitulo] = useState(draft.titulo);
  const [mensaje, setMensaje] = useState(draft.mensaje);
  const [touched, setTouched] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [result, setResult] = useState<BulkNotificationResult | null>(null);
  const [resetSignal, setResetSignal] = useState(0);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const plainMessage = htmlToPlainText(mensaje);
  const hasContent =
    recipients.length > 0 || titulo.trim() !== "" || plainMessage !== "";
  const messageTooLong = plainMessage.length > MENSAJE_MAX;
  const valid =
    recipients.length > 0 &&
    titulo.trim() !== "" &&
    plainMessage !== "" &&
    !messageTooLong;

  // Guardado automático del borrador (y limpieza cuando queda vacío).
  useEffect(() => {
    if (hasContent) {
      saveDraft(userId, { recipients, titulo, mensaje });
    } else {
      clearDraft(userId);
    }
  }, [userId, hasContent, recipients, titulo, mensaje]);

  const reset = () => {
    setRecipients([]);
    setTitulo("");
    setMensaje("");
    setTouched(false);
    setError(null);
    setResult(null);
    setResetSignal((k) => k + 1);
  };

  const requestClose = () => {
    if (submitting) {
      return;
    }
    if (hasContent) {
      toast.info("Borrador guardado. Lo encontrarás al volver a Notificaciones.");
    }
    onClose();
  };
  const requestCloseRef = useRef(requestClose);
  requestCloseRef.current = requestClose;

  useEffect(() => {
    if (!open) {
      setExpanded(false);
      setConfirmDiscard(false);
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        e.preventDefault();
        requestCloseRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!valid) {
      return;
    }
    setError(null);
    setResult(null);

    const payload: BulkNotificationDTO = {
      titulo: titulo.trim(),
      mensaje: sanitizeNotificationHtml(mensaje),
      usuarios_ids: recipients,
    };

    setSubmitting(true);
    try {
      const response = await notificationService.createBulk(payload);

      if (response.status === 201) {
        const n = response.meta.exitosas;
        toast.success(
          `Notificación enviada a ${n} ${n === 1 ? "persona" : "personas"}.`,
        );
        reset();
        onSent?.();
        onClose();
      } else if (response.status === 207) {
        // Envío parcial: el resumen queda a la vista para saber quién faltó.
        setResult(response);
        onSent?.();
      } else {
        setResult(response);
      }
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err
          : new Error("No se pudo enviar la notificación. Inténtalo de nuevo."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {open && expanded && !minimized ? (
          <motion.div
            className="fixed inset-0 z-[62] bg-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setExpanded(false)}
          />
        ) : null}
      </AnimatePresence>
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
              minimized
                ? "fixed inset-x-0 bottom-0 z-[63] flex flex-col overflow-hidden rounded-t-2xl bg-card shadow-modal sm:inset-x-auto sm:right-6 sm:w-[480px]"
                : expanded
                  ? "fixed inset-3 z-[63] mx-auto flex max-w-[860px] flex-col overflow-hidden rounded-2xl bg-card shadow-modal sm:inset-8"
                  : "fixed inset-x-0 bottom-0 z-[63] flex h-[min(620px,88vh)] flex-col overflow-hidden rounded-t-2xl border border-border bg-card shadow-modal sm:inset-x-auto sm:right-6 sm:w-[480px]"
            }
          >
            <div className="flex shrink-0 items-center justify-between gap-2 bg-sidebar py-1.5 pr-1.5 pl-4 text-sidebar-foreground">
              <span className="flex items-center gap-2 text-[15px] font-extrabold">
                <Send className="size-[18px]" aria-hidden="true" />
                Nueva notificación
                {hasContent ? (
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs font-bold">
                    Borrador
                  </span>
                ) : null}
              </span>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setMinimized(!minimized)}
                  aria-expanded={!minimized}
                  aria-label={minimized ? "Restaurar" : "Minimizar"}
                  title={minimized ? "Restaurar" : "Minimizar"}
                  className="flex size-10 items-center justify-center rounded-[10px] hover:bg-white/15"
                >
                  {minimized ? (
                    <ChevronUp className="size-5" aria-hidden="true" />
                  ) : (
                    <ChevronDown className="size-5" aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Desde la barra minimizada, expandir también la restaura.
                    setExpanded(minimized ? true : !expanded);
                    setMinimized(false);
                  }}
                  aria-label={expanded && !minimized ? "Restaurar tamaño" : "Expandir"}
                  title={expanded && !minimized ? "Restaurar tamaño" : "Expandir"}
                  className="flex size-10 items-center justify-center rounded-[10px] hover:bg-white/15"
                >
                  {expanded && !minimized ? (
                    <Minimize2 className="size-[18px]" aria-hidden="true" />
                  ) : (
                    <Maximize2 className="size-[18px]" aria-hidden="true" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={requestClose}
                  aria-label="Cerrar"
                  title="Cerrar"
                  className="flex size-10 items-center justify-center rounded-[10px] hover:bg-white/15"
                >
                  <X className="size-5" aria-hidden="true" />
                </button>
              </div>
            </div>

            <form
              onSubmit={handleSubmit}
              noValidate
              className={minimized ? "hidden" : "flex min-h-0 flex-1 flex-col"}
            >
              <div className="flex min-h-0 flex-1 flex-col gap-3.5 overflow-y-auto p-4">
                {error ? (
                  <ErrorAlert error={error} onClose={() => setError(null)} />
                ) : null}
                {result ? <BulkResultSummary result={result} /> : null}

                <RecipientsField
                  users={users.items}
                  loading={users.isLoading}
                  selectedIds={recipients}
                  onChange={setRecipients}
                  error={
                    users.error
                      ? "No se pudieron cargar los usuarios."
                      : touched && recipients.length === 0
                        ? "Elige al menos un destinatario."
                        : undefined
                  }
                />
                <TextField
                  label="Asunto"
                  name="titulo"
                  required
                  maxLength={NOTIFICATION_TITULO_MAX_LENGTH}
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  onBlur={() => setTouched(true)}
                  error={
                    touched && !titulo.trim() ? "Escribe el asunto." : undefined
                  }
                />
                <div className="min-h-[220px] flex-1">
                  <RichTextEditor
                    label="Mensaje"
                    required
                    fill
                    initialValue={mensaje}
                    onChange={setMensaje}
                    error={
                      messageTooLong
                        ? `El mensaje supera los ${MENSAJE_MAX} caracteres (${plainMessage.length}).`
                        : touched && !plainMessage
                          ? "Escribe el mensaje."
                          : undefined
                    }
                    resetSignal={resetSignal}
                  />
                </div>
              </div>

              <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-divider bg-surface-alt px-4 py-3">
                <p className="text-[13px] text-muted-foreground" role="status">
                  {valid
                    ? `Lista para enviar a ${recipients.length} ${recipients.length === 1 ? "persona" : "personas"}.`
                    : hasContent
                      ? "Borrador guardado. Falta completar para enviar."
                      : "Elige destinatarios y escribe el asunto y el mensaje."}
                </p>
                <div className="ml-auto flex gap-2">
                  {hasContent ? (
                    <Button
                      variant="ghost"
                      onClick={() => setConfirmDiscard(true)}
                      disabled={submitting}
                    >
                      Descartar
                    </Button>
                  ) : null}
                  <Button
                    type="submit"
                    loading={submitting}
                    loadingLabel="Enviando…"
                    disabled={!valid}
                  >
                    <Send className="size-[18px]" aria-hidden="true" />
                    Enviar
                  </Button>
                </div>
              </div>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmDiscard}
        danger
        title="¿Descartar este borrador?"
        description="Se borrará lo que escribiste: destinatarios, asunto y mensaje."
        confirmLabel="Descartar"
        cancelLabel="Seguir escribiendo"
        onConfirm={() => {
          setConfirmDiscard(false);
          reset();
          onClose();
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </>
  );
}
