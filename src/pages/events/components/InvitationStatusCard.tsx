import { Lock } from "lucide-react";

import { Button } from "../../../components/forms/Button";
import { Pill } from "../../../components/ui/primitives";
import { shortDate, STATUS_META } from "../../../lib/participations";
import type { Participation } from "../../../types/participation";

const TONES = {
  success: "border-primary-soft-border bg-primary-selected text-success-foreground",
  warning: "border-[#F0DDB4] bg-[#FBF7EE] text-warning-foreground",
  danger: "border-destructive-border bg-destructive-soft text-destructive-hover",
  neutral: "border-border bg-background text-text-secondary",
};

function describe(invitation: Participation): {
  tone: keyof typeof TONES;
  title: string;
  body: string;
} {
  const name = invitation.participante.nombre_completo;

  switch (invitation.estado_respuesta) {
    case "aceptada":
      return {
        tone: "success",
        title: `${name} confirmó su participación${
          invitation.fecha_respuesta ? ` el ${shortDate(invitation.fecha_respuesta)}` : ""
        }.`,
        body: "El responsable no se puede cambiar mientras la confirmación esté vigente. Si ya no podrá participar, revoca la confirmación y elige a otra persona.",
      };
    case "pendiente":
      return invitation.estado_envio === "error"
        ? {
            tone: "danger",
            title: `El correo de invitación a ${name} no se pudo enviar.`,
            body: "La invitación sigue visible para la persona en la aplicación. Reenvíala o cancélala para poder elegir otro responsable.",
          }
        : {
            tone: "warning",
            title: `Invitación enviada a ${name}${
              invitation.fecha_limite_respuesta
                ? ` · plazo hasta el ${shortDate(invitation.fecha_limite_respuesta)}`
                : ""
            }. Pendiente de respuesta.`,
            body: "Mientras esté pendiente no se puede cambiar el responsable. Cancela la invitación para elegir a otra persona.",
          };
    case "rechazada":
      return {
        tone: "danger",
        title: `${name} indicó que no podrá participar.`,
        body: `${
          invitation.motivo_rechazo ? `Motivo: «${invitation.motivo_rechazo}». ` : ""
        }Elige otro responsable.`,
      };
    case "vencida":
      return {
        tone: "neutral",
        title: `${name} no respondió a tiempo.`,
        body: "El plazo terminó. Elige otro responsable o vuelve a elegir a la misma persona para invitarla con un plazo nuevo.",
      };
    default:
      return {
        tone: "neutral",
        title: `Invitación a ${name} cancelada.`,
        body: "La actividad quedó sin confirmar. Elige otro responsable o vuelve a elegir a la misma persona para invitarla de nuevo.",
      };
  }
}

interface InvitationStatusCardProps {
  invitation: Participation;
  busy: boolean;
  onCancel: () => void;
  onResend: () => void;
  onRevoke: () => void;
}

/**
 * Estado de la invitación vigente de una actividad, dentro del cronograma.
 * Las acciones son las que el backend autoriza en `acciones_permitidas`.
 */
export function InvitationStatusCard({
  invitation,
  busy,
  onCancel,
  onResend,
  onRevoke,
}: InvitationStatusCardProps) {
  const { tone, title, body } = describe(invitation);
  const meta = STATUS_META[invitation.estado_respuesta];
  const can = (action: Participation["acciones_permitidas"][number]) =>
    invitation.acciones_permitidas.includes(action);
  const deliveryFailed =
    invitation.estado_respuesta === "pendiente" && invitation.estado_envio === "error";

  return (
    <div className={`flex flex-col gap-1.5 rounded-[10px] border px-3 py-2.5 ${TONES[tone]}`}>
      <Pill
        tone={deliveryFailed ? "danger" : meta.tone}
        icon={meta.icon}
        className="self-start !bg-card/70"
      >
        Estado: {deliveryFailed ? "Error de envío" : meta.label}
      </Pill>
      <p className="text-sm leading-snug font-bold break-words">{title}</p>
      <p className="text-[13px] leading-snug break-words text-text-secondary">{body}</p>
      {can("revocar_y_cambiar") || can("reenviar") || can("cancelar") ? (
        <div className="mt-0.5 flex flex-wrap gap-2">
          {can("revocar_y_cambiar") ? (
            <Button variant="dangerOutline" size="sm" onClick={onRevoke} disabled={busy}>
              Revocar y cambiar
            </Button>
          ) : null}
          {can("reenviar") ? (
            <Button variant="secondary" size="sm" onClick={onResend} disabled={busy}>
              Reenviar invitación
            </Button>
          ) : null}
          {can("cancelar") ? (
            <Button variant="dangerOutline" size="sm" onClick={onCancel} disabled={busy}>
              Cancelar invitación
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Responsable bloqueado mientras su invitación está pendiente o aceptada. */
export function LockedResponsible({ name }: { name: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[13px] font-bold text-foreground">Responsable</span>
      <div className="flex h-[var(--control-h)] items-center gap-2.5 rounded-[10px] border border-input bg-accent px-3 text-[15px] text-text-strong">
        <Lock className="size-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
        <span className="truncate">{name}</span>
      </div>
    </div>
  );
}
