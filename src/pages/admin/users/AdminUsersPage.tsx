import { Pencil, Trash2, UserPlus, UserSearch } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import { useAuth } from "../../../auth/useAuth";
import { ConfirmDialog } from "../../../components/feedback/ConfirmDialog";
import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { Spinner } from "../../../components/feedback/Spinner";
import { useToast } from "../../../components/feedback/useToast";
import { Button, buttonClass } from "../../../components/forms/Button";
import { controlClass } from "../../../components/forms/fieldStyles";
import { Card, PageHeader } from "../../../components/layout/Page";
import {
  Avatar,
  EmptyState,
  IconButton,
  IconLink,
  Pager,
  SearchInput,
  TD_CLASS,
  TH_CLASS,
  TR_CLASS,
} from "../../../components/ui/primitives";
import { ActiveBadge, RoleBadge } from "../../../components/users/Badges";
import { useFullList } from "../../../hooks/useFullList";
import { useUser } from "../../../hooks/useUser";
import { formatDate } from "../../../lib/format";
import { fullNameOf, matchesPerson } from "../../../lib/people";
import { userService } from "../../../services/userService";
import { ApiError } from "../../../types/api";
import {
  ROLE_LABELS,
  USER_ROLES,
  type User,
  type UserRole,
} from "../../../types/user";
import { UserFormDrawer } from "./UserFormDrawer";

const PAGE_SIZE = 8;
type RoleFilter = UserRole | "all";
type StatusFilter = "all" | "active" | "inactive";

const FILTER_LABEL = "text-[13px] font-bold text-text-secondary";

/**
 * Usuarios (panel de administración). La búsqueda y los filtros actúan
 * sobre TODOS los usuarios. Crear y editar abren el panel lateral y
 * conservan sus rutas (`/users/new`, `/users/:id/edit`).
 */
export function AdminUsersPage({ mode }: { mode?: "create" | "edit" }) {
  const { user: currentUser, refreshProfile } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { items, isLoading, error, refetch } = useFullList(userService.list);

  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    searchParams.get("estado") === "inactivo" ? "inactive" : "all",
  );
  const [page, setPage] = useState(1);

  const [target, setTarget] = useState<User | null>(null);
  const [working, setWorking] = useState(false);
  const [actionError, setActionError] = useState<unknown>(null);

  // Usuario a editar: del listado ya cargado o, si se entra directo por URL, del servidor.
  const fromList =
    mode === "edit" ? (items.find((u) => u.id === editId) ?? null) : null;
  const fetched = useUser(mode === "edit" && !fromList ? editId : undefined);
  const editing = fromList ?? fetched.user;
  // Se congela mientras el panel está abierto para que un refresco del
  // listado no reinicie lo que se está escribiendo.
  const [drawerUser, setDrawerUser] = useState<User | null>(null);
  useEffect(() => {
    if (mode !== "edit") {
      setDrawerUser(null);
    } else if (editing && drawerUser?.id !== editing.id) {
      setDrawerUser(editing);
    }
  }, [mode, editing, drawerUser]);

  const filtered = useMemo(
    () =>
      items.filter(
        (u) =>
          matchesPerson(u, query) &&
          (roleFilter === "all" || u.rol === roleFilter) &&
          (statusFilter === "all" ||
            (statusFilter === "active" ? u.activo !== false : u.activo === false)),
      ),
    [items, query, roleFilter, statusFilter],
  );
  const isFiltered =
    query.trim() !== "" || roleFilter !== "all" || statusFilter !== "all";
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setPage(1);
  }, [query, roleFilter, statusFilter]);

  const clearFilters = () => {
    setQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
  };

  const closeDrawer = () => navigate("/users");

  const handleSaved = async (saved: User) => {
    refetch();
    if (saved.id === currentUser?.id) {
      await refreshProfile();
    }
    closeDrawer();
  };

  const confirmDelete = async () => {
    if (!target) {
      return;
    }
    setWorking(true);
    setActionError(null);
    try {
      await userService.remove(target.id);
      toast.success(`${fullNameOf(target)} fue eliminado.`);
      setTarget(null);
      refetch();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        // Ya no existe: refrescamos igual.
        refetch();
      } else {
        setActionError(err);
      }
      setTarget(null);
    } finally {
      setWorking(false);
    }
  };

  const deactivateInstead = async () => {
    if (!target) {
      return;
    }
    setWorking(true);
    setActionError(null);
    try {
      await userService.update(target.id, { activo: false });
      toast.success(`${fullNameOf(target)} quedó inactivo.`);
      refetch();
    } catch (err) {
      setActionError(err);
    } finally {
      setTarget(null);
      setWorking(false);
    }
  };

  const total = items.length;

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Usuarios"
        description={`Administra las cuentas, roles y estados.${
          isLoading ? "" : ` ${total} ${total === 1 ? "usuario" : "usuarios"}.`
        }`}
        actions={
          <Link to="/users/new" className={buttonClass("primary")}>
            <UserPlus className="size-5" aria-hidden="true" />
            Nuevo usuario
          </Link>
        }
      />

      {error ? <ErrorAlert error={error} /> : null}
      {actionError ? (
        <ErrorAlert error={actionError} onClose={() => setActionError(null)} />
      ) : null}
      {mode === "edit" && fetched.error ? (
        <ErrorAlert error={fetched.error} />
      ) : null}

      <Card as="section" className="overflow-hidden">
        <div className="flex flex-wrap items-end gap-3 border-b border-divider p-4">
          <SearchInput
            label="Buscar usuarios"
            placeholder="Buscar por nombre o correo"
            value={query}
            onChange={setQuery}
            className="min-w-[220px] flex-1"
          />
          <label className="flex min-w-[160px] flex-col gap-1">
            <span className={FILTER_LABEL}>Rol</span>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
              className={controlClass(false, "h-[var(--control-h)] px-2.5")}
            >
              <option value="all">Todos los roles</option>
              {USER_ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </label>
          <label className="flex min-w-[150px] flex-col gap-1">
            <span className={FILTER_LABEL}>Estado</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className={controlClass(false, "h-[var(--control-h)] px-2.5")}
            >
              <option value="all">Todos</option>
              <option value="active">Activos</option>
              <option value="inactive">Inactivos</option>
            </select>
          </label>
          {isFiltered ? (
            <button
              type="button"
              onClick={clearFilters}
              className="h-[var(--control-h)] rounded-lg px-2.5 text-sm font-bold text-primary hover:underline"
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>

        {isLoading ? (
          <div className="p-10 text-center text-muted-foreground">
            <Spinner label="Cargando usuarios…" />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={UserSearch}
            title={
              isFiltered
                ? "Ningún usuario coincide con los filtros"
                : "Todavía no hay usuarios"
            }
            action={
              isFiltered ? (
                <Button variant="secondary" size="sm" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-sm">
              <thead>
                <tr className="bg-surface-alt">
                  <th scope="col" className={TH_CLASS}>
                    Usuario
                  </th>
                  <th scope="col" className={TH_CLASS}>
                    Rol
                  </th>
                  <th scope="col" className={TH_CLASS}>
                    Estado
                  </th>
                  <th scope="col" className={TH_CLASS}>
                    Creado
                  </th>
                  <th scope="col" className={`${TH_CLASS} !text-right`}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const name = fullNameOf(u);
                  const isMe = u.id === currentUser?.id;
                  return (
                    <tr key={u.id} className={TR_CLASS}>
                      <td className={TD_CLASS}>
                        <div className="flex items-center gap-3">
                          <Avatar name={name} />
                          <span className="flex min-w-0 flex-col">
                            <span className="flex items-center gap-1.5 font-extrabold">
                              <Link
                                to={`/users/${u.id}`}
                                className="text-foreground hover:text-primary hover:underline"
                              >
                                {name}
                              </Link>
                              {isMe ? (
                                <span className="text-xs font-bold text-muted-foreground">
                                  (tú)
                                </span>
                              ) : null}
                            </span>
                            <span className="text-[13px] text-muted-foreground">
                              {u.correo}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className={TD_CLASS}>
                        <RoleBadge role={u.rol} />
                      </td>
                      <td className={TD_CLASS}>
                        <ActiveBadge active={u.activo} />
                      </td>
                      <td
                        className={`${TD_CLASS} whitespace-nowrap text-text-secondary`}
                      >
                        {formatDate(u.fecha_creacion)}
                      </td>
                      <td className={TD_CLASS}>
                        <div className="flex justify-end gap-1">
                          <IconLink
                            icon={Pencil}
                            label={`Editar a ${name}`}
                            to={`/users/${u.id}/edit`}
                          />
                          <IconButton
                            icon={Trash2}
                            danger
                            disabled={isMe}
                            label={
                              isMe
                                ? "No puedes eliminar tu propia cuenta"
                                : `Eliminar a ${name}`
                            }
                            onClick={() => setTarget(u)}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pager
          page={safePage}
          pageCount={pageCount}
          total={filtered.length}
          pageSize={PAGE_SIZE}
          onChange={setPage}
          noun="usuarios"
        />
      </Card>

      <UserFormDrawer
        open={mode === "create" || (mode === "edit" && drawerUser !== null)}
        user={mode === "edit" ? drawerUser : null}
        isSelf={mode === "edit" && drawerUser?.id === currentUser?.id}
        onClose={closeDrawer}
        onSaved={handleSaved}
      />

      <ConfirmDialog
        open={target !== null}
        danger
        title="Eliminar usuario"
        description={
          target
            ? `Vas a eliminar a ${fullNameOf(target)} (${target.correo}). Perderá el acceso y esta acción no se puede deshacer.`
            : ""
        }
        confirmLabel="Eliminar"
        loadingLabel="Procesando…"
        loading={working}
        onConfirm={confirmDelete}
        onCancel={() => setTarget(null)}
        altLabel={target?.activo !== false ? "Desactivar en su lugar" : undefined}
        onAlt={deactivateInstead}
      />
    </div>
  );
}
