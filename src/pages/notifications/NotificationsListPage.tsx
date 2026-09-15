import {
  ChevronLeft,
  ChevronRight,
  Mail,
  MailOpen,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { Spinner } from "../../components/feedback/Spinner";
import { useToast } from "../../components/feedback/useToast";
import { Button } from "../../components/forms/Button";
import { Card, PageHeader } from "../../components/layout/Page";
import { useNotifications } from "../../hooks/useNotifications";
import { useUserOptions } from "../../hooks/useUserOptions";
import { formatDateTime } from "../../lib/format";
import { notificationService } from "../../services/notificationService";
import { ApiError } from "../../types/api";
import type { Notification } from "../../types/notification";
import { DeleteNotificationDialog } from "./components/DeleteNotificationDialog";

export function NotificationsListPage() {
  const { role } = useAuth();
  const isAdmin = role === "ADMIN";
  const toast = useToast();
  const navigate = useNavigate();
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
  const colSpan = isAdmin ? 6 : 4;

  const toggleLeida = async (n: Notification) => {
    setTogglingId(n.id);
    try {
      await notificationService.update(n.id, { leida: !n.leida });
      refetch();
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
            <Button onClick={() => navigate("/notifications/nueva")}>
              <Plus className="size-4" aria-hidden="true" />
              Nueva notificación
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

      <Card className="!p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Título</th>
                <th className="px-4 py-3 font-medium">Mensaje</th>
                {isAdmin ? (
                  <th className="px-4 py-3 font-medium">Para</th>
                ) : null}
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Enviada</th>
                {isAdmin ? (
                  <th className="px-4 py-3 text-right font-medium">
                    Acciones
                  </th>
                ) : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={colSpan}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    <Spinner label="Cargando notificaciones…" />
                  </td>
                </tr>
              ) : notifications.length === 0 ? (
                <tr>
                  <td
                    colSpan={colSpan}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    Todavía no hay notificaciones registradas.
                  </td>
                </tr>
              ) : (
                notifications.map((n) => (
                  <tr key={n.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {n.titulo}
                    </td>
                    <td className="max-w-xs truncate px-4 py-3 text-muted-foreground">
                      {n.mensaje}
                    </td>
                    {isAdmin ? (
                      <td className="px-4 py-3 text-muted-foreground">
                        {recipientLabels.get(n.usuario_id) || n.usuario_id}
                      </td>
                    ) : null}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          n.leida
                            ? "bg-muted text-muted-foreground"
                            : "bg-primary/15 text-primary"
                        }`}
                      >
                        {n.leida ? "Leída" : "No leída"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(n.fecha_envio)}
                    </td>
                    {isAdmin ? (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
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
                            onClick={() =>
                              navigate(`/notifications/${n.id}/editar`)
                            }
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
                      </td>
                    ) : null}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
      </Card>

      <DeleteNotificationDialog
        open={target !== null}
        notificationTitle={target?.titulo ?? ""}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}
