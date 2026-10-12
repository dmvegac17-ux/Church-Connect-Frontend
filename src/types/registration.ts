/**
 * Contratos del módulo de Inscripciones (público de un evento).
 * Reflejan `/api/v1/registrations`.
 */

interface PersonRef {
  id: string;
  nombre_completo: string;
  correo: string;
}

/** `RegistrationResponse`. */
export interface Registration {
  id: string;
  usuario_id: string;
  evento_id: string;
  /** ISO datetime. */
  fecha_inscripcion: string;
  /** Administrador que hizo la inscripción; `null` si se inscribió la persona. */
  inscrito_por: string | null;
  nota: string | null;
  usuario: PersonRef | null;
  inscrito_por_usuario: PersonRef | null;
  /** Solo al inscribir: cupos que quedan para público después de hacerlo. */
  cupos_disponibles: number | null;
}

/** Motivo de un `409` al inscribir o cancelar (`data.codigo`). */
export type RegistrationConflict =
  | "sin_cupos"
  | "ya_inscrito"
  | "es_participante"
  | "inscripciones_cerradas"
  | "cancelacion_cerrada";

/** Cuerpo de `POST /registrations` cuando inscribe un administrador. */
export interface AdminRegistrationDTO {
  evento_id: string;
  usuario_id: string;
  nota?: string;
}

export const REGISTRATION_NOTE_MAX = 200;
