/**
 * Contratos del módulo de Participaciones (invitaciones a actividades).
 * Reflejan `/api/v1/participante/*` y `/api/v1/admin/participaciones*`.
 */
import type { UserRole } from "./user";

export type ResponseStatus =
  | "pendiente"
  | "aceptada"
  | "rechazada"
  | "vencida"
  | "cancelada"
  | "reasignada"
  | "revocada";

/** `autoasignada`: el administrador se asignó a sí mismo; no hubo correo. */
export type DeliveryStatus = "en_cola" | "enviada" | "error" | "autoasignada";

interface EventRef {
  id: string;
  nombre: string;
}

interface ActivityRef {
  id: string;
  nombre: string;
  /** Fecha de la actividad en America/Bogota (`YYYY-MM-DD`). */
  fecha: string;
  /** ISO datetime. */
  hora_inicio: string;
  /** ISO datetime. */
  hora_fin: string;
}

interface PersonRef {
  id: string;
  nombre_completo: string;
}

/* ── Participante ─────────────────────────────────────────────────────── */

export type InvitationView = "pendientes" | "respondidas" | "todas";

/** Invitación propia: sin datos de envío ni información administrativa. */
export interface Invitation {
  id: string;
  /** Nunca `reasignada`: el participante ve su propio desenlace. */
  estado_respuesta: Exclude<ResponseStatus, "reasignada">;
  fecha_invitacion: string;
  fecha_limite_respuesta: string | null;
  fecha_respuesta: string | null;
  fecha_revocacion: string | null;
  motivo_rechazo: string | null;
  /** Se asignó a sí mismo: nadie lo invitó ni hay plazo de respuesta. */
  autoasignada: boolean;
  /** Estaba confirmada y la actividad cambió: `pendiente` hasta reconfirmar. */
  por_reconfirmar: boolean;
  /** Lo que había confirmado; lo nuevo es `actividad`. */
  cambio: {
    antes: { actividad: string; hora_inicio: string; hora_fin: string };
  } | null;
  evento: EventRef;
  actividad: ActivityRef & { lugar: string; descripcion: string | null };
  /** Quién hizo la invitación y su ministerio. */
  responsable: { nombre: string; area: string | null } | null;
}

export interface InvitationList {
  conteos: Record<InvitationView, number>;
  items: Invitation[];
}

/* ── Administrador ────────────────────────────────────────────────────── */

export type ParticipationFilter =
  | "todas"
  | "pendientes"
  | "aceptadas"
  | "por_reasignar"
  | "error_envio";

export type ParticipationAction =
  | "reenviar"
  | "cancelar"
  | "reasignar"
  | "revocar_y_cambiar";

export interface Participation {
  id: string;
  actividad: ActivityRef;
  evento: EventRef;
  participante: PersonRef;
  estado_envio: DeliveryStatus;
  fecha_envio: string | null;
  intentos_envio: number;
  ultimo_error_envio: string | null;
  estado_respuesta: ResponseStatus;
  /** `pendiente` porque la actividad cambió después de confirmada. */
  por_reconfirmar: boolean;
  /** Estado que tenía antes de pasar a `reasignada`. */
  estado_previo: ResponseStatus | null;
  fecha_respuesta: string | null;
  fecha_limite_respuesta: string | null;
  motivo_rechazo: string | null;
  notificacion_revocacion_estado: "enviada" | "error" | null;
  requiere_reasignacion: boolean;
  /** Lo calcula el backend: la interfaz solo pinta lo que venga aquí. */
  acciones_permitidas: ParticipationAction[];
  reemplazo: {
    participante: PersonRef;
    fecha_limite_respuesta: string | null;
  } | null;
}

export interface ParticipationList {
  conteos: Record<ParticipationFilter, number>;
  alertas: {
    actividades_por_reasignar: number;
    invitaciones_error_envio: number;
  };
  items: Participation[];
  /** Total del filtro activo (para paginar). */
  total: number;
}

export interface ReassignmentInfo {
  modo: "reasignar" | "revocar";
  actividad: ActivityRef;
  evento: EventRef;
  asignado_actual: PersonRef;
  motivo_liberacion: "rechazo" | "sin_respuesta" | "cancelada" | "aceptada";
  /** La asignación vigente es propia del administrador que se la dio. */
  autoasignada: boolean;
  motivo_rechazo: string | null;
  dias_hasta_evento: number;
  dias_para_confirmar_max: number;
}

export interface EligibleParticipant {
  id: string;
  nombre_completo: string;
  correo: string;
  rol: UserRole;
  /** Tiene otra actividad activa que se cruza en horario (no lo excluye). */
  cruce_horario: boolean;
  /** Está inscrito como público en el evento: la inscripción se reemplazará. */
  inscrito: boolean;
  /** Ya participa en otra actividad del evento: no ocupa un lugar más. */
  participa: boolean;
}

export interface ReplacementDTO {
  participante_id: string;
  /** Se omite cuando el administrador se asigna a sí mismo. */
  dias_para_confirmar?: number;
}

export interface ReplacementResult {
  original: Participation;
  nueva: Participation;
}
