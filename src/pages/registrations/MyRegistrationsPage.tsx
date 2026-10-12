import { CalendarDays, MapPin, Ticket } from "lucide-react";
import { Link } from "react-router-dom";

import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { FullPageSpinner } from "../../components/feedback/Spinner";
import { buttonClass } from "../../components/forms/Button";
import { Card, PageHeader } from "../../components/layout/Page";
import { CapacityChip } from "../../components/registrations/CapacityBits";
import { EnrollmentDialog } from "../../components/registrations/EnrollmentDialog";
import { DateBlock } from "../../components/ui/EventBits";
import { useEnrollment } from "../../hooks/useEnrollment";
import { useFullList } from "../../hooks/useFullList";
import { eventDateInfo, sortEventsForDisplay } from "../../lib/eventDates";
import { plural } from "../../lib/participations";
import { eventService } from "../../services/eventService";

/** Mis inscripciones (vista de miembro): eventos en los que reservó su cupo. */
export function MyRegistrationsPage() {
  const { items, isLoading, error, refetch } = useFullList(eventService.list);
  const enrollment = useEnrollment(refetch);

  // Cada evento ya dice si quien consulta está inscrito.
  const mine = sortEventsForDisplay(items.filter((event) => event.aforo.inscrito));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Mis inscripciones"
        description={
          isLoading || error
            ? undefined
            : mine.length > 0
              ? `Estás inscrito en ${plural(mine.length, "evento", "eventos")}.`
              : "Reserva tu cupo desde el detalle de cada evento."
        }
      />

      {error ? <ErrorAlert error={error} /> : null}

      {isLoading ? (
        <FullPageSpinner label="Cargando tus inscripciones…" />
      ) : error ? null : mine.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 px-5 py-11 text-center">
          <span
            aria-hidden="true"
            className="flex size-12 items-center justify-center rounded-xl bg-primary-soft text-primary"
          >
            <Ticket className="size-[26px]" />
          </span>
          <p className="text-[17px] font-extrabold">
            Aún no estás inscrito en ningún evento
          </p>
          <p className="max-w-[380px] text-[15px] text-muted-foreground">
            Cuando te inscribas en un evento aparecerá aquí, con su fecha y lugar.
          </p>
          <Link to="/events" className={buttonClass("primary", "md", "mt-1.5")}>
            Ver eventos
          </Link>
        </Card>
      ) : (
        <ul className="flex flex-col gap-3.5">
          {mine.map((event) => {
            const info = eventDateInfo(event);
            return (
              <li key={event.id}>
                <Card className="flex flex-wrap items-center gap-4 p-5">
                  <DateBlock info={info} />
                  <div className="flex min-w-[220px] flex-1 flex-col gap-1.5">
                    <span className="text-lg font-extrabold break-words">
                      {event.titulo}
                    </span>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
                      <span className="flex items-center gap-1.5">
                        <CalendarDays className="size-[18px] shrink-0" aria-hidden="true" />
                        {info.dateLong} · {info.timeRange}
                      </span>
                      <span className="flex min-w-0 items-center gap-1.5">
                        <MapPin className="size-[18px] shrink-0" aria-hidden="true" />
                        <span className="break-words">{event.lugar}</span>
                      </span>
                    </div>
                    <CapacityChip event={event} className="h-[26px] self-start text-[13px]" />
                  </div>
                  <div className="flex flex-wrap gap-2.5">
                    <Link
                      to={`/events/${event.id}`}
                      className={buttonClass("secondary")}
                      aria-label={`Ver evento ${event.titulo}`}
                    >
                      Ver evento
                    </Link>
                    {/* Empezado o fuera de plazo, ya no se puede cancelar. */}
                    {event.aforo.cancelacion_cerrada ? null : (
                      <button
                        type="button"
                        onClick={() => enrollment.cancel(event)}
                        aria-label={`Cancelar mi inscripción en ${event.titulo}`}
                        className={buttonClass("dangerOutline")}
                      >
                        Cancelar mi inscripción
                      </button>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}

      <EnrollmentDialog
        event={enrollment.event}
        mode={enrollment.mode}
        busy={enrollment.busy}
        error={enrollment.error}
        onSubmit={enrollment.submit}
        onClose={enrollment.close}
      />
    </div>
  );
}
