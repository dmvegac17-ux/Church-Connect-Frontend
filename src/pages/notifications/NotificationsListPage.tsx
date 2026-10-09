import {
  Bell,
  ChevronLeft,
  ChevronRight,
  Mail,
  MailOpen,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { Spinner } from "../../components/feedback/Spinner";
import { useToast } from "../../components/feedback/useToast";
import { Button } from "../../components/forms/Button";
import { PageHeader } from "../../components/layout/Page";
import { useNotifications } from "../../hooks/useNotifications";
import { useUserOptions } from "../../hooks/useUserOptions";
import { formatDateTime } from "../../lib/format";
import { htmlToPlainText } from "../../lib/htmlText";
import { NOTIFICATIONS_CHANGED_EVENT } from "../../lib/notificationEvents";
import { notificationService } from "../../services/notificationService";
import { ApiError } from "../../types/api";
import type { Notification } from "../../types/notification";
import { ComposeNotificationModal } from "./components/ComposeNotificationModal";
import { DeleteNotificationDialog } from "./components/DeleteNotificationDialog";

export function NotificationsListPage() {
  const { role } = useAuth();
  const isAdmin = role === "ADMIN";
  const toast = useToast();
  const navigate = useNavigate();
  const [composeOpen, setComposeOpen] = useState(false);
  const {
    notifications,
    total,
    isLoading,
    error,
    page,
    pageCount,
    pageSize,
    setPage,
    refetch,
  } = useNotifications();
  const { users } = useUserOptions(isAdmin);

  const [target, setTarget] = useState<Notification | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const recipientLabels = useMemo(
    () =>
      new Map(
        users.map((u) => [u.id, `${u.nombre} ${u.apellido ?? ""}`.trim()]),
      ),
    [users],
  );

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  const toggleLeida = async (n: Notification) => {
    setTogglingId(n.id);
    try {
      await notificationService.update(n.id, { leida: !n.leida });
      refetch();
      window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "No se pudo actualizar.",
        "Error",
      );
    } finally {
      setTogglingId(null);
    }
  };

  const confirmDelete = async () => {
    if (!target) {
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await notificationService.remove(target.id);
      toast.success(
        `La notificación "${target.titulo}" fue eliminada.`,
        "Notificación eliminada",
      );
      setTarget(null);
      refetch();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        refetch();
        setTarget(null);
      } else {
        setDeleteError(err);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Notificaciones"
        description={`${total} notificación${total === 1 ? "" : "es"} registrada${
          total === 1 ? "" : "s"
        }.`}
        actions={
          isAdmin ? (
            <Button onClick={() => setComposeOpen(true)}>
              <Plus className="size-4" aria-hidden="true" />
              Enviar notificación
            </Button>
          ) : undefined
        }
      />

      {error ? (
        <div className="mb-4">
          <ErrorAlert error={error} />
        </div>
      ) : null}

      {deleteError ? (
        <div className="mb-4">
          <ErrorAlert error={deleteError} onClose={() => setDeleteError(null)} />
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {isLoading ? (
          <div className="p-12 text-center text-muted-foreground">
            <Spinner label="Cargando notificaciones…" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center gap-2 p-12 text-center text-muted-foreground">
            <Bell className="size-8 text-muted-foreground/60" aria-hidden="true" />
            Todavía no hay notificaciones registradas.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {notifications.map((n) => (
              <li
                key={n.id}
                className={`flex flex-col gap-2 p-4 transition hover:bg-muted/40 sm:flex-row sm:items-center sm:gap-4 sm:py-3 ${
                  !n.leida ? "bg-primary/[0.04]" : ""
                }`}
              >
                <Link
                  to={`/notifications/${n.id}`}
                  className="flex min-w-0 flex-1 items-start gap-3 sm:items-center"
                >
                  <span
                    className={`mt-2 size-2 shrink-0 rounded-full sm:mt-0 ${
                      !n.leida ? "bg-primary" : "bg-transparent"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                    <Bell className="size-4" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                      <span
                        className={`truncate text-sm ${
                          !n.leida
                            ? "font-semibold text-foreground"
                            : "text-foreground"
                        }`}
                      >
                        {n.titulo}
                      </span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDateTime(n.fecha_envio)}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-muted-foreground">
                      {htmlToPlainText(n.mensaje)}
                    </span>
                    {isAdmin ? (
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        Para: {recipientLabels.get(n.usuario_id) || n.usuario_id}
                      </span>
                    ) : null}
                  </span>
                </Link>

                <div className="flex shrink-0 items-center gap-2 pl-[3.25rem] sm:pl-0">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      n.leida
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/15 text-primary"
                    }`}
                  >
                    {n.leida ? "Leída" : "No leída"}
                  </span>

                  {isAdmin ? (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => toggleLeida(n)}
                        disabled={togglingId === n.id}
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label={
                          n.leida
                            ? `Marcar "${n.titulo}" como no leída`
                            : `Marcar "${n.titulo}" como leída`
                        }
                        title={
                          n.leida ? "Marcar como no leída" : "Marcar como leída"
                        }
                      >
                        {n.leida ? (
                          <Mail className="size-4" aria-hidden="true" />
                        ) : (
                          <MailOpen className="size-4" aria-hidden="true" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/notifications/${n.id}/editar`)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
                        aria-label={`Editar ${n.titulo}`}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setTarget(n)}
                        className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        aria-label={`Eliminar ${n.titulo}`}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                      </button>
                    </div>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 text-sm text-muted-foreground">
          <span>
            {rangeStart}–{rangeEnd} de {total}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage(page - 1)}
              disabled={page <= 1 || isLoading}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:bg-muted disabled:opacity-40"
            >
              <ChevronLeft className="size-4" aria-hidden="true" />
              Anterior
            </button>
            <span>
              Página {page} de {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage(page + 1)}
              disabled={page >= pageCount || isLoading}
              className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:bg-muted disabled:opacity-40"
            >
              Siguiente
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      <DeleteNotificationDialog
        open={target !== null}
        notificationTitle={target?.titulo ?? ""}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setTarget(null)}
      />

      {isAdmin ? (
        <ComposeNotificationModal
          open={composeOpen}
          onClose={() => setComposeOpen(false)}
          onSent={refetch}
        />
      ) : null}
    </div>
  );
}
