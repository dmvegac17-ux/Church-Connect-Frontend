import { ChevronDown, ChevronUp, History } from "lucide-react";
import { useEffect, useState } from "react";

import { Spinner } from "../../../components/feedback/Spinner";
import { isoToWall, shortMoment } from "../../../lib/dateTimeRange";
import { scheduleService } from "../../../services/scheduleService";
import type { ScheduleChange } from "../../../types/schedule";

const VERBS: Record<ScheduleChange["tipo"], string> = {
  creada: "creó",
  editada: "editó",
  eliminada: "eliminó",
};

const moment = (iso: string) => shortMoment(isoToWall(iso));

/** Qué cambió en una edición, campo por campo (antes → después). */
function details(change: ScheduleChange): string[] {
  const { antes, despues } = change;
  if (change.tipo !== "editada" || !antes || !despues) {
    return [];
  }
  const lines: string[] = [];
  if (antes.actividad !== undefined) {
    lines.push(`Nombre: ${antes.actividad} → ${despues.actividad}`);
  }
  if (antes.hora_inicio && despues.hora_inicio) {
    lines.push(`Inicio: ${moment(antes.hora_inicio)} → ${moment(despues.hora_inicio)}`);
  }
  if (antes.hora_fin && despues.hora_fin) {
    lines.push(`Fin: ${moment(antes.hora_fin)} → ${moment(despues.hora_fin)}`);
  }
  if (antes.responsable !== undefined) {
    lines.push(`Responsable: ${antes.responsable} → ${despues.responsable}`);
  }
  if (antes.descripcion !== undefined) {
    lines.push("Cambió la descripción.");
  }
  return lines;
}

/**
 * Historial del cronograma de un evento: quién creó, editó o eliminó cada
 * actividad y cuándo. Se carga al desplegarlo; solo lo ve el administrador.
 */
export function ScheduleHistory({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [changes, setChanges] = useState<ScheduleChange[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }
    const controller = new AbortController();
    setFailed(false);
    scheduleService
      .history(eventId, controller.signal)
      .then(setChanges)
      .catch(() => {
        if (!controller.signal.aborted) {
          setFailed(true);
        }
      });
    return () => controller.abort();
  }, [open, eventId]);

  return (
    <div className="rounded-[14px] border border-border">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-2 rounded-[14px] px-4 py-3 text-left text-sm font-bold text-text-secondary hover:bg-surface-alt"
      >
        <span className="flex items-center gap-2">
          <History className="size-[18px]" aria-hidden="true" />
          Historial de cambios
        </span>
        {open ? (
          <ChevronUp className="size-[18px]" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-[18px]" aria-hidden="true" />
        )}
      </button>
      {open ? (
        <div className="border-t border-divider px-4 py-3 text-sm">
          {failed ? (
            <p className="text-destructive">No se pudo cargar el historial.</p>
          ) : changes === null ? (
            <Spinner label="Cargando historial…" />
          ) : changes.length === 0 ? (
            <p className="text-muted-foreground">
              Aún no hay cambios registrados en este cronograma.
            </p>
          ) : (
            <ol className="flex flex-col gap-2.5">
              {changes.map((change) => (
                <li key={change.id} className="flex flex-col gap-0.5">
                  <span>
                    <strong>{change.autor_nombre}</strong> {VERBS[change.tipo]} «
                    {change.actividad}»
                    <span className="text-muted-foreground"> · {moment(change.fecha)}</span>
                  </span>
                  {details(change).map((line) => (
                    <span key={line} className="pl-3 text-[13px] text-text-secondary">
                      {line}
                    </span>
                  ))}
                </li>
              ))}
            </ol>
          )}
        </div>
      ) : null}
    </div>
  );
}
