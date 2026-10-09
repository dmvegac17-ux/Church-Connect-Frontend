/** Nombre completo a partir de `nombre` + `apellido` (este último puede venir nulo). */
export function fullNameOf(person: {
  nombre: string;
  apellido?: string | null;
}): string {
  return `${person.nombre} ${person.apellido ?? ""}`.trim();
}

/** Iniciales para el avatar: primera letra de las dos primeras palabras. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "?";
  }
  const first = words[0][0] ?? "";
  const second = words.length > 1 ? (words[1][0] ?? "") : "";
  return (first + second).toUpperCase();
}

/** Coincidencia de búsqueda por nombre, apellido o correo (sin distinguir mayúsculas ni acentos). */
export function matchesPerson(
  person: { nombre: string; apellido?: string | null; correo: string },
  query: string,
): boolean {
  const q = normalizeText(query);
  if (!q) {
    return true;
  }
  return (
    normalizeText(fullNameOf(person)).includes(q) ||
    person.correo.toLowerCase().includes(q)
  );
}

export function normalizeText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}
