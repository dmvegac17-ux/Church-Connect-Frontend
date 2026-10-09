import { Ban, Bold, ChevronDown, Highlighter } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

const FONTS: { label: string; value: string }[] = [
  { label: "Predeterminada", value: "" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
];

/** Paleta de resaltado; son colores de contenido, no de interfaz. */
const HIGHLIGHT_COLORS: { label: string; value: string }[] = [
  { label: "Amarillo", value: "#fef08a" },
  { label: "Verde", value: "#bbf7d0" },
  { label: "Rosa", value: "#fbcfe8" },
  { label: "Azul", value: "#bfdbfe" },
];

interface RichTextEditorProps {
  label: string;
  required?: boolean;
  initialValue?: string;
  onChange: (html: string) => void;
  error?: string;
  /** Cambiar este valor limpia el contenido (tras un envío exitoso). */
  resetSignal?: number;
  /**
   * Si es `true`, el editor ocupa toda la altura disponible de su
   * contenedor (que debe ser un `flex` column con altura definida) y solo
   * el propio cuadro de texto hace scroll — nada del formulario alrededor.
   * Si es `false` (default), usa una altura mínima/máxima fija con su
   * propio scroll interno, útil fuera de un layout de altura fija.
   */
  fill?: boolean;
}

/**
 * Editor de texto enriquecido mínimo (negrilla, resaltado, tipo de letra)
 * para el mensaje de una notificación. Usa `contentEditable` +
 * `document.execCommand`: sigue siendo el mecanismo más simple para estas
 * operaciones puntuales sin sumar una librería completa de edición.
 * El HTML resultante se sanitiza en el punto de envío (`sanitizeNotificationHtml`),
 * nunca se confía en él tal cual.
 */
export function RichTextEditor({
  label,
  required,
  initialValue = "",
  onChange,
  error,
  resetSignal,
  fill = false,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isEmpty, setIsEmpty] = useState(!initialValue);
  const [highlightMenuOpen, setHighlightMenuOpen] = useState(false);
  const highlightMenuRef = useRef<HTMLDivElement>(null);
  const autoId = useId();
  const id = `rte-${autoId}`;

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }
    editorRef.current.innerHTML = initialValue;
    setIsEmpty(!initialValue);
    // Solo se re-sincroniza cuando cambia `resetSignal` (o al montar); el
    // contenido en sí lo gobierna el DOM, no un `value` controlado en cada tecla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetSignal]);

  useEffect(() => {
    if (!highlightMenuOpen) {
      return;
    }
    const onPointerDown = (e: MouseEvent) => {
      if (!highlightMenuRef.current?.contains(e.target as Node)) {
        setHighlightMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setHighlightMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [highlightMenuOpen]);

  const emitChange = () => {
    if (!editorRef.current) {
      return;
    }
    setIsEmpty((editorRef.current.textContent ?? "").trim().length === 0);
    onChange(editorRef.current.innerHTML);
  };

  const exec = (command: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, value);
    emitChange();
  };

  const applyHighlight = (color: string) => {
    exec("hiliteColor", color);
    setHighlightMenuOpen(false);
  };

  return (
    <div
      className={
        fill
          ? "flex h-full min-h-0 flex-col gap-1.5"
          : "flex flex-col gap-1.5"
      }
    >
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required ? (
          <span className="ml-0.5 text-destructive" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>

      <div
        className={`overflow-hidden rounded-lg border bg-input-background transition focus-within:ring-2 focus-within:ring-ring/30 ${
          fill ? "flex min-h-0 flex-1 flex-col" : ""
        } ${
          error ? "border-destructive" : "border-border focus-within:border-ring"
        }`}
      >
        <div className="flex shrink-0 flex-wrap items-center gap-1 border-b border-border bg-muted/50 px-2 py-1.5">
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => exec("bold")}
            className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Negrilla"
            title="Negrilla"
          >
            <Bold className="size-4" aria-hidden="true" />
          </button>

          <div ref={highlightMenuRef} className="relative">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setHighlightMenuOpen((v) => !v)}
              aria-haspopup="true"
              aria-expanded={highlightMenuOpen}
              className="flex items-center gap-0.5 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label="Resaltar"
              title="Resaltar"
            >
              <Highlighter className="size-4" aria-hidden="true" />
              <ChevronDown className="size-3" aria-hidden="true" />
            </button>

            {highlightMenuOpen ? (
              <div
                role="menu"
                className="absolute top-full left-0 z-10 mt-1 flex items-center gap-1.5 rounded-lg border border-border bg-card p-1.5 shadow-lg"
              >
                {HIGHLIGHT_COLORS.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => applyHighlight(c.value)}
                    title={c.label}
                    aria-label={`Resaltar en ${c.label}`}
                    className="size-6 shrink-0 rounded-full border border-border/70"
                    style={{ backgroundColor: c.value }}
                  />
                ))}
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyHighlight("transparent")}
                  title="Quitar resaltado"
                  aria-label="Quitar resaltado"
                  className="flex size-6 shrink-0 items-center justify-center rounded-full border border-border/70 text-muted-foreground hover:text-destructive"
                >
                  <Ban className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            ) : null}
          </div>

          <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />
          <select
            onMouseDown={(e) => e.stopPropagation()}
            onChange={(e) => exec("fontName", e.target.value || undefined)}
            defaultValue=""
            className="rounded-md border border-transparent bg-transparent px-1.5 py-1 text-xs text-muted-foreground outline-none hover:bg-muted focus:border-border"
            aria-label="Tipo de letra"
          >
            {FONTS.map((f) => (
              <option key={f.label} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>

        <div className={fill ? "relative min-h-0 flex-1" : "relative"}>
          {isEmpty ? (
            <span className="pointer-events-none absolute left-3 top-2.5 text-sm text-muted-foreground">
              Escribe el mensaje…
            </span>
          ) : null}
          <div
            ref={editorRef}
            id={id}
            contentEditable
            role="textbox"
            aria-multiline="true"
            aria-required={required}
            aria-invalid={error ? true : undefined}
            onInput={emitChange}
            className={
              fill
                ? "h-full overflow-y-auto px-3 py-2.5 text-sm text-foreground outline-none"
                : "min-h-48 max-h-[26rem] overflow-y-auto px-3 py-2.5 text-sm text-foreground outline-none"
            }
          />
        </div>
      </div>

      {error ? <p className="text-xs font-medium text-destructive">{error}</p> : null}
    </div>
  );
}
