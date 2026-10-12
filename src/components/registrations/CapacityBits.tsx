import { CircleCheck, Lock, UserCheck, type LucideIcon } from "lucide-react";

import {
  CAPACITY_LEVELS,
  memberCapacity,
  type MemberCapacity,
} from "../../lib/capacity";
import type { Event } from "../../types/event";

/* Cupos de un evento tal como los ve el miembro: nunca el aforo total. */

/** El evento ya empezó: no se inscribe ni se cancela. */
export function hasStarted(event: Event, now: Date = new Date()): boolean {
  return new Date(event.fecha_inicio).getTime() <= now.getTime();
}

interface ChipMeta {
  text: string;
  icon: LucideIcon;
  className: string;
}

function chipFor(event: Event, capacity: MemberCapacity): ChipMeta {
  const level = CAPACITY_LEVELS[capacity.level];
  const closedChip = {
    text: "Inscripciones cerradas",
    icon: Lock,
    className: "bg-muted text-text-secondary",
  };

  // Empezado, ya no importa la situación de cada quien.
  if (hasStarted(event)) {
    return closedChip;
  }
  if (event.aforo.participa) {
    return {
      text: "Participas en este evento",
      icon: UserCheck,
      className: "bg-info-soft text-info-foreground",
    };
  }
  if (event.aforo.inscrito) {
    return {
      text: `Estás inscrito · ${capacity.text}`,
      icon: CircleCheck,
      className: "bg-success-soft text-success-foreground",
    };
  }
  // Pasó la fecha límite: quien ya estaba inscrito lo sigue viendo arriba.
  if (event.aforo.inscripciones_cerradas) {
    return closedChip;
  }
  if (capacity.level === "out") {
    return { text: "Cupos agotados", icon: level.icon, className: level.chip };
  }
  if (capacity.level === "low") {
    return {
      text: `Pocos cupos · quedan ${capacity.disponibles} de ${capacity.cupo}`,
      icon: level.icon,
      className: level.chip,
    };
  }
  return { text: capacity.text, icon: level.icon, className: level.chip };
}

/** Chip de cupos de la tarjeta de evento: siempre con icono y texto. */
export function CapacityChip({
  event,
  className = "h-7 text-[13px]",
}: {
  event: Event;
  className?: string;
}) {
  const chip = chipFor(event, memberCapacity(event));
  const Icon = chip.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 font-bold ${chip.className} ${className}`}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {chip.text}
    </span>
  );
}

/** Barra de ocupación de la tarjeta. Decorativa: el chip ya lo dice en texto. */
export function CapacityCardBar({ event }: { event: Event }) {
  const closedForMe = event.aforo.inscripciones_cerradas && !event.aforo.inscrito;
  if (hasStarted(event) || event.aforo.participa || closedForMe) {
    return null;
  }
  const capacity = memberCapacity(event);

  return (
    <span aria-hidden="true" className="block h-1.5 overflow-hidden rounded-full bg-muted">
      <span
        className={`block h-full rounded-full ${CAPACITY_LEVELS[capacity.level].bar}`}
        style={{ width: `${capacity.percent}%` }}
      />
    </span>
  );
}

/** «Quedan 38 de 188 cupos» con su nivel y la barra de progreso. */
export function CapacityMeter({ event }: { event: Event }) {
  const capacity = memberCapacity(event);
  const level = CAPACITY_LEVELS[capacity.level];
  const Icon = level.icon;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[15px] font-bold">{capacity.text}</span>
        <span
          className={`inline-flex h-6 items-center gap-1 rounded-full px-2 text-xs font-extrabold ${level.chip}`}
        >
          <Icon className="size-[15px]" aria-hidden="true" />
          {level.label}
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Cupos ocupados"
        aria-valuenow={capacity.ocupados}
        aria-valuemin={0}
        aria-valuemax={capacity.cupo}
        className="h-2 overflow-hidden rounded-full bg-muted"
      >
        <div
          className={`h-full rounded-full ${level.bar}`}
          style={{ width: `${capacity.percent}%` }}
        />
      </div>
    </div>
  );
}
