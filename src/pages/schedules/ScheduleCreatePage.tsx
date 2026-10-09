import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { useToast } from "../../components/feedback/useToast";
import { Card, PageHeader } from "../../components/layout/Page";
import { fromDateAndTimeValues } from "../../lib/format";
import { parseValidationErrors } from "../../lib/formErrors";
import { scheduleService } from "../../services/scheduleService";
import { ApiError } from "../../types/api";
import type { CreateScheduleDTO } from "../../types/schedule";
import {
  ScheduleForm,
  type ScheduleFormValues,
} from "./components/ScheduleForm";

export function ScheduleCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [error, setError] = useState<unknown>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: ScheduleFormValues) => {
    setError(null);
    setFieldErrors({});

    const payload: CreateScheduleDTO = {
      evento_id: values.eventoId,
      actividad: values.actividad.trim(),
      descripcion: values.descripcion.trim() || null,
      hora_inicio: fromDateAndTimeValues(values.fechaInicio, values.horaInicio),
      hora_fin: fromDateAndTimeValues(values.fechaFin, values.horaFin),
      responsable: values.responsable.trim(),
    };

    setSubmitting(true);
    try {
      const created = await scheduleService.create(payload);
      toast.success(
        `El cronograma "${created.actividad}" fue creado.`,
        "Cronograma creado",
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
      <PageHeader title="Nuevo cronograma" backTo="/schedules" />

      <Card className="max-w-2xl">
        {error ? (
          <div className="mb-4">
            <ErrorAlert error={error} onClose={() => setError(null)} />
          </div>
        ) : null}

        <ScheduleForm
          submitting={submitting}
          submitLabel="Crear cronograma"
          serverErrors={fieldErrors}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/schedules")}
        />
      </Card>
    </div>
  );
}
