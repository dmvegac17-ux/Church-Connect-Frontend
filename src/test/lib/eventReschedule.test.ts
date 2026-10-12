import { describe, expect, it } from "vitest";

import {
  adjustmentsOf,
  overlapping,
  planActivities,
  shiftText,
  unresolved,
} from "../../lib/eventReschedule";

// Evento del 14 nov, de 15:00 a 20:00 (UTC, para leer fácil).
const OLD_START = "2026-11-14T15:00:00.000Z";
const at = (day: number, time: string) => `2026-11-${day}T${time}:00.000Z`;
const activity = (id: string, day: number, start: string, end: string) => ({
  id,
  hora_inicio: at(day, start),
  hora_fin: at(day, end),
});
const ACTIVITIES = [
  activity("a", 14, "15:00", "16:00"),
  activity("b", 14, "19:00", "20:00"),
];

describe("planActivities", () => {
  it("al ampliar el rango no cambia nada", () => {
    const plan = planActivities(ACTIVITIES, OLD_START, at(14, "14:00"), at(14, "21:00"), false, {});

    expect(plan.every((p) => !p.outside && !p.moved && !p.removed)).toBe(true);
    expect(adjustmentsOf(plan)).toEqual([]);
  });

  it("al mover el evento, las actividades se corren lo mismo", () => {
    // Dos días después, mismo horario.
    const plan = planActivities(ACTIVITIES, OLD_START, at(16, "15:00"), at(16, "20:00"), true, {});

    expect(plan.map((p) => p.start)).toEqual([at(16, "15:00"), at(16, "19:00")]);
    expect(unresolved(plan)).toEqual([]);
    expect(adjustmentsOf(plan)).toEqual([
      { id: "a", hora_inicio: at(16, "15:00"), hora_fin: at(16, "16:00") },
      { id: "b", hora_inicio: at(16, "19:00"), hora_fin: at(16, "20:00") },
    ]);
  });

  it("sin moverlas con el evento, todas quedan fuera y sin resolver", () => {
    const plan = planActivities(ACTIVITIES, OLD_START, at(16, "15:00"), at(16, "20:00"), false, {});

    expect(unresolved(plan).map((p) => p.schedule.id)).toEqual(["a", "b"]);
  });

  it("al acortar, la que queda fuera exige una decisión", () => {
    // El evento ahora termina a las 18:00: «b» (19:00–20:00) no cabe.
    const end = at(14, "18:00");
    const pending = planActivities(ACTIVITIES, OLD_START, OLD_START, end, true, {});
    expect(unresolved(pending).map((p) => p.schedule.id)).toEqual(["b"]);

    const fitted = planActivities(ACTIVITIES, OLD_START, OLD_START, end, true, { b: "fit" });
    expect(unresolved(fitted)).toEqual([]);
    // Conserva su duración, pegada al final del evento.
    expect(adjustmentsOf(fitted)).toEqual([
      { id: "b", hora_inicio: at(14, "17:00"), hora_fin: at(14, "18:00") },
    ]);

    const removed = planActivities(ACTIVITIES, OLD_START, OLD_START, end, true, { b: "remove" });
    expect(adjustmentsOf(removed)).toEqual([{ id: "b", eliminar: true }]);
  });

  it("si la actividad dura más que el evento, se recorta a él", () => {
    const long = [activity("c", 14, "15:00", "20:00")];

    const plan = planActivities(long, OLD_START, at(14, "16:00"), at(14, "18:00"), false, {
      c: "fit",
    });

    expect([plan[0].start, plan[0].end]).toEqual([at(14, "16:00"), at(14, "18:00")]);
  });

  it("detecta si un ajuste cruza dos actividades", () => {
    const three = [...ACTIVITIES, activity("c", 14, "17:00", "18:00")];
    const plan = planActivities(three, OLD_START, OLD_START, at(14, "18:00"), true, { b: "fit" });

    const clash = overlapping(plan);
    expect(clash?.map((p) => p.schedule.id).sort()).toEqual(["b", "c"]);
    // Eliminándola ya no hay cruce.
    expect(
      overlapping(
        planActivities(three, OLD_START, OLD_START, at(14, "18:00"), true, { b: "remove" }),
      ),
    ).toBeNull();
  });
});

describe("shiftText", () => {
  it("dice cuánto y hacia dónde se movió el inicio", () => {
    expect(shiftText(OLD_START, at(16, "15:00"))).toBe("2 días después");
    expect(shiftText(OLD_START, at(14, "13:30"))).toBe("1 h 30 min antes");
    expect(shiftText(OLD_START, at(15, "16:00"))).toBe("1 día 1 h después");
    expect(shiftText(OLD_START, OLD_START)).toBe("");
  });
});
