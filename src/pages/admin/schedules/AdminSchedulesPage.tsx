import { CalendarX, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import { ConfirmDialog } from "../../../components/feedback/ConfirmDialog";
import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { Spinner } from "../../../components/feedback/Spinner";
import { useToast } from "../../../components/feedback/useToast";
import { buttonClass } from "../../../components/forms/Button";
import { Card, PageHeader } from "../../../components/layout/Page";
import {
  EmptyState,
  IconButton,
  IconLink,
  Pager,
  TD_CLASS,
  TH_CLASS,
  TR_CLASS,
} from "../../../components/ui/primitives";
import { useEventOptions } from "../../../hooks/useEventOptions";
import { useFullList } from "../../../hooks/useFullList";
import { useSchedule } from "../../../hooks/useSchedule";
import {
  activitiesLabel,
  shortDateLabel,
  timeRangeLabel,
} from "../../../lib/eventDates";
import { scheduleService } from "../../../services/scheduleService";
import { ApiError } from "../../../types/api";
import type { Schedule } from "../../../types/schedule";
import { ScheduleModal } from "../../events/components/ScheduleModal";
import { EventSelect } from "../../schedules/components/EventSelect";

const PAGE_SIZE = 10;

/**
 * Cronogramas (panel de administración): todas las actividades, por evento.
 * Crear y editar abren el modal de cronograma y conservan sus rutas
 * (`/schedules/nuevo`, `/schedules/:id/editar`).
 */
export function AdminSchedulesPage({ mode }: { mode?: "create" | "edit" }) {
  const toast = useToast();
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const { events, refetch: refetchEvents } = useEventOptions();
  const { items, isLoading, error, refetch } = useFullList(scheduleService.list);

  const [searchParams, setSearchParams] = useSearchParams();
  const eventoId = searchParams.get("evento_id") ?? "";
  const search = eventoId ? `?evento_id=${eventoId}` : "";
  const setEventoId = (id: string) => {
    setSearchParams(id ? { evento_id: id } : {}, { replace: true });
  };

  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<Schedule | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);

  const eventsById = useMemo(
    () => new Map(events.map((e) => [e.id, e])),
    [events],
  );

  const filtered = useMemo(
    () =>
      items
        .filter((s) => !eventoId || s.evento_id === eventoId)
        .sort(
          (a, b) =>
            new Date(a.hora_inicio).getTime() - new Date(b.hora_inicio).getTime(),
        ),
    [items, eventoId],
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [eventoId]);

  // Edición por ruta: la actividad indica a qué evento pertenece el modal.
  const fromList = mode === "edit" ? items.find((s) => s.id === editId) : undefined;
  const fetched = useSchedule(mode === "edit" && !fromList ? editId : undefined);
  const editingSchedule = fromList ?? fetched.schedule ?? undefined;
  const editingEvent = editingSchedule
    ? (eventsById.get(editingSchedule.evento_id) ?? null)
    : null;
  // En "nuevo", el evento filtrado (si lo hay) ya viene elegido.
  const createEvent = eventoId ? (eventsById.get(eventoId) ?? null) : null;

  const modalOpen = mode === "create" || (mode === "edit" && editingEvent !== null);
  const closeModal = () => navigate(`/schedules${search}`);

  const selectedEvent = eventoId ? eventsById.get(eventoId) : undefined;

  const confirmDelete = async () => {
    if (!target) {
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await scheduleService.remove(target.id);
      toast.success(`Actividad «${target.actividad}» eliminada.`);
      refetch();
      refetchEvents();
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
        title="Cronogramas"
        description="Todas las actividades programadas, por evento."
        actions={
          <Link to={`/schedules/nuevo${search}`} className={buttonClass("primary")}>
            <Plus className="size-5" aria-hidden="true" />
            Nuevo cronograma
          </Link>
        }
      />

      {error ? <ErrorAlert error={error} /> : null}
      {deleteError ? (
        <ErrorAlert error={deleteError} onClose={() => setDeleteError(null)} />
      ) : null}
      {mode === "edit" && fetched.error ? (
        <ErrorAlert error={fetched.error} />
      ) : null}

      <Card as="section" className="overflow-hidden">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b border-divider p-4">
          <div className="w-full min-w-[260px] sm:w-auto">
            <EventSelect
              compact
              placeholder="Todos los eventos"
              value={eventoId}
              onChange={setEventoId}
            />
          </div>
          {!isLoading ? (
            <p className="text-sm text-muted-foreground" role="status">
              {activitiesLabel(filtered.length)}
            </p>
          ) : null}
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">
            <Spinner label="Cargando cronogramas…" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={CalendarX}
            tone="warning"
            title={
              selectedEvent
                ? `«${selectedEvent.titulo}» aún no tiene cronograma`
                : "Todavía no hay actividades programadas"
            }
            action={
              <Link
                to={`/schedules/nuevo${search}`}
                className={buttonClass("primary", "sm")}
              >
                <Plus className="size-[18px]" aria-hidden="true" />
                Crear cronograma
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
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
                  <th scope="col" className={`${TH_CLASS} !text-right`}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((s) => {
                  const ev = eventsById.get(s.evento_id);
                  return (
                    <tr key={s.id} className={TR_CLASS}>
                      <td className={`${TD_CLASS} py-3 font-extrabold`}>
                        {s.actividad}
                      </td>
                      <td className={`${TD_CLASS} py-3`}>
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
                      <td
                        className={`${TD_CLASS} py-3 whitespace-nowrap text-text-strong`}
                      >
                        {timeRangeLabel(s.hora_inicio, s.hora_fin)}
                      </td>
                      <td className={`${TD_CLASS} py-3 text-text-strong`}>
                        {s.responsable}
                      </td>
                      <td className={`${TD_CLASS} py-3`}>
                        <div className="flex justify-end gap-1">
                          <IconLink
                            icon={Pencil}
                            label={`Editar «${s.actividad}» en el cronograma`}
                            to={`/schedules/${s.id}/editar${search}`}
                          />
                          <IconButton
                            icon={Trash2}
                            danger
                            label={`Eliminar la actividad «${s.actividad}»`}
                            onClick={() => setTarget(s)}
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

        <Pager
          page={safePage}
          pageCount={pageCount}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onChange={setPage}
          noun="actividades"
        />
      </Card>

      <ScheduleModal
        open={modalOpen}
        event={mode === "edit" ? editingEvent : createEvent}
        events={events}
        focusScheduleId={mode === "edit" ? editId : undefined}
        onClose={closeModal}
        onSaved={() => {
          refetch();
          refetchEvents();
        }}
      />

      <ConfirmDialog
        open={target !== null}
        danger
        title="Eliminar actividad"
        description={
          target
            ? `Vas a eliminar «${target.actividad}» del cronograma de ${
                eventsById.get(target.evento_id)?.titulo ?? "su evento"
              }. Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar actividad"
        loadingLabel="Eliminando…"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}
