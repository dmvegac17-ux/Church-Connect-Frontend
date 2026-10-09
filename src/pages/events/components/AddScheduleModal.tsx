import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, Plus, Trash2, X } from "lucide-react";
import { useEffect, useState } from "react";

import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { Spinner } from "../../../components/feedback/Spinner";
import { useToast } from "../../../components/feedback/useToast";
import { Button } from "../../../components/forms/Button";
import { TextArea } from "../../../components/forms/TextArea";
import { TextField } from "../../../components/forms/TextField";
import {
  formatDurationMinutes,
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "../../../lib/format";
import { scheduleService } from "../../../services/scheduleService";
import { ApiError } from "../../../types/api";
import type { Event } from "../../../types/event";
import { TimeSelect } from "../../schedules/components/TimeSelect";

const ACTIVIDAD_MAX = 150;
const DESCRIPCION_MAX = 1000;
const RESPONSABLE_MAX = 150;

function timePart(datetimeLocal: string): string {
  return datetimeLocal.split("T")[1] ?? "";
}

function withTime(dateOnly: string, time: string): string {
  return `${dateOnly}T${time || "00:00"}`;
}

interface ScheduleRowState {
  localId: string;
  id?: string;
  actividad: string;
  descripcion: string;
  horaInicio: string;
  horaFin: string;
  responsable: string;
}

interface AddScheduleModalProps {
  event: Event | null;
  onClose: () => void;
  onSaved: () => void;
}

function newLocalId(): string {
  return `row-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function rowDurationMinutes(row: ScheduleRowState): number {
  if (!row.horaInicio || !row.horaFin) {
    return 0;
  }
  const start = new Date(row.horaInicio);
  const end = new Date(row.horaFin);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }
  const diff = (end.getTime() - start.getTime()) / 60000;
  return diff > 0 ? diff : 0;
}

export function AddScheduleModal({
  event,
  onClose,
  onSaved,
}: AddScheduleModalProps) {
  const toast = useToast();
  const open = event !== null;

  const [rows, setRows] = useState<ScheduleRowState[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<unknown>(null);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    if (!event) {
      setRows([]);
      setRemovedIds([]);
      setLoadError(null);
      setSaveError(null);
      setShowErrors(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    setLoadError(null);
    setRemovedIds([]);

    scheduleService
      .list({ eventoId: event.id, signal: controller.signal })
      .then((result) => {
        const sorted = [...result.items].sort(
          (a, b) => new Date(a.hora_inicio).getTime() - new Date(b.hora_inicio).getTime(),
        );
        setRows(
          sorted.map((s) => ({
            localId: newLocalId(),
            id: s.id,
            actividad: s.actividad,
            descripcion: s.descripcion ?? "",
            horaInicio: toDatetimeLocalValue(s.hora_inicio),
            horaFin: toDatetimeLocalValue(s.hora_fin),
            responsable: s.responsable,
          })),
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
  }, [event]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, saving, onClose]);

  if (!event) {
    return null;
  }

  const eventMin = toDatetimeLocalValue(event.fecha_inicio);
  const eventMax = toDatetimeLocalValue(event.fecha_fin);
  const eventDateOnly = eventMin.split("T")[0];
  const isSingleDay = eventDateOnly === eventMax.split("T")[0];
  const totalMinutes = Math.max(
    0,
    (new Date(event.fecha_fin).getTime() - new Date(event.fecha_inicio).getTime()) / 60000,
  );
  const assignedMinutes = rows.reduce((sum, row) => sum + rowDurationMinutes(row), 0);
  const remainingMinutes = totalMinutes - assignedMinutes;

  const set = (localId: string, field: keyof ScheduleRowState, value: string) => {
    setRows((prev) =>
      prev.map((row) => (row.localId === localId ? { ...row, [field]: value } : row)),
    );
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        localId: newLocalId(),
        actividad: "",
        descripcion: "",
        horaInicio: "",
        horaFin: "",
        responsable: "",
      },
    ]);
  };

  const removeRow = (row: ScheduleRowState) => {
    if (row.id) {
      setRemovedIds((prev) => [...prev, row.id!]);
    }
    setRows((prev) => prev.filter((r) => r.localId !== row.localId));
  };

  const moveRow = (index: number, direction: -1 | 1) => {
    setRows((prev) => {
      const next = [...prev];
      const target = index + direction;
      if (target < 0 || target >= next.length) {
        return prev;
      }
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {};

    for (const row of rows) {
      if (!row.actividad.trim()) {
        errors[row.localId] = "La actividad es obligatoria.";
        continue;
      }
      if (!row.responsable.trim()) {
        errors[row.localId] = "El responsable es obligatorio.";
        continue;
      }
      if (!row.horaInicio || !row.horaFin) {
        errors[row.localId] = "Debes indicar hora de inicio y fin.";
        continue;
      }
      const start = new Date(row.horaInicio);
      const end = new Date(row.horaFin);
      if (end <= start) {
        errors[row.localId] = "La hora de fin debe ser posterior a la de inicio.";
        continue;
      }
      if (
        start < new Date(event.fecha_inicio) ||
        end > new Date(event.fecha_fin)
      ) {
        errors[row.localId] = "El horario debe estar dentro del rango del evento.";
        continue;
      }
    }

    for (let i = 0; i < rows.length; i++) {
      if (errors[rows[i].localId]) {
        continue;
      }
      const a = rows[i];
      const aStart = new Date(a.horaInicio);
      const aEnd = new Date(a.horaFin);
      for (let j = 0; j < rows.length; j++) {
        if (i === j || errors[rows[j].localId]) {
          continue;
        }
        const b = rows[j];
        const bStart = new Date(b.horaInicio);
        const bEnd = new Date(b.horaFin);
        if (aStart < bEnd && aEnd > bStart) {
          errors[a.localId] = "Se solapa con otra actividad del cronograma.";
          break;
        }
      }
    }

    return errors;
  };

  const handleSave = async () => {
    const errors = validate();
    setShowErrors(true);
    if (Object.keys(errors).length > 0) {
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
    if (failures.length === 0) {
      toast.success(
        `El cronograma de "${event.titulo}" fue guardado.`,
        "Cronograma guardado",
      );
      onSaved();
      onClose();
      return;
    }

    setSaveError((failures[0] as PromiseRejectedResult).reason);
    onSaved();
  };

  const disableReorder = rows.length < 2;
  const liveErrors = validate();
  const canSave = !loading && !loadError && Object.keys(liveErrors).length === 0;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !saving && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-schedule-title"
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-xl"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border p-4 sm:p-6">
              <div>
                <h2 id="add-schedule-title" className="text-lg font-medium text-foreground">
                  Cronograma de "{event.titulo}"
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Agrega, edita o elimina las actividades del evento.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !saving && onClose()}
                className="rounded p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="Cerrar"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {saveError ? (
                <div className="mb-4">
                  <ErrorAlert error={saveError} onClose={() => setSaveError(null)} />
                </div>
              ) : null}

              {loading ? (
                <div className="py-10 text-center">
                  <Spinner label="Cargando cronograma…" />
                </div>
              ) : loadError ? (
                <ErrorAlert error={loadError} />
              ) : (
                <>
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">
                      Tiempo asignado:{" "}
                      <span className="font-medium text-foreground">
                        {formatDurationMinutes(assignedMinutes)}
                      </span>
                    </span>
                    <span
                      className={
                        remainingMinutes < 0
                          ? "font-medium text-destructive"
                          : "text-muted-foreground"
                      }
                    >
                      Tiempo restante disponible:{" "}
                      <span className="font-medium">
                        {formatDurationMinutes(remainingMinutes)}
                      </span>
                    </span>
                  </div>

                  <div className="space-y-4">
                    {rows.length === 0 ? (
                      <p className="rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted-foreground">
                        Todavía no hay actividades. Agrega la primera con el
                        botón de abajo.
                      </p>
                    ) : (
                      rows.map((row, index) => (
                        <div
                          key={row.localId}
                          className="rounded-lg border border-border p-4"
                        >
                          <div className="mb-3 flex items-center justify-between gap-2">
                            <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                              Actividad {index + 1}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => moveRow(index, -1)}
                                disabled={disableReorder || index === 0}
                                className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                                aria-label="Mover arriba"
                              >
                                <ChevronUp className="size-4" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => moveRow(index, 1)}
                                disabled={disableReorder || index === rows.length - 1}
                                className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-30"
                                aria-label="Mover abajo"
                              >
                                <ChevronDown className="size-4" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                onClick={() => removeRow(row)}
                                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                                aria-label="Eliminar actividad"
                              >
                                <Trash2 className="size-4" aria-hidden="true" />
                              </button>
                            </div>
                          </div>

                          <div className="space-y-3">
                            <TextField
                              label="Título"
                              name={`actividad-${row.localId}`}
                              required
                              maxLength={ACTIVIDAD_MAX}
                              value={row.actividad}
                              onChange={(e) => set(row.localId, "actividad", e.target.value)}
                            />
                            <TextArea
                              label="Descripción"
                              name={`descripcion-${row.localId}`}
                              rows={2}
                              maxLength={DESCRIPCION_MAX}
                              value={row.descripcion}
                              onChange={(e) => set(row.localId, "descripcion", e.target.value)}
                            />
                            {isSingleDay ? (
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <TimeSelect
                                  label="Hora de inicio"
                                  name={`hora_inicio-${row.localId}`}
                                  value={timePart(row.horaInicio)}
                                  minTime={timePart(eventMin)}
                                  maxTime={timePart(eventMax)}
                                  onChange={(t) =>
                                    set(row.localId, "horaInicio", withTime(eventDateOnly, t))
                                  }
                                />
                                <TimeSelect
                                  label="Hora de fin"
                                  name={`hora_fin-${row.localId}`}
                                  value={timePart(row.horaFin)}
                                  minTime={
                                    row.horaInicio
                                      ? timePart(row.horaInicio)
                                      : timePart(eventMin)
                                  }
                                  maxTime={timePart(eventMax)}
                                  onChange={(t) =>
                                    set(row.localId, "horaFin", withTime(eventDateOnly, t))
                                  }
                                />
                              </div>
                            ) : (
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <TextField
                                  label="Hora de inicio"
                                  name={`hora_inicio-${row.localId}`}
                                  type="datetime-local"
                                  required
                                  min={eventMin}
                                  max={eventMax}
                                  value={row.horaInicio}
                                  onChange={(e) =>
                                    set(row.localId, "horaInicio", e.target.value)
                                  }
                                />
                                <TextField
                                  label="Hora de fin"
                                  name={`hora_fin-${row.localId}`}
                                  type="datetime-local"
                                  required
                                  min={eventMin}
                                  max={eventMax}
                                  value={row.horaFin}
                                  onChange={(e) =>
                                    set(row.localId, "horaFin", e.target.value)
                                  }
                                />
                              </div>
                            )}
                            <TextField
                              label="Responsable"
                              name={`responsable-${row.localId}`}
                              required
                              maxLength={RESPONSABLE_MAX}
                              value={row.responsable}
                              onChange={(e) =>
                                set(row.localId, "responsable", e.target.value)
                              }
                            />
                          </div>

                          {showErrors && liveErrors[row.localId] ? (
                            <p className="mt-2 text-xs font-medium text-destructive">
                              {liveErrors[row.localId]}
                            </p>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={addRow}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-dashed border-border px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5"
                  >
                    <Plus className="size-4" aria-hidden="true" />
                    Agregar actividad
                  </button>
                </>
              )}
            </div>

            <div className="flex justify-end gap-3 border-t border-border p-4 sm:p-6">
              <Button variant="secondary" onClick={onClose} disabled={saving}>
                Cancelar
              </Button>
              <Button onClick={handleSave} loading={saving} disabled={!canSave}>
                Guardar cronograma
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
