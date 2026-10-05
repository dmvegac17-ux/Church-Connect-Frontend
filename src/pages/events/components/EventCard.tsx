import {
  CalendarClock,
  CalendarPlus,
  ChevronRight,
  Clock,
  MapPin,
  MapPinned,
  Pencil,
  Trash2,
  Users,
} from "lucide-react";
import { Link } from "react-router-dom";

import { formatDate, formatTime } from "../../../lib/format";
import type { Event } from "../../../types/event";

interface EventCardProps {
  event: Event;
  isAdmin: boolean;
  onDelete: (event: Event) => void;
  onAddSchedule: (event: Event) => void;
}

export function EventCard({
  event,
  isAdmin,
  onDelete,
  onAddSchedule,
}: EventCardProps) {
  const hasSchedule = event.total_actividades > 0;

  return (
    <div className="group relative flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md">
      {isAdmin ? (
        <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            onClick={() => onAddSchedule(event)}
            className="rounded p-1.5 text-muted-foreground hover:bg-primary/10 hover:text-primary"
            aria-label={`Añadir cronograma a ${event.titulo}`}
            title="Añadir cronograma"
          >
            <CalendarPlus className="size-4" aria-hidden="true" />
          </button>
          <Link
            to={`/events/${event.id}/editar`}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
            aria-label={`Editar ${event.titulo}`}
          >
            <Pencil className="size-4" aria-hidden="true" />
          </Link>
          <button
            type="button"
            onClick={() => onDelete(event)}
            className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label={`Eliminar ${event.titulo}`}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      ) : null}

      <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <CalendarClock className="size-5" aria-hidden="true" />
      </span>

      <Link
        to={`/events/${event.id}`}
        className="mt-3 text-base font-medium text-foreground hover:text-primary hover:underline"
      >
        {event.titulo}
      </Link>

      <div className="mt-2 flex flex-col gap-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CalendarClock className="size-3.5 shrink-0" aria-hidden="true" />
          {formatDate(event.fecha_inicio)}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="size-3.5 shrink-0" aria-hidden="true" />
          {formatTime(event.fecha_inicio)} – {formatTime(event.fecha_fin)}
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{event.lugar}</span>
          {event.latitud !== null && event.longitud !== null ? (
            <span title="Tiene ubicación en el mapa">
              <MapPinned
                className="size-3.5 shrink-0 text-primary"
                aria-label="Tiene ubicación en el mapa"
              />
            </span>
          ) : null}
        </span>
      </div>

      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
        {event.descripcion?.trim() || "Sin descripción."}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
          <Users className="size-3.5" aria-hidden="true" />
          Capacidad: {event.capacidad}
        </span>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
            hasSchedule
              ? "bg-primary/10 text-primary"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <CalendarPlus className="size-3.5" aria-hidden="true" />
          {hasSchedule
            ? `Cronograma: ${event.total_actividades} actividad${
                event.total_actividades === 1 ? "" : "es"
              }`
            : "Sin cronograma"}
        </span>
      </div>

      <Link
        to={`/events/${event.id}`}
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        Ver detalle
        <ChevronRight className="size-4" aria-hidden="true" />
      </Link>
    </div>
  );
}
