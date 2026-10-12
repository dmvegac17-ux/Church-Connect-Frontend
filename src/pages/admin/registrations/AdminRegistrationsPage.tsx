import {
  CalendarDays,
  ChartColumn,
  ChevronRight,
  Info,
  Pencil,
  ShieldCheck,
  Ticket,
  Trash2,
  User as UserIcon,
  UserPlus,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useAuth } from "../../../auth/useAuth";
import { ConfirmDialog } from "../../../components/feedback/ConfirmDialog";
import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { Spinner } from "../../../components/feedback/Spinner";
import { useToast } from "../../../components/feedback/useToast";
import { Button, buttonClass } from "../../../components/forms/Button";
import { Card, PageHeader } from "../../../components/layout/Page";
import {
  AforoStrip,
  OverCapacityAlert,
} from "../../../components/registrations/AforoBits";
import {
  SortHeader,
  TablePager,
  useTableState,
} from "../../../components/ui/DataTable";
import { DateBlock, EventStatusPill } from "../../../components/ui/EventBits";
import {
  Avatar,
  EmptyState,
  IconButton,
  Pill,
  SearchInput,
  SegmentedTabs,
  TD_CLASS,
  TH_CLASS,
  TR_CLASS,
} from "../../../components/ui/primitives";
import { PARTICIPATIONS_PATH } from "../../../config/navigation";
import { useFullList } from "../../../hooks/useFullList";
import { useSchedules } from "../../../hooks/useSchedules";
import {
  occupancyOf,
  occupancyTone,
  seatsLeftText,
  type Occupancy,
} from "../../../lib/capacity";
import {
  eventDateInfo,
  isUpcoming,
  shortDateLabel,
  sortEventsForDisplay,
} from "../../../lib/eventDates";
import { plural, shortDate, STATUS_META } from "../../../lib/participations";
import { normalizeText } from "../../../lib/people";
import { eventService } from "../../../services/eventService";
import { participationService } from "../../../services/participationService";
import { registrationService } from "../../../services/registrationService";
import { userService } from "../../../services/userService";
import { ApiError } from "../../../types/api";
import type { Event } from "../../../types/event";
import type { Participation } from "../../../types/participation";
import type { Registration } from "../../../types/registration";
import { EditNoteDialog } from "./EditNoteDialog";
import { EnrollPersonDialog } from "./EnrollPersonDialog";

type View = "evento" | "resumen";
type AttendeeTab = "publico" | "participantes";
type PublicColumn = "persona" | "inscripcion" | "por" | "nota";
type SummaryColumn =
  | "evento"
  | "fecha"
  | "aforo"
  | "participantes"
  | "publico"
  | "disponibles";

const VIEWS: { value: View; label: string; icon: typeof CalendarDays }[] = [
  { value: "evento", label: "Por evento", icon: CalendarDays },
  { value: "resumen", label: "Total de inscritos", icon: ChartColumn },
];

function personName(registration: Registration): string {
  return registration.usuario?.nombre_completo ?? "Usuario eliminado";
}

/**
 * Inscripciones (panel de administración): el público inscrito y los
 * participantes de cada evento, y el resumen de todos los eventos.
 */
export function AdminRegistrationsPage() {
  const [params, setParams] = useSearchParams();
  const events = useFullList(eventService.list);
  const sorted = useMemo(() => sortEventsForDisplay(events.items), [events.items]);

  const view: View = params.get("vista") === "resumen" ? "resumen" : "evento";
  // Sin evento en la URL se abre el más próximo.
  const selected =
    sorted.find((event) => event.id === params.get("evento")) ?? sorted[0] ?? null;

  const go = (next: { vista?: View; evento?: string }) => {
    const updated = new URLSearchParams(params);
    if (next.vista) {
      if (next.vista === "resumen") {
        updated.set("vista", "resumen");
      } else {
        updated.delete("vista");
      }
    }
    if (next.evento) {
      updated.set("evento", next.evento);
    }
    setParams(updated, { replace: true });
  };

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Inscripciones"
        description="Público inscrito y participantes de cada evento."
        actions={
          <div
            role="group"
            aria-label="Vista de inscripciones"
            className="flex gap-1 rounded-xl bg-muted p-1"
          >
            {VIEWS.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                aria-pressed={view === value}
                onClick={() => go({ vista: value })}
                className={`inline-flex h-9 items-center gap-1.5 rounded-[9px] px-3.5 text-sm font-bold whitespace-nowrap transition-colors max-md:h-10 ${
                  view === value
                    ? "bg-card text-foreground shadow-tab"
                    : "text-text-secondary hover:text-foreground"
                }`}
              >
                <Icon className="size-[18px]" aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
        }
      />

      {events.error ? <ErrorAlert error={events.error} /> : null}

      {events.isLoading ? (
        <Card className="p-10 text-center text-muted-foreground">
          <Spinner label="Cargando eventos…" />
        </Card>
      ) : events.error ? null : sorted.length === 0 ? (
        <Card>
          <EmptyState
            icon={Ticket}
            title="Todavía no hay eventos"
            description="Cuando crees un evento podrás gestionar aquí sus inscritos."
            action={
              <Link to="/events/nuevo" className={buttonClass("primary", "sm")}>
                Nuevo evento
              </Link>
            }
          />
        </Card>
      ) : view === "resumen" ? (
        <SummaryView
          events={sorted}
          onPick={(event) => go({ vista: "evento", evento: event.id })}
        />
      ) : selected ? (
        <EventView
          // Cada evento estrena búsqueda, pestaña y diálogos.
          key={selected.id}
          event={selected}
          events={sorted}
          onPick={(id) => go({ evento: id })}
          onChanged={events.refetch}
        />
      ) : null}
    </div>
  );
}

/* ── Total de inscritos ──────────────────────────────────────────────── */

interface SummaryRow {
  event: Event;
  occupancy: Occupancy;
  upcoming: boolean;
}

function freeLabel(o: Occupancy): string {
  if (o.sobrecupo > 0) {
    return `Sobrecupo ${o.sobrecupo}`;
  }
  return o.lleno ? "Lleno" : `${o.disponibles} libres`;
}

function SummaryView({
  events,
  onPick,
}: {
  events: Event[];
  onPick: (event: Event) => void;
}) {
  const rows = useMemo<SummaryRow[]>(() => {
    const now = new Date();
    return events.map((event) => ({
      event,
      occupancy: occupancyOf(event),
      upcoming: isUpcoming(event, now),
    }));
  }, [events]);

  const table = useTableState<SummaryRow, SummaryColumn>("admin-registrations-summary", rows, {
    evento: (r) => r.event.titulo,
    fecha: (r) => r.event.fecha_inicio,
    aforo: (r) => r.occupancy.aforo,
    participantes: (r) => r.occupancy.participantes,
    publico: (r) => r.occupancy.publico,
    disponibles: (r) => r.occupancy.disponibles,
  });

  const upcoming = rows.filter((r) => r.upcoming);
  const sum = (list: SummaryRow[], pick: (o: Occupancy) => number) =>
    list.reduce((total, r) => total + pick(r.occupancy), 0);

  return (
    <Card as="section" className="overflow-hidden">
      <h2 className="sr-only">Total de inscritos</h2>
      <dl className="flex flex-wrap gap-x-10 gap-y-3.5 border-b border-divider px-5 py-4">
        <div>
          <dt className="text-[13px] font-bold text-text-secondary">Total de inscritos</dt>
          <dd className="mt-0.5 text-[30px] leading-[1.1] font-extrabold">
            {sum(rows, (o) => o.publico)}
          </dd>
          <dd className="text-xs text-muted-foreground">
            en {plural(rows.length, "evento", "eventos")}
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-bold text-text-secondary">En eventos próximos</dt>
          <dd className="mt-0.5 text-[30px] leading-[1.1] font-extrabold text-primary-hover">
            {sum(upcoming, (o) => o.publico)}
          </dd>
          <dd className="text-xs text-muted-foreground">
            {plural(upcoming.length, "evento", "eventos")}
          </dd>
        </div>
        <div>
          <dt className="text-[13px] font-bold text-text-secondary">Participantes</dt>
          <dd className="mt-0.5 text-[30px] leading-[1.1] font-extrabold">
            {sum(rows, (o) => o.participantes)}
          </dd>
          <dd className="text-xs text-muted-foreground">sumados por evento</dd>
        </div>
      </dl>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <caption className="sr-only">Resumen de inscritos por evento</caption>
          <thead>
            <tr className="bg-surface-alt">
              <SortHeader column="evento" table={table}>
                Evento
              </SortHeader>
              <SortHeader column="fecha" table={table}>
                Fecha
              </SortHeader>
              <SortHeader column="aforo" table={table} align="right">
                Aforo
              </SortHeader>
              <SortHeader column="participantes" table={table} align="right">
                Participantes
              </SortHeader>
              <SortHeader column="publico" table={table} align="right">
                Público
              </SortHeader>
              <SortHeader column="disponibles" table={table} align="right">
                Disponibles
              </SortHeader>
              <th scope="col" className={`${TH_CLASS} !text-right`}>
                <span className="sr-only">Acciones</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {table.rows.map(({ event, occupancy, upcoming: isNext }) => (
              <tr key={event.id} className={TR_CLASS}>
                <td className={`${TD_CLASS} font-bold text-foreground`}>{event.titulo}</td>
                <td className={`${TD_CLASS} whitespace-nowrap text-text-strong`}>
                  {shortDateLabel(event.fecha_inicio)}{" "}
                  <Pill tone={isNext ? "success" : "neutral"} className="!h-[22px] !px-2">
                    {isNext ? "Próximo" : "Finalizado"}
                  </Pill>
                </td>
                <td className={`${TD_CLASS} text-right tabular-nums`}>{occupancy.aforo}</td>
                <td className={`${TD_CLASS} text-right tabular-nums`}>
                  {occupancy.participantes}
                </td>
                <td className={`${TD_CLASS} text-right tabular-nums`}>{occupancy.publico}</td>
                <td
                  className={`${TD_CLASS} text-right font-bold whitespace-nowrap ${
                    occupancyTone(occupancy) || "text-text-strong"
                  }`}
                >
                  {freeLabel(occupancy)}
                </td>
                <td className={`${TD_CLASS} text-right`}>
                  <button
                    type="button"
                    onClick={() => onPick(event)}
                    aria-label={`Ver inscritos de ${event.titulo}`}
                    className="rounded-lg px-2 py-1.5 text-sm font-bold whitespace-nowrap text-primary hover:underline max-md:min-h-11"
                  >
                    Ver inscritos
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePager table={table} />
    </Card>
  );
}

/* ── Por evento ──────────────────────────────────────────────────────── */

interface ParticipantRow {
  id: string;
  name: string;
  activities: string[];
  status: "pendiente" | "aceptada" | null;
}

function EventView({
  event,
  events,
  onPick,
  onChanged,
}: {
  event: Event;
  events: Event[];
  onPick: (eventId: string) => void;
  /** Cambió la ocupación: se recargan las cifras del evento. */
  onChanged: () => void;
}) {
  const { user: me } = useAuth();
  const toast = useToast();
  const meId = me?.id ?? "";
  const info = eventDateInfo(event);
  const occupancy = occupancyOf(event);

  const fetchRegistrations = useCallback(
    (page: { limit: number; offset: number; signal: AbortSignal }) =>
      registrationService.listByEvent(event.id, page),
    [event.id],
  );
  const registrations = useFullList(fetchRegistrations);
  const { schedules, isLoading: loadingSchedules } = useSchedules(event.id);
  const users = useFullList(userService.list);

  const [invitations, setInvitations] = useState<Participation[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    participationService
      .listByEvent(event.id, controller.signal)
      .then(setInvitations)
      .catch(() => {
        // Sin esta consulta la lista sigue útil: solo falta el estado.
      });
    return () => controller.abort();
  }, [event.id]);

  const [tab, setTab] = useState<AttendeeTab>("publico");
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Registration | null>(null);
  const [removing, setRemoving] = useState<Registration | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);

  const refreshAll = () => {
    registrations.refetch();
    onChanged();
  };

  /* Público */

  const visible = useMemo(() => {
    const q = normalizeText(query);
    if (!q) {
      return registrations.items;
    }
    return registrations.items.filter((r) =>
      normalizeText(`${personName(r)} ${r.usuario?.correo ?? ""}`).includes(q),
    );
  }, [registrations.items, query]);

  const table = useTableState<Registration, PublicColumn>(
    `admin-registrations:${event.id}`,
    visible,
    {
      persona: (r) => personName(r),
      inscripcion: (r) => r.fecha_inscripcion,
      por: (r) => r.inscrito_por_usuario?.nombre_completo ?? "",
      // Las notas vacías van al final al ordenar de forma ascendente.
      nota: (r) => r.nota ?? "￿",
    },
  );

  /* Participantes: una fila por persona, con todas sus actividades. */

  const participants = useMemo<ParticipantRow[]>(() => {
    const byUser = new Map<string, ParticipantRow>();
    for (const schedule of schedules) {
      if (!schedule.responsable_id) {
        continue;
      }
      const row = byUser.get(schedule.responsable_id) ?? {
        id: schedule.responsable_id,
        name: schedule.responsable,
        activities: [],
        status: null,
      };
      row.activities.push(schedule.actividad);
      byUser.set(schedule.responsable_id, row);
    }
    for (const row of byUser.values()) {
      const active = invitations.filter(
        (i) =>
          i.participante.id === row.id &&
          (i.estado_respuesta === "pendiente" || i.estado_respuesta === "aceptada"),
      );
      row.status = active.some((i) => i.estado_respuesta === "pendiente")
        ? "pendiente"
        : active.length > 0
          ? "aceptada"
          : null;
    }
    return [...byUser.values()].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [schedules, invitations]);

  const enrolledIds = useMemo(
    () => new Set(registrations.items.map((r) => r.usuario_id)),
    [registrations.items],
  );
  const participantIds = useMemo(
    () => new Set(participants.map((p) => p.id)),
    [participants],
  );

  /* Inscribir persona: bloqueado sin cupos o con el evento ya iniciado. */

  const closed = event.aforo.inscripciones_cerradas;
  const blockedWhy = closed
    ? info.isPast
      ? "El evento ya finalizó."
      : "El evento ya empezó."
    : occupancy.sobrecupo > 0
      ? "No hay cupos: el evento tiene sobrecupo."
      : occupancy.disponibles <= 0
        ? "No hay cupos disponibles para público."
        : "";

  const confirmRemove = async () => {
    if (!removing) {
      return;
    }
    const name = personName(removing);
    setDeleting(true);
    setActionError(null);
    try {
      await registrationService.remove(removing.id);
      toast.success(`Inscripción de ${name} eliminada.`);
      refreshAll();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        refreshAll();
      } else {
        setActionError(err);
      }
    } finally {
      setRemoving(null);
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <DateBlock info={info} />
          <div className="flex min-w-0 flex-col gap-1">
            <h2 className="text-xl leading-tight font-extrabold break-words">
              {event.titulo}
            </h2>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-secondary">
              <span>
                {info.dateLong} · {info.timeRange}
              </span>
              <EventStatusPill info={info} />
            </span>
          </div>
        </div>
        <label className="flex min-w-[220px] flex-col gap-1.5">
          <span className="text-sm font-bold">Cambiar evento</span>
          <select
            value={event.id}
            onChange={(e) => onPick(e.target.value)}
            className="h-[var(--control-h)] rounded-[10px] border border-input bg-card px-2.5 text-[15px] text-foreground"
          >
            {events.map((option) => {
              const optionInfo = eventDateInfo(option);
              return (
                <option key={option.id} value={option.id}>
                  {option.titulo} · {shortDateLabel(option.fecha_inicio)}
                  {optionInfo.isPast ? " (finalizado)" : ""}
                </option>
              );
            })}
          </select>
        </label>
      </div>

      <AforoStrip
        occupancy={occupancy}
        action={
          <Link to={`/events/${event.id}`} className={buttonClass("secondary", "sm")}>
            Ver evento
          </Link>
        }
      />
      <OverCapacityAlert occupancy={occupancy} />

      {actionError ? (
        <ErrorAlert error={actionError} onClose={() => setActionError(null)} />
      ) : null}
      {registrations.error ? <ErrorAlert error={registrations.error} /> : null}

      <Card as="section" aria-label="Inscritos" className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider p-4">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[17px] font-extrabold">Inscritos</h2>
            <SegmentedTabs
              label="Tipo de asistente"
              value={tab}
              onChange={setTab}
              tabs={[
                { value: "publico", label: "Público", count: occupancy.publico },
                {
                  value: "participantes",
                  label: "Participantes",
                  count: occupancy.participantes,
                },
              ]}
            />
          </div>
          {tab === "publico" ? (
            <div className="flex flex-wrap items-center gap-2.5">
              {/* El botón deshabilitado va siempre con el texto que explica por qué. */}
              {blockedWhy ? (
                <span className="text-[13px] text-muted-foreground">{blockedWhy}</span>
              ) : null}
              <Button
                size="sm"
                onClick={() => setAdding(true)}
                disabled={Boolean(blockedWhy)}
                title={blockedWhy || undefined}
              >
                <UserPlus className="size-[18px]" aria-hidden="true" />
                Inscribir persona
              </Button>
            </div>
          ) : null}
        </div>

        {tab === "publico" ? (
          <>
            <div className="border-b border-divider p-4">
              <SearchInput
                label="Buscar inscritos"
                placeholder="Buscar por nombre o correo"
                value={query}
                onChange={setQuery}
                className="max-w-[360px]"
              />
            </div>
            {registrations.isLoading ? (
              <div className="p-10 text-center text-muted-foreground">
                <Spinner label="Cargando inscritos…" />
              </div>
            ) : visible.length === 0 ? (
              <EmptyState
                icon={Ticket}
                title={query.trim() ? "Nadie coincide con la búsqueda." : "Aún no hay inscritos."}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-sm">
                  <thead>
                    <tr className="bg-surface-alt">
                      <SortHeader column="persona" table={table}>
                        Persona
                      </SortHeader>
                      <SortHeader column="inscripcion" table={table}>
                        Inscripción
                      </SortHeader>
                      <SortHeader column="por" table={table}>
                        Inscrito por
                      </SortHeader>
                      <SortHeader column="nota" table={table}>
                        Nota
                      </SortHeader>
                      <th scope="col" className={`${TH_CLASS} !text-right`}>
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((registration) => {
                      const name = personName(registration);
                      const by = registration.inscrito_por_usuario;
                      const ByIcon = registration.inscrito_por ? ShieldCheck : UserIcon;
                      return (
                        <tr key={registration.id} className={TR_CLASS}>
                          <td className={TD_CLASS}>
                            <div className="flex items-center gap-3">
                              <Avatar name={name} />
                              <span className="flex min-w-0 flex-col">
                                <span className="text-[15px] font-bold text-foreground">
                                  {name}
                                </span>
                                <span className="text-[13px] text-muted-foreground">
                                  {registration.usuario?.correo ?? "—"}
                                </span>
                              </span>
                            </div>
                          </td>
                          <td className={`${TD_CLASS} whitespace-nowrap text-text-strong`}>
                            {shortDate(registration.fecha_inscripcion)}
                          </td>
                          <td className={`${TD_CLASS} text-text-strong`}>
                            <span className="inline-flex items-center gap-1.5">
                              <ByIcon
                                className="size-[17px] shrink-0 text-icon-muted"
                                aria-hidden="true"
                              />
                              {registration.inscrito_por
                                ? `${by?.nombre_completo ?? "Un administrador"}${
                                    registration.inscrito_por === meId ? " (Tú)" : ""
                                  }`
                                : "Él mismo"}
                            </span>
                          </td>
                          <td
                            className={`${TD_CLASS} max-w-[260px] break-words ${
                              registration.nota ? "text-text-strong" : "text-icon-neutral"
                            }`}
                          >
                            {registration.nota || "—"}
                          </td>
                          <td className={TD_CLASS}>
                            <div className="flex justify-end gap-1">
                              <IconButton
                                icon={Pencil}
                                label={`Editar nota de ${name}`}
                                onClick={() => setEditing(registration)}
                              />
                              <IconButton
                                icon={Trash2}
                                danger
                                label={`Eliminar inscripción de ${name}`}
                                onClick={() => setRemoving(registration)}
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
            {registrations.isLoading ? null : <TablePager table={table} />}
          </>
        ) : (
          <div className="flex flex-col gap-3 p-4">
            <p
              role="note"
              className="flex items-center gap-2 rounded-[10px] border border-info-border bg-info-soft px-3 py-2.5 text-sm text-info-foreground"
            >
              <Info className="size-[18px] shrink-0" aria-hidden="true" />
              Los participantes ocupan aforo aunque no se inscriban.
            </p>
            {loadingSchedules ? (
              <div className="p-8 text-center text-muted-foreground">
                <Spinner label="Cargando participantes…" />
              </div>
            ) : participants.length === 0 ? (
              <div className="px-2 py-6 text-center text-sm text-muted-foreground">
                Aún no hay participantes asignados a actividades de este evento.
              </div>
            ) : (
              <ul className="overflow-hidden rounded-xl border border-border">
                {participants.map((participant) => {
                  const status = participant.status
                    ? STATUS_META[participant.status]
                    : null;
                  return (
                    <li
                      key={participant.id}
                      className="border-t border-divider-soft first:border-t-0"
                    >
                      <Link
                        to={PARTICIPATIONS_PATH}
                        aria-label={`Gestionar participación de ${participant.name}`}
                        className="flex flex-wrap items-center gap-3 px-4 py-3 text-foreground hover:bg-surface-alt"
                      >
                        <Avatar name={participant.name} />
                        <span className="flex min-w-[180px] flex-1 flex-col">
                          <span className="text-[15px] font-bold">
                            {participant.name}
                            {participant.id === meId ? " (Tú)" : ""}
                          </span>
                          <span className="text-[13px] text-muted-foreground">
                            {participant.activities.join(" · ")}
                          </span>
                        </span>
                        {status ? (
                          <Pill tone={status.tone} icon={status.icon}>
                            {status.label}
                          </Pill>
                        ) : (
                          <Pill tone="neutral">Sin invitación</Pill>
                        )}
                        <span className="inline-flex items-center gap-0.5 text-sm font-bold text-primary">
                          Gestionar
                          <ChevronRight className="size-[18px]" aria-hidden="true" />
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </Card>

      <EnrollPersonDialog
        open={adding}
        event={event}
        available={occupancy.disponibles}
        users={users.items}
        loadingUsers={users.isLoading}
        currentUserId={meId}
        enrolledIds={enrolledIds}
        participantIds={participantIds}
        onClose={() => setAdding(false)}
        onStale={refreshAll}
        onEnrolled={(created, name) => {
          setAdding(false);
          setQuery("");
          const left = Math.max(
            0,
            created.cupos_disponibles ?? occupancy.disponibles - 1,
          );
          toast.success(`${name} quedó inscrito. ${seatsLeftText(left)}`);
          refreshAll();
        }}
      />

      <EditNoteDialog
        registration={editing}
        name={editing ? personName(editing) : ""}
        onClose={() => setEditing(null)}
        onSaved={(updated) => {
          registrations.setItems((items) =>
            items.map((r) => (r.id === updated.id ? updated : r)),
          );
          setEditing(null);
          toast.success("Nota actualizada.");
        }}
      />

      <ConfirmDialog
        open={removing !== null}
        danger
        title="Eliminar inscripción"
        description={
          removing
            ? `${personName(removing)} perderá su cupo en «${event.titulo}». El cupo quedará disponible.`
            : undefined
        }
        confirmLabel="Eliminar inscripción"
        loading={deleting}
        loadingLabel="Eliminando…"
        onConfirm={() => void confirmRemove()}
        onCancel={() => setRemoving(null)}
      />
    </>
  );
}
