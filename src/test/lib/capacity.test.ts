import { describe, expect, it } from "vitest";

import { event, memberEvent } from "../fixtures";
import {
  assignmentNotice,
  memberCapacity,
  occupancyHint,
  occupancyOf,
  seatsLeftText,
} from "../../lib/capacity";

describe("memberCapacity: lo que ve el miembro", () => {
  it("aforo 200 con 12 participantes y 150 inscritos: quedan 38 de 188", () => {
    const capacity = memberCapacity(memberEvent(188, 38));

    expect(capacity.text).toBe("Quedan 38 de 188 cupos");
    expect(capacity.level).toBe("ok");
    expect(capacity.ocupados).toBe(150);
    expect(capacity.percent).toBe(80);
  });

  it("con 10 % o menos del cupo libre son «pocos cupos»", () => {
    expect(memberCapacity(memberEvent(100, 10)).level).toBe("low");
    expect(memberCapacity(memberEvent(100, 11)).level).toBe("ok");
    expect(memberCapacity(memberEvent(56, 1)).level).toBe("low");
  });

  it("sin cupos queda agotado, también con sobrecupo", () => {
    const full = memberCapacity(memberEvent(188, 0));
    expect(full.level).toBe("out");
    expect(full.text).toBe("No quedan cupos (188 de 188 ocupados)");
    expect(full.percent).toBe(100);

    // El backend nunca envía negativos al miembro; aun así no se desborda.
    expect(memberCapacity(memberEvent(188, -3)).disponibles).toBe(0);
  });

  it("un cupo de cero no divide por cero", () => {
    const none = memberCapacity(memberEvent(0, 0));
    expect(none.level).toBe("out");
    expect(none.percent).toBe(100);
  });
});

describe("seatsLeftText", () => {
  it("concuerda en número", () => {
    expect(seatsLeftText(38)).toBe("Quedan 38 cupos.");
    expect(seatsLeftText(1)).toBe("Queda 1 cupo.");
    expect(seatsLeftText(0)).toBe("No quedan cupos.");
  });
});

describe("occupancyOf: lo que ve el administrador", () => {
  it("resta participantes y público del aforo total", () => {
    const o = occupancyOf(event());

    expect(o).toMatchObject({
      aforo: 200,
      participantes: 12,
      publico: 150,
      ocupados: 162,
      disponibles: 38,
      sobrecupo: 0,
      lleno: false,
    });
    expect(occupancyHint(o)).toBe("38 disponibles");
  });

  it("lleno cuando lo ocupado iguala el aforo", () => {
    const o = occupancyOf(event({ aforo: { publico: 188 } }));

    expect(o.lleno).toBe(true);
    expect(occupancyHint(o)).toBe("Lleno");
  });

  it("sobrecupo cuando participantes y público superan el aforo", () => {
    const o = occupancyOf(event({ aforo: { participantes: 15, publico: 188 } }));

    expect(o.disponibles).toBe(-3);
    expect(o.sobrecupo).toBe(3);
    expect(o.lleno).toBe(false);
    expect(occupancyHint(o)).toBe("Sobrecupo: 3");
  });
});

describe("assignmentNotice: avisos al asignar un participante", () => {
  const ana = { nombre: "Ana Prueba", inscrito: false, participa: false };
  const lleno = occupancyOf(event({ aforo: { publico: 188 } }));

  it("sin aviso cuando hay cupo y no estaba inscrita", () => {
    expect(assignmentNotice(ana, occupancyOf(event()))).toBeNull();
    expect(assignmentNotice(null, lleno)).toBeNull();
  });

  it("su inscripción se reemplaza: no ocupa un lugar más aunque esté lleno", () => {
    expect(assignmentNotice({ ...ana, inscrito: true }, lleno)).toEqual({
      kind: "info",
      text: "Ana Prueba está inscrito como público. Su inscripción se reemplazará por la participación.",
    });
  });

  it("evento lleno: avisa del sobrecupo que quedará", () => {
    expect(assignmentNotice(ana, lleno)).toEqual({
      kind: "warn",
      text: "El evento está lleno. Si continúas quedará con sobrecupo de 1.",
    });

    const yaExcedido = occupancyOf(event({ aforo: { participantes: 14, publico: 188 } }));
    expect(assignmentNotice(ana, yaExcedido)?.text).toMatch(/sobrecupo de 3\./);
  });

  it("quien ya participa en otra actividad no cuenta dos veces", () => {
    expect(assignmentNotice({ ...ana, participa: true }, lleno)).toBeNull();
  });
});
