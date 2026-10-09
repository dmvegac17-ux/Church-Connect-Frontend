import { CalendarX } from "lucide-react";
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { Spinner } from "../../components/feedback/Spinner";
import { buttonClass } from "../../components/forms/Button";
import { Card, PageHeader } from "../../components/layout/Page";
import {
  EmptyState,
  Pager,
  TD_CLASS,
  TH_CLASS,
} from "../../components/ui/primitives";
import { useEventOptions } from "../../hooks/useEventOptions";
import { useSchedules } from "../../hooks/useSchedules";
import {
  activitiesLabel,
  shortDateLabel,
  timeRangeLabel,
} from "../../lib/eventDates";
import { EventSelect } from "./components/EventSelect";

/** Cronogramas (vista de miembro): actividades por evento, solo lectura. */
export function SchedulesListPage() {
  const { events } = useEventOptions();
  const [searchParams, setSearchParams] = useSearchParams();
  const eventoId = searchParams.get("evento_id") ?? "";
  const setEventoId = (id: string) => {
    setSearchParams(id ? { evento_id: id } : {}, { replace: true });
  };
  const { schedules, total, isLoading, error, page, pageCount, pageSize, setPage } =
    useSchedules(eventoId || undefined);

  const eventsById = useMemo(
    () => new Map(events.map((e) => [e.id, e])),
    [events],
  );

  // Ordenadas por fecha y hora dentro de lo que devuelve el servidor.
  const rows = useMemo(
    () =>
      [...schedules].sort(
        (a, b) =>
          new Date(a.hora_inicio).getTime() - new Date(b.hora_inicio).getTime(),
      ),
    [schedules],
  );

  const selectedEvent = eventoId ? eventsById.get(eventoId) : undefined;

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
        {!isLoading ? (
          <p className="text-sm text-muted-foreground" role="status">
            {activitiesLabel(total)}
          </p>
        ) : null}
      </div>

      {isLoading ? (
        <Card className="p-10 text-center text-muted-foreground">
          <Spinner label="Cargando cronogramas…" />
        </Card>
      ) : rows.length === 0 ? (
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
        <Card as="section" className="overflow-hidden">
          <table className="hidden w-full border-collapse text-[15px] md:table">
            <thead>
              <tr className="bg-surface-alt">
                <th scope="col" className={TH_CLASS}>
                  Actividad
                </th>
                <th scope="col" className={TH_CLASS}>
                  Evento
                </th>
                <th scope="col" className={TH_CLASS}>
                  Horario
                </th>
                <th scope="col" className={TH_CLASS}>
                  Responsable
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((s) => {
                const ev = eventsById.get(s.evento_id);
                return (
                  <tr key={s.id} className="border-t border-divider-soft">
                    <td className={`${TD_CLASS} py-4 font-bold`}>{s.actividad}</td>
                    <td className={`${TD_CLASS} py-4`}>
                      {ev ? (
                        <Link
                          to={`/events/${ev.id}`}
                          className="font-bold text-primary hover:underline"
                        >
                          {ev.titulo}
                        </Link>
                      ) : (
                        "—"
                      )}
                      <div className="text-[13px] text-muted-foreground">
                        {shortDateLabel(s.hora_inicio)}
                      </div>
                    </td>
                    <td className={`${TD_CLASS} py-4 text-text-strong`}>
                      {timeRangeLabel(s.hora_inicio, s.hora_fin)}
                    </td>
                    <td className={`${TD_CLASS} py-4 text-text-strong`}>
                      {s.responsable}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <ul className="md:hidden">
            {rows.map((s) => {
              const ev = eventsById.get(s.evento_id);
              return (
                <li
                  key={s.id}
                  className="flex flex-col gap-1 border-t border-divider-soft px-5 py-4 first:border-t-0"
                >
                  <span className="text-sm font-bold text-primary">
                    {shortDateLabel(s.hora_inicio)} ·{" "}
                    {timeRangeLabel(s.hora_inicio, s.hora_fin)}
                  </span>
                  <span className="text-base font-bold">{s.actividad}</span>
                  <span className="text-sm text-muted-foreground">
                    {ev ? (
                      <Link
                        to={`/events/${ev.id}`}
                        className="font-bold text-primary hover:underline"
                      >
                        {ev.titulo}
                      </Link>
                    ) : null}
                    {ev ? " · " : ""}
                    {s.responsable}
                  </span>
                </li>
              );
            })}
          </ul>

          <Pager
            page={page}
            pageCount={pageCount}
            total={total}
            pageSize={pageSize}
            onChange={setPage}
            noun="actividades"
          />
        </Card>
      )}
    </div>
  );
}
