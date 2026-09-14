import { httpClient, readListMeta } from "../lib/httpClient";
import type {
  CreateUserDTO,
  UpdateUserDTO,
  User,
} from "../types/user";

export interface ListUsersParams {
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}

export interface PaginatedUsers {
  items: User[];
  total: number;
}

/** `GET /users` — solo ADMIN. Paginación server-side con `limit`/`offset`. */
async function list({
  limit = 10,
  offset = 0,
  signal,
}: ListUsersParams = {}): Promise<PaginatedUsers> {
  const { data, meta } = await httpClient.get<User[]>("/users", {
    query: { limit, offset },
    signal,
  });
  return {
    items: data ?? [],
    total: readListMeta(meta).totalUsers,
  };
}

/** `GET /users/{id}` — ADMIN cualquiera; MEMBER/PARTICIPANT solo el propio. */
async function getById(id: string, signal?: AbortSignal): Promise<User> {
  const { data } = await httpClient.get<User>(`/users/${id}`, { signal });
  return data;
}

/** `POST /users` — solo ADMIN. Crea usuario con `rol` y `activo`. */
async function create(payload: CreateUserDTO): Promise<User> {
  const { data } = await httpClient.post<User>("/users", payload);
  return data;
}

/**
 * `PUT /users/{id}` — actualización parcial: solo se envían los campos
 * presentes en `payload`. Las reglas de permisos las valida el backend.
 */
async function update(id: string, payload: UpdateUserDTO): Promise<User> {
  const { data } = await httpClient.put<User>(`/users/${id}`, payload);
  return data;
}

/** `DELETE /users/{id}` — solo ADMIN. */
async function remove(id: string): Promise<void> {
  await httpClient.delete<null>(`/users/${id}`);
}

export const userService = { list, getById, create, update, remove };
