import { httpClient, readMetaTotal } from "../lib/httpClient";
import type {
  BulkNotificationDTO,
  BulkNotificationMeta,
  BulkNotificationResult,
  Notification,
  UpdateNotificationDTO,
} from "../types/notification";

const BASE = "/notificaciones";

/** Máximo de notificaciones por petición al marcarlas por lotes. Igual que en el backend. */
export const MARK_BATCH_MAX = 500;

export interface PageParams {
  limit?: number;
  offset?: number;
  /**
   * `propias` (por defecto): solo las del usuario autenticado.
   * `todas`: las de todos los usuarios; el backend solo lo permite a ADMIN (`403` si no).
   */
  alcance?: "propias" | "todas";
  signal?: AbortSignal;
}

export interface Paginated<T> {
  items: T[];
  /** Total real desde `meta.totalNotificaciones`, independiente de `limit`. */
  total: number;
}

/** `GET /notificaciones` — cualquier usuario autenticado. Paginación server-side. */
async function list({
  limit = 10,
  offset = 0,
  alcance,
  signal,
}: PageParams = {}): Promise<Paginated<Notification>> {
  const { data, meta } = await httpClient.get<Notification[]>(BASE, {
    query: { limit, offset, alcance },
    signal,
  });
  return {
    items: data ?? [],
    total: readMetaTotal(meta, "totalNotificaciones"),
  };
}

/** `GET /notificaciones/{id}` — cualquier usuario autenticado. `404` si no existe. */
async function getById(
  id: string,
  signal?: AbortSignal,
): Promise<Notification> {
  const { data } = await httpClient.get<Notification>(`${BASE}/${id}`, {
    signal,
  });
  return data;
}

/**
 * `PUT /notificaciones/{id}` — ADMIN puede editar cualquier notificación por
 * completo; el dueño solo puede marcar/desmarcar `leida` (enviar `titulo` o
 * `mensaje` sin ser ADMIN devuelve `403`). `usuario_id` no se puede modificar.
 */
async function update(
  id: string,
  dto: UpdateNotificationDTO,
): Promise<Notification> {
  const { data } = await httpClient.put<Notification>(`${BASE}/${id}`, dto);
  return data;
}

/** `DELETE /notificaciones/{id}` — solo ADMIN. */
async function remove(id: string): Promise<void> {
  await httpClient.delete<null>(`${BASE}/${id}`);
}

function readBulkMeta(meta: Record<string, unknown> | null): BulkNotificationMeta {
  return {
    total: readMetaTotal(meta, "total"),
    exitosas: readMetaTotal(meta, "exitosas"),
    fallidas: readMetaTotal(meta, "fallidas"),
  };
}

/**
 * `POST /notificaciones/masivo` — solo ADMIN. A diferencia del resto de
 * métodos, no lanza `ApiError` para `201/207/500`: esos tres traen un
 * `ResponsePayload` de dominio válido y la UI decide el toast según el
 * `status` devuelto (ver `httpClient.postRaw`).
 */
async function createBulk(
  dto: BulkNotificationDTO,
): Promise<BulkNotificationResult> {
  const raw = await httpClient.postRaw<Notification[]>(`${BASE}/masivo`, dto);
  return {
    status: raw.status as BulkNotificationResult["status"],
    data: raw.data ?? [],
    errors: raw.errors,
    meta: readBulkMeta(raw.meta),
  };
}

/**
 * `PUT /notificaciones/leidas` — marca varias notificaciones propias con una
 * sola petición (y una sola sentencia en la base). Todo o nada: `403` si
 * algún id no es propio. Máximo 500 por petición.
 */
async function markRead(ids: string[], leida: boolean): Promise<number> {
  // El servidor acepta hasta `MARK_BATCH_MAX` ids por petición: si hay más,
  // se envían en tandas para que nunca llegue a rechazarlo.
  let updated = 0;
  for (let start = 0; start < ids.length; start += MARK_BATCH_MAX) {
    const { data } = await httpClient.put<{ actualizadas: number }>(
      `${BASE}/leidas`,
      { ids: ids.slice(start, start + MARK_BATCH_MAX), leida },
    );
    updated += data.actualizadas;
  }
  return updated;
}

/** `PUT /notificaciones/leidas/todas` — todas las propias sin leer, sin enviar ids. */
async function markAllRead(): Promise<number> {
  const { data } = await httpClient.put<{ actualizadas: number }>(
    `${BASE}/leidas/todas`,
  );
  return data.actualizadas;
}

/** `GET /notificaciones/no-leidas` — solo el número, sin traer la bandeja. */
async function unreadCount(signal?: AbortSignal): Promise<number> {
  const { data } = await httpClient.get<{ total: number }>(`${BASE}/no-leidas`, {
    signal,
  });
  return data.total;
}

export const notificationService = {
  list,
  markRead,
  markAllRead,
  unreadCount,
  getById,
  createBulk,
  update,
  remove,
};
