import {
  ArrowRight,
  Calendar,
  CalendarCog,
  CalendarX,
  Clock,
  Lock,
  MapPin,
  Pencil,
  SearchX,
  Ticket,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../../../auth/useAuth";
import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { FullPageSpinner, Spinner } from "../../../components/feedback/Spinner";
import { useToast } from "../../../components/feedback/useToast";
import { Button, buttonClass } from "../../../components/forms/Button";
import { Card } from "../../../components/layout/Page";
import { AforoSection } from "../../../components/registrations/AforoBits";
import { EnrollmentDialog } from "../../../components/registrations/EnrollmentDialog";
import { EnrollmentPanel } from "../../../components/registrations/EnrollmentPanel";
import { ScheduleTimeline } from "../../../components/schedule/ScheduleTimeline";
import { DateBlock, EventStatusPill } from "../../../components/ui/EventBits";
import { Breadcrumb, EmptyState, Fact } from "../../../components/ui/primitives";
import { useEvent } from "../../../hooks/useEvent";
import {
  MY_PARTICIPATIONS_PATH,
  REGISTRATIONS_PATH,
} from "../../../config/navigation";
import { useEnrollment } from "../../../hooks/useEnrollment";
import { RefreshButton } from "../../../components/layout/RefreshButton";
import { useSchedules } from "../../../hooks/useSchedules";
import { occupancyOf } from "../../../lib/capacity";
import { eventDateInfo } from "../../../lib/eventDates";
import { formatDateTime } from "../../../lib/format";
import { plural } from "../../../lib/participations";
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
  const { user: me } = useAuth();
  const { event, isLoading, error, refetch } = useEvent(id);
  // El administrador también puede asistir como público.
  const enrollment = useEnrollment(refetch);
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
      // Un evento finalizado ya no admite cambios en su cronograma.
      setScheduleOpen(!eventDateInfo(event).isPast);
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
  const occupancy = occupancyOf(event);

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
      <Breadcrumb
        to="/events"
        label="Eventos"
        current={event.titulo}
        actions={<RefreshButton />}
      />

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
          {info.isPast ? (
            // Finalizado: queda como registro. Solo se puede eliminar.
            <span className="inline-flex items-center gap-1.5 self-center text-[13px] font-bold text-muted-foreground">
              <Lock className="size-4" aria-hidden="true" />
              Evento finalizado: no se puede editar
            </span>
          ) : (
            <Link
              to={`/events/${event.id}/editar`}
              className={buttonClass("secondary", "sm")}
            >
              <Pencil className="size-[19px]" aria-hidden="true" />
              Editar
            </Link>
          )}
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

      <AforoSection occupancy={occupancy} />

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
            <Fact icon={Ticket} label="Inscripciones hasta">
              {event.fecha_limite_inscripcion
                ? formatDateTime(event.fecha_limite_inscripcion)
                : "El inicio del evento"}
            </Fact>
            <Fact icon={Ticket} label="Cancelación hasta">
              {(event.dias_limite_cancelacion ?? 0) > 0
                ? `${formatDateTime(event.fecha_limite_cancelacion)} (${plural(
                    event.dias_limite_cancelacion ?? 0,
                    "día antes",
                    "días antes",
                  )})`
                : "El inicio del evento"}
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
            {info.isPast ? (
              // Evento finalizado: el cronograma queda en solo lectura.
              <Button
                variant="secondary"
                size="sm"
                disabled
                aria-label="Evento finalizado: el cronograma no se puede modificar"
              >
                <Lock className="size-[18px]" aria-hidden="true" />
                Evento finalizado
              </Button>
            ) : (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setScheduleOpen(true)}
                disabled={loadingSchedules}
              >
                <CalendarCog className="size-[18px]" aria-hidden="true" />
                {hasSchedule ? "Editar cronograma" : "Crear cronograma"}
              </Button>
            )}
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

      <EnrollmentPanel
        event={event}
        userId={me?.id ?? ""}
        title="Mi inscripción"
        className="rounded-[var(--card-radius,14px)] border border-border bg-card px-5 py-[18px]"
        participationsPath={MY_PARTICIPATIONS_PATH}
        onEnroll={() => enrollment.enroll(event)}
        onCancel={() => enrollment.cancel(event)}
      />

      <section
        aria-label="Inscritos"
        className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--card-radius,14px)] border border-border bg-card px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-[38px] shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary"
          >
            <Ticket className="size-[21px]" />
          </span>
          <span className="flex flex-col">
            <span className="text-base font-extrabold">Inscritos</span>
            <span className="text-sm text-muted-foreground">
              {occupancy.publico} de público · {occupancy.participantes} participantes
            </span>
          </span>
        </div>
        <Link
          to={`${REGISTRATIONS_PATH}?evento=${event.id}`}
          className={buttonClass("secondary", "sm")}
        >
          Gestionar inscritos
          <ArrowRight className="size-[18px]" aria-hidden="true" />
        </Link>
      </section>

      <DeleteEventDialog
        open={confirmOpen}
        eventTitle={event.titulo}
        activityCount={schedules.length}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />

      <EnrollmentDialog
        event={enrollment.event}
        mode={enrollment.mode}
        busy={enrollment.busy}
        error={enrollment.error}
        onSubmit={enrollment.submit}
        onClose={enrollment.close}
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
