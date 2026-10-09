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

/** Una sugerencia del autocompletado de direcciones. */
export interface AddressSuggestion extends GeocodeResult {
  /** Clave estable para listas (`osm_type` + `osm_id`). */
  id: string;
}

/** Mismo centro por defecto que `EventLocationPicker` (Bogotá, Colombia). */
const DEFAULT_BIAS = { lat: 4.6097, lon: -74.0817 };

interface PhotonFeature {
  geometry: { coordinates: [number, number] };
  properties: {
    osm_type?: string;
    osm_id?: number;
    name?: string;
    street?: string;
    housenumber?: string;
    locality?: string;
    district?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

function photonLabel(p: PhotonFeature["properties"]): string {
  const street = p.street
    ? p.housenumber
      ? `${p.street} ${p.housenumber}`
      : p.street
    : undefined;
  const parts = [p.name, street, p.locality, p.district, p.city, p.state, p.country];
  // Photon repite valores (p. ej. ciudad = estado); se dejan una sola vez.
  return parts
    .filter((part, i): part is string => !!part && parts.indexOf(part) === i)
    .join(", ");
}

/**
 * Autocompletado de direcciones (sugerencias mientras se escribe) vía Photon
 * (komoot), un geocodificador sobre datos de OpenStreetMap pensado para
 * "search-as-you-type" — gratis y sin API key. No se usa Nominatim aquí
 * porque su política de uso prohíbe el autocompletado; Nominatim queda solo
 * para la búsqueda puntual de `geocodeAddress`.
 *
 * `bias` prioriza resultados cercanos a ese punto (no los filtra).
 */
export async function searchAddressSuggestions(
  query: string,
  opts: {
    signal?: AbortSignal;
    bias?: { lat: number; lon: number } | null;
    limit?: number;
  } = {},
): Promise<AddressSuggestion[]> {
  // El "#" de las direcciones colombianas ("Calle 12 #34-56") no existe en
  // los datos de OSM (calle "Calle 12", número "34-56") y estorba la búsqueda.
  const cleaned = query.replace(/#/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return [];
  }

  const bias = opts.bias ?? DEFAULT_BIAS;
  const params = new URLSearchParams({
    q: cleaned,
    limit: String(opts.limit ?? 5),
    lat: String(bias.lat),
    lon: String(bias.lon),
  });
  const response = await fetch(`https://photon.komoot.io/api/?${params}`, {
    signal: opts.signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error("No se pudo consultar el servicio de mapas.");
  }

  const data: { features?: PhotonFeature[] } = await response.json();
  const seen = new Set<string>();
  const suggestions: AddressSuggestion[] = [];
  for (const feature of data.features ?? []) {
    const [lon, lat] = feature.geometry.coordinates;
    const displayName = photonLabel(feature.properties);
    if (!displayName || seen.has(displayName)) {
      continue;
    }
    seen.add(displayName);
    suggestions.push({
      id: `${feature.properties.osm_type ?? ""}${feature.properties.osm_id ?? displayName}`,
      lat,
      lon,
      displayName,
    });
  }
  return suggestions;
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
