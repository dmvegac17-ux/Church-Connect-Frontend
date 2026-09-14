/**
 * Contratos del módulo de Ministerios.
 * Reflejan `MinistryResponse` / `MinistryMemberResponse` del backend
 * (ver `docs/PROMPT-integracion-frontend-ministries.md`).
 */

/** `MinistryResponse` — lo que devuelve la API para un ministerio. */
export interface Ministry {
  id: string;
  nombre: string;
  descripcion: string | null;
}

/** `MinistryMemberResponse` — vista reducida de un usuario dentro de un ministerio. */
export interface MinistryMember {
  /** id del usuario. */
  id: string;
  nombre: string;
  apellido: string | null;
  correo: string;
}

/** Cuerpo de `POST /ministries`. */
export interface CreateMinistryDTO {
  nombre: string;
  descripcion?: string | null;
}

/** Cuerpo de `PUT /ministries/{id}` — actualización parcial. */
export interface UpdateMinistryDTO {
  nombre?: string;
  descripcion?: string | null;
}

/** Longitud máxima que acepta el backend para `nombre` (1–255). */
export const MINISTRY_NAME_MAX = 255;
