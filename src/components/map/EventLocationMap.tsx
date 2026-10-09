import { ExternalLink } from "lucide-react";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

import { googleMapsUrl } from "../../lib/geocoding";
import { fixLeafletDefaultIcon } from "../../lib/leafletIcon";

interface EventLocationMapProps {
  latitud: number;
  longitud: number;
  /** Para el `title`/`alt` del marcador. */
  label?: string;
  className?: string;
}

/**
 * Mapa de solo lectura con un marcador en `(latitud, longitud)`. El
 * llamador decide si renderizarlo (criterio: sin coordenadas, no se
 * muestra ningún mapa).
 */
export function EventLocationMap({
  latitud,
  longitud,
  label,
  className = "h-48 w-full",
}: EventLocationMapProps) {
  useEffect(() => {
    fixLeafletDefaultIcon();
  }, []);

  return (
    <div className="flex flex-col gap-1.5">
      <div className={`isolate overflow-hidden rounded-xl border border-border ${className}`}>
        <MapContainer
          center={[latitud, longitud]}
          zoom={15}
          scrollWheelZoom={false}
          dragging={false}
          doubleClickZoom={false}
          touchZoom={false}
          style={{ height: "100%", width: "100%" }}
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <Marker position={[latitud, longitud]} alt={label} />
        </MapContainer>
      </div>
      <a
        href={googleMapsUrl({ latitud, longitud })}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 self-start text-sm font-bold text-primary hover:underline"
      >
        Abrir en Google Maps
        <ExternalLink className="size-4" aria-hidden="true" />
        <span className="sr-only">(se abre en una pestaña nueva)</span>
      </a>
    </div>
  );
}
