import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { FullPageSpinner } from "../../components/feedback/Spinner";
import { useToast } from "../../components/feedback/useToast";
import { Card, PageHeader } from "../../components/layout/Page";
import { useEventOptions } from "../../hooks/useEventOptions";
import { useSchedule } from "../../hooks/useSchedule";
import { fromDateAndTimeValues, toDateAndTimeValues } from "../../lib/format";
import { parseValidationErrors } from "../../lib/formErrors";
import { scheduleService } from "../../services/scheduleService";
import { ApiError } from "../../types/api";
import type { UpdateScheduleDTO } from "../../types/schedule";
import {
  ScheduleForm,
  type ScheduleFormValues,
} from "./components/ScheduleForm";

export function ScheduleEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { schedule, isLoading, error: loadError } = useSchedule(id);
  const { events } = useEventOptions();

  const [error, setError] = useState<unknown>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return <FullPageSpinner label="Cargando cronograma…" />;
  }

  if (loadError || !schedule || !id) {
    return (
      <div>
        <PageHeader title="Editar cronograma" backTo="/schedules" />
        <ErrorAlert
          error={loadError ?? new Error("No se pudo cargar el cronograma.")}
        />
      </div>
    );
  }

  const { date: fechaInicio, time: horaInicio } = toDateAndTimeValues(
    schedule.hora_inicio,
  );
  const { date: fechaFin, time: horaFin } = toDateAndTimeValues(
    schedule.hora_fin,
  );

  const initial: ScheduleFormValues = {
    eventoId: schedule.evento_id,
    actividad: schedule.actividad,
    fechaInicio,
    horaInicio,
    fechaFin,
    horaFin,
    responsable: schedule.responsable,
  };

  const eventTitle =
    events.find((e) => e.id === schedule.evento_id)?.titulo ??
    schedule.evento_id;

  const handleSubmit = async (values: ScheduleFormValues) => {
    setError(null);
    setFieldErrors({});

    const actividad = values.actividad.trim();
    const responsable = values.responsable.trim();
    const horaInicioIso = fromDateAndTimeValues(
      values.fechaInicio,
      values.horaInicio,
    );
    const horaFinIso = fromDateAndTimeValues(values.fechaFin, values.horaFin);

    const payload: UpdateScheduleDTO = {};
    if (actividad !== schedule.actividad) {
      payload.actividad = actividad;
    }
    if (responsable !== schedule.responsable) {
      payload.responsable = responsable;
    }
    if (
      new Date(horaInicioIso).getTime() !==
      new Date(schedule.hora_inicio).getTime()
    ) {
      payload.hora_inicio = horaInicioIso;
    }
    if (
      new Date(horaFinIso).getTime() !== new Date(schedule.hora_fin).getTime()
    ) {
      payload.hora_fin = horaFinIso;
    }

    if (Object.keys(payload).length === 0) {
      toast.info("No hay cambios por guardar.", "Sin cambios");
      return;
    }

    setSubmitting(true);
    try {
      await scheduleService.update(id, payload);
      toast.success(
        "Los cambios se guardaron correctamente.",
        "Cronograma actualizado",
      );
      navigate("/schedules", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.isValidation) {
        setFieldErrors(parseValidationErrors(err).fieldErrors);
      }
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={`Editar: ${schedule.actividad}`}
        backTo="/schedules"
      />

      <Card className="max-w-2xl">
        {error ? (
          <div className="mb-4">
            <ErrorAlert error={error} onClose={() => setError(null)} />
          </div>
        ) : null}

        <ScheduleForm
          initial={initial}
          lockedEventTitle={eventTitle}
          submitting={submitting}
          submitLabel="Guardar cambios"
          serverErrors={fieldErrors}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/schedules")}
        />
      </Card>
    </div>
  );
}
