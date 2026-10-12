import type { PillTone } from "../components/ui/primitives";
import type { Schedule } from "../types/schedule";
import { isoToWall } from "./dateTimeRange";

/*
 * Cronogramas del panel de administración: las actividades agrupadas por
 * evento, con su estado, y cómo se ordenan, resumen y filtran. Funciones
 * puras; la pantalla solo las pinta.
 */

/** En qué está una actividad, según su responsable y el rango del evento. */
export type ActivityStatus =
  | "confirmado"
  | "pendiente"
  | "por_reconfirmar"
  | "rechazado"
  | "sin_respuesta"
  | "sin_asignar"
  | "fuera_de_rango";

interface StatusMeta {
  label: string;
  /** Para el resumen del evento: «3 confirmadas», «1 pendiente». */
  one: string;
  many: string;
  tone: PillTone;
  /** Requiere que el administrador haga algo. */
  attention: boolean;
}

export const ACTIVITY_STATUS: Record<ActivityStatus, StatusMeta> = {
  confirmado: { label: "Confirmado", one: "confirmada", many: "confirmadas", tone: "success", attention: false },
  pendiente: { label: "Pendiente", one: "pendiente", many: "pendientes", tone: "warning", attention: false },
  por_reconfirmar: { label: "Por reconfirmar", one: "por reconfirmar", many: "por reconfirmar", tone: "warning", attention: true },
  rechazado: { label: "Rechazado", one: "rechazada", many: "rechazadas", tone: "danger", attention: true },
  sin_respuesta: { label: "Sin respuesta", one: "sin respuesta", many: "sin respuesta", tone: "danger", attention: true },
  sin_asignar: { label: "Sin asignar", one: "sin asignar", many: "sin asignar", tone: "neutral", attention: true },
  fuera_de_rango: { label: "Fuera de rango", one: "fuera de rango", many: "fuera de rango", tone: "danger", attention: true },
};

/** Orden en que se nombran los estados en el resumen de un evento. */
const SUMMARY_ORDER: ActivityStatus[] = [
  "confirmado",
  "pendiente",
  "por_reconfirmar",
  "rechazado",
  "sin_respuesta",
  "sin_asignar",
  "fuera_de_rango",
];

export interface GroupedActivity extends Schedule {
  estado: ActivityStatus;
}

/** Un evento con todas sus actividades (`GET /schedules/agrupados`). */
export interface ScheduleGroup {
  evento: {
    id: string;
    titulo: string;
    /** ISO datetime. */
    fecha_inicio: string;
    fecha_fin: string;
    lugar: string;
  };
  actividades: GroupedActivity[];
}

/** "5 actividades · 3 confirmadas · 1 pendiente · 1 por reconfirmar". */
export function statusSummary(activities: readonly GroupedActivity[]): string {
  if (activities.length === 0) {
    return "Sin actividades";
  }
  const total = `${activities.length} ${activities.length === 1 ? "actividad" : "actividades"}`;
  const parts = SUMMARY_ORDER.map((status) => {
    const count = activities.filter((a) => a.estado === status).length;
    const meta = ACTIVITY_STATUS[status];
    return count ? `${count} ${count === 1 ? meta.one : meta.many}` : "";
  }).filter(Boolean);
  return [total, ...parts].join(" · ");
}

/** Alguna actividad necesita que el administrador haga algo. */
export function needsAttention(activities: readonly GroupedActivity[]): boolean {
  return activities.some((a) => ACTIVITY_STATUS[a.estado].attention);
}

export function isPast(group: ScheduleGroup, now: Date = new Date()): boolean {
  return new Date(group.evento.fecha_fin).getTime() < now.getTime();
}

/** Próximos: del más cercano al más lejano. Pasados: del más reciente al más antiguo. */
export function splitGroups(
  groups: readonly ScheduleGroup[],
  now: Date = new Date(),
): { upcoming: ScheduleGroup[]; past: ScheduleGroup[] } {
  const start = (g: ScheduleGroup) => new Date(g.evento.fecha_inicio).getTime();
  return {
    upcoming: groups.filter((g) => !isPast(g, now)).sort((a, b) => start(a) - start(b)),
    past: groups.filter((g) => isPast(g, now)).sort((a, b) => start(b) - start(a)),
  };
}

/** Texto comparable: sin tildes ni mayúsculas. */
function plain(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export interface GroupFilters {
  /** Busca en el nombre de la actividad o del evento. */
  q: string;
  eventoId: string;
  estado: ActivityStatus | "";
  responsable: string;
}

/**
 * Aplica los filtros combinados. Sin filtros de actividad se conservan
 * también los eventos vacíos; con ellos, solo los eventos donde alguna
 * actividad coincide (y solo esas actividades). Si la búsqueda coincide con
 * el nombre del evento, valen todas sus actividades.
 */
export function filterGroups(
  groups: readonly ScheduleGroup[],
  { q, eventoId, estado, responsable }: GroupFilters,
): ScheduleGroup[] {
  const needle = plain(q.trim());
  const narrowing = Boolean(needle || estado || responsable);

  return groups
    .filter((group) => !eventoId || group.evento.id === eventoId)
    .map((group) => {
      const eventMatches = needle !== "" && plain(group.evento.titulo).includes(needle);
      return {
        ...group,
        actividades: group.actividades.filter(
          (a) =>
            (!estado || a.estado === estado) &&
            (!responsable || a.responsable === responsable) &&
            (!needle || eventMatches || plain(a.actividad).includes(needle)),
        ),
      };
    })
    .filter((group) => !narrowing || group.actividades.length > 0);
}

/** Responsables que aparecen en algún cronograma, en orden alfabético. */
export function responsiblesOf(groups: readonly ScheduleGroup[]): string[] {
  return [
    ...new Set(groups.flatMap((g) => g.actividades.map((a) => a.responsable))),
  ].sort((a, b) => a.localeCompare(b, "es"));
}

/** Actividades por día (hora de Colombia), en orden. */
export function byDay(
  activities: readonly GroupedActivity[],
): { date: string; items: GroupedActivity[] }[] {
  const days: { date: string; items: GroupedActivity[] }[] = [];
  const sorted = [...activities].sort(
    (a, b) => new Date(a.hora_inicio).getTime() - new Date(b.hora_inicio).getTime(),
  );
  for (const activity of sorted) {
    const date = isoToWall(activity.hora_inicio).split("T")[0];
    const last = days[days.length - 1];
    if (last?.date === date) {
      last.items.push(activity);
    } else {
      days.push({ date, items: [activity] });
    }
  }
  return days;
}
