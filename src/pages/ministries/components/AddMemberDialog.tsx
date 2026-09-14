import { AnimatePresence, motion } from "framer-motion";
import { Check, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { Spinner } from "../../../components/feedback/Spinner";
import { useToast } from "../../../components/feedback/useToast";
import { Button } from "../../../components/forms/Button";
import { TextField } from "../../../components/forms/TextField";
import { ministryService } from "../../../services/ministryService";
import { userService } from "../../../services/userService";
import { ApiError } from "../../../types/api";
import type { User } from "../../../types/user";

interface AddMemberDialogProps {
  open: boolean;
  ministryId: string;
  /** ids de usuarios que ya pertenecen al ministerio (se ocultan del selector). */
  existingMemberIds: string[];
  onClose: () => void;
  /** Se llama tras asignar (o tras un 409/404 que exige reconciliar). */
  onAdded: () => void;
}

/** Cuántos usuarios se traen para elegir. El filtro es en cliente sobre esta página. */
const USER_FETCH_LIMIT = 100;

export function AddMemberDialog({
  open,
  ministryId,
  existingMemberIds,
  onClose,
  onAdded,
}: AddMemberDialogProps) {
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    // Reset al abrir.
    setSearch("");
    setSelectedId(null);
    setSubmitError(null);

    const controller = new AbortController();
    setLoadingUsers(true);
    setLoadError(null);

    userService
      .list({ limit: USER_FETCH_LIMIT, offset: 0, signal: controller.signal })
      .then((result) => {
        setUsers(result.items);
        setLoadingUsers(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setLoadError(err);
        setLoadingUsers(false);
      });

    return () => controller.abort();
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, submitting, onClose]);

  const candidates = useMemo(() => {
    const excluded = new Set(existingMemberIds);
    const q = search.trim().toLowerCase();
    return users
      .filter((u) => !excluded.has(u.id))
      .filter((u) => {
        if (!q) {
          return true;
        }
        return (
          u.nombre.toLowerCase().includes(q) ||
          (u.apellido ?? "").toLowerCase().includes(q) ||
          u.correo.toLowerCase().includes(q)
        );
      });
  }, [users, existingMemberIds, search]);

  const handleConfirm = async () => {
    if (!selectedId) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      await ministryService.addMember(ministryId, selectedId);
      toast.success(
        "El usuario fue asignado al ministerio.",
        "Miembro agregado",
      );
      onAdded();
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        // No es bloqueante: ya pertenece. Reconciliamos la lista.
        toast.info(err.message, "Sin cambios");
        onAdded();
        onClose();
        return;
      }
      if (err instanceof ApiError && err.status === 404) {
        // Usuario o ministerio ya no existen: refrescamos ambos.
        toast.error(err.message, "No encontrado");
        onAdded();
        onClose();
        return;
      }
      setSubmitError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !submitting && onClose()}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-member-title"
            className="flex w-full max-w-md flex-col rounded-xl border border-border bg-card p-6 shadow-xl"
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              id="add-member-title"
              className="text-lg font-medium text-foreground"
            >
              Agregar miembro
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Elige un usuario para asignarlo a este ministerio.
            </p>

            <div className="mt-4">
              <TextField
                label="Buscar usuario"
                name="buscar-usuario"
                placeholder="Nombre o correo"
                icon={<Search className="size-4" aria-hidden="true" />}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {loadError ? (
              <div className="mt-4">
                <ErrorAlert error={loadError} />
              </div>
            ) : null}

            {submitError ? (
              <div className="mt-4">
                <ErrorAlert
                  error={submitError}
                  onClose={() => setSubmitError(null)}
                />
              </div>
            ) : null}

            <div className="mt-3 max-h-64 overflow-y-auto rounded-lg border border-border">
              {loadingUsers ? (
                <div className="p-6 text-center text-sm text-muted-foreground">
                  <Spinner label="Cargando usuarios…" />
                </div>
              ) : candidates.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  {search
                    ? "Ningún usuario coincide con la búsqueda."
                    : "No hay usuarios disponibles para asignar."}
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {candidates.map((u) => {
                    const selected = u.id === selectedId;
                    return (
                      <li key={u.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(u.id)}
                          aria-pressed={selected}
                          className={`flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm transition hover:bg-muted ${
                            selected ? "bg-primary/10" : ""
                          }`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate font-medium text-foreground">
                              {u.nombre} {u.apellido ?? ""}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {u.correo}
                            </span>
                          </span>
                          {selected ? (
                            <Check
                              className="size-4 shrink-0 text-primary"
                              aria-hidden="true"
                            />
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="secondary"
                onClick={onClose}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirm}
                loading={submitting}
                disabled={!selectedId}
              >
                Asignar
              </Button>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
