import {
  Calendar,
  CalendarCog,
  CalendarX,
  Clock,
  MapPin,
  Pencil,
  SearchX,
  Trash2,
  Users,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { FullPageSpinner, Spinner } from "../../../components/feedback/Spinner";
import { useToast } from "../../../components/feedback/useToast";
import { Button, buttonClass } from "../../../components/forms/Button";
import { Card } from "../../../components/layout/Page";
import { ScheduleTimeline } from "../../../components/schedule/ScheduleTimeline";
import { DateBlock, EventStatusPill } from "../../../components/ui/EventBits";
import { Breadcrumb, EmptyState, Fact } from "../../../components/ui/primitives";
import { useEvent } from "../../../hooks/useEvent";
import { useSchedules } from "../../../hooks/useSchedules";
import { eventDateInfo } from "../../../lib/eventDates";
import { eventService } from "../../../services/eventService";
import { ApiError } from "../../../types/api";
import { DeleteEventDialog } from "../../events/components/DeleteEventDialog";
import { EventLocation } from "../../events/components/EventLocation";
import { ScheduleModal } from "../../events/components/ScheduleModal";

/** Detalle de evento (panel de administración): información y cronograma en dos columnas. */
export function AdminEventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { event, isLoading, error, refetch } = useEvent(id);
  const {
    schedules,
    isLoading: loadingSchedules,
    refetch: refetchSchedules,
  } = useSchedules(id);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  // "Crear cronograma" desde el toast de evento creado o desde Inicio.
  const wantsSchedule = Boolean(
    (location.state as { openSchedule?: boolean } | null)?.openSchedule,
  );
  useEffect(() => {
    if (wantsSchedule && event) {
      setScheduleOpen(true);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [wantsSchedule, event, navigate, location.pathname]);

  if (isLoading && !event) {
    return <FullPageSpinner label="Cargando evento…" />;
  }

  if (error || !event || !id) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="flex flex-col gap-5">
        <Breadcrumb to="/events" label="Eventos" />
        {notFound ? (
          <EmptyState
            bordered
            icon={SearchX}
            title="Este evento no existe o fue eliminado"
            action={
              <Link to="/events" className={buttonClass("secondary", "sm")}>
                Volver a Eventos
              </Link>
            }
          />
        ) : (
          <ErrorAlert error={error ?? new Error("No se pudo cargar el evento.")} />
        )}
      </div>
    );
  }

  const info = eventDateInfo(event);
  const hasSchedule = schedules.length > 0;

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await eventService.remove(event.id);
      toast.success(`Evento «${event.titulo}» eliminado.`);
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
    <div className="flex flex-col gap-5">
      <Breadcrumb to="/events" label="Eventos" current={event.titulo} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <DateBlock info={info} />
          <div className="flex min-w-0 flex-col gap-1.5">
            <span className="self-start">
              <EventStatusPill info={info} />
            </span>
            <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.015em] break-words">
              {event.titulo}
            </h1>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to={`/events/${event.id}/editar`}
            className={buttonClass("secondary", "sm")}
          >
            <Pencil className="size-[19px]" aria-hidden="true" />
            Editar
          </Link>
          <Button
            variant="dangerOutline"
            size="sm"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="size-[19px]" aria-hidden="true" />
            Eliminar
          </Button>
        </div>
      </div>

      {deleteError ? (
        <ErrorAlert error={deleteError} onClose={() => setDeleteError(null)} />
      ) : null}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,340px),1fr))] items-start gap-5">
        <Card as="section" className="flex flex-col gap-[18px] p-[22px]">
          <div className="flex flex-col gap-1.5">
            <h2 className="text-sm font-bold text-text-secondary">Descripción</h2>
            <p className="text-[15px] leading-[1.6] text-pretty whitespace-pre-line">
              {event.descripcion}
            </p>
          </div>
          <dl className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
            <Fact icon={Calendar} label="Fecha">
              {info.dateLong}
            </Fact>
            <Fact icon={Clock} label="Horario">
              {info.timeRange}
            </Fact>
            <Fact icon={Users} label="Capacidad">
              {event.capacidad} {event.capacidad === 1 ? "persona" : "personas"}
            </Fact>
            <Fact icon={MapPin} label="Lugar">
              {event.lugar}
              {event.direccion ? (
                <span className="block text-sm font-normal text-text-secondary">
                  {event.direccion}
                </span>
              ) : null}
            </Fact>
          </dl>
          <EventLocation event={event} />
        </Card>

        <Card as="section" className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-divider px-5 py-4">
            <h2 className="text-[17px] font-extrabold">Cronograma</h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setScheduleOpen(true)}
              disabled={loadingSchedules}
            >
              <CalendarCog className="size-[18px]" aria-hidden="true" />
              {hasSchedule ? "Editar cronograma" : "Crear cronograma"}
            </Button>
          </div>
          {loadingSchedules ? (
            <div className="p-8 text-center text-muted-foreground">
              <Spinner label="Cargando cronograma…" />
            </div>
          ) : hasSchedule ? (
            <ScheduleTimeline schedules={schedules} showDuration />
          ) : (
            <EmptyState
              icon={CalendarX}
              tone="warning"
              title="Este evento aún no tiene cronograma"
              description="Los miembros verán las actividades en cuanto las guardes."
            />
          )}
        </Card>
      </div>

      <DeleteEventDialog
        open={confirmOpen}
        eventTitle={event.titulo}
        activityCount={schedules.length}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />

      <ScheduleModal
        open={scheduleOpen}
        event={scheduleOpen ? event : null}
        onClose={() => setScheduleOpen(false)}
        onSaved={() => {
          refetchSchedules();
          refetch();
        }}
      />
    </div>
  );
}
