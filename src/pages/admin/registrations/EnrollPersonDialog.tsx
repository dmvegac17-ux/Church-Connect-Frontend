import { Ban, Circle, CircleDot } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { Alert } from "../../../components/feedback/ErrorAlert";
import { Spinner } from "../../../components/feedback/Spinner";
import { Button } from "../../../components/forms/Button";
import { TextField } from "../../../components/forms/TextField";
import { Modal } from "../../../components/ui/Overlay";
import { Avatar, SearchInput } from "../../../components/ui/primitives";
import { fullNameOf, matchesPerson } from "../../../lib/people";
import {
  registrationConflict,
  registrationService,
} from "../../../services/registrationService";
import { ApiError } from "../../../types/api";
import type { Event } from "../../../types/event";
import {
  REGISTRATION_NOTE_MAX,
  type Registration,
  type RegistrationConflict,
} from "../../../types/registration";
import type { User } from "../../../types/user";

const CONFLICT_MESSAGES: Record<RegistrationConflict, string> = {
  sin_cupos: "Se agotaron los cupos mientras inscribías a esta persona.",
  ya_inscrito: "Esta persona ya está inscrita en el evento.",
  es_participante: "Esta persona participa en el evento: ya tiene su lugar.",
  inscripciones_cerradas: "Las inscripciones de este evento ya cerraron.",
  cancelacion_cerrada: "El plazo para cancelar esta inscripción ya terminó.",
};

interface EnrollPersonDialogProps {
  open: boolean;
  event: Event;
  /** Cupos libres para público al abrir. */
  available: number;
  users: User[];
  loadingUsers: boolean;
  currentUserId: string;
  /** Quién ya ocupa un lugar: no se puede elegir, y se dice por qué. */
  enrolledIds: ReadonlySet<string>;
  participantIds: ReadonlySet<string>;
  onEnrolled: (registration: Registration, name: string) => void;
  /** El servidor dijo que la situación cambió: hay que recargar. */
  onStale: () => void;
  onClose: () => void;
}

/**
 * «Inscribir persona»: el administrador inscribe a un usuario activo como
 * público, con una nota opcional. Quien ya está inscrito o participa en el
 * evento aparece deshabilitado, con el motivo.
 */
export function EnrollPersonDialog({
  open,
  event,
  available,
  users,
  loadingUsers,
  currentUserId,
  enrolledIds,
  participantIds,
  onEnrolled,
  onStale,
  onClose,
}: EnrollPersonDialogProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(null);
      setNote("");
      setError(null);
    }
  }, [open]);

  const options = useMemo(
    () =>
      users
        .filter((user) => user.activo === true && matchesPerson(user, query))
        // El propio administrador va fijado al inicio.
        .sort(
          (a, b) =>
            Number(b.id === currentUserId) - Number(a.id === currentUserId) ||
            fullNameOf(a).localeCompare(fullNameOf(b), "es"),
        ),
    [users, query, currentUserId],
  );

  const submit = async () => {
    const user = users.find((u) => u.id === selected);
    if (!user || saving) {
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await registrationService.enrollPerson({
        evento_id: event.id,
        usuario_id: user.id,
        nota: note,
      });
      onEnrolled(created, fullNameOf(user));
    } catch (err) {
      const conflict = registrationConflict(err);
      if (conflict) {
        setError(CONFLICT_MESSAGES[conflict]);
        setSelected(null);
        onStale();
      } else {
        setError(
          err instanceof ApiError && err.status !== 0
            ? err.message
            : "No se pudo inscribir a la persona. Revisa tu conexión e inténtalo de nuevo.",
        );
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => !saving && onClose()}
      title="Inscribir persona"
      subtitle={`Quedan ${Math.max(0, available)} cupos para público en «${event.titulo}».`}
      maxWidth="max-w-[520px]"
      toolbar={
        <SearchInput
          label="Buscar usuario"
          placeholder="Nombre o correo"
          value={query}
          onChange={setQuery}
          autoFocus
        />
      }
      footer={
        <div className="flex flex-wrap justify-end gap-2.5">
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={!selected}
            loading={saving}
            loadingLabel="Inscribiendo…"
          >
            Inscribir
          </Button>
        </div>
      }
    >
      <div
        role="listbox"
        aria-label="Usuarios activos"
        className="flex max-h-[300px] flex-col overflow-y-auto"
      >
        {loadingUsers ? (
          <div className="p-6 text-center text-muted-foreground">
            <Spinner label="Cargando usuarios…" />
          </div>
        ) : options.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">
            Nadie coincide con la búsqueda.
          </div>
        ) : (
          options.map((user) => {
            const name = fullNameOf(user);
            const why = participantIds.has(user.id)
              ? "Participa en el evento"
              : enrolledIds.has(user.id)
                ? "Ya está inscrito"
                : "";
            const on = selected === user.id;
            const Icon = why ? Ban : on ? CircleDot : Circle;
            return (
              <button
                key={user.id}
                type="button"
                role="option"
                aria-selected={on}
                aria-disabled={Boolean(why)}
                disabled={Boolean(why)}
                onClick={() => setSelected(user.id)}
                className={`flex items-center gap-3 border-t border-divider-soft px-5 py-2.5 text-left first:border-t-0 ${
                  why ? "cursor-not-allowed" : "cursor-pointer hover:bg-surface-alt"
                } ${on ? "bg-primary-selected" : "bg-card"}`}
              >
                <Icon
                  className={`size-5 shrink-0 ${
                    why
                      ? "text-icon-disabled"
                      : on
                        ? "text-primary"
                        : "text-icon-neutral"
                  }`}
                  aria-hidden="true"
                />
                <Avatar name={name} className="size-8 text-xs" />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span
                    className={`truncate text-[15px] font-bold ${
                      why ? "text-icon-muted" : "text-foreground"
                    }`}
                  >
                    {name}
                    {user.id === currentUserId ? " (Tú)" : ""}
                  </span>
                  <span className="truncate text-[13px] text-muted-foreground">
                    {user.correo}
                  </span>
                </span>
                {why ? (
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-bold text-text-secondary">
                    {why}
                  </span>
                ) : null}
              </button>
            );
          })
        )}
      </div>
      <div className="flex flex-col gap-3 border-t border-divider px-5 py-4">
        <TextField
          label="Nota"
          optional
          name="nota-inscripcion"
          maxLength={REGISTRATION_NOTE_MAX}
          placeholder="Ej. Asistirá con un acompañante"
          value={note}
          disabled={saving}
          onChange={(e) => setNote(e.target.value.slice(0, REGISTRATION_NOTE_MAX))}
        />
        {error ? <Alert variant="error" message={error} /> : null}
      </div>
    </Modal>
  );
}
