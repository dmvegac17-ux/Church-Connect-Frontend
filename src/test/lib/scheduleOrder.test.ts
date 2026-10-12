import { describe, expect, it } from "vitest";

import { firstFreeSlot, swapSlots } from "../../lib/scheduleOrder";

const day = "2030-01-10";
const at = (time: string) => `${day}T${time}`;
const slot = (start: string, end: string) => ({
  horaInicio: start ? at(start) : "",
  horaFin: end ? at(end) : "",
});

describe("swapSlots: reordenar dos actividades vecinas", () => {
  it("cada una conserva su duración y ocupan el mismo tramo", () => {
    // Alabanza 10:00–10:30 (30 min) · Estudio 10:30–11:30 (60 min)
    const { movedUp, movedDown } = swapSlots(slot("10:00", "10:30"), slot("10:30", "11:30"));

    // Estudio sube y empieza a las 10:00; Alabanza baja y termina a las 11:30.
    expect(movedUp).toEqual(slot("10:00", "11:00"));
    expect(movedDown).toEqual(slot("11:00", "11:30"));
  });

  it("con la misma duración simplemente intercambian sus horarios", () => {
    const { movedUp, movedDown } = swapSlots(slot("09:00", "10:00"), slot("10:00", "11:00"));

    expect(movedUp).toEqual(slot("09:00", "10:00"));
    expect(movedDown).toEqual(slot("10:00", "11:00"));
  });

  it("conserva el hueco que había entre las dos", () => {
    // 10:00–10:30, descanso, 11:00–12:00
    const { movedUp, movedDown } = swapSlots(slot("10:00", "10:30"), slot("11:00", "12:00"));

    expect(movedUp).toEqual(slot("10:00", "11:00"));
    // El descanso de 30 minutos queda ahora entre 11:00 y 11:30.
    expect(movedDown).toEqual(slot("11:30", "12:00"));
  });

  it("deshacer el movimiento devuelve los horarios originales", () => {
    const a = slot("10:00", "10:30");
    const b = slot("10:30", "11:30");
    const first = swapSlots(a, b);
    // Tras el primer intercambio, la que subió queda arriba.
    const back = swapSlots(first.movedUp, first.movedDown);

    expect(back.movedUp).toEqual(a);
    expect(back.movedDown).toEqual(b);
  });

  it("no altera los objetos originales", () => {
    const upper = slot("10:00", "10:30");
    const lower = slot("10:30", "11:30");
    swapSlots(upper, lower);

    expect(upper).toEqual(slot("10:00", "10:30"));
    expect(lower).toEqual(slot("10:30", "11:30"));
  });

  it.each([
    ["a una le falta la hora de fin", slot("10:00", ""), slot("10:30", "11:30")],
    ["una está vacía", slot("", ""), slot("10:30", "11:30")],
    ["estaban solapadas", slot("10:00", "11:00"), slot("10:30", "11:30")],
    ["estaban en desorden", slot("11:00", "12:00"), slot("09:00", "10:00")],
  ])("si %s, intercambian los horarios tal como están", (_caso, upper, lower) => {
    const { movedUp, movedDown } = swapSlots(upper, lower);

    expect(movedUp).toEqual(upper);
    expect(movedDown).toEqual(lower);
  });
});

describe("firstFreeSlot: dónde cabe una actividad nueva", () => {
  const start = at("10:00");
  const end = at("12:00");

  it("sin actividades, todo el horario del evento", () => {
    expect(firstFreeSlot([], start, end)).toEqual(slot("10:00", "12:00"));
  });

  it("empieza donde termina la última", () => {
    expect(firstFreeSlot([slot("10:00", "10:30")], start, end)).toEqual(
      slot("10:30", "12:00"),
    );
  });

  it("encuentra el primer hueco aunque esté en medio", () => {
    const rows = [slot("10:00", "10:30"), slot("11:00", "12:00")];

    expect(firstFreeSlot(rows, start, end)).toEqual(slot("10:30", "11:00"));
  });

  it("ve el hueco al principio", () => {
    expect(firstFreeSlot([slot("10:30", "12:00")], start, end)).toEqual(
      slot("10:00", "10:30"),
    );
  });

  it("no depende del orden de las filas", () => {
    const rows = [slot("11:00", "12:00"), slot("10:00", "10:30")];

    expect(firstFreeSlot(rows, start, end)).toEqual(slot("10:30", "11:00"));
  });

  it("con el horario completo no hay hueco", () => {
    const rows = [slot("10:00", "11:00"), slot("11:00", "12:00")];

    expect(firstFreeSlot(rows, start, end)).toBeNull();
  });

  it("ignora las actividades sin horario completo", () => {
    const rows = [slot("10:00", ""), slot("", "")];

    expect(firstFreeSlot(rows, start, end)).toEqual(slot("10:00", "12:00"));
  });

  it("lo que cae fuera del evento no ocupa su horario", () => {
    // Una actividad vieja de 08:00 a 10:30 solo ocupa de 10:00 a 10:30.
    expect(firstFreeSlot([slot("08:00", "10:30")], start, end)).toEqual(
      slot("10:30", "12:00"),
    );
    expect(firstFreeSlot([slot("12:00", "13:00")], start, end)).toEqual(
      slot("10:00", "12:00"),
    );
  });
});
