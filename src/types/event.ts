import type { ActivityAdjustment } from "../lib/eventReschedule";
/**
 * Contratos del módulo de Eventos.
 * Reflejan `EventResponse` del backend (`/api/v1/events`).
 */

/**
 * Ocupación del evento y situación de quien consulta.
 *
 * El miembro solo recibe su cupo (aforo menos participantes) y los
 * disponibles: las cifras internas llegan en `null`.
 */
export interface EventCapacity {
  /** Aforo total menos participantes. */
  cupo_publico: number;
  /** Lugares libres para público; nunca negativo. */
  disponibles: number;
  /** Solo administrador. */
  participantes: number | null;
  publico: number | null;
  ocupados: number | null;
  sobrecupo: number | null;
  inscrito: boolean;
  inscripcion_id: string | null;
  participa: boolean;
  /** Su participación vigente reemplazó una inscripción como público. */
  inscripcion_reemplazada: boolean;
  /**
   * Quien consulta ya no puede inscribirse: el evento empezó o, para el
   * público, pasó la fecha límite de inscripción.
   */
  inscripciones_cerradas: boolean;
  /**
   * Quien consulta ya no puede cancelar su inscripción: pasó el límite de
   * días o el evento empezó. Para un administrador siempre es `false`.
   */
  cancelacion_cerrada: boolean;
}

/** `EventResponse` — lo que devuelve la API para un evento. */
export interface Event {
  id: string;
  /** Sube con cada cambio del evento o de su cronograma (edición concurrente). */
  version: number;
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
  /**
   * Aforo total para el administrador. Para el miembro es su cupo: nunca ve
   * el aforo total ni el número de participantes.
   */
  capacidad: number;
  /** Hasta cuándo se inscribe el público. `null`: hasta que el evento empiece. */
  fecha_limite_inscripcion: string | null;
  /** Días antes del inicio en que se cierra la cancelación. `null`: sin límite. */
  dias_limite_cancelacion: number | null;
  /** Calculada por el backend: inicio menos `dias_limite_cancelacion`. */
  fecha_limite_cancelacion: string;
  aforo: EventCapacity;
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
  fecha_limite_inscripcion?: string | null;
  dias_limite_cancelacion?: number | null;
}

/** Cuerpo de `PUT /events/{id}` — actualización parcial. */
export interface UpdateEventDTO {
  /** Ajustes del cronograma que se guardan con el evento (todo o nada). */
  actividades?: ActivityAdjustment[];
  /** Versión que cargó el formulario: `409` si ya no es la vigente. */
  version?: number;
  titulo?: string;
  descripcion?: string;
  fecha_inicio?: string;
  fecha_fin?: string;
  lugar?: string;
  direccion?: string | null;
  latitud?: number | null;
  longitud?: number | null;
  capacidad?: number;
  /** `null` quita el límite. */
  fecha_limite_inscripcion?: string | null;
  dias_limite_cancelacion?: number | null;
}
