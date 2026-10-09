import {
  ArrowLeft,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  Clock,
  Mail,
  MailOpen,
  Pencil,
  Search,
  Send,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../../../auth/useAuth";
import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { Spinner } from "../../../components/feedback/Spinner";
import { useToast } from "../../../components/feedback/useToast";
import { Button } from "../../../components/forms/Button";
import { PageHeader } from "../../../components/layout/Page";
import {
  Avatar,
  IconButton,
  IconLink,
  Pill,
} from "../../../components/ui/primitives";
import { useFullList } from "../../../hooks/useFullList";
import { formatDateTime } from "../../../lib/format";
import { htmlToPlainText, htmlToPreview } from "../../../lib/htmlText";
import { loadDraft } from "../../../lib/notificationDraft";
import { NOTIFICATIONS_CHANGED_EVENT } from "../../../lib/notificationEvents";
import { fullNameOf, normalizeText } from "../../../lib/people";
import { sanitizeNotificationHtml } from "../../../lib/sanitizeHtml";
import { notificationService } from "../../../services/notificationService";
import { userService } from "../../../services/userService";
import { ApiError } from "../../../types/api";
import type { Notification } from "../../../types/notification";
import { DeleteNotificationDialog } from "../../notifications/components/DeleteNotificationDialog";
import { ComposeNotification } from "./ComposeNotification";
import { NotificationEditDrawer } from "./NotificationEditDrawer";
import {
  NO_RECIPIENT_FILTER,
  RecipientFilter,
  type RecipientFilterValue,
} from "./RecipientFilter";

type Tab = "all" | "unread" | "read";

/** El admin gestiona los avisos de todos los usuarios (`alcance=todas`). */
const listAllNotifications: typeof notificationService.list = (params) =>
  notificationService.list({ ...params, alcance: "todas" });

/** "8 oct 2026". */
function shortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }
  const month = date
    .toLocaleDateString("es-CO", { month: "short" })
    .replace(".", "");
  return `${date.getDate()} ${month} ${date.getFullYear()}`;
}

/**
 * Notificaciones (panel de administración), tipo bandeja: avisos enviados
 * y recibidos, con la lista a la izquierda y el lector a la derecha; en
 * pantallas estrechas, uno a la vez.
 */
export function AdminNotificationsPage({ mode }: { mode?: "edit" }) {
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const { id: selectedId } = useParams<{ id: string }>();
  const { items, isLoading, error, refetch, setItems } =
    useFullList(listAllNotifications);
  const users = useFullList(userService.list);

  const [tab, setTab] = useState<Tab>("all");
  const [query, setQuery] = useState("");
  const [recipient, setRecipient] =
    useState<RecipientFilterValue>(NO_RECIPIENT_FILTER);
  // Si quedó un borrador, el redactor vuelve a estar ahí (minimizado) al entrar.
  const [hadDraft] = useState(() => loadDraft(user?.id) !== null);
  const [composeOpen, setComposeOpen] = useState(hadDraft);
  const [composeMinimized, setComposeMinimized] = useState(hadDraft);
  const openComposer = () => {
    setComposeOpen(true);
    setComposeMinimized(false);
  };
  const [target, setTarget] = useState<Notification | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // "Enviar notificación" desde el Inicio abre el redactor al llegar.
  const wantsCompose = Boolean(
    (location.state as { compose?: boolean } | null)?.compose,
  );
  useEffect(() => {
    if (wantsCompose) {
      setComposeOpen(true);
      setComposeMinimized(false);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [wantsCompose, navigate, location.pathname]);

  const usersById = useMemo(
    () => new Map(users.items.map((u) => [u.id, u])),
    [users.items],
  );
  const sentCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of items) {
      counts.set(n.usuario_id, (counts.get(n.usuario_id) ?? 0) + 1);
    }
    return counts;
  }, [items]);

  const recipientName = (n: Notification): string => {
    const u = usersById.get(n.usuario_id);
    const name = u ? fullNameOf(u) : users.isLoading ? "…" : "Usuario";
    return n.usuario_id === user?.id ? `${name} (tú)` : name;
  };

  // Destinatario y texto acotan la base; las tabs cuentan sobre esa base.
  const base = useMemo(() => {
    const q = normalizeText(query);
    return items.filter((n) => {
      const byRecipient = recipient.userIds.length
        ? recipient.userIds.includes(n.usuario_id)
        : recipient.scope === "all" ||
          (recipient.scope === "mine"
            ? n.usuario_id === user?.id
            : n.usuario_id !== user?.id);
      return (
        byRecipient &&
        (!q ||
          normalizeText(n.titulo).includes(q) ||
          normalizeText(htmlToPlainText(n.mensaje)).includes(q))
      );
    });
  }, [items, query, recipient, user?.id]);

  const unreadCount = base.filter((n) => !n.leida).length;
  const visible = useMemo(
    () =>
      base.filter(
        (n) => tab === "all" || (tab === "unread" ? !n.leida : n.leida),
      ),
    [base, tab],
  );

  const selected = selectedId
    ? (items.find((n) => n.id === selectedId) ?? null)
    : null;
  const selectedUser = selected ? usersById.get(selected.usuario_id) : undefined;
  const position = selected ? visible.findIndex((n) => n.id === selected.id) : -1;

  const notifyChanged = () =>
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));

  const setLeida = async (n: Notification, leida: boolean, silent = false) => {
    setTogglingId(n.id);
    try {
      await notificationService.update(n.id, { leida });
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, leida } : x)));
      notifyChanged();
    } catch (err) {
      if (!silent) {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "No se pudo actualizar la notificación.",
        );
      }
    } finally {
      setTogglingId(null);
    }
  };

  // Solo las notificaciones propias se marcan como leídas al abrirlas: leer
  // el aviso de otra persona no debe alterar su estado. Una sola vez por id,
  // para que "Marcar como no leída" no se revierta sola.
  const autoMarked = useRef<string | null>(null);
  const selectedKey = selected ? selected.id : null;
  useEffect(() => {
    if (
      selected &&
      !selected.leida &&
      selected.usuario_id === user?.id &&
      autoMarked.current !== selected.id
    ) {
      autoMarked.current = selected.id;
      void setLeida(selected, true, true);
    }
    // Solo al cambiar de notificación seleccionada.
  }, [selectedKey, user?.id]);

  const confirmDelete = async () => {
    if (!target) {
      return;
    }
    setDeleting(true);
    setActionError(null);
    try {
      await notificationService.remove(target.id);
      toast.success(`Notificación «${target.titulo}» eliminada.`);
      if (selectedId === target.id) {
        navigate("/notifications", { replace: true });
      }
      refetch();
      notifyChanged();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        refetch();
      } else {
        setActionError(err);
      }
    } finally {
      setTarget(null);
      setDeleting(false);
    }
  };

  const showReader = Boolean(selectedId);
  const editing = mode === "edit" ? selected : null;
  const editingUser = editing ? usersById.get(editing.usuario_id) : undefined;

  const tabs: { value: Tab; label: string; count: number }[] = [
    { value: "all", label: "Todas", count: base.length },
    { value: "unread", label: "No leídas", count: unreadCount },
    { value: "read", label: "Leídas", count: base.length - unreadCount },
  ];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Notificaciones"
        description="Avisos enviados y recibidos, con su estado de lectura."
        actions={
          <Button onClick={openComposer}>
            <Send className="size-5" aria-hidden="true" />
            Enviar notificación
          </Button>
        }
      />

      {error ? <ErrorAlert error={error} /> : null}
      {users.error ? <ErrorAlert error={users.error} /> : null}
      {actionError ? (
        <ErrorAlert error={actionError} onClose={() => setActionError(null)} />
      ) : null}

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
        {/* Lista */}
        <section
          aria-label="Bandeja"
          className={`relative z-[4] rounded-[14px] border border-border bg-card ${
            showReader ? "max-lg:hidden" : ""
          }`}
        >
          <div className="flex flex-wrap items-center gap-2 border-b border-divider px-3.5 py-3">
            <RecipientFilter
              value={recipient}
              onChange={setRecipient}
              users={users.items}
              currentUserId={user?.id}
              sentCounts={sentCounts}
            />
            <label className="relative min-w-0 flex-[1_1_180px]">
              <span className="sr-only">Buscar en título o texto</span>
              <Search
                className="pointer-events-none absolute top-1/2 left-[11px] size-5 -translate-y-1/2 text-icon-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar en el texto"
                className="h-10 w-full rounded-[10px] border border-input bg-card pr-2.5 pl-[38px] text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-primary-soft-border focus-visible:outline-offset-0"
              />
            </label>
            <div
              role="group"
              aria-label="Filtrar por estado"
              className="flex shrink-0 gap-0.5 rounded-[10px] bg-muted p-[3px]"
            >
              {tabs.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  aria-pressed={tab === t.value}
                  onClick={() => setTab(t.value)}
                  className={`h-[34px] rounded-lg px-2.5 text-[13px] font-bold whitespace-nowrap max-md:h-10 ${
                    tab === t.value
                      ? "bg-card text-foreground shadow-tab"
                      : "text-text-secondary hover:text-foreground"
                  }`}
                >
                  {t.label} {t.count}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="p-10 text-center text-muted-foreground">
              <Spinner label="Cargando notificaciones…" />
            </div>
          ) : visible.length === 0 ? (
            <p className="px-5 py-11 text-center text-[15px] text-muted-foreground">
              {items.length === 0
                ? "Todavía no hay notificaciones."
                : "No hay notificaciones que coincidan."}
            </p>
          ) : (
            <ul className="overflow-hidden rounded-b-[14px]">
              {visible.map((n) => {
                const isSelected = n.id === selectedId;
                const to = recipientName(n);
                return (
                  <li
                    key={n.id}
                    className={`flex items-stretch border-t border-divider-soft first:border-t-0 ${
                      isSelected
                        ? "bg-primary-selected shadow-[inset_3px_0_0_var(--primary)]"
                        : "bg-card hover:bg-surface-alt"
                    }`}
                  >
                    <Link
                      to={`/notifications/${n.id}`}
                      aria-current={isSelected ? "true" : undefined}
                      className="flex min-w-0 flex-1 items-start gap-3 py-3.5 pr-2 pl-4 text-foreground"
                    >
                      <Avatar
                        name={to.replace(" (tú)", "")}
                        className="size-9 text-xs"
                      />
                      <span className="flex min-w-0 flex-1 flex-col gap-[3px]">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-[13px] text-text-secondary">
                            Para:{" "}
                            <strong className="font-bold text-foreground">
                              {to}
                            </strong>
                          </span>
                          <span className="shrink-0 text-xs text-muted-foreground">
                            {shortDate(n.fecha_envio)}
                          </span>
                        </span>
                        <span className="flex items-center gap-2">
                          {!n.leida ? (
                            <>
                              <span
                                className="size-2 shrink-0 rounded-full bg-info-foreground"
                                aria-hidden="true"
                              />
                              <span className="sr-only">No leída:</span>
                            </>
                          ) : null}
                          <span
                            className={`truncate text-[15px] ${
                              n.leida ? "font-semibold" : "font-extrabold"
                            }`}
                          >
                            {n.titulo}
                          </span>
                        </span>
                        <span className="truncate text-sm text-muted-foreground">
                          {htmlToPreview(n.mensaje)}
                        </span>
                      </span>
                    </Link>
                    {/* Con el lector abierto, las acciones viven en su barra. */}
                    {!selectedId ? (
                      <div className="flex items-center gap-0.5 pr-2">
                        <IconLink
                          icon={Pencil}
                          label={`Editar «${n.titulo}»`}
                          to={`/notifications/${n.id}/editar`}
                        />
                        <IconButton
                          icon={Trash2}
                          danger
                          label={`Eliminar «${n.titulo}»`}
                          onClick={() => setTarget(n)}
                        />
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Lector */}
        {selected ? (
          <article
            aria-label="Lector de notificación"
            className="flex flex-col overflow-hidden rounded-[14px] border border-border bg-card lg:sticky lg:top-4"
          >
            <div className="flex items-center gap-1 border-b border-divider py-2 pr-2 pl-3">
              <span className="lg:hidden">
                <IconLink
                  icon={ArrowLeft}
                  label="Volver a la lista"
                  to="/notifications"
                />
              </span>
              <span className="max-lg:hidden">
                <IconLink icon={X} label="Cerrar lector" to="/notifications" />
              </span>
              <span className="flex-1 text-[13px] text-muted-foreground">
                {position >= 0 ? `${position + 1} de ${visible.length}` : ""}
              </span>
              <IconButton
                icon={ChevronUp}
                label="Anterior"
                disabled={position <= 0}
                onClick={() =>
                  navigate(`/notifications/${visible[position - 1].id}`)
                }
              />
              <IconButton
                icon={ChevronDown}
                label="Siguiente"
                disabled={position < 0 || position >= visible.length - 1}
                onClick={() =>
                  navigate(`/notifications/${visible[position + 1].id}`)
                }
              />
              <span className="mx-1 h-[22px] w-px bg-border" aria-hidden="true" />
              <IconButton
                icon={selected.leida ? Mail : MailOpen}
                label={
                  selected.leida ? "Marcar como no leída" : "Marcar como leída"
                }
                disabled={togglingId === selected.id}
                onClick={() => void setLeida(selected, !selected.leida)}
              />
              <IconLink
                icon={Pencil}
                label="Editar"
                to={`/notifications/${selected.id}/editar`}
              />
              <IconButton
                icon={Trash2}
                danger
                label="Eliminar"
                onClick={() => setTarget(selected)}
              />
            </div>
            <div className="flex flex-col gap-[18px] px-6 pt-[22px] pb-7">
              <h2 className="text-[22px] leading-[1.3] font-extrabold text-pretty break-words">
                {selected.titulo}
              </h2>
              <div className="flex flex-wrap items-center gap-3">
                <Avatar
                  name={recipientName(selected).replace(" (tú)", "")}
                  tone="primary"
                  className="size-10 text-[13px]"
                />
                <div className="flex min-w-[160px] flex-1 flex-col">
                  <span className="text-[15px] font-extrabold">
                    Para: {recipientName(selected)}
                  </span>
                  <span className="text-[13px] break-all text-muted-foreground">
                    {selectedUser?.correo ?? ""}
                  </span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[13px] text-muted-foreground">
                    {formatDateTime(selected.fecha_envio)}
                  </span>
                  {selected.leida ? (
                    <Pill
                      tone="neutral"
                      icon={CheckCheck}
                      className="!h-[22px] !px-2"
                    >
                      Leída
                    </Pill>
                  ) : (
                    <Pill tone="info" icon={Clock} className="!h-[22px] !px-2">
                      No leída
                    </Pill>
                  )}
                </div>
              </div>
              <div className="h-px bg-divider" />
              <div
                className="text-base leading-[1.7] [overflow-wrap:anywhere] whitespace-pre-line text-[#2F322B]"
                dangerouslySetInnerHTML={{
                  __html: sanitizeNotificationHtml(selected.mensaje),
                }}
              />
            </div>
          </article>
        ) : (
          <div
            className={`flex flex-col items-center gap-2 rounded-[14px] border border-dashed border-button-border px-6 py-12 text-center text-muted-foreground ${
              showReader ? "" : "max-lg:hidden"
            }`}
          >
            <span
              className="flex size-[46px] items-center justify-center rounded-xl bg-primary-soft text-primary"
              aria-hidden="true"
            >
              <MailOpen className="size-6" />
            </span>
            {selectedId && !isLoading ? (
              <>
                <span className="text-base font-extrabold text-foreground">
                  Esta notificación ya no existe
                </span>
                <Link
                  to="/notifications"
                  className="text-sm font-bold text-primary hover:underline"
                >
                  Volver a la bandeja
                </Link>
              </>
            ) : (
              <>
                <span className="text-base font-extrabold text-foreground">
                  Selecciona una notificación
                </span>
                <span className="text-sm">Su contenido aparecerá aquí.</span>
              </>
            )}
          </div>
        )}
      </div>

      <NotificationEditDrawer
        notification={editing}
        recipientLabel={
          editing
            ? `${recipientName(editing)}${
                editingUser ? ` <${editingUser.correo}>` : ""
              }`
            : ""
        }
        onClose={() => navigate(`/notifications/${selectedId ?? ""}`)}
        onSaved={(saved) => {
          setItems((prev) => prev.map((x) => (x.id === saved.id ? saved : x)));
          notifyChanged();
          navigate(`/notifications/${saved.id}`, { replace: true });
        }}
      />

      <DeleteNotificationDialog
        open={target !== null}
        notificationTitle={target?.titulo ?? ""}
        recipientName={target ? recipientName(target) : ""}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setTarget(null)}
      />

      <ComposeNotification
        open={composeOpen}
        onClose={() => setComposeOpen(false)}
        minimized={composeMinimized}
        onMinimizedChange={setComposeMinimized}
        onSent={() => {
          refetch();
          notifyChanged();
        }}
      />
    </div>
  );
}
