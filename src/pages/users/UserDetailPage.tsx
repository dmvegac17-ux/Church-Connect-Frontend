import { Pencil } from "lucide-react";
import type { ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { FullPageSpinner } from "../../components/feedback/Spinner";
import { Button } from "../../components/forms/Button";
import { Card, PageHeader } from "../../components/layout/Page";
import { ActiveBadge, RoleBadge } from "../../components/users/Badges";
import { useUser } from "../../hooks/useUser";
import { formatDate } from "../../lib/format";

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border py-3 last:border-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium text-foreground">{value}</dd>
    </div>
  );
}

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isLoading, error } = useUser(id);

  if (isLoading) {
    return <FullPageSpinner label="Cargando usuario…" />;
  }

  if (error || !user) {
    return (
      <div>
        <PageHeader title="Usuario" backTo="/users" />
        <ErrorAlert error={error ?? new Error("Usuario no encontrado")} />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={`${user.nombre} ${user.apellido ?? ""}`.trim()}
        backTo="/users"
        actions={
          <Button onClick={() => navigate(`/users/${user.id}/edit`)}>
            <Pencil className="size-4" aria-hidden="true" />
            Editar
          </Button>
        }
      />
      <Card className="max-w-xl">
        <dl>
          <Row label="ID" value={<span className="font-mono text-xs">{user.id}</span>} />
          <Row label="Nombre" value={user.nombre} />
          <Row label="Apellido" value={user.apellido ?? "—"} />
          <Row label="Correo" value={user.correo} />
          <Row label="Teléfono" value={user.telefono ?? "—"} />
          <Row label="Rol" value={<RoleBadge role={user.rol} />} />
          <Row label="Estado" value={<ActiveBadge active={user.activo} />} />
          <Row label="Creado" value={formatDate(user.fecha_creacion)} />
        </dl>
      </Card>
    </div>
  );
}
