/**
 * Contratos del módulo de Anuncios (`/api/v1/announcements`): avisos
 * generales tipo cartelera, visibles para cualquier persona con sesión.
 */

export const ANNOUNCEMENT_TITLE_MAX = 150;
export const ANNOUNCEMENT_CONTENT_MAX = 5000;
/** Mismo límite que valida el backend. */
export const ANNOUNCEMENT_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
export const ANNOUNCEMENT_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export interface AnnouncementPerson {
  id: string;
  nombre_completo: string;
}

export interface Announcement {
  id: string;
  titulo: string;
  contenido: string;
  imagen_url: string | null;
  /** `null` si la cuenta de quien publicó ya no existe. */
  publicado_por: AnnouncementPerson | null;
  fecha_publicacion: string;
  actualizado_por: AnnouncementPerson | null;
  /** `null` si nunca se editó. */
  fecha_actualizacion: string | null;
}

/** Lo que el formulario envía. Autor y editor los pone el servidor. */
export interface AnnouncementDraft {
  titulo: string;
  contenido: string;
  /** Archivo nuevo (crear o reemplazar). */
  imagen?: File | null;
  /** Solo al editar: quitar la imagen actual. */
  quitarImagen?: boolean;
}
