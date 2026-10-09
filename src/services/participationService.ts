import { httpClient, readMetaTotal } from "../lib/httpClient";
import type {
  EligibleParticipant,
  Invitation,
  InvitationList,
  InvitationView,
  Participation,
  ParticipationFilter,
  ParticipationList,
  ReassignmentInfo,
  ReplacementDTO,
  ReplacementResult,
} from "../types/participation";

const OWN = "/participante/invitaciones";
const ADMIN = "/admin/participaciones";

/* ── Participante: solo sus propias invitaciones ──────────────────────── */

/** `GET /participante/invitaciones` — requiere rol PARTICIPANT. */
async function listOwn(
  vista: InvitationView,
  signal?: AbortSignal,
): Promise<InvitationList> {
  const { data } = await httpClient.get<InvitationList>(OWN, {
    query: { vista },
    signal,
  });
  return data;
}

/** `409` (con `data.estado_actual`) si ya fue respondida, venció o fue cancelada. */
async function accept(id: string): Promise<Invitation> {
  const { data } = await httpClient.post<Invitation>(`${OWN}/${id}/aceptar`);
  return data;
}

/** Igual que `accept`; `422` si el motivo supera 255 caracteres. */
async function reject(id: string, motivo: string): Promise<Invitation> {
  const { data } = await httpClient.post<Invitation>(`${OWN}/${id}/rechazar`, {
    motivo: motivo.trim() || null,
  });
  return data;
}

/* ── Administrador ────────────────────────────────────────────────────── */

export interface ListParticipationsParams {
  filtro: ParticipationFilter;
  q?: string;
  pagina?: number;
  porPagina?: number;
  signal?: AbortSignal;
}

/** `GET /admin/participaciones` — filtro, búsqueda y paginación en el servidor. */
async function list({
  filtro,
  q,
  pagina = 1,
  porPagina = 20,
  signal,
}: ListParticipationsParams): Promise<ParticipationList> {
  const { data, meta } = await httpClient.get<Omit<ParticipationList, "total">>(
    ADMIN,
    {
      query: { filtro, q: q?.trim() || undefined, pagina, por_pagina: porPagina },
      signal,
    },
  );
  return { ...data, total: readMetaTotal(meta, "total") };
}

/** Invitación vigente de cada actividad de un evento (para el cronograma). */
async function listByEvent(
  eventoId: string,
  signal?: AbortSignal,
): Promise<Participation[]> {
  const { data } = await httpClient.get<Participation[]>(
    `${ADMIN}/eventos/${eventoId}`,
    { signal },
  );
  return data ?? [];
}

/**
 * `POST /admin/participaciones` — invita a una persona a una actividad sin
 * invitación activa. `409` si ya tiene una; `422` si el plazo o la persona
 * no son válidos.
 */
async function invite(
  actividadId: string,
  dto: ReplacementDTO,
): Promise<Participation> {
  const { data } = await httpClient.post<Participation>(ADMIN, {
    actividad_id: actividadId,
    ...dto,
  });
  return data;
}

async function cancel(id: string): Promise<Participation> {
  const { data } = await httpClient.post<Participation>(`${ADMIN}/${id}/cancelar`);
  return data;
}

/** Devuelve la fila aunque el correo vuelva a fallar (`estado_envio: "error"`). */
async function resend(id: string): Promise<Participation> {
  const { data } = await httpClient.post<Participation>(`${ADMIN}/${id}/reenviar`);
  return data;
}

async function reassignmentInfo(
  id: string,
  signal?: AbortSignal,
): Promise<ReassignmentInfo> {
  const { data } = await httpClient.get<ReassignmentInfo>(
    `${ADMIN}/${id}/reasignacion`,
    { signal },
  );
  return data;
}

async function eligible(
  actividadId: string,
  signal?: AbortSignal,
): Promise<EligibleParticipant[]> {
  const { data } = await httpClient.get<EligibleParticipant[]>(
    "/admin/participantes/elegibles",
    { query: { actividad_id: actividadId }, signal },
  );
  return data ?? [];
}

async function reassign(id: string, dto: ReplacementDTO): Promise<ReplacementResult> {
  const { data } = await httpClient.post<ReplacementResult>(
    `${ADMIN}/${id}/reasignar`,
    dto,
  );
  return data;
}

async function revoke(id: string, dto: ReplacementDTO): Promise<ReplacementResult> {
  const { data } = await httpClient.post<ReplacementResult>(
    `${ADMIN}/${id}/revocar`,
    dto,
  );
  return data;
}

export const participationService = {
  listOwn,
  accept,
  reject,
  list,
  listByEvent,
  invite,
  cancel,
  resend,
  reassignmentInfo,
  eligible,
  reassign,
  revoke,
};
