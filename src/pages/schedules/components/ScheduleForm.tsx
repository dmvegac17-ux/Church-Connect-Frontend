import { useRef, useState, type FormEvent } from "react";

import { Button } from "../../../components/forms/Button";
import { TextField } from "../../../components/forms/TextField";
import { focusFirstError, required } from "../../../lib/validators";
import { EventSelect } from "./EventSelect";
import { TimeSelect } from "./TimeSelect";

export interface ScheduleFormValues {
  eventoId: string;
  actividad: string;
  /** `<input type="date">` (`YYYY-MM-DD`) + `TimeSelect` (`HH:mm`), hora local del navegador. */
  fechaInicio: string;
  horaInicio: string;
  fechaFin: string;
  horaFin: string;
  responsable: string;
}

interface ScheduleFormProps {
  /** Valores iniciales (editar). Vacío para crear. */
  initial?: ScheduleFormValues;
  submitting: boolean;
  submitLabel: string;
  onSubmit: (values: ScheduleFormValues) => void;
  onCancel: () => void;
  /** Errores por campo provenientes del backend (422 / 400). */
  serverErrors?: Record<string, string>;
  /**
   * En edición el evento no es modificable (regla del backend). Si se
   * provee, se muestra este título fijo en vez del selector.
   */
  lockedEventTitle?: string;
}

const EMPTY: ScheduleFormValues = {
  eventoId: "",
  actividad: "",
  fechaInicio: "",
  horaInicio: "",
  fechaFin: "",
  horaFin: "",
  responsable: "",
};

export function ScheduleForm({
  initial,
  submitting,
  submitLabel,
  onSubmit,
  onCancel,
  serverErrors,
  lockedEventTitle,
}: ScheduleFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<ScheduleFormValues>(initial ?? EMPTY);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});

  const errors = { ...clientErrors, ...serverErrors };

  const set = (name: keyof ScheduleFormValues, value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const next: Record<string, string> = {};
    if (!lockedEventTitle && !required(values.eventoId)) {
      next.evento_id = "Selecciona un evento.";
    }
    if (!required(values.actividad)) {
      next.actividad = "La actividad es obligatoria.";
    }
    if (!required(values.fechaInicio)) {
      next.fecha_inicio = "La fecha de inicio es obligatoria.";
    }
    if (!required(values.horaInicio)) {
      next.hora_inicio = "La hora de inicio es obligatoria.";
    }
    if (!required(values.fechaFin)) {
      next.fecha_fin = "La fecha de fin es obligatoria.";
    }
    if (!required(values.horaFin)) {
      next.hora_fin = "La hora de fin es obligatoria.";
    } else if (
      required(values.fechaInicio) &&
      required(values.horaInicio) &&
      required(values.fechaFin) &&
      new Date(`${values.fechaFin}T${values.horaFin}`) <=
        new Date(`${values.fechaInicio}T${values.horaInicio}`)
    ) {
      next.hora_fin = "Debe ser posterior a la hora de inicio.";
    }
    if (!required(values.responsable)) {
      next.responsable = "El responsable es obligatorio.";
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
      {lockedEventTitle ? (
        <div>
          <span className="text-sm font-medium text-foreground">Evento</span>
          <p className="mt-1.5 rounded-lg border border-border bg-muted px-3 py-2.5 text-sm text-muted-foreground">
            {lockedEventTitle}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            El evento de un cronograma no se puede cambiar; elimínalo y
            créalo de nuevo si necesitas moverlo a otro evento.
          </p>
        </div>
      ) : (
        <EventSelect
          value={values.eventoId}
          onChange={(id) => set("eventoId", id)}
          error={errors.evento_id}
        />
      )}

      <TextField
        label="Actividad"
        name="actividad"
        required
        value={values.actividad}
        onChange={(e) => set("actividad", e.target.value)}
        error={errors.actividad}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Fecha de inicio"
          name="fecha_inicio"
          type="date"
          required
          value={values.fechaInicio}
          onChange={(e) => set("fechaInicio", e.target.value)}
          error={errors.fecha_inicio}
        />
        <TimeSelect
          label="Hora de inicio"
          name="hora_inicio"
          value={values.horaInicio}
          onChange={(v) => set("horaInicio", v)}
          error={errors.hora_inicio}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Fecha de fin"
          name="fecha_fin"
          type="date"
          required
          value={values.fechaFin}
          onChange={(e) => set("fechaFin", e.target.value)}
          error={errors.fecha_fin}
        />
        <TimeSelect
          label="Hora de fin"
          name="hora_fin"
          value={values.horaFin}
          onChange={(v) => set("horaFin", v)}
          error={errors.hora_fin}
        />
      </div>

      <TextField
        label="Responsable"
        name="responsable"
        required
        value={values.responsable}
        onChange={(e) => set("responsable", e.target.value)}
        error={errors.responsable}
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
