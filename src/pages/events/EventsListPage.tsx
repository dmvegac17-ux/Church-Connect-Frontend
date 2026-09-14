import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { Spinner } from "../../components/feedback/Spinner";
import { useToast } from "../../components/feedback/useToast";
import { Button } from "../../components/forms/Button";
import { Card, PageHeader } from "../../components/layout/Page";
import { useEvents } from "../../hooks/useEvents";
import { formatDateTime } from "../../lib/format";
import { eventService } from "../../services/eventService";
import { ApiError } from "../../types/api";
import type { Event } from "../../types/event";
import { DeleteEventDialog } from "./components/DeleteEventDialog";

export function EventsListPage() {
  const { role } = useAuth();
  const isAdmin = role === "ADMIN";
  const toast = useToast();
  const navigate = useNavigate();
  const {
    events,
    total,
    isLoading,
    error,
    page,
    pageCount,
    pageSize,
    setPage,
    refetch,
  } = useEvents();

  const [target, setTarget] = useState<Event | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);
  const colSpan = isAdmin ? 5 : 4;

  const confirmDelete = async () => {
    if (!target) {
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await eventService.remove(target.id);
      toast.success(
        `El evento "${target.titulo}" fue eliminado.`,
        "Evento eliminado",
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
        title="Eventos"
        description={`${total} evento${total === 1 ? "" : "s"} registrado${
          total === 1 ? "" : "s"
        }.`}
        actions={
          isAdmin ? (
            <Button onClick={() => navigate("/events/nuevo")}>
              <Plus className="size-4" aria-hidden="true" />
              Nuevo evento
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
                <th className="px-4 py-3 font-medium">Lugar</th>
                <th className="px-4 py-3 font-medium">Inicio</th>
                <th className="px-4 py-3 font-medium">Capacidad</th>
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
                    <Spinner label="Cargando eventos…" />
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td
                    colSpan={colSpan}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    Todavía no hay eventos registrados.
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium text-foreground">
                      <Link
                        to={`/events/${ev.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {ev.titulo}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {ev.lugar}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(ev.fecha_inicio)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {ev.capacidad}
                    </td>
                    {isAdmin ? (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <Link
                            to={`/events/${ev.id}/editar`}
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
                            aria-label={`Editar ${ev.titulo}`}
                          >
                            <Pencil className="size-4" aria-hidden="true" />
                          </Link>
                          <button
                            type="button"
                            onClick={() => setTarget(ev)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Eliminar ${ev.titulo}`}
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

      <DeleteEventDialog
        open={target !== null}
        eventTitle={target?.titulo ?? ""}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}
