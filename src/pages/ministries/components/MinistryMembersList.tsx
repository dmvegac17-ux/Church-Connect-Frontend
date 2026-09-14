import { ChevronLeft, ChevronRight, Plus, UserMinus } from "lucide-react";
import { useState } from "react";

import { ConfirmDialog } from "../../../components/feedback/ConfirmDialog";
import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { Spinner } from "../../../components/feedback/Spinner";
import { useToast } from "../../../components/feedback/useToast";
import { Button } from "../../../components/forms/Button";
import { useMinistryMembers } from "../../../hooks/useMinistryMembers";
import { ministryService } from "../../../services/ministryService";
import { ApiError } from "../../../types/api";
import type { MinistryMember } from "../../../types/ministry";
import { AddMemberDialog } from "./AddMemberDialog";

interface MinistryMembersListProps {
  ministryId: string;
  canManage: boolean;
}

export function MinistryMembersList({
  ministryId,
  canManage,
}: MinistryMembersListProps) {
  const toast = useToast();
  const {
    members,
    total,
    isLoading,
    error,
    page,
    pageCount,
    pageSize,
    setPage,
    refetch,
  } = useMinistryMembers(ministryId);

  const [addOpen, setAddOpen] = useState(false);
  const [target, setTarget] = useState<MinistryMember | null>(null);
  const [removing, setRemoving] = useState(false);
  const [removeError, setRemoveError] = useState<unknown>(null);

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);
  const colSpan = canManage ? 3 : 2;

  const confirmRemove = async () => {
    if (!target) {
      return;
    }
    setRemoving(true);
    setRemoveError(null);
    try {
      await ministryService.removeMember(ministryId, target.id);
      toast.success(
        "El usuario fue removido del ministerio.",
        "Miembro removido",
      );
      setTarget(null);
      refetch();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // El usuario ya no pertenece al ministerio: reconciliamos.
        toast.info(err.message, "Sin cambios");
        setTarget(null);
        refetch();
      } else {
        setRemoveError(err);
      }
    } finally {
      setRemoving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <h2 className="text-base font-medium text-foreground">
          Miembros{" "}
          <span className="text-sm font-normal text-muted-foreground">
            ({total})
          </span>
        </h2>
        {canManage ? (
          <Button onClick={() => setAddOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            Agregar miembro
          </Button>
        ) : null}
      </div>

      {error ? (
        <div className="p-4">
          <ErrorAlert error={error} />
        </div>
      ) : null}

      {removeError ? (
        <div className="p-4">
          <ErrorAlert error={removeError} onClose={() => setRemoveError(null)} />
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Nombre</th>
              <th className="px-4 py-3 font-medium">Correo</th>
              {canManage ? (
                <th className="px-4 py-3 text-right font-medium">Acciones</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {isLoading ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  <Spinner label="Cargando miembros…" />
                </td>
              </tr>
            ) : members.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  Este ministerio todavía no tiene miembros.
                </td>
              </tr>
            ) : (
              members.map((m) => (
                <tr key={m.id} className="hover:bg-muted/50">
                  <td className="px-4 py-3 font-medium text-foreground">
                    {m.nombre} {m.apellido ?? ""}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{m.correo}</td>
                  {canManage ? (
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setTarget(m)}
                          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Quitar a ${m.nombre} del ministerio`}
                        >
                          <UserMinus className="size-4" aria-hidden="true" />
                          Quitar
                        </button>
                      </div>
                    </td>
                  ) : null}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border p-4 text-sm text-muted-foreground">
        <span>
          {rangeStart}–{rangeEnd} de {total}
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage(page - 1)}
            disabled={page <= 1 || isLoading}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:bg-muted disabled:opacity-40"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
            Anterior
          </button>
          <span>
            Página {page} de {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage(page + 1)}
            disabled={page >= pageCount || isLoading}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:bg-muted disabled:opacity-40"
          >
            Siguiente
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {canManage ? (
        <AddMemberDialog
          open={addOpen}
          ministryId={ministryId}
          existingMemberIds={members.map((m) => m.id)}
          onClose={() => setAddOpen(false)}
          onAdded={refetch}
        />
      ) : null}

      <ConfirmDialog
        open={target !== null}
        danger
        title="Quitar miembro"
        description={
          target
            ? `¿Quitar a ${target.nombre} ${target.apellido ?? ""} de este ministerio?`
            : ""
        }
        confirmLabel="Quitar"
        loading={removing}
        onConfirm={confirmRemove}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}
