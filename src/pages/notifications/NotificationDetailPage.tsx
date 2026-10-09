import { Bell, CheckCheck, ShieldAlert, SearchX } from "lucide-react";
import { useEffect, useRef } from "react";
import { Link, useParams } from "react-router-dom";

import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { FullPageSpinner } from "../../components/feedback/Spinner";
import { buttonClass } from "../../components/forms/Button";
import { Card } from "../../components/layout/Page";
import { Breadcrumb, EmptyState, Pill } from "../../components/ui/primitives";
import { useNotification } from "../../hooks/useNotification";
import { formatDateTime } from "../../lib/format";
import { NOTIFICATIONS_CHANGED_EVENT } from "../../lib/notificationEvents";
import { sanitizeNotificationHtml } from "../../lib/sanitizeHtml";
import { notificationService } from "../../services/notificationService";
import { ApiError } from "../../types/api";

/**
 * Detalle de la propia notificación (vista de miembro). El backend ya
 * restringe el `GET` al dueño, así que un `403` aquí significa "existe pero
 * no es tuya". Al abrirla se marca como leída automáticamente.
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

  if (isLoading && !notification) {
    return <FullPageSpinner label="Cargando notificación…" />;
  }

  if (error || !notification || !id) {
    const isForbidden = error instanceof ApiError && error.status === 403;
    const isNotFound = error instanceof ApiError && error.status === 404;

    return (
      <div className="flex max-w-[760px] flex-col gap-6">
        <Breadcrumb to="/notifications" label="Notificaciones" />
        {isForbidden || isNotFound ? (
          <EmptyState
            bordered
            icon={isForbidden ? ShieldAlert : SearchX}
            title={
              isForbidden
                ? "No tienes permisos para ver esta notificación"
                : "Esta notificación no existe o fue eliminada"
            }
            action={
              <Link to="/notifications" className={buttonClass("secondary")}>
                Volver a Notificaciones
              </Link>
            }
          />
        ) : (
          <ErrorAlert
            error={error ?? new Error("No se pudo cargar la notificación.")}
          />
        )}
      </div>
    );
  }

  return (
    <div className="flex max-w-[760px] flex-col gap-6">
      <Breadcrumb to="/notifications" label="Notificaciones" />

      <Card as="article" className="flex flex-col gap-5 p-6 sm:p-7">
        <header className="flex items-start gap-4">
          <span
            className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary"
            aria-hidden="true"
          >
            <Bell className="size-6" />
          </span>
          <div className="flex min-w-0 flex-col gap-1.5">
            <h1 className="text-[22px] leading-[1.3] font-extrabold break-words">
              {notification.titulo}
            </h1>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>{formatDateTime(notification.fecha_envio)}</span>
              {notification.leida ? (
                <Pill tone="sand" icon={CheckCheck} className="!h-6 !px-2">
                  Leída
                </Pill>
              ) : (
                <Pill tone="info" className="!h-6 !px-2">
                  No leída
                </Pill>
              )}
            </div>
          </div>
        </header>
        <div className="h-px bg-divider" />
        <div
          className="text-base leading-[1.7] break-words whitespace-pre-line text-[#2F322B]"
          dangerouslySetInnerHTML={{
            __html: sanitizeNotificationHtml(notification.mensaje),
          }}
        />
      </Card>
    </div>
  );
}
