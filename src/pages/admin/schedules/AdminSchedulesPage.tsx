import {
  CalendarX,
  ChevronDown,
  ChevronUp,
  Pencil,
  Plus,
  SearchX,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { Button, buttonClass } from "../../../components/forms/Button";
import { Card, PageHeader } from "../../../components/layout/Page";
import {
  EmptyState,
  IconButton,
  IconLink,
  Pill,
  SearchInput,
  SegmentedTabs,
} from "../../../components/ui/primitives";
import { useRefreshSignal } from "../../../lib/refresh";
import { useEventOptions } from "../../../hooks/useEventOptions";
import { useSchedule } from "../../../hooks/useSchedule";
import {
  dateText,
  isoToWall,
  shortMoment,
  timeText,
} from "../../../lib/dateTimeRange";
import { monthAbbr } from "../../../lib/eventDates";
import {
  ACTIVITY_STATUS,
  byDay,
  filterGroups,
  needsAttention,
  responsiblesOf,
  splitGroups,
  statusSummary,
  type ActivityStatus,
  type GroupedActivity,
  type ScheduleGroup,
} from "../../../lib/scheduleGroups";
import { scheduleService } from "../../../services/scheduleService";
import { ApiError } from "../../../types/api";
import { ScheduleModal } from "../../events/components/ScheduleModal";
import { EventSelect } from "../../schedules/components/EventSelect";

type Tab = "upcoming" | "past";

/** Eventos que se pintan de entrada; el resto, con «Mostrar más». */
const PAGE = 8;
const SELECT_CLASS =
  "h-[var(--control-h)] rounded-[10px] border border-input bg-card px-2.5 text-[15px] text-foreground";

const timeRange = (startIso: string, endIso: string) =>
  `${timeText(isoToWall(startIso).split("T")[1])} – ${timeText(isoToWall(endIso).split("T")[1])}`;

/** "10 ene 9:00 a. m. – 1:00 p. m." (con su día si termina otro). */
function eventRange(startIso: string, endIso: string): string {
  const start = isoToWall(startIso);
  const end = isoToWall(endIso);
  return `${shortMoment(start)} – ${
    start.split("T")[0] === end.split("T")[0] ? timeText(end.split("T")[1]) : shortMoment(end)
  }`;
}

/**
 * Cronogramas (panel de administración): las actividades agrupadas bajo su
 * evento, con el estado de cada una y un aviso en los eventos que necesitan
 * atención. Crear y editar abren el modal de cronograma y conservan sus
 * rutas (`/schedules/nuevo`, `/schedules/:id/editar`).
 */
export function AdminSchedulesPage({ mode }: { mode?: "create" | "edit" }) {
  const toast = useToast();
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const { events, refetch: refetchEvents } = useEventOptions();

  const [groups, setGroups] = useState<ScheduleGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);
  useRefreshSignal(refetch);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    scheduleService
      .grouped(controller.signal)
      .then((result) => {
        setGroups(result);
        setIsLoading(false);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(err);
          setIsLoading(false);
        }
      });
    return () => controller.abort();
  }, [reloadKey]);

  const [searchParams, setSearchParams] = useSearchParams();
  const eventoId = searchParams.get("evento_id") ?? "";
  const search = eventoId ? `?evento_id=${eventoId}` : "";
  const setEventoId = (id: string) => {
    setSearchParams(id ? { evento_id: id } : {}, { replace: true });
  };

  const [q, setQ] = useState("");
  const [estado, setEstado] = useState<ActivityStatus | "">("");
  const [responsable, setResponsable] = useState("");
  const [tab, setTab] = useState<Tab>("upcoming");
  // `null`: todavía no se tocó nada; se muestra abierto el evento más próximo.
  const [expanded, setExpanded] = useState<Set<string> | null>(null);
  const [shown, setShown] = useState(PAGE);
  const [openActivities, setOpenActivities] = useState<Set<string>>(new Set());

  const [target, setTarget] = useState<GroupedActivity | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);

  const eventsById = useMemo(() => new Map(events.map((e) => [e.id, e])), [events]);
  const filtering = Boolean(q.trim() || estado || responsable || eventoId);
  const { upcoming, past } = useMemo(
    () => splitGroups(filterGroups(groups, { q, eventoId, estado, responsable })),
    [groups, q, eventoId, estado, responsable],
  );
  const list = tab === "upcoming" ? upcoming : past;
  const visible = list.slice(0, shown);
  const responsibles = useMemo(() => responsiblesOf(groups), [groups]);

  useEffect(() => setShown(PAGE), [tab, q, estado, responsable, eventoId]);

  // Al filtrar se despliega todo lo que coincide; si no, lo que se haya abierto
  // (por defecto, el evento más próximo).
  const isOpen = (group: ScheduleGroup) =>
    filtering ||
    (expanded === null
      ? tab === "upcoming" && group.evento.id === upcoming[0]?.evento.id
      : expanded.has(group.evento.id));
  const toggleGroup = (group: ScheduleGroup) =>
    setExpanded((prev) => {
      const next = new Set(
        prev ?? (isOpen(group) ? [group.evento.id] : []),
      );
      if (!next.delete(group.evento.id)) {
        next.add(group.evento.id);
      }
      return next;
    });
  const toggleActivity = (id: string) =>
    setOpenActivities((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });

  // Edición por ruta: la actividad indica a qué evento pertenece el modal.
  const fromGroups =
    mode === "edit"
      ? groups.flatMap((g) => g.actividades).find((a) => a.id === editId)
      : undefined;
  const fetched = useSchedule(mode === "edit" && !fromGroups ? editId : undefined);
  const editingSchedule = fromGroups ?? fetched.schedule ?? undefined;
  const editingEvent = editingSchedule
    ? (eventsById.get(editingSchedule.evento_id) ?? null)
    : null;
  // En "nuevo", el evento filtrado (si lo hay) ya viene elegido.
  const createEvent = eventoId ? (eventsById.get(eventoId) ?? null) : null;
  const modalOpen = mode === "create" || (mode === "edit" && editingEvent !== null);
  const closeModal = () => navigate(`/schedules${search}`);

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

  const clearFilters = () => {
    setQ("");
    setEstado("");
    setResponsable("");
    setEventoId("");
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Cronogramas"
        description="Las actividades de cada evento, con el estado de sus responsables."
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
      {mode === "edit" && fetched.error ? <ErrorAlert error={fetched.error} /> : null}

      <Card as="section" aria-label="Filtros" className="flex flex-col gap-3 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <SearchInput
            label="Buscar por actividad o evento"
            placeholder="Buscar por actividad o evento…"
            value={q}
            onChange={setQ}
            className="min-w-[220px] flex-1"
          />
          <div className="w-full min-w-[220px] sm:w-auto">
            <EventSelect
              compact
              placeholder="Todos los eventos"
              value={eventoId}
              onChange={setEventoId}
            />
          </div>
          <label className="flex flex-col gap-1.5 text-[13px] font-bold">
            Estado
            <select
              value={estado}
              onChange={(e) => setEstado(e.target.value as ActivityStatus | "")}
              className={SELECT_CLASS}
            >
              <option value="">Todos los estados</option>
              {(Object.keys(ACTIVITY_STATUS) as ActivityStatus[]).map((status) => (
                <option key={status} value={status}>
                  {ACTIVITY_STATUS[status].label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-[13px] font-bold">
            Responsable
            <select
              value={responsable}
              onChange={(e) => setResponsable(e.target.value)}
              className={`${SELECT_CLASS} max-w-[240px]`}
            >
              <option value="">Todos los responsables</option>
              {responsibles.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SegmentedTabs
            label="Eventos por fecha"
            tabs={[
              { value: "upcoming", label: "Próximos", count: upcoming.length },
              { value: "past", label: "Pasados", count: past.length },
            ]}
            value={tab}
            onChange={setTab}
          />
          <div className="flex flex-wrap gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExpanded(new Set(list.map((g) => g.evento.id)))}
            >
              Expandir todos
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setExpanded(new Set())}>
              Contraer todos
            </Button>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <Card className="p-10 text-center text-muted-foreground">
          <Spinner label="Cargando cronogramas…" />
        </Card>
      ) : list.length === 0 ? (
        <EmptyState
          bordered
          icon={filtering ? SearchX : CalendarX}
          tone={filtering ? "sand" : "warning"}
          title={
            filtering
              ? "Ninguna actividad coincide con los filtros"
              : tab === "upcoming"
                ? "No hay eventos próximos"
                : "No hay eventos pasados"
          }
          action={
            filtering ? (
              <Button variant="secondary" onClick={clearFilters}>
                Quitar filtros
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {visible.map((group) => {
            const { evento, actividades } = group;
            const open = isOpen(group);
            const finished = tab === "past";
            const attention = !finished && needsAttention(actividades);
            const start = new Date(evento.fecha_inicio);
            const days = byDay(actividades);
            return (
              <Card
                key={evento.id}
                as="section"
                aria-label={`Cronograma de ${evento.titulo}`}
                className="overflow-hidden"
              >
                <header
                  className={`flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 ${
                    finished ? "bg-surface-alt" : "bg-primary-soft"
                  }`}
                >
                  <h2 className="min-w-0 flex-1">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => toggleGroup(group)}
                      className="flex w-full items-center gap-3 rounded-lg text-left"
                    >
                      <span
                        aria-hidden="true"
                        className={`w-[50px] shrink-0 rounded-xl py-1.5 text-center ${
                          finished
                            ? "bg-muted text-text-secondary"
                            : "bg-primary text-primary-foreground"
                        }`}
                      >
                        <span className="block text-[11px] font-extrabold tracking-[0.06em] uppercase">
                          {monthAbbr(start)}
                        </span>
                        <span className="block text-lg leading-[1.1] font-extrabold">
                          {Number(isoToWall(evento.fecha_inicio).slice(8, 10))}
                        </span>
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="text-[17px] leading-[1.3] font-extrabold break-words">
                            {evento.titulo}
                          </span>
                          {attention ? (
                            <Pill tone="warning" icon={TriangleAlert} className="!h-6 !px-2 !text-xs">
                              Requiere atención
                            </Pill>
                          ) : null}
                          {finished ? (
                            <Pill tone="sand" className="!h-6 !px-2 !text-xs">
                              Finalizado
                            </Pill>
                          ) : null}
                        </span>
                        <span className="text-sm text-text-secondary">
                          {eventRange(evento.fecha_inicio, evento.fecha_fin)}
                        </span>
                        <span className="text-[13px] text-text-secondary">
                          {statusSummary(actividades)}
                        </span>
                      </span>
                      {open ? (
                        <ChevronUp className="size-5 shrink-0 text-text-secondary" aria-hidden="true" />
                      ) : (
                        <ChevronDown className="size-5 shrink-0 text-text-secondary" aria-hidden="true" />
                      )}
                    </button>
                  </h2>
                  {finished ? null : (
                    <div className="flex items-center gap-1">
                      <IconLink
                        icon={Pencil}
                        label={`Editar evento ${evento.titulo}`}
                        to={`/events/${evento.id}/editar`}
                      />
                      <IconLink
                        icon={Plus}
                        label={`Agregar actividad a ${evento.titulo}`}
                        to={`/schedules/nuevo?evento_id=${evento.id}`}
                      />
                    </div>
                  )}
                </header>

                {!open ? null : actividades.length === 0 ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider px-5 py-4">
                    <p className="text-sm text-muted-foreground">
                      Este evento aún no tiene actividades.
                    </p>
                    {finished ? null : (
                      <Link
                        to={`/schedules/nuevo?evento_id=${evento.id}`}
                        className={buttonClass("secondary", "sm")}
                      >
                        <Plus className="size-[18px]" aria-hidden="true" />
                        Agregar actividad
                      </Link>
                    )}
                  </div>
                ) : (
                  days.map((day) => (
                    <div key={day.date}>
                      {days.length > 1 ? (
                        <h3 className="border-t border-divider-soft bg-surface-alt px-5 py-1.5 text-[13px] font-extrabold text-text-secondary">
                          {dateText(day.date).replace(/ \d{4}$/, "")}
                        </h3>
                      ) : null}
                      <ul>
                        {day.items.map((activity) => {
                          const meta = ACTIVITY_STATUS[activity.estado];
                          const detail = openActivities.has(activity.id);
                          return (
                            <li
                              key={activity.id}
                              className="border-t border-divider-soft"
                            >
                              <div className="flex items-center gap-1 py-1.5 pr-2 pl-3">
                                <button
                                  type="button"
                                  aria-expanded={detail}
                                  onClick={() => toggleActivity(activity.id)}
                                  className="flex min-w-0 flex-1 items-start gap-2 rounded-lg px-2 py-1.5 text-left hover:bg-surface-alt"
                                >
                                  {detail ? (
                                    <ChevronUp className="mt-0.5 size-[18px] shrink-0 text-text-secondary" aria-hidden="true" />
                                  ) : (
                                    <ChevronDown className="mt-0.5 size-[18px] shrink-0 text-text-secondary" aria-hidden="true" />
                                  )}
                                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                                      <span className="text-[15px] font-extrabold break-words">
                                        {activity.actividad}
                                      </span>
                                      <Pill tone={meta.tone} className="!h-6 !px-2 !text-xs">
                                        {meta.label}
                                      </Pill>
                                    </span>
                                    <span className="text-[13px] text-text-secondary">
                                      {timeRange(activity.hora_inicio, activity.hora_fin)} ·{" "}
                                      {activity.responsable}
                                    </span>
                                  </span>
                                </button>
                                {finished ? null : (
                                  <>
                                    <IconLink
                                      icon={Pencil}
                                      label={`Editar ${activity.actividad}`}
                                      to={`/schedules/${activity.id}/editar${search}`}
                                    />
                                    <IconButton
                                      icon={Trash2}
                                      danger
                                      label={`Eliminar ${activity.actividad}`}
                                      onClick={() => setTarget(activity)}
                                    />
                                  </>
                                )}
                              </div>
                              {detail ? (
                                <p className="px-5 pb-3 pl-[46px] text-sm text-text-secondary">
                                  {activity.descripcion || "Sin descripción."}
                                </p>
                              ) : null}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ))
                )}
              </Card>
            );
          })}

          {list.length > shown ? (
            <Button
              variant="secondary"
              className="self-center"
              onClick={() => setShown((n) => n + PAGE)}
            >
              Mostrar más eventos ({list.length - shown} restantes)
            </Button>
          ) : null}
        </div>
      )}

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
              }. ${
                target.responsable_id
                  ? `Su responsable, ${target.responsable} (${ACTIVITY_STATUS[target.estado].label.toLowerCase()}), recibirá un aviso de que se canceló.`
                  : "No tiene responsable asignado."
              }`
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
