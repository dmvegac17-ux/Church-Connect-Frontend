import {
  ANNOUNCEMENT_IMAGE_MAX_BYTES,
  ANNOUNCEMENT_IMAGE_TYPES,
  type Announcement,
} from "../types/announcement";

/* Presentación y validación de anuncios. */

const LOCALE = "es-CO";
const TIME_ZONE = "America/Bogota";

/** "12 oct 2026" */
export function announcementDate(iso: string): string {
  const parts: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).formatToParts(new Date(iso))) {
    parts[p.type] = p.value;
  }
  return `${parts.day} ${parts.month.replace(".", "")} ${parts.year}`;
}

/** "12 oct 2026, 3:40 p. m." */
export function announcementDateTime(iso: string): string {
  const time = new Intl.DateTimeFormat(LOCALE, {
    timeZone: TIME_ZONE,
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
  return `${announcementDate(iso)}, ${time}`;
}

export function authorName(a: Announcement): string {
  return a.publicado_por?.nombre_completo ?? "Usuario eliminado";
}

/** "Publicado por X el …" */
export function publishedLine(a: Announcement): string {
  return `Publicado por ${authorName(a)} el ${announcementDateTime(a.fecha_publicacion)}`;
}

/** "Última actualización por Y el …", o `null` si nunca se editó. */
export function updatedLine(a: Announcement): string | null {
  if (!a.fecha_actualizacion) {
    return null;
  }
  const who = a.actualizado_por?.nombre_completo ?? "Usuario eliminado";
  return `Última actualización por ${who} el ${announcementDateTime(a.fecha_actualizacion)}`;
}

/** Primer tramo del texto, sin cortar palabras. */
export function excerpt(text: string, max = 180): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) {
    return clean;
  }
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

/**
 * Validación previa al envío (la definitiva la hace el servidor leyendo el
 * contenido del archivo). Devuelve el mensaje de error o `null`.
 */
export function imageError(file: File): string | null {
  if (!(ANNOUNCEMENT_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return "Formato no permitido. Usa una imagen JPG, PNG o WebP.";
  }
  if (file.size > ANNOUNCEMENT_IMAGE_MAX_BYTES) {
    return "La imagen supera el tamaño máximo de 5 MB.";
  }
  if (file.size === 0) {
    return "La imagen está vacía.";
  }
  return null;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}
