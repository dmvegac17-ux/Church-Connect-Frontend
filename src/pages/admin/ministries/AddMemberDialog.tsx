import { Square, SquareCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { Spinner } from "../../../components/feedback/Spinner";
import { useToast } from "../../../components/feedback/useToast";
import { Button } from "../../../components/forms/Button";
import { Modal } from "../../../components/ui/Overlay";
import { Avatar, SearchInput } from "../../../components/ui/primitives";
import { fullNameOf, matchesPerson } from "../../../lib/people";
import { ministryService } from "../../../services/ministryService";
import { ApiError } from "../../../types/api";
import { ROLE_LABELS, type User } from "../../../types/user";

interface AddMemberDialogProps {
  open: boolean;
  ministryId: string;
  ministryName: string;
  /** Todos los usuarios (los carga quien abre el diálogo). */
  users: User[];
  loadingUsers: boolean;
  usersError: unknown;
  /** ids de usuarios que ya pertenecen al ministerio (se ocultan del selector). */
  existingMemberIds: string[];
  onClose: () => void;
  /** Se llama tras asignar (o tras un 409/404 que exige reconciliar). */
  onAdded: () => void;
}

/** Modal para asignar varias personas a un ministerio de una sola vez. */
export function AddMemberDialog({
  open,
  ministryId,
  ministryName,
  users,
  loadingUsers,
  usersError,
  existingMemberIds,
  onClose,
  onAdded,
}: AddMemberDialogProps) {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<unknown>(null);

  useEffect(() => {
    if (open) {
      // Reset al abrir.
      setSearch("");
      setSelected(new Set());
      setSubmitError(null);
    }
  }, [open]);

  const candidates = useMemo(() => {
    const excluded = new Set(existingMemberIds);
    return users.filter((u) => !excluded.has(u.id) && matchesPerson(u, search));
  }, [users, existingMemberIds, search]);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  const handleConfirm = async () => {
    if (selected.size === 0) {
      return;
    }
    setSubmitting(true);
    setSubmitError(null);

    const ids = [...selected];
    const results = await Promise.allSettled(
      ids.map((id) => ministryService.addMember(ministryId, id)),
    );
    setSubmitting(false);

    // Un 409 significa que ya pertenecía: cuenta como asignado.
    const failures = results.filter(
      (r) =>
        r.status === "rejected" &&
        !(r.reason instanceof ApiError && r.reason.status === 409),
    ) as PromiseRejectedResult[];
    const added = ids.length - failures.length;

    onAdded();
    if (failures.length === 0) {
      toast.success(
        added === 1
          ? `1 persona asignada a ${ministryName}.`
          : `${added} personas asignadas a ${ministryName}.`,
      );
      onClose();
      return;
    }
    // Quedan seleccionadas solo las que fallaron, para reintentar.
    setSelected(
      new Set(ids.filter((_, index) => {
        const r = results[index];
        return (
          r.status === "rejected" &&
          !(r.reason instanceof ApiError && r.reason.status === 409)
        );
      })),
    );
    setSubmitError(failures[0].reason);
  };

  const count = selected.size;

  return (
    <Modal
      open={open}
      onClose={() => !submitting && onClose()}
      title="Agregar miembros"
      subtitle={`Elige a quiénes asignar a ${ministryName}.`}
      maxWidth="max-w-[520px]"
      toolbar={
        <SearchInput
          label="Buscar usuarios"
          placeholder="Buscar por nombre o correo"
          value={search}
          onChange={setSearch}
        />
      }
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground" role="status">
            {count === 0
              ? "Ninguna persona seleccionada."
              : `${count} ${count === 1 ? "seleccionada" : "seleccionadas"}.`}
          </p>
          <div className="ml-auto flex gap-2.5">
            <Button variant="secondary" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button
              onClick={handleConfirm}
              loading={submitting}
              loadingLabel="Asignando…"
              disabled={count === 0}
            >
              {count <= 1 ? "Asignar 1 persona" : `Asignar ${count} personas`}
            </Button>
          </div>
        </div>
      }
    >
      {usersError ? (
        <div className="p-5">
          <ErrorAlert error={usersError} />
        </div>
      ) : null}
      {submitError ? (
        <div className="px-5 pt-4">
          <ErrorAlert error={submitError} onClose={() => setSubmitError(null)} />
        </div>
      ) : null}

      {loadingUsers ? (
        <div className="p-8 text-center text-muted-foreground">
          <Spinner label="Cargando usuarios…" />
        </div>
      ) : candidates.length === 0 ? (
        <p className="px-5 py-6 text-center text-sm text-muted-foreground">
          {search
            ? "Ningún usuario coincide con la búsqueda."
            : "No hay usuarios disponibles para asignar."}
        </p>
      ) : (
        <ul className="py-1">
          {candidates.map((u) => {
            const isSelected = selected.has(u.id);
            const name = fullNameOf(u);
            return (
              <li key={u.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={isSelected}
                  onClick={() => toggle(u.id)}
                  className="flex min-h-12 w-full items-center gap-3 px-5 py-2 text-left hover:bg-accent"
                >
                  {isSelected ? (
                    <SquareCheck
                      className="size-[22px] shrink-0 text-primary"
                      aria-hidden="true"
                    />
                  ) : (
                    <Square
                      className="size-[22px] shrink-0 text-icon-muted"
                      aria-hidden="true"
                    />
                  )}
                  <Avatar name={name} className="size-8 text-xs" />
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate text-sm font-bold text-foreground">
                      {name}
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · {ROLE_LABELS[u.rol]}
                      </span>
                    </span>
                    <span className="truncate text-[13px] text-muted-foreground">
                      {u.correo}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}
