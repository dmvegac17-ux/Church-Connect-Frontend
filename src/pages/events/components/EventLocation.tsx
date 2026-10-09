import { ExternalLink } from "lucide-react";
import { lazy, Suspense } from "react";

import { Spinner } from "../../../components/feedback/Spinner";
import { googleMapsUrl } from "../../../lib/geocoding";
import type { Event } from "../../../types/event";

/** Leaflet pesa ~150KB — se carga en un chunk separado, no en el bundle principal. */
const EventLocationMap = lazy(() =>
  import("../../../components/map/EventLocationMap").then((m) => ({
    default: m.EventLocationMap,
  })),
);

/**
 * Mapa del evento (si tiene coordenadas) y enlace a Google Maps. Sin
 * coordenadas, el enlace busca por dirección o nombre del lugar.
 */
export function EventLocation({ event }: { event: Event }) {
  const hasCoords = event.latitud !== null && event.longitud !== null;

  if (hasCoords) {
    return (
      <Suspense
        fallback={
          <div className="flex h-[200px] w-full items-center justify-center rounded-xl border border-border text-muted-foreground">
            <Spinner label="Cargando mapa…" />
          </div>
        }
      >
        <EventLocationMap
          latitud={event.latitud as number}
          longitud={event.longitud as number}
          label={event.lugar}
          className="h-[200px] w-full"
        />
      </Suspense>
    );
  }

  return (
    <a
      href={googleMapsUrl({
        latitud: null,
        longitud: null,
        query: event.direccion?.trim() || event.lugar,
      })}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 self-start text-sm font-bold text-primary hover:underline"
    >
      Abrir en Google Maps
      <ExternalLink className="size-4" aria-hidden="true" />
      <span className="sr-only">(se abre en una pestaña nueva)</span>
    </a>
  );
}
