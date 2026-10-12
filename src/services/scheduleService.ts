import { httpClient, readMetaTotal } from "../lib/httpClient";
import type { ScheduleGroup } from "../lib/scheduleGroups";
import type {
  CreateScheduleDTO,
  Schedule,
  UpdateScheduleDTO,
  ScheduleChange,
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

export interface ScheduleTime {
  id: string;
  /** ISO datetime. */
  hora_inicio: string;
  hora_fin: string;
}

/**
 * `PUT /schedules/horarios` — solo ADMIN. Cambia de una vez el horario de
 * varias actividades de un evento. El backend valida cómo queda el
 * cronograma completo y guarda todo o nada: es la forma de intercambiar
 * horarios sin que el primer cambio choque con el que aún no se hizo.
 */
async function reschedule(eventoId: string, items: ScheduleTime[]): Promise<Schedule[]> {
  const { data } = await httpClient.put<Schedule[]>(`${BASE}/horarios`, {
    evento_id: eventoId,
    items,
  });
  return data ?? [];
}

/** `GET /schedules/historial` — solo ADMIN. Del cambio más reciente al más antiguo. */
async function history(
  eventoId: string,
  signal?: AbortSignal,
): Promise<ScheduleChange[]> {
  const { data } = await httpClient.get<ScheduleChange[]>(`${BASE}/historial`, {
    query: { evento_id: eventoId },
    signal,
  });
  return data ?? [];
}

/**
 * `GET /schedules/agrupados` — solo ADMIN. Todos los eventos con sus
 * actividades y el estado de cada una, en una sola petición.
 */
async function grouped(signal?: AbortSignal): Promise<ScheduleGroup[]> {
  const { data } = await httpClient.get<ScheduleGroup[]>(`${BASE}/agrupados`, {
    signal,
  });
  return data ?? [];
}

export const scheduleService = {
  list,
  grouped,
  history,
  getById,
  create,
  update,
  remove,
  reschedule,
};
