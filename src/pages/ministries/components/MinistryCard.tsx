import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

import { membersLabel, ministryIcon } from "../../../lib/ministryIcon";
import type { Ministry } from "../../../types/ministry";

/**
 * Tarjeta de ministerio, igual en la vista de miembro y en el panel de
 * administración: icono, nombre, descripción en 2 líneas e integrantes.
 */
export function MinistryCard({
  ministry,
  memberCount,
}: {
  ministry: Ministry;
  /** `undefined` mientras se consulta (o si la consulta falló). */
  memberCount?: number;
}) {
  const Icon = ministryIcon(ministry.nombre);

  return (
    <Link
      to={`/ministries/${ministry.id}`}
      className="flex h-full flex-col gap-2.5 rounded-[var(--card-radius,16px)] border border-border bg-card p-5 text-foreground transition hover:border-[#B9CDBE] hover:shadow-card-hover"
    >
      <span
        className="flex size-10 items-center justify-center rounded-[10px] bg-primary-soft text-primary"
        aria-hidden="true"
      >
        <Icon className="size-[22px]" />
      </span>
      <span className="text-[17px] font-extrabold break-words">
        {ministry.nombre}
      </span>
      <span className="line-clamp-2 flex-1 text-sm leading-normal text-muted-foreground">
        {ministry.descripcion?.trim() || "Sin descripción."}
      </span>
      <span className="flex items-center justify-between gap-2 border-t border-divider-soft pt-2.5 text-sm">
        <span className="text-text-secondary">
          {memberCount === undefined ? "" : membersLabel(memberCount)}
        </span>
        <span className="flex items-center gap-0.5 font-bold text-primary">
          Ver detalle
          <ChevronRight className="size-[18px]" aria-hidden="true" />
        </span>
      </span>
    </Link>
  );
}
