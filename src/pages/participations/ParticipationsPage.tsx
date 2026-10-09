import {
  CalendarClock,
  CalendarDays,
  Check,
  CircleCheck,
  Clock,
  CloudOff,
  Info,
  MapPin,
  UserCheck,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { useToast } from "../../components/feedback/useToast";
import { Button } from "../../components/forms/Button";
import { Card, PageHeader } from "../../components/layout/Page";
import { EmptyState, Pill, SegmentedTabs } from "../../components/ui/primitives";
import {
  clockRange,
  conflictStatus,
  dateBlock,
  dayMonth,
  daysUntil,
  INVITATIONS_CHANGED_EVENT,
  longDay,
  STATUS_META,
} from "../../lib/participations";
import { participationService } from "../../services/participationService";
import { ApiError } from "../../types/api";
import type { Invitation, InvitationView } from "../../types/participation";
import { RespondDialog } from "./RespondDialog";

/** Con este margen (en días) la fecha límite se resalta. */
const DUE_SOON_DAYS = 2;

const EMPTY: Record<InvitationView, [string, string]> = {
  pendientes: [
    "No tienes invitaciones pendientes",
    "Cuando te asignen una actividad aparecerá aquí para que confirmes si participas.",
  ],
  respondidas: [
    "Aún no has respondido invitaciones",
    "Las invitaciones que aceptes o rechaces aparecerán aquí.",
  ],
  todas: [
    "Todavía no tienes invitaciones",
    "Cuando te asignen una actividad en un evento aparecerá aquí.",
  ],
};

const CONFLICT_MESSAGES: Partial<Record<Invitation["estado_respuesta"], string>> = {
  vencida: "Esta invitación ya venció: el plazo para responder terminó.",
  cancelada: "El administrador canceló esta invitación.",
  aceptada: "Ya habías aceptado esta invitación.",
  rechazada: "Ya habías rechazado esta invitación.",
  revocada: "El administrador asignó esta actividad a otra persona.",
};

function dueLabel(invitation: Invitation): { text: string; soon: boolean } | null {
  if (!invitation.fecha_limite_respuesta) {
    return null;
  }
  const left = daysUntil(invitation.fecha_limite_respuesta);
  const text =
    left <= 0
      ? "Responde hoy"
      : left === 1
        ? "Responde hoy o mañana"
        : `Responde antes del ${dayMonth(invitation.fecha_limite_respuesta)}`;
  return { text, soon: left <= DUE_SOON_DAYS };
}

function summary(pending: number): string {
  if (pending === 0) {
    return "No tienes invitaciones pendientes de respuesta.";
  }
  return pending === 1
    ? "Tienes 1 invitación pendiente de respuesta."
    : `Tienes ${pending} invitaciones pendientes de respuesta.`;
}

/** Confirmar participaciones (rol participante): invitaciones propias. */
export function ParticipationsPage() {
  const toast = useToast();
  const [items, setItems] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState<InvitationView>("pendientes");

  const [dialog, setDialog] = useState<{ id: string; mode: "accept" | "reject" } | null>(
    null,
  );
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoadError(false);

    participationService
      .listOwn("todas", controller.signal)
      .then((result) => {
        setItems(result.items);
        setLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }
        setLoadError(true);
        setLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  const retry = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  const pending = items.filter((i) => i.estado_respuesta === "pendiente");
  const answered = items.filter((i) => i.estado_respuesta !== "pendiente");
  const rows = tab === "pendientes" ? pending : tab === "respondidas" ? answered : items;
  const target = dialog ? (items.find((i) => i.id === dialog.id) ?? null) : null;

  const closeDialog = useCallback(() => {
    setDialog(null);
    setSubmitError(null);
  }, []);

  const open = (id: string, mode: "accept" | "reject") => {
    setReason("");
    setSubmitError(null);
    setDialog({ id, mode });
  };

  const submit = async () => {
    if (!dialog || !target || busy) {
      return;
    }
    setBusy(true);
    setSubmitError(null);
    try {
      // La tarjeta cambia solo con la respuesta del servidor.
      const updated =
        dialog.mode === "accept"
          ? await participationService.accept(dialog.id)
          : await participationService.reject(dialog.id, reason);
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
      closeDialog();
      toast.success(
        dialog.mode === "accept"
          ? `Confirmaste tu participación en «${target.actividad.nombre}».`
          : "Registramos que no podrás participar. El administrador asignará a otra persona.",
      );
      window.dispatchEvent(new Event(INVITATIONS_CHANGED_EVENT));
    } catch (err) {
      const current = conflictStatus(err);
      if (current && current !== "reasignada") {
        // Cambió mientras estaba abierta: se refleja el estado real.
        setItems((prev) =>
          prev.map((i) => (i.id === dialog.id ? { ...i, estado_respuesta: current } : i)),
        );
        closeDialog();
        toast.info(CONFLICT_MESSAGES[current] ?? "Esta invitación cambió de estado.");
        setReloadKey((k) => k + 1);
        window.dispatchEvent(new Event(INVITATIONS_CHANGED_EVENT));
      } else if (err instanceof ApiError && err.status === 404) {
        closeDialog();
        toast.error("Esta invitación ya no está disponible.");
        setReloadKey((k) => k + 1);
      } else {
        setSubmitError(
          err instanceof ApiError && err.status !== 0
            ? `${err.message} Tu invitación sigue pendiente.`
            : "No se pudo registrar tu respuesta. Tu invitación sigue pendiente; revisa tu conexión e inténtalo de nuevo.",
        );
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Confirmar participaciones"
        description={`Actividades de eventos a las que te invitaron.${
          loading || loadError ? "" : ` ${summary(pending.length)}`
        }`}
      />

      {loading ? (
        <div role="status" aria-label="Cargando invitaciones" className="flex flex-col gap-3.5">
          {[0, 1, 2].map((k) => (
            <Card key={k} className="flex gap-[18px] p-5">
              <div className="h-16 w-[60px] rounded-xl bg-muted" />
              <div className="flex flex-1 flex-col gap-2.5">
                <div className="h-3 w-[30%] rounded-md bg-muted" />
                <div className="h-[18px] w-[55%] rounded-md bg-muted" />
                <div className="h-3 w-[40%] rounded-md bg-accent" />
              </div>
            </Card>
          ))}
        </div>
      ) : loadError ? (
        <Card className="flex flex-col items-center gap-2.5 px-5 py-10 text-center">
          <span
            aria-hidden="true"
            className="flex size-12 items-center justify-center rounded-xl bg-destructive-soft text-destructive"
          >
            <CloudOff className="size-[26px]" />
          </span>
          <p role="alert" className="text-[17px] font-extrabold">
            No pudimos cargar tus invitaciones
          </p>
          <p className="text-[15px] text-muted-foreground">
            Revisa tu conexión e inténtalo de nuevo.
          </p>
          <Button variant="secondary" onClick={retry} className="mt-1">
            Reintentar
          </Button>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          <SegmentedTabs
            label="Filtrar invitaciones"
            className="self-start"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "pendientes", label: "Pendientes", count: pending.length },
              { value: "respondidas", label: "Respondidas", count: answered.length },
              { value: "todas", label: "Todas", count: items.length },
            ]}
          />

          {rows.length === 0 ? (
            <Card>
              <EmptyState
                icon={UserCheck}
                title={EMPTY[tab][0]}
                description={EMPTY[tab][1]}
              />
            </Card>
          ) : (
            <ul className="flex flex-col gap-3.5">
              {rows.map((invitation) => (
                <li key={invitation.id}>
                  <InvitationCard
                    invitation={invitation}
                    onAccept={() => open(invitation.id, "accept")}
                    onReject={() => open(invitation.id, "reject")}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <RespondDialog
        invitation={target}
        mode={dialog?.mode ?? "accept"}
        reason={reason}
        onReasonChange={setReason}
        busy={busy}
        error={submitError}
        onSubmit={() => void submit()}
        onClose={closeDialog}
      />
    </div>
  );
}

export function InvitationCard({
  invitation,
  onAccept,
  onReject,
}: {
  invitation: Invitation;
  onAccept: () => void;
  onReject: () => void;
}) {
  const { actividad, evento, responsable } = invitation;
  const status = invitation.estado_respuesta;
  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;
  const block = dateBlock(actividad.fecha);
  const due = status === "pendiente" ? dueLabel(invitation) : null;

  return (
    <Card as="article" className="overflow-hidden">
      <div className="flex flex-wrap gap-[18px] p-5">
        <div
          aria-hidden="true"
          className={`w-[62px] shrink-0 self-start rounded-xl py-[9px] text-center ${
            meta.muted ? "bg-muted text-text-secondary" : "bg-primary-soft text-primary-hover"
          }`}
        >
          <span className="block text-xs font-extrabold tracking-[0.06em]">
            {block.month}
          </span>
          <span className="block text-2xl leading-[1.1] font-extrabold">{block.day}</span>
        </div>

        <div className="flex min-w-[220px] flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-bold text-primary">{evento.nombre}</span>
            <Pill tone={meta.tone} className="!h-7 !text-[13px]">
              <StatusIcon className="size-4" aria-hidden="true" />
              {status === "pendiente" ? "Pendiente de respuesta" : meta.label}
            </Pill>
          </div>
          <h2
            className={`text-[19px] font-extrabold break-words ${
              meta.muted ? "text-muted-foreground" : "text-foreground"
            }`}
          >
            {actividad.nombre}
          </h2>
          <div className="flex flex-wrap gap-x-[18px] gap-y-1.5 text-[15px] text-text-strong">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-[18px] text-primary" aria-hidden="true" />
              {longDay(actividad.fecha)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="size-[18px] text-primary" aria-hidden="true" />
              {clockRange(actividad.hora_inicio, actividad.hora_fin)}
            </span>
            <span className="flex min-w-0 items-center gap-1.5">
              <MapPin className="size-[18px] shrink-0 text-primary" aria-hidden="true" />
              <span className="break-words">{actividad.lugar}</span>
            </span>
          </div>
          {actividad.descripcion ? (
            <p className="text-[15px] leading-[1.55] text-pretty text-text-secondary">
              {actividad.descripcion}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-x-[18px] gap-y-1 text-sm text-muted-foreground">
            {responsable ? (
              <span>
                Responsable:{" "}
                <strong className="font-bold text-text-strong">
                  {responsable.nombre}
                  {responsable.area ? ` · ${responsable.area}` : ""}
                </strong>
              </span>
            ) : null}
            <span>Invitación recibida el {dayMonth(invitation.fecha_invitacion)}</span>
          </div>
        </div>
      </div>

      {status === "pendiente" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider bg-surface-alt px-5 py-3.5">
          {due ? (
            <span
              className={`flex items-center gap-1.5 text-sm ${
                due.soon
                  ? "font-extrabold text-warning-foreground"
                  : "font-semibold text-muted-foreground"
              }`}
            >
              <CalendarClock className="size-[18px]" aria-hidden="true" />
              {due.text}
            </span>
          ) : (
            <span />
          )}
          <div className="flex flex-wrap gap-2.5">
            <Button
              variant="secondary"
              onClick={onReject}
              aria-label={`Rechazar participación en ${actividad.nombre}`}
            >
              No puedo participar
            </Button>
            <Button
              onClick={onAccept}
              aria-label={`Aceptar participación en ${actividad.nombre}`}
            >
              <Check className="size-[19px]" aria-hidden="true" />
              Aceptar participación
            </Button>
          </div>
        </div>
      ) : status === "aceptada" ? (
        <p className="flex items-center gap-2 border-t border-success-soft bg-primary-selected px-5 py-3 text-sm text-success-foreground">
          <CircleCheck className="size-[18px] shrink-0" aria-hidden="true" />
          Confirmaste tu participación
          {invitation.fecha_respuesta ? ` el ${dayMonth(invitation.fecha_respuesta)}` : ""}.
        </p>
      ) : status === "rechazada" ? (
        <div className="flex flex-col gap-1 border-t border-destructive-border bg-destructive-soft px-5 py-3 text-sm text-destructive-hover">
          <p className="flex items-center gap-2">
            <Info className="size-[18px] shrink-0" aria-hidden="true" />
            Respondiste que no podrás participar
            {invitation.fecha_respuesta
              ? ` el ${dayMonth(invitation.fecha_respuesta)}`
              : ""}
            . El administrador asignará a otra persona.
          </p>
          {invitation.motivo_rechazo ? (
            <p className="pl-[26px] break-words text-muted-foreground">
              Motivo: {invitation.motivo_rechazo}
            </p>
          ) : null}
        </div>
      ) : (
        <p className="flex items-center gap-2 border-t border-divider bg-background px-5 py-3 text-sm text-text-secondary">
          <Info className="size-[18px] shrink-0" aria-hidden="true" />
          {status === "vencida"
            ? `El plazo para responder terminó${
                invitation.fecha_limite_respuesta
                  ? ` el ${dayMonth(invitation.fecha_limite_respuesta)}`
                  : ""
              }. Ya no puedes responder esta invitación.`
            : status === "revocada"
              ? "El administrador asignó esta actividad a otra persona. Ya no estás asignado."
              : "El administrador canceló esta invitación. No necesitas hacer nada."}
        </p>
      )}
    </Card>
  );
}
