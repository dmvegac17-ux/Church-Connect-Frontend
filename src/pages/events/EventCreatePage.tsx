import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { useToast } from "../../components/feedback/useToast";
import { PageHeader } from "../../components/layout/Page";
import { Breadcrumb } from "../../components/ui/primitives";
import { fromDateAndTimeValues } from "../../lib/format";
import { parseValidationErrors } from "../../lib/formErrors";
import { eventService } from "../../services/eventService";
import { ApiError } from "../../types/api";
import type { CreateEventDTO } from "../../types/event";
import { EventForm, type EventFormValues } from "./components/EventForm";

export function EventCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [error, setError] = useState<unknown>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: EventFormValues) => {
    setError(null);
    setFieldErrors({});

    const latitud = values.latitud.trim();
    const longitud = values.longitud.trim();

    const payload: CreateEventDTO = {
      titulo: values.titulo.trim(),
      descripcion: values.descripcion.trim(),
      lugar: values.lugar.trim(),
      direccion: values.direccion.trim() || null,
      latitud: latitud ? Number(latitud) : null,
      longitud: longitud ? Number(longitud) : null,
      fecha_inicio: fromDateAndTimeValues(values.fechaInicio, values.horaInicio),
      fecha_fin: fromDateAndTimeValues(values.fechaFin, values.horaFin),
      capacidad: Number(values.capacidad),
    };

    setSubmitting(true);
    try {
      const created = await eventService.create(payload);
      toast.notify({
        variant: "success",
        message: `Evento «${created.titulo}» creado.`,
        actionLabel: "Crear cronograma",
        onAction: () =>
          navigate(`/events/${created.id}`, { state: { openSchedule: true } }),
      });
      navigate(`/events/${created.id}`, { replace: true });
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
    <div className="flex max-w-[860px] flex-col gap-5">
      <Breadcrumb to="/events" label="Eventos" current="Nuevo evento" />
      <PageHeader
        title="Nuevo evento"
        description="Completa la información, la fecha y el lugar. Después podrás crear su cronograma."
      />

      {error ? <ErrorAlert error={error} onClose={() => setError(null)} /> : null}

      <EventForm
        submitting={submitting}
        submitLabel="Crear evento"
        serverErrors={fieldErrors}
        onSubmit={handleSubmit}
        onCancel={() => navigate("/events")}
      />
    </div>
  );
}
