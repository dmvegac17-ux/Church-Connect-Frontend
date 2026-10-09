import { UserMinus, UserPlus } from "lucide-react";
import { useMemo, useState } from "react";

import { ConfirmDialog } from "../../../components/feedback/ConfirmDialog";
import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { Spinner } from "../../../components/feedback/Spinner";
import { useToast } from "../../../components/feedback/useToast";
import { Button } from "../../../components/forms/Button";
import { Card } from "../../../components/layout/Page";
import { Avatar, Pager } from "../../../components/ui/primitives";
import { RoleBadge } from "../../../components/users/Badges";
import { useFullList } from "../../../hooks/useFullList";
import { useMinistryMembers } from "../../../hooks/useMinistryMembers";
import { fullNameOf } from "../../../lib/people";
import { ministryService } from "../../../services/ministryService";
import { userService } from "../../../services/userService";
import { ApiError } from "../../../types/api";
import type { MinistryMember } from "../../../types/ministry";
import { AddMemberDialog } from "./AddMemberDialog";

interface MinistryMembersPanelProps {
  ministryId: string;
  ministryName: string;
}

/**
 * Miembros de un ministerio (panel de administración): agregar varios a la
 * vez y quitar con confirmación + "Deshacer".
 */
export function MinistryMembersPanel({
  ministryId,
  ministryName,
}: MinistryMembersPanelProps) {
  const toast = useToast();
  const { members, total, isLoading, error, page, pageCount, pageSize, setPage, refetch } =
    useMinistryMembers(ministryId);
  // El rol no viene en el miembro: se toma del listado de usuarios.
  const users = useFullList(userService.list);
  const rolesById = useMemo(
    () => new Map(users.items.map((u) => [u.id, u.rol])),
    [users.items],
  );

  const [addOpen, setAddOpen] = useState(false);
  const [target, setTarget] = useState<MinistryMember | null>(null);
  const [removing, setRemoving] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);

  const undoRemove = async (member: MinistryMember) => {
    try {
      await ministryService.addMember(ministryId, member.id);
      toast.success(`${fullNameOf(member)} volvió a ${ministryName}.`);
    } catch (err) {
      // 409: alguien ya lo había vuelto a agregar; el resultado es el mismo.
      if (!(err instanceof ApiError && err.status === 409)) {
        setActionError(err);
      }
    } finally {
      refetch();
    }
  };

  const confirmRemove = async () => {
    if (!target) {
      return;
    }
    const member = target;
    setRemoving(true);
    setActionError(null);
    try {
      await ministryService.removeMember(ministryId, member.id);
      toast.notify({
        variant: "success",
        message: `${fullNameOf(member)} ya no está en ${ministryName}.`,
        actionLabel: "Deshacer",
        onAction: () => void undoRemove(member),
      });
      refetch();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // El usuario ya no pertenece al ministerio: reconciliamos.
        refetch();
      } else {
        setActionError(err);
      }
    } finally {
      setTarget(null);
      setRemoving(false);
    }
  };

  return (
    <Card as="section" className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-divider py-3.5 pr-4 pl-5">
        <h2 className="text-[17px] font-extrabold">
          Miembros{" "}
          <span className="text-[15px] font-semibold text-muted-foreground">
            · {total}
          </span>
        </h2>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <UserPlus className="size-[19px]" aria-hidden="true" />
          Agregar miembros
        </Button>
      </div>

      {error ? (
        <div className="p-4">
          <ErrorAlert error={error} />
        </div>
      ) : null}
      {actionError ? (
        <div className="p-4">
          <ErrorAlert error={actionError} onClose={() => setActionError(null)} />
        </div>
      ) : null}

      {isLoading && members.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground">
          <Spinner label="Cargando miembros…" />
        </div>
      ) : members.length === 0 ? (
        <p className="px-5 py-8 text-center text-[15px] text-muted-foreground">
          Este ministerio todavía no tiene miembros.
        </p>
      ) : (
        <ul>
          {members.map((m) => {
            const name = fullNameOf(m);
            const role = rolesById.get(m.id);
            return (
              <li
                key={m.id}
                className="flex flex-wrap items-center gap-3 border-t border-divider-soft py-2.5 pr-4 pl-5 first:border-t-0"
              >
                <Avatar name={name} />
                <span className="flex min-w-[180px] flex-1 flex-col">
                  <span className="text-[15px] font-extrabold break-words">
                    {name}
                  </span>
                  <span className="text-[13px] break-all text-muted-foreground">
                    {m.correo}
                  </span>
                </span>
                {role ? <RoleBadge role={role} /> : null}
                <button
                  type="button"
                  onClick={() => setTarget(m)}
                  aria-label={`Quitar a ${name} de ${ministryName}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-[9px] px-2.5 text-sm font-bold text-text-secondary transition-colors hover:bg-destructive-soft hover:text-destructive max-md:h-11"
                >
                  <UserMinus className="size-[18px]" aria-hidden="true" />
                  Quitar
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <Pager
        page={page}
        pageCount={pageCount}
        total={total}
        pageSize={pageSize}
        onChange={setPage}
        disabled={isLoading}
        noun="miembros"
      />

      <AddMemberDialog
        open={addOpen}
        ministryId={ministryId}
        ministryName={ministryName}
        users={users.items}
        loadingUsers={users.isLoading}
        usersError={users.error}
        existingMemberIds={members.map((m) => m.id)}
        onClose={() => setAddOpen(false)}
        onAdded={refetch}
      />

      <ConfirmDialog
        open={target !== null}
        danger
        title={
          target ? `¿Quitar a ${fullNameOf(target)} de ${ministryName}?` : ""
        }
        description="Dejará de aparecer entre los miembros de este ministerio. Su cuenta no se elimina."
        confirmLabel="Quitar"
        loadingLabel="Quitando…"
        loading={removing}
        onConfirm={confirmRemove}
        onCancel={() => setTarget(null)}
      />
    </Card>
  );
}
