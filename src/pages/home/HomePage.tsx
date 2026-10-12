import {
  ChevronRight,
  CircleCheck,
  Clock,
  LayoutDashboard,
  MapPin,
  SlidersHorizontal,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { Spinner } from "../../components/feedback/Spinner";
import { useToast } from "../../components/feedback/useToast";
import { DailyVerse } from "../../components/layout/DailyVerse";
import { Card } from "../../components/layout/Page";
import { DateBlock } from "../../components/ui/EventBits";
import { RoleBadge } from "../../components/users/Badges";
import { QUICK_LINK_CATALOG } from "../../config/navigation";
import { useFullList } from "../../hooks/useFullList";
import {
  eventDateInfo,
  greetingFor,
  isUpcoming,
  sortEventsForDisplay,
  todayLabel,
} from "../../lib/eventDates";
import { formatDateTime } from "../../lib/format";
import { loadHomeConfig, saveHomeConfig, type HomeConfig } from "../../lib/homeConfig";
import { eventService } from "../../services/eventService";
import { notificationService } from "../../services/notificationService";
import { HomeCustomizeDialog } from "./HomeCustomizeDialog";

const UNREAD_PREVIEW = 3;

const SEE_ALL_CLASS =
  "rounded-lg px-1 py-1.5 text-sm font-bold text-primary hover:underline";

/**
 * Inicio de miembro: saludo, próximo evento, avisos sin leer y accesos
 * rápidos. Cada persona elige qué secciones ve y qué atajos tiene a mano.
 */
export function HomePage() {
  const { user, role } = useAuth();
  const toast = useToast();
  const userId = user?.id ?? "";
  const now = new Date();
  const [config, setConfig] = useState<HomeConfig>(() => loadHomeConfig(userId));
  const [customizing, setCustomizing] = useState(false);

  // La configuración es de cada persona: se relee si cambia la sesión.
  useEffect(() => {
    setConfig(loadHomeConfig(userId));
  }, [userId]);
  const events = useFullList(eventService.list);
  const notifications = useFullList(notificationService.list);

  const nextEvent = sortEventsForDisplay(events.items, now).find((e) =>
    isUpcoming(e, now),
  );
  const nextInfo = nextEvent ? eventDateInfo(nextEvent, now) : null;
  const unread = notifications.items.filter((n) => !n.leida);
  const quickLinks = config.keys.flatMap((key) =>
    QUICK_LINK_CATALOG.filter((item) => item.key === key),
  );
  const showQuick = config.quick && quickLinks.length > 0;
  const allHidden = !config.verse && !config.next && !config.unread && !showQuick;

  const saveConfig = (next: HomeConfig) => {
    saveHomeConfig(userId, next);
    setConfig(next);
    setCustomizing(false);
    toast.success("Tu inicio quedó actualizado.");
  };

  let summary = "Desde aquí puedes consultar los eventos, los ministerios y tus avisos.";
  if (!events.isLoading && !notifications.isLoading) {
    const eventPart = nextEvent && nextInfo
      ? `Tu próximo evento es ${nextEvent.titulo} (${nextInfo.relative.split(" · ")[0].toLowerCase()})`
      : "No hay eventos próximos";
    const unreadPart =
      unread.length > 0
        ? `tienes ${unread.length} ${unread.length === 1 ? "aviso" : "avisos"} sin leer`
        : "no tienes avisos pendientes";
    summary = `${eventPart} y ${unreadPart}.`;
  }

  return (
    <div className="flex flex-col gap-7">
      <Card
        as="section"
        className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] overflow-hidden"
      >
        <div className="flex flex-col gap-2.5 px-6 py-7 sm:px-8">
          <p className="text-sm text-muted-foreground">{todayLabel(now)}</p>
          <h1 className="text-[30px] leading-tight font-extrabold tracking-[-0.015em]">
            {greetingFor(now)}
            {user ? `, ${user.nombre}` : ""}
          </h1>
          <p className="text-base leading-normal text-pretty text-text-secondary">
            {summary}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            {role ? <RoleBadge role={role} /> : null}
            <button
              type="button"
              onClick={() => setCustomizing(true)}
              className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-button-border bg-card px-3 text-sm font-bold text-foreground hover:bg-accent max-md:h-11"
            >
              <SlidersHorizontal className="size-[18px]" aria-hidden="true" />
              Personalizar inicio
            </button>
          </div>
        </div>
        {config.verse ? (
          <DailyVerse
            className="flex flex-col justify-center bg-accent px-6 py-7 sm:px-8"
            textClassName="text-lg leading-normal text-pretty text-[#2F3A2E]"
            referenceClassName="text-sm !font-bold text-primary"
          />
        ) : null}
      </Card>

      {allHidden ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-button-border bg-card px-5 py-9 text-center">
          <span
            aria-hidden="true"
            className="flex size-[46px] items-center justify-center rounded-xl bg-primary-soft text-primary"
          >
            <LayoutDashboard className="size-6" />
          </span>
          <p className="text-base font-extrabold">
            Ocultaste todas las secciones del inicio
          </p>
          <button
            type="button"
            onClick={() => setCustomizing(true)}
            className="mt-1 h-[42px] rounded-[10px] border border-button-border bg-card px-4 text-[15px] font-bold text-foreground hover:bg-accent max-md:h-11"
          >
            Personalizar inicio
          </button>
        </div>
      ) : null}

      {config.next || config.unread ? (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))] gap-5">
        {config.next ? (
        <Card as="section" className="flex flex-col gap-4 p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold">Próximo evento</h2>
            <Link to="/events" className={SEE_ALL_CLASS}>
              Ver todos
            </Link>
          </div>
          {events.error ? (
            <ErrorAlert error={events.error} />
          ) : events.isLoading ? (
            <div className="py-6 text-center text-muted-foreground">
              <Spinner label="Cargando eventos…" />
            </div>
          ) : nextEvent && nextInfo ? (
            <Link
              to={`/events/${nextEvent.id}`}
              className="flex gap-4 rounded-xl border border-divider bg-surface-alt p-4 text-foreground transition-colors hover:border-[#B9CDBE] hover:bg-card"
            >
              <DateBlock info={nextInfo} solid />
              <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                <p className="text-[13px] font-bold text-primary">
                  {nextInfo.relative}
                </p>
                <p className="text-lg font-extrabold break-words">
                  {nextEvent.titulo}
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-text-secondary">
                  <span className="flex items-center gap-1.5">
                    <Clock className="size-[18px]" aria-hidden="true" />
                    {nextInfo.timeRange}
                  </span>
                  <span className="flex min-w-0 items-center gap-1.5">
                    <MapPin className="size-[18px] shrink-0" aria-hidden="true" />
                    <span className="truncate">{nextEvent.lugar}</span>
                  </span>
                </div>
              </div>
              <ChevronRight
                className="size-[22px] shrink-0 self-center text-primary"
                aria-hidden="true"
              />
            </Link>
          ) : (
            <p className="rounded-xl bg-accent p-4 text-[15px] text-text-secondary">
              No hay eventos próximos por ahora.
            </p>
          )}
        </Card>
        ) : null}

        {config.unread ? (
        <Card as="section" className="flex flex-col gap-3 p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-extrabold">Avisos sin leer</h2>
            <Link to="/notifications" className={SEE_ALL_CLASS}>
              Ver todas
            </Link>
          </div>
          {notifications.error ? (
            <ErrorAlert error={notifications.error} />
          ) : notifications.isLoading ? (
            <div className="py-6 text-center text-muted-foreground">
              <Spinner label="Cargando avisos…" />
            </div>
          ) : unread.length > 0 ? (
            <ul className="flex flex-col">
              {unread.slice(0, UNREAD_PREVIEW).map((n) => (
                <li key={n.id} className="border-t border-divider">
                  <Link
                    to={`/notifications/${n.id}`}
                    className="flex items-start gap-3 px-1 py-3 text-foreground hover:bg-surface-alt"
                  >
                    <span
                      className="mt-[7px] size-2 shrink-0 rounded-full bg-primary"
                      aria-hidden="true"
                    />
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[15px] font-bold break-words">
                        {n.titulo}
                      </span>
                      <span className="text-[13px] text-muted-foreground">
                        {formatDateTime(n.fecha_envio)}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
              {unread.length > UNREAD_PREVIEW ? (
                <li className="border-t border-divider pt-3 text-[13px] text-muted-foreground">
                  y {unread.length - UNREAD_PREVIEW} más sin leer.
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="flex items-center gap-3 rounded-xl bg-primary-soft p-4 text-[15px] text-success-foreground">
              <CircleCheck className="size-[22px] shrink-0" aria-hidden="true" />
              Estás al día. No tienes avisos pendientes.
            </p>
          )}
        </Card>
        ) : null}
      </div>
      ) : null}

      {showQuick ? (
      <section className="flex flex-col gap-3.5" aria-labelledby="home-quick">
        <div className="flex items-center justify-between gap-3">
          <h2 id="home-quick" className="text-lg font-extrabold">
            Accesos rápidos
          </h2>
          <button
            type="button"
            onClick={() => setCustomizing(true)}
            aria-label="Editar accesos rápidos"
            className="rounded-lg px-1 py-1.5 text-sm font-bold text-primary hover:underline"
          >
            Editar
          </button>
        </div>
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,200px),1fr))] gap-3">
          {quickLinks.map(({ to, label, description, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className="flex h-full flex-col gap-2.5 rounded-[14px] border border-border bg-card p-4 text-foreground transition hover:border-[#B9CDBE] hover:shadow-card-hover"
              >
                <span
                  className="flex size-10 items-center justify-center rounded-[10px] bg-primary-soft text-primary"
                  aria-hidden="true"
                >
                  <Icon className="size-[22px]" />
                </span>
                <span className="text-base font-extrabold">{label}</span>
                <span className="text-sm leading-[1.45] text-muted-foreground">
                  {description}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
      ) : null}

      <HomeCustomizeDialog
        open={customizing}
        config={config}
        onSave={saveConfig}
        onClose={() => setCustomizing(false)}
      />
    </div>
  );
}
