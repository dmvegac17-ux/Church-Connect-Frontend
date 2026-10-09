const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PERSON_NAME_RE =
  /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+( [A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$/;
const PHONE_RE = /^\+?\d{7,15}$/;

export const PERSON_NAME_MIN = 2;
export const PERSON_NAME_MAX = 50;
export const EMAIL_MAX = 100;
/** 15 dígitos + el `+` opcional. */
export const PHONE_MAX = 16;
export const PHONE_PLACEHOLDER = "+573001234567";

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function required(value: string): boolean {
  return value.trim().length > 0;
}

export function maxLength(value: string, max: number): boolean {
  return value.length <= max;
}

/* ── Saneado mientras se escribe ─────────────────────────────────────── */

/** Solo letras (con acentos, ü y ñ) y espacios simples; máximo 50. */
export function sanitizePersonName(value: string): string {
  return value
    .replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ ]/g, "")
    .replace(/ {2,}/g, " ")
    .replace(/^ /, "")
    .slice(0, PERSON_NAME_MAX);
}

/** Sin espacios; máximo 100. */
export function sanitizeEmail(value: string): string {
  return value.replace(/\s/g, "").slice(0, EMAIL_MAX);
}

/** Solo dígitos y un `+` al inicio; máximo 16 caracteres. */
export function sanitizePhone(value: string): string {
  const plus = value.trimStart().startsWith("+") ? "+" : "";
  return (plus + value.replace(/\D/g, "")).slice(0, PHONE_MAX);
}

/* ── Validadores por campo: devuelven el mensaje, o `undefined` si es válido ── */

/** `subject` distingue el formulario propio ("tu") del de otra persona ("el"). */
export function personNameError(
  value: string,
  field: "nombre" | "apellido" = "nombre",
  subject: "tu" | "el" = "el",
): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return `Ingresa ${subject} ${field}.`;
  }
  if (!PERSON_NAME_RE.test(trimmed)) {
    return "Usa solo letras, sin números ni caracteres especiales.";
  }
  if (trimmed.length < PERSON_NAME_MIN) {
    return "Debe tener al menos 2 letras.";
  }
  if (trimmed.length > PERSON_NAME_MAX) {
    return `Máximo ${PERSON_NAME_MAX} caracteres.`;
  }
  return undefined;
}

export function emailError(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return "Ingresa el correo.";
  }
  if (trimmed.length > EMAIL_MAX) {
    return `Máximo ${EMAIL_MAX} caracteres.`;
  }
  if (!EMAIL_RE.test(trimmed)) {
    return "Escribe un correo válido, por ejemplo nombre@dominio.com.";
  }
  return undefined;
}

/** El teléfono es opcional: vacío es válido. */
export function phoneError(value: string): string | undefined {
  const trimmed = value.trim();
  if (trimmed && !PHONE_RE.test(trimmed)) {
    return "Usa solo números (7 a 15) y, si quieres, el indicativo con + al inicio.";
  }
  return undefined;
}

export const DUPLICATE_EMAIL_MESSAGE = "Ya existe un usuario con este correo.";

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 20;

/** Devuelve el mensaje de error de longitud de contraseña, o undefined si es válida. */
export function passwordLengthError(value: string): string | undefined {
  if (value.length < PASSWORD_MIN_LENGTH) {
    return `Usa al menos ${PASSWORD_MIN_LENGTH} caracteres.`;
  }
  if (value.length > PASSWORD_MAX_LENGTH) {
    return `Usa máximo ${PASSWORD_MAX_LENGTH} caracteres.`;
  }
  return undefined;
}

/** Quita las claves sin mensaje para poder contar los errores reales. */
export function compactErrors(
  errors: Record<string, string | undefined>,
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(errors)) {
    if (value) {
      result[key] = value;
    }
  }
  return result;
}

/** Enfoca el primer campo con error dentro de un formulario. */
export function focusFirstError(form: HTMLFormElement | null): void {
  if (!form) {
    return;
  }
  const invalid = form.querySelector<HTMLElement>('[aria-invalid="true"]');
  invalid?.focus();
}
