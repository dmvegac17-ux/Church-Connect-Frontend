import { Calendar, CalendarCog, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { Spinner } from "../../../components/feedback/Spinner";
import { useToast } from "../../../components/feedback/useToast";
import { buttonClass } from "../../../components/forms/Button";
import { Card, PageHeader } from "../../../components/layout/Page";
import { OccupancyCell } from "../../../components/registrations/AforoBits";
import {
  SortHeader,
  TablePager,
  useTableState,
} from "../../../components/ui/DataTable";
import {
  DateBlock,
  ScheduleCountPill,
} from "../../../components/ui/EventBits";
import {
  EmptyState,
  IconButton,
  IconLink,
  SearchInput,
  SegmentedTabs,
  TD_CLASS,
  TH_CLASS,
  TR_CLASS,
} from "../../../components/ui/primitives";
import { useEventFilters } from "../../../hooks/useEventFilters";
import { useFullList } from "../../../hooks/useFullList";
import { occupancyOf } from "../../../lib/capacity";
import { eventDateInfo } from "../../../lib/eventDates";
import { eventService } from "../../../services/eventService";
import { ApiError } from "../../../types/api";
import type { Event } from "../../../types/event";
import { DeleteEventDialog } from "../../events/components/DeleteEventDialog";
import { ScheduleModal } from "../../events/components/ScheduleModal";

type EventColumn = "evento" | "lugar" | "ocupacion" | "crono";

/** Eventos (panel de administración): tabla con ocupación, cronograma y acciones. */
export function AdminEventsPage() {
  const toast = useToast();
  const { items, isLoading, error, refetch } = useFullList(eventService.list);
  const filters = useEventFilters(items);
  const table = useTableState<Event, EventColumn>("admin-events", filters.visible, {
    evento: (e) => e.fecha_inicio,
    lugar: (e) => e.lugar,
    ocupacion: (e) => {
      const o = occupancyOf(e);
      return o.aforo ? o.ocupados / o.aforo : 0;
    },
    crono: (e) => e.total_actividades,
  });

  const [target, setTarget] = useState<Event | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);
  const [scheduleEvent, setScheduleEvent] = useState<Event | null>(null);

  const confirmDelete = async () => {
    if (!target) {
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await eventService.remove(target.id);
      toast.success(`Evento «${target.titulo}» eliminado.`);
      refetch();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        refetch();
      } else {
        setDeleteError(err);
      }
    } finally {
      setTarget(null);
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Eventos"
        description="Crea eventos y mantén su cronograma al día."
        actions={
          <Link to="/events/nuevo" className={buttonClass("primary")}>
            <Plus className="size-5" aria-hidden="true" />
            Nuevo evento
          </Link>
        }
      />

      {error ? <ErrorAlert error={error} /> : null}
      {deleteError ? (
        <ErrorAlert error={deleteError} onClose={() => setDeleteError(null)} />
      ) : null}

      <Card as="section" className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider p-4">
          <SegmentedTabs
            label="Filtrar eventos"
            tabs={filters.tabs}
            value={filters.tab}
            onChange={filters.setTab}
          />
          <SearchInput
            label="Buscar eventos"
            placeholder="Buscar por nombre o lugar"
            value={filters.query}
            onChange={filters.setQuery}
            className="max-w-[340px] min-w-[200px] flex-1"
          />
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">
            <Spinner label="Cargando eventos…" />
          </div>
        ) : filters.visible.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No hay eventos en esta vista"
            description="Cambia el filtro o crea un evento nuevo."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="bg-surface-alt">
                  <SortHeader column="evento" table={table}>
                    Evento
                  </SortHeader>
                  <SortHeader column="lugar" table={table}>
                    Lugar
                  </SortHeader>
                  <SortHeader column="ocupacion" table={table}>
                    Ocupación
                  </SortHeader>
                  <SortHeader column="crono" table={table}>
                    Cronograma
                  </SortHeader>
                  <th scope="col" className={`${TH_CLASS} !text-right`}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {table.rows.map((ev) => {
                  const info = eventDateInfo(ev);
                  const hasSchedule = ev.total_actividades > 0;
                  return (
                    <tr key={ev.id} className={TR_CLASS}>
                      <td className={TD_CLASS}>
                        <div className="flex items-center gap-3">
                          <DateBlock info={info} size="sm" />
                          <span className="flex min-w-0 flex-col gap-0.5">
                            <Link
                              to={`/events/${ev.id}`}
                              className="text-[15px] font-extrabold text-foreground hover:text-primary hover:underline"
                            >
                              {ev.titulo}
                            </Link>
                            <span className="text-[13px] text-muted-foreground">
                              {info.timeRange} · {info.statusLabel}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className={`${TD_CLASS} text-text-strong`}>{ev.lugar}</td>
                      <td className={`${TD_CLASS} whitespace-nowrap`}>
                        <OccupancyCell occupancy={occupancyOf(ev)} />
                      </td>
                      <td className={TD_CLASS}>
                        <ScheduleCountPill
                          count={ev.total_actividades}
                          warnWhenEmpty={!info.isPast}
                        />
                      </td>
                      <td className={TD_CLASS}>
                        <div className="flex justify-end gap-1">
                          {info.isPast ? (
                            // Un evento finalizado queda como registro: ni
                            // él ni su cronograma se editan; solo se elimina.
                            <IconButton
                              icon={Lock}
                              disabled
                              label="Evento finalizado: no se puede editar, solo eliminar"
                            />
                          ) : (
                            <>
                              <IconButton
                                icon={CalendarCog}
                                label={`${hasSchedule ? "Editar" : "Crear"} el cronograma de ${ev.titulo}`}
                                onClick={() => setScheduleEvent(ev)}
                              />
                              <IconLink
                                icon={Pencil}
                                label={`Editar el evento ${ev.titulo}`}
                                to={`/events/${ev.id}/editar`}
                              />
                            </>
                          )}
                          <IconButton
                            icon={Trash2}
                            danger
                            label={`Eliminar el evento ${ev.titulo}`}
                            onClick={() => setTarget(ev)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {isLoading ? null : <TablePager table={table} />}
      </Card>

      <DeleteEventDialog
        open={target !== null}
        eventTitle={target?.titulo ?? ""}
        activityCount={target?.total_actividades ?? 0}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setTarget(null)}
      />

      <ScheduleModal
        open={scheduleEvent !== null}
        event={scheduleEvent}
        onClose={() => setScheduleEvent(null)}
        onSaved={refetch}
      />
    </div>
  );
}
