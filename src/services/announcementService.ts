import { httpClient, readMetaTotal, type UploadOptions } from "../lib/httpClient";
import type { Announcement, AnnouncementDraft } from "../types/announcement";

const BASE = "/announcements";

export interface ListAnnouncementsParams {
  limit?: number;
  offset?: number;
  signal?: AbortSignal;
}

export interface PaginatedAnnouncements {
  items: Announcement[];
  total: number;
}

/** `GET /announcements` — cualquier sesión. Del más reciente al más antiguo. */
async function list({
  limit = 10,
  offset = 0,
  signal,
}: ListAnnouncementsParams = {}): Promise<PaginatedAnnouncements> {
  const { data, meta } = await httpClient.get<Announcement[]>(BASE, {
    query: { limit, offset },
    signal,
  });
  return {
    items: data ?? [],
    total: readMetaTotal(meta, "totalAnnouncements"),
  };
}

/** `GET /announcements/{id}` — `404` si no existe. */
async function getById(id: string, signal?: AbortSignal): Promise<Announcement> {
  const { data } = await httpClient.get<Announcement>(`${BASE}/${id}`, { signal });
  return data;
}

function toForm(draft: Partial<AnnouncementDraft>): FormData {
  const form = new FormData();
  if (draft.titulo !== undefined) {
    form.append("titulo", draft.titulo);
  }
  if (draft.contenido !== undefined) {
    form.append("contenido", draft.contenido);
  }
  if (draft.imagen) {
    form.append("imagen", draft.imagen);
  }
  if (draft.quitarImagen) {
    form.append("quitar_imagen", "true");
  }
  return form;
}

/**
 * `POST /announcements` — solo ADMIN. `422` (con `data.campo`) si el título,
 * el texto o la imagen no son válidos; `502`/`503` si la imagen no se pudo subir.
 */
async function create(
  draft: AnnouncementDraft,
  options?: UploadOptions,
): Promise<Announcement> {
  const { data } = await httpClient.sendForm<Announcement>(
    "POST",
    BASE,
    toForm(draft),
    options,
  );
  return data;
}

/** `PUT /announcements/{id}` — solo ADMIN. Solo se envía lo que cambió. */
async function update(
  id: string,
  draft: Partial<AnnouncementDraft>,
  options?: UploadOptions,
): Promise<Announcement> {
  const { data } = await httpClient.sendForm<Announcement>(
    "PUT",
    `${BASE}/${id}`,
    toForm(draft),
    options,
  );
  return data;
}

/** `DELETE /announcements/{id}` — solo ADMIN. Borra también su imagen. */
async function remove(id: string): Promise<void> {
  await httpClient.delete<null>(`${BASE}/${id}`);
}

export const announcementService = { list, getById, create, update, remove };
