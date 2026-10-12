import { httpClient } from "../lib/httpClient";
import { ApiError } from "../types/api";
import type {
  AcceptanceSummary,
  AdminLegalDocument,
  LegalDocument,
  LegalDocumentType,
  OwnAcceptance,
  PendingDocument,
} from "../types/legal";

const BASE = "/legal";

/** Código con el que el backend bloquea a quien tiene documentos por aceptar. */
export const ACCEPTANCE_PENDING = "aceptacion_pendiente";
/** Evento global: alguna petición fue rechazada por tener una aceptación pendiente. */
export const ACCEPTANCE_PENDING_EVENT = "legal:acceptance-pending";

/** `true` si el error es el bloqueo por aceptación pendiente. */
export function isAcceptancePending(error: unknown): boolean {
  if (!(error instanceof ApiError) || error.status !== 403) {
    return false;
  }
  const data = error.payload?.data as { codigo?: string } | null | undefined;
  return data?.codigo === ACCEPTANCE_PENDING;
}

/** `GET /legal/documentos` — público. Las versiones vigentes de los dos documentos. */
async function current(signal?: AbortSignal): Promise<LegalDocument[]> {
  const { data } = await httpClient.get<LegalDocument[]>(`${BASE}/documentos`, {
    auth: false,
    signal,
  });
  return data ?? [];
}

/** `GET /legal/documentos/{tipo}` — público. `404` si aún no está publicado. */
async function byType(
  tipo: LegalDocumentType,
  signal?: AbortSignal,
): Promise<LegalDocument> {
  const { data } = await httpClient.get<LegalDocument>(
    `${BASE}/documentos/${tipo}`,
    { auth: false, signal },
  );
  return data;
}

/** `GET /legal/mis-pendientes` — lo que la persona con sesión todavía debe aceptar. */
async function pending(): Promise<PendingDocument[]> {
  const { data } = await httpClient.get<PendingDocument[]>(
    `${BASE}/mis-pendientes`,
    // Siempre al servidor: de esto depende poder usar la aplicación.
    { query: { _: Date.now() } },
  );
  return data ?? [];
}

/** `POST /legal/aceptaciones` — `409` si los documentos cambiaron entre tanto. */
async function accept(documentos: string[]): Promise<void> {
  await httpClient.post<PendingDocument[]>(`${BASE}/aceptaciones`, { documentos });
}

/* ── Administración ───────────────────────────────────────────────────── */

/** `GET /legal/admin/documentos` — vigentes, borradores e historial. */
async function versions(signal?: AbortSignal): Promise<AdminLegalDocument[]> {
  const { data } = await httpClient.get<AdminLegalDocument[]>(
    `${BASE}/admin/documentos`,
    { signal },
  );
  return data ?? [];
}

/** `POST /legal/admin/documentos/{tipo}/borrador` — el borrador de la siguiente versión. */
async function createDraft(tipo: LegalDocumentType): Promise<AdminLegalDocument> {
  const { data } = await httpClient.post<AdminLegalDocument>(
    `${BASE}/admin/documentos/${tipo}/borrador`,
  );
  return data;
}

/** `PUT /legal/admin/documentos/{id}` — solo borradores (`409` si no lo es). */
async function saveDraft(
  id: string,
  dto: { titulo: string; contenido: string },
): Promise<AdminLegalDocument> {
  const { data } = await httpClient.put<AdminLegalDocument>(
    `${BASE}/admin/documentos/${id}`,
    dto,
  );
  return data;
}

/** `DELETE /legal/admin/documentos/{id}` — descarta un borrador. */
async function discardDraft(id: string): Promise<void> {
  await httpClient.delete<null>(`${BASE}/admin/documentos/${id}`);
}

/**
 * `POST /legal/admin/documentos/{id}/publicar`. Con `requiereReaceptacion`
 * todas las personas deben volver a aceptar.
 */
async function publish(
  id: string,
  requiereReaceptacion: boolean,
): Promise<AdminLegalDocument> {
  const { data } = await httpClient.post<AdminLegalDocument>(
    `${BASE}/admin/documentos/${id}/publicar`,
    { requiere_reaceptacion: requiereReaceptacion },
  );
  return data;
}

/** `GET /legal/admin/aceptaciones` — quién aceptó y quién está pendiente. */
async function acceptances(signal?: AbortSignal): Promise<AcceptanceSummary> {
  const { data } = await httpClient.get<AcceptanceSummary>(
    `${BASE}/admin/aceptaciones`,
    { signal },
  );
  return data;
}

/** `GET /legal/admin/usuarios/{id}/aceptaciones` — historial de una persona. */
async function acceptancesOf(usuarioId: string): Promise<OwnAcceptance[]> {
  const { data } = await httpClient.get<OwnAcceptance[]>(
    `${BASE}/admin/usuarios/${usuarioId}/aceptaciones`,
  );
  return data ?? [];
}

export const legalService = {
  current,
  byType,
  pending,
  accept,
  versions,
  createDraft,
  saveDraft,
  discardDraft,
  publish,
  acceptances,
  acceptancesOf,
};
