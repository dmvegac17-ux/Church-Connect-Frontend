import { useEffect, useRef, type RefObject } from "react";
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";

import { fixLeafletDefaultIcon } from "../../lib/leafletIcon";

interface EventLocationPickerProps {
  latitud: number | null;
  longitud: number | null;
  onChange: (latitud: number, longitud: number) => void;
  className?: string;
}

/** Centro por defecto cuando todavía no hay coordenadas (Bogotá, Colombia). */
const DEFAULT_CENTER: [number, number] = [4.6097, -74.0817];

function ClickToSetMarker({
  onChange,
}: {
  onChange: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onChange(
        Math.round(e.latlng.lat * 1e6) / 1e6,
        Math.round(e.latlng.lng * 1e6) / 1e6,
      );
    },
  });
  return null;
}

/**
 * `MapContainer` solo lee `center`/`zoom` al montarse: cuando las coordenadas
 * cambian desde fuera (sugerencia elegida, geocodificación, inputs) hay que
 * mover la vista a mano. Los clics en el mapa no la mueven.
 */
function RecenterOnChange({
  latitud,
  longitud,
  lastClick,
}: {
  latitud: number | null;
  longitud: number | null;
  lastClick: RefObject<string | null>;
}) {
  const map = useMap();
  useEffect(() => {
    if (latitud === null || longitud === null) {
      return;
    }
    if (lastClick.current === `${latitud},${longitud}`) {
      return;
    }
    map.setView([latitud, longitud], Math.max(map.getZoom(), 15));
  }, [latitud, longitud, lastClick, map]);
  return null;
}

/**
 * Mapa editable: un clic fija el marcador y reporta las coordenadas
 * (redondeadas a 6 decimales, igual precisión que la columna `NUMERIC(9,6)`
 * del backend). Usado en `EventForm` para fijar la ubicación del evento.
 */
export function EventLocationPicker({
  latitud,
  longitud,
  onChange,
  className = "h-64 w-full",
}: EventLocationPickerProps) {
  useEffect(() => {
    fixLeafletDefaultIcon();
  }, []);

  const lastClick = useRef<string | null>(null);

  const hasPosition = latitud !== null && longitud !== null;
  const center: [number, number] = hasPosition
    ? [latitud, longitud]
    : DEFAULT_CENTER;

  return (
    <div className={`isolate overflow-hidden rounded-xl border border-border ${className}`}>
      <MapContainer
        center={center}
        zoom={hasPosition ? 15 : 6}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />
        <ClickToSetMarker
          onChange={(lat, lng) => {
            lastClick.current = `${lat},${lng}`;
            onChange(lat, lng);
          }}
        />
        <RecenterOnChange
          latitud={latitud}
          longitud={longitud}
          lastClick={lastClick}
        />
        {hasPosition ? <Marker position={[latitud, longitud]} /> : null}
      </MapContainer>
    </div>
  );
}
