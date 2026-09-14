import { CalendarClock, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { FullPageSpinner, Spinner } from "../../components/feedback/Spinner";
import { useToast } from "../../components/feedback/useToast";
import { Button } from "../../components/forms/Button";
import { Card, PageHeader } from "../../components/layout/Page";
import { useEvent } from "../../hooks/useEvent";
import { useSchedules } from "../../hooks/useSchedules";
import { formatDateTime } from "../../lib/format";
import { eventService } from "../../services/eventService";
import { ApiError } from "../../types/api";
import { DeleteEventDialog } from "./components/DeleteEventDialog";

export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { role } = useAuth();
  const isAdmin = role === "ADMIN";
  const { event, isLoading, error } = useEvent(id);
  const { schedules, total: totalSchedules, isLoading: loadingSchedules } =
    useSchedules(id);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);

  if (isLoading) {
    return <FullPageSpinner label="Cargando evento…" />;
  }

  if (error || !event || !id) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div>
        <PageHeader title="Evento" backTo="/events" />
        {notFound ? (
          <Card className="text-center">
            <p className="text-sm text-muted-foreground">
              El evento que buscas no existe o fue eliminado.
            </p>
            <Link
              to="/events"
              className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
            >
              Volver al listado
            </Link>
          </Card>
        ) : (
          <ErrorAlert error={error ?? new Error("No se pudo cargar el evento.")} />
        )}
      </div>
    );
  }

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await eventService.remove(event.id);
      toast.success(`El evento "${event.titulo}" fue eliminado.`, "Evento eliminado");
      navigate("/events", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        navigate("/events", { replace: true });
        return;
      }
      setDeleteError(err);
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={event.titulo}
        backTo="/events"
        actions={
          isAdmin ? (
            <>
              <Button
                variant="secondary"
                onClick={() => navigate(`/events/${event.id}/editar`)}
              >
                <Pencil className="size-4" aria-hidden="true" />
                Editar
              </Button>
              <Button variant="danger" onClick={() => setConfirmOpen(true)}>
                <Trash2 className="size-4" aria-hidden="true" />
                Eliminar
              </Button>
            </>
          ) : undefined
        }
      />

      {deleteError ? (
        <ErrorAlert error={deleteError} onClose={() => setDeleteError(null)} />
      ) : null}

      <Card className="max-w-2xl space-y-4">
        <div>
          <h2 className="text-sm font-medium text-muted-foreground">Descripción</h2>
          <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
            {event.descripcion}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">Lugar</h2>
            <p className="mt-1 text-sm text-foreground">{event.lugar}</p>
          </div>
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">Capacidad</h2>
            <p className="mt-1 text-sm text-foreground">{event.capacidad}</p>
          </div>
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">Inicio</h2>
            <p className="mt-1 text-sm text-foreground">
              {formatDateTime(event.fecha_inicio)}
            </p>
          </div>
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">Fin</h2>
            <p className="mt-1 text-sm text-foreground">
              {formatDateTime(event.fecha_fin)}
            </p>
          </div>
        </div>
      </Card>

      <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
          <h2 className="flex items-center gap-2 text-base font-medium text-foreground">
            <CalendarClock className="size-4 text-muted-foreground" aria-hidden="true" />
            Cronogramas{" "}
            <span className="text-sm font-normal text-muted-foreground">
              ({totalSchedules})
            </span>
          </h2>
          <Link
            to={`/schedules?evento_id=${event.id}`}
            className="text-sm font-medium text-primary hover:underline"
          >
            Ver en Cronogramas
          </Link>
        </div>

        {loadingSchedules ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            <Spinner label="Cargando cronogramas…" />
          </div>
        ) : schedules.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">
            Este evento todavía no tiene cronogramas registrados.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {schedules.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-foreground">{s.actividad}</p>
                  <p className="text-muted-foreground">
                    {formatDateTime(s.hora_inicio)} – {formatDateTime(s.hora_fin)}
                  </p>
                </div>
                <span className="text-muted-foreground">{s.responsable}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <DeleteEventDialog
        open={confirmOpen}
        eventTitle={event.titulo}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
