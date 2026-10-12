import { useCallback, useState } from "react";

import type { EnrollmentMode } from "../components/registrations/EnrollmentDialog";
import { useToast } from "../components/feedback/useToast";
import { seatsLeftText } from "../lib/capacity";
import {
  registrationConflict,
  registrationService,
} from "../services/registrationService";
import { ApiError } from "../types/api";
import type { Event } from "../types/event";
import type { RegistrationConflict } from "../types/registration";

const CONFLICT_MESSAGES: Record<RegistrationConflict, string> = {
  sin_cupos:
    "Se agotaron los cupos mientras te inscribías. Tu inscripción no se registró.",
  ya_inscrito: "Ya estabas inscrito en este evento.",
  es_participante:
    "Participas en este evento: ya tienes tu lugar y no necesitas inscribirte.",
  inscripciones_cerradas: "Las inscripciones de este evento ya cerraron.",
  cancelacion_cerrada:
    "El plazo para cancelar tu inscripción a este evento ya terminó.",
};

interface Target {
  event: Event;
  mode: EnrollmentMode;
}

export interface UseEnrollmentResult {
  /** Evento del diálogo abierto, o `null`. */
  event: Event | null;
  mode: EnrollmentMode;
  busy: boolean;
  error: string | null;
  /** Abre la confirmación de inscribirse. */
  enroll: (event: Event) => void;
  /** Abre la confirmación de cancelar la inscripción. */
  cancel: (event: Event) => void;
  submit: () => void;
  close: () => void;
}

/**
 * Inscribirse a un evento y cancelar la inscripción, con su diálogo.
 * `onChanged` se llama cuando el servidor confirmó el cambio (o cuando
 * rechazó porque el estado ya era otro): ahí se recargan los datos.
 */
export function useEnrollment(onChanged: () => void): UseEnrollmentResult {
  const toast = useToast();
  const [target, setTarget] = useState<Target | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = (event: Event, mode: EnrollmentMode) => {
    setError(null);
    setTarget({ event, mode });
  };

  const close = useCallback(() => {
    setTarget(null);
    setError(null);
  }, []);

  const submit = async () => {
    if (!target || busy) {
      return;
    }
    const { event, mode } = target;
    setBusy(true);
    setError(null);

    try {
      if (mode === "enroll") {
        // La interfaz cambia solo cuando el servidor confirma la inscripción.
        const created = await registrationService.enroll(event.id);
        const left = Math.max(
          0,
          created.cupos_disponibles ?? event.aforo.disponibles - 1,
        );
        close();
        toast.success(`Quedaste inscrito. ${seatsLeftText(left)}`);
      } else if (event.aforo.inscripcion_id) {
        await registrationService.remove(event.aforo.inscripcion_id);
        close();
        toast.success("Cancelaste tu inscripción. Tu cupo quedó libre.");
      }
      onChanged();
    } catch (err) {
      const conflict = registrationConflict(err);
      if (conflict) {
        setError(CONFLICT_MESSAGES[conflict]);
        // Los cupos o la situación cambiaron: se refleja lo real debajo.
        onChanged();
      } else if (err instanceof ApiError && err.status === 404) {
        close();
        toast.info("Esta inscripción ya no existe.");
        onChanged();
      } else {
        setError(
          err instanceof ApiError && err.status !== 0
            ? err.message
            : mode === "enroll"
              ? "No se pudo registrar tu inscripción. Revisa tu conexión e inténtalo de nuevo."
              : "No se pudo cancelar tu inscripción. Revisa tu conexión e inténtalo de nuevo.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return {
    event: target?.event ?? null,
    mode: target?.mode ?? "enroll",
    busy,
    error,
    enroll: (event) => open(event, "enroll"),
    cancel: (event) => open(event, "cancel"),
    submit: () => void submit(),
    close,
  };
}
