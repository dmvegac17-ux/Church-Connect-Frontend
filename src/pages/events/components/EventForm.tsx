import { useRef, useState, type FormEvent } from "react";

import { Button } from "../../../components/forms/Button";
import { TextArea } from "../../../components/forms/TextArea";
import { TextField } from "../../../components/forms/TextField";
import { focusFirstError, required } from "../../../lib/validators";

export interface EventFormValues {
  titulo: string;
  descripcion: string;
  /** Valores de `<input type="datetime-local">` (hora local del navegador). */
  fechaInicio: string;
  fechaFin: string;
  lugar: string;
  /** Como string de input; se convierte a número al enviar. */
  capacidad: string;
}

interface EventFormProps {
  /** Valores iniciales (editar). Vacío para crear. */
  initial?: EventFormValues;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (values: EventFormValues) => void;
  onCancel: () => void;
  /** Errores por campo provenientes del backend (422). */
  serverErrors?: Record<string, string>;
}

const EMPTY: EventFormValues = {
  titulo: "",
  descripcion: "",
  fechaInicio: "",
  fechaFin: "",
  lugar: "",
  capacidad: "",
};

export function EventForm({
  initial,
  submitting,
  submitLabel,
  onSubmit,
  onCancel,
  serverErrors,
}: EventFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<EventFormValues>(initial ?? EMPTY);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const errors = { ...clientErrors, ...serverErrors };

  const set = (name: keyof EventFormValues, value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const next: Record<string, string> = {};
    if (!required(values.titulo)) {
      next.titulo = "El título es obligatorio.";
    }
    if (!required(values.descripcion)) {
      next.descripcion = "La descripción es obligatoria.";
    }
    if (!required(values.lugar)) {
      next.lugar = "El lugar es obligatorio.";
    }
    if (!required(values.fechaInicio)) {
      next.fecha_inicio = "La fecha de inicio es obligatoria.";
    }
    if (!required(values.fechaFin)) {
      next.fecha_fin = "La fecha de fin es obligatoria.";
    }
    const capacidadNum = Number(values.capacidad);
    if (
      !required(values.capacidad) ||
      !Number.isInteger(capacidadNum) ||
      capacidadNum <= 0
    ) {
      next.capacidad = "Ingresa un número entero mayor a 0.";
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
      <TextField
        label="Título"
        name="titulo"
        required
        value={values.titulo}
        onChange={(e) => set("titulo", e.target.value)}
        error={errors.titulo}
      />

      <TextArea
        label="Descripción"
        name="descripcion"
        required
        rows={4}
        value={values.descripcion}
        onChange={(e) => set("descripcion", e.target.value)}
        error={errors.descripcion}
      />

      <TextField
        label="Lugar"
        name="lugar"
        required
        value={values.lugar}
        onChange={(e) => set("lugar", e.target.value)}
        error={errors.lugar}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Fecha de inicio"
          name="fecha_inicio"
          type="datetime-local"
          required
          value={values.fechaInicio}
          onChange={(e) => set("fechaInicio", e.target.value)}
          error={errors.fecha_inicio}
        />
        <TextField
          label="Fecha de fin"
          name="fecha_fin"
          type="datetime-local"
          required
          value={values.fechaFin}
          onChange={(e) => set("fechaFin", e.target.value)}
          error={errors.fecha_fin}
        />
      </div>

      <TextField
        label="Capacidad"
        name="capacidad"
        type="number"
        min={1}
        step={1}
        required
        value={values.capacidad}
        onChange={(e) => set("capacidad", e.target.value)}
        error={errors.capacidad}
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
