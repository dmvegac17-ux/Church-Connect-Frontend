/**
 * Contratos del módulo de Eventos.
 * Reflejan `EventResponse` del backend (`/api/v1/events`).
 */

/** `EventResponse` — lo que devuelve la API para un evento. */
export interface Event {
  id: string;
  titulo: string;
  descripcion: string;
  /** ISO datetime. */
  fecha_inicio: string;
  /** ISO datetime. */
  fecha_fin: string;
  lugar: string;
  /** Dirección en texto libre, opcional (independiente del nombre del lugar). */
  direccion: string | null;
  latitud: number | null;
  longitud: number | null;
  capacidad: number;
  /** id del usuario que creó el evento (asignado por el backend). */
  creado_por: string;
  /** Cantidad de actividades del cronograma asociadas a este evento. */
  total_actividades: number;
}

/** Cuerpo de `POST /events`. `creado_por` lo asigna el backend a partir del token. */
export interface CreateEventDTO {
  titulo: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  lugar: string;
  direccion?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  capacidad: number;
}

/** Cuerpo de `PUT /events/{id}` — actualización parcial. */
export interface UpdateEventDTO {
  titulo?: string;
  descripcion?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  lugar?: string;
  direccion?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  capacidad?: number;
}
