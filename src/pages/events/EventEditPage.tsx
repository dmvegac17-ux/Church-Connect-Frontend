import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { FullPageSpinner } from "../../components/feedback/Spinner";
import { useToast } from "../../components/feedback/useToast";
import { Card, PageHeader } from "../../components/layout/Page";
import { useEvent } from "../../hooks/useEvent";
import {
  fromDatetimeLocalValue,
  toDatetimeLocalValue,
} from "../../lib/format";
import { parseValidationErrors } from "../../lib/formErrors";
import { eventService } from "../../services/eventService";
import { ApiError } from "../../types/api";
import type { UpdateEventDTO } from "../../types/event";
import { EventForm, type EventFormValues } from "./components/EventForm";

export function EventEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { event, isLoading, error: loadError } = useEvent(id);

  const [error, setError] = useState<unknown>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return <FullPageSpinner label="Cargando evento…" />;
  }

  if (loadError || !event || !id) {
    return (
      <div>
        <PageHeader title="Editar evento" backTo="/events" />
        <ErrorAlert
          error={loadError ?? new Error("No se pudo cargar el evento.")}
        />
      </div>
    );
  }

  const initial: EventFormValues = {
    titulo: event.titulo,
    descripcion: event.descripcion,
    lugar: event.lugar,
    fechaInicio: toDatetimeLocalValue(event.fecha_inicio),
    fechaFin: toDatetimeLocalValue(event.fecha_fin),
    capacidad: String(event.capacidad),
  };

  const handleSubmit = async (values: EventFormValues) => {
    setError(null);
    setFieldErrors({});

    const titulo = values.titulo.trim();
    const descripcion = values.descripcion.trim();
    const lugar = values.lugar.trim();
    const fechaInicio = fromDatetimeLocalValue(values.fechaInicio);
    const fechaFin = fromDatetimeLocalValue(values.fechaFin);
    const capacidad = Number(values.capacidad);

    const payload: UpdateEventDTO = {};
    if (titulo !== event.titulo) {
      payload.titulo = titulo;
    }
    if (descripcion !== event.descripcion) {
      payload.descripcion = descripcion;
    }
    if (lugar !== event.lugar) {
      payload.lugar = lugar;
    }
    if (
      new Date(fechaInicio).getTime() !== new Date(event.fecha_inicio).getTime()
    ) {
      payload.fecha_inicio = fechaInicio;
    }
    if (new Date(fechaFin).getTime() !== new Date(event.fecha_fin).getTime()) {
      payload.fecha_fin = fechaFin;
    }
    if (capacidad !== event.capacidad) {
      payload.capacidad = capacidad;
    }

    if (Object.keys(payload).length === 0) {
      toast.info("No hay cambios por guardar.", "Sin cambios");
      return;
    }

    setSubmitting(true);
    try {
      const updated = await eventService.update(id, payload);
      toast.success("Los cambios se guardaron correctamente.", "Evento actualizado");
      navigate(`/events/${updated.id}`, { replace: true });
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
      <PageHeader title={`Editar: ${event.titulo}`} backTo={`/events/${event.id}`} />

      <Card className="max-w-2xl">
        {error ? (
          <div className="mb-4">
            <ErrorAlert error={error} onClose={() => setError(null)} />
          </div>
        ) : null}

        <EventForm
          initial={initial}
          submitting={submitting}
          submitLabel="Guardar cambios"
          serverErrors={fieldErrors}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/events/${event.id}`)}
        />
      </Card>
    </div>
  );
}
