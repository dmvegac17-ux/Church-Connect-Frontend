import { useEffect, useId, useState, type FormEvent } from "react";

import { ConfirmDialog } from "../../../components/feedback/ConfirmDialog";
import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { useToast } from "../../../components/feedback/useToast";
import { Button } from "../../../components/forms/Button";
import { TextArea } from "../../../components/forms/TextArea";
import { TextField } from "../../../components/forms/TextField";
import { FormStatus } from "../../../components/ui/FormStatus";
import { Drawer } from "../../../components/ui/Overlay";
import { publishedLine, updatedLine } from "../../../lib/announcements";
import { announcementService } from "../../../services/announcementService";
import { ApiError } from "../../../types/api";
import {
  ANNOUNCEMENT_CONTENT_MAX,
  ANNOUNCEMENT_TITLE_MAX,
  type Announcement,
  type AnnouncementDraft,
} from "../../../types/announcement";
import { ImagePicker } from "./ImagePicker";

type Field = "titulo" | "contenido" | "imagen";

interface AnnouncementFormDrawerProps {
  open: boolean;
  /** `null` = crear; un anuncio = editar. */
  announcement: Announcement | null;
  onClose: () => void;
  onSaved: (saved: Announcement) => void;
}

/** Campo que el backend señala en un `422` (`data.campo`). */
function serverField(err: unknown): Field | null {
  if (!(err instanceof ApiError) || err.status !== 422) {
    return null;
  }
  const campo = (err.payload?.data as { campo?: string } | null | undefined)?.campo;
  return campo === "titulo" || campo === "contenido" || campo === "imagen" ? campo : null;
}

/** Panel lateral para crear o editar un anuncio, con su imagen. */
export function AnnouncementFormDrawer({
  open,
  announcement,
  onClose,
  onSaved,
}: AnnouncementFormDrawerProps) {
  const toast = useToast();
  const formId = useId();
  const isEdit = announcement !== null;

  const [titulo, setTitulo] = useState("");
  const [contenido, setContenido] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [removeCurrent, setRemoveCurrent] = useState(false);
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState<Partial<Record<Field, string>>>({});
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const initialTitulo = announcement?.titulo ?? "";
  const initialContenido = announcement?.contenido ?? "";
  const currentUrl = removeCurrent ? null : (announcement?.imagen_url ?? null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setTitulo(initialTitulo);
    setContenido(initialContenido);
    setFile(null);
    setRemoveCurrent(false);
    setTouched({});
    setSubmitted(false);
    setServerErrors({});
    setError(null);
    setProgress(null);
    setConfirmDiscard(false);
  }, [open, initialTitulo, initialContenido]);

  const errors: Partial<Record<Field, string>> = {
    titulo: !titulo.trim() ? "Escribe el título." : serverErrors.titulo,
    contenido: !contenido.trim() ? "Escribe el texto del anuncio." : serverErrors.contenido,
    imagen: serverErrors.imagen,
  };
  const errorCount = Object.values(errors).filter(Boolean).length;
  const shown = (field: Field) =>
    submitted || touched[field] || serverErrors[field] ? errors[field] : undefined;

  const dirty =
    titulo.trim() !== initialTitulo.trim() ||
    contenido.trim() !== initialContenido.trim() ||
    file !== null ||
    removeCurrent;
  const canSubmit = !submitting && (!isEdit || dirty);

  const requestClose = () => {
    if (submitting) {
      return;
    }
    if (dirty) {
      setConfirmDiscard(true);
    } else {
      onClose();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setError(null);
    if (errors.titulo || errors.contenido || !canSubmit) {
      return;
    }

    setSubmitting(true);
    setProgress(file ? 0 : null);
    const onProgress = file ? setProgress : undefined;
    try {
      let saved: Announcement;
      if (announcement) {
        // Solo lo que cambió; autor y editor los pone el servidor.
        const draft: Partial<AnnouncementDraft> = {};
        if (titulo.trim() !== initialTitulo.trim()) {
          draft.titulo = titulo.trim();
        }
        if (contenido.trim() !== initialContenido.trim()) {
          draft.contenido = contenido.trim();
        }
        if (file) {
          draft.imagen = file;
        } else if (removeCurrent) {
          draft.quitarImagen = true;
        }
        saved = await announcementService.update(announcement.id, draft, { onProgress });
        toast.success(`Los cambios de «${saved.titulo}» se guardaron.`);
      } else {
        saved = await announcementService.create(
          { titulo: titulo.trim(), contenido: contenido.trim(), imagen: file },
          { onProgress },
        );
        toast.success(`Anuncio «${saved.titulo}» publicado.`);
      }
      onSaved(saved);
    } catch (err) {
      const field = serverField(err);
      if (field && err instanceof ApiError) {
        setServerErrors({ [field]: err.message });
      } else {
        setError(err);
      }
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  };

  const updated = announcement ? updatedLine(announcement) : null;

  return (
    <>
      <Drawer
        open={open}
        title={isEdit ? "Editar anuncio" : "Nuevo anuncio"}
        onClose={requestClose}
        footer={
          <div className="flex flex-col gap-3">
            {progress !== null ? (
              <div className="flex flex-col gap-1">
                <div className="flex justify-between text-[13px] text-text-secondary">
                  <span>{progress < 1 ? "Subiendo imagen…" : "Guardando…"}</span>
                  <span className="tabular-nums">{Math.round(progress * 100)}%</span>
                </div>
                <div
                  role="progressbar"
                  aria-label="Subida de la imagen"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={Math.round(progress * 100)}
                  className="h-2 overflow-hidden rounded-full bg-muted"
                >
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <FormStatus
                saving={submitting}
                submitted={submitted}
                errorCount={errorCount}
                dirty={dirty}
              />
            )}
            <div className="flex justify-end gap-2.5">
              <Button variant="secondary" onClick={requestClose} disabled={submitting}>
                Cancelar
              </Button>
              <Button
                type="submit"
                form={formId}
                loading={submitting}
                loadingLabel={isEdit ? "Guardando…" : "Publicando…"}
                disabled={!canSubmit}
              >
                {isEdit ? "Guardar cambios" : "Publicar anuncio"}
              </Button>
            </div>
          </div>
        }
      >
        <form
          id={formId}
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-4"
        >
          {announcement ? (
            <div className="flex flex-col gap-0.5 rounded-xl bg-surface-alt px-3.5 py-3 text-[13px] text-muted-foreground">
              <p>{publishedLine(announcement)}</p>
              {updated ? <p>{updated}</p> : null}
            </div>
          ) : null}

          {error ? <ErrorAlert error={error} onClose={() => setError(null)} /> : null}

          <TextField
            label="Título"
            name="titulo"
            required
            maxLength={ANNOUNCEMENT_TITLE_MAX}
            value={titulo}
            disabled={submitting}
            onChange={(e) => {
              setTitulo(e.target.value);
              setServerErrors((prev) => ({ ...prev, titulo: undefined }));
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, titulo: true }))}
            error={shown("titulo")}
          />
          <TextArea
            label="Texto"
            name="contenido"
            required
            rows={8}
            maxLength={ANNOUNCEMENT_CONTENT_MAX}
            value={contenido}
            disabled={submitting}
            onChange={(e) => {
              setContenido(e.target.value);
              setServerErrors((prev) => ({ ...prev, contenido: undefined }));
            }}
            onBlur={() => setTouched((prev) => ({ ...prev, contenido: true }))}
            error={shown("contenido")}
            hint="Los saltos de línea se respetan al mostrarlo."
          />
          <ImagePicker
            currentUrl={currentUrl}
            file={file}
            disabled={submitting}
            error={serverErrors.imagen}
            onFileChange={(next) => {
              setFile(next);
              setServerErrors((prev) => ({ ...prev, imagen: undefined }));
            }}
            onRemoveCurrent={() => setRemoveCurrent(true)}
          />
        </form>
      </Drawer>

      <ConfirmDialog
        open={confirmDiscard}
        danger
        title="¿Descartar los cambios?"
        description="Los cambios que hiciste en este anuncio no se guardarán."
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
        onConfirm={() => {
          setConfirmDiscard(false);
          onClose();
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </>
  );
}
