import { timeRangeLabel } from "../../lib/eventDates";
import { formatDurationMinutes } from "../../lib/format";
import type { Schedule } from "../../types/schedule";

interface ScheduleTimelineProps {
  schedules: Schedule[];
  /** Muestra la duración bajo el horario (vista de administración). */
  showDuration?: boolean;
}

/**
 * Cronograma de un evento como lista ordenada por hora: horario a la
 * izquierda, actividad y responsable a la derecha. En pantallas estrechas
 * las dos columnas se apilan, sin scroll horizontal.
 */
export function ScheduleTimeline({
  schedules,
  showDuration = false,
}: ScheduleTimelineProps) {
  const sorted = [...schedules].sort(
    (a, b) =>
      new Date(a.hora_inicio).getTime() - new Date(b.hora_inicio).getTime(),
  );

  return (
    <ol>
      {sorted.map((s) => {
        const minutes =
          (new Date(s.hora_fin).getTime() - new Date(s.hora_inicio).getTime()) /
          60000;
        return (
          <li
            key={s.id}
            className="grid grid-cols-1 gap-x-5 gap-y-1 border-t border-divider-soft px-5 py-4 first:border-t-0 sm:grid-cols-[minmax(120px,170px)_minmax(0,1fr)]"
          >
            <span className="flex flex-col">
              <span className="text-sm font-bold text-primary">
                {timeRangeLabel(s.hora_inicio, s.hora_fin)}
              </span>
              {showDuration && minutes > 0 ? (
                <span className="text-xs text-muted-foreground">
                  {formatDurationMinutes(minutes)}
                </span>
              ) : null}
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-[15px] font-bold break-words text-foreground">
                {s.actividad}
              </span>
              {s.descripcion ? (
                <span className="text-sm text-text-secondary">
                  {s.descripcion}
                </span>
              ) : null}
              <span className="text-sm text-muted-foreground">
                Responsable: {s.responsable}
              </span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
