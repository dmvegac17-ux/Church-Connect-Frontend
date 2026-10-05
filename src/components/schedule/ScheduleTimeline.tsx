import { formatTime } from "../../lib/format";
import type { Schedule } from "../../types/schedule";

interface ScheduleTimelineProps {
  schedules: Schedule[];
}

/**
 * Línea de tiempo de las actividades de un cronograma. Horizontal en
 * pantallas ≥ `sm` (línea conectora sobre los puntos), vertical en móvil
 * (línea conectora a la izquierda), para que el usuario final pueda ver la
 * secuencia sin solapamiento de texto ni scroll horizontal de página.
 */
export function ScheduleTimeline({ schedules }: ScheduleTimelineProps) {
  const sorted = [...schedules].sort(
    (a, b) => new Date(a.hora_inicio).getTime() - new Date(b.hora_inicio).getTime(),
  );

  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:gap-4 sm:overflow-x-auto sm:pb-2">
      {sorted.map((s, index) => (
        <div
          key={s.id}
          className="relative flex gap-3 sm:min-w-[220px] sm:flex-1 sm:flex-col sm:gap-0"
        >
          <div className="flex flex-col items-center sm:w-full sm:flex-row">
            <span
              className="size-3 shrink-0 rounded-full border-2 border-primary bg-card"
              aria-hidden="true"
            />
            {index < sorted.length - 1 ? (
              <span
                className="mt-1 w-px flex-1 bg-border sm:ml-1 sm:mt-0 sm:h-px sm:w-full sm:flex-1"
                aria-hidden="true"
              />
            ) : null}
          </div>

          <div className="min-w-0 flex-1 pb-2 sm:pt-3">
            <p className="text-xs font-medium text-primary">
              {formatTime(s.hora_inicio)} – {formatTime(s.hora_fin)}
            </p>
            <p className="mt-0.5 break-words font-medium text-foreground">
              {s.actividad}
            </p>
            {s.descripcion ? (
              <p className="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                {s.descripcion}
              </p>
            ) : null}
            <span className="mt-1.5 inline-flex max-w-full items-center truncate rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {s.responsable}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
