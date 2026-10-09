import { Lock } from "lucide-react";
import { useEffect, useId, useState, type FormEvent } from "react";

import { ConfirmDialog } from "../../../components/feedback/ConfirmDialog";
import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { useToast } from "../../../components/feedback/useToast";
import { Button } from "../../../components/forms/Button";
import { Checkbox } from "../../../components/forms/Checkbox";
import { RichTextEditor } from "../../../components/forms/RichTextEditor";
import { TextField } from "../../../components/forms/TextField";
import { FormStatus } from "../../../components/ui/FormStatus";
import { Drawer } from "../../../components/ui/Overlay";
import { parseValidationErrors } from "../../../lib/formErrors";
import { htmlToPlainText } from "../../../lib/htmlText";
import { sanitizeNotificationHtml } from "../../../lib/sanitizeHtml";
import { notificationService } from "../../../services/notificationService";
import { ApiError } from "../../../types/api";
import {
  NOTIFICATION_TITULO_MAX_LENGTH,
  type Notification,
  type UpdateNotificationDTO,
} from "../../../types/notification";

interface NotificationEditDrawerProps {
  /** Notificación a editar; `null` mantiene el panel cerrado. */
  notification: Notification | null;
  /** "Nombre <correo>" del destinatario (no modificable). */
  recipientLabel: string;
  onClose: () => void;
  onSaved: (saved: Notification) => void;
}

/** Panel lateral para editar una notificación ya enviada. */
export function NotificationEditDrawer({
  notification,
  recipientLabel,
  onClose,
  onSaved,
}: NotificationEditDrawerProps) {
  const toast = useToast();
  const formId = useId();
  const open = notification !== null;
  const [titulo, setTitulo] = useState("");
  const [mensaje, setMensaje] = useState("");
  const [leida, setLeida] = useState(false);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const notificationId = notification?.id;
  useEffect(() => {
    if (!notification) {
      return;
    }
    setTitulo(notification.titulo);
    setMensaje(notification.mensaje);
    setLeida(notification.leida);
    setServerErrors({});
    setError(null);
    setSubmitted(false);
    setConfirmDiscard(false);
    // Solo al abrir otra notificación: un refresco de la bandeja no debe
    // pisar lo que se está escribiendo.
  }, [notificationId]);

  const sanitized = sanitizeNotificationHtml(mensaje);
  // Se compara contra el original ya saneado: así abrir el panel no cuenta como cambio.
  const baseline = notification
    ? sanitizeNotificationHtml(notification.mensaje)
    : "";
  const errors = {
    titulo: titulo.trim() ? serverErrors.titulo : "Escribe el título.",
    mensaje: htmlToPlainText(mensaje)
      ? serverErrors.mensaje
      : "Escribe el mensaje.",
  };
  const errorCount = Number(Boolean(errors.titulo)) + Number(Boolean(errors.mensaje));
  const dirty =
    notification !== null &&
    (titulo.trim() !== notification.titulo ||
      sanitized !== baseline ||
      leida !== notification.leida);
  const canSubmit = errorCount === 0 && dirty;

  const requestClose = () => {
    if (submitting) {
      return;
    }
    if (dirty) {
      setConfirmDiscard(true);
    } else {
      onClose();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitted(true);
    if (!notification || !canSubmit) {
      return;
    }

    const payload: UpdateNotificationDTO = {};
    if (titulo.trim() !== notification.titulo) {
      payload.titulo = titulo.trim();
    }
    if (sanitized !== baseline) {
      payload.mensaje = sanitized;
    }
    if (leida !== notification.leida) {
      payload.leida = leida;
    }

    setSubmitting(true);
    try {
      const saved = await notificationService.update(notification.id, payload);
      toast.success("Los cambios de la notificación se guardaron.");
      onSaved(saved);
    } catch (err) {
      if (err instanceof ApiError && err.isValidation) {
        setServerErrors(parseValidationErrors(err).fieldErrors);
      }
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Drawer
        open={open}
        title="Editar notificación"
        onClose={requestClose}
        footer={
          <div className="flex flex-col gap-3">
            <FormStatus
              saving={submitting}
              submitted={submitted}
              errorCount={errorCount}
              dirty={dirty}
            />
            <div className="flex justify-end gap-2.5">
              <Button
                variant="secondary"
                onClick={requestClose}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form={formId}
                loading={submitting}
                loadingLabel="Guardando…"
                disabled={!canSubmit}
              >
                Guardar cambios
              </Button>
            </div>
          </div>
        }
      >
        <form
          id={formId}
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-4"
        >
          {error ? (
            <ErrorAlert error={error} onClose={() => setError(null)} />
          ) : null}

          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-bold">Para</span>
            <p className="flex min-h-[var(--control-h)] items-center gap-2 rounded-[10px] border border-input bg-disabled px-3 py-2 text-[15px] break-all text-text-secondary">
              <Lock className="size-[18px] shrink-0" aria-hidden="true" />
              {recipientLabel}
            </p>
            <p className="text-[13px] text-muted-foreground">
              El destinatario de una notificación enviada no se puede cambiar.
            </p>
          </div>

          <TextField
            label="Título"
            name="titulo"
            required
            maxLength={NOTIFICATION_TITULO_MAX_LENGTH}
            value={titulo}
            onChange={(e) => {
              setTitulo(e.target.value);
              setServerErrors({});
            }}
            error={errors.titulo}
          />

          {/* Se remonta por notificación: el editor solo lee su valor inicial. */}
          {notification ? (
            <RichTextEditor
              key={notification.id}
              label="Mensaje"
              required
              initialValue={notification.mensaje}
              onChange={setMensaje}
              error={errors.mensaje}
            />
          ) : null}

          <div className="rounded-xl border border-divider bg-surface-alt px-3.5 py-2.5">
            <Checkbox
              name="leida"
              label="Marcar como leída"
              checked={leida}
              onChange={(e) => setLeida(e.target.checked)}
            />
          </div>
        </form>
      </Drawer>

      <ConfirmDialog
        open={confirmDiscard}
        danger
        title="¿Descartar los cambios?"
        description="Los cambios que hiciste en esta notificación no se guardarán."
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
        onConfirm={() => {
          setConfirmDiscard(false);
          onClose();
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </>
  );
}
