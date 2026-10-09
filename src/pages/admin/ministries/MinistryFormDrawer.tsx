import { useEffect, useId, useState, type FormEvent } from "react";

import { ConfirmDialog } from "../../../components/feedback/ConfirmDialog";
import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { useToast } from "../../../components/feedback/useToast";
import { Button } from "../../../components/forms/Button";
import { TextArea } from "../../../components/forms/TextArea";
import { TextField } from "../../../components/forms/TextField";
import { FormStatus } from "../../../components/ui/FormStatus";
import { Drawer } from "../../../components/ui/Overlay";
import { useTouched } from "../../../hooks/useTouched";
import { parseValidationErrors } from "../../../lib/formErrors";
import { ministryService } from "../../../services/ministryService";
import { ApiError } from "../../../types/api";
import {
  MINISTRY_NAME_MAX,
  type CreateMinistryDTO,
  type Ministry,
  type UpdateMinistryDTO,
} from "../../../types/ministry";

const DESCRIPCION_MAX = 255;

interface MinistryFormDrawerProps {
  open: boolean;
  /** `null` = crear; un ministerio = editar. */
  ministry: Ministry | null;
  onClose: () => void;
  onSaved: (saved: Ministry) => void;
}

/** Panel lateral para crear o editar un ministerio. */
export function MinistryFormDrawer({
  open,
  ministry,
  onClose,
  onSaved,
}: MinistryFormDrawerProps) {
  const toast = useToast();
  const formId = useId();
  const isEdit = ministry !== null;
  const [nombre, setNombre] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const fields = useTouched<"nombre">();
  const { reset } = fields;

  const initialNombre = ministry?.nombre ?? "";
  const initialDescripcion = ministry?.descripcion ?? "";

  useEffect(() => {
    if (!open) {
      return;
    }
    setNombre(initialNombre);
    setDescripcion(initialDescripcion);
    setServerErrors({});
    setError(null);
    setConfirmDiscard(false);
    reset();
  }, [open, initialNombre, initialDescripcion, reset]);

  const errors = {
    nombre: nombre.trim()
      ? serverErrors.nombre
      : "Ingresa el nombre.",
  };
  const errorCount = errors.nombre ? 1 : 0;
  const dirty =
    nombre.trim() !== initialNombre.trim() ||
    descripcion.trim() !== initialDescripcion.trim();
  const canSubmit = errorCount === 0 && (dirty || !isEdit);

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
    setError(null);
    fields.setSubmitted(true);
    if (!canSubmit) {
      return;
    }

    const trimmedNombre = nombre.trim();
    const trimmedDescripcion = descripcion.trim();

    setSubmitting(true);
    try {
      let saved: Ministry;
      if (ministry) {
        const payload: UpdateMinistryDTO = {};
        if (trimmedNombre !== ministry.nombre) {
          payload.nombre = trimmedNombre;
        }
        // `descripcion` vaciada => null (la limpia); si cambió => nuevo texto.
        const nextDescripcion = trimmedDescripcion === "" ? null : trimmedDescripcion;
        if (nextDescripcion !== (ministry.descripcion ?? null)) {
          payload.descripcion = nextDescripcion;
        }
        saved = await ministryService.update(ministry.id, payload);
        toast.success(`Los cambios de «${saved.nombre}» se guardaron.`);
      } else {
        const payload: CreateMinistryDTO = {
          nombre: trimmedNombre,
          ...(trimmedDescripcion ? { descripcion: trimmedDescripcion } : {}),
        };
        saved = await ministryService.create(payload);
        toast.success(`Ministerio «${saved.nombre}» creado.`);
      }
      onSaved(saved);
    } catch (err) {
      if (err instanceof ApiError && err.isValidation) {
        setServerErrors(parseValidationErrors(err).fieldErrors);
      } else if (err instanceof ApiError && err.status === 409) {
        setServerErrors({ nombre: err.message });
      }
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Drawer
        open={open}
        title={isEdit ? "Editar ministerio" : "Nuevo ministerio"}
        onClose={requestClose}
        footer={
          <div className="flex flex-col gap-3">
            <FormStatus
              saving={submitting}
              submitted={fields.submitted}
              errorCount={errorCount}
              dirty={dirty}
            />
            <div className="flex justify-end gap-2.5">
              <Button
                variant="secondary"
                onClick={requestClose}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form={formId}
                loading={submitting}
                loadingLabel="Guardando…"
                disabled={!canSubmit}
              >
                {isEdit ? "Guardar cambios" : "Crear ministerio"}
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
          {error ? (
            <ErrorAlert error={error} onClose={() => setError(null)} />
          ) : null}
          <TextField
            label="Nombre"
            name="nombre"
            required
            maxLength={MINISTRY_NAME_MAX}
            value={nombre}
            onChange={(e) => {
              setNombre(e.target.value);
              setServerErrors({});
            }}
            onBlur={() => fields.touch("nombre")}
            error={
              isEdit && nombre.trim() !== initialNombre.trim()
                ? errors.nombre
                : fields.visible(errors, "nombre")
            }
          />
          <TextArea
            label="Descripción"
            optional
            name="descripcion"
            rows={5}
            maxLength={DESCRIPCION_MAX}
            value={descripcion}
            onChange={(e) => setDescripcion(e.target.value)}
            error={serverErrors.descripcion}
            hint="Cuéntales a los miembros a qué se dedica este ministerio."
          />
        </form>
      </Drawer>

      <ConfirmDialog
        open={confirmDiscard}
        danger
        title="¿Descartar los cambios?"
        description="Los cambios que hiciste en este ministerio no se guardarán."
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
