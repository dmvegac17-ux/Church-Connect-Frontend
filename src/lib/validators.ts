const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function required(value: string): boolean {
  return value.trim().length > 0;
}

export function maxLength(value: string, max: number): boolean {
  return value.length <= max;
}

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

/** Enfoca el primer campo con error dentro de un formulario. */
export function focusFirstError(form: HTMLFormElement | null): void {
  if (!form) {
    return;
  }
  const invalid = form.querySelector<HTMLElement>('[aria-invalid="true"]');
  invalid?.focus();
}
