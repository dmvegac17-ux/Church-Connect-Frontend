import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Mail,
  TriangleAlert,
} from "lucide-react";
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
import { Checkbox } from "../../../components/forms/Checkbox";
import {
  DateTimeRangePicker,
  type DateTimeField,
} from "../../../components/forms/DateTimeRangePicker";
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
import type { Occupancy } from "../../../lib/capacity";
import {
  isoToWall,
  joinWall,
  nowWall,
  shortMoment,
  timeText,
} from "../../../lib/dateTimeRange";
import { textChanged } from "../../../lib/eventChanges";
import {
  adjustmentsOf,
  overlapping,
  planActivities,
  shiftText,
  unresolved,
  type ActivityAdjustment,
  type OutsideDecision,
} from "../../../lib/eventReschedule";
import {
  CANCELLATION_DAYS_MAX,
  cancellationDaysError,
  cancellationDeadline,
  daysUntilEventDate,
  todayDateValue,
} from "../../../lib/eventLimits";
import { formatDateTime, fromDateAndTimeValues } from "../../../lib/format";
import { EVENT_CAPACITY_MAX, compactErrors, focusFirstError } from "../../../lib/validators";
import type { Schedule } from "../../../types/schedule";

/** Leaflet pesa ~150KB — se carga en un chunk separado, no en el bundle principal. */
const EventLocationPicker = lazy(() =>
  import("../../../components/map/EventLocationPicker").then((m) => ({
    default: m.EventLocationPicker,
  })),
);

export interface EventFormValues {
  titulo: string;
  descripcion: string;
  /** Fecha (`YYYY-MM-DD`) y hora 24 h (`HH:mm`), en hora de Colombia. */
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
  /** Fecha límite para inscribirse (`YYYY-MM-DD`); vacío = hasta el inicio. */
  limiteInscripcion: string;
  /** Días antes del inicio en que se cierra la cancelación; vacío = sin límite. */
  diasCancelacion: string;
}

const CAPACITY_DIGITS = String(EVENT_CAPACITY_MAX).length;

const NOTICE_CLASS =
  "flex items-start gap-2 rounded-[10px] border border-info-border bg-info-soft px-3 py-2.5 text-sm leading-snug text-info-foreground";

interface EventFormProps {
  /** Valores iniciales (editar). Vacío para crear. */
  initial?: EventFormValues;
  submitting: boolean;
  submitLabel: string;
  /** `activities`: ajustes del cronograma que acompañan un cambio de horario. */
  onSubmit: (values: EventFormValues, activities: ActivityAdjustment[]) => void;
  onCancel: () => void;
  /** Errores por campo provenientes del backend (422 / 400). */
  serverErrors?: Record<string, string>;
  /** Al editar: lugares ya ocupados. El aforo no puede quedar por debajo. */
  occupancy?: Occupancy;
  /** Al editar: actividades del cronograma, para avisar si quedan fuera del horario. */
  schedules?: Schedule[];
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
  limiteInscripcion: "",
  diasCancelacion: "",
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
  | "longitud"
  | "fecha_limite_inscripcion"
  | "dias_limite_cancelacion";

/** Clave de error de cada control del selector de fecha y hora. */
const RANGE_KEYS: Record<DateTimeField, ErrorKey> = {
  startDate: "fecha_inicio",
  startTime: "hora_inicio",
  endDate: "fecha_fin",
  endTime: "hora_fin",
};

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
  occupancy,
  schedules = [],
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
  // Cronograma frente a un cambio de horario del evento.
  const [moveWithEvent, setMoveWithEvent] = useState(true);
  const [decisions, setDecisions] = useState<
    Record<string, OutsideDecision | undefined>
  >({});

  const set = (name: keyof EventFormValues, value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  /* ── Validación (derivada de los valores) ───────────────────────────── */

  // Los límites se eligen entre hoy y el día del evento. Igual que en el
  // backend, solo se revisa lo que se está cambiando: un evento cuya fecha
  // límite ya pasó se puede seguir editando sin tener que tocarla.
  const today = todayDateValue();
  const now = nowWall();
  const daysAvailable = values.fechaInicio
    ? daysUntilEventDate(values.fechaInicio)
    : null;
  // El evento solo se programa de hoy en adelante; uno en curso conserva su fecha.
  const startTouched =
    !isEdit ||
    values.fechaInicio !== base.fechaInicio ||
    values.horaInicio !== base.horaInicio;
  const deadlineTouched =
    !isEdit || values.limiteInscripcion !== base.limiteInscripcion;
  // Mover el evento cambia cuántos días quedan: los días tienen que caber.
  const daysTouched =
    !isEdit ||
    values.diasCancelacion.trim() !== base.diasCancelacion.trim() ||
    values.fechaInicio !== base.fechaInicio;

  // Hasta cuándo se podrá cancelar con los días escritos, para confirmarlo.
  const cancellationDays = Number(values.diasCancelacion);
  const daysRange =
    daysAvailable === null
      ? "Días de anticipación al inicio del evento."
      : daysAvailable === 0
        ? "El evento es hoy: ya no quedan días de anticipación."
        : `Entre 0 y ${Math.min(daysAvailable, CANCELLATION_DAYS_MAX)}: los días que faltan para el evento.`;
  const cancellationHint =
    !values.diasCancelacion.trim() || cancellationDays === 0
      ? `Sin días, se puede cancelar hasta que el evento empiece. ${daysRange}`
      : values.fechaInicio &&
          values.horaInicio &&
          !cancellationDaysError(values.diasCancelacion, daysAvailable)
        ? `Se podrá cancelar hasta el ${formatDateTime(
            cancellationDeadline(
              fromDateAndTimeValues(values.fechaInicio, values.horaInicio),
              cancellationDays,
            ).toISOString(),
          )}.`
        : daysRange;

  // Solo la fecha, el horario, el lugar y la dirección avisan a los inscritos
  // al guardar; un retoque de texto (mayúsculas, tildes, una errata) no.
  const datesChanged =
    isEdit &&
    (values.fechaInicio !== base.fechaInicio ||
      values.horaInicio !== base.horaInicio ||
      values.fechaFin !== base.fechaFin ||
      values.horaFin !== base.horaFin);
  const placeChanged = isEdit && textChanged(base.lugar, values.lugar);
  const addressChanged = isEdit && textChanged(base.direccion, values.direccion);
  const registered = occupancy?.publico ?? 0;
  const noticeFor = (what: string) =>
    registered === 1
      ? `Hay 1 persona inscrita. Al guardar se le avisará por correo del cambio de ${what}.`
      : `Hay ${registered} personas inscritas. Al guardar se les avisará por correo del cambio de ${what}.`;

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

  // Cómo queda el cronograma con el horario nuevo. Las actividades pueden
  // moverse con el evento; las que aun así queden fuera se deciden una por
  // una. Nada se elimina ni se mueve sin que se vea aquí antes de guardar.
  const rangeReady =
    isEdit &&
    datesChanged &&
    Boolean(values.fechaInicio && values.horaInicio && values.fechaFin && values.horaFin) &&
    !endBeforeStart;
  const oldStartIso = rangeReady
    ? fromDateAndTimeValues(base.fechaInicio, base.horaInicio)
    : "";
  const newStartIso = rangeReady
    ? fromDateAndTimeValues(values.fechaInicio, values.horaInicio)
    : "";
  const plan = rangeReady
    ? planActivities(
        schedules,
        oldStartIso,
        newStartIso,
        fromDateAndTimeValues(values.fechaFin, values.horaFin),
        moveWithEvent,
        decisions,
      )
    : [];
  const shift = rangeReady ? shiftText(oldStartIso, newStartIso) : "";
  const affected = plan.filter((item) => item.outside || item.moved);
  const pendingDecisions = unresolved(plan).length;
  const clash = pendingDecisions === 0 ? overlapping(plan) : null;
  const momentRange = (startIso: string, endIso: string) =>
    `${shortMoment(isoToWall(startIso))} – ${timeText(isoToWall(endIso).split("T")[1])}`;

  const clientErrors: Partial<Record<ErrorKey, string>> = {
    titulo: values.titulo.trim() ? undefined : "Escribe el título del evento.",
    descripcion: values.descripcion.trim()
      ? undefined
      : "Escribe una descripción.",
    capacidad: !(
      values.capacidad.trim() &&
      Number.isInteger(capacidadNum) &&
      capacidadNum > 0
    )
      ? "Ingresa un número entero mayor a 0."
      : capacidadNum > EVENT_CAPACITY_MAX
        ? `El máximo es ${EVENT_CAPACITY_MAX.toLocaleString("es-CO")}.`
        : occupancy && capacidadNum < occupancy.ocupados
        ? `Hay ${occupancy.ocupados} lugares ocupados. El aforo no puede ser menor.`
        : undefined,
    fecha_inicio: !values.fechaInicio
      ? "Elige la fecha de inicio."
      : startTouched && values.fechaInicio < now.slice(0, 10)
        ? "No puede ser anterior a hoy."
        : undefined,
    hora_inicio: !values.horaInicio
      ? "Elige la hora de inicio."
      : startTouched &&
          values.fechaInicio === now.slice(0, 10) &&
          joinWall(values.fechaInicio, values.horaInicio) < now
        ? "Esa hora ya pasó."
        : undefined,
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
    fecha_limite_inscripcion: !values.limiteInscripcion
      ? undefined
      : values.fechaInicio && values.limiteInscripcion > values.fechaInicio
        ? "No puede ser posterior al inicio del evento."
        : deadlineTouched && values.limiteInscripcion < today
          ? "No puede ser anterior a hoy."
          : undefined,
    dias_limite_cancelacion: cancellationDaysError(
      values.diasCancelacion,
      daysTouched ? daysAvailable : null,
    ),
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
  const canSubmit =
    errorCount === 0 && (dirty || !isEdit) && pendingDecisions === 0 && !clash;

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
    onSubmit(values, adjustmentsOf(plan));
  };

  const requestCancel = () => {
    if (dirty) {
      setConfirmDiscard(true);
    } else {
      onCancel();
    }
  };

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
            max={EVENT_CAPACITY_MAX}
            step={1}
            required
            value={values.capacidad}
            onChange={(e) => {
              // Solo dígitos, y no más de los que tiene el máximo.
              change(
                "capacidad",
                "capacidad",
                e.target.value.replace(/\D/g, "").slice(0, CAPACITY_DIGITS),
              );
              // El tope y el mínimo por lugares ocupados se avisan mientras
              // se escribe, sin esperar a salir del campo.
              fields.touch("capacidad");
            }}
            onBlur={() => fields.touch("capacidad")}
            error={shown("capacidad")}
          />
          {/* Siempre visible, también con error: dice de dónde sale el mínimo. */}
          <p className="mt-1.5 text-[13px] text-muted-foreground">
            {occupancy
              ? `${occupancy.ocupados} lugares ocupados: ${occupancy.participantes} participantes y ${occupancy.publico} inscritos.`
              : "Incluye participantes y público inscrito."}
          </p>
        </div>
      </Section>

      <Section title="Fecha y hora">
        <DateTimeRangePicker
          value={{
            startDate: values.fechaInicio,
            startTime: values.horaInicio,
            endDate: values.fechaFin,
            endTime: values.horaFin,
          }}
          // Desde ahora: no se programa en el pasado. Un evento en curso
          // conserva el inicio que ya tenía mientras no se toque.
          min={now}
          errors={{
            startDate: shown("fecha_inicio"),
            startTime: shown("hora_inicio"),
            endDate: shown("fecha_fin"),
            endTime: shown("hora_fin"),
          }}
          onChange={(next, field) => {
            setValues((prev) => ({
              ...prev,
              fechaInicio: next.startDate,
              horaInicio: next.startTime,
              fechaFin: next.endDate,
              horaFin: next.endTime,
            }));
            fields.touch(RANGE_KEYS[field]);
            if (field === "startDate") {
              // Mover el evento puede dejar fuera de rango los límites de
              // inscripción: si pasa, se dice junto a ellos sin esperar.
              fields.touch("fecha_limite_inscripcion");
              fields.touch("dias_limite_cancelacion");
            }
            if (serverErrors[RANGE_KEYS[field]]) {
              setDismissedServer((prev) => new Set(prev).add(RANGE_KEYS[field]));
            }
          }}
        />
        {plan.length > 0 && (shift || affected.length > 0) ? (
          <div className="flex flex-col gap-3 rounded-[10px] border border-warning-border bg-warning-soft px-3.5 py-3 text-sm leading-snug text-warning-foreground">
            <p className="flex items-start gap-2 font-bold">
              <TriangleAlert className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
              El cronograma tiene {plan.length === 1 ? "1 actividad" : `${plan.length} actividades`}:
              revisa cómo quedan con el horario nuevo.
            </p>
            {shift ? (
              <Checkbox
                name="mover_actividades"
                checked={moveWithEvent}
                onChange={(e) => setMoveWithEvent(e.target.checked)}
                label={`Mover las actividades con el evento (${shift})`}
              />
            ) : null}
            {affected.length > 0 ? (
              <ul className="flex flex-col gap-2">
                {affected.map((item) => (
                  <li
                    key={item.schedule.id}
                    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-lg bg-card px-3 py-2 text-foreground"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="font-bold break-words">{item.schedule.actividad}</span>
                      <span className="text-[13px] text-text-secondary">
                        {momentRange(item.schedule.hora_inicio, item.schedule.hora_fin)}
                        {item.removed ? (
                          <strong className="text-destructive"> → se eliminará</strong>
                        ) : item.moved ? (
                          <>
                            {" → "}
                            <strong className="text-foreground">
                              {momentRange(item.start, item.end)}
                            </strong>
                          </>
                        ) : null}
                      </span>
                    </span>
                    {item.outside ? (
                      <select
                        aria-label={`Qué hacer con ${item.schedule.actividad}`}
                        aria-invalid={item.decision ? undefined : true}
                        value={item.decision ?? ""}
                        onChange={(e) =>
                          setDecisions((prev) => ({
                            ...prev,
                            [item.schedule.id]: (e.target.value || undefined) as
                              | OutsideDecision
                              | undefined,
                          }))
                        }
                        className={`h-10 rounded-lg border bg-card px-2 text-sm text-foreground ${
                          item.decision ? "border-input" : "border-destructive"
                        }`}
                      >
                        <option value="">Queda fuera: elige qué hacer…</option>
                        <option value="fit">Ajustar al horario del evento</option>
                        <option value="remove">Eliminar la actividad</option>
                      </select>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            {pendingDecisions > 0 ? (
              <FieldError>
                {pendingDecisions === 1
                  ? "Falta decidir qué hacer con 1 actividad que queda fuera del evento."
                  : `Falta decidir qué hacer con ${pendingDecisions} actividades que quedan fuera del evento.`}
              </FieldError>
            ) : clash ? (
              <FieldError>
                Con estos ajustes, «{clash[0].schedule.actividad}» y «
                {clash[1].schedule.actividad}» se cruzan. Elimina una o ajusta sus
                horarios en el cronograma antes de cambiar el evento.
              </FieldError>
            ) : null}
            {affected.some((item) => item.moved || item.removed) ? (
              <p>
                Se guarda todo junto con el evento. A quien ya confirmó una actividad
                que cambia de horario se le pedirá reconfirmar; si se elimina, se le
                avisa.
              </p>
            ) : null}
          </div>
        ) : null}
        {datesChanged && registered > 0 ? (
          <p role="status" className={NOTICE_CLASS}>
            <Mail className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
            {noticeFor("fecha")}
          </p>
        ) : null}
      </Section>

      <Section title="Inscripciones">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <TextField
            label="Fecha límite para inscribirse"
            optional
            name="fecha_limite_inscripcion"
            type="date"
            // Entre hoy y el día del evento.
            min={today}
            max={values.fechaInicio || undefined}
            value={values.limiteInscripcion}
            onChange={(e) => {
              change("limiteInscripcion", "fecha_limite_inscripcion", e.target.value);
              fields.touch("fecha_limite_inscripcion");
            }}
            onBlur={() => fields.touch("fecha_limite_inscripcion")}
            error={shown("fecha_limite_inscripcion")}
            hint={
              values.limiteInscripcion
                ? "El público podrá inscribirse hasta el final de ese día."
                : "Entre hoy y el día del evento. Sin fecha, se inscribe hasta que empiece."
            }
          />
          <TextField
            label="Días límite para cancelar"
            optional
            name="dias_limite_cancelacion"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Ej. 2"
            hideCounter
            value={values.diasCancelacion}
            onChange={(e) => {
              change(
                "diasCancelacion",
                "dias_limite_cancelacion",
                e.target.value.replace(/\D/g, "").slice(0, 3),
              );
              fields.touch("dias_limite_cancelacion");
            }}
            onBlur={() => fields.touch("dias_limite_cancelacion")}
            error={shown("dias_limite_cancelacion")}
            hint={cancellationHint}
          />
        </div>
        <p className="text-[13px] text-muted-foreground">
          Estos límites son para el público. Un administrador puede inscribir o
          retirar a alguien hasta que el evento empiece.
        </p>
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
        {placeChanged && registered > 0 ? (
          <p role="status" className={NOTICE_CLASS}>
            <Mail className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
            {noticeFor("lugar")}
          </p>
        ) : null}

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
        {addressChanged && registered > 0 ? (
          <p role="status" className={NOTICE_CLASS}>
            <Mail className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
            {noticeFor("dirección")}
          </p>
        ) : null}

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
