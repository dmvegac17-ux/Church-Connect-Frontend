import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { useToast } from "../../components/feedback/useToast";
import { Card, PageHeader } from "../../components/layout/Page";
import { parseValidationErrors } from "../../lib/formErrors";
import { notificationService } from "../../services/notificationService";
import { ApiError } from "../../types/api";
import type { CreateNotificationDTO } from "../../types/notification";
import {
  NotificationForm,
  type NotificationFormValues,
} from "./components/NotificationForm";

export function NotificationCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [error, setError] = useState<unknown>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: NotificationFormValues) => {
    setError(null);
    setFieldErrors({});

    const payload: CreateNotificationDTO = {
      usuario_id: values.usuarioId,
      titulo: values.titulo.trim(),
      mensaje: values.mensaje.trim(),
    };

    setSubmitting(true);
    try {
      const created = await notificationService.create(payload);
      toast.success(
        `La notificación "${created.titulo}" fue creada.`,
        "Notificación creada",
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
      <PageHeader title="Nueva notificación" backTo="/notifications" />

      <Card className="max-w-2xl">
        {error ? (
          <div className="mb-4">
            <ErrorAlert error={error} onClose={() => setError(null)} />
          </div>
        ) : null}

        <NotificationForm
          submitting={submitting}
          submitLabel="Crear notificación"
          serverErrors={fieldErrors}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/notifications")}
        />
      </Card>
    </div>
  );
}
