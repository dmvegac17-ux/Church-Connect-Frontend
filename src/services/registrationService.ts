import { httpClient, readMetaTotal } from "../lib/httpClient";
import { ApiError } from "../types/api";
import type {
  AdminRegistrationDTO,
  Registration,
  RegistrationConflict,
} from "../types/registration";

const BASE = "/registrations";

interface PageParams {
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}

export interface PaginatedRegistrations {
  items: Registration[];
  total: number;
}

/** `GET /registrations/me` — las inscripciones del usuario autenticado. */
async function listMine({
  limit = 100,
  offset = 0,
  signal,
}: PageParams = {}): Promise<PaginatedRegistrations> {
  const { data, meta } = await httpClient.get<Registration[]>(`${BASE}/me`, {
    query: { limit, offset },
    signal,
  });
  return {
    items: data ?? [],
    total: readMetaTotal(meta, "totalRegistrations"),
  };
}

/** `GET /registrations?evento_id=` — solo ADMIN: el público de un evento. */
async function listByEvent(
  eventoId: string,
  { limit = 100, offset = 0, signal }: PageParams = {},
): Promise<PaginatedRegistrations> {
  const { data, meta } = await httpClient.get<Registration[]>(BASE, {
    query: { evento_id: eventoId, limit, offset },
    signal,
  });
  return {
    items: data ?? [],
    total: readMetaTotal(meta, "totalRegistrations"),
  };
}

/**
 * `POST /registrations` — inscribe al usuario autenticado. `409` con
 * `data.codigo` si no hay cupos, ya está inscrito, participa en el evento o
 * las inscripciones están cerradas. El cupo se valida en el servidor.
 */
async function enroll(eventoId: string): Promise<Registration> {
  const { data } = await httpClient.post<Registration>(BASE, {
    evento_id: eventoId,
  });
  return data;
}

/** `POST /registrations` con `usuario_id` — solo ADMIN: inscribe a otra persona. */
async function enrollPerson(dto: AdminRegistrationDTO): Promise<Registration> {
  const { data } = await httpClient.post<Registration>(BASE, {
    ...dto,
    nota: dto.nota?.trim() || undefined,
  });
  return data;
}

/** `PATCH /registrations/{id}` — solo ADMIN: edita la nota. */
async function updateNote(id: string, nota: string): Promise<Registration> {
  const { data } = await httpClient.patch<Registration>(`${BASE}/${id}`, {
    nota: nota.trim() || null,
  });
  return data;
}

/** `DELETE /registrations/{id}` — el dueño o un ADMIN. Libera el cupo. */
async function remove(id: string): Promise<void> {
  await httpClient.delete<null>(`${BASE}/${id}`);
}

/** Motivo que el backend adjunta a un `409` (`data.codigo`). */
export function registrationConflict(error: unknown): RegistrationConflict | null {
  if (!(error instanceof ApiError) || error.status !== 409) {
    return null;
  }
  const data = error.payload?.data as { codigo?: string } | null | undefined;
  switch (data?.codigo) {
    case "sin_cupos":
    case "ya_inscrito":
    case "es_participante":
    case "inscripciones_cerradas":
    case "cancelacion_cerrada":
      return data.codigo;
    default:
      return null;
  }
}

export const registrationService = {
  listMine,
  listByEvent,
  enroll,
  enrollPerson,
  updateNote,
  remove,
};
