import { useRef, useState, type FormEvent } from "react";

import { Button } from "../../../components/forms/Button";
import { TextArea } from "../../../components/forms/TextArea";
import { TextField } from "../../../components/forms/TextField";
import { focusFirstError, required } from "../../../lib/validators";
import { MINISTRY_NAME_MAX } from "../../../types/ministry";

export interface MinistryFormValues {
  nombre: string;
  descripcion: string;
}

interface MinistryFormProps {
  /** Valores iniciales (editar). Vacío para crear. */
  initial?: MinistryFormValues;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (values: MinistryFormValues) => void;
  onCancel: () => void;
  /** Errores por campo provenientes del backend (422 / 409). */
  serverErrors?: Record<string, string>;
}

const EMPTY: MinistryFormValues = { nombre: "", descripcion: "" };

export function MinistryForm({
  initial,
  submitting,
  submitLabel,
  onSubmit,
  onCancel,
  serverErrors,
}: MinistryFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<MinistryFormValues>(initial ?? EMPTY);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const errors = { ...clientErrors, ...serverErrors };

  const set = (name: keyof MinistryFormValues, value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const next: Record<string, string> = {};
    if (!required(values.nombre)) {
      next.nombre = "El nombre es obligatorio.";
    } else if (values.nombre.trim().length > MINISTRY_NAME_MAX) {
      next.nombre = `Máximo ${MINISTRY_NAME_MAX} caracteres.`;
    }
    setClientErrors(next);
    if (Object.keys(next).length > 0) {
      requestAnimationFrame(() => focusFirstError(formRef.current));
      return;
    }

    onSubmit(values);
  };

  const nombreLen = values.nombre.trim().length;

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
      <div>
        <TextField
          label="Nombre"
          name="nombre"
          required
          maxLength={MINISTRY_NAME_MAX}
          value={values.nombre}
          onChange={(e) => set("nombre", e.target.value)}
          error={errors.nombre}
        />
        <p className="mt-1 text-right text-xs text-muted-foreground">
          {nombreLen}/{MINISTRY_NAME_MAX}
        </p>
      </div>

      <TextArea
        label="Descripción"
        name="descripcion"
        rows={4}
        hint="Opcional. Deja el campo vacío para no asignar descripción."
        value={values.descripcion}
        onChange={(e) => set("descripcion", e.target.value)}
        error={errors.descripcion}
      />

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
