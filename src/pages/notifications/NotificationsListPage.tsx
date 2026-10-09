import { Bell, CheckCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { FullPageSpinner } from "../../components/feedback/Spinner";
import { PageHeader } from "../../components/layout/Page";
import {
  EmptyState,
  Pager,
  SegmentedTabs,
} from "../../components/ui/primitives";
import { useFullList } from "../../hooks/useFullList";
import { formatDateTime } from "../../lib/format";
import { htmlToPlainText } from "../../lib/htmlText";
import { notificationService } from "../../services/notificationService";

type Tab = "all" | "unread";
const PAGE_SIZE = 10;

/**
 * Notificaciones (vista de miembro): la bandeja propia. El backend solo
 * permite eliminar a ADMIN, así que aquí no se ofrece la papelera.
 */
export function NotificationsListPage() {
  const { items, isLoading, error } = useFullList(notificationService.list);
  const [tab, setTab] = useState<Tab>("all");
  const [page, setPage] = useState(1);

  const unreadCount = items.filter((n) => !n.leida).length;
  const visible = useMemo(
    () => (tab === "unread" ? items.filter((n) => !n.leida) : items),
    [items, tab],
  );
  const pageCount = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));

  useEffect(() => {
    setPage(1);
  }, [tab]);

  const rows = visible.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const summary = isLoading
    ? "Los avisos que te han enviado."
    : items.length === 0
      ? "No tienes notificaciones."
      : unreadCount > 0
        ? `${unreadCount} sin leer de ${items.length} ${items.length === 1 ? "notificación" : "notificaciones"}.`
        : `${items.length} ${items.length === 1 ? "notificación, leída" : "notificaciones, todas leídas"}.`;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Notificaciones" description={summary} />

      {error ? <ErrorAlert error={error} /> : null}

      <SegmentedTabs
        label="Filtrar notificaciones"
        className="self-start"
        tabs={[
          { value: "all", label: "Todas", count: items.length },
          { value: "unread", label: "No leídas", count: unreadCount },
        ]}
        value={tab}
        onChange={setTab}
      />

      {isLoading ? (
        <FullPageSpinner label="Cargando notificaciones…" />
      ) : rows.length === 0 ? (
        <EmptyState
          bordered
          icon={items.length === 0 ? Bell : CheckCheck}
          title={items.length === 0 ? "No tienes notificaciones" : "Estás al día"}
          description={
            items.length === 0
              ? "Cuando te envíen un aviso aparecerá aquí."
              : "No tienes notificaciones sin leer."
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <ul>
            {rows.map((n) => (
              <li
                key={n.id}
                className="border-t border-divider-soft first:border-t-0"
              >
                <Link
                  to={`/notifications/${n.id}`}
                  className={`flex items-start gap-3.5 px-5 py-4 text-foreground transition-colors hover:bg-[#F6F3EC] ${
                    n.leida ? "bg-card" : "bg-[#F7FAF6]"
                  }`}
                >
                  <span
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full ${
                      n.leida
                        ? "bg-accent text-secondary-foreground"
                        : "bg-success-soft text-primary-hover"
                    }`}
                    aria-hidden="true"
                  >
                    <Bell className="size-5" />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                      <span
                        className={`text-[15px] break-words ${
                          n.leida ? "font-semibold" : "font-extrabold"
                        }`}
                      >
                        {n.titulo}
                      </span>
                      <span className="text-[13px] whitespace-nowrap text-muted-foreground">
                        {formatDateTime(n.fecha_envio)}
                      </span>
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {htmlToPlainText(n.mensaje)}
                    </span>
                  </span>
                  {!n.leida ? (
                    <span className="mt-1 flex shrink-0 items-center gap-1.5 text-xs font-extrabold text-success-foreground">
                      <span
                        className="size-2 rounded-full bg-primary"
                        aria-hidden="true"
                      />
                      Nueva
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
          <Pager
            page={page}
            pageCount={pageCount}
            total={visible.length}
            pageSize={PAGE_SIZE}
            onChange={setPage}
            noun="notificaciones"
          />
        </div>
      )}
    </div>
  );
}
