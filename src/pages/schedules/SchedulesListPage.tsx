import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { Spinner } from "../../components/feedback/Spinner";
import { useToast } from "../../components/feedback/useToast";
import { Button } from "../../components/forms/Button";
import { Card, PageHeader } from "../../components/layout/Page";
import { useEventOptions } from "../../hooks/useEventOptions";
import { useSchedules } from "../../hooks/useSchedules";
import { formatDateTime } from "../../lib/format";
import { scheduleService } from "../../services/scheduleService";
import { ApiError } from "../../types/api";
import type { Schedule } from "../../types/schedule";
import { DeleteScheduleDialog } from "./components/DeleteScheduleDialog";
import { EventSelect } from "./components/EventSelect";

export function SchedulesListPage() {
  const { role } = useAuth();
  const isAdmin = role === "ADMIN";
  const toast = useToast();
  const navigate = useNavigate();
  const { events } = useEventOptions();

  const [searchParams, setSearchParams] = useSearchParams();
  const eventoId = searchParams.get("evento_id") ?? "";
  const setEventoId = (id: string) => {
    setSearchParams(id ? { evento_id: id } : {}, { replace: true });
  };
  const {
    schedules,
    total,
    isLoading,
    error,
    page,
    pageCount,
    pageSize,
    setPage,
    refetch,
  } = useSchedules(eventoId || undefined);

  const [target, setTarget] = useState<Schedule | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);

  const eventTitles = useMemo(
    () => new Map(events.map((e) => [e.id, e.titulo])),
    [events],
  );

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
      await scheduleService.remove(target.id);
      toast.success(
        `El cronograma "${target.actividad}" fue eliminado.`,
        "Cronograma eliminado",
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
        title="Cronogramas"
        description={`${total} cronograma${total === 1 ? "" : "s"} registrado${
          total === 1 ? "" : "s"
        }.`}
        actions={
          isAdmin ? (
            <Button onClick={() => navigate("/schedules/nuevo")}>
              <Plus className="size-4" aria-hidden="true" />
              Nuevo cronograma
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
        <div className="border-b border-border p-4 sm:max-w-xs">
          <EventSelect
            label="Filtrar por evento"
            placeholder="Todos los eventos"
            optional
            value={eventoId}
            onChange={setEventoId}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Actividad</th>
                <th className="px-4 py-3 font-medium">Evento</th>
                <th className="px-4 py-3 font-medium">Horario</th>
                <th className="px-4 py-3 font-medium">Responsable</th>
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
                    <Spinner label="Cargando cronogramas…" />
                  </td>
                </tr>
              ) : schedules.length === 0 ? (
                <tr>
                  <td
                    colSpan={colSpan}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    {eventoId
                      ? "Este evento no tiene cronogramas registrados."
                      : "Todavía no hay cronogramas registrados."}
                  </td>
                </tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {s.actividad}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {eventTitles.get(s.evento_id) ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDateTime(s.hora_inicio)} –{" "}
                      {formatDateTime(s.hora_fin)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.responsable}
                    </td>
                    {isAdmin ? (
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-1">
                          <button
                            type="button"
                            onClick={() =>
                              navigate(`/schedules/${s.id}/editar`)
                            }
                            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
                            aria-label={`Editar ${s.actividad}`}
                          >
                            <Pencil className="size-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setTarget(s)}
                            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            aria-label={`Eliminar ${s.actividad}`}
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

      <DeleteScheduleDialog
        open={target !== null}
        activityName={target?.actividad ?? ""}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}
