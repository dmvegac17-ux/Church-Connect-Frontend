import {
  ArrowLeftRight,
  ArrowRight,
  Ban,
  CircleCheck,
  Lock,
  UserCheck,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { PARTICIPATIONS_PATH } from "../../config/navigation";
import { memberCapacity } from "../../lib/capacity";
import { formatDateTime } from "../../lib/format";
import type { Event } from "../../types/event";
import { CapacityMeter, hasStarted } from "./CapacityBits";

const CLOSED_CLASS =
  "flex items-center gap-2 rounded-[10px] bg-muted px-3 py-2.5 text-[15px] font-bold text-text-secondary";

const SEEN_KEY = "cc-inscripcion-reemplazada";

function readSeen(): string[] {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function markSeen(key: string): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...readSeen(), key]));
  } catch {
    // Sin almacenamiento el aviso vuelve a salir: no bloquea nada.
  }
}

/**
 * Bloque «Inscripción» del detalle de evento. Estados excluyentes, en este
 * orden: evento iniciado, participa, inscrito (con o sin plazo para
 * cancelar), fecha límite vencida, agotado o puede inscribirse.
 */
export function EnrollmentPanel({
  event,
  userId,
  onEnroll,
  onCancel,
  participationsPath = PARTICIPATIONS_PATH,
  title = "Inscripción",
  className = "border-b border-divider pb-5",
}: {
  /** Encabezado del bloque («Mi inscripción» en el panel de administración). */
  title?: string;
  /** Por defecto va sobre «Detalles», separado por una línea. */
  className?: string;
  event: Event;
  /** Para recordar por persona que ya cerró el aviso de reemplazo. */
  userId: string;
  onEnroll: () => void;
  onCancel: () => void;
  participationsPath?: string;
}) {
  const { aforo } = event;
  const seenKey = `${userId}:${event.id}`;
  const [dismissed, setDismissed] = useState(() => readSeen().includes(seenKey));
  const started = hasStarted(event);
  // Sin haber empezado, solo cierra la fecha límite de inscripción.
  const pastDeadline = !started && aforo.inscripciones_cerradas;
  const soldOut = memberCapacity(event).disponibles <= 0;
  const cancelUntil = formatDateTime(event.fecha_limite_cancelacion);
  // Solo se menciona el plazo si el evento definió uno propio.
  const hasCancelLimit = (event.dias_limite_cancelacion ?? 0) > 0;

  return (
    <section aria-label={title} className={`flex flex-col gap-3 ${className}`}>
      <h2 className="text-[17px] font-extrabold">{title}</h2>

      {started ? null : <CapacityMeter event={event} />}

      {started ? (
        <p className={CLOSED_CLASS}>
          <Lock className="size-5 shrink-0" aria-hidden="true" />
          Inscripciones cerradas
        </p>
      ) : aforo.participa ? (
        <div className="flex flex-col gap-2.5">
          <p
            role="note"
            className="flex items-start gap-2.5 rounded-xl bg-info-soft px-3.5 py-3 text-[15px] leading-[1.45] text-info-foreground"
          >
            <UserCheck className="size-5 shrink-0" aria-hidden="true" />
            <span>
              <strong className="font-extrabold">Participas en este evento.</strong> Ya
              tienes tu lugar, no necesitas inscribirte.
            </span>
          </p>
          <Link
            to={participationsPath}
            className="inline-flex items-center gap-1 self-start rounded-lg py-1 text-[15px] font-bold text-primary hover:underline"
          >
            Ver mis participaciones
            <ArrowRight className="size-[18px]" aria-hidden="true" />
          </Link>
          {aforo.inscripcion_reemplazada && !dismissed ? (
            <div
              role="status"
              className="flex items-start gap-2 rounded-[10px] border border-divider bg-background px-3 py-2.5 text-sm leading-[1.45] text-text-secondary"
            >
              <ArrowLeftRight className="size-[18px] shrink-0" aria-hidden="true" />
              <span className="flex-1">
                Tu inscripción se reemplazó porque ahora participas en el evento.
              </span>
              <button
                type="button"
                onClick={() => {
                  markSeen(seenKey);
                  setDismissed(true);
                }}
                aria-label="Cerrar aviso"
                className="-mt-1.5 -mr-1.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-hover-icon max-md:size-11"
              >
                <X className="size-[18px]" aria-hidden="true" />
              </button>
            </div>
          ) : null}
        </div>
      ) : aforo.inscrito ? (
        <div className="flex flex-col gap-2.5">
          <p className="flex items-center gap-2 rounded-[10px] bg-success-soft px-3 py-2.5 text-[15px] font-extrabold text-success-foreground">
            <CircleCheck className="size-5 shrink-0" aria-hidden="true" />
            Estás inscrito
          </p>
          {aforo.cancelacion_cerrada ? (
            // Sin botón: se explica por qué ya no se puede cancelar.
            <p className="text-sm leading-snug text-text-secondary">
              El plazo para cancelar terminó el {cancelUntil}. Si no puedes
              asistir, avisa a un administrador.
            </p>
          ) : (
            <>
              <button
                type="button"
                onClick={onCancel}
                aria-label={`Cancelar mi inscripción en ${event.titulo}`}
                className="h-11 rounded-[10px] border border-destructive-border bg-card text-[15px] font-bold text-destructive hover:bg-destructive-soft"
              >
                Cancelar mi inscripción
              </button>
              {hasCancelLimit ? (
                <p className="text-[13px] text-muted-foreground">
                  Puedes cancelar hasta el {cancelUntil}.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : pastDeadline ? (
        <div className="flex flex-col gap-2">
          <p className={CLOSED_CLASS}>
            <Lock className="size-5 shrink-0" aria-hidden="true" />
            Inscripciones cerradas
          </p>
          {event.fecha_limite_inscripcion ? (
            <p className="text-sm leading-snug text-text-secondary">
              El plazo para inscribirse terminó el{" "}
              {formatDateTime(event.fecha_limite_inscripcion)}.
            </p>
          ) : null}
        </div>
      ) : soldOut ? (
        <button
          type="button"
          disabled
          className="flex h-12 cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-disabled text-base font-extrabold text-icon-muted"
        >
          <Ban className="size-5" aria-hidden="true" />
          Cupos agotados
        </button>
      ) : (
        <button
          type="button"
          onClick={onEnroll}
          className="flex h-12 items-center justify-center gap-2 rounded-xl bg-primary text-base font-extrabold text-primary-foreground hover:bg-primary-hover"
        >
          <UserCheck className="size-5" aria-hidden="true" />
          Inscribirme
        </button>
      )}

      {/* Los plazos se dicen antes de inscribirse, no después. */}
      {!started && !aforo.participa && !aforo.inscrito && !pastDeadline ? (
        <ul className="flex flex-col gap-0.5 text-[13px] text-muted-foreground">
          {event.fecha_limite_inscripcion ? (
            <li>
              Inscripciones hasta el {formatDateTime(event.fecha_limite_inscripcion)}.
            </li>
          ) : null}
          {hasCancelLimit ? (
            <li>
              {aforo.cancelacion_cerrada
                ? "Si te inscribes ya no podrás cancelar: el plazo terminó."
                : `Podrás cancelar hasta el ${cancelUntil}.`}
            </li>
          ) : null}
        </ul>
      ) : null}
    </section>
  );
}
