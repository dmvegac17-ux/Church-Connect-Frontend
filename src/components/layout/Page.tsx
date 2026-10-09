import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export function PageHeader({
  title,
  description,
  actions,
  backTo,
  backLabel = "Volver",
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  backTo?: string;
  backLabel?: string;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        {backTo ? (
          <Link
            to={backTo}
            className="inline-flex min-h-8 items-center gap-1 self-start rounded-lg py-1.5 pr-1 text-sm font-bold text-primary hover:underline"
          >
            <ArrowLeft className="size-[18px]" aria-hidden="true" />
            {backLabel}
          </Link>
        ) : null}
        <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.015em] break-words text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="text-[15px] text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}

/**
 * Tarjeta de superficie. El radio lo fija el layout (`--card-radius`:
 * 14px en admin, 16px en miembro).
 */
export function Card({
  children,
  className = "",
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  as?: "div" | "section" | "article" | "aside";
}) {
  return (
    <Tag
      className={`rounded-[var(--card-radius,16px)] border border-border bg-card text-card-foreground ${className}`}
    >
      {children}
    </Tag>
  );
}

/** Cabecera interna de una tarjeta: título de sección + acción a la derecha. */
export function CardHeader({
  title,
  aside,
}: {
  title: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider px-5 py-4">
      <h2 className="text-[17px] font-extrabold text-foreground">{title}</h2>
      {aside}
    </div>
  );
}
