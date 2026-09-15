/**
 * Contratos del módulo de Notificaciones.
 * Reflejan `NotificationResponse` del backend (`/api/v1/notificaciones`).
 */

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

/** Cuerpo de `POST /notificaciones`. Siempre se crea con `leida: false`. */
export interface CreateNotificationDTO {
  titulo: string;
  mensaje: string;
  usuario_id: string;
}

/** Cuerpo de `PUT /notificaciones/{id}` — actualización parcial. `usuario_id` no es modificable. */
export interface UpdateNotificationDTO {
  titulo?: string;
  mensaje?: string;
  leida?: boolean;
}
