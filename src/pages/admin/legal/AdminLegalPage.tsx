import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  FilePenLine,
  TriangleAlert,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { ConfirmDialog } from "../../../components/feedback/ConfirmDialog";
import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { Spinner } from "../../../components/feedback/Spinner";
import { useToast } from "../../../components/feedback/useToast";
import { Button, buttonClass } from "../../../components/forms/Button";
import { TextArea } from "../../../components/forms/TextArea";
import { TextField } from "../../../components/forms/TextField";
import { Card, PageHeader } from "../../../components/layout/Page";
import { Modal } from "../../../components/ui/Overlay";
import { Pill } from "../../../components/ui/primitives";
import { formatDate, formatDateTime } from "../../../lib/format";
import { Markdown } from "../../../lib/markdown";
import { useRefreshSignal } from "../../../lib/refresh";
import { legalService } from "../../../services/legalService";
import {
  LEGAL_NAMES,
  LEGAL_PATHS,
  type AcceptanceSummary,
  type AdminLegalDocument,
  type LegalDocumentType,
  type OwnAcceptance,
} from "../../../types/legal";

const TYPES: LegalDocumentType[] = ["terminos", "privacidad"];
const CONTENT_MAX = 100_000;

/**
 * Documentos legales (panel de administración): la versión vigente de los
 * Términos y de la Política de privacidad, su historial, el editor de la
 * siguiente versión y quién ha aceptado. Lo publicado no se edita: un cambio
 * es siempre una versión nueva.
 */
export function AdminLegalPage() {
  const toast = useToast();
  const [versions, setVersions] = useState<AdminLegalDocument[]>([]);
  const [summary, setSummary] = useState<AcceptanceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const reload = useCallback(() => setReloadKey((k) => k + 1), []);
  useRefreshSignal(reload);

  // Editor del borrador en curso.
  const [draft, setDraft] = useState<AdminLegalDocument | null>(null);
  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [reaccept, setReaccept] = useState(true);

  const [historyOpen, setHistoryOpen] = useState<Set<LegalDocumentType>>(new Set());
  const [personOpen, setPersonOpen] = useState<string | null>(null);
  const [personHistory, setPersonHistory] = useState<OwnAcceptance[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      legalService.versions(controller.signal),
      legalService.acceptances(controller.signal),
    ])
      .then(([docs, acceptances]) => {
        setVersions(docs);
        setSummary(acceptances);
        setError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted) {
          setError(err);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, [reloadKey]);

  const edit = (doc: AdminLegalDocument) => {
    setDraft(doc);
    setTitulo(doc.titulo);
    setContenido(doc.contenido);
    setError(null);
  };

  const startDraft = async (tipo: LegalDocumentType) => {
    setBusy(true);
    try {
      edit(await legalService.createDraft(tipo));
      reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  const dirty = draft !== null && (titulo !== draft.titulo || contenido !== draft.contenido);
  const canSave = titulo.trim() !== "" && contenido.length <= CONTENT_MAX;

  const save = async (): Promise<AdminLegalDocument | null> => {
    if (!draft) {
      return null;
    }
    setBusy(true);
    try {
      const saved = await legalService.saveDraft(draft.id, {
        titulo: titulo.trim(),
        contenido,
      });
      setDraft(saved);
      setTitulo(saved.titulo);
      reload();
      return saved;
    } catch (err) {
      setError(err);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const discard = async () => {
    if (!draft) {
      return;
    }
    setBusy(true);
    try {
      await legalService.discardDraft(draft.id);
      toast.success("Borrador descartado.");
      setDraft(null);
      reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
      setConfirmDiscard(false);
    }
  };

  const publish = async () => {
    if (!draft) {
      return;
    }
    // Se publica exactamente lo que está en pantalla.
    const saved = dirty ? await save() : draft;
    if (!saved) {
      setPublishOpen(false);
      return;
    }
    setBusy(true);
    try {
      const published = await legalService.publish(saved.id, reaccept);
      toast.success(
        `${LEGAL_NAMES[published.tipo]}: versión ${published.version} publicada.`,
      );
      setDraft(null);
      reload();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
      setPublishOpen(false);
    }
  };

  const togglePerson = (usuarioId: string) => {
    if (personOpen === usuarioId) {
      setPersonOpen(null);
      return;
    }
    setPersonOpen(usuarioId);
    setPersonHistory(null);
    legalService
      .acceptancesOf(usuarioId)
      .then(setPersonHistory)
      .catch(() => setPersonHistory([]));
  };

  const ofType = (tipo: LegalDocumentType) => versions.filter((d) => d.tipo === tipo);
  const current = draft ? ofType(draft.tipo).find((d) => d.estado === "publicado") : undefined;

  if (draft) {
    return (
      <div className="flex flex-col gap-5">
        <PageHeader
          refresh={false}
          title={`Editar ${LEGAL_NAMES[draft.tipo].toLowerCase()}`}
          description={
            current
              ? `Borrador de la siguiente versión. La vigente es la ${current.version}; no cambia hasta que publiques.`
              : "Primera versión de este documento. No será visible hasta que la publiques."
          }
        />

        {error ? <ErrorAlert error={error} onClose={() => setError(null)} /> : null}

        <Card className="flex flex-col gap-4 p-5">
          <TextField
            label="Título"
            name="titulo"
            required
            maxLength={200}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
          <div className="grid grid-cols-1 gap-4 min-[1100px]:grid-cols-2">
            <TextArea
              label="Contenido"
              name="contenido"
              rows={24}
              maxLength={CONTENT_MAX}
              value={contenido}
              onChange={(e) => setContenido(e.target.value)}
              hint="Formato: # Título, ## Subtítulo, - lista, 1. lista numerada, **negrilla**, *cursiva*, [texto](https://enlace)."
              className="font-mono !text-sm"
            />
            <section aria-label="Vista previa" className="flex min-w-0 flex-col gap-1.5">
              <h2 className="text-sm font-bold">Vista previa</h2>
              <div className="max-h-[640px] flex-1 overflow-y-auto rounded-[10px] border border-input bg-background px-4 py-3">
                {contenido.trim() ? (
                  <Markdown text={contenido} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Aquí verás cómo quedará el documento.
                  </p>
                )}
              </div>
            </section>
          </div>
        </Card>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="ghost" onClick={() => setDraft(null)} disabled={busy}>
            Volver sin publicar
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="dangerOutline"
              onClick={() => setConfirmDiscard(true)}
              disabled={busy}
            >
              Descartar borrador
            </Button>
            <Button
              variant="secondary"
              onClick={() => void save().then((saved) => saved && toast.success("Borrador guardado."))}
              disabled={busy || !dirty || !canSave}
            >
              Guardar borrador
            </Button>
            <Button
              onClick={() => {
                setReaccept(true);
                setPublishOpen(true);
              }}
              disabled={busy || !canSave || !contenido.trim()}
            >
              Publicar…
            </Button>
          </div>
        </div>

        <ConfirmDialog
          open={confirmDiscard}
          danger
          title="¿Descartar el borrador?"
          description="Se pierde lo que hayas escrito. La versión vigente no cambia."
          confirmLabel="Descartar"
          loading={busy}
          onConfirm={() => void discard()}
          onCancel={() => setConfirmDiscard(false)}
        />

        <Modal
          open={publishOpen}
          title={`Publicar ${LEGAL_NAMES[draft.tipo].toLowerCase()}`}
          onClose={() => setPublishOpen(false)}
          footer={
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setPublishOpen(false)} disabled={busy}>
                Cancelar
              </Button>
              <Button onClick={() => void publish()} loading={busy} loadingLabel="Publicando…">
                Publicar
              </Button>
            </div>
          }
        >
          <div className="flex flex-col gap-4 p-5">
            {current ? (
              <fieldset className="flex flex-col gap-2.5">
                <legend className="mb-1 text-sm font-bold">¿Qué tipo de cambio es?</legend>
                {[
                  {
                    value: true,
                    title: "Cambio importante",
                    text: "Cambia derechos, obligaciones o el uso de los datos. Todas las personas deberán aceptar de nuevo.",
                  },
                  {
                    value: false,
                    title: "Corrección menor",
                    text: "Redacción, ortografía o formato. Quien ya aceptó no tiene que hacer nada.",
                  },
                ].map((option) => (
                  <label
                    key={String(option.value)}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-3.5 py-3 ${
                      reaccept === option.value
                        ? "border-primary bg-primary-soft"
                        : "border-border"
                    }`}
                  >
                    <input
                      type="radio"
                      name="tipo-de-cambio"
                      className="mt-1 size-[18px] accent-primary"
                      checked={reaccept === option.value}
                      onChange={() => setReaccept(option.value)}
                    />
                    <span className="flex flex-col">
                      <span className="text-[15px] font-extrabold">{option.title}</span>
                      <span className="text-sm text-text-secondary">{option.text}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            ) : null}
            <p
              role="alert"
              className="flex items-start gap-2 rounded-[10px] border border-warning-border bg-warning-soft px-3 py-2.5 text-sm leading-snug text-warning-foreground"
            >
              <TriangleAlert className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
              {!current || reaccept
                ? `Al publicar, ${
                    summary ? `las ${summary.total} personas con cuenta` : "todas las personas"
                  } no podrán usar la aplicación hasta aceptar esta versión. Lo verán la próxima vez que entren.`
                : "Se publica como versión vigente sin pedir una nueva aceptación. Úsalo solo si el cambio no afecta lo que las personas ya aceptaron."}{" "}
              Una versión publicada no se puede editar ni eliminar.
            </p>
          </div>
        </Modal>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Documentos legales"
        description="Términos y condiciones y Política de privacidad: versión vigente, historial y aceptaciones."
      />

      {error ? <ErrorAlert error={error} onClose={() => setError(null)} /> : null}

      {loading ? (
        <Card className="p-10 text-center text-muted-foreground">
          <Spinner label="Cargando documentos…" />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 min-[900px]:grid-cols-2">
            {TYPES.map((tipo) => {
              const docs = ofType(tipo);
              const published = docs.find((d) => d.estado === "publicado");
              const pendingDraft = docs.find((d) => d.estado === "borrador");
              const archived = docs.filter((d) => d.estado === "archivado");
              const open = historyOpen.has(tipo);
              return (
                <Card
                  key={tipo}
                  as="section"
                  aria-label={LEGAL_NAMES[tipo]}
                  className="flex flex-col gap-3.5 p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h2 className="text-lg font-extrabold">{LEGAL_NAMES[tipo]}</h2>
                    {published ? (
                      <Pill tone="success">Versión {published.version}</Pill>
                    ) : (
                      <Pill tone="warning">Sin publicar</Pill>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary">
                    {published?.publicado_en
                      ? `Vigente desde el ${formatDate(published.publicado_en)}.`
                      : "Todavía no hay una versión publicada: nadie puede leerlo ni aceptarlo."}
                  </p>
                  {pendingDraft ? (
                    <p className="rounded-[10px] bg-info-soft px-3 py-2 text-sm text-info-foreground">
                      Hay un borrador sin publicar, guardado el{" "}
                      {formatDateTime(pendingDraft.actualizado_en)}.
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        pendingDraft ? edit(pendingDraft) : void startDraft(tipo)
                      }
                    >
                      <FilePenLine className="size-[18px]" aria-hidden="true" />
                      {pendingDraft
                        ? "Continuar borrador"
                        : published
                          ? "Crear nueva versión"
                          : "Redactar"}
                    </Button>
                    {published ? (
                      <a
                        href={LEGAL_PATHS[tipo]}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={buttonClass("secondary", "sm")}
                      >
                        <ExternalLink className="size-[18px]" aria-hidden="true" />
                        Ver publicado
                      </a>
                    ) : null}
                  </div>
                  {archived.length > 0 ? (
                    <div className="border-t border-divider pt-3">
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() =>
                          setHistoryOpen((prev) => {
                            const next = new Set(prev);
                            if (!next.delete(tipo)) {
                              next.add(tipo);
                            }
                            return next;
                          })
                        }
                        className="flex items-center gap-1.5 text-sm font-bold text-text-secondary hover:text-foreground"
                      >
                        {open ? (
                          <ChevronUp className="size-[18px]" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="size-[18px]" aria-hidden="true" />
                        )}
                        Versiones anteriores ({archived.length})
                      </button>
                      {open ? (
                        <ul className="mt-2 flex flex-col gap-1 text-sm text-text-secondary">
                          {archived.map((doc) => (
                            <li key={doc.id}>
                              Versión {doc.version} · publicada el{" "}
                              {doc.publicado_en ? formatDate(doc.publicado_en) : "—"}
                              {doc.requiere_reaceptacion ? " · exigió aceptar" : " · corrección menor"}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>

          {summary && Object.keys(summary.documentos).length > 0 ? (
            <Card as="section" aria-label="Aceptaciones" className="overflow-hidden">
              <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-divider px-5 py-4">
                <h2 className="text-lg font-extrabold">Aceptaciones</h2>
                <p className="text-sm text-text-secondary" role="status">
                  {summary.al_dia} de {summary.total}{" "}
                  {summary.total === 1 ? "persona está" : "personas están"} al día
                  {summary.total - summary.al_dia > 0
                    ? ` · ${summary.total - summary.al_dia} pendientes`
                    : ""}
                </p>
              </div>
              <ul>
                {summary.personas.map((person) => {
                  const open = personOpen === person.usuario_id;
                  return (
                    <li
                      key={person.usuario_id}
                      className="border-t border-divider-soft first:border-t-0"
                    >
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => togglePerson(person.usuario_id)}
                        className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1.5 px-5 py-3 text-left hover:bg-surface-alt"
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="text-[15px] font-bold break-words">
                            {person.nombre_completo}
                          </span>
                          <span className="text-[13px] break-all text-muted-foreground">
                            {person.correo}
                          </span>
                        </span>
                        <span className="flex flex-wrap items-center gap-1.5">
                          {TYPES.filter((tipo) => summary.documentos[tipo]).map((tipo) => {
                            const accepted = person.aceptaciones[tipo];
                            return (
                              <Pill
                                key={tipo}
                                tone={accepted ? "success" : "warning"}
                                className="!h-6 !px-2 !text-xs"
                              >
                                {tipo === "terminos" ? "Términos" : "Privacidad"}:{" "}
                                {accepted ? `v${accepted.version}` : "pendiente"}
                              </Pill>
                            );
                          })}
                          {open ? (
                            <ChevronUp className="size-[18px] text-text-secondary" aria-hidden="true" />
                          ) : (
                            <ChevronDown className="size-[18px] text-text-secondary" aria-hidden="true" />
                          )}
                        </span>
                      </button>
                      {open ? (
                        <div className="bg-surface-alt px-5 py-3 text-sm text-text-secondary">
                          {personHistory === null ? (
                            <Spinner label="Cargando historial…" />
                          ) : personHistory.length === 0 ? (
                            "Todavía no ha aceptado ningún documento."
                          ) : (
                            <ul className="flex flex-col gap-1">
                              {personHistory.map((item) => (
                                <li key={item.id}>
                                  {item.titulo}, versión {item.version} · aceptado el{" "}
                                  {formatDateTime(item.aceptado_en)}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
