import { describe, expect, it } from "vitest";

import { textChanged } from "../../lib/eventChanges";

/*
 * Los mismos casos que `test_text_changed_distingue_retoques_de_cambios` del
 * backend: la regla debe dar igual en los dos lados.
 */
const CASES: [string | null, string | null, boolean][] = [
  // Retoques: no cuentan.
  ["Templo central", "Templo central", false],
  ["Templo central", "TEMPLO CENTRAL", false],
  ["Salón social", "Salon social", false],
  ["Templo centrl", "Templo central", false],
  ["Finca La Esperansa", "Finca la Esperanza", false],
  ["Parques del Río", "Parques de Rio", false],
  ["Templo de prueba", "Templo de preuba", false],
  ["Templo de prueba", "  Templo  de  prueba. ", false],
  ["Cale 10 # 5-20, Barrio Centro", "Calle 10 # 5-20, barrio centro", false],
  ["", null, false],
  [null, "   ", false],
  // Cambios reales: cuentan.
  ["Templo central", "Templo norte", true],
  ["Salón social", "Salón comunal", true],
  ["Templo", "Templo central", true],
  ["Sede sur", "Sede sub", true],
  ["Salón 1", "Salón 2", true],
  ["Calle 10 # 5-20", "Calle 10 # 5-21", true],
  ["Calle 100", "Calle 10", true],
  [null, "Calle 10 # 5-20", true],
  ["Calle 10 # 5-20", "", true],
];

describe("textChanged: retoques frente a cambios reales", () => {
  it.each(CASES)("%j → %j: cambio = %s", (before, after, changed) => {
    expect(textChanged(before, after)).toBe(changed);
    // No depende de en qué sentido se haga la corrección.
    expect(textChanged(after, before)).toBe(changed);
  });
});
