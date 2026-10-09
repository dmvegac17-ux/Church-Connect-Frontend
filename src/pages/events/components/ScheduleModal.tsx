import { ArrowDown, ArrowUp, ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import { ConfirmDialog } from "../../../components/feedback/ConfirmDialog";
import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { Spinner } from "../../../components/feedback/Spinner";
import { useToast } from "../../../components/feedback/useToast";
import { Button } from "../../../components/forms/Button";
import { FieldError } from "../../../components/forms/fieldStyles";
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
import { scheduleService } from "../../../services/scheduleService";
import { userService } from "../../../services/userService";
import { ApiError } from "../../../types/api";
import type { Event } from "../../../types/event";
import type { User } from "../../../types/user";
import { EventSelect } from "../../schedules/components/EventSelect";
import { TimeSelect } from "../../schedules/components/TimeSelect";
import { ResponsiblePicker } from "./ResponsiblePicker";

const ACTIVIDAD_MAX = 150;
const DESCRIPCION_MAX = 1000;

type RowField = "actividad" | "time" | "responsable";

interface ScheduleRowState {
  localId: string;
  id?: string;
  actividad: string;
  descripcion: string;
  /** Valores de `datetime-local` (hora local del navegador). */
  horaInicio: string;
  horaFin: string;
  responsable: string;
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

  useEffect(() => {
    if (!open) {
      setPickedId("");
      setExtraUsers([]);
      setConfirmDiscard(false);
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
    if (!eventId) {
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);

    scheduleService
      .list({ eventoId: eventId, signal: controller.signal })
      .then((result) => {
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

  const requestClose = () => {
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
  }, [rows, event]);

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
      },
    ]);
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

    const rowOps = rows.map(async (row) => {
      const dto = {
        evento_id: event.id,
        actividad: row.actividad.trim(),
        descripcion: row.descripcion.trim() || null,
        hora_inicio: fromDatetimeLocalValue(row.horaInicio),
        hora_fin: fromDatetimeLocalValue(row.horaFin),
        responsable: row.responsable.trim(),
      };
      if (row.id) {
        await scheduleService.update(row.id, dto);
      } else {
        await scheduleService.create(dto);
      }
    });

    const results = await Promise.allSettled([...deleteOps, ...rowOps]);
    setSaving(false);

    const failures = results.filter((r) => r.status === "rejected");
    onSaved();
    if (failures.length === 0) {
      toast.success(`Cronograma de «${event.titulo}» guardado.`);
      onClose();
      return;
    }
    setSaveError((failures[0] as PromiseRejectedResult).reason);
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
                          onClick={() => removeRow(row)}
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

                    <ResponsiblePicker
                      value={row.responsable}
                      onChange={(name) => {
                        patch(row.localId, { responsable: name });
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
    </>
  );
}
