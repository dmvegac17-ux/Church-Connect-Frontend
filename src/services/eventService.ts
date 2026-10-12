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

/**
 * Versión vigente del evento, sin pasar por la caché de lecturas: sirve para
 * saber si otra persona guardó cambios mientras un formulario estaba abierto.
 */
async function getVersion(id: string): Promise<number> {
  const { data } = await httpClient.get<Event>(`${BASE}/${id}`, {
    query: { _: Date.now() },
  });
  return data.version;
}

/** `POST /events` — solo ADMIN. `creado_por` lo asigna el backend. */
async function create(dto: CreateEventDTO): Promise<Event> {
  const { data } = await httpClient.post<Event>(BASE, dto);
  return data;
}

export interface UpdatedEvent {
  event: Event;
  /** Inscritos a los que se avisó porque cambió la fecha, el horario, el lugar o la dirección. */
  notified: number;
}

/**
 * `PUT /events/{id}` — solo ADMIN. Actualización parcial. Si cambia la
 * fecha, el horario, el lugar o la dirección, el backend avisa por correo y
 * en su bandeja a los inscritos. No avisan los demás campos ni los retoques
 * de texto (ver `lib/eventChanges.ts`).
 */
async function update(id: string, dto: UpdateEventDTO): Promise<UpdatedEvent> {
  const { data, meta } = await httpClient.put<Event>(`${BASE}/${id}`, dto);
  return { event: data, notified: readMetaTotal(meta, "inscritosNotificados") };
}

/**
 * `DELETE /events/{id}` — solo ADMIN. Elimina en cascada su cronograma,
 * asistencias, inscripciones y confirmaciones por correo asociadas.
 */
async function remove(id: string): Promise<void> {
  await httpClient.delete<null>(`${BASE}/${id}`);
}

export const eventService = {
  list,
  getById,
  getVersion,
  create,
  update,
  remove,
};
