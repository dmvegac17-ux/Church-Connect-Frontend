import {
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  Check,
  ChevronRight,
  CircleCheck,
  Clock,
  CloudOff,
  Info,
  MapPin,
  Send,
  TriangleAlert,
  UserCheck,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

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
  longDateTime,
  longDay,
  shortDate,
  STATUS_META,
} from "../../lib/participations";
import { isoToWall, shortMoment, timeText } from "../../lib/dateTimeRange";
import { useBackgroundRefresh } from "../../hooks/useBackgroundRefresh";
import { useRefreshSignal } from "../../lib/refresh";
import { participationService } from "../../services/participationService";
import { ApiError } from "../../types/api";
import type { Invitation } from "../../types/participation";
import { RespondDialog } from "./RespondDialog";

/** Con este margen (en días) la fecha límite se resalta. */
const DUE_SOON_DAYS = 3;

/**
 * `member`: «Mis participaciones» de la vista de miembro.
 * `admin`: «Mis participaciones» del panel; el administrador también puede
 * ser asignado a una actividad, por otro administrador o por sí mismo.
 */
export type ParticipationsVariant = "member" | "admin";

/**
 * Una sola página para lo propio: lo que falta responder, lo ya confirmado
 * (donde uno sí participa) y todo el historial.
 */
type Tab = "pendientes" | "confirmadas" | "rechazadas" | "vencidas" | "todas";

/** Sin ninguna invitación, en cualquiera de las dos vistas. */
const EMPTY_ALL: [string, string] = [
  "Aún no tienes invitaciones",
  "Cuando te asignen a una actividad, la verás aquí para confirmar.",
];

const EMPTY_ADMIN: Record<Tab, [string, string]> = {
  pendientes: [
    "No tienes invitaciones pendientes",
    "Las nuevas invitaciones aparecerán aquí.",
  ],
  confirmadas: [
    "Aún no tienes participaciones confirmadas",
    "Las actividades que aceptes o te asignes aparecerán aquí.",
  ],
  rechazadas: [
    "No has rechazado ninguna invitación",
    "Las que indiques que no puedes atender aparecerán aquí.",
  ],
  vencidas: [
    "No se te ha vencido ninguna invitación",
    "Las que no respondas a tiempo aparecerán aquí.",
  ],
  todas: EMPTY_ALL,
};

const EMPTY: Record<Tab, [string, string]> = {
  pendientes: [
    "No tienes invitaciones pendientes",
    "Cuando te asignen una actividad aparecerá aquí para que confirmes si participas.",
  ],
  confirmadas: [
    "Aún no tienes participaciones confirmadas",
    "Las actividades que aceptes aparecerán aquí.",
  ],
  rechazadas: [
    "No has rechazado ninguna invitación",
    "Las invitaciones en las que indiques que no puedes participar aparecerán aquí.",
  ],
  vencidas: [
    "No se te ha vencido ninguna invitación",
    "Las invitaciones que no respondas antes de su fecha límite aparecerán aquí.",
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
        ? "Responde antes de mañana"
        : `Responde antes del ${dayMonth(invitation.fecha_limite_respuesta)}`;
  return { text, soon: left <= DUE_SOON_DAYS };
}

function summary(pending: number, variant: ParticipationsVariant): string {
  const suffix = variant === "admin" ? "" : " de respuesta";
  if (pending === 0) {
    return `No tienes invitaciones pendientes${suffix}.`;
  }
  return pending === 1
    ? `Tienes 1 invitación pendiente${suffix}.`
    : `Tienes ${pending} invitaciones pendientes${suffix}.`;
}

/**
 * Invitaciones propias. Cualquier usuario puede tenerlas: participar no es un
 * rol, es estar asignado a una actividad.
 */
export function ParticipationsPage({
  variant = "member",
}: {
  variant?: ParticipationsVariant;
}) {
  const isAdmin = variant === "admin";
  const toast = useToast();
  const [items, setItems] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [tab, setTab] = useState<Tab>("pendientes");
  const opened = useRef(false);

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
        // Sin nada por responder se abre en lo confirmado (incluido lo que
        // uno mismo se asignó); si tampoco hay, en «Todas».
        if (!opened.current) {
          opened.current = true;
          const has = (estado: Invitation["estado_respuesta"]) =>
            result.items.some((i) => i.estado_respuesta === estado);
          if (!has("pendiente")) {
            setTab(has("aceptada") ? "confirmadas" : "todas");
          }
        }
        setLoading(false);
      })
      .catch(() => {
        if (controller.signal.aborted) {
          return;
        }
        // Si falla un refresco en segundo plano, se conserva lo que ya se
        // veía: el error solo se muestra cuando no hay nada cargado.
        if (!opened.current) {
          setLoadError(true);
        }
        setLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  const retry = () => {
    setLoading(true);
    setReloadKey((k) => k + 1);
  };

  // Una invitación nueva o un cambio en una actividad aparecen solos: se
  // vuelve a consultar en segundo plano, sin indicador de carga.
  const refreshQuietly = useCallback(() => setReloadKey((k) => k + 1), []);
  useBackgroundRefresh(refreshQuietly, { whenHidden: true });
  useRefreshSignal(refreshQuietly);

  const pending = items.filter((i) => i.estado_respuesta === "pendiente");
  const confirmed = items.filter((i) => i.estado_respuesta === "aceptada");
  const rejected = items.filter((i) => i.estado_respuesta === "rechazada");
  const expired = items.filter((i) => i.estado_respuesta === "vencida");
  const rows = {
    pendientes: pending,
    confirmadas: confirmed,
    rechazadas: rejected,
    vencidas: expired,
    todas: items,
  }[tab];
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
          : isAdmin
            ? "Registramos que no podrás participar. La actividad quedó pendiente de asignación."
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
        title="Mis participaciones"
        description={`${
          isAdmin
            ? "Actividades en las que participas tú."
            : "Actividades de eventos en las que participas o te invitaron."
        }${loading || loadError ? "" : ` ${summary(pending.length, variant)}`}`}
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
            label={isAdmin ? "Filtrar mis invitaciones" : "Filtrar invitaciones"}
            className="self-start"
            value={tab}
            onChange={setTab}
            tabs={[
              { value: "pendientes", label: "Por confirmar", count: pending.length },
              { value: "confirmadas", label: "Confirmadas", count: confirmed.length },
              { value: "rechazadas", label: "Rechazadas", count: rejected.length },
              { value: "vencidas", label: "Vencidas", count: expired.length },
              { value: "todas", label: "Todas", count: items.length },
            ]}
          />

          {rows.length === 0 ? (
            <Card>
              <EmptyState
                icon={isAdmin ? CalendarCheck : UserCheck}
                title={(items.length === 0 ? EMPTY_ALL : (isAdmin ? EMPTY_ADMIN : EMPTY)[tab])[0]}
                description={
                  (items.length === 0 ? EMPTY_ALL : (isAdmin ? EMPTY_ADMIN : EMPTY)[tab])[1]
                }
              />
            </Card>
          ) : (
            <ul className="grid gap-3.5 min-[1100px]:grid-cols-2">
              {rows.map((invitation) => (
                <li key={invitation.id} className="min-w-0">
                  <InvitationCard
                    invitation={invitation}
                    variant={variant}
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
        variant={variant}
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

/** «Invitado por {nombre} el {fecha}» o, si se asignó él mismo, «Te asignaste el {fecha}». */
function originLabel(invitation: Invitation): string {
  if (invitation.autoasignada) {
    return `Te asignaste el ${shortDate(
      invitation.fecha_respuesta ?? invitation.fecha_invitacion,
    )}`;
  }
  return `Invitado por ${
    invitation.responsable
      ? `${invitation.responsable.nombre} (administrador)`
      : "la administración"
  } el ${longDateTime(invitation.fecha_invitacion)}`;
}

/** Qué cambió respecto de lo que la persona había confirmado. */
function changeOf(invitation: Invitation) {
  const before = invitation.cambio?.antes;
  if (!before) {
    return null;
  }
  const { actividad } = invitation;
  const range = (start: string, end: string) =>
    `${shortMoment(isoToWall(start))} – ${timeText(isoToWall(end).split("T")[1])}`;
  const timeMoved =
    new Date(before.hora_inicio).getTime() !== new Date(actividad.hora_inicio).getTime() ||
    new Date(before.hora_fin).getTime() !== new Date(actividad.hora_fin).getTime();

  return {
    time: timeMoved ? range(before.hora_inicio, before.hora_fin) : null,
    timeNow: range(actividad.hora_inicio, actividad.hora_fin),
    name: before.actividad !== actividad.nombre ? before.actividad : null,
  };
}

export function InvitationCard({
  invitation,
  variant = "member",
  onAccept,
  onReject,
}: {
  invitation: Invitation;
  variant?: ParticipationsVariant;
  onAccept: () => void;
  onReject: () => void;
}) {
  const isAdmin = variant === "admin";
  const { actividad, evento, responsable } = invitation;
  const status = invitation.estado_respuesta;
  const meta = STATUS_META[status];
  const StatusIcon = meta.icon;
  const block = dateBlock(actividad.fecha);
  const due = status === "pendiente" ? dueLabel(invitation) : null;
  const change = invitation.por_reconfirmar ? changeOf(invitation) : null;

  return (
    <Card as="article" className="flex h-full flex-col overflow-hidden">
      <div className="flex flex-1 flex-wrap content-start gap-3.5 p-4">
        <div
          aria-hidden="true"
          className={`w-[52px] shrink-0 self-start rounded-xl py-1.5 text-center ${
            meta.muted ? "bg-muted text-text-secondary" : "bg-primary-soft text-primary-hover"
          }`}
        >
          <span className="block text-xs font-extrabold tracking-[0.06em]">
            {block.month}
          </span>
          <span className="block text-xl leading-[1.1] font-extrabold">{block.day}</span>
        </div>

        <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              to={`/events/${evento.id}`}
              title="Ver el evento"
              className="inline-flex min-w-0 items-center gap-0.5 rounded-md text-sm font-bold text-primary hover:underline"
            >
              <span className="break-words">{evento.nombre}</span>
              <ChevronRight className="size-4 shrink-0" aria-hidden="true" />
            </Link>
            <Pill tone={meta.tone} className="!h-7 !text-[13px]">
              <StatusIcon className="size-4" aria-hidden="true" />
              {invitation.por_reconfirmar
                ? "Por reconfirmar"
                : status === "pendiente"
                  ? "Pendiente de respuesta"
                  : meta.label}
            </Pill>
          </div>
          <h2
            className={`text-[19px] font-extrabold break-words ${
              meta.muted ? "text-muted-foreground" : "text-foreground"
            }`}
          >
            {actividad.nombre}
          </h2>
          <div className="flex flex-wrap gap-x-3.5 gap-y-1 text-sm text-text-strong">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="size-[18px] text-primary" aria-hidden="true" />
              {isAdmin ? shortDate(actividad.fecha) : longDay(actividad.fecha)}
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
          {change ? (
            <div
              role="note"
              className="flex items-start gap-2 self-start rounded-[10px] border border-info-border bg-info-soft px-3 py-2 text-sm text-info-foreground"
            >
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div className="flex flex-col gap-0.5">
                <span className="font-bold">
                  Esta actividad cambió después de que la confirmaste.
                </span>
                {change.time ? (
                  <span>
                    Horario:{" "}
                    <span className="text-destructive line-through">{change.time}</span> →{" "}
                    <strong className="text-success-foreground">{change.timeNow}</strong>
                  </span>
                ) : null}
                {change.name ? (
                  <span>
                    Nombre:{" "}
                    <span className="text-destructive line-through">{change.name}</span> →{" "}
                    <strong className="text-success-foreground">{actividad.nombre}</strong>
                  </span>
                ) : null}
              </div>
            </div>
          ) : null}
          {isAdmin ? (
            <p className="flex items-start gap-2 self-start rounded-[10px] bg-primary-soft px-3 py-2 text-sm text-text-strong shadow-[0_0_0_1px_var(--primary-soft-border),0_0_16px_rgba(62,107,79,0.3)]">
              <Send className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              {originLabel(invitation)}
            </p>
          ) : (
            <>
              {actividad.descripcion ? (
                <p className="text-[15px] leading-[1.55] text-pretty text-text-secondary">
                  {actividad.descripcion}
                </p>
              ) : null}
              <div className="flex items-start gap-2 self-start rounded-[10px] bg-primary-soft px-3 py-2 text-sm text-text-strong shadow-[0_0_0_1px_var(--primary-soft-border),0_0_16px_rgba(62,107,79,0.3)]">
                <Send className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <div className="flex flex-col gap-0.5">
                {/* Quien invita, no quien dirige la actividad: sin su
                    ministerio, que se leía como otra persona a cargo. */}
                {responsable ? (
                  <span>
                    Te invitó{" "}
                    <strong className="font-bold text-text-strong">
                      {responsable.nombre}
                    </strong>
                    , administrador de Church Connect
                  </span>
                ) : null}
                <span>
                  Invitación recibida el {longDateTime(invitation.fecha_invitacion)}
                </span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {status === "pendiente" ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider bg-surface-alt px-4 py-3">
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
              size="sm"
              onClick={onReject}
              aria-label={`Rechazar participación en ${actividad.nombre}`}
            >
              No puedo participar
            </Button>
            <Button
              size="sm"
              onClick={onAccept}
              aria-label={`Aceptar participación en ${actividad.nombre}`}
            >
              <Check className="size-[19px]" aria-hidden="true" />
              {invitation.por_reconfirmar ? "Confirmar de nuevo" : "Aceptar participación"}
            </Button>
          </div>
        </div>
      ) : status === "aceptada" ? (
        <p className="flex items-center gap-2 border-t border-success-soft bg-primary-selected px-5 py-3 text-sm text-success-foreground">
          <CircleCheck className="size-[18px] shrink-0" aria-hidden="true" />
          {invitation.autoasignada ? (
            `Te asignaste esta actividad${
              invitation.fecha_respuesta
                ? ` el ${longDateTime(invitation.fecha_respuesta)}`
                : ""
            }: no requiere respuesta.`
          ) : (
            <>
              Confirmaste tu participación
              {invitation.fecha_respuesta
                ? ` el ${longDateTime(invitation.fecha_respuesta)}`
                : ""}
              .
            </>
          )}
        </p>
      ) : status === "rechazada" ? (
        <div className="flex flex-col gap-1 border-t border-destructive-border bg-destructive-soft px-5 py-3 text-sm text-destructive-hover">
          <p className="flex items-center gap-2">
            <Info className="size-[18px] shrink-0" aria-hidden="true" />
            Indicaste que no podrás participar
            {invitation.fecha_respuesta
              ? ` el ${longDateTime(invitation.fecha_respuesta)}`
              : ""}
            .{" "}
            {isAdmin
              ? "La actividad quedó pendiente de asignación."
              : "El administrador asignará a otra persona."}
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
