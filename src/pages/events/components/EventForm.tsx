import { ChevronDown, ChevronUp, ExternalLink } from "lucide-react";
import {
  lazy,
  Suspense,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import { ConfirmDialog } from "../../../components/feedback/ConfirmDialog";
import { Spinner } from "../../../components/feedback/Spinner";
import { Button } from "../../../components/forms/Button";
import { FieldError } from "../../../components/forms/fieldStyles";
import { TextArea } from "../../../components/forms/TextArea";
import { TextField } from "../../../components/forms/TextField";
import { Card } from "../../../components/layout/Page";
import { AddressAutocomplete } from "../../../components/map/AddressAutocomplete";
import { FormStatus } from "../../../components/ui/FormStatus";
import { useTouched } from "../../../hooks/useTouched";
import {
  geocodeAddress,
  googleMapsUrl,
  type AddressSuggestion,
} from "../../../lib/geocoding";
import { compactErrors, focusFirstError } from "../../../lib/validators";
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

type ErrorKey =
  | "titulo"
  | "descripcion"
  | "capacidad"
  | "fecha_inicio"
  | "hora_inicio"
  | "fecha_fin"
  | "hora_fin"
  | "lugar"
  | "direccion"
  | "latitud"
  | "longitud";

function addMinute(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = Math.min(h * 60 + m + 1, 23 * 60 + 59);
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card as="section" className="flex flex-col gap-4 p-5 sm:p-[22px]">
      <h2 className="text-base font-extrabold">{title}</h2>
      {children}
    </Card>
  );
}

export function EventForm({
  initial,
  submitting,
  submitLabel,
  onSubmit,
  onCancel,
  serverErrors = {},
}: EventFormProps) {
  const isEdit = initial !== undefined;
  const base = initial ?? EMPTY;
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<EventFormValues>(base);
  const [dismissedServer, setDismissedServer] = useState<Set<string>>(new Set());
  const [coordsOpen, setCoordsOpen] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeStatus, setGeocodeStatus] = useState<{
    kind: "success" | "empty" | "error";
    text: string;
  } | null>(null);
  const geocodeRequestId = useRef(0);
  const fields = useTouched<ErrorKey>();

  const set = (name: keyof EventFormValues, value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const sameDay =
    values.fechaInicio !== "" && values.fechaInicio === values.fechaFin;

  /* ── Reglas de fecha y hora ─────────────────────────────────────────── */

  const setFechaInicio = (date: string) =>
    setValues((prev) => {
      // La fecha de fin no puede ser anterior a la de inicio.
      const fechaFin = !prev.fechaFin || prev.fechaFin < date ? date : prev.fechaFin;
      const clearEnd =
        fechaFin === date && prev.horaFin && prev.horaInicio && prev.horaFin <= prev.horaInicio;
      return {
        ...prev,
        fechaInicio: date,
        fechaFin,
        horaFin: clearEnd ? "" : prev.horaFin,
      };
    });

  const setFechaFin = (date: string) =>
    setValues((prev) => ({
      ...prev,
      fechaFin: date,
      horaFin:
        date === prev.fechaInicio && prev.horaFin && prev.horaInicio && prev.horaFin <= prev.horaInicio
          ? ""
          : prev.horaFin,
    }));

  const setHoraInicio = (time: string) =>
    setValues((prev) => ({
      ...prev,
      horaInicio: time,
      // El mismo día, el fin debe ser posterior: si ya no lo es, se borra.
      horaFin:
        prev.fechaInicio !== "" &&
        prev.fechaInicio === prev.fechaFin &&
        prev.horaFin &&
        prev.horaFin <= time
          ? ""
          : prev.horaFin,
    }));

  /* ── Validación (derivada de los valores) ───────────────────────────── */

  const capacidadNum = Number(values.capacidad);
  const hasLat = values.latitud.trim() !== "";
  const hasLng = values.longitud.trim() !== "";
  const endBeforeStart =
    values.fechaInicio &&
    values.horaInicio &&
    values.fechaFin &&
    values.horaFin &&
    new Date(`${values.fechaFin}T${values.horaFin}`) <=
      new Date(`${values.fechaInicio}T${values.horaInicio}`);

  const clientErrors: Partial<Record<ErrorKey, string>> = {
    titulo: values.titulo.trim() ? undefined : "Escribe el título del evento.",
    descripcion: values.descripcion.trim()
      ? undefined
      : "Escribe una descripción.",
    capacidad:
      values.capacidad.trim() && Number.isInteger(capacidadNum) && capacidadNum > 0
        ? undefined
        : "Ingresa un número entero mayor a 0.",
    fecha_inicio: values.fechaInicio ? undefined : "Elige la fecha de inicio.",
    hora_inicio: values.horaInicio ? undefined : "Elige la hora de inicio.",
    fecha_fin: !values.fechaFin
      ? "Elige la fecha de fin."
      : values.fechaInicio && values.fechaFin < values.fechaInicio
        ? "No puede ser anterior a la fecha de inicio."
        : undefined,
    hora_fin: !values.horaFin
      ? "Elige la hora de fin."
      : endBeforeStart
        ? "Debe ser posterior a la hora de inicio."
        : undefined,
    lugar: values.lugar.trim() ? undefined : "Escribe el nombre del lugar.",
    latitud:
      hasLat && (Number.isNaN(Number(values.latitud)) || Math.abs(Number(values.latitud)) > 90)
        ? "La latitud va de -90 a 90."
        : undefined,
    longitud:
      hasLat !== hasLng
        ? "Indica latitud y longitud juntas, o ninguna."
        : hasLng &&
            (Number.isNaN(Number(values.longitud)) ||
              Math.abs(Number(values.longitud)) > 180)
          ? "La longitud va de -180 a 180."
          : undefined,
  };

  // Un error del servidor se muestra hasta que el campo vuelve a cambiar.
  const serverFor = (key: string) =>
    dismissedServer.has(key) ? undefined : serverErrors[key];
  const errors = { ...clientErrors } as Partial<Record<ErrorKey, string>>;
  (Object.keys(serverErrors) as ErrorKey[]).forEach((key) => {
    errors[key] = errors[key] ?? serverFor(key);
  });
  const errorCount = Object.keys(compactErrors(clientErrors)).length;
  const dirty = JSON.stringify(values) !== JSON.stringify(base);
  const canSubmit = errorCount === 0 && (dirty || !isEdit);

  const shown = (key: ErrorKey) => fields.visible(errors, key) ?? serverFor(key);
  const change = (name: keyof EventFormValues, key: ErrorKey, value: string) => {
    set(name, value);
    if (serverErrors[key]) {
      setDismissedServer((prev) => new Set(prev).add(key));
    }
  };

  /* ── Geocodificación (sin cambios de lógica) ────────────────────────── */

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

  const handleSuggestionSelect = (suggestion: AddressSuggestion) => {
    // Invalida cualquier geocodificación en curso: manda la sugerencia elegida.
    geocodeRequestId.current++;
    setGeocoding(false);
    setValues((prev) => ({
      ...prev,
      direccion: suggestion.displayName.slice(0, DIRECCION_MAX),
      latitud: String(Math.round(suggestion.lat * 1e6) / 1e6),
      longitud: String(Math.round(suggestion.lon * 1e6) / 1e6),
    }));
    setGeocodeStatus({
      kind: "success",
      text: `Ubicación marcada: ${suggestion.displayName}`,
    });
  };

  const handleDireccionBlur = () => {
    if (!hasLat || !hasLng) {
      void runGeocode();
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    fields.setSubmitted(true);
    setDismissedServer(new Set());
    if (!canSubmit) {
      requestAnimationFrame(() => focusFirstError(formRef.current));
      return;
    }
    onSubmit(values);
  };

  const requestCancel = () => {
    if (dirty) {
      setConfirmDiscard(true);
    } else {
      onCancel();
    }
  };

  const endTimeHint =
    sameDay && values.horaInicio
      ? "Termina el mismo día: solo se habilitan horas posteriores al inicio."
      : undefined;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-5"
    >
      <Section title="Información">
        <TextField
          label="Título"
          name="titulo"
          required
          maxLength={TITULO_MAX}
          value={values.titulo}
          onChange={(e) => change("titulo", "titulo", e.target.value)}
          onBlur={() => fields.touch("titulo")}
          error={shown("titulo")}
        />
        <TextArea
          label="Descripción"
          name="descripcion"
          required
          rows={4}
          maxLength={DESCRIPCION_MAX}
          value={values.descripcion}
          onChange={(e) => change("descripcion", "descripcion", e.target.value)}
          onBlur={() => fields.touch("descripcion")}
          error={shown("descripcion")}
        />
        <div className="max-w-[220px]">
          <TextField
            label="Capacidad"
            name="capacidad"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            required
            value={values.capacidad}
            onChange={(e) => change("capacidad", "capacidad", e.target.value)}
            onBlur={() => fields.touch("capacidad")}
            error={shown("capacidad")}
            hint="Número de personas."
          />
        </div>
      </Section>

      <Section title="Fecha y hora">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField
            label="Fecha de inicio"
            name="fecha_inicio"
            type="date"
            required
            value={values.fechaInicio}
            onChange={(e) => {
              setFechaInicio(e.target.value);
              fields.touch("fecha_inicio");
            }}
            onBlur={() => fields.touch("fecha_inicio")}
            error={shown("fecha_inicio")}
          />
          <TimeSelect
            label="Hora de inicio"
            name="hora_inicio"
            value={values.horaInicio}
            onChange={(v) => {
              setHoraInicio(v);
              fields.touch("hora_inicio");
            }}
            error={shown("hora_inicio")}
          />
          <TextField
            label="Fecha de fin"
            name="fecha_fin"
            type="date"
            required
            min={values.fechaInicio || undefined}
            value={values.fechaFin}
            onChange={(e) => {
              setFechaFin(e.target.value);
              fields.touch("fecha_fin");
            }}
            onBlur={() => fields.touch("fecha_fin")}
            error={shown("fecha_fin")}
          />
          <TimeSelect
            label="Hora de fin"
            name="hora_fin"
            value={values.horaFin}
            onChange={(v) => {
              set("horaFin", v);
              fields.touch("hora_fin");
            }}
            error={shown("hora_fin")}
            hint={endTimeHint}
            minTime={
              sameDay && values.horaInicio ? addMinute(values.horaInicio) : undefined
            }
          />
        </div>
      </Section>

      <Section title="Lugar y mapa">
        <TextField
          label="Lugar"
          name="lugar"
          required
          maxLength={LUGAR_MAX}
          value={values.lugar}
          onChange={(e) => change("lugar", "lugar", e.target.value)}
          onBlur={() => fields.touch("lugar")}
          error={shown("lugar")}
          hint="Nombre del lugar (p. ej. «Salón social»)."
        />

        <AddressAutocomplete
          label="Dirección (opcional)"
          name="direccion"
          maxLength={DIRECCION_MAX}
          value={values.direccion}
          onChange={(v) => change("direccion", "direccion", v)}
          onSelect={handleSuggestionSelect}
          onBlur={handleDireccionBlur}
          bias={
            hasLat && hasLng
              ? { lat: Number(values.latitud), lon: Number(values.longitud) }
              : null
          }
          error={shown("direccion")}
          hint="Escribe la dirección y elige una sugerencia para marcarla en el mapa."
        />

        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-bold">Ubicación en el mapa</span>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <button
                type="button"
                onClick={() => void runGeocode()}
                disabled={geocoding || !locationQuery}
                className="min-h-8 rounded text-sm font-bold text-primary hover:underline disabled:cursor-not-allowed disabled:text-disabled-foreground disabled:no-underline"
              >
                {geocoding ? "Buscando…" : "Buscar en el mapa"}
              </button>
              <a
                href={googleMapsUrl({
                  latitud: hasLat ? Number(values.latitud) : null,
                  longitud: hasLng ? Number(values.longitud) : null,
                  query: locationQuery,
                })}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-8 items-center gap-1 text-sm font-bold text-primary hover:underline"
              >
                Abrir en Google Maps
                <ExternalLink className="size-4" aria-hidden="true" />
                <span className="sr-only">(se abre en una pestaña nueva)</span>
              </a>
            </div>
          </div>
          <p className="text-[13px] text-muted-foreground">
            Al elegir una sugerencia de dirección el marcador se ubica solo.
            También puedes hacer clic en el mapa para ajustar el punto exacto.
          </p>
          {geocodeStatus ? (
            <p
              role="status"
              className={`text-[13px] font-bold ${
                geocodeStatus.kind === "success"
                  ? "text-success-foreground"
                  : geocodeStatus.kind === "error"
                    ? "text-destructive"
                    : "text-warning-foreground"
              }`}
            >
              {geocodeStatus.text}
            </p>
          ) : null}
          <Suspense
            fallback={
              <div className="flex h-64 w-full items-center justify-center rounded-xl border border-border text-muted-foreground">
                <Spinner label="Cargando mapa…" />
              </div>
            }
          >
            <EventLocationPicker
              latitud={hasLat ? Number(values.latitud) : null}
              longitud={hasLng ? Number(values.longitud) : null}
              onChange={(lat, lng) => {
                set("latitud", String(lat));
                set("longitud", String(lng));
              }}
            />
          </Suspense>
        </div>

        <div>
          <button
            type="button"
            aria-expanded={coordsOpen}
            onClick={() => setCoordsOpen((v) => !v)}
            className="flex min-h-8 items-center gap-1 rounded py-1 text-sm font-bold text-primary hover:underline"
          >
            {coordsOpen ? (
              <ChevronUp className="size-[18px]" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-[18px]" aria-hidden="true" />
            )}
            Coordenadas manuales
          </button>
          {coordsOpen ? (
            <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Latitud"
                name="latitud"
                type="number"
                step="any"
                min={-90}
                max={90}
                value={values.latitud}
                onChange={(e) => change("latitud", "latitud", e.target.value)}
                onBlur={() => fields.touch("latitud")}
                error={shown("latitud")}
              />
              <TextField
                label="Longitud"
                name="longitud"
                type="number"
                step="any"
                min={-180}
                max={180}
                value={values.longitud}
                onChange={(e) => change("longitud", "longitud", e.target.value)}
                onBlur={() => fields.touch("longitud")}
                error={shown("longitud")}
              />
            </div>
          ) : clientErrors.latitud || clientErrors.longitud ? (
            <FieldError>
              {clientErrors.latitud ?? clientErrors.longitud}
            </FieldError>
          ) : null}
        </div>
      </Section>

      {/* Barra de acciones fija: siempre visible mientras se recorre el formulario. */}
      <div className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-border bg-surface-alt px-5 py-3.5 shadow-card-hover">
        <FormStatus
          saving={submitting}
          submitted={fields.submitted}
          errorCount={errorCount}
          dirty={dirty}
        />
        <div className="ml-auto flex gap-2.5">
          <Button variant="secondary" onClick={requestCancel} disabled={submitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            loading={submitting}
            loadingLabel="Guardando…"
            disabled={!canSubmit}
          >
            {submitLabel}
          </Button>
        </div>
      </div>

      <ConfirmDialog
        open={confirmDiscard}
        danger
        title="¿Descartar los cambios?"
        description="Los cambios que hiciste en este evento no se guardarán."
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
        onConfirm={() => {
          setConfirmDiscard(false);
          onCancel();
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </form>
  );
}
