import { Lock } from "lucide-react";
import { useCallback, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { FullPageSpinner } from "../../components/feedback/Spinner";
import { useToast } from "../../components/feedback/useToast";
import { buttonClass } from "../../components/forms/Button";
import { PageHeader } from "../../components/layout/Page";
import { Breadcrumb, EmptyState } from "../../components/ui/primitives";
import { useEvent } from "../../hooks/useEvent";
import { useFullList } from "../../hooks/useFullList";
import {
  fromDateAndTimeValues,
  toDateAndTimeValues,
} from "../../lib/format";
import { occupancyOf } from "../../lib/capacity";
import { deadlineDateValue, registrationDeadlineIso } from "../../lib/eventLimits";
import type { ActivityAdjustment } from "../../lib/eventReschedule";
import { eventDateInfo } from "../../lib/eventDates";
import { plural } from "../../lib/participations";
import { parseValidationErrors } from "../../lib/formErrors";
import { eventService } from "../../services/eventService";
import { scheduleService } from "../../services/scheduleService";
import { ApiError } from "../../types/api";
import type { UpdateEventDTO } from "../../types/event";
import { EventForm, type EventFormValues } from "./components/EventForm";

export function EventEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { event, isLoading, error: loadError } = useEvent(id);
  // El cronograma, para avisar si un cambio de horario deja actividades fuera.
  const listSchedules = useCallback(
    (page: { limit: number; offset: number; signal: AbortSignal }) =>
      scheduleService.list({ ...page, eventoId: id }),
    [id],
  );
  const { items: schedules } = useFullList(listSchedules, Boolean(id));

  const [error, setError] = useState<unknown>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return <FullPageSpinner label="Cargando evento…" />;
  }

  if (loadError || !event || !id) {
    return (
      <div>
        <PageHeader title="Editar evento" backTo="/events" refresh={false} />
        <ErrorAlert
          error={loadError ?? new Error("No se pudo cargar el evento.")}
        />
      </div>
    );
  }

  // Un evento finalizado no se edita (el backend también lo rechaza): quien
  // llegue aquí por un enlace viejo ve por qué y cómo volver.
  if (eventDateInfo(event).isPast) {
    return (
      <div className="flex max-w-[860px] flex-col gap-5">
        <Breadcrumb to={`/events/${event.id}`} label={event.titulo} current="Editar" />
        <EmptyState
          bordered
          icon={Lock}
          tone="sand"
          title="Este evento ya finalizó"
          description="Los eventos finalizados quedan como registro: no se pueden editar. Si ya no lo necesitas, puedes eliminarlo desde su detalle."
          action={
            <Link to={`/events/${event.id}`} className={buttonClass("secondary")}>
              Volver al evento
            </Link>
          }
        />
      </div>
    );
  }

  const { date: fechaInicioInit, time: horaInicioInit } = toDateAndTimeValues(
    event.fecha_inicio,
  );
  const { date: fechaFinInit, time: horaFinInit } = toDateAndTimeValues(
    event.fecha_fin,
  );

  const initial: EventFormValues = {
    titulo: event.titulo,
    descripcion: event.descripcion,
    lugar: event.lugar,
    direccion: event.direccion ?? "",
    latitud: event.latitud !== null ? String(event.latitud) : "",
    longitud: event.longitud !== null ? String(event.longitud) : "",
    fechaInicio: fechaInicioInit,
    horaInicio: horaInicioInit,
    fechaFin: fechaFinInit,
    horaFin: horaFinInit,
    capacidad: String(event.capacidad),
    limiteInscripcion: deadlineDateValue(event.fecha_limite_inscripcion),
    diasCancelacion:
      event.dias_limite_cancelacion !== null
        ? String(event.dias_limite_cancelacion)
        : "",
  };

  const handleSubmit = async (
    values: EventFormValues,
    activities: ActivityAdjustment[],
  ) => {
    setError(null);
    setFieldErrors({});

    const titulo = values.titulo.trim();
    const descripcion = values.descripcion.trim();
    const lugar = values.lugar.trim();
    const direccion = values.direccion.trim() || null;
    const latitudTrim = values.latitud.trim();
    const longitudTrim = values.longitud.trim();
    const latitud = latitudTrim ? Number(latitudTrim) : null;
    const longitud = longitudTrim ? Number(longitudTrim) : null;
    const fechaInicio = fromDateAndTimeValues(values.fechaInicio, values.horaInicio);
    const fechaFin = fromDateAndTimeValues(values.fechaFin, values.horaFin);
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
    if (direccion !== event.direccion) {
      payload.direccion = direccion;
    }
    if (latitud !== event.latitud) {
      payload.latitud = latitud;
    }
    if (longitud !== event.longitud) {
      payload.longitud = longitud;
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
    // La fecha límite se compara por día: es lo que se elige en el formulario.
    if (values.limiteInscripcion !== initial.limiteInscripcion) {
      payload.fecha_limite_inscripcion = values.limiteInscripcion
        ? registrationDeadlineIso(values.limiteInscripcion, fechaInicio)
        : null;
    } else if (
      values.limiteInscripcion &&
      payload.fecha_inicio !== undefined
    ) {
      // Al mover el evento, el límite del mismo día no puede quedar después.
      payload.fecha_limite_inscripcion = registrationDeadlineIso(
        values.limiteInscripcion,
        fechaInicio,
      );
    }
    const diasCancelacion = values.diasCancelacion.trim()
      ? Number(values.diasCancelacion)
      : null;
    if (diasCancelacion !== event.dias_limite_cancelacion) {
      payload.dias_limite_cancelacion = diasCancelacion;
    }

    if (Object.keys(payload).length === 0) {
      toast.info("No hay cambios por guardar.");
      return;
    }

    // Si otro administrador guardó entre tanto, el servidor responde 409.
    payload.version = event.version;
    // El cronograma se acomoda en el mismo guardado que el horario.
    if (activities.length > 0) {
      payload.actividades = activities;
    }

    setSubmitting(true);
    try {
      const { event: updated, notified } = await eventService.update(id, payload);
      toast.success(
        `Los cambios de «${updated.titulo}» se guardaron.${
          notified > 0
            ? ` Se avisó del cambio a ${plural(notified, "inscrito", "inscritos")}.`
            : ""
        }`,
      );
      navigate(`/events/${updated.id}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.isValidation) {
        setFieldErrors(parseValidationErrors(err).fieldErrors);
      }
      const data = err instanceof ApiError
        ? (err.payload?.data as { campo?: string; codigo?: string } | null | undefined)
        : null;
      if (err instanceof ApiError && err.status === 409 && data?.codigo === "evento_finalizado") {
        // Terminó mientras el formulario estaba abierto.
        toast.info("El evento ya finalizó: no se puede editar.");
        navigate(`/events/${event.id}`, { replace: true });
        return;
      }
      if (err instanceof ApiError && err.status === 409 && data?.campo === "capacidad") {
        // Se ocupó un lugar mientras se editaba: el aforo quedó por debajo.
        setFieldErrors({ capacidad: err.message });
        return;
      }
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex max-w-[860px] flex-col gap-5">
      <Breadcrumb
        to={`/events/${event.id}`}
        label={event.titulo}
        current="Editar"
      />
      <PageHeader title="Editar evento" refresh={false} />

      {error ? <ErrorAlert error={error} onClose={() => setError(null)} /> : null}

      <EventForm
        initial={initial}
        submitting={submitting}
        submitLabel="Guardar cambios"
        serverErrors={fieldErrors}
        occupancy={occupancyOf(event)}
        schedules={schedules}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/events/${event.id}`)}
      />
    </div>
  );
}
