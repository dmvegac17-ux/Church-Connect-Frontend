import { ExternalLink } from "lucide-react";
import { lazy, Suspense, useRef, useState, type FormEvent } from "react";

import { Spinner } from "../../../components/feedback/Spinner";
import { Button } from "../../../components/forms/Button";
import { TextArea } from "../../../components/forms/TextArea";
import { TextField } from "../../../components/forms/TextField";
import { geocodeAddress, googleMapsUrl } from "../../../lib/geocoding";
import { focusFirstError, required } from "../../../lib/validators";
import { TimeSelect } from "../../schedules/components/TimeSelect";

/** Leaflet pesa ~150KB — se carga en un chunk separado, no en el bundle principal. */
const EventLocationPicker = lazy(() =>
  import("../../../components/map/EventLocationPicker").then((m) => ({
    default: m.EventLocationPicker,
  })),
);

export interface EventFormValues {
  titulo: string;
  descripcion: string;
  /** `<input type="date">` (`YYYY-MM-DD`) + `TimeSelect` (`HH:mm`), hora local del navegador. */
  fechaInicio: string;
  horaInicio: string;
  fechaFin: string;
  horaFin: string;
  lugar: string;
  direccion: string;
  /** Como strings de input; se convierten a número al enviar (vacío = sin coordenadas). */
  latitud: string;
  longitud: string;
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
  /** Errores por campo provenientes del backend (422 / 400). */
  serverErrors?: Record<string, string>;
}

const EMPTY: EventFormValues = {
  titulo: "",
  descripcion: "",
  fechaInicio: "",
  horaInicio: "",
  fechaFin: "",
  horaFin: "",
  lugar: "",
  direccion: "",
  latitud: "",
  longitud: "",
  capacidad: "",
};

const TITULO_MAX = 150;
const DESCRIPCION_MAX = 2000;
const LUGAR_MAX = 200;
const DIRECCION_MAX = 255;

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
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<{
    kind: "success" | "empty" | "error";
    text: string;
  } | null>(null);
  const geocodeRequestId = useRef(0);

  const errors = { ...clientErrors, ...serverErrors };

  const set = (name: keyof EventFormValues, value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const sameDay =
    values.fechaInicio !== "" && values.fechaInicio === values.fechaFin;

  /**
   * Prioriza la dirección sola: es lo que de verdad se puede geocodificar.
   * Mezclarla con "Lugar" (p. ej. "Salón Social") suele arruinar la
   * búsqueda en Nominatim porque no es un lugar real reconocible. "Lugar"
   * solo se usa como respaldo si no hay dirección.
   */
  const locationQuery = values.direccion.trim() || values.lugar.trim();

  const runGeocode = async () => {
    if (!locationQuery) {
      return;
    }
    const requestId = ++geocodeRequestId.current;
    setGeocoding(true);
    setGeocodeStatus(null);
    try {
      const result = await geocodeAddress(locationQuery);
      if (requestId !== geocodeRequestId.current) {
        return;
      }
      if (!result) {
        setGeocodeStatus({
          kind: "empty",
          text: "No se encontró esa dirección en el mapa. Puedes marcarla manualmente haciendo clic.",
        });
        return;
      }
      set("latitud", String(result.lat));
      set("longitud", String(result.lon));
      setGeocodeStatus({
        kind: "success",
        text: `Ubicación encontrada: ${result.displayName}`,
      });
    } catch {
      if (requestId !== geocodeRequestId.current) {
        return;
      }
      setGeocodeStatus({
        kind: "error",
        text: "No se pudo buscar la dirección en el mapa. Intenta de nuevo o márcala manualmente.",
      });
    } finally {
      if (requestId === geocodeRequestId.current) {
        setGeocoding(false);
      }
    }
  };

  const handleDireccionBlur = () => {
    const hasCoords = values.latitud.trim() !== "" && values.longitud.trim() !== "";
    if (!hasCoords) {
      runGeocode();
    }
  };

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
    if (!required(values.horaInicio)) {
      next.fecha_inicio = "La hora de inicio es obligatoria.";
    }
    if (!required(values.fechaFin)) {
      next.fecha_fin = "La fecha de fin es obligatoria.";
    }
    if (!required(values.horaFin)) {
      next.fecha_fin = "La hora de fin es obligatoria.";
    } else if (
      required(values.fechaInicio) &&
      required(values.horaInicio) &&
      required(values.fechaFin) &&
      new Date(`${values.fechaFin}T${values.horaFin}`) <=
        new Date(`${values.fechaInicio}T${values.horaInicio}`)
    ) {
      next.fecha_fin = "Debe ser posterior a la fecha/hora de inicio.";
    }
    const capacidadNum = Number(values.capacidad);
    if (
      !required(values.capacidad) ||
      !Number.isInteger(capacidadNum) ||
      capacidadNum <= 0
    ) {
      next.capacidad = "Ingresa un número entero mayor a 0.";
    }
    const hasLat = values.latitud.trim() !== "";
    const hasLng = values.longitud.trim() !== "";
    if (hasLat !== hasLng) {
      next.longitud = "Indica latitud y longitud juntas, o ninguna.";
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
        maxLength={TITULO_MAX}
        value={values.titulo}
        onChange={(e) => set("titulo", e.target.value)}
        error={errors.titulo}
      />

      <TextArea
        label="Descripción"
        name="descripcion"
        required
        rows={4}
        maxLength={DESCRIPCION_MAX}
        value={values.descripcion}
        onChange={(e) => set("descripcion", e.target.value)}
        error={errors.descripcion}
      />

      <TextField
        label="Lugar"
        name="lugar"
        required
        maxLength={LUGAR_MAX}
        value={values.lugar}
        onChange={(e) => set("lugar", e.target.value)}
        error={errors.lugar}
        hint="Nombre del lugar (ej. “Salón social”)."
      />

      <TextField
        label="Dirección"
        name="direccion"
        maxLength={DIRECCION_MAX}
        value={values.direccion}
        onChange={(e) => set("direccion", e.target.value)}
        onBlur={handleDireccionBlur}
        error={errors.direccion}
        hint="Opcional: dirección exacta. Al salir del campo se busca y se marca sola en el mapa."
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
          error={errors.fecha_inicio}
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
          error={errors.fecha_fin}
          minTime={sameDay ? values.horaInicio : undefined}
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

      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-sm font-medium text-foreground">
            Ubicación en el mapa
          </span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={runGeocode}
              disabled={geocoding || !locationQuery}
              className="text-xs font-medium text-primary hover:underline disabled:cursor-not-allowed disabled:opacity-50"
            >
              {geocoding ? "Buscando…" : "Buscar en el mapa"}
            </button>
            <a
              href={googleMapsUrl({
                latitud: values.latitud.trim() ? Number(values.latitud) : null,
                longitud: values.longitud.trim() ? Number(values.longitud) : null,
                query: locationQuery,
              })}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
            >
              Abrir en Google Maps
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Escribe la dirección y al salir del campo se busca sola en el
          mapa. También puedes hacer clic en el mapa para ajustar el punto
          exacto, o abrirlo en Google Maps para verificarlo.
        </p>
        {geocodeStatus ? (
          <p
            className={`text-xs font-medium ${
              geocodeStatus.kind === "success"
                ? "text-primary"
                : geocodeStatus.kind === "error"
                  ? "text-destructive"
                  : "text-muted-foreground"
            }`}
          >
            {geocodeStatus.text}
          </p>
        ) : null}
        <Suspense
          fallback={
            <div className="flex h-64 w-full items-center justify-center rounded-lg border border-border">
              <Spinner label="Cargando mapa…" />
            </div>
          }
        >
          <EventLocationPicker
            latitud={values.latitud.trim() ? Number(values.latitud) : null}
            longitud={values.longitud.trim() ? Number(values.longitud) : null}
            onChange={(lat, lng) => {
              set("latitud", String(lat));
              set("longitud", String(lng));
            }}
          />
        </Suspense>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextField
          label="Latitud"
          name="latitud"
          type="number"
          step="any"
          min={-90}
          max={90}
          value={values.latitud}
          onChange={(e) => set("latitud", e.target.value)}
          error={errors.latitud}
        />
        <TextField
          label="Longitud"
          name="longitud"
          type="number"
          step="any"
          min={-180}
          max={180}
          value={values.longitud}
          onChange={(e) => set("longitud", e.target.value)}
          error={errors.longitud}
        />
      </div>

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
