import { ChevronRight, ImageOff, Megaphone } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Card } from "../../../components/layout/Page";
import { announcementDate, authorName, excerpt } from "../../../lib/announcements";
import type { Announcement } from "../../../types/announcement";

/**
 * Imagen de un anuncio. Si no carga (p. ej. una URL externa que dejó de
 * existir) se reemplaza por un fondo neutro en lugar de un ícono roto.
 */
export function AnnouncementImage({
  announcement,
  className = "",
  rounded = "",
}: {
  announcement: Announcement;
  className?: string;
  rounded?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!announcement.imagen_url || failed) {
    return (
      <div
        aria-hidden="true"
        className={`flex items-center justify-center bg-primary-soft text-primary ${rounded} ${className}`}
      >
        {failed ? (
          <ImageOff className="size-8 opacity-60" />
        ) : (
          <Megaphone className="size-9 opacity-70" />
        )}
      </div>
    );
  }

  return (
    <img
      src={announcement.imagen_url}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className={`object-cover ${rounded} ${className}`}
    />
  );
}

/** Tarjeta de cartelera: imagen, título, extracto, fecha y quién publicó. */
export function AnnouncementCard({ announcement }: { announcement: Announcement }) {
  return (
    <Card as="article" className="h-full overflow-hidden">
      <Link
        to={`/announcements/${announcement.id}`}
        className="group flex h-full flex-col text-foreground"
      >
        <AnnouncementImage announcement={announcement} className="aspect-[16/9] w-full" />
        <div className="flex flex-1 flex-col gap-2 p-5">
          <p className="text-[13px] text-muted-foreground">
            <time dateTime={announcement.fecha_publicacion}>
              {announcementDate(announcement.fecha_publicacion)}
            </time>{" "}
            · {authorName(announcement)}
          </p>
          <h2 className="text-lg leading-snug font-extrabold break-words group-hover:underline">
            {announcement.titulo}
          </h2>
          <p className="text-[15px] leading-normal break-words text-text-secondary">
            {excerpt(announcement.contenido)}
          </p>
          <span className="mt-auto flex items-center gap-1 pt-1 text-sm font-bold text-primary">
            Leer anuncio
            <ChevronRight className="size-[18px]" aria-hidden="true" />
          </span>
        </div>
      </Link>
    </Card>
  );
}
