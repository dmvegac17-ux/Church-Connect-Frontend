import { CalendarX, ChevronRight, MapPin } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { Spinner } from "../../components/feedback/Spinner";
import { buttonClass } from "../../components/forms/Button";
import { Card, PageHeader } from "../../components/layout/Page";
import { ScheduleTimeline } from "../../components/schedule/ScheduleTimeline";
import { EmptyState, Pager, Pill } from "../../components/ui/primitives";
import { useEventOptions } from "../../hooks/useEventOptions";
import { useFullList } from "../../hooks/useFullList";
import {
  isUpcoming,
  longDateLabel,
  monthAbbr,
  sortEventsForDisplay,
} from "../../lib/eventDates";
import { scheduleService } from "../../services/scheduleService";
import type { Event } from "../../types/event";
import type { Schedule } from "../../types/schedule";
import { EventSelect } from "./components/EventSelect";

/** Eventos por página: cada uno trae su cronograma completo. */
const EVENTS_PER_PAGE = 5;

interface EventGroup {
  event: Event;
  schedules: Schedule[];
  /** Actividades por día, en orden; un solo elemento si el evento dura un día. */
  days: { key: string; date: string; schedules: Schedule[] }[];
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** Agrupa las actividades por evento (próximos primero) y, dentro, por día. */
function groupByEvent(schedules: Schedule[], events: Event[]): EventGroup[] {
  const byEvent = new Map<string, Schedule[]>();
  for (const schedule of schedules) {
    const list = byEvent.get(schedule.evento_id) ?? [];
    list.push(schedule);
    byEvent.set(schedule.evento_id, list);
  }

  return sortEventsForDisplay(events.filter((e) => byEvent.has(e.id))).map(
    (event) => {
      const own = [...(byEvent.get(event.id) ?? [])].sort(
        (a, b) =>
          new Date(a.hora_inicio).getTime() - new Date(b.hora_inicio).getTime(),
      );
      const days: EventGroup["days"] = [];
      for (const schedule of own) {
        const key = new Date(schedule.hora_inicio).toDateString();
        const last = days[days.length - 1];
        if (last?.key === key) {
          last.schedules.push(schedule);
        } else {
          days.push({ key, date: schedule.hora_inicio, schedules: [schedule] });
        }
      }
      return { event, schedules: own, days };
    },
  );
}

/**
 * Cronogramas (vista de miembro), solo lectura. Cada evento es un bloque
 * propio con su fecha, su lugar y sus actividades en orden de hora (por día,
 * si dura varios), para que no se mezclen las de eventos distintos.
 */
export function SchedulesListPage() {
  const { events, isLoading: loadingEvents } = useEventOptions();
  const {
    items: schedules,
    isLoading: loadingSchedules,
    error,
  } = useFullList(scheduleService.list);
  const [searchParams, setSearchParams] = useSearchParams();
  const eventoId = searchParams.get("evento_id") ?? "";
  const setEventoId = (id: string) => {
    setSearchParams(id ? { evento_id: id } : {}, { replace: true });
  };
  const [page, setPage] = useState(1);
  useEffect(() => setPage(1), [eventoId]);

  const isLoading = loadingEvents || loadingSchedules;
  const groups = useMemo(() => {
    const all = groupByEvent(schedules, events);
    return eventoId ? all.filter((g) => g.event.id === eventoId) : all;
  }, [schedules, events, eventoId]);

  const pageCount = Math.max(1, Math.ceil(groups.length / EVENTS_PER_PAGE));
  const current = Math.min(page, pageCount);
  const visible = groups.slice(
    (current - 1) * EVENTS_PER_PAGE,
    current * EVENTS_PER_PAGE,
  );
  const activities = groups.reduce((sum, g) => sum + g.schedules.length, 0);
  const selectedEvent = eventoId
    ? events.find((e) => e.id === eventoId)
    : undefined;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Cronogramas"
        description="Actividades programadas de cada evento."
      />

      {error ? <ErrorAlert error={error} /> : null}

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="w-full min-w-[260px] sm:w-auto">
          <EventSelect
            placeholder="Todos los eventos"
            value={eventoId}
            onChange={setEventoId}
          />
        </div>
        {!isLoading && groups.length > 0 ? (
          <p className="text-sm text-muted-foreground" role="status">
            {plural(activities, "actividad", "actividades")} en{" "}
            {plural(groups.length, "evento", "eventos")}
          </p>
        ) : null}
      </div>

      {isLoading ? (
        <Card className="p-10 text-center text-muted-foreground">
          <Spinner label="Cargando cronogramas…" />
        </Card>
      ) : groups.length === 0 ? (
        <EmptyState
          bordered
          icon={CalendarX}
          tone="sand"
          title={
            selectedEvent
              ? `«${selectedEvent.titulo}» aún no tiene cronograma`
              : "Todavía no hay actividades programadas"
          }
          description={
            selectedEvent
              ? "Los organizadores aún no han publicado actividades para este evento."
              : "Cuando los organizadores publiquen actividades aparecerán aquí."
          }
          action={
            selectedEvent ? (
              <Link
                to={`/events/${selectedEvent.id}`}
                className={buttonClass("secondary")}
              >
                Ver detalle del evento
              </Link>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-5">
          {visible.map(({ event, schedules: own, days }) => {
            const start = new Date(event.fecha_inicio);
            const upcoming = isUpcoming(event);
            return (
              <Card
                key={event.id}
                as="section"
                aria-label={`Cronograma de ${event.titulo}`}
                className="overflow-hidden"
              >
                <header
                  className={`flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-divider px-5 py-4 ${
                    upcoming
                      ? "bg-primary-soft"
                      : "bg-surface-alt"
                  }`}
                >
                  <div
                    aria-hidden="true"
                    className={`w-[54px] shrink-0 rounded-xl py-1.5 text-center ${
                      upcoming
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-text-secondary"
                    }`}
                  >
                    <span className="block text-[11px] font-extrabold tracking-[0.06em] uppercase">
                      {monthAbbr(start)}
                    </span>
                    <span className="block text-xl leading-[1.1] font-extrabold">
                      {start.getDate()}
                    </span>
                  </div>
                  <div className="flex min-w-[200px] flex-1 flex-col gap-0.5">
                    <h2 className="text-lg leading-[1.3] font-extrabold break-words">
                      <Link
                        to={`/events/${event.id}`}
                        className="inline-flex items-center gap-0.5 text-foreground hover:text-primary hover:underline"
                      >
                        {event.titulo}
                        <ChevronRight className="size-[18px] shrink-0" aria-hidden="true" />
                      </Link>
                    </h2>
                    <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-text-secondary">
                      <span className="first-letter:uppercase">
                        {longDateLabel(event.fecha_inicio)}
                      </span>
                      <span className="flex min-w-0 items-center gap-1">
                        <MapPin className="size-4 shrink-0 text-primary" aria-hidden="true" />
                        <span className="break-words">{event.lugar}</span>
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {upcoming ? null : <Pill tone="sand">Finalizado</Pill>}
                    <span className="text-sm font-bold whitespace-nowrap text-text-secondary">
                      {plural(own.length, "actividad", "actividades")}
                    </span>
                  </div>
                </header>

                {days.map((day) => (
                  <div key={day.key}>
                    {days.length > 1 ? (
                      <h3 className="border-t border-divider-soft bg-surface-alt px-5 py-2 text-[13px] font-extrabold tracking-[0.04em] text-text-secondary uppercase first:border-t-0">
                        {longDateLabel(day.date)}
                      </h3>
                    ) : null}
                    <ScheduleTimeline schedules={day.schedules} />
                  </div>
                ))}
              </Card>
            );
          })}

          {groups.length > EVENTS_PER_PAGE ? (
            <Card className="overflow-hidden">
              <Pager
                page={current}
                pageCount={pageCount}
                total={groups.length}
                pageSize={EVENTS_PER_PAGE}
                onChange={setPage}
                noun="eventos"
              />
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}
