import { httpClient, readMetaTotal } from "../lib/httpClient";
import type { CreateEventDTO, Event, UpdateEventDTO } from "../types/event";

const BASE = "/events";

export interface ListEventsParams {
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}

export interface PaginatedEvents {
  items: Event[];
  total: number;
}

/** `GET /events` — cualquier usuario autenticado. Paginación server-side. */
async function list({
  limit = 10,
  offset = 0,
  signal,
}: ListEventsParams = {}): Promise<PaginatedEvents> {
  const { data, meta } = await httpClient.get<Event[]>(BASE, {
    query: { limit, offset },
    signal,
  });
  return {
    items: data ?? [],
    total: readMetaTotal(meta, "totalEvents"),
  };
}

/** `GET /events/{id}` — cualquier usuario autenticado. `404` si no existe. */
async function getById(id: string, signal?: AbortSignal): Promise<Event> {
  const { data } = await httpClient.get<Event>(`${BASE}/${id}`, { signal });
  return data;
}

/** `POST /events` — solo ADMIN. `creado_por` lo asigna el backend. */
async function create(dto: CreateEventDTO): Promise<Event> {
  const { data } = await httpClient.post<Event>(BASE, dto);
  return data;
}

/** `PUT /events/{id}` — solo ADMIN. Actualización parcial. */
async function update(id: string, dto: UpdateEventDTO): Promise<Event> {
  const { data } = await httpClient.put<Event>(`${BASE}/${id}`, dto);
  return data;
}

/**
 * `DELETE /events/{id}` — solo ADMIN.
 * `409` si el evento tiene cronogramas asociados (deben eliminarse primero).
 */
async function remove(id: string): Promise<void> {
  await httpClient.delete<null>(`${BASE}/${id}`);
}

export const eventService = { list, getById, create, update, remove };
