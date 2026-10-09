import { User } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";

import { Button } from "../../../components/forms/Button";
import { Checkbox } from "../../../components/forms/Checkbox";
import { RichTextEditor } from "../../../components/forms/RichTextEditor";
import { TextField } from "../../../components/forms/TextField";
import { htmlToPlainText } from "../../../lib/htmlText";
import { focusFirstError, maxLength, required } from "../../../lib/validators";
import { NOTIFICATION_TITULO_MAX_LENGTH } from "../../../types/notification";

export interface NotificationFormValues {
  titulo: string;
  mensaje: string;
  leida: boolean;
}

interface NotificationFormProps {
  initial: NotificationFormValues;
  /** El destinatario de una notificación no es modificable (regla del backend); se muestra fijo. */
  recipientLabel: string;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (values: NotificationFormValues) => void;
  onCancel: () => void;
  /** Errores por campo provenientes del backend (422 / 404). */
  serverErrors?: Record<string, string>;
}

export function NotificationForm({
  initial,
  recipientLabel,
  submitting,
  submitLabel,
  onSubmit,
  onCancel,
  serverErrors,
}: NotificationFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<NotificationFormValues>(initial);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const errors = { ...clientErrors, ...serverErrors };

  const set = <K extends keyof NotificationFormValues>(
    name: K,
    value: NotificationFormValues[K],
  ) => setValues((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const next: Record<string, string> = {};
    if (!required(values.titulo)) {
      next.titulo = "El título es obligatorio.";
    } else if (!maxLength(values.titulo, NOTIFICATION_TITULO_MAX_LENGTH)) {
      next.titulo = `El título no puede superar los ${NOTIFICATION_TITULO_MAX_LENGTH} caracteres.`;
    }
    if (!required(htmlToPlainText(values.mensaje))) {
      next.mensaje = "El mensaje es obligatorio.";
    }

    setClientErrors(next);
    if (Object.keys(next).length > 0) {
      requestAnimationFrame(() => focusFirstError(formRef.current));
      return;
    }

    onSubmit(values);
  };

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-6">
      <section className="space-y-1.5 rounded-xl border border-border/70 bg-muted/30 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <User className="size-4 text-primary" aria-hidden="true" />
          Destinatario
        </div>
        <p className="text-sm text-foreground">{recipientLabel}</p>
        <p className="text-xs text-muted-foreground">
          No se puede cambiar el destinatario de una notificación ya enviada.
        </p>
      </section>

      <section className="space-y-3 rounded-xl border border-border/70 bg-muted/30 p-4">
        <TextField
          label="Título"
          name="titulo"
          required
          maxLength={NOTIFICATION_TITULO_MAX_LENGTH}
          value={values.titulo}
          onChange={(e) => set("titulo", e.target.value)}
          error={errors.titulo}
          hint={`${values.titulo.length}/${NOTIFICATION_TITULO_MAX_LENGTH}`}
        />

        <RichTextEditor
          label="Mensaje"
          required
          initialValue={initial.mensaje}
          onChange={(html) => set("mensaje", html)}
          error={errors.mensaje}
        />
      </section>

      <section className="flex items-center justify-between gap-3 rounded-xl border border-border/70 bg-muted/30 p-4">
        <div>
          <p className="text-sm font-medium text-foreground">Estado</p>
          <p className="text-xs text-muted-foreground">
            Indica si el destinatario ya la leyó.
          </p>
        </div>
        <Checkbox
          label="Leída"
          name="leida"
          checked={values.leida}
          onChange={(e) => set("leida", e.target.checked)}
        />
      </section>

      <div className="flex flex-col-reverse gap-3 pt-1 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          className="w-full sm:w-auto"
        >
          Cancelar
        </Button>
        <Button type="submit" loading={submitting} className="w-full sm:w-auto">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
