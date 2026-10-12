/*
 * Qué cambios de un evento se avisan a sus inscritos. Es la misma regla del
 * backend (`src/application/events/date_change.py`), que es quien decide y
 * envía; aquí solo sirve para anticiparle al administrador que habrá aviso.
 * Si una cambia, la otra debe cambiar igual.
 */

/** Palabras que no cambian de qué sitio se habla. */
const EMPTY_WORDS = new Set(["el", "la", "los", "las", "de", "del", "y", "en", "a", "al"]);

/** Minúsculas, sin tildes ni signos, sin palabras vacías. */
function words(value: string | null | undefined): string[] {
  const plain = (value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Mn}/gu, "");
  return (plain.match(/[a-z0-9]+/g) ?? []).filter((word) => !EMPTY_WORDS.has(word));
}

/**
 * Ediciones para pasar de `a` a `b`: insertar, borrar o cambiar una letra, o
 * intercambiar dos vecinas (el error de tecleo más común).
 */
function distance(a: string, b: string): number {
  let previous2: number[] = [];
  let previous = Array.from({ length: b.length + 1 }, (_, j) => j);

  for (let i = 1; i <= a.length; i++) {
    const current = [i];
    for (let j = 1; j <= b.length; j++) {
      let cost = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        cost = Math.min(cost, previous2[j - 2] + 1);
      }
      current.push(cost);
    }
    previous2 = previous;
    previous = current;
  }
  return previous[b.length];
}

/** Iguales, o tan parecidas que solo puede ser una corrección de tecleo. */
function sameWord(a: string, b: string): boolean {
  if (a === b) {
    return true;
  }
  // Los números identifican el sitio (calle 10 no es calle 11), y en una
  // palabra de hasta tres letras una letra distinta ya es otra palabra.
  const length = Math.max(a.length, b.length);
  if (length <= 3 || /\d/.test(a + b)) {
    return false;
  }
  return distance(a, b) <= Math.max(1, Math.floor(length / 4));
}

/**
 * `true` si el texto de un lugar o una dirección cambió de verdad.
 *
 * No cuentan: mayúsculas, tildes, signos, espacios, artículos y
 * preposiciones, ni corregir una errata («Templo centrl» → «Templo
 * central»). Sí cuentan: cualquier número distinto, una palabra de más o de
 * menos, o una palabra que pasa a ser otra.
 */
export function textChanged(
  before: string | null | undefined,
  after: string | null | undefined,
): boolean {
  const a = words(before);
  const b = words(after);
  if (a.length !== b.length) {
    return true;
  }
  return !a.every((word, i) => sameWord(word, b[i]));
}
