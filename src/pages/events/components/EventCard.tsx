import { Clock, MapPin, Users } from "lucide-react";
import { Link } from "react-router-dom";

import {
  DateBlock,
  EventStatusPill,
  ScheduleCountPill,
} from "../../../components/ui/EventBits";
import { Pill } from "../../../components/ui/primitives";
import { eventDateInfo } from "../../../lib/eventDates";
import type { Event } from "../../../types/event";

/** Tarjeta de evento de la vista de miembro: toda la tarjeta abre el detalle. */
export function EventCard({ event }: { event: Event }) {
  const info = eventDateInfo(event);

  return (
    <Link
      to={`/events/${event.id}`}
      className="flex h-full gap-4 rounded-2xl border border-border bg-card p-5 text-foreground transition hover:border-[#B9CDBE] hover:shadow-card-hover"
    >
      <span className="self-start">
        <DateBlock info={info} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-2">
        <span className="flex items-start justify-between gap-2">
          <span className="text-lg leading-[1.3] font-extrabold break-words">
            {event.titulo}
          </span>
          <EventStatusPill info={info} />
        </span>
        <span className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
          <span className="flex items-center gap-1.5">
            <Clock className="size-[18px] shrink-0" aria-hidden="true" />
            {info.isMultiDay ? info.dateLong : info.timeRange}
          </span>
          <span className="flex min-w-0 items-center gap-1.5">
            <MapPin className="size-[18px] shrink-0" aria-hidden="true" />
            <span className="truncate">{event.lugar}</span>
          </span>
        </span>
        <span className="line-clamp-2 text-sm leading-normal text-muted-foreground">
          {event.descripcion?.trim() || "Sin descripción."}
        </span>
        <span className="mt-0.5 flex flex-wrap gap-2">
          <Pill tone="sand" icon={Users} className="!h-7 !text-[13px]">
            Capacidad: {event.capacidad}
          </Pill>
          <ScheduleCountPill count={event.total_actividades} prefix />
        </span>
      </span>
    </Link>
  );
}
