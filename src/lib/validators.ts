const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

export function required(value: string): boolean {
  return value.trim().length > 0;
}

/** Enfoca el primer campo con error dentro de un formulario. */
export function focusFirstError(form: HTMLFormElement | null): void {
  if (!form) {
    return;
  }
  const invalid = form.querySelector<HTMLElement>('[aria-invalid="true"]');
  invalid?.focus();
}
