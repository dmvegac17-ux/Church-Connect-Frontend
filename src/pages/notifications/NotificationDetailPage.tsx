import { Bell } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";

import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { FullPageSpinner } from "../../components/feedback/Spinner";
import { Card, PageHeader } from "../../components/layout/Page";
import { useNotification } from "../../hooks/useNotification";
import { formatDateTime } from "../../lib/format";
import { NOTIFICATIONS_CHANGED_EVENT } from "../../lib/notificationEvents";
import { sanitizeNotificationHtml } from "../../lib/sanitizeHtml";
import { notificationService } from "../../services/notificationService";
import { ApiError } from "../../types/api";

/**
 * Detalle de la propia notificación. El backend ya restringe el `GET` al
 * dueño (ni siquiera ADMIN puede ver la de otro usuario), así que un `403`
 * aquí significa "existe pero no es tuya".
 *
 * Al abrirla se marca como leída automáticamente (el dueño de la
 * notificación puede marcar su propia `leida`, y ADMIN puede marcar
 * cualquiera).
 */
export function NotificationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { notification, isLoading, error, refetch } = useNotification(id);

  const autoMarkedRef = useRef<string | null>(null);

  useEffect(() => {
    if (
      !notification ||
      notification.leida ||
      autoMarkedRef.current === notification.id
    ) {
      return;
    }
    autoMarkedRef.current = notification.id;
    notificationService
      .update(notification.id, { leida: true })
      .then(() => {
        refetch();
        window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
      })
      .catch(() => {
        // Silencioso: si falla el auto-marcado, el estado simplemente queda "No leída".
      });
  }, [notification, refetch]);

  if (isLoading) {
    return <FullPageSpinner label="Cargando notificación…" />;
  }

  if (error || !notification || !id) {
    const isForbidden = error instanceof ApiError && error.status === 403;
    const isNotFound = error instanceof ApiError && error.status === 404;

    if (isForbidden || isNotFound) {
      return (
        <div>
          <PageHeader title="Notificación" backTo="/notifications" />
          <Card className="mx-auto max-w-2xl text-center">
            <p className="text-sm text-muted-foreground">
              {isForbidden
                ? "No tienes permisos para ver esta notificación."
                : "La notificación que buscas no existe o fue eliminada."}
            </p>
            <Link
              to="/notifications"
              className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
            >
              Volver a la bandeja
            </Link>
          </Card>
        </div>
      );
    }

    return (
      <div>
        <PageHeader title="Notificación" backTo="/notifications" />
        <ErrorAlert
          error={error ?? new Error("No se pudo cargar la notificación.")}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Notificación" backTo="/notifications" />

      <Card className="mx-auto max-w-2xl space-y-6 sm:p-8">
        <div className="flex items-start gap-4 border-b border-border pb-5">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Bell className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-lg font-medium text-foreground">
              {notification.titulo}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{formatDateTime(notification.fecha_envio)}</span>
              <span aria-hidden="true">·</span>
              <span
                className={`inline-flex rounded-full px-2 py-0.5 font-medium ${
                  notification.leida
                    ? "bg-muted text-muted-foreground"
                    : "bg-primary/15 text-primary"
                }`}
              >
                {notification.leida ? "Leída" : "No leída"}
              </span>
            </div>
          </div>
        </div>

        <div
          className="whitespace-pre-wrap text-[0.95rem] leading-relaxed text-foreground"
          dangerouslySetInnerHTML={{
            __html: sanitizeNotificationHtml(notification.mensaje),
          }}
        />
      </Card>
    </div>
  );
}
