import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { FullPageSpinner } from "../../components/feedback/Spinner";
import { useToast } from "../../components/feedback/useToast";
import { Button } from "../../components/forms/Button";
import { Card, PageHeader } from "../../components/layout/Page";
import { useEvents } from "../../hooks/useEvents";
import { eventService } from "../../services/eventService";
import { ApiError } from "../../types/api";
import type { Event } from "../../types/event";
import { AddScheduleModal } from "./components/AddScheduleModal";
import { DeleteEventDialog } from "./components/DeleteEventDialog";
import { EventCard } from "./components/EventCard";

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
  const [scheduleEvent, setScheduleEvent] = useState<Event | null>(null);

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

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

      {isLoading ? (
        <FullPageSpinner label="Cargando eventos…" />
      ) : events.length === 0 ? (
        <Card className="text-center text-sm text-muted-foreground">
          Todavía no hay eventos registrados.
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((ev) => (
              <EventCard
                key={ev.id}
                event={ev}
                isAdmin={isAdmin}
                onDelete={setTarget}
                onAddSchedule={setScheduleEvent}
              />
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              {rangeStart}–{rangeEnd} de {total}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
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
                disabled={page >= pageCount}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:bg-muted disabled:opacity-40"
              >
                Siguiente
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      )}

      <DeleteEventDialog
        open={target !== null}
        eventTitle={target?.titulo ?? ""}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setTarget(null)}
      />

      <AddScheduleModal
        event={scheduleEvent}
        onClose={() => setScheduleEvent(null)}
        onSaved={refetch}
      />
    </div>
  );
}
