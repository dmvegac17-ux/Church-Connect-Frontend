import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { ConfirmDialog } from "../../components/feedback/ConfirmDialog";
import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { Spinner } from "../../components/feedback/Spinner";
import { useToast } from "../../components/feedback/useToast";
import { Button } from "../../components/forms/Button";
import { TextField } from "../../components/forms/TextField";
import { Card, PageHeader } from "../../components/layout/Page";
import { ActiveBadge, RoleBadge } from "../../components/users/Badges";
import { useUsers } from "../../hooks/useUsers";
import { formatDate } from "../../lib/format";
import { userService } from "../../services/userService";
import { ApiError } from "../../types/api";
import type { User } from "../../types/user";

export function UsersListPage() {
  const { user: currentUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const {
    users,
    total,
    isLoading,
    error,
    page,
    pageCount,
    pageSize,
    setPage,
    refetch,
  } = useUsers();

  const [search, setSearch] = useState("");
  const [target, setTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return users;
    }
    return users.filter(
      (u) =>
        u.nombre.toLowerCase().includes(q) ||
        (u.apellido ?? "").toLowerCase().includes(q) ||
        u.correo.toLowerCase().includes(q),
    );
  }, [users, search]);

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  const confirmDelete = async () => {
    if (!target) {
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await userService.remove(target.id);
      toast.success(
        "El usuario fue eliminado correctamente.",
        "Usuario eliminado",
      );
      setTarget(null);
      refetch();
    } catch (err) {
      setDeleteError(err);
      if (err instanceof ApiError && err.status === 404) {
        // ya no existe: refrescamos igual
        refetch();
        setTarget(null);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description={`${total} usuario${total === 1 ? "" : "s"} registrado${total === 1 ? "" : "s"}.`}
        actions={
          <Button onClick={() => navigate("/users/new")}>
            <Plus className="size-4" aria-hidden="true" />
            Nuevo usuario
          </Button>
        }
      />

      {error ? (
        <div className="mb-4">
          <ErrorAlert error={error} />
        </div>
      ) : null}

      {deleteError ? (
        <div className="mb-4">
          <ErrorAlert error={deleteError} onClose={() => setDeleteError(null)} />
        </div>
      ) : null}

      <Card className="!p-0">
        <div className="border-b border-border p-4">
          <TextField
            label="Buscar"
            name="buscar"
            placeholder="Nombre o correo (en esta página)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Nombre</th>
                <th className="px-4 py-3 font-medium">Correo</th>
                <th className="px-4 py-3 font-medium">Rol</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Creado</th>
                <th className="px-4 py-3 text-right font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    <Spinner label="Cargando usuarios…" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    {search
                      ? "Ningún usuario coincide con la búsqueda."
                      : "No hay usuarios para mostrar."}
                  </td>
                </tr>
              ) : (
                filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3 font-medium text-foreground">
                      <Link
                        to={`/users/${u.id}`}
                        className="hover:text-primary hover:underline"
                      >
                        {u.nombre} {u.apellido ?? ""}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {u.correo}
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.rol} />
                    </td>
                    <td className="px-4 py-3">
                      <ActiveBadge active={u.activo} />
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {formatDate(u.fecha_creacion)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Link
                          to={`/users/${u.id}/edit`}
                          className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
                          aria-label={`Editar ${u.nombre}`}
                        >
                          <Pencil className="size-4" aria-hidden="true" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => setTarget(u)}
                          disabled={u.id === currentUser?.id}
                          title={
                            u.id === currentUser?.id
                              ? "No puedes eliminar tu propia cuenta"
                              : "Eliminar"
                          }
                          className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:cursor-not-allowed disabled:opacity-40"
                          aria-label={`Eliminar ${u.nombre}`}
                        >
                          <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
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
      </Card>

      <ConfirmDialog
        open={target !== null}
        danger
        title="Eliminar usuario"
        description={
          target
            ? `¿Seguro que quieres eliminar a ${target.nombre} ${target.apellido ?? ""}? Esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}
