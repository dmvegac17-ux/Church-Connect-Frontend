import { Pencil } from "lucide-react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { FullPageSpinner } from "../../components/feedback/Spinner";
import { useToast } from "../../components/feedback/useToast";
import { Card, PageHeader } from "../../components/layout/Page";
import { useNotification } from "../../hooks/useNotification";
import { useUserOptions } from "../../hooks/useUserOptions";
import { parseValidationErrors } from "../../lib/formErrors";
import { sanitizeNotificationHtml } from "../../lib/sanitizeHtml";
import { notificationService } from "../../services/notificationService";
import { ApiError } from "../../types/api";
import type { UpdateNotificationDTO } from "../../types/notification";
import {
  NotificationForm,
  type NotificationFormValues,
} from "./components/NotificationForm";

export function NotificationEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { role } = useAuth();
  const { notification, isLoading, error: loadError } = useNotification(id);
  const { users } = useUserOptions(role === "ADMIN");

  const [error, setError] = useState<unknown>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return <FullPageSpinner label="Cargando notificación…" />;
  }

  if (loadError || !notification || !id) {
    return (
      <div>
        <PageHeader title="Editar notificación" backTo="/notifications" />
        <ErrorAlert
          error={loadError ?? new Error("No se pudo cargar la notificación.")}
        />
      </div>
    );
  }

  const recipient = users.find((u) => u.id === notification.usuario_id);
  const recipientLabel = recipient
    ? `${recipient.nombre} ${recipient.apellido ?? ""} — ${recipient.correo}`
    : notification.usuario_id;

  const initial: NotificationFormValues = {
    titulo: notification.titulo,
    mensaje: notification.mensaje,
    leida: notification.leida,
  };

  const handleSubmit = async (values: NotificationFormValues) => {
    setError(null);
    setFieldErrors({});

    const titulo = values.titulo.trim();
    const mensaje = sanitizeNotificationHtml(values.mensaje);

    const payload: UpdateNotificationDTO = {};
    if (titulo !== notification.titulo) {
      payload.titulo = titulo;
    }
    if (mensaje !== notification.mensaje) {
      payload.mensaje = mensaje;
    }
    if (values.leida !== notification.leida) {
      payload.leida = values.leida;
    }

    if (Object.keys(payload).length === 0) {
      toast.info("No hay cambios por guardar.", "Sin cambios");
      return;
    }

    setSubmitting(true);
    try {
      await notificationService.update(id, payload);
      toast.success(
        "Los cambios se guardaron correctamente.",
        "Notificación actualizada",
      );
      navigate("/notifications", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.isValidation) {
        setFieldErrors(parseValidationErrors(err).fieldErrors);
      }
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Editar notificación" backTo="/notifications" />

      <div className="mx-auto w-full max-w-2xl">
        <Card className="space-y-6 sm:p-8">
          <div className="flex items-center gap-3 border-b border-border pb-5">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Pencil className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate text-base font-medium text-foreground">
                {notification.titulo}
              </h2>
              <p className="text-sm text-muted-foreground">
                Actualiza el contenido de esta notificación.
              </p>
            </div>
          </div>

          {error ? <ErrorAlert error={error} onClose={() => setError(null)} /> : null}

          <NotificationForm
            initial={initial}
            recipientLabel={recipientLabel}
            submitting={submitting}
            submitLabel="Guardar cambios"
            serverErrors={fieldErrors}
            onSubmit={handleSubmit}
            onCancel={() => navigate("/notifications")}
          />
        </Card>
      </div>
    </div>
  );
}
