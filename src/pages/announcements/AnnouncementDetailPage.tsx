import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { FullPageSpinner } from "../../components/feedback/Spinner";
import { Card } from "../../components/layout/Page";
import { Breadcrumb } from "../../components/ui/primitives";
import { publishedLine, updatedLine } from "../../lib/announcements";
import { announcementService } from "../../services/announcementService";
import { ApiError } from "../../types/api";
import type { Announcement } from "../../types/announcement";
import { AnnouncementImage } from "./components/AnnouncementCard";

/** Anuncio completo. Lo ven todos los perfiles; la gestión está en el listado. */
export function AnnouncementDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [error, setError] = useState<unknown>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    const controller = new AbortController();
    setAnnouncement(null);
    setError(null);

    announcementService
      .getById(id, controller.signal)
      .then(setAnnouncement)
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(err);
        }
      });

    return () => controller.abort();
  }, [id]);

  if (error) {
    return (
      <div className="flex flex-col gap-5">
        <Breadcrumb to="/announcements" label="Anuncios" />
        {error instanceof ApiError && error.status === 404 ? (
          <Card className="p-8 text-center text-[15px] text-muted-foreground">
            Este anuncio ya no existe o fue eliminado.
          </Card>
        ) : (
          <ErrorAlert error={error} />
        )}
      </div>
    );
  }

  if (!announcement) {
    return <FullPageSpinner label="Cargando anuncio…" />;
  }

  const updated = updatedLine(announcement);

  return (
    <div className="flex flex-col gap-5">
      <Breadcrumb to="/announcements" label="Anuncios" current={announcement.titulo} />

      <Card as="article" className="mx-auto w-full max-w-[760px] overflow-hidden">
        {announcement.imagen_url ? (
          <AnnouncementImage
            announcement={announcement}
            // El afiche completo, sin recortar.
            className="max-h-[420px] w-full bg-muted !object-contain"
          />
        ) : null}
        <div className="flex flex-col gap-3 px-6 py-6 sm:px-8">
          <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.015em] break-words">
            {announcement.titulo}
          </h1>
          <div className="flex flex-col gap-0.5 text-sm text-muted-foreground">
            <p>{publishedLine(announcement)}</p>
            {updated ? <p>{updated}</p> : null}
          </div>
          {/* Texto plano: se respetan los saltos de línea sin interpretar HTML. */}
          <p className="mt-2 text-base leading-[1.65] break-words whitespace-pre-line text-text-strong">
            {announcement.contenido}
          </p>
        </div>
      </Card>
    </div>
  );
}
