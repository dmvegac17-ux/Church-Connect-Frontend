/** Resultado de una búsqueda de dirección. */
export interface GeocodeResult {
  lat: number;
  lon: number;
  /** Nombre completo devuelto por el servicio, para mostrarlo como confirmación. */
  displayName: string;
}

/**
 * Geocodificación (dirección → coordenadas) vía Nominatim (OpenStreetMap),
 * el mismo proveedor usado para los mapas (`EventLocationMap`/`Picker`) —
 * gratis, sin API key, consistente con el resto del proyecto. Soporta CORS
 * desde el navegador (confirmado: responde `access-control-allow-origin: *`
 * cuando la petición trae `Origin`).
 */
export async function geocodeAddress(
  query: string,
  signal?: AbortSignal,
): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) {
    return null;
  }

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(trimmed)}`;
  const response = await fetch(url, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("No se pudo consultar el servicio de mapas.");
  }

  const data: Array<{ lat: string; lon: string; display_name: string }> =
    await response.json();

  if (!Array.isArray(data) || data.length === 0) {
    return null;
  }

  const [first] = data;
  return {
    lat: Number(first.lat),
    lon: Number(first.lon),
    displayName: first.display_name,
  };
}

/** URL para abrir una ubicación (por coordenadas o por texto) en Google Maps. */
export function googleMapsUrl(opts: {
  latitud?: number | null;
  longitud?: number | null;
  query?: string;
}): string {
  if (opts.latitud != null && opts.longitud != null) {
    return `https://www.google.com/maps?q=${opts.latitud},${opts.longitud}`;
  }
  if (opts.query && opts.query.trim()) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(opts.query.trim())}`;
  }
  return "https://www.google.com/maps";
}
