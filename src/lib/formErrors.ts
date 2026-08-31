import { ApiError } from "../types/api";

export type FieldErrors = Record<string, string>;

/**
 * Convierte los `errors` de una respuesta 422 (`"body.correo: value is not a
 * valid email address"`) en un mapa `{ correo: "mensaje" }` para pintarlo en
 * cada campo. Los detalles que no matchean un campo se devuelven aparte.
 */
export function parseValidationErrors(error: unknown): {
  fieldErrors: FieldErrors;
  generic: string[];
} {
  const fieldErrors: FieldErrors = {};
  const generic: string[] = [];

  if (!(error instanceof ApiError)) {
    return { fieldErrors, generic };
  }

  for (const detail of error.errors) {
    const match = /^(?:body|query|path)\.([\w[\]]+)\s*:\s*(.+)$/i.exec(detail);
    if (match) {
      const field = match[1];
      if (!fieldErrors[field]) {
        fieldErrors[field] = match[2].trim();
      }
    } else {
      generic.push(detail);
    }
  }

  return { fieldErrors, generic };
}
