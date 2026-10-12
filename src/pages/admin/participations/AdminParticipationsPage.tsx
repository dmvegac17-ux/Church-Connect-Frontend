import {
  Ban,
  CircleAlert,
  ClipboardList,
  MailCheck,
  Repeat,
  UserCheck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { useAuth } from "../../../auth/useAuth";
import { ConfirmDialog } from "../../../components/feedback/ConfirmDialog";
import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { Spinner } from "../../../components/feedback/Spinner";
import { useToast } from "../../../components/feedback/useToast";
import { Button } from "../../../components/forms/Button";
import { CACHE_TTL_MS } from "../../../lib/httpClient";
import { useRefreshSignal } from "../../../lib/refresh";
import { Card, PageHeader } from "../../../components/layout/Page";
import {
  SortHeader,
  TablePager,
  useTableState,
} from "../../../components/ui/DataTable";
import {
  Avatar,
  IconButton,
  Pill,
  SearchInput,
  SegmentedTabs,
  TD_CLASS,
  TH_CLASS,
  TR_CLASS,
} from "../../../components/ui/primitives";
import {
  clockRange,
  conflictStatus,
  shortDate,
  countParticipations,
  type AdminFilter,
  filterParticipations,
  searchParticipations,
  STATUS_META,
} from "../../../lib/participations";
import { participationService } from "../../../services/participationService";
import { ApiError } from "../../../types/api";
import type {
  Participation,
  ParticipationList,
  ResponseStatus,
} from "../../../types/participation";
import { ReassignDialog } from "./ReassignDialog";

/** Tamaño de cada petición: el filtro completo se ordena y pagina en la tabla. */
const FETCH_SIZE = 100;
/** Tope de seguridad: 20 páginas (2000 invitaciones). */
const MAX_FETCH_PAGES = 20;

type ParticipationColumn = "actividad" | "participante" | "envio" | "respuesta";

const TABS: { value: AdminFilter; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "pendientes", label: "Pendientes" },
  { value: "aceptadas", label: "Aceptadas" },
  { value: "vencidas", label: "Vencidas" },
  { value: "por_reasignar", label: "Por reasignar" },
  { value: "error_envio", label: "Error de envío" },
];

const CONFLICT_MESSAGES: Partial<Record<ResponseStatus, string>> = {
  aceptada: "La persona aceptó la invitación mientras tanto.",
  rechazada: "La persona rechazó la invitación mientras tanto.",
  vencida: "La invitación venció mientras tanto.",
  cancelada: "La invitación ya había sido cancelada.",
  reasignada: "La actividad ya fue reasignada a otra persona.",
  revocada: "La confirmación ya había sido revocada.",
  pendiente: "La invitación sigue pendiente de respuesta.",
};

export function alertText(alertas: ParticipationList["alertas"]): string {
  const a = alertas.actividades_por_reasignar;
  const e = alertas.invitaciones_error_envio;
  const partes = [
    a
      ? `${a} ${a === 1 ? "actividad necesita" : "actividades necesitan"} una nueva asignación`
      : "",
    // Lo que falló fue el correo: la invitación sí quedó en la aplicación.
    e
      ? e === 1
        ? "El correo electrónico de 1 invitación no se pudo enviar; la persona sí la recibió como notificación en la aplicación"
        : `El correo electrónico de ${e} invitaciones no se pudo enviar; las personas sí las recibieron como notificación en la aplicación`
      : "",
  ].filter(Boolean);
  return `${partes.join(". ")}.`;
}

/** Participaciones (panel de administración): invitaciones y respuestas por actividad. */
export function AdminParticipationsPage() {
  const toast = useToast();
  const { user: me } = useAuth();
  const meId = me?.id ?? "";
  // El filtro y la búsqueda viven en la URL: se conservan al recargar.
  const [params, setParams] = useSearchParams();
  const filterParam = params.get("filtro");
  const filter: AdminFilter = TABS.some((tab) => tab.value === filterParam)
    ? (filterParam as AdminFilter)
    : "todas";
  const search = params.get("q") ?? "";
  const eventId = params.get("evento") ?? "";
  const query = search.trim();
  const setParam = (key: string, value: string) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        if (value) {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        return next;
      },
      { replace: true },
    );
  const setSearch = (value: string) => setParam("q", value);
  const [reloadKey, setReloadKey] = useState(0);

  const [list, setList] = useState<ParticipationList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const [cancelTarget, setCancelTarget] = useState<Participation | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<Participation | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    // Un refresco en segundo plano conserva lo que se ve: sin «Cargando…».
    const silent = silentRef.current;
    silentRef.current = false;
    if (!silent) {
      setLoading(true);
    }
    setError(null);

    // Se trae todo una sola vez: filtrar, buscar, contar, ordenar y paginar
    // se hace en memoria, sin otra petición por cada cambio.
    const loadAll = async (): Promise<ParticipationList> => {
      const fetchPage = (pagina: number) =>
        participationService.list({
          filtro: "todas",
          pagina,
          porPagina: FETCH_SIZE,
          signal: controller.signal,
        });

      // Conteos y alertas vienen iguales en cada página: bastan los primeros.
      const first = await fetchPage(1);
      const items = [...first.items];
      let last = first.items.length;
      for (
        let pagina = 2;
        pagina <= MAX_FETCH_PAGES && last === FETCH_SIZE && items.length < first.total;
        pagina++
      ) {
        const next = await fetchPage(pagina);
        last = next.items.length;
        items.push(...next.items);
      }
      return { ...first, items };
    };

    loadAll()
      .then((result) => {
        loadedAt.current = Date.now();
        setList(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        // Si falla un refresco en segundo plano, se deja lo que ya había.
        if (!silent) {
          setError(err);
        }
        setLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  // «Actualizar» vuelve a consultar sin borrar lo que se ve.
  const silentRef = useRef(false);
  // Cuándo llegaron los datos que se están viendo.
  const loadedAt = useRef(0);
  const refreshQuietly = useCallback(() => {
    silentRef.current = true;
    setReloadKey((k) => k + 1);
  }, []);
  useRefreshSignal(refreshQuietly);
  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  const changeFilter = (next: AdminFilter) => {
    setParam("filtro", next === "todas" ? "" : next);
    // La pestaña se muestra al instante con lo ya cargado. Si eso tiene más
    // de lo que dura la caché, se pone al día en segundo plano: como mucho
    // una consulta cada 25 s, no una por cada cambio de pestaña.
    if (Date.now() - loadedAt.current > CACHE_TTL_MS) {
      refreshQuietly();
    }
  };

  const explainConflict = useCallback(
    (current: ResponseStatus | null, fallback: string) => {
      toast.info((current && CONFLICT_MESSAGES[current]) || fallback);
      refetch();
    },
    [toast, refetch],
  );

  const confirmCancel = async () => {
    if (!cancelTarget) {
      return;
    }
    setCancelling(true);
    try {
      await participationService.cancel(cancelTarget.id);
      toast.success("Invitación cancelada.");
      refetch();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        explainConflict(conflictStatus(err), err.message);
      } else if (err instanceof ApiError && err.status === 404) {
        refetch();
      } else {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "No se pudo cancelar la invitación. Inténtalo de nuevo.",
        );
      }
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  };

  const resend = async (row: Participation) => {
    setResendingId(row.id);
    try {
      const updated = await participationService.resend(row.id);
      if (updated.estado_envio === "enviada") {
        toast.success(`Correo reenviado a ${row.participante.nombre_completo}.`);
      } else {
        toast.error(
          "El correo volvió a fallar. La invitación sigue visible para el participante en la aplicación.",
        );
      }
      refetch();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        explainConflict(conflictStatus(err), err.message);
      } else {
        toast.error(
          err instanceof ApiError
            ? err.message
            : "No se pudo reenviar la invitación. Inténtalo de nuevo.",
        );
      }
    } finally {
      setResendingId(null);
    }
  };

  // Los contadores de las pestañas respetan la búsqueda, como en el servidor.
  // Eventos con alguna invitación, para el filtro (del más próximo al más lejano).
  const eventOptions = useMemo(() => {
    const byId = new Map<string, { id: string; nombre: string; fecha: string }>();
    for (const row of list?.items ?? []) {
      const known = byId.get(row.evento.id);
      if (!known || row.actividad.fecha < known.fecha) {
        byId.set(row.evento.id, { ...row.evento, fecha: row.actividad.fecha });
      }
    }
    return [...byId.values()].sort((a, b) => a.fecha.localeCompare(b.fecha));
  }, [list]);
  // Un evento que ya no tiene invitaciones (o un enlace viejo) no filtra nada.
  const activeEvent = eventOptions.some((e) => e.id === eventId) ? eventId : "";

  const matching = useMemo(
    () =>
      searchParticipations(list?.items ?? [], query).filter(
        (row) => !activeEvent || row.evento.id === activeEvent,
      ),
    [list, query, activeEvent],
  );
  const counts = useMemo(() => countParticipations(matching), [matching]);
  const items = useMemo(
    () => filterParticipations(matching, filter),
    [matching, filter],
  );
  const alertas = list?.alertas;
  const hasAlert =
    alertas !== undefined &&
    alertas.actividades_por_reasignar + alertas.invitaciones_error_envio > 0;
  const table = useTableState<Participation, ParticipationColumn>(
    "admin-participations",
    items,
    {
      actividad: (row) => row.actividad.nombre,
      participante: (row) => row.participante.nombre_completo,
      envio: (row) => row.fecha_envio ?? "",
      respuesta: (row) => STATUS_META[row.estado_respuesta].label,
    },
  );
  /** Las propias llevan «(Tú)»: el administrador también puede participar. */
  const whoLabel = (row: Participation) =>
    `${row.participante.nombre_completo}${row.participante.id === meId ? " (Tú)" : ""}`;

  const actions = (row: Participation) => (
    <RowActions
      row={row}
      resending={resendingId === row.id}
      onResend={() => void resend(row)}
      onReplace={() => setReplaceTarget(row)}
      onCancel={() => setCancelTarget(row)}
    />
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Participaciones"
        description="Invitaciones enviadas a participantes y sus respuestas, por actividad."
      />

      {hasAlert && alertas ? (
        <div
          role="status"
          className="flex flex-wrap items-center gap-3 rounded-xl border border-[#F0DDB4] bg-warning-soft px-4 py-3.5 text-[#5E4210]"
        >
          <ClipboardList className="size-[22px] shrink-0" aria-hidden="true" />
          <p className="min-w-[200px] flex-1 text-[15px] font-bold">{alertText(alertas)}</p>
          <button
            type="button"
            onClick={() =>
              changeFilter(
                alertas.actividades_por_reasignar > 0 ? "por_reasignar" : "error_envio",
              )
            }
            className="h-9 rounded-[9px] border border-[#D9BE85] bg-card px-3 text-sm font-bold whitespace-nowrap text-[#5E4210] hover:bg-accent max-md:h-11"
          >
            Ver
          </button>
        </div>
      ) : null}

      {error ? <ErrorAlert error={error} /> : null}

      <Card as="section" className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider p-4">
          <SegmentedTabs
            label="Filtrar por estado"
            value={filter}
            onChange={changeFilter}
            tabs={TABS.map((tab) => ({
              ...tab,
              count: list ? counts[tab.value] : undefined,
            }))}
          />
          <label className="flex items-center gap-2 text-sm font-bold text-text-secondary">
            Evento
            <select
              value={activeEvent}
              onChange={(e) => setParam("evento", e.target.value)}
              className="h-[var(--control-h)] max-w-[260px] rounded-[10px] border border-input bg-card px-2.5 text-[15px] font-normal text-foreground"
            >
              <option value="">Todos los eventos</option>
              {eventOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.nombre}
                </option>
              ))}
            </select>
          </label>
          <SearchInput
            label="Buscar participaciones"
            placeholder="Actividad, evento o participante"
            value={search}
            onChange={setSearch}
            className="max-w-[320px] min-w-[200px] flex-1"
          />
        </div>

        {loading && !list ? (
          <div className="p-10 text-center text-muted-foreground">
            <Spinner label="Cargando participaciones…" />
          </div>
        ) : items.length === 0 ? (
          <p className="px-5 py-11 text-center text-[15px] text-muted-foreground">
            {error
              ? "No se pudieron cargar las participaciones."
              : query
                ? `Ninguna invitación coincide con «${query}» en esta vista.`
                : "No hay invitaciones en esta vista."}
          </p>
        ) : (
          <div aria-busy={loading} className={loading ? "opacity-60" : ""}>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[860px] border-collapse text-sm">
                <thead>
                  <tr className="bg-surface-alt">
                    <SortHeader column="actividad" table={table}>
                      Actividad
                    </SortHeader>
                    <SortHeader column="participante" table={table}>
                      Participante
                    </SortHeader>
                    <SortHeader column="envio" table={table}>
                      Envío
                    </SortHeader>
                    <SortHeader column="respuesta" table={table}>
                      Respuesta
                    </SortHeader>
                    <th scope="col" className={`${TH_CLASS} !text-right`}>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {table.rows.map((row) => (
                    <tr key={row.id} className={TR_CLASS}>
                      <td className={`${TD_CLASS} py-3`}>
                        <ActivityCell row={row} />
                      </td>
                      <td className={`${TD_CLASS} py-3`}>
                        <span className="flex items-center gap-2.5">
                          <Avatar
                            name={row.participante.nombre_completo}
                            className="size-8 text-xs"
                          />
                          <span className="font-bold">{whoLabel(row)}</span>
                        </span>
                      </td>
                      <td className={`${TD_CLASS} py-3 whitespace-nowrap`}>
                        <DeliveryCell row={row} />
                      </td>
                      <td className={`${TD_CLASS} py-3`}>
                        <ResponseCell row={row} />
                      </td>
                      <td className={`${TD_CLASS} py-3`}>{actions(row)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* En móvil, la misma información en tarjetas. */}
            <ul className="md:hidden">
              {table.rows.map((row) => (
                <li
                  key={row.id}
                  className="flex flex-col gap-3 border-t border-divider-soft px-4 py-4 first:border-t-0"
                >
                  <ActivityCell row={row} />
                  <span className="flex items-center gap-2.5">
                    <Avatar
                      name={row.participante.nombre_completo}
                      className="size-8 text-xs"
                    />
                    <span className="font-bold">{whoLabel(row)}</span>
                  </span>
                  <DeliveryCell row={row} />
                  <ResponseCell row={row} />
                  {row.acciones_permitidas.length > 0 ? actions(row) : null}
                </li>
              ))}
            </ul>

            <TablePager table={table} />
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={cancelTarget !== null}
        danger
        title="Cancelar invitación"
        description={
          cancelTarget
            ? `${cancelTarget.participante.nombre_completo} ya no podrá responder la invitación a «${cancelTarget.actividad.nombre}». La actividad quedará sin asignar.`
            : undefined
        }
        confirmLabel="Cancelar invitación"
        // "Volver", no "Cancelar": evita dos botones con el mismo verbo.
        cancelLabel="Volver"
        loading={cancelling}
        loadingLabel="Cancelando…"
        onConfirm={() => void confirmCancel()}
        onCancel={() => setCancelTarget(null)}
      />

      <ReassignDialog
        invitation={replaceTarget}
        onClose={() => setReplaceTarget(null)}
        onDone={(result, mode) => {
          setReplaceTarget(null);
          if (result.nueva.estado_envio === "autoasignada") {
            // Se asignó a sí mismo: no hay invitación ni plazo que anunciar.
            toast.success(`Te asignaste «${result.nueva.actividad.nombre}».`);
            refetch();
            return;
          }
          const name = result.nueva.participante.nombre_completo;
          const due = shortDate(result.nueva.fecha_limite_respuesta);
          const sent =
            result.nueva.estado_envio === "error"
              ? `Invitación creada para ${name}, pero el correo no se pudo enviar; tiene hasta el ${due} para responder en la aplicación.`
              : `Invitación enviada a ${name}; tiene hasta el ${due} para responder.`;
          toast.success(`${mode === "revocar" ? "Confirmación revocada. " : ""}${sent}`);
          refetch();
        }}
        onConflict={(current, message) => {
          setReplaceTarget(null);
          explainConflict(current, message);
        }}
      />
    </div>
  );
}

function ActivityCell({ row }: { row: Participation }) {
  return (
    <div className="min-w-0">
      <p className="text-[15px] font-extrabold break-words">{row.actividad.nombre}</p>
      <p className="text-[13px] text-muted-foreground">
        {row.evento.nombre} · {shortDate(row.actividad.fecha)} ·{" "}
        {clockRange(row.actividad.hora_inicio, row.actividad.hora_fin)}
      </p>
    </div>
  );
}

function DeliveryCell({ row }: { row: Participation }) {
  if (row.estado_envio === "error") {
    return (
      <Pill tone="danger" icon={CircleAlert}>
        Error de envío
      </Pill>
    );
  }
  if (row.estado_envio === "autoasignada") {
    // Tono neutro: no hubo correo, ni enviado ni fallido.
    return (
      <Pill tone="neutral" icon={UserCheck}>
        Autoasignada
      </Pill>
    );
  }
  if (row.estado_envio === "enviada") {
    return (
      <span className="flex items-center gap-1.5 text-text-strong">
        <MailCheck className="size-[17px] text-success" aria-hidden="true" />
        Enviada {shortDate(row.fecha_envio)}
      </span>
    );
  }
  return <span className="text-muted-foreground">En cola de envío</span>;
}

function ResponseCell({ row }: { row: Participation }) {
  const meta = STATUS_META[row.estado_respuesta];
  const label =
    row.estado_respuesta === "reasignada" && row.reemplazo
      ? `Reasignada a ${row.reemplazo.participante.nombre_completo}`
      : row.por_reconfirmar
        ? "Por reconfirmar"
        : meta.label;
  const previous =
    row.estado_respuesta === "reasignada" && row.estado_previo
      ? {
          rechazada: "Rechazó la invitación",
          vencida: "No respondió a tiempo",
          cancelada: "Invitación cancelada",
        }[row.estado_previo as "rechazada" | "vencida" | "cancelada"]
      : null;

  return (
    <div className="flex flex-col items-start gap-1">
      <Pill tone={meta.tone} icon={meta.icon} className="max-w-full">
        <span className="truncate">{label}</span>
      </Pill>
      {previous ? <p className="text-xs text-muted-foreground">{previous}</p> : null}
      {row.estado_respuesta === "revocada" && row.reemplazo ? (
        <p className="flex items-center gap-1 text-xs font-bold text-success-foreground">
          <Repeat className="size-3.5" aria-hidden="true" />
          Ahora: {row.reemplazo.participante.nombre_completo}
        </p>
      ) : null}
      {row.fecha_respuesta ? (
        <p className="text-xs text-muted-foreground">
          {row.estado_envio === "autoasignada" ? "Autoasignada el " : "Respondió el "}
          {shortDate(row.fecha_respuesta)}
        </p>
      ) : null}
      {row.motivo_rechazo ? (
        <p className="max-w-[240px] text-[13px] break-words text-text-secondary">
          «{row.motivo_rechazo}»
        </p>
      ) : null}
      {row.estado_respuesta === "pendiente" && row.fecha_limite_respuesta ? (
        <p className="text-xs text-muted-foreground">
          Plazo: {shortDate(row.fecha_limite_respuesta)}
        </p>
      ) : null}
      {row.requiere_reasignacion ? (
        <p className="flex items-center gap-1 text-xs font-extrabold text-warning-foreground">
          <ClipboardList className="size-3.5" aria-hidden="true" />
          Pendiente de asignación
        </p>
      ) : null}
    </div>
  );
}

/** Solo pinta las acciones que el backend incluyó en `acciones_permitidas`. */
function RowActions({
  row,
  resending,
  onResend,
  onReplace,
  onCancel,
}: {
  row: Participation;
  resending: boolean;
  onResend: () => void;
  onReplace: () => void;
  onCancel: () => void;
}) {
  const can = (action: Participation["acciones_permitidas"][number]) =>
    row.acciones_permitidas.includes(action);
  const name = row.participante.nombre_completo;

  return (
    <div className="flex flex-wrap items-center gap-1.5 md:justify-end">
      {can("reenviar") ? (
        <Button
          variant="secondary"
          size="sm"
          onClick={onResend}
          loading={resending}
          loadingLabel="Reenviando…"
          aria-label={`Reenviar invitación a ${name}`}
          className="md:!h-[34px] md:!px-2.5 md:!text-[13px]"
        >
          Reenviar correo
        </Button>
      ) : null}
      {can("reasignar") ? (
        <Button
          size="sm"
          onClick={onReplace}
          aria-label={`Reasignar ${row.actividad.nombre}`}
          className="md:!h-[34px] md:!px-2.5 md:!text-[13px]"
        >
          Reasignar
        </Button>
      ) : null}
      {can("revocar_y_cambiar") ? (
        <Button
          variant="dangerOutline"
          size="sm"
          onClick={onReplace}
          aria-label={`Revocar confirmación de ${name}`}
          className="md:!h-[34px] md:!px-2.5 md:!text-[13px]"
        >
          Revocar y cambiar
        </Button>
      ) : null}
      {can("cancelar") ? (
        <IconButton
          icon={Ban}
          danger
          label={`Cancelar invitación a ${name}`}
          onClick={onCancel}
        />
      ) : null}
    </div>
  );
}
