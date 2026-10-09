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
  descripcion: string | null;
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
