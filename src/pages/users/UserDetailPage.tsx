import { Pencil } from "lucide-react";
import type { ReactNode } from "react";
import { Link, useParams } from "react-router-dom";

import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { FullPageSpinner } from "../../components/feedback/Spinner";
import { buttonClass } from "../../components/forms/Button";
import { Card } from "../../components/layout/Page";
import { Avatar, Breadcrumb } from "../../components/ui/primitives";
import { ActiveBadge, RoleBadge } from "../../components/users/Badges";
import { useUser } from "../../hooks/useUser";
import { formatDate } from "../../lib/format";
import { fullNameOf } from "../../lib/people";

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 border-t border-divider-soft px-5 py-3 first:border-t-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-[15px] font-bold break-all text-foreground">{value}</dd>
    </div>
  );
}

/** Ficha de solo lectura de un usuario (panel de administración). */
export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user, isLoading, error } = useUser(id);

  if (isLoading) {
    return <FullPageSpinner label="Cargando usuario…" />;
  }

  if (error || !user) {
    return (
      <div className="flex flex-col gap-5">
        <Breadcrumb to="/users" label="Usuarios" />
        <ErrorAlert error={error ?? new Error("Usuario no encontrado")} />
      </div>
    );
  }

  const name = fullNameOf(user);

  return (
    <div className="flex max-w-[640px] flex-col gap-5">
      <Breadcrumb to="/users" label="Usuarios" current={name} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <Avatar name={name} className="size-[52px] text-lg" />
          <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.015em] break-words">
            {name}
          </h1>
        </div>
        <Link
          to={`/users/${user.id}/edit`}
          className={buttonClass("secondary", "sm")}
        >
          <Pencil className="size-[19px]" aria-hidden="true" />
          Editar
        </Link>
      </div>

      <Card as="section" className="overflow-hidden">
        <dl>
          <Row label="Nombre" value={user.nombre} />
          <Row label="Apellido" value={user.apellido ?? "—"} />
          <Row label="Correo" value={user.correo} />
          <Row label="Teléfono" value={user.telefono ?? "—"} />
          <Row label="Rol" value={<RoleBadge role={user.rol} />} />
          <Row label="Estado" value={<ActiveBadge active={user.activo} />} />
          <Row label="Creado" value={formatDate(user.fecha_creacion)} />
          <Row
            label="ID"
            value={<span className="font-mono text-xs font-normal">{user.id}</span>}
          />
        </dl>
      </Card>
    </div>
  );
}
