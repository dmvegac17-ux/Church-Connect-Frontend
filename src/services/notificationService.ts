import { httpClient, readMetaTotal } from "../lib/httpClient";
import type {
  BulkNotificationDTO,
  BulkNotificationMeta,
  BulkNotificationResult,
  Notification,
  UpdateNotificationDTO,
} from "../types/notification";

const BASE = "/notificaciones";

export interface PageParams {
  limit?: number;
  offset?: number;
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
  signal,
}: PageParams = {}): Promise<Paginated<Notification>> {
  const { data, meta } = await httpClient.get<Notification[]>(BASE, {
    query: { limit, offset },
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

export const notificationService = {
  list,
  getById,
  createBulk,
  update,
  remove,
};
