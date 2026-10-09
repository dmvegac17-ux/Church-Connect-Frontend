import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  ChevronUp,
  MailPlus,
  Plus,
  Send,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ConfirmDialog } from "../../../components/feedback/ConfirmDialog";
import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { Spinner } from "../../../components/feedback/Spinner";
import { useToast } from "../../../components/feedback/useToast";
import { Button } from "../../../components/forms/Button";
import {
  controlClass,
  FieldError,
  HINT_CLASS,
} from "../../../components/forms/fieldStyles";
import { TextArea } from "../../../components/forms/TextArea";
import { TextField } from "../../../components/forms/TextField";
import { FormStatus } from "../../../components/ui/FormStatus";
import { Modal } from "../../../components/ui/Overlay";
import { IconButton } from "../../../components/ui/primitives";
import { useFullList } from "../../../hooks/useFullList";
import { eventDateInfo, timeLabel } from "../../../lib/eventDates";
import {
  formatDurationMinutes,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "../../../lib/format";
import {
  conflictStatus,
  dateInDays,
  daysUntil,
  shortDate,
} from "../../../lib/participations";
import { participationService } from "../../../services/participationService";
import { scheduleService } from "../../../services/scheduleService";
import { userService } from "../../../services/userService";
import { ApiError } from "../../../types/api";
import type { Event } from "../../../types/event";
import type { Participation } from "../../../types/participation";
import type { User } from "../../../types/user";
import { daysError, ReassignDialog } from "../../admin/participations/ReassignDialog";
import { EventSelect } from "../../schedules/components/EventSelect";
import { TimeSelect } from "../../schedules/components/TimeSelect";
import { InvitationStatusCard, LockedResponsible } from "./InvitationStatusCard";
import { ResponsiblePicker } from "./ResponsiblePicker";

const ACTIVIDAD_MAX = 150;
const DESCRIPCION_MAX = 1000;
const MAX_CONFIRM_DAYS = 30;

type RowField = "actividad" | "time" | "responsable" | "dias";

interface ScheduleRowState {
  localId: string;
  id?: string;
  actividad: string;
  descripcion: string;
  /** Valores de `datetime-local` (hora local del navegador). */
  horaInicio: string;
  horaFin: string;
  responsable: string;
  /**
   * Usuario elegido en esta sesión de edición (vacío si no se tocó el
   * responsable). Al guardar se le envía la invitación.
   */
  invitado: User | null;
  /** Días para confirmar de esa invitación. */
  dias: string;
}

/** Los administradores supervisan: no reciben invitaciones que confirmar. */
function canBeInvited(user: User | null): user is User {
  return user !== null && user.rol !== "ADMIN";
}

interface ScheduleModalProps {
  open: boolean;
  /** Evento del cronograma. `null` muestra un selector ("Nuevo cronograma"). */
  event: Event | null;
  /** Eventos disponibles para el selector (solo cuando `event` es `null`). */
  events?: Event[];
  /** Actividad a la que llevar la vista al abrir (edición desde Cronogramas). */
  focusScheduleId?: string;
  onClose: () => void;
  onSaved: () => void;
}

function newLocalId(): string {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function timePart(datetimeLocal: string): string {
  return datetimeLocal.split("T")[1] ?? "";
}

function withTime(dateOnly: string, time: string): string {
  return `${dateOnly}T${time || "00:00"}`;
}

function addMinute(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.min(h * 60 + m + 1, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function rowDurationMinutes(row: ScheduleRowState): number {
  if (!row.horaInicio || !row.horaFin) {
    return 0;
  }
  const diff =
    (new Date(row.horaFin).getTime() - new Date(row.horaInicio).getTime()) / 60000;
  return Number.isFinite(diff) && diff > 0 ? diff : 0;
}

/** Huella de lo que se guardaría: sirve para saber si hay cambios. */
function snapshot(rows: ScheduleRowState[]): string {
  return JSON.stringify(
    rows.map((r) => [
      r.id ?? "",
      r.actividad.trim(),
      r.descripcion.trim(),
      r.horaInicio,
      r.horaFin,
      r.responsable.trim(),
      r.invitado?.id ?? "",
      r.dias,
    ]),
  );
}

/**
 * Modal único para crear y editar el cronograma de un evento. Se usa desde
 * Eventos, el detalle de evento, Cronogramas e Inicio.
 */
export function ScheduleModal({
  open,
  event: fixedEvent,
  events = [],
  focusScheduleId,
  onClose,
  onSaved,
}: ScheduleModalProps) {
  const toast = useToast();
  const navigate = useNavigate();
  const [pickedId, setPickedId] = useState("");
  const event = fixedEvent ?? events.find((e) => e.id === pickedId) ?? null;

  const users = useFullList(userService.list, open);
  const [extraUsers, setExtraUsers] = useState<User[]>([]);
  const activeUsers = useMemo(
    () =>
      [...extraUsers, ...users.items.filter((u) => !extraUsers.some((x) => x.id === u.id))]
        .filter((u) => u.activo !== false),
    [users.items, extraUsers],
  );

  const [rows, setRows] = useState<ScheduleRowState[]>([]);
  const [initialSnapshot, setInitialSnapshot] = useState("[]");
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [openDescriptions, setOpenDescriptions] = useState<Set<string>>(new Set());
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const focusedRef = useRef(false);

  /** Invitación vigente de cada actividad guardada, por id de actividad. */
  const [invitations, setInvitations] = useState<Record<string, Participation>>({});
  const [cancelTarget, setCancelTarget] = useState<Participation | null>(null);
  const [replaceTarget, setReplaceTarget] = useState<Participation | null>(null);
  const [removeTarget, setRemoveTarget] = useState<ScheduleRowState | null>(null);
  const [invitationBusy, setInvitationBusy] = useState(false);

  useEffect(() => {
    if (!open) {
      setPickedId("");
      setExtraUsers([]);
      setConfirmDiscard(false);
      setCancelTarget(null);
      setReplaceTarget(null);
      setRemoveTarget(null);
      focusedRef.current = false;
    }
  }, [open]);

  const eventId = open ? (event?.id ?? null) : null;

  // Carga las actividades del evento cada vez que se abre o cambia de evento.
  useEffect(() => {
    setRows([]);
    setInitialSnapshot("[]");
    setRemovedIds([]);
    setTouched(new Set());
    setOpenDescriptions(new Set());
    setLoadError(null);
    setSaveError(null);
    setInvitations({});
    if (!eventId) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    Promise.all([
      scheduleService.list({ eventoId: eventId, signal: controller.signal }),
      participationService.listByEvent(eventId, controller.signal),
    ])
      .then(([result, current]) => {
        setInvitations(
          Object.fromEntries(current.map((inv) => [inv.actividad.id, inv])),
        );
        const loaded = [...result.items]
          .sort(
            (a, b) =>
              new Date(a.hora_inicio).getTime() - new Date(b.hora_inicio).getTime(),
          )
          .map<ScheduleRowState>((s) => ({
            localId: newLocalId(),
            id: s.id,
            actividad: s.actividad,
            descripcion: s.descripcion ?? "",
            horaInicio: toDatetimeLocalValue(s.hora_inicio),
            horaFin: toDatetimeLocalValue(s.hora_fin),
            responsable: s.responsable,
            invitado: null,
            dias: "",
          }));
        setRows(loaded);
        setInitialSnapshot(snapshot(loaded));
        setOpenDescriptions(
          new Set(loaded.filter((r) => r.descripcion).map((r) => r.localId)),
        );
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setLoadError(err);
        setLoading(false);
      });

    return () => controller.abort();
  }, [eventId]);

  // Al editar desde Cronogramas, lleva la vista a esa actividad.
  useEffect(() => {
    if (!focusScheduleId || focusedRef.current || loading) {
      return;
    }
    const row = rows.find((r) => r.id === focusScheduleId);
    if (row) {
      focusedRef.current = true;
      requestAnimationFrame(() =>
        document
          .getElementById(`schedule-row-${row.localId}`)
          ?.scrollIntoView({ block: "center" }),
      );
    }
  }, [focusScheduleId, rows, loading]);

  const dirty = snapshot(rows) !== initialSnapshot || removedIds.length > 0;

  /* ── Invitaciones de las actividades ya guardadas ───────────────────── */

  const reloadInvitations = useCallback(async () => {
    if (!eventId) {
      return;
    }
    try {
      const current = await participationService.listByEvent(eventId);
      setInvitations(Object.fromEntries(current.map((inv) => [inv.actividad.id, inv])));
    } catch {
      // Si falla el refresco, se conserva lo que ya estaba en pantalla.
    }
  }, [eventId]);

  /** Con invitación pendiente o aceptada, el responsable no se puede cambiar. */
  const lockedBy = (row: ScheduleRowState): Participation | null => {
    const invitation = row.id ? invitations[row.id] : undefined;
    return invitation &&
      (invitation.estado_respuesta === "pendiente" ||
        invitation.estado_respuesta === "aceptada")
      ? invitation
      : null;
  };

  /** Días de calendario hasta la actividad y plazo máximo para confirmar. */
  const confirmWindow = (row: ScheduleRowState) => {
    const daysToEvent = row.horaInicio
      ? daysUntil(fromDatetimeLocalValue(row.horaInicio))
      : 0;
    return { daysToEvent, maxDays: Math.min(MAX_CONFIRM_DAYS, daysToEvent - 1) };
  };

  /** Al guardar se enviará una invitación al responsable recién elegido. */
  const willInvite = (row: ScheduleRowState) =>
    canBeInvited(row.invitado) && !lockedBy(row) && confirmWindow(row).maxDays >= 1;

  const explainInvitationError = (err: unknown, fallback: string) => {
    toast.error(err instanceof ApiError ? err.message : fallback);
  };

  const confirmCancelInvitation = async () => {
    if (!cancelTarget) {
      return;
    }
    setInvitationBusy(true);
    try {
      await participationService.cancel(cancelTarget.id);
      toast.success(
        `Invitación a ${cancelTarget.participante.nombre_completo} cancelada. Ya puedes elegir otro responsable.`,
      );
    } catch (err) {
      if (conflictStatus(err)) {
        toast.info("La invitación cambió de estado mientras tanto.");
      } else {
        explainInvitationError(err, "No se pudo cancelar la invitación.");
      }
    } finally {
      await reloadInvitations();
      setInvitationBusy(false);
      setCancelTarget(null);
    }
  };

  const resendInvitation = async (invitation: Participation) => {
    setInvitationBusy(true);
    try {
      const updated = await participationService.resend(invitation.id);
      if (updated.estado_envio === "enviada") {
        toast.success(
          `Invitación reenviada a ${invitation.participante.nombre_completo}.`,
        );
      } else {
        toast.error("El correo volvió a fallar. La invitación sigue pendiente.");
      }
    } catch (err) {
      explainInvitationError(err, "No se pudo reenviar la invitación.");
    } finally {
      await reloadInvitations();
      setInvitationBusy(false);
    }
  };

  const requestClose = () => {
    // Con la ventana de reasignación encima, Escape la cierra a ella primero.
    if (replaceTarget) {
      setReplaceTarget(null);
      return;
    }
    if (saving) {
      return;
    }
    if (dirty) {
      setConfirmDiscard(true);
    } else {
      onClose();
    }
  };

  /* ── Datos derivados del evento ─────────────────────────────────────── */

  const eventMin = event ? toDatetimeLocalValue(event.fecha_inicio) : "";
  const eventMax = event ? toDatetimeLocalValue(event.fecha_fin) : "";
  const eventDateOnly = eventMin.split("T")[0];
  const isSingleDay = eventDateOnly === eventMax.split("T")[0];
  const info = event ? eventDateInfo(event) : null;
  const rangeHint = event
    ? `Solo se habilitan horas dentro del horario del evento: ${timeLabel(event.fecha_inicio)} – ${timeLabel(event.fecha_fin)}`
    : "";

  const totalMinutes = event
    ? Math.max(
        0,
        (new Date(event.fecha_fin).getTime() -
          new Date(event.fecha_inicio).getTime()) /
          60000,
      )
    : 0;
  const assignedMinutes = rows.reduce((sum, row) => sum + rowDurationMinutes(row), 0);
  const remainingMinutes = totalMinutes - assignedMinutes;
  const exceeded = remainingMinutes < 0;

  /* ── Validación ─────────────────────────────────────────────────────── */

  const rowErrors = useMemo(() => {
    const result: Record<string, Partial<Record<RowField, string>>> = {};
    if (!event) {
      return result;
    }
    const start = new Date(event.fecha_inicio);
    const end = new Date(event.fecha_fin);

    for (const row of rows) {
      const errs: Partial<Record<RowField, string>> = {};
      if (!row.actividad.trim()) {
        errs.actividad = "Escribe el título de la actividad.";
      }
      if (!row.responsable.trim()) {
        errs.responsable = "Elige un responsable.";
      }
      if (!row.horaInicio || !row.horaFin) {
        errs.time = "Indica la hora de inicio y la de fin.";
      } else {
        const rowStart = new Date(row.horaInicio);
        const rowEnd = new Date(row.horaFin);
        if (rowEnd <= rowStart) {
          errs.time = "La hora de fin debe ser posterior a la de inicio.";
        } else if (rowStart < start || rowEnd > end) {
          errs.time = "El horario debe quedar dentro del horario del evento.";
        }
      }
      if (willInvite(row)) {
        const { daysToEvent, maxDays } = confirmWindow(row);
        const message = daysError(row.dias, daysToEvent, maxDays);
        if (message) {
          errs.dias = message;
        }
      }
      result[row.localId] = errs;
    }

    // Solapamientos entre actividades con horario válido.
    for (const a of rows) {
      if (result[a.localId].time || !a.horaInicio) {
        continue;
      }
      const overlaps = rows.some(
        (b) =>
          b.localId !== a.localId &&
          b.horaInicio &&
          b.horaFin &&
          new Date(b.horaFin) > new Date(b.horaInicio) &&
          new Date(a.horaInicio) < new Date(b.horaFin) &&
          new Date(a.horaFin) > new Date(b.horaInicio),
      );
      if (overlaps) {
        result[a.localId].time = "Se solapa con otra actividad del cronograma.";
      }
    }
    return result;
    // `willInvite` solo depende de las filas y de las invitaciones cargadas.
  }, [rows, event, invitations]);

  const invalidRows = rows.filter(
    (row) => Object.keys(rowErrors[row.localId] ?? {}).length > 0,
  ).length;
  const canSave =
    Boolean(event) && !loading && !loadError && dirty && invalidRows === 0 && !exceeded;

  const touch = (localId: string, field: RowField) =>
    setTouched((prev) => {
      const key = `${localId}:${field}`;
      if (prev.has(key)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(key);
      return next;
    });
  const shown = (localId: string, field: RowField) =>
    touched.has(`${localId}:${field}`) ? rowErrors[localId]?.[field] : undefined;

  /* ── Edición de filas ───────────────────────────────────────────────── */

  const patch = (localId: string, changes: Partial<ScheduleRowState>) =>
    setRows((prev) =>
      prev.map((row) => (row.localId === localId ? { ...row, ...changes } : row)),
    );

  const setStart = (row: ScheduleRowState, value: string) => {
    // Si el fin queda antes (o igual) que el nuevo inicio, se borra.
    const keepEnd = row.horaFin && new Date(row.horaFin) > new Date(value);
    patch(row.localId, { horaInicio: value, horaFin: keepEnd ? row.horaFin : "" });
    touch(row.localId, "time");
  };

  const addRow = () => {
    const last = rows[rows.length - 1];
    // La nueva actividad empieza donde termina la anterior.
    const start =
      last?.horaFin && last.horaFin < eventMax ? last.horaFin : rows.length ? "" : eventMin;
    setRows((prev) => [
      ...prev,
      {
        localId: newLocalId(),
        actividad: "",
        descripcion: "",
        horaInicio: start,
        horaFin: "",
        responsable: "",
        invitado: null,
        dias: "",
      },
    ]);
  };

  const requestRemoveRow = (row: ScheduleRowState) => {
    // Eliminar la actividad borra también su invitación: se avisa antes.
    if (lockedBy(row)) {
      setRemoveTarget(row);
    } else {
      removeRow(row);
    }
  };

  const removeRow = (row: ScheduleRowState) => {
    if (row.id) {
      setRemovedIds((prev) => [...prev, row.id as string]);
    }
    setRows((prev) => prev.filter((r) => r.localId !== row.localId));
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    setRows((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) {
        return prev;
      }
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const toggleDescription = (localId: string) =>
    setOpenDescriptions((prev) => {
      const next = new Set(prev);
      if (next.has(localId)) {
        next.delete(localId);
      } else {
        next.add(localId);
      }
      return next;
    });

  /* ── Guardado ───────────────────────────────────────────────────────── */

  const handleSave = async () => {
    if (!event || !canSave) {
      return;
    }
    setSaving(true);
    setSaveError(null);

    const deleteOps = removedIds.map((id) =>
      scheduleService.remove(id).catch((err: unknown) => {
        if (err instanceof ApiError && err.status === 404) {
          return;
        }
        throw err;
      }),
    );

    const invited: Participation[] = [];

    const rowOps = rows.map(async (row) => {
      const dto = {
        evento_id: event.id,
        actividad: row.actividad.trim(),
        descripcion: row.descripcion.trim() || null,
        hora_inicio: fromDatetimeLocalValue(row.horaInicio),
        hora_fin: fromDatetimeLocalValue(row.horaFin),
        responsable: row.responsable.trim(),
      };
      const saved = row.id
        ? await scheduleService.update(row.id, dto)
        : await scheduleService.create(dto);

      // La invitación se crea con la actividad ya guardada.
      if (willInvite(row) && canBeInvited(row.invitado)) {
        invited.push(
          await participationService.invite(saved.id, {
            participante_id: row.invitado.id,
            dias_para_confirmar: Number(row.dias),
          }),
        );
      }
    });

    const results = await Promise.allSettled([...deleteOps, ...rowOps]);
    setSaving(false);

    const failures = results.filter((r) => r.status === "rejected");
    onSaved();
    if (failures.length === 0) {
      if (invited.length === 0) {
        toast.success(`Cronograma de «${event.titulo}» guardado.`);
      } else {
        const failedMail = invited.filter((i) => i.estado_envio === "error").length;
        const who =
          invited.length === 1
            ? invited[0].participante.nombre_completo
            : `${invited.length} participantes`;
        toast.notify({
          variant: failedMail > 0 ? "info" : "success",
          message:
            failedMail > 0
              ? `Cronograma guardado. Invitación creada para ${who}, pero ${
                  failedMail === 1 ? "un correo no se pudo" : `${failedMail} correos no se pudieron`
                } enviar.`
              : `Cronograma guardado. Invitación enviada a ${who}.`,
          actionLabel: "Ver participaciones",
          onAction: () => navigate("/participations"),
        });
      }
      onClose();
      return;
    }
    setSaveError((failures[0] as PromiseRejectedResult).reason);
    // Lo que sí se guardó ya no está pendiente: se recarga el estado real.
    void reloadInvitations();
  };

  return (
    <>
      <Modal
        open={open}
        maxWidth="max-w-[720px]"
        onClose={requestClose}
        title={event ? `Cronograma de «${event.titulo}»` : "Nuevo cronograma"}
        subtitle={
          event && info
            ? `${info.dateLong} · ${info.timeRange}`
            : "Elige el evento al que pertenecen las actividades."
        }
        toolbar={
          <div className="flex flex-col gap-3">
            {fixedEvent === null ? (
              <EventSelect
                compact
                value={pickedId}
                onChange={setPickedId}
                disabled={dirty || saving}
              />
            ) : null}
            {event ? (
              <div>
                <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
                  <span className="text-text-secondary">
                    Tiempo asignado:{" "}
                    <strong className="text-foreground">
                      {formatDurationMinutes(assignedMinutes)}
                    </strong>
                  </span>
                  <span
                    className={
                      exceeded ? "font-bold text-destructive" : "text-text-secondary"
                    }
                  >
                    {exceeded ? "Excedido por: " : "Disponible: "}
                    <strong className={exceeded ? "" : "text-foreground"}>
                      {formatDurationMinutes(Math.abs(remainingMinutes))}
                    </strong>
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Tiempo asignado del evento"
                  aria-valuemin={0}
                  aria-valuemax={Math.round(totalMinutes)}
                  aria-valuenow={Math.round(Math.min(assignedMinutes, totalMinutes))}
                  className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className={`h-full rounded-full transition-all ${
                      exceeded ? "bg-destructive" : "bg-primary"
                    }`}
                    style={{
                      width: `${totalMinutes > 0 ? Math.min(100, (assignedMinutes / totalMinutes) * 100) : 0}%`,
                    }}
                  />
                </div>
              </div>
            ) : null}
          </div>
        }
        footer={
          <div className="flex flex-wrap items-center justify-between gap-3">
            {event ? (
              exceeded ? (
                <p role="status" className="text-sm font-bold text-destructive">
                  Las actividades superan la duración del evento.
                </p>
              ) : (
                <FormStatus
                  saving={saving}
                  submitted={touched.size > 0}
                  errorCount={invalidRows}
                  dirty={dirty}
                />
              )
            ) : (
              <span />
            )}
            <div className="ml-auto flex gap-2.5">
              <Button variant="secondary" onClick={requestClose} disabled={saving}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                loading={saving}
                loadingLabel="Guardando…"
                disabled={!canSave}
              >
                Guardar cronograma
              </Button>
            </div>
          </div>
        }
      >
        <div className="flex flex-col gap-4 p-5">
          {saveError ? (
            <ErrorAlert error={saveError} onClose={() => setSaveError(null)} />
          ) : null}

          {!event ? (
            <p className="rounded-xl border border-dashed border-button-border p-6 text-center text-[15px] text-muted-foreground">
              Selecciona un evento para ver y editar su cronograma.
            </p>
          ) : loading ? (
            <div className="py-10 text-center text-muted-foreground">
              <Spinner label="Cargando cronograma…" />
            </div>
          ) : loadError ? (
            <ErrorAlert error={loadError} />
          ) : (
            <>
              {rows.length === 0 ? (
                <p className="rounded-xl border border-dashed border-button-border p-5 text-center text-[15px] text-muted-foreground">
                  Todavía no hay actividades. Agrega la primera con el botón de
                  abajo.
                </p>
              ) : null}

              {rows.map((row, index) => {
                const descOpen = openDescriptions.has(row.localId);
                const timeError = shown(row.localId, "time");
                const invitation = row.id ? invitations[row.id] : undefined;
                const locked = lockedBy(row);
                const inviting = willInvite(row);
                const window_ = confirmWindow(row);
                const daysMessage = shown(row.localId, "dias");
                return (
                  <section
                    key={row.localId}
                    id={`schedule-row-${row.localId}`}
                    aria-label={`Actividad ${index + 1}`}
                    className="flex flex-col gap-3.5 rounded-[14px] border border-border p-4"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-extrabold text-text-secondary">
                        Actividad {index + 1}
                      </h3>
                      <div className="flex items-center gap-0.5">
                        <IconButton
                          icon={ArrowUp}
                          label={`Subir la actividad ${index + 1}`}
                          disabled={index === 0}
                          onClick={() => moveRow(index, -1)}
                        />
                        <IconButton
                          icon={ArrowDown}
                          label={`Bajar la actividad ${index + 1}`}
                          disabled={index === rows.length - 1}
                          onClick={() => moveRow(index, 1)}
                        />
                        <IconButton
                          icon={Trash2}
                          danger
                          label={`Eliminar la actividad ${index + 1}`}
                          onClick={() => requestRemoveRow(row)}
                        />
                      </div>
                    </div>

                    <TextField
                      label="Título"
                      name={`actividad-${row.localId}`}
                      required
                      maxLength={ACTIVIDAD_MAX}
                      value={row.actividad}
                      onChange={(e) => patch(row.localId, { actividad: e.target.value })}
                      onBlur={() => touch(row.localId, "actividad")}
                      error={shown(row.localId, "actividad")}
                    />

                    {isSingleDay ? (
                      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                        <TimeSelect
                          compact
                          label="Inicio"
                          name={`hora_inicio-${row.localId}`}
                          value={timePart(row.horaInicio)}
                          minTime={timePart(eventMin)}
                          maxTime={timePart(eventMax)}
                          onChange={(t) => setStart(row, withTime(eventDateOnly, t))}
                        />
                        <TimeSelect
                          compact
                          label="Fin"
                          name={`hora_fin-${row.localId}`}
                          value={timePart(row.horaFin)}
                          minTime={addMinute(
                            row.horaInicio ? timePart(row.horaInicio) : timePart(eventMin),
                          )}
                          maxTime={timePart(eventMax)}
                          onChange={(t) => {
                            patch(row.localId, { horaFin: withTime(eventDateOnly, t) });
                            touch(row.localId, "time");
                          }}
                        />
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                        <TextField
                          label="Inicio"
                          name={`hora_inicio-${row.localId}`}
                          type="datetime-local"
                          required
                          min={eventMin}
                          max={eventMax}
                          value={row.horaInicio}
                          onChange={(e) => setStart(row, e.target.value)}
                        />
                        <TextField
                          label="Fin"
                          name={`hora_fin-${row.localId}`}
                          type="datetime-local"
                          required
                          min={row.horaInicio || eventMin}
                          max={eventMax}
                          value={row.horaFin}
                          onChange={(e) => {
                            patch(row.localId, { horaFin: e.target.value });
                            touch(row.localId, "time");
                          }}
                        />
                      </div>
                    )}
                    {timeError ? (
                      <FieldError>{timeError}</FieldError>
                    ) : (
                      <p className="text-[13px] text-muted-foreground">{rangeHint}</p>
                    )}

                    {locked ? (
                      <LockedResponsible name={locked.participante.nombre_completo} />
                    ) : (
                      <ResponsiblePicker
                        value={row.responsable}
                        onChange={(name, user) => {
                          patch(row.localId, {
                            responsable: name,
                            invitado: user,
                            dias: "",
                          });
                          touch(row.localId, "responsable");
                        }}
                        onBlur={() => touch(row.localId, "responsable")}
                        users={activeUsers}
                        loading={users.isLoading}
                        error={shown(row.localId, "responsable")}
                        onUserCreated={(user) =>
                          setExtraUsers((prev) => [user, ...prev])
                        }
                      />
                    )}

                    {invitation && !row.invitado ? (
                      <InvitationStatusCard
                        invitation={invitation}
                        busy={invitationBusy || saving}
                        onCancel={() => setCancelTarget(invitation)}
                        onResend={() => void resendInvitation(invitation)}
                        onRevoke={() => setReplaceTarget(invitation)}
                      />
                    ) : null}

                    {row.invitado && !locked ? (
                      inviting ? (
                        <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-surface-alt px-3.5 py-3">
                          <label
                            htmlFor={`dias-${row.localId}`}
                            className="flex flex-wrap items-center gap-2.5"
                          >
                            <span className="flex items-center gap-1.5 text-[13px] font-bold">
                              <Send className="size-[18px] text-primary" aria-hidden="true" />
                              Días para confirmar
                            </span>
                            <input
                              id={`dias-${row.localId}`}
                              type="text"
                              inputMode="numeric"
                              autoComplete="off"
                              placeholder="Ej. 7"
                              value={row.dias}
                              aria-invalid={daysMessage ? true : undefined}
                              aria-describedby={`dias-${row.localId}-help`}
                              onChange={(e) => {
                                patch(row.localId, {
                                  dias: e.target.value.replace(/\D/g, "").slice(0, 2),
                                });
                                touch(row.localId, "dias");
                              }}
                              onBlur={() => touch(row.localId, "dias")}
                              className={controlClass(
                                Boolean(daysMessage),
                                "h-10 !w-[90px] bg-card",
                              )}
                            />
                            <span className="text-sm text-text-secondary">días</span>
                          </label>
                          <p id={`dias-${row.localId}-help`} className={HINT_CLASS}>
                            Entre 1 y {window_.maxDays} días. La actividad es el{" "}
                            {shortDate(fromDatetimeLocalValue(row.horaInicio))} (en{" "}
                            {window_.daysToEvent} días).
                          </p>
                          {daysMessage ? (
                            <FieldError>{daysMessage}</FieldError>
                          ) : row.dias && !rowErrors[row.localId]?.dias ? (
                            <p className="flex items-center gap-1.5 text-[13px] font-bold text-success-foreground">
                              <MailPlus className="size-4 shrink-0" aria-hidden="true" />
                              Se le enviará la invitación al guardar. Deberá responder
                              antes del {shortDate(dateInDays(Number(row.dias)))}.
                            </p>
                          ) : null}
                        </div>
                      ) : canBeInvited(row.invitado) ? (
                        <p className={HINT_CLASS}>
                          La actividad es mañana o ya pasó: se guardará el responsable
                          sin pedirle confirmación.
                        </p>
                      ) : (
                        <p className={HINT_CLASS}>
                          Los administradores no reciben invitación: quedará como
                          responsable sin confirmación.
                        </p>
                      )
                    ) : null}

                    <div>
                      <button
                        type="button"
                        aria-expanded={descOpen}
                        onClick={() => toggleDescription(row.localId)}
                        className="flex min-h-8 items-center gap-1 rounded py-1 text-sm font-bold text-primary hover:underline"
                      >
                        {descOpen ? (
                          <ChevronUp className="size-[18px]" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="size-[18px]" aria-hidden="true" />
                        )}
                        {descOpen
                          ? "Ocultar descripción"
                          : row.descripcion
                            ? "Ver descripción"
                            : "Agregar descripción (opcional)"}
                      </button>
                      {descOpen ? (
                        <div className="mt-2">
                          <TextArea
                            label="Descripción"
                            optional
                            name={`descripcion-${row.localId}`}
                            rows={2}
                            maxLength={DESCRIPCION_MAX}
                            value={row.descripcion}
                            onChange={(e) =>
                              patch(row.localId, { descripcion: e.target.value })
                            }
                          />
                        </div>
                      ) : null}
                    </div>
                  </section>
                );
              })}

              <button
                type="button"
                onClick={addRow}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-dashed border-primary text-[15px] font-bold text-primary hover:bg-primary-selected"
              >
                <Plus className="size-5" aria-hidden="true" />
                Agregar actividad
              </button>
            </>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        open={confirmDiscard}
        danger
        title="¿Descartar los cambios?"
        description="Los cambios que hiciste en este cronograma no se guardarán."
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
        onConfirm={() => {
          setConfirmDiscard(false);
          onClose();
        }}
        onCancel={() => setConfirmDiscard(false)}
      />

      <ConfirmDialog
        open={removeTarget !== null}
        danger
        title="Eliminar actividad"
        description={
          removeTarget && lockedBy(removeTarget)
            ? `${lockedBy(removeTarget)?.participante.nombre_completo} tiene una invitación ${
                lockedBy(removeTarget)?.estado_respuesta === "aceptada"
                  ? "aceptada"
                  : "pendiente"
              } para «${removeTarget.actividad}». Al guardar el cronograma, la actividad y su invitación se eliminarán.`
            : undefined
        }
        confirmLabel="Eliminar actividad"
        cancelLabel="Volver"
        onConfirm={() => {
          if (removeTarget) {
            removeRow(removeTarget);
          }
          setRemoveTarget(null);
        }}
        onCancel={() => setRemoveTarget(null)}
      />

      <ConfirmDialog
        open={cancelTarget !== null}
        danger
        title="Cancelar invitación"
        description={
          cancelTarget
            ? `${cancelTarget.participante.nombre_completo} ya no podrá responder la invitación a «${cancelTarget.actividad.nombre}». Podrás elegir otro responsable o volver a invitarlo.`
            : undefined
        }
        confirmLabel="Cancelar invitación"
        cancelLabel="Volver"
        loading={invitationBusy}
        loadingLabel="Cancelando…"
        onConfirm={() => void confirmCancelInvitation()}
        onCancel={() => setCancelTarget(null)}
      />

      <ReassignDialog
        invitation={replaceTarget}
        onClose={() => setReplaceTarget(null)}
        onDone={(result) => {
          setReplaceTarget(null);
          // El backend ya dejó a la nueva persona como responsable.
          setRows((prev) =>
            prev.map((r) =>
              r.id === result.nueva.actividad.id
                ? {
                    ...r,
                    responsable: result.nueva.participante.nombre_completo,
                    invitado: null,
                    dias: "",
                  }
                : r,
            ),
          );
          toast.success(
            `Confirmación revocada. Invitación enviada a ${result.nueva.participante.nombre_completo}.`,
          );
          void reloadInvitations();
          onSaved();
        }}
        onConflict={(_current, message) => {
          setReplaceTarget(null);
          toast.info(message);
          void reloadInvitations();
        }}
      />
    </>
  );
}
