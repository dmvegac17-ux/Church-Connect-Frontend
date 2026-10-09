import { Ban, CircleAlert, ClipboardList, MailCheck, Repeat } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ConfirmDialog } from "../../../components/feedback/ConfirmDialog";
import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { Spinner } from "../../../components/feedback/Spinner";
import { useToast } from "../../../components/feedback/useToast";
import { Button } from "../../../components/forms/Button";
import { Card, PageHeader } from "../../../components/layout/Page";
import {
  Avatar,
  IconButton,
  Pager,
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
  STATUS_META,
} from "../../../lib/participations";
import { participationService } from "../../../services/participationService";
import { ApiError } from "../../../types/api";
import type {
  Participation,
  ParticipationFilter,
  ParticipationList,
  ResponseStatus,
} from "../../../types/participation";
import { ReassignDialog } from "./ReassignDialog";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

const TABS: { value: ParticipationFilter; label: string }[] = [
  { value: "todas", label: "Todas" },
  { value: "pendientes", label: "Pendientes" },
  { value: "aceptadas", label: "Aceptadas" },
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
    e
      ? `${e} ${e === 1 ? "invitación no se pudo enviar" : "invitaciones no se pudieron enviar"}`
      : "",
  ].filter(Boolean);
  return `${partes.join(" y ")}.`;
}

/** Participaciones (panel de administración): invitaciones y respuestas por actividad. */
export function AdminParticipationsPage() {
  const toast = useToast();
  const [filter, setFilter] = useState<ParticipationFilter>("todas");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);

  const [list, setList] = useState<ParticipationList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const [cancelTarget, setCancelTarget] = useState<Participation | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [replaceTarget, setReplaceTarget] = useState<Participation | null>(null);
  const [resendingId, setResendingId] = useState<string | null>(null);

  // La búsqueda va al servidor: se espera a que se deje de escribir.
  useEffect(() => {
    const id = window.setTimeout(() => {
      setQuery(search.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    participationService
      .list({
        filtro: filter,
        q: query,
        pagina: page,
        porPagina: PAGE_SIZE,
        signal: controller.signal,
      })
      .then((result) => {
        setList(result);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(err);
        setLoading(false);
      });

    return () => controller.abort();
  }, [filter, query, page, reloadKey]);

  const refetch = useCallback(() => setReloadKey((k) => k + 1), []);

  const changeFilter = (next: ParticipationFilter) => {
    setFilter(next);
    setPage(1);
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
        toast.success(`Invitación reenviada a ${row.participante.nombre_completo}.`);
      } else {
        toast.error(
          "El correo volvió a fallar. La invitación sigue pendiente y visible para el participante en la aplicación.",
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

  const items = list?.items ?? [];
  const alertas = list?.alertas;
  const hasAlert =
    alertas !== undefined &&
    alertas.actividades_por_reasignar + alertas.invitaciones_error_envio > 0;
  const total = list?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
            tabs={TABS.map((tab) => ({ ...tab, count: list?.conteos[tab.value] }))}
          />
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
                    <th scope="col" className={TH_CLASS}>
                      Actividad
                    </th>
                    <th scope="col" className={TH_CLASS}>
                      Participante
                    </th>
                    <th scope="col" className={TH_CLASS}>
                      Envío
                    </th>
                    <th scope="col" className={TH_CLASS}>
                      Respuesta
                    </th>
                    <th scope="col" className={`${TH_CLASS} !text-right`}>
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((row) => (
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
                          <span className="font-bold">
                            {row.participante.nombre_completo}
                          </span>
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
              {items.map((row) => (
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
                    <span className="font-bold">{row.participante.nombre_completo}</span>
                  </span>
                  <DeliveryCell row={row} />
                  <ResponseCell row={row} />
                  {row.acciones_permitidas.length > 0 ? actions(row) : null}
                </li>
              ))}
            </ul>

            <Pager
              page={page}
              pageCount={pageCount}
              total={total}
              pageSize={PAGE_SIZE}
              onChange={setPage}
              disabled={loading}
              noun="invitaciones"
            />
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
          Respondió el {shortDate(row.fecha_respuesta)}
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
          Reenviar
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
