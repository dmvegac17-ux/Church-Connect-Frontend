import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Mail,
  SearchX,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { FullPageSpinner } from "../../components/feedback/Spinner";
import { useToast } from "../../components/feedback/useToast";
import { Button, buttonClass } from "../../components/forms/Button";
import {
  Avatar,
  Breadcrumb,
  EmptyState,
  IconButton,
} from "../../components/ui/primitives";
import { useFullList } from "../../hooks/useFullList";
import { useNotification } from "../../hooks/useNotification";
import { useNotificationTrash } from "../../hooks/useNotificationTrash";
import { formatDateTime } from "../../lib/format";
import { NOTIFICATIONS_CHANGED_EVENT } from "../../lib/notificationEvents";
import {
  ADMIN_ROLE,
  SYSTEM_SENDER,
  senderOf,
} from "../../lib/notificationInbox";
import { sanitizeNotificationHtml } from "../../lib/sanitizeHtml";
import { notificationService } from "../../services/notificationService";
import { ApiError } from "../../types/api";

/**
 * Lector de la propia notificación (vista de miembro), al estilo de un
 * correo: asunto, remitente, fecha y cuerpo, con paso a la anterior y la
 * siguiente. El backend ya restringe el `GET` al dueño, así que un `403`
 * aquí significa "existe pero no es tuya". Al abrirla se marca como leída;
 * «Marcar como no leída» la devuelve a pendiente y regresa a la bandeja.
 * Eliminarla también regresa, con «Deshacer» durante 6 s.
 */
export function NotificationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { notification, isLoading, error, refetch } = useNotification(id);
  const { pending, trash } = useNotificationTrash();
  const { items } = useFullList(notificationService.list);
  const [marking, setMarking] = useState(false);

  // La bandeja tal como estaba (búsqueda, filtro y página) al abrir el aviso.
  const from = (location.state as { from?: string } | null)?.from ?? "";
  const inbox = `/notifications${from}`;

  // Vecinas en la bandeja, de la más reciente a la más antigua.
  const siblings = useMemo(
    () => items.filter((n) => !pending.has(n.id)),
    [items, pending],
  );
  const index = siblings.findIndex((n) => n.id === id);
  const newer = index > 0 ? siblings[index - 1] : null;
  const older =
    index >= 0 && index < siblings.length - 1 ? siblings[index + 1] : null;
  const open = (target: { id: string } | null) => {
    if (target) {
      navigate(`/notifications/${target.id}`, { state: { from } });
    }
  };

  const handleDelete = () => {
    if (!notification) {
      return;
    }
    // Deshacer devuelve a este mismo detalle.
    trash(notification.id, { returnTo: `/notifications/${notification.id}` });
    navigate(inbox);
  };

  const handleMarkUnread = async () => {
    if (!notification) {
      return;
    }
    setMarking(true);
    try {
      await notificationService.update(notification.id, { leida: false });
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
      toast.notify({ message: "Marcada como no leída.", variant: "success" });
      navigate(inbox);
    } catch {
      toast.error("No se pudo marcar como no leída.");
      setMarking(false);
    }
  };

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
      <div className="flex max-w-[860px] flex-col gap-6">
        <Breadcrumb to={inbox} label="Notificaciones" />
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
              <Link to={inbox} className={buttonClass("secondary")}>
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

  const sender = senderOf(notification.mensaje);

  return (
    <div className="flex max-w-[860px] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <Link to={inbox} className={buttonClass("ghost", "sm")}>
          <ArrowLeft className="size-[18px]" aria-hidden="true" />
          Notificaciones
        </Link>
        <div className="flex flex-wrap items-center gap-1.5">
          {index >= 0 ? (
            <span className="flex items-center gap-0.5 text-sm text-muted-foreground">
              <span className="mr-1 whitespace-nowrap">
                {index + 1} de {siblings.length}
              </span>
              <IconButton
                icon={ChevronLeft}
                label="Más reciente"
                disabled={!newer}
                onClick={() => open(newer)}
              />
              <IconButton
                icon={ChevronRight}
                label="Más antigua"
                disabled={!older}
                onClick={() => open(older)}
              />
            </span>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            disabled={marking}
            onClick={() => void handleMarkUnread()}
          >
            <Mail className="size-[18px]" aria-hidden="true" />
            Marcar como no leída
          </Button>
          <Button variant="dangerOutline" size="sm" onClick={handleDelete}>
            <Trash2 className="size-[18px]" aria-hidden="true" />
            Eliminar
          </Button>
        </div>
      </div>

      <article className="overflow-hidden rounded-2xl border border-border bg-card">
        <header className="flex flex-col gap-5 border-b border-divider px-5 py-5 sm:px-8 sm:py-6">
          <h1 className="text-[22px] leading-[1.3] font-extrabold break-words sm:text-2xl">
            {notification.titulo}
          </h1>
          <div className="flex items-center gap-3.5">
            <Avatar name={sender} tone="primary" className="size-11 text-sm" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                <span className="text-[15px] font-extrabold break-words">
                  {sender}
                </span>
                <time
                  dateTime={notification.fecha_envio}
                  className="text-[13px] whitespace-nowrap text-muted-foreground"
                >
                  {formatDateTime(notification.fecha_envio)}
                </time>
              </span>
              <span className="text-sm text-muted-foreground">
                {sender === SYSTEM_SENDER
                  ? "Aviso automático · para mí"
                  : `${ADMIN_ROLE} · para mí`}
              </span>
            </div>
          </div>
        </header>
        <div
          className="px-5 py-6 text-base leading-[1.7] break-words whitespace-pre-line text-[#2F322B] sm:px-8 sm:py-7"
          dangerouslySetInnerHTML={{
            __html: sanitizeNotificationHtml(notification.mensaje),
          }}
        />
      </article>
    </div>
  );
}
