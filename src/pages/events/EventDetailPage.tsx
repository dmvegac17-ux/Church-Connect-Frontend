import { Calendar, CalendarX, Clock, MapPin, SearchX, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { FullPageSpinner, Spinner } from "../../components/feedback/Spinner";
import { buttonClass } from "../../components/forms/Button";
import { Card, CardHeader } from "../../components/layout/Page";
import { ScheduleTimeline } from "../../components/schedule/ScheduleTimeline";
import { DateBlock, EventStatusPill } from "../../components/ui/EventBits";
import { Breadcrumb, EmptyState, Fact } from "../../components/ui/primitives";
import { useEvent } from "../../hooks/useEvent";
import { useSchedules } from "../../hooks/useSchedules";
import { activitiesLabel, eventDateInfo } from "../../lib/eventDates";
import { ApiError } from "../../types/api";
import { EventLocation } from "./components/EventLocation";

/** Detalle de evento (vista de miembro): solo lectura. */
export function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { event, isLoading, error } = useEvent(id);
  const { schedules, isLoading: loadingSchedules } = useSchedules(id);

  if (isLoading) {
    return <FullPageSpinner label="Cargando evento…" />;
  }

  if (error || !event || !id) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumb to="/events" label="Eventos" />
        {notFound ? (
          <EmptyState
            bordered
            icon={SearchX}
            title="Este evento no existe o fue eliminado"
            action={
              <Link to="/events" className={buttonClass("secondary")}>
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

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb to="/events" label="Eventos" current={event.titulo} />

      <div className="flex flex-wrap items-center gap-[18px]">
        <DateBlock info={info} size="lg" />
        <div className="flex min-w-0 flex-col gap-1.5">
          <span className="self-start">
            <EventStatusPill info={info} />
          </span>
          <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.015em] break-words">
            {event.titulo}
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <div className="flex min-w-0 flex-col gap-5">
          <Card as="section" className="flex flex-col gap-2.5 p-6">
            <h2 className="text-[17px] font-extrabold">Descripción</h2>
            <p className="text-base leading-[1.6] text-pretty whitespace-pre-line text-text-strong">
              {event.descripcion}
            </p>
          </Card>

          <Card as="section" className="overflow-hidden">
            <CardHeader
              title="Cronograma"
              aside={
                <span className="text-sm text-muted-foreground">
                  {loadingSchedules ? "" : activitiesLabel(schedules.length)}
                </span>
              }
            />
            {loadingSchedules ? (
              <div className="p-8 text-center text-muted-foreground">
                <Spinner label="Cargando cronograma…" />
              </div>
            ) : schedules.length === 0 ? (
              <EmptyState
                icon={CalendarX}
                tone="sand"
                title="Este evento aún no tiene cronograma"
                description="Cuando los organizadores publiquen las actividades aparecerán aquí."
              />
            ) : (
              <ScheduleTimeline schedules={schedules} />
            )}
          </Card>
        </div>

        <Card as="aside" className="flex flex-col gap-4 p-6">
          <h2 className="text-[17px] font-extrabold">Detalles</h2>
          <dl className="flex flex-col gap-3.5">
            <Fact icon={Calendar} label="Fecha">
              {info.dateLong}
            </Fact>
            <Fact icon={Clock} label="Horario">
              {info.timeRange}
            </Fact>
            <Fact icon={MapPin} label="Lugar">
              {event.lugar}
              {event.direccion ? (
                <span className="block text-sm font-normal text-text-secondary">
                  {event.direccion}
                </span>
              ) : null}
            </Fact>
            <Fact icon={Users} label="Capacidad">
              {event.capacidad} {event.capacidad === 1 ? "persona" : "personas"}
            </Fact>
          </dl>
          <EventLocation event={event} />
        </Card>
      </div>
    </div>
  );
}
