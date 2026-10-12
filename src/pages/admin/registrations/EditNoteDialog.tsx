import { useEffect, useState } from "react";

import { Alert } from "../../../components/feedback/ErrorAlert";
import { Button } from "../../../components/forms/Button";
import { TextArea } from "../../../components/forms/TextArea";
import { Modal } from "../../../components/ui/Overlay";
import { registrationService } from "../../../services/registrationService";
import { ApiError } from "../../../types/api";
import {
  REGISTRATION_NOTE_MAX,
  type Registration,
} from "../../../types/registration";

interface EditNoteDialogProps {
  /** Inscripción a editar; `null` cierra el diálogo. */
  registration: Registration | null;
  name: string;
  onSaved: (registration: Registration) => void;
  onClose: () => void;
}

/** «Editar inscripción»: lo único editable de una inscripción es su nota. */
export function EditNoteDialog({
  registration,
  name,
  onSaved,
  onClose,
}: EditNoteDialogProps) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (registration) {
      setNote(registration.nota ?? "");
      setError(null);
    }
  }, [registration]);

  const submit = async () => {
    if (!registration || saving) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      onSaved(await registrationService.updateNote(registration.id, note));
    } catch (err) {
      setError(
        err instanceof ApiError && err.status !== 0
          ? err.message
          : "No se pudo guardar la nota. Revisa tu conexión e inténtalo de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={registration !== null}
      onClose={() => !saving && onClose()}
      title="Editar inscripción"
      subtitle={name}
      maxWidth="max-w-[460px]"
      footer={
        <div className="flex flex-wrap justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => void submit()} loading={saving} loadingLabel="Guardando…">
            Guardar nota
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-3 px-5 py-4">
        <TextArea
          label="Nota"
          optional
          name="nota-inscripcion-editar"
          rows={3}
          autoFocus
          maxLength={REGISTRATION_NOTE_MAX}
          value={note}
          disabled={saving}
          onChange={(e) => setNote(e.target.value.slice(0, REGISTRATION_NOTE_MAX))}
        />
        {error ? <Alert variant="error" message={error} /> : null}
      </div>
    </Modal>
  );
}
