import { Armchair, Ban, Hourglass, type LucideIcon } from "lucide-react";

import type { Event } from "../types/event";

/*
 * Reglas de aforo.
 *   Participantes     = personas distintas asignadas a actividades del evento
 *   Cupo para público = aforo total − participantes
 *   Disponibles       = cupo para público − público inscrito
 *   Sobrecupo         = participantes + público > aforo total
 * Las cifras las calcula el backend; aquí solo se presentan.
 */

/** Con 10 % o menos del cupo libre, el evento va con «pocos cupos». */
const LOW_RATIO = 0.1;

export type CapacityLevel = "ok" | "low" | "out";

interface LevelMeta {
  label: string;
  icon: LucideIcon;
  /** Clases del chip (fondo y texto). */
  chip: string;
  /** Clase del tramo ocupado de la barra. */
  bar: string;
}

export const CAPACITY_LEVELS: Record<CapacityLevel, LevelMeta> = {
  ok: {
    label: "Disponible",
    icon: Armchair,
    chip: "bg-success-soft text-success-foreground",
    bar: "bg-primary",
  },
  low: {
    label: "Pocos cupos",
    icon: Hourglass,
    chip: "bg-warning-soft text-warning-foreground",
    bar: "bg-warning-bar",
  },
  out: {
    label: "Agotado",
    icon: Ban,
    chip: "bg-destructive-tint text-destructive-hover",
    bar: "bg-destructive",
  },
};

/** Lo que ve un miembro: su cupo y lo que queda. Nunca el aforo total. */
export interface MemberCapacity {
  cupo: number;
  disponibles: number;
  ocupados: number;
  level: CapacityLevel;
  /** «Quedan 38 de 188 cupos» o «No quedan cupos (188 de 188 ocupados)». */
  text: string;
  /** Ancho del tramo ocupado, de 0 a 100. */
  percent: number;
}

export function memberCapacity(event: Event): MemberCapacity {
  const cupo = Math.max(0, event.aforo.cupo_publico);
  const disponibles = Math.max(0, Math.min(cupo, event.aforo.disponibles));
  const level: CapacityLevel =
    disponibles <= 0 ? "out" : disponibles / cupo <= LOW_RATIO ? "low" : "ok";

  return {
    cupo,
    disponibles,
    ocupados: cupo - disponibles,
    level,
    text:
      disponibles <= 0
        ? `No quedan cupos (${cupo} de ${cupo} ocupados)`
        : `Quedan ${disponibles} de ${cupo} cupos`,
    percent: cupo
      ? Math.min(100, Math.round(((cupo - disponibles) / cupo) * 100))
      : 100,
  };
}

/** «Quedan 3 cupos» / «Queda 1 cupo» / «No quedan cupos» (sin punto final). */
export function seatsLeftPhrase(left: number): string {
  if (left <= 0) {
    return "No quedan cupos";
  }
  return left === 1 ? "Queda 1 cupo" : `Quedan ${left} cupos`;
}

/** La misma frase, como oración. */
export function seatsLeftText(left: number): string {
  return `${seatsLeftPhrase(left)}.`;
}

/** Lo que ve el administrador: las cuatro cifras, con sobrecupo si lo hay. */
export interface Occupancy {
  aforo: number;
  participantes: number;
  publico: number;
  ocupados: number;
  /** Negativo cuando hay sobrecupo. */
  disponibles: number;
  sobrecupo: number;
  lleno: boolean;
}

export function occupancyOf(event: Event): Occupancy {
  const participantes = event.aforo.participantes ?? 0;
  const publico = event.aforo.publico ?? 0;
  const ocupados = participantes + publico;
  const disponibles = event.capacidad - ocupados;

  return {
    aforo: event.capacidad,
    participantes,
    publico,
    ocupados,
    disponibles,
    sobrecupo: Math.max(0, -disponibles),
    lleno: disponibles === 0,
  };
}

/** Texto bajo «162 / 200» en las tablas: disponibles, lleno o sobrecupo. */
export function occupancyHint(o: Occupancy): string {
  if (o.sobrecupo > 0) {
    return `Sobrecupo: ${o.sobrecupo}`;
  }
  return o.lleno ? "Lleno" : `${o.disponibles} disponibles`;
}

/** Color del texto de ocupación: rojo en sobrecupo, ámbar si está lleno. */
export function occupancyTone(o: Occupancy): string {
  if (o.sobrecupo > 0) {
    return "text-destructive";
  }
  return o.lleno ? "text-warning-foreground" : "";
}

export type AssignmentNotice =
  | { kind: "info"; text: string }
  | { kind: "warn"; text: string };

/**
 * Aviso antes de asignar a alguien como participante: su inscripción se
 * reemplaza, o el evento queda con sobrecupo. Quien ya participa en otra
 * actividad no ocupa un lugar más.
 */
export function assignmentNotice(
  person: { nombre: string; inscrito: boolean; participa: boolean } | null,
  occupancy: Occupancy | null,
): AssignmentNotice | null {
  if (!person || person.participa) {
    return null;
  }
  if (person.inscrito) {
    return {
      kind: "info",
      text: `${person.nombre} está inscrito como público. Su inscripción se reemplazará por la participación.`,
    };
  }
  if (occupancy && occupancy.disponibles <= 0) {
    return {
      kind: "warn",
      text: `El evento está lleno. Si continúas quedará con sobrecupo de ${occupancy.sobrecupo + 1}.`,
    };
  }
  return null;
}
