import { describe, expect, it } from "vitest";

import {
  activitiesOutside,
  adjustEnd,
  dayBlocked,
  endBounds,
  endIsValid,
  hourEnabled,
  isoToWall,
  minuteEnabled,
  monthGrid,
  periodEnabled,
  rangeSummary,
  resolveTime,
  startBounds,
  timeWindow,
  to12Hour,
  to24Hour,
  wallToIso,
} from "../../lib/dateTimeRange";

const DAY = "2026-11-14";
const NEXT = "2026-11-15";
/** Ventana del fin, el mismo día, para un inicio dado. */
const endWindow = (start: string, date = DAY) =>
  timeWindow(date, endBounds(`${DAY}T${start}`, {}, 1));

describe("12 h ↔ 24 h", () => {
  it("12:00 a. m. es medianoche y 12:00 p. m. es mediodía", () => {
    expect(to24Hour(12, 0, "AM")).toBe("00:00");
    expect(to24Hour(12, 0, "PM")).toBe("12:00");
    expect(to24Hour(1, 5, "PM")).toBe("13:05");
    expect(to24Hour(11, 59, "PM")).toBe("23:59");
  });

  it("un valor guardado se muestra en 12 h con su a. m./p. m.", () => {
    expect(to12Hour("00:15")).toEqual({ hour12: 12, minute: 15, period: "AM" });
    expect(to12Hour("12:00")).toEqual({ hour12: 12, minute: 0, period: "PM" });
    expect(to12Hour("15:30")).toEqual({ hour12: 3, minute: 30, period: "PM" });
  });

  it("la hora de Colombia va y vuelve del ISO sin depender del navegador", () => {
    expect(wallToIso("2026-11-14T15:30")).toBe("2026-11-14T20:30:00.000Z");
    expect(isoToWall("2026-11-14T20:30:00Z")).toBe("2026-11-14T15:30");
    // Cerca de medianoche el día también es el de Colombia.
    expect(isoToWall("2026-11-15T03:00:00Z")).toBe("2026-11-14T22:00");
  });
});

describe("fin el mismo día que el inicio", () => {
  it("inicio 11:30 a. m. → fin 11:15 a. m. bloqueado", () => {
    const window = endWindow("11:30")!;

    expect(minuteEnabled(11, "AM", 15, window)).toBe(false);
    expect(minuteEnabled(11, "AM", 30, window)).toBe(false);
    expect(minuteEnabled(11, "AM", 31, window)).toBe(true);
    expect(hourEnabled(10, "AM", window)).toBe(false);
    expect(endIsValid(`${DAY}T11:30`, `${DAY}T11:15`, 1)).toBe(false);
  });

  it("inicio 11:30 a. m. → fin 12:00 p. m. permitido", () => {
    const window = endWindow("11:30")!;

    expect(periodEnabled("PM", window)).toBe(true);
    expect(hourEnabled(12, "PM", window)).toBe(true);
    expect(minuteEnabled(12, "PM", 0, window)).toBe(true);
    expect(endIsValid(`${DAY}T11:30`, `${DAY}T12:00`, 1)).toBe(true);
  });

  it("con inicio p. m., el a. m. del fin queda bloqueado", () => {
    const window = endWindow("15:45")!;

    expect(periodEnabled("AM", window)).toBe(false);
    expect(periodEnabled("PM", window)).toBe(true);
    // A las 3 p. m. solo quedan los minutos posteriores al inicio.
    expect(hourEnabled(3, "PM", window)).toBe(true);
    expect(minuteEnabled(3, "PM", 45, window)).toBe(false);
    expect(minuteEnabled(3, "PM", 46, window)).toBe(true);
    expect(hourEnabled(2, "PM", window)).toBe(false);
  });

  it("al elegir la hora, el minuto se recalcula al primero que cabe", () => {
    const window = endWindow("15:45")!;

    expect(resolveTime(3, 0, "PM", window)).toBe("15:46");
    expect(resolveTime(4, 0, "PM", window)).toBe("16:00");
  });

  it("la duración mínima es configurable", () => {
    const window = timeWindow(DAY, endBounds(`${DAY}T15:45`, {}, 15))!;

    expect(minuteEnabled(3, "PM", 55, window)).toBe(false);
    expect(minuteEnabled(4, "PM", 0, window)).toBe(true);
  });
});

describe("fin en otro día", () => {
  it("inicio 10:00 p. m. día 1, fin 1:00 a. m. día 2 → permitido", () => {
    const window = timeWindow(NEXT, endBounds(`${DAY}T22:00`, {}, 1))!;

    expect(window).toEqual([0, 23 * 60 + 59]);
    expect(periodEnabled("AM", window)).toBe(true);
    expect(endIsValid(`${DAY}T22:00`, `${NEXT}T01:00`, 1)).toBe(true);
  });

  it("un día de fin anterior al inicio queda bloqueado en el calendario", () => {
    const bounds = endBounds(`${DAY}T10:00`, {}, 1);

    expect(dayBlocked("2026-11-13", bounds)).toBe(true);
    expect(dayBlocked(DAY, bounds)).toBe(false);
    expect(dayBlocked(NEXT, bounds)).toBe(false);
  });

  it("si el inicio es a las 11:59 p. m., ese día ya no sirve para el fin", () => {
    expect(dayBlocked(DAY, endBounds(`${DAY}T23:59`, {}, 1))).toBe(true);
  });
});

describe("hoy y el pasado", () => {
  it("los días anteriores a hoy y las horas que ya pasaron quedan bloqueados", () => {
    const bounds = startBounds({ min: `${DAY}T15:20` }, 1);

    expect(dayBlocked("2026-11-13", bounds)).toBe(true);
    const today = timeWindow(DAY, bounds)!;
    expect(periodEnabled("AM", today)).toBe(false);
    expect(hourEnabled(2, "PM", today)).toBe(false);
    expect(minuteEnabled(3, "PM", 19, today)).toBe(false);
    expect(minuteEnabled(3, "PM", 20, today)).toBe(true);
    // Mañana, cualquier hora.
    expect(timeWindow(NEXT, bounds)).toEqual([0, 23 * 60 + 59]);
  });
});

describe("actividad dentro del evento", () => {
  // Evento del 14 nov 3:00 p. m. al 15 nov 8:00 p. m.
  const event = { min: `${DAY}T15:00`, max: `${NEXT}T20:00` };

  it("los días fuera del evento quedan bloqueados", () => {
    const bounds = startBounds(event, 1);

    expect(dayBlocked("2026-11-13", bounds)).toBe(true);
    expect(dayBlocked("2026-11-16", bounds)).toBe(true);
    expect(dayBlocked(DAY, bounds)).toBe(false);
  });

  it("el primer día bloquea antes del inicio y el último después del fin", () => {
    const first = timeWindow(DAY, startBounds(event, 1))!;
    expect(hourEnabled(2, "PM", first)).toBe(false);
    expect(hourEnabled(3, "PM", first)).toBe(true);

    const last = timeWindow(NEXT, endBounds(`${NEXT}T10:00`, event, 1))!;
    expect(hourEnabled(8, "PM", last)).toBe(true);
    expect(minuteEnabled(8, "PM", 1, last)).toBe(false);
    expect(hourEnabled(9, "PM", last)).toBe(false);
  });

  it("el inicio deja sitio para terminar antes del fin del evento", () => {
    const last = timeWindow(NEXT, startBounds(event, 1))!;

    expect(minuteEnabled(7, "PM", 59, last)).toBe(true);
    expect(minuteEnabled(8, "PM", 0, last)).toBe(false);
  });

  it("detecta las que quedan fuera al acortar el evento", () => {
    const activities = [
      { id: "a", hora_inicio: wallToIso(`${DAY}T15:00`), hora_fin: wallToIso(`${DAY}T16:00`) },
      { id: "b", hora_inicio: wallToIso(`${DAY}T18:00`), hora_fin: wallToIso(`${DAY}T19:00`) },
      { id: "c", hora_inicio: wallToIso(`${NEXT}T19:00`), hora_fin: wallToIso(`${NEXT}T20:00`) },
    ];

    // El evento pasa a ser del 14 nov 4:00 p. m. al 14 nov 9:00 p. m.
    const outside = activitiesOutside(
      activities,
      wallToIso(`${DAY}T16:00`),
      wallToIso(`${DAY}T21:00`),
    );

    expect(outside.map((a) => a.id)).toEqual(["a", "c"]);
  });
});

describe("ajuste del fin al mover el inicio", () => {
  it("si el fin queda inválido, pasa a inicio + duración mínima", () => {
    expect(adjustEnd(`${DAY}T16:00`, `${DAY}T15:00`, 15)).toBe(`${DAY}T16:15`);
    expect(adjustEnd(`${DAY}T16:00`, `${DAY}T16:00`, 1)).toBe(`${DAY}T16:01`);
  });

  it("si sigue siendo válido o falta algo, no se toca", () => {
    expect(adjustEnd(`${DAY}T16:00`, `${DAY}T18:00`, 15)).toBeNull();
    expect(adjustEnd(`${DAY}T16:00`, "", 15)).toBeNull();
  });

  it("cruza al día siguiente y no pasa del máximo", () => {
    expect(adjustEnd(`${DAY}T23:50`, `${DAY}T10:00`, 15)).toBe(`${NEXT}T00:05`);
    expect(adjustEnd(`${DAY}T19:55`, `${DAY}T10:00`, 15, `${DAY}T20:00`)).toBe(`${DAY}T20:00`);
  });
});

describe("textos", () => {
  it("resume el rango con su duración", () => {
    expect(rangeSummary(`${DAY}T15:30`, `${DAY}T18:00`)).toBe(
      "Sáb 14 nov 2026, 3:30 p. m. → 6:00 p. m. (2 h 30 min)",
    );
    expect(rangeSummary(`${DAY}T22:00`, `${NEXT}T01:00`)).toBe(
      "Sáb 14 nov 2026, 10:00 p. m. → Dom 15 nov 2026, 1:00 a. m. (3 h)",
    );
    expect(rangeSummary(`${DAY}T15:30`, "")).toBe("");
  });

  it("el calendario va de lunes a domingo", () => {
    const weeks = monthGrid(2026, 10); // noviembre de 2026 empieza en domingo

    expect(weeks[0]).toEqual([null, null, null, null, null, null, "2026-11-01"]);
    expect(weeks[1][0]).toBe("2026-11-02");
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
  });
});
