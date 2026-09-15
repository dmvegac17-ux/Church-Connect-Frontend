import { httpClient, readMetaTotal } from "../lib/httpClient";
import type {
  CreateNotificationDTO,
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

/** `POST /notificaciones` — solo ADMIN. `404` si `usuario_id` no existe. */
async function create(dto: CreateNotificationDTO): Promise<Notification> {
  const { data } = await httpClient.post<Notification>(BASE, dto);
  return data;
}

/** `PUT /notificaciones/{id}` — solo ADMIN. Actualización parcial; `usuario_id` no se puede modificar. */
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

export const notificationService = { list, getById, create, update, remove };
