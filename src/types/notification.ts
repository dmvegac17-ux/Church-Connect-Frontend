/**
 * Contratos del módulo de Notificaciones.
 * Reflejan `NotificationResponse` del backend (`/api/v1/notificaciones`).
 */

/** Límite de caracteres del `título` (frontend; validado también contando espacios). */
export const NOTIFICATION_TITULO_MAX_LENGTH = 200;

/** `NotificationResponse` — lo que devuelve la API para una notificación. */
export interface Notification {
  id: string;
  titulo: string;
  mensaje: string;
  /** id del usuario destinatario. */
  usuario_id: string;
  leida: boolean;
  /** ISO datetime. */
  fecha_envio: string;
}

/** Cuerpo de `PUT /notificaciones/{id}` — actualización parcial. `usuario_id` no es modificable. */
export interface UpdateNotificationDTO {
  titulo?: string;
  mensaje?: string;
  leida?: boolean;
}

/** Cuerpo de `POST /notificaciones/masivo`. Misma notificación para varios destinatarios. */
export interface BulkNotificationDTO {
  titulo: string;
  mensaje: string;
  usuarios_ids: string[];
}

/** `meta` del envío masivo: no confundir con `meta.totalNotificaciones` del listado. */
export interface BulkNotificationMeta {
  total: number;
  exitosas: number;
  fallidas: number;
}

/** Resultado ya normalizado de `POST /notificaciones/masivo` (ver `httpClient.postRaw`). */
export interface BulkNotificationResult {
  status: 201 | 207 | 500;
  data: Notification[];
  errors: string[] | null;
  meta: BulkNotificationMeta;
}
