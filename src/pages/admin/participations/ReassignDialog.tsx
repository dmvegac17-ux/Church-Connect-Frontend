import { CalendarCheck, TriangleAlert, User } from "lucide-react";
import { useEffect, useId, useState } from "react";

import { Alert, ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { Spinner } from "../../../components/feedback/Spinner";
import { Button } from "../../../components/forms/Button";
import {
  controlClass,
  FieldError,
  HINT_CLASS,
  LABEL_CLASS,
} from "../../../components/forms/fieldStyles";
import { Modal } from "../../../components/ui/Overlay";
import {
  clockRange,
  conflictStatus,
  dateInDays,
  plural,
  shortDate,
  validationField,
} from "../../../lib/participations";
import { participationService } from "../../../services/participationService";
import { ApiError } from "../../../types/api";
import type {
  EligibleParticipant,
  Participation,
  ReassignmentInfo,
  ReplacementResult,
  ResponseStatus,
} from "../../../types/participation";
import { ROLE_LABELS } from "../../../types/user";

const MAX_DAYS = 30;

const RELEASE_LABELS: Record<ReassignmentInfo["motivo_liberacion"], string> = {
  rechazo: "Indicó que no podrá participar",
  sin_respuesta: "No respondió a tiempo",
  cancelada: "Invitación cancelada",
  aceptada: "Confirmó su participación",
};

/** Mensaje de validación del plazo; `undefined` si el valor es válido. */
export function daysError(
  value: string,
  daysToEvent: number,
  maxDays: number,
): string | undefined {
  if (maxDays < 1) {
    return "El evento es mañana o ya pasó: no queda tiempo para pedir confirmación.";
  }
  const text = value.trim();
  if (!text) {
    return `Escribe un número de días entre 1 y ${maxDays}.`;
  }
  if (!/^\d+$/.test(text)) {
    return "Usa solo números enteros.";
  }
  const days = Number(text);
  if (days < 1 || days > MAX_DAYS) {
    return `El plazo debe estar entre 1 y ${MAX_DAYS} días.`;
  }
  if (days > maxDays) {
    return `El evento empieza en ${daysToEvent} días. El plazo máximo es de ${plural(maxDays, "día", "días")}.`;
  }
  return undefined;
}

interface ReassignDialogProps {
  /** Invitación a reemplazar; `null` cierra la ventana. */
  invitation: Participation | null;
  onClose: () => void;
  /** Solo tras `200`: la tabla se actualiza con lo que devolvió el servidor. */
  onDone: (result: ReplacementResult, mode: ReassignmentInfo["modo"]) => void;
  /** `409`: la invitación cambió mientras la ventana estaba abierta. */
  onConflict: (current: ResponseStatus | null, message: string) => void;
}

/**
 * Ventana única para "Reasignar" (invitación liberada) y "Revocar y cambiar"
 * (invitación aceptada). El modo lo decide el servidor.
 */
export function ReassignDialog({
  invitation,
  onClose,
  onDone,
  onConflict,
}: ReassignDialogProps) {
  const fieldId = useId();
  const invitationId = invitation?.id ?? null;
  const activityId = invitation?.actividad.id ?? null;

  const [info, setInfo] = useState<ReassignmentInfo | null>(null);
  const [people, setPeople] = useState<EligibleParticipant[]>([]);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [to, setTo] = useState("");
  const [days, setDays] = useState("");
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverErrors, setServerErrors] = useState<{
    to?: string;
    days?: string;
    general?: unknown;
  }>({});

  useEffect(() => {
    setInfo(null);
    setPeople([]);
    setLoadError(null);
    setTo("");
    setDays("");
    setTried(false);
    setServerErrors({});
    if (!invitationId || !activityId) {
      return;
    }
    const controller = new AbortController();

    Promise.all([
      participationService.reassignmentInfo(invitationId, controller.signal),
      participationService.eligible(activityId, controller.signal),
    ])
      .then(([nextInfo, nextPeople]) => {
        setInfo(nextInfo);
        setPeople(nextPeople);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        if (err instanceof ApiError && err.status === 409) {
          onConflict(conflictStatus(err), err.message);
        } else {
          setLoadError(err);
        }
      });

    return () => controller.abort();
    // `onConflict` cambia en cada render del padre; la carga depende solo de la invitación.
  }, [invitationId, activityId]);

  const revoke = info?.modo === "revocar";
  const maxDays = info?.dias_para_confirmar_max ?? 0;
  const daysToEvent = info?.dias_hasta_evento ?? 0;
  const noTime = info !== null && maxDays < 1;

  const toError = to ? undefined : "Elige a quién asignar la actividad.";
  const localDaysError = info ? daysError(days, daysToEvent, maxDays) : undefined;
  const shownToError = serverErrors.to ?? (tried ? toError : undefined);
  const shownDaysError =
    serverErrors.days ?? (tried || days.length > 0 ? localDaysError : undefined);

  const validDays = info && !localDaysError ? Number(days) : null;
  const dueDate = validDays ? dateInDays(validDays) : null;

  const submit = async () => {
    if (!invitation || !info) {
      return;
    }
    if (toError || localDaysError) {
      setTried(true);
      return;
    }
    setSaving(true);
    setServerErrors({});
    const dto = { participante_id: to, dias_para_confirmar: Number(days) };
    try {
      const result = revoke
        ? await participationService.revoke(invitation.id, dto)
        : await participationService.reassign(invitation.id, dto);
      onDone(result, info.modo);
    } catch (err) {
      const field = validationField(err);
      if (err instanceof ApiError && err.status === 409) {
        onConflict(conflictStatus(err), err.message);
      } else if (field === "dias_para_confirmar") {
        setServerErrors({ days: (err as ApiError).message });
      } else if (field === "participante_id") {
        setServerErrors({ to: (err as ApiError).message });
      } else {
        setServerErrors({ general: err });
      }
    } finally {
      setSaving(false);
    }
  };

  const requestClose = () => {
    if (!saving) {
      onClose();
    }
  };

  return (
    <Modal
      open={invitation !== null}
      onClose={requestClose}
      maxWidth="max-w-[520px]"
      title={
        invitation?.estado_respuesta === "aceptada"
          ? "Revocar confirmación y cambiar participante"
          : "Reasignar actividad"
      }
      subtitle={
        invitation ? (
          <>
            <span className="block text-[15px] font-bold text-foreground">
              {invitation.actividad.nombre}
            </span>
            {invitation.evento.nombre} · {shortDate(invitation.actividad.fecha)} ·{" "}
            {clockRange(invitation.actividad.hora_inicio, invitation.actividad.hora_fin)}
          </>
        ) : undefined
      }
      footer={
        <div className="flex flex-wrap justify-end gap-2.5">
          <Button variant="secondary" onClick={requestClose} disabled={saving}>
            Cancelar
          </Button>
          {noTime ? null : (
            <Button
              variant={revoke ? "danger" : "primary"}
              onClick={() => void submit()}
              loading={saving}
              loadingLabel="Enviando…"
              // Con un plazo inválido ya escrito, el motivo se lee junto al campo.
              disabled={!info || Boolean(days && localDaysError)}
            >
              {revoke ? "Revocar y enviar invitación" : "Reasignar y enviar invitación"}
            </Button>
          )}
        </div>
      }
    >
      <div className="flex flex-col gap-4 px-5 py-[18px]">
        {loadError ? (
          <ErrorAlert error={loadError} />
        ) : !info ? (
          <div className="py-8 text-center text-muted-foreground">
            <Spinner label="Cargando datos de la actividad…" />
          </div>
        ) : (
          <>
            {serverErrors.general ? <ErrorAlert error={serverErrors.general} /> : null}

            <div className="flex items-start gap-2.5 rounded-xl border border-divider bg-surface-alt px-3.5 py-3">
              <User className="size-5 shrink-0 text-text-secondary" aria-hidden="true" />
              <p className="flex min-w-0 flex-col gap-0.5">
                <span className="text-[13px] text-muted-foreground">
                  Asignado actualmente
                </span>
                <span className="text-[15px] font-bold">
                  {info.asignado_actual.nombre_completo}
                </span>
                <span className="text-[13px] text-muted-foreground">
                  {RELEASE_LABELS[info.motivo_liberacion]}
                </span>
                {info.motivo_rechazo ? (
                  <span className="text-[13px] break-words text-text-secondary">
                    Rechazó: «{info.motivo_rechazo}»
                  </span>
                ) : null}
              </p>
            </div>

            {revoke ? (
              <p
                role="note"
                className="flex items-start gap-2 rounded-[10px] bg-destructive-soft px-3 py-2.5 text-sm leading-snug text-destructive-hover"
              >
                <TriangleAlert className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
                Su confirmación quedará revocada y se le notificará que ya no está
                asignado a esta actividad.
              </p>
            ) : null}

            {noTime ? (
              <Alert
                variant="warning"
                message="El evento es mañana o ya pasó: no queda tiempo para pedir confirmación a otra persona."
              />
            ) : (
              <>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`${fieldId}-to`} className={LABEL_CLASS}>
                    Nuevo participante
                  </label>
                  <select
                    id={`${fieldId}-to`}
                    value={to}
                    disabled={saving}
                    aria-invalid={shownToError ? true : undefined}
                    aria-describedby={shownToError ? `${fieldId}-to-error` : undefined}
                    onChange={(e) => {
                      setTo(e.target.value);
                      setServerErrors((prev) => ({ ...prev, to: undefined }));
                    }}
                    className={controlClass(Boolean(shownToError), "h-[var(--control-h)]")}
                  >
                    <option value="">Selecciona un usuario</option>
                    {people.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nombre_completo} · {ROLE_LABELS[p.rol]}
                        {p.cruce_horario ? " · otra actividad a esa hora" : ""}
                      </option>
                    ))}
                  </select>
                  {shownToError ? (
                    <FieldError id={`${fieldId}-to-error`}>{shownToError}</FieldError>
                  ) : people.length === 0 ? (
                    <p className={HINT_CLASS}>
                      No hay otros usuarios activos disponibles. Registra a la
                      persona desde Usuarios.
                    </p>
                  ) : people.find((p) => p.id === to)?.cruce_horario ? (
                    <p className="text-[13px] font-bold text-warning-foreground">
                      Esta persona ya tiene otra actividad que se cruza en horario.
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-col gap-1.5">
                  <label htmlFor={`${fieldId}-days`} className={LABEL_CLASS}>
                    Días para confirmar
                  </label>
                  <span className="flex items-center gap-2.5">
                    <input
                      id={`${fieldId}-days`}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="Ej. 7"
                      value={days}
                      disabled={saving}
                      aria-invalid={shownDaysError ? true : undefined}
                      aria-describedby={`${fieldId}-days-help`}
                      onChange={(e) => {
                        setDays(e.target.value.replace(/\D/g, "").slice(0, 2));
                        setServerErrors((prev) => ({ ...prev, days: undefined }));
                      }}
                      className={controlClass(
                        Boolean(shownDaysError),
                        "h-[var(--control-h)] !w-[110px]",
                      )}
                    />
                    <span className="text-[15px] text-text-secondary">días</span>
                  </span>
                  <p id={`${fieldId}-days-help`} className={HINT_CLASS}>
                    Entre 1 y {maxDays} días. El evento es el{" "}
                    {shortDate(info.actividad.fecha)} (en {daysToEvent} días).
                  </p>
                  {shownDaysError ? <FieldError>{shownDaysError}</FieldError> : null}
                  {dueDate && validDays && !shownDaysError ? (
                    <p className="flex items-center gap-1.5 text-[13px] font-bold text-success-foreground">
                      <CalendarCheck className="size-4 shrink-0" aria-hidden="true" />
                      Deberá responder antes del {shortDate(dueDate)},{" "}
                      {plural(daysToEvent - validDays, "día", "días")} antes del evento.
                    </p>
                  ) : null}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
