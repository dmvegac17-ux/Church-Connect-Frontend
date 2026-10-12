import { CalendarX, TriangleAlert } from "lucide-react";
import type { ReactNode } from "react";

import { occupancyHint, occupancyTone, type Occupancy } from "../../lib/capacity";

/* Aforo tal como lo ve el administrador: las cuatro cifras y su barra. */

function Swatch({ className }: { className: string }) {
  return <span aria-hidden="true" className={`size-2.5 rounded-[3px] ${className}`} />;
}

const SWATCH = {
  participantes: "bg-aforo-participantes",
  publico: "bg-aforo-publico",
  libre: "border border-aforo-libre-border bg-muted",
};

/** «Sobrecupo: 3» o el número de disponibles, con su color. */
function availableLabel(o: Occupancy): string {
  return o.sobrecupo > 0 ? `Sobrecupo: ${o.sobrecupo}` : String(o.disponibles);
}

function overText(o: Occupancy): string {
  return `Hay ${o.ocupados} lugares ocupados y el aforo es de ${o.aforo}. Se asignaron participantes cuando el evento ya estaba lleno. Elimina inscripciones de público o aumenta el aforo.`;
}

/** Aviso de sobrecupo, con la causa y cómo resolverlo. */
export function OverCapacityAlert({ occupancy }: { occupancy: Occupancy }) {
  if (occupancy.sobrecupo <= 0) {
    return null;
  }
  return (
    <div
      role="alert"
      className="flex items-start gap-2.5 rounded-xl border border-destructive-wash-border bg-destructive-tint px-3.5 py-3 text-sm leading-normal text-destructive-hover"
    >
      <TriangleAlert className="size-5 shrink-0" aria-hidden="true" />
      <span>
        <strong className="block font-extrabold">Sobrecupo</strong>
        {overText(occupancy)}
      </span>
    </div>
  );
}

function Figure({
  label,
  swatch,
  children,
  className = "border-divider bg-surface-alt",
}: {
  label: string;
  swatch?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl border px-3.5 py-3 ${className}`}>
      <dt className="flex items-center gap-1.5 text-[13px] font-bold text-text-secondary">
        {swatch ? <Swatch className={swatch} /> : null}
        {label}
      </dt>
      {children}
    </div>
  );
}

const FIGURE_VALUE = "mt-0.5 text-[26px] leading-tight font-extrabold";

/**
 * Tarjeta «Aforo» del detalle de evento: cuatro cifras, barra apilada con la
 * marca del aforo y avisos de lleno o sobrecupo.
 */
export function AforoSection({ occupancy: o }: { occupancy: Occupancy }) {
  const over = o.sobrecupo > 0;
  // Con sobrecupo la barra representa lo ocupado y el aforo queda dentro.
  const base = Math.max(o.aforo, o.ocupados) || 1;
  const pct = (n: number) => `${((n / base) * 100).toFixed(2)}%`;
  const tone = occupancyTone(o);

  return (
    <section
      aria-label="Aforo"
      className="flex flex-col gap-3.5 rounded-[var(--card-radius,14px)] border border-border bg-card px-5 py-[18px]"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-[17px] font-extrabold">Aforo</h2>
        <span className="text-[13px] text-muted-foreground">
          Cupo para público: {o.aforo - o.participantes} (aforo menos participantes).
        </span>
      </div>

      <dl className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3">
        <Figure label="Aforo total">
          <dd className={FIGURE_VALUE}>{o.aforo}</dd>
        </Figure>
        <Figure label="Participantes" swatch={SWATCH.participantes}>
          <dd className={FIGURE_VALUE}>{o.participantes}</dd>
        </Figure>
        <Figure label="Público inscrito" swatch={SWATCH.publico}>
          <dd className={FIGURE_VALUE}>{o.publico}</dd>
        </Figure>
        <Figure
          label="Disponibles"
          swatch={SWATCH.libre}
          className={
            over
              ? "border-destructive-wash-border bg-destructive-wash"
              : "border-divider bg-surface-alt"
          }
        >
          <dd className={`${FIGURE_VALUE} ${tone}`}>{availableLabel(o)}</dd>
          <dd className={`text-xs font-bold ${tone || "text-foreground"}`}>
            {over ? "Supera el aforo" : o.lleno ? "Evento lleno" : "Para público"}
          </dd>
        </Figure>
      </dl>

      <div className="relative pt-[18px]">
        <div
          role="img"
          aria-label={`${o.participantes} participantes, ${o.publico} de público y ${Math.max(0, o.disponibles)} disponibles sobre un aforo de ${o.aforo}${
            over ? `; sobrecupo de ${o.sobrecupo}` : ""
          }.`}
          className="flex h-3.5 overflow-hidden rounded-[7px] border border-input bg-muted"
        >
          <div className="bg-aforo-participantes" style={{ width: pct(o.participantes) }} />
          <div className="bg-aforo-publico" style={{ width: pct(o.publico) }} />
        </div>
        {over ? (
          <div
            aria-hidden="true"
            className="absolute top-[18px] right-0 h-4 rounded-r-[7px] bg-[repeating-linear-gradient(135deg,rgba(163,55,42,0.85)_0_4px,rgba(163,55,42,0.35)_4px_8px)]"
            style={{ left: pct(o.aforo) }}
          />
        ) : null}
        <div
          aria-hidden="true"
          className={`absolute top-3 -bottom-1 w-0.5 ${over ? "bg-destructive" : "bg-muted-foreground"}`}
          style={{ left: pct(o.aforo) }}
        />
        <span
          aria-hidden="true"
          className={`absolute top-0 -translate-x-full pr-1.5 text-[11px] font-extrabold whitespace-nowrap ${
            over ? "text-destructive" : "text-muted-foreground"
          }`}
          style={{ left: pct(o.aforo) }}
        >
          Aforo {o.aforo}
        </span>
      </div>

      <div className="flex flex-wrap gap-x-[18px] gap-y-1.5 text-[13px] text-text-secondary">
        <span className="flex items-center gap-1.5">
          <Swatch className={SWATCH.participantes} />
          Participantes
        </span>
        <span className="flex items-center gap-1.5">
          <Swatch className={SWATCH.publico} />
          Público
        </span>
        <span className="flex items-center gap-1.5">
          <Swatch className={SWATCH.libre} />
          Disponible
        </span>
      </div>

      <OverCapacityAlert occupancy={o} />
      {o.lleno ? (
        <div
          role="status"
          className="flex items-center gap-2.5 rounded-xl border border-warning-border bg-warning-soft px-3.5 py-2.5 text-sm font-bold text-warning-strong"
        >
          <CalendarX className="size-5 shrink-0" aria-hidden="true" />
          El evento está lleno. Los miembros lo ven como «Cupos agotados».
        </div>
      ) : null}
    </section>
  );
}

/** Franja compacta de Inscripciones: las cuatro cifras en una línea. */
export function AforoStrip({
  occupancy: o,
  action,
}: {
  occupancy: Occupancy;
  action?: ReactNode;
}) {
  const tone = occupancyTone(o);
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-[var(--card-radius,14px)] border border-border bg-card px-5 py-3 text-sm text-text-secondary">
      <span>
        Aforo total <strong className="text-base font-extrabold text-foreground">{o.aforo}</strong>
      </span>
      <span className="flex items-center gap-1.5">
        <Swatch className={SWATCH.participantes} />
        Participantes{" "}
        <strong className="text-base font-extrabold text-foreground">
          {o.participantes}
        </strong>
      </span>
      <span className="flex items-center gap-1.5">
        <Swatch className={SWATCH.publico} />
        Público{" "}
        <strong className="text-base font-extrabold text-foreground">{o.publico}</strong>
      </span>
      <span>
        Disponibles{" "}
        <strong className={`text-base font-extrabold ${tone || "text-foreground"}`}>
          {availableLabel(o)}
        </strong>
      </span>
      {action ? <span className="ml-auto">{action}</span> : null}
    </div>
  );
}

/** Celda «162 / 200» de la tabla de eventos, con su estado debajo. */
export function OccupancyCell({ occupancy: o }: { occupancy: Occupancy }) {
  const tone = occupancyTone(o);
  return (
    <>
      <div
        className={`text-sm font-extrabold ${
          o.sobrecupo > 0 ? "text-destructive" : "text-foreground"
        }`}
      >
        {o.ocupados} / {o.aforo}
      </div>
      <div className={`text-xs font-bold ${tone || "text-muted-foreground"}`}>
        {occupancyHint(o)}
      </div>
    </>
  );
}
