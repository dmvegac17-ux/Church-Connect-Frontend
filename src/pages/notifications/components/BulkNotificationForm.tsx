import { ChevronDown, Users } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { Button } from "../../../components/forms/Button";
import { RichTextEditor } from "../../../components/forms/RichTextEditor";
import { TextField } from "../../../components/forms/TextField";
import { useUserOptions } from "../../../hooks/useUserOptions";
import { htmlToPlainText } from "../../../lib/htmlText";
import { focusFirstError, maxLength, required } from "../../../lib/validators";
import { NOTIFICATION_TITULO_MAX_LENGTH } from "../../../types/notification";

export interface BulkNotificationFormValues {
  usuariosIds: string[];
  titulo: string;
  mensaje: string;
}

interface BulkNotificationFormProps {
  submitting: boolean;
  /** Error de validación de negocio (ej. lista vacía) que no es de un campo de texto. */
  formError?: string;
  onSubmit: (values: BulkNotificationFormValues) => void;
  /** Cambiar este valor limpia el formulario (tras un envío `201` exitoso). */
  resetSignal?: number;
}

const EMPTY: BulkNotificationFormValues = {
  usuariosIds: [],
  titulo: "",
  mensaje: "",
};

export function BulkNotificationForm({
  submitting,
  formError,
  onSubmit,
  resetSignal,
}: BulkNotificationFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [values, setValues] = useState<BulkNotificationFormValues>(EMPTY);
  const [clientErrors, setClientErrors] = useState<Record<string, string>>({});
  const { users, isLoading, error: loadError } = useUserOptions();

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (resetSignal === undefined) {
      return;
    }
    setValues(EMPTY);
    setClientErrors({});
  }, [resetSignal]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const toggleUser = (id: string) => {
    setValues((prev) => ({
      ...prev,
      usuariosIds: prev.usuariosIds.includes(id)
        ? prev.usuariosIds.filter((u) => u !== id)
        : [...prev.usuariosIds, id],
    }));
  };

  const selectAll = () =>
    setValues((prev) => ({ ...prev, usuariosIds: users.map((u) => u.id) }));
  const clearAll = () =>
    setValues((prev) => ({ ...prev, usuariosIds: [] }));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const next: Record<string, string> = {};
    if (!required(values.titulo)) {
      next.titulo = "El título es obligatorio.";
    } else if (!maxLength(values.titulo, NOTIFICATION_TITULO_MAX_LENGTH)) {
      next.titulo = `El título no puede superar los ${NOTIFICATION_TITULO_MAX_LENGTH} caracteres.`;
    }
    if (!required(htmlToPlainText(values.mensaje))) {
      next.mensaje = "El mensaje es obligatorio.";
    }

    setClientErrors(next);
    if (Object.keys(next).length > 0) {
      requestAnimationFrame(() => focusFirstError(formRef.current));
      return;
    }

    onSubmit(values);
  };

  const selectedCount = values.usuariosIds.length;
  const selectedLabel =
    selectedCount === 0
      ? "Selecciona destinatarios…"
      : `${selectedCount} usuario${selectedCount === 1 ? "" : "s"} seleccionado${
          selectedCount === 1 ? "" : "s"
        }`;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      noValidate
      className="flex min-h-0 flex-1 flex-col gap-2"
    >
      <section className="shrink-0 space-y-1.5 rounded-xl border border-border/70 bg-muted/30 p-3">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Users className="size-4 text-primary" aria-hidden="true" />
          Destinatarios
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
          {selectedCount > 0 ? (
            <span className="ml-auto inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
              {selectedCount}
            </span>
          ) : null}
        </div>

        <div ref={containerRef} className="relative">
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            disabled={isLoading}
            aria-haspopup="listbox"
            aria-expanded={open}
            className={`flex w-full items-center justify-between rounded-lg border bg-input-background px-3 py-2.5 text-left text-sm outline-none transition focus:ring-2 focus:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-60 ${
              formError
                ? "border-destructive focus:border-destructive"
                : "border-border focus:border-ring"
            } ${selectedCount === 0 ? "text-muted-foreground" : "text-foreground"}`}
          >
            <span className="truncate">
              {isLoading ? "Cargando usuarios…" : selectedLabel}
            </span>
            <ChevronDown
              className={`size-4 shrink-0 text-muted-foreground transition-transform ${
                open ? "rotate-180" : ""
              }`}
              aria-hidden="true"
            />
          </button>

          {open ? (
            <div
              role="listbox"
              aria-multiselectable="true"
              className="absolute top-full z-10 mt-1 w-full overflow-hidden rounded-lg border border-border bg-card shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3 py-2 text-xs">
                <button
                  type="button"
                  onClick={selectAll}
                  className="font-medium text-primary hover:underline"
                >
                  Seleccionar todos
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="font-medium text-muted-foreground hover:underline"
                >
                  Limpiar
                </button>
              </div>

              <div className="max-h-56 overflow-y-auto p-2">
                {users.length === 0 ? (
                  <p className="px-2 py-1.5 text-sm text-muted-foreground">
                    No hay usuarios disponibles.
                  </p>
                ) : (
                  users.map((u) => (
                    <label
                      key={u.id}
                      className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted"
                    >
                      <input
                        type="checkbox"
                        checked={values.usuariosIds.includes(u.id)}
                        onChange={() => toggleUser(u.id)}
                        className="size-4 shrink-0 rounded border-border text-primary accent-primary focus:ring-2 focus:ring-ring/30"
                      />
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-medium text-primary">
                        {u.nombre.charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 truncate">
                        {u.nombre} {u.apellido ?? ""}
                        <span className="text-muted-foreground"> — {u.correo}</span>
                      </span>
                    </label>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>

        {loadError ? <ErrorAlert error={loadError} /> : null}
        {formError ? (
          <p className="text-xs font-medium text-destructive">{formError}</p>
        ) : null}
      </section>

      <section className="flex min-h-0 flex-1 flex-col gap-2 rounded-xl border border-border/70 bg-muted/30 p-3">
        <div className="shrink-0">
          <TextField
            label="Título"
            name="titulo"
            required
            maxLength={NOTIFICATION_TITULO_MAX_LENGTH}
            value={values.titulo}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, titulo: e.target.value }))
            }
            error={clientErrors.titulo}
            hint={`${values.titulo.length}/${NOTIFICATION_TITULO_MAX_LENGTH}`}
          />
        </div>

        <div className="min-h-0 flex-1">
          <RichTextEditor
            label="Mensaje"
            required
            fill
            initialValue={EMPTY.mensaje}
            onChange={(html) =>
              setValues((prev) => ({ ...prev, mensaje: html }))
            }
            error={clientErrors.mensaje}
            resetSignal={resetSignal}
          />
        </div>
      </section>

      <div className="flex shrink-0 justify-end pt-1">
        <Button
          type="submit"
          loading={submitting}
          disabled={selectedCount === 0}
          className="w-full sm:w-auto"
        >
          Enviar notificaciones
        </Button>
      </div>
    </form>
  );
}
