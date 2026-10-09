import { httpClient, readMetaTotal } from "../lib/httpClient";
import type {
  CreateScheduleDTO,
  Schedule,
  UpdateScheduleDTO,
} from "../types/schedule";

const BASE = "/schedules";

export interface PageParams {
  limit?: number;
  offset?: number;
  /** Si se envía, el backend devuelve TODOS los cronogramas de ese evento (sin paginar). */
  eventoId?: string;
  signal?: AbortSignal;
}

export interface Paginated<T> {
  items: T[];
  /** Total real desde `meta.totalSchedules`, independiente de `limit`. */
  total: number;
}

/**
 * `GET /schedules` — cualquier usuario autenticado.
 * Paginación server-side, salvo que se filtre por `eventoId` (en ese caso
 * el backend ignora `limit`/`offset` y devuelve todos los cronogramas del evento).
 */
async function list({
  limit = 10,
  offset = 0,
  eventoId,
  signal,
}: PageParams = {}): Promise<Paginated<Schedule>> {
  const { data, meta } = await httpClient.get<Schedule[]>(BASE, {
    query: { limit, offset, evento_id: eventoId },
    signal,
  });
  return {
    items: data ?? [],
    total: readMetaTotal(meta, "totalSchedules"),
  };
}

/** `GET /schedules/{id}` — cualquier usuario autenticado. `404` si no existe. */
async function getById(id: string, signal?: AbortSignal): Promise<Schedule> {
  const { data } = await httpClient.get<Schedule>(`${BASE}/${id}`, { signal });
  return data;
}

/** `POST /schedules` — solo ADMIN. `404` si el evento no existe, `400` si `hora_fin` <= `hora_inicio`. */
async function create(dto: CreateScheduleDTO): Promise<Schedule> {
  const { data } = await httpClient.post<Schedule>(BASE, dto);
  return data;
}

/** `PUT /schedules/{id}` — solo ADMIN. Actualización parcial; `evento_id` no se puede modificar. */
async function update(id: string, dto: UpdateScheduleDTO): Promise<Schedule> {
  const { data } = await httpClient.put<Schedule>(`${BASE}/${id}`, dto);
  return data;
}

/** `DELETE /schedules/{id}` — solo ADMIN. */
async function remove(id: string): Promise<void> {
  await httpClient.delete<null>(`${BASE}/${id}`);
}

export const scheduleService = { list, getById, create, update, remove };
