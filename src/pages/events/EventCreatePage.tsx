import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { useToast } from "../../components/feedback/useToast";
import { Card, PageHeader } from "../../components/layout/Page";
import { fromDatetimeLocalValue } from "../../lib/format";
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

    const payload: CreateEventDTO = {
      titulo: values.titulo.trim(),
      descripcion: values.descripcion.trim(),
      lugar: values.lugar.trim(),
      fecha_inicio: fromDatetimeLocalValue(values.fechaInicio),
      fecha_fin: fromDatetimeLocalValue(values.fechaFin),
      capacidad: Number(values.capacidad),
    };

    setSubmitting(true);
    try {
      const created = await eventService.create(payload);
      toast.success(`El evento "${created.titulo}" fue creado.`, "Evento creado");
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
    <div>
      <PageHeader title="Nuevo evento" backTo="/events" />

      <Card className="max-w-2xl">
        {error ? (
          <div className="mb-4">
            <ErrorAlert error={error} onClose={() => setError(null)} />
          </div>
        ) : null}

        <EventForm
          submitting={submitting}
          submitLabel="Crear evento"
          serverErrors={fieldErrors}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/events")}
        />
      </Card>
    </div>
  );
}
