import {
  Circle,
  CircleAlert,
  CircleCheck,
  Info,
  Pencil,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";

import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "../../lib/validators";

export type FormStatusKind =
  | "saving"
  | "error"
  | "incomplete"
  | "dirty"
  | "clean";

interface FormStatusInput {
  saving?: boolean;
  /** Se intentó enviar con errores. */
  submitted?: boolean;
  errorCount: number;
  dirty: boolean;
}

export function formStatusKind({
  saving,
  submitted,
  errorCount,
  dirty,
}: FormStatusInput): FormStatusKind {
  if (saving) {
    return "saving";
  }
  if (errorCount > 0) {
    return submitted ? "error" : "incomplete";
  }
  return dirty ? "dirty" : "clean";
}

const META: Record<FormStatusKind, { icon: LucideIcon; color: string }> = {
  saving: { icon: RefreshCw, color: "text-text-secondary" },
  error: { icon: CircleAlert, color: "text-destructive" },
  incomplete: { icon: Info, color: "text-warning-foreground" },
  dirty: { icon: Pencil, color: "text-warning-foreground" },
  clean: { icon: CircleCheck, color: "text-success-foreground" },
};

/**
 * Línea de estado del pie de un formulario: dice por qué el botón de
 * guardar está (o no) disponible.
 */
export function FormStatus({
  cleanText = "Sin cambios por guardar.",
  ...input
}: FormStatusInput & { cleanText?: string }) {
  const kind = formStatusKind(input);
  const { icon: Icon, color } = META[kind];
  const text: Record<FormStatusKind, string> = {
    saving: "Guardando cambios…",
    error:
      input.errorCount === 1
        ? "Revisa el campo marcado."
        : `Revisa los ${input.errorCount} campos marcados.`,
    incomplete: "Completa o corrige los campos obligatorios para continuar.",
    dirty: "Tienes cambios sin guardar.",
    clean: cleanText,
  };

  return (
    <p
      role="status"
      className={`flex min-w-0 items-center gap-1.5 text-sm ${color}`}
    >
      <Icon className="size-[18px] shrink-0" aria-hidden="true" />
      <span>{text[kind]}</span>
    </p>
  );
}

/** Requisitos de contraseña marcados en vivo. */
export function PasswordRules({
  password,
  confirm,
}: {
  password: string;
  confirm: string;
}) {
  const lengthOk =
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= PASSWORD_MAX_LENGTH;
  const matchOk = password.length > 0 && password === confirm;
  const rules = [
    {
      ok: lengthOk,
      pending: password.length === 0,
      label: `Entre ${PASSWORD_MIN_LENGTH} y ${PASSWORD_MAX_LENGTH} caracteres`,
    },
    {
      ok: matchOk,
      pending: confirm.length === 0,
      label: "Las contraseñas coinciden",
    },
  ];

  return (
    <ul aria-live="polite" className="flex flex-wrap gap-x-5 gap-y-1.5">
      {rules.map((rule) => {
        const Icon = rule.ok ? CircleCheck : rule.pending ? Circle : CircleAlert;
        return (
          <li
            key={rule.label}
            className={`flex items-center gap-1.5 text-sm ${
              rule.ok
                ? "text-success-foreground"
                : rule.pending
                  ? "text-muted-foreground"
                  : "text-destructive"
            }`}
          >
            <Icon className="size-[18px]" aria-hidden="true" />
            {rule.label}
            <span className="sr-only">
              {rule.ok ? " (cumplido)" : " (pendiente)"}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

/** `true` si la contraseña y su confirmación cumplen los dos requisitos. */
export function passwordPairValid(password: string, confirm: string): boolean {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    password.length <= PASSWORD_MAX_LENGTH &&
    password === confirm
  );
}
