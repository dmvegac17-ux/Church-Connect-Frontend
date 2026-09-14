import { httpClient, readMetaTotal } from "../lib/httpClient";
import type {
  CreateMinistryDTO,
  Ministry,
  MinistryMember,
  UpdateMinistryDTO,
} from "../types/ministry";

const BASE = "/ministries";

export interface PageParams {
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}

export interface Paginated<T> {
  items: T[];
  /** Total real desde `meta` (`totalMinistries` | `totalMembers`), independiente de `limit`. */
  total: number;
}

/** `GET /ministries` — cualquier usuario autenticado. Paginación server-side. */
async function list({
  limit = 10,
  offset = 0,
  signal,
}: PageParams = {}): Promise<Paginated<Ministry>> {
  const { data, meta } = await httpClient.get<Ministry[]>(BASE, {
    query: { limit, offset },
    signal,
  });
  return {
    items: data ?? [],
    total: readMetaTotal(meta, "totalMinistries"),
  };
}

/** `GET /ministries/{id}` — cualquier usuario autenticado. `404` si no existe. */
async function getById(id: string, signal?: AbortSignal): Promise<Ministry> {
  const { data } = await httpClient.get<Ministry>(`${BASE}/${id}`, { signal });
  return data;
}

/** `POST /ministries` — solo ADMIN. */
async function create(dto: CreateMinistryDTO): Promise<Ministry> {
  const { data } = await httpClient.post<Ministry>(BASE, dto);
  return data;
}

/** `PUT /ministries/{id}` — solo ADMIN. Actualización parcial: solo los campos enviados. */
async function update(id: string, dto: UpdateMinistryDTO): Promise<Ministry> {
  const { data } = await httpClient.put<Ministry>(`${BASE}/${id}`, dto);
  return data;
}

/** `DELETE /ministries/{id}` — solo ADMIN. Los miembros quedan con `ministerio_id = NULL`. */
async function remove(id: string): Promise<void> {
  await httpClient.delete<null>(`${BASE}/${id}`);
}

/** `GET /ministries/{id}/users` — cualquier usuario autenticado. */
async function listMembers(
  id: string,
  { limit = 10, offset = 0, signal }: PageParams = {},
): Promise<Paginated<MinistryMember>> {
  const { data, meta } = await httpClient.get<MinistryMember[]>(
    `${BASE}/${id}/users`,
    { query: { limit, offset }, signal },
  );
  return {
    items: data ?? [],
    total: readMetaTotal(meta, "totalMembers"),
  };
}

/**
 * `POST /ministries/{ministryId}/users/{userId}` — solo ADMIN. Sin cuerpo.
 * `409` si el usuario ya pertenece al ministerio.
 */
async function addMember(ministryId: string, userId: string): Promise<void> {
  await httpClient.post<null>(`${BASE}/${ministryId}/users/${userId}`);
}

/** `DELETE /ministries/{ministryId}/users/{userId}` — solo ADMIN. */
async function removeMember(ministryId: string, userId: string): Promise<void> {
  await httpClient.delete<null>(`${BASE}/${ministryId}/users/${userId}`);
}

export const ministryService = {
  list,
  getById,
  create,
  update,
  remove,
  listMembers,
  addMember,
  removeMember,
};
