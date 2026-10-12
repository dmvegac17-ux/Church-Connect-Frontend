import { ImagePlus, RefreshCw, Trash2 } from "lucide-react";
import { useEffect, useId, useRef, useState, type DragEvent } from "react";

import { Button } from "../../../components/forms/Button";
import { FieldError, HINT_CLASS, LABEL_CLASS } from "../../../components/forms/fieldStyles";
import { formatBytes, imageError } from "../../../lib/announcements";
import { ANNOUNCEMENT_IMAGE_TYPES } from "../../../types/announcement";

interface ImagePickerProps {
  /** Imagen ya guardada (al editar), si se conserva. */
  currentUrl: string | null;
  /** Archivo nuevo elegido. */
  file: File | null;
  onFileChange: (file: File | null) => void;
  /** Quitar la imagen guardada. */
  onRemoveCurrent: () => void;
  /** Error del servidor sobre la imagen. */
  error?: string;
  disabled?: boolean;
}

/**
 * Imagen del anuncio: elegir o arrastrar, vista previa, reemplazar o quitar.
 * El tipo y el tamaño se revisan antes de enviar; el servidor los vuelve a
 * validar con el contenido real del archivo.
 */
export function ImagePicker({
  currentUrl,
  file,
  onFileChange,
  onRemoveCurrent,
  error,
  disabled = false,
}: ImagePickerProps) {
  const id = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  // La vista previa del archivo local se libera al cambiarlo.
  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const pick = (candidate: File | undefined) => {
    if (!candidate) {
      return;
    }
    const message = imageError(candidate);
    setLocalError(message);
    if (!message) {
      onFileChange(candidate);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (!disabled) {
      pick(e.dataTransfer.files[0]);
    }
  };

  const shown = preview ?? currentUrl;
  const message = localError ?? error;

  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className={LABEL_CLASS}>
        Imagen <span className="font-normal text-muted-foreground">(opcional)</span>
      </span>

      <input
        ref={inputRef}
        id={`${id}-input`}
        type="file"
        accept={ANNOUNCEMENT_IMAGE_TYPES.join(",")}
        className="sr-only"
        tabIndex={-1}
        aria-labelledby={`${id}-label`}
        disabled={disabled}
        onChange={(e) => {
          pick(e.target.files?.[0]);
          // Permite volver a elegir el mismo archivo tras un error.
          e.target.value = "";
        }}
      />

      {shown ? (
        <div className="flex flex-col gap-2.5 rounded-xl border border-border bg-surface-alt p-3">
          <img
            src={shown}
            alt="Vista previa de la imagen del anuncio"
            className="max-h-[220px] w-full rounded-lg bg-muted object-contain"
          />
          {file ? (
            <p className="text-[13px] break-all text-muted-foreground">
              {file.name} · {formatBytes(file.size)}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={disabled}
              onClick={() => inputRef.current?.click()}
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Reemplazar imagen
            </Button>
            <Button
              variant="dangerOutline"
              size="sm"
              disabled={disabled}
              onClick={() => {
                setLocalError(null);
                if (file) {
                  onFileChange(null);
                } else {
                  onRemoveCurrent();
                }
              }}
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {file && currentUrl ? "Descartar la nueva" : "Quitar imagen"}
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) {
              setDragging(true);
            }
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors ${
            dragging ? "border-primary bg-primary-selected" : "border-button-border bg-card"
          }`}
        >
          <ImagePlus className="size-8 text-primary" aria-hidden="true" />
          <Button
            variant="secondary"
            size="sm"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
          >
            Elegir imagen
          </Button>
          <p className="text-[13px] text-muted-foreground">o arrástrala aquí</p>
        </div>
      )}

      {message ? (
        <FieldError>{message}</FieldError>
      ) : (
        <p className={HINT_CLASS}>JPG, PNG o WebP. Máximo 5 MB.</p>
      )}
    </div>
  );
}
