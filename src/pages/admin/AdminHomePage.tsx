import {
  CalendarPlus,
  CalendarX,
  CircleCheck,
  MailWarning,
  Send,
  UserPlus,
  UsersRound,
  UserX,
  type LucideIcon,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { Spinner } from "../../components/feedback/Spinner";
import { Button, buttonClass } from "../../components/forms/Button";
import { Card, CardHeader } from "../../components/layout/Page";
import { DateBlock, ScheduleCountPill } from "../../components/ui/EventBits";
import { useFullList } from "../../hooks/useFullList";
import { useUnreadNotificationsCount } from "../../hooks/useUnreadNotificationsCount";
import {
  eventDateInfo,
  greetingFor,
  isUpcoming,
  sortEventsForDisplay,
  todayLabel,
} from "../../lib/eventDates";
import { eventService } from "../../services/eventService";
import { ministryService } from "../../services/ministryService";
import { userService } from "../../services/userService";
import type { Event } from "../../types/event";
import { ScheduleModal } from "../events/components/ScheduleModal";

const UPCOMING_PREVIEW = 5;

const QUICK_ACTIONS: {
  to: string;
  label: string;
  icon: LucideIcon;
  state?: unknown;
}[] = [
  { to: "/users/new", label: "Nuevo usuario", icon: UserPlus },
  { to: "/events/nuevo", label: "Nuevo evento", icon: CalendarPlus },
  {
    to: "/notifications",
    label: "Enviar notificación",
    icon: Send,
    state: { compose: true },
  },
  { to: "/ministries/nuevo", label: "Nuevo ministerio", icon: UsersRound },
];

function AttentionRow({
  icon: Icon,
  tone,
  children,
  action,
}: {
  icon: LucideIcon;
  tone: "warning" | "info" | "neutral";
  children: ReactNode;
  action: ReactNode;
}) {
  const tones = {
    warning: "bg-warning-soft text-warning-foreground",
    info: "bg-info-soft text-info-foreground",
    neutral: "bg-muted text-text-secondary",
  };
  return (
    <li className="flex flex-wrap items-center gap-3.5 border-t border-divider-soft px-5 py-3.5 first:border-t-0">
      <span
        className={`flex size-9 shrink-0 items-center justify-center rounded-[10px] ${tones[tone]}`}
        aria-hidden="true"
      >
        <Icon className="size-5" />
      </span>
      <span className="min-w-[160px] flex-1 text-[15px] leading-[1.45]">
        {children}
      </span>
      {action}
    </li>
  );
}

const ROW_ACTION_CLASS =
  "inline-flex h-9 shrink-0 items-center rounded-[9px] border border-button-border bg-card px-3 text-sm font-bold whitespace-nowrap text-foreground transition-colors hover:bg-accent max-md:h-11";

/** Inicio del panel de administración: pendientes, próximos eventos y accesos rápidos. */
export function AdminHomePage() {
  const { user } = useAuth();
  const now = new Date();
  const events = useFullList(eventService.list);
  const users = useFullList(userService.list);
  const ministries = useFullList(ministryService.list);
  const { count: unreadCount } = useUnreadNotificationsCount();
  const [scheduleEvent, setScheduleEvent] = useState<Event | null>(null);

  const upcoming = sortEventsForDisplay(events.items, now).filter((e) =>
    isUpcoming(e, now),
  );
  const withoutSchedule = upcoming.filter((e) => e.total_actividades === 0);
  const inactiveUsers = users.items.filter((u) => u.activo === false).length;

  const loadingAttention = events.isLoading || users.isLoading;
  const hasAttention =
    withoutSchedule.length > 0 || unreadCount > 0 || inactiveUsers > 0;
  const loadError = events.error ?? users.error ?? ministries.error;

  const counts = [
    {
      to: "/users",
      value: users.isLoading ? "…" : users.items.length,
      label: users.items.length === 1 ? "Usuario" : "Usuarios",
    },
    {
      to: "/events",
      value: events.isLoading ? "…" : upcoming.length,
      label: upcoming.length === 1 ? "Evento próximo" : "Eventos próximos",
    },
    {
      to: "/ministries",
      value: ministries.isLoading ? "…" : ministries.items.length,
      label: ministries.items.length === 1 ? "Ministerio" : "Ministerios",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">{todayLabel(now)}</p>
          <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.015em]">
            {greetingFor(now)}
            {user ? `, ${user.nombre}` : ""}
          </h1>
        </div>
        <nav aria-label="Accesos rápidos" className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map(({ to, label, icon: Icon, state }) => (
            <Link
              key={label}
              to={to}
              state={state}
              className={buttonClass(
                "secondary",
                "sm",
                "hover:!border-[#B9CDBE] max-md:!h-11",
              )}
            >
              <Icon className="size-[19px] text-primary" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {loadError ? <ErrorAlert error={loadError} /> : null}

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-start gap-5">
        <Card as="section" className="overflow-hidden">
          <CardHeader title="Requiere atención" />
          {loadingAttention ? (
            <div className="p-8 text-center text-muted-foreground">
              <Spinner label="Revisando pendientes…" />
            </div>
          ) : hasAttention ? (
            <ul>
              {withoutSchedule.map((ev) => {
                const info = eventDateInfo(ev, now);
                return (
                  <AttentionRow
                    key={ev.id}
                    icon={CalendarX}
                    tone="warning"
                    action={
                      <Button
                        variant="secondary"
                        size="sm"
                        className="!h-9 max-md:!h-11"
                        onClick={() => setScheduleEvent(ev)}
                      >
                        Crear cronograma
                      </Button>
                    }
                  >
                    <strong className="font-extrabold">{ev.titulo}</strong> (
                    {info.relative.split(" · ")[0].toLowerCase()}) no tiene
                    cronograma.
                  </AttentionRow>
                );
              })}
              {unreadCount > 0 ? (
                <AttentionRow
                  icon={MailWarning}
                  tone="info"
                  action={
                    <Link to="/notifications" className={ROW_ACTION_CLASS}>
                      Ver
                    </Link>
                  }
                >
                  {unreadCount >= 100 ? "Más de 99" : unreadCount}{" "}
                  {unreadCount === 1
                    ? "notificación sin leer"
                    : "notificaciones sin leer"}{" "}
                  en tu bandeja.
                </AttentionRow>
              ) : null}
              {inactiveUsers > 0 ? (
                <AttentionRow
                  icon={UserX}
                  tone="neutral"
                  action={
                    <Link to="/users?estado=inactivo" className={ROW_ACTION_CLASS}>
                      Revisar
                    </Link>
                  }
                >
                  {inactiveUsers}{" "}
                  {inactiveUsers === 1 ? "usuario inactivo" : "usuarios inactivos"}.
                </AttentionRow>
              ) : null}
            </ul>
          ) : (
            <p className="flex items-center gap-2.5 px-5 py-6 text-[15px] text-success-foreground">
              <CircleCheck className="size-[22px] shrink-0" aria-hidden="true" />
              Todo está al día.
            </p>
          )}
        </Card>

        <Card as="section" className="overflow-hidden">
          <CardHeader
            title="Próximos eventos"
            aside={
              <Link
                to="/events"
                className="rounded px-1.5 py-1.5 text-sm font-bold text-primary hover:underline"
              >
                Ver todos
              </Link>
            }
          />
          {events.isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Spinner label="Cargando eventos…" />
            </div>
          ) : upcoming.length === 0 ? (
            <p className="px-5 py-6 text-[15px] text-muted-foreground">
              No hay eventos próximos.{" "}
              <Link to="/events/nuevo" className="font-bold text-primary hover:underline">
                Crear un evento
              </Link>
            </p>
          ) : (
            <ul>
              {upcoming.slice(0, UPCOMING_PREVIEW).map((ev) => {
                const info = eventDateInfo(ev, now);
                return (
                  <li
                    key={ev.id}
                    className="border-t border-divider-soft first:border-t-0"
                  >
                    <Link
                      to={`/events/${ev.id}`}
                      className="flex flex-wrap items-center gap-3.5 px-5 py-3 text-foreground transition-colors hover:bg-surface-alt"
                    >
                      <DateBlock info={info} size="sm" />
                      <span className="flex min-w-[140px] flex-1 flex-col gap-0.5">
                        <span className="text-[15px] font-extrabold break-words">
                          {ev.titulo}
                        </span>
                        <span className="text-[13px] text-muted-foreground">
                          {info.relative.split(" · ")[0]} · {info.timeRange}
                        </span>
                      </span>
                      <ScheduleCountPill
                        count={ev.total_actividades}
                        warnWhenEmpty
                      />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>

      <ul className="flex flex-wrap gap-3">
        {counts.map((c) => (
          <li key={c.to}>
            <Link
              to={c.to}
              className="flex items-baseline gap-2 rounded-[10px] border border-border bg-card px-3.5 py-2.5 text-foreground transition-colors hover:border-[#B9CDBE]"
            >
              <span className="text-lg font-extrabold">{c.value}</span>
              <span className="text-sm text-text-secondary">{c.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <ScheduleModal
        open={scheduleEvent !== null}
        event={scheduleEvent}
        onClose={() => setScheduleEvent(null)}
        onSaved={events.refetch}
      />
    </div>
  );
}
