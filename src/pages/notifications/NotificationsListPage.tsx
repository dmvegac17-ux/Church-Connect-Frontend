import {
  Bell,
  CheckCheck,
  Mail,
  MailOpen,
  SearchX,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { FullPageSpinner } from "../../components/feedback/Spinner";
import { useToast } from "../../components/feedback/useToast";
import { Button } from "../../components/forms/Button";
import { PageHeader } from "../../components/layout/Page";
import { PAGE_SIZES, TablePager } from "../../components/ui/DataTable";
import {
  Avatar,
  EmptyState,
  IconButton,
  SearchInput,
  SegmentedTabs,
} from "../../components/ui/primitives";
import { useBackgroundRefresh } from "../../hooks/useBackgroundRefresh";
import { useFullList } from "../../hooks/useFullList";
import { useNotificationTrash } from "../../hooks/useNotificationTrash";
import { htmlToPreview } from "../../lib/htmlText";
import { NOTIFICATIONS_CHANGED_EVENT } from "../../lib/notificationEvents";
import { inboxDate, searchable, senderOf } from "../../lib/notificationInbox";
import {
  MARK_BATCH_MAX,
  notificationService,
} from "../../services/notificationService";
import type { Notification } from "../../types/notification";

type Filter = "all" | "unread" | "read";
type Order = "recent" | "oldest";

const DEFAULT_PAGE_SIZE = 10;
const CHECKBOX_CLASS = "size-[18px] shrink-0 cursor-pointer accent-primary";

/**
 * Notificaciones (vista de miembro): la bandeja propia, con búsqueda, filtro
 * por estado, orden y paginación. Cada aviso se puede marcar como leído o no
 * leído y eliminar (con «Deshacer» durante 6 s). La búsqueda, el filtro y la
 * página viven en la URL para conservarse al volver de un aviso.
 */
export function NotificationsListPage() {
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const {
    items: loaded,
    isLoading,
    error,
    refetch,
    setItems,
  } = useFullList(notificationService.list);
  const { pending, trash } = useNotificationTrash(refetch);
  // Los avisos nuevos aparecen solos: la bandeja se vuelve a consultar en
  // segundo plano y solo cambia lo que cambió, sin indicador de carga.
  useBackgroundRefresh(refetch, { whenHidden: true });
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  const query = params.get("q") ?? "";
  const filterParam = params.get("f");
  const filter: Filter =
    filterParam === "unread" || filterParam === "read" ? filterParam : "all";
  const order: Order = params.get("o") === "oldest" ? "oldest" : "recent";
  const sizeParam = Number(params.get("n"));
  const pageSize = (PAGE_SIZES as readonly number[]).includes(sizeParam)
    ? sizeParam
    : DEFAULT_PAGE_SIZE;

  /** Cambia parámetros de la URL; salvo que se pida, vuelve a la página 1. */
  const patch = (changes: Record<string, string | null>, keepPage = false) => {
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (!keepPage) {
          next.delete("p");
        }
        for (const [key, value] of Object.entries(changes)) {
          if (value) {
            next.set(key, value);
          } else {
            next.delete(key);
          }
        }
        return next;
      },
      { replace: true },
    );
  };

  // Las que esperan en la papelera ya no se muestran.
  const items = useMemo(
    () =>
      loaded
        .filter((n) => !pending.has(n.id))
        .map((n) => {
          const sender = senderOf(n.mensaje);
          const preview = htmlToPreview(n.mensaje);
          return {
            n,
            sender,
            preview,
            haystack: searchable(`${n.titulo} ${sender} ${preview}`),
          };
        }),
    [loaded, pending],
  );
  const unreadCount = items.filter(({ n }) => !n.leida).length;

  const visible = useMemo(() => {
    const needle = searchable(query.trim());
    const matches = items.filter(
      ({ n, haystack }) =>
        (filter === "all" || (filter === "unread") === !n.leida) &&
        (!needle || haystack.includes(needle)),
    );
    // El backend las entrega de la más reciente a la más antigua.
    return order === "oldest" ? [...matches].reverse() : matches;
  }, [items, query, filter, order]);

  const pageCount = Math.max(1, Math.ceil(visible.length / pageSize));
  const page = Math.min(Math.max(1, Number(params.get("p")) || 1), pageCount);
  const rows = visible.slice((page - 1) * pageSize, page * pageSize);
  // La selección se conserva al cambiar de página, filtro o búsqueda, hasta
  // `MARK_BATCH_MAX`. Solo cuentan las que siguen en la bandeja.
  const selectedItems = items.filter(({ n }) => selected.has(n.id)).map(({ n }) => n);
  const selectedHere = rows.filter(({ n }) => selected.has(n.id)).length;
  const allSelected = rows.length > 0 && selectedHere === rows.length;
  const warnLimit = () =>
    toast.info(
      `Puedes seleccionar como máximo ${MARK_BATCH_MAX} notificaciones a la vez. Aplica la acción o limpia la selección para elegir otras.`,
    );

  const setRead = async (targets: Notification[], leida: boolean) => {
    const ids = new Set(
      targets.filter((n) => n.leida !== leida).map((n) => n.id),
    );
    setSelected(new Set());
    if (ids.size === 0) {
      return;
    }
    // Se refleja al instante; si el servidor falla, se recarga la bandeja.
    setItems((list) =>
      list.map((n) => (ids.has(n.id) ? { ...n, leida } : n)),
    );
    try {
      // Una sola petición para todas las elegidas.
      await notificationService.markRead([...ids], leida);
    } catch {
      toast.error("No se pudieron actualizar las notificaciones.");
      refetch();
    }
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
  };

  const markAllRead = async () => {
    setSelected(new Set());
    setItems((list) => list.map((n) => (n.leida ? n : { ...n, leida: true })));
    try {
      // Sin ids: el servidor marca todas las propias sin leer.
      await notificationService.markAllRead();
    } catch {
      toast.error("No se pudieron marcar las notificaciones.");
      refetch();
    }
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
  };

  const toggle = (id: string) => {
    if (!selected.has(id) && selectedItems.length >= MARK_BATCH_MAX) {
      warnLimit();
      return;
    }
    setSelected((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) {
        next.add(id);
      }
      return next;
    });
  };

  /** Marca o desmarca las de la página visible, sin tocar las de otras. */
  const togglePage = () => {
    const next = new Set(selectedItems.map((n) => n.id));
    if (allSelected) {
      rows.forEach(({ n }) => next.delete(n.id));
    } else {
      for (const { n } of rows) {
        if (next.size >= MARK_BATCH_MAX && !next.has(n.id)) {
          // No caben todas: entran las que alcanzan y se avisa.
          warnLimit();
          break;
        }
        next.add(n.id);
      }
    }
    setSelected(next);
  };

  const total = items.length;
  const summary = isLoading
    ? "Los avisos que te han enviado."
    : total === 0
      ? "No tienes notificaciones."
      : unreadCount > 0
        ? `${unreadCount} sin leer de ${total} ${total === 1 ? "notificación" : "notificaciones"}.`
        : `${total} ${total === 1 ? "notificación, leída" : "notificaciones, todas leídas"}.`;
  const filtering = Boolean(query.trim()) || filter !== "all";

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Notificaciones" description={summary} />

      {error ? <ErrorAlert error={error} /> : null}

      {isLoading ? (
        <FullPageSpinner label="Cargando notificaciones…" />
      ) : total === 0 ? (
        <EmptyState
          bordered
          icon={Bell}
          title="No tienes notificaciones"
          description="Cuando te envíen un aviso aparecerá aquí."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <div className="flex flex-wrap items-center gap-3 border-b border-divider p-3">
            <SearchInput
              label="Buscar notificaciones"
              placeholder="Buscar por asunto, remitente o contenido…"
              value={query}
              onChange={(value) => patch({ q: value || null })}
              className="min-w-[220px] flex-1"
            />
            <SegmentedTabs
              label="Filtrar notificaciones"
              tabs={[
                { value: "all", label: "Todas", count: total },
                { value: "unread", label: "No leídas", count: unreadCount },
                { value: "read", label: "Leídas", count: total - unreadCount },
              ]}
              value={filter}
              onChange={(value) => patch({ f: value === "all" ? null : value })}
            />
            <label className="flex items-center gap-2 text-sm text-text-secondary">
              Orden
              <select
                value={order}
                onChange={(e) =>
                  patch({ o: e.target.value === "oldest" ? "oldest" : null })
                }
                className="h-[34px] rounded-lg border border-input bg-card px-2 text-sm text-foreground max-md:h-11"
              >
                <option value="recent">Más recientes</option>
                <option value="oldest">Más antiguas</option>
              </select>
            </label>
          </div>

          {rows.length === 0 ? (
            <EmptyState
              icon={query.trim() ? SearchX : CheckCheck}
              title={
                query.trim()
                  ? "Sin resultados"
                  : filter === "unread"
                    ? "Estás al día"
                    : "No hay notificaciones leídas"
              }
              description={
                query.trim()
                  ? "Ninguna notificación coincide con la búsqueda."
                  : filter === "unread"
                    ? "No tienes notificaciones sin leer."
                    : "Las que abras aparecerán aquí."
              }
              action={
                filtering ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => patch({ q: null, f: null })}
                  >
                    Ver todas
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <>
              <div className="flex min-h-[52px] flex-wrap items-center gap-x-3 gap-y-1.5 bg-surface-alt px-4 py-1.5 text-sm text-text-secondary">
                <label className="flex cursor-pointer items-center gap-3 font-bold">
                  <input
                    type="checkbox"
                    className={CHECKBOX_CLASS}
                    checked={allSelected}
                    onChange={togglePage}
                  />
                  {selectedItems.length > 0
                    ? `${selectedItems.length} ${selectedItems.length === 1 ? "seleccionada" : "seleccionadas"}${
                        selectedHere < selectedItems.length
                          ? ` (${selectedHere} en esta página)`
                          : ""
                      }`
                    : "Seleccionar esta página"}
                </label>
                <span className="ml-auto flex flex-wrap items-center gap-1.5">
                  {selectedItems.length > 0 ? (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelected(new Set())}
                      >
                        Limpiar selección
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void setRead(selectedItems, true)}
                      >
                        <MailOpen className="size-[18px]" aria-hidden="true" />
                        Marcar como leídas
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => void setRead(selectedItems, false)}
                      >
                        <Mail className="size-[18px]" aria-hidden="true" />
                        Marcar como no leídas
                      </Button>
                    </>
                  ) : unreadCount > 0 ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => void markAllRead()}
                    >
                      <CheckCheck className="size-[18px]" aria-hidden="true" />
                      Marcar todas como leídas
                    </Button>
                  ) : null}
                </span>
              </div>

              <ul>
                {rows.map(({ n, sender, preview }) => (
                  <li
                    key={n.id}
                    className={`flex items-center gap-1 border-t border-divider-soft pr-2 pl-4 transition-colors hover:bg-[#F6F3EC] ${
                      n.leida ? "bg-card" : "bg-[#F7FAF6]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className={CHECKBOX_CLASS}
                      aria-label={`Seleccionar: ${n.titulo}`}
                      checked={selected.has(n.id)}
                      onChange={() => toggle(n.id)}
                    />
                    <Link
                      to={`/notifications/${n.id}`}
                      // Para volver a esta misma búsqueda y página.
                      state={{ from: `?${params.toString()}` }}
                      className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-2 text-foreground"
                    >
                      <span
                        className={`size-2 shrink-0 rounded-full ${
                          n.leida ? "bg-transparent" : "bg-primary"
                        }`}
                        aria-hidden="true"
                      />
                      <Avatar
                        name={sender}
                        tone={n.leida ? "sand" : "primary"}
                        className="size-10 text-[13px] max-sm:hidden"
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-px">
                        <span className="flex items-baseline justify-between gap-3">
                          <span
                            className={`truncate text-sm ${
                              n.leida
                                ? "font-semibold text-text-secondary"
                                : "font-extrabold"
                            }`}
                          >
                            {sender}
                            {n.leida ? null : (
                              <span className="sr-only"> (no leída)</span>
                            )}
                          </span>
                          <time
                            dateTime={n.fecha_envio}
                            className={`shrink-0 text-xs whitespace-nowrap ${
                              n.leida
                                ? "text-muted-foreground"
                                : "font-bold text-primary-hover"
                            }`}
                          >
                            {inboxDate(n.fecha_envio)}
                          </time>
                        </span>
                        <span
                          className={`truncate text-[15px] ${
                            n.leida ? "font-medium" : "font-extrabold"
                          }`}
                        >
                          {n.titulo}
                        </span>
                        <span className="truncate text-sm text-muted-foreground">
                          {preview}
                        </span>
                      </span>
                    </Link>
                    <IconButton
                      icon={n.leida ? Mail : MailOpen}
                      label={`${n.leida ? "Marcar como no leída" : "Marcar como leída"}: ${n.titulo}`}
                      onClick={() => void setRead([n], !n.leida)}
                    />
                    <IconButton
                      icon={Trash2}
                      danger
                      label={`Eliminar notificación: ${n.titulo}`}
                      onClick={() => trash(n.id)}
                    />
                  </li>
                ))}
              </ul>
            </>
          )}

          <TablePager
            table={{
              total: visible.length,
              page,
              pageCount,
              pageSize,
              setPage: (next) =>
                patch({ p: next > 1 ? String(Math.min(next, pageCount)) : null }, true),
              setPageSize: (size) =>
                patch({ n: size === DEFAULT_PAGE_SIZE ? null : String(size) }),
            }}
          />
        </div>
      )}
    </div>
  );
}
