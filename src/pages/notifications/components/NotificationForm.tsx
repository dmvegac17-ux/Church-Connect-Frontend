import { useRef, useState, type FormEvent } from "react";

import { Button } from "../../../components/forms/Button";
import { Checkbox } from "../../../components/forms/Checkbox";
import { TextArea } from "../../../components/forms/TextArea";
import { TextField } from "../../../components/forms/TextField";
import { focusFirstError, required } from "../../../lib/validators";
import { UserSelect } from "./UserSelect";

export interface NotificationFormValues {
  usuarioId: string;
  titulo: string;
  mensaje: string;
  /** Solo aplica en edición; el backend siempre crea las notificaciones como no leídas. */
  leida: boolean;
}

interface NotificationFormProps {
  /** Valores iniciales (editar). Vacío para crear. */
  initial?: NotificationFormValues;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (values: NotificationFormValues) => void;
  onCancel: () => void;
  /** Errores por campo provenientes del backend (422 / 404). */
  serverErrors?: Record<string, string>;
  /**
   * En edición el destinatario no es modificable (regla del backend). Si se
   * provee, se muestra este texto fijo en vez del selector, y se habilita
   * el campo "leída".
   */
  lockedRecipientLabel?: string;
}

const EMPTY: NotificationFormValues = {
  usuarioId: "",
  titulo: "",
  mensaje: "",
  leida: false,
};

export function NotificationForm({
  initial,
  submitting,
  submitLabel,
  onSubmit,
  onCancel,
  serverErrors,
  lockedRecipientLabel,
}: NotificationFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<NotificationFormValues>(
    initial ?? EMPTY,
  );
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const errors = { ...clientErrors, ...serverErrors };

  const set = <K extends keyof NotificationFormValues>(
    name: K,
    value: NotificationFormValues[K],
  ) => setValues((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const next: Record<string, string> = {};
    if (!lockedRecipientLabel && !required(values.usuarioId)) {
      next.usuario_id = "Selecciona un destinatario.";
    }
    if (!required(values.titulo)) {
      next.titulo = "El título es obligatorio.";
    }
    if (!required(values.mensaje)) {
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
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
      {lockedRecipientLabel ? (
        <div>
          <span className="text-sm font-medium text-foreground">
            Destinatario
          </span>
          <p className="mt-1.5 rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-muted-foreground">
            {lockedRecipientLabel}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            El destinatario de una notificación no se puede cambiar;
            elimínala y créala de nuevo si necesitas enviarla a otro usuario.
          </p>
        </div>
      ) : (
        <UserSelect
          value={values.usuarioId}
          onChange={(id) => set("usuarioId", id)}
          error={errors.usuario_id}
        />
      )}

      <TextField
        label="Título"
        name="titulo"
        required
        value={values.titulo}
        onChange={(e) => set("titulo", e.target.value)}
        error={errors.titulo}
      />

      <TextArea
        label="Mensaje"
        name="mensaje"
        required
        rows={4}
        value={values.mensaje}
        onChange={(e) => set("mensaje", e.target.value)}
        error={errors.mensaje}
      />

      {lockedRecipientLabel ? (
        <Checkbox
          label="Marcar como leída"
          name="leida"
          checked={values.leida}
          onChange={(e) => set("leida", e.target.checked)}
        />
      ) : null}

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
