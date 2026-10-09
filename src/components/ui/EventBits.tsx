import { CalendarCheck, CalendarX } from "lucide-react";

import { activitiesLabel, type EventDateInfo } from "../../lib/eventDates";
import { Pill } from "./primitives";

const SIZES = {
  sm: { box: "w-[46px] rounded-[9px] py-[5px]", month: "text-[11px]", day: "text-lg" },
  md: { box: "w-[60px] rounded-[10px] py-2", month: "text-xs", day: "text-2xl" },
  lg: { box: "w-[68px] rounded-xl py-2.5", month: "text-xs", day: "text-[28px]" },
};

/** Bloque de fecha (mes + día). En varios días muestra el rango: "14–16 OCT". */
export function DateBlock({
  info,
  size = "md",
  solid = false,
}: {
  info: EventDateInfo;
  size?: keyof typeof SIZES;
  /** Fondo verde sólido (tarjeta de próximo evento). */
  solid?: boolean;
}) {
  const s = SIZES[size];
  const tone = solid
    ? "bg-primary text-primary-foreground"
    : info.isPast
      ? "bg-muted text-text-secondary"
      : "bg-primary-soft text-primary-hover";
  const isRange = info.day.includes("–");

  return (
    <span
      aria-hidden="true"
      className={`block shrink-0 text-center ${s.box} ${tone} ${
        isRange ? "!w-auto min-w-[60px] px-2" : ""
      }`}
    >
      <span className={`block font-extrabold tracking-[0.06em] ${s.month}`}>
        {info.month}
      </span>
      <span
        className={`block leading-[1.1] font-extrabold whitespace-nowrap ${
          isRange ? "text-base" : s.day
        }`}
      >
        {info.day}
      </span>
      {info.spanLabel ? (
        <span className="mt-0.5 block text-[10px] font-extrabold whitespace-nowrap">
          {info.spanLabel}
        </span>
      ) : null}
    </span>
  );
}

/** Próximo / En curso / Finalizado. */
export function EventStatusPill({ info }: { info: EventDateInfo }) {
  return (
    <Pill tone={info.isPast ? "neutral" : "success"} className="!h-[22px] !px-2">
      {info.statusLabel}
    </Pill>
  );
}

/**
 * Estado del cronograma de un evento. En admin "Sin cronograma" es un
 * pendiente (aviso); para el miembro es solo informativo.
 */
export function ScheduleCountPill({
  count,
  warnWhenEmpty = false,
  prefix = false,
}: {
  count: number;
  warnWhenEmpty?: boolean;
  /** Antepone "Cronograma · " al conteo. */
  prefix?: boolean;
}) {
  if (count > 0) {
    return (
      <Pill tone="success" icon={CalendarCheck}>
        {prefix ? "Cronograma · " : ""}
        {activitiesLabel(count)}
      </Pill>
    );
  }
  return (
    <Pill tone={warnWhenEmpty ? "warning" : "sand"} icon={CalendarX}>
      Sin cronograma
    </Pill>
  );
}
