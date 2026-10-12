/**
 * Contratos del módulo de Cronogramas.
 * Reflejan `ScheduleResponse` del backend (`/api/v1/schedules`).
 */

/** `ScheduleResponse` — lo que devuelve la API para un cronograma. */
export interface Schedule {
  id: string;
  evento_id: string;
  actividad: string;
  /** ISO datetime. */
  hora_inicio: string;
  /** ISO datetime. */
  hora_fin: string;
  responsable: string;
  /** Usuario con la invitación activa de la actividad, si la hay. */
  responsable_id?: string | null;
  /**
   * Solo para miembros: `false` si `responsable` es un texto de «pendiente»
   * porque nadie confirmó todavía (el nombre no se expone hasta entonces).
   */
  responsable_confirmado?: boolean | null;
  /**
   * Solo para el administrador: en qué está el responsable (`confirmado`,
   * `pendiente`, `por_reconfirmar`, `rechazado`, `sin_respuesta`,
   * `sin_asignar`) o `fuera_de_rango`.
   */
  estado?: string | null;
  descripcion: string | null;
}

/** Valores de una actividad en el historial: solo los campos que cambiaron. */
export interface ScheduleChangeValues {
  actividad?: string;
  hora_inicio?: string;
  hora_fin?: string;
  descripcion?: string | null;
  responsable?: string;
}

/** Una entrada del historial del cronograma (`GET /schedules/historial`). */
export interface ScheduleChange {
  id: string;
  actividad_id: string | null;
  actividad: string;
  tipo: "creada" | "editada" | "eliminada";
  antes: ScheduleChangeValues | null;
  despues: ScheduleChangeValues | null;
  autor_nombre: string;
  /** ISO datetime. */
  fecha: string;
}

/** Cuerpo de `POST /schedules`. */
export interface CreateScheduleDTO {
  evento_id: string;
  actividad: string;
  hora_inicio: string;
  hora_fin: string;
  responsable: string;
  descripcion?: string | null;
}

/**
 * Cuerpo de `PUT /schedules/{id}` — actualización parcial.
 * `evento_id` no es modificable: si el cronograma pertenece a otro evento,
 * debe eliminarse y crearse de nuevo.
 */
export interface UpdateScheduleDTO {
  actividad?: string;
  hora_inicio?: string;
  hora_fin?: string;
  responsable?: string;
  descripcion?: string | null;
}
