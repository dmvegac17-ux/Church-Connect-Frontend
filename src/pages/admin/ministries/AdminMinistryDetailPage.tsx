import { Pencil, SearchX, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { FullPageSpinner } from "../../../components/feedback/Spinner";
import { useToast } from "../../../components/feedback/useToast";
import { Button, buttonClass } from "../../../components/forms/Button";
import { Card } from "../../../components/layout/Page";
import { Breadcrumb, EmptyState } from "../../../components/ui/primitives";
import { useMinistry } from "../../../hooks/useMinistry";
import { ministryIcon } from "../../../lib/ministryIcon";
import { ministryService } from "../../../services/ministryService";
import { ApiError } from "../../../types/api";
import { DeleteMinistryDialog } from "../../ministries/components/DeleteMinistryDialog";
import { MinistryFormDrawer } from "./MinistryFormDrawer";
import { MinistryMembersPanel } from "./MinistryMembersPanel";

/**
 * Detalle de ministerio (panel de administración). Editar abre el panel
 * lateral y conserva su ruta (`/ministries/:id/editar`).
 */
export function AdminMinistryDetailPage({ mode }: { mode?: "edit" }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { ministry, isLoading, error, refetch } = useMinistry(id);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);

  if (isLoading && !ministry) {
    return <FullPageSpinner label="Cargando ministerio…" />;
  }

  if (error || !ministry || !id) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="flex flex-col gap-5">
        <Breadcrumb to="/ministries" label="Ministerios" />
        {notFound ? (
          <EmptyState
            bordered
            icon={SearchX}
            title="Este ministerio no existe o fue eliminado"
            action={
              <Link to="/ministries" className={buttonClass("secondary", "sm")}>
                Volver a Ministerios
              </Link>
            }
          />
        ) : (
          <ErrorAlert
            error={error ?? new Error("No se pudo cargar el ministerio.")}
          />
        )}
      </div>
    );
  }

  const Icon = ministryIcon(ministry.nombre);
  const detailPath = `/ministries/${ministry.id}`;

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await ministryService.remove(ministry.id);
      toast.success(`Ministerio «${ministry.nombre}» eliminado.`);
      navigate("/ministries", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        navigate("/ministries", { replace: true });
        return;
      }
      setDeleteError(err);
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <Breadcrumb to="/ministries" label="Ministerios" current={ministry.nombre} />

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3.5">
          <span
            className="flex size-[52px] shrink-0 items-center justify-center rounded-[14px] bg-primary-soft text-primary"
            aria-hidden="true"
          >
            <Icon className="size-7" />
          </span>
          <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.015em] break-words">
            {ministry.nombre}
          </h1>
        </div>
        <div className="flex gap-2">
          <Link
            to={`${detailPath}/editar`}
            className={buttonClass("secondary", "sm")}
          >
            <Pencil className="size-[19px]" aria-hidden="true" />
            Editar
          </Link>
          <Button
            variant="dangerOutline"
            size="sm"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="size-[19px]" aria-hidden="true" />
            Eliminar
          </Button>
        </div>
      </div>

      {deleteError ? (
        <ErrorAlert error={deleteError} onClose={() => setDeleteError(null)} />
      ) : null}

      <Card as="section" className="flex flex-col gap-1.5 p-5">
        <h2 className="text-sm font-bold text-text-secondary">Descripción</h2>
        {ministry.descripcion?.trim() ? (
          <p className="text-[15px] leading-[1.6] whitespace-pre-line">
            {ministry.descripcion}
          </p>
        ) : (
          <p className="text-[15px] text-muted-foreground">Sin descripción.</p>
        )}
      </Card>

      <MinistryMembersPanel
        ministryId={ministry.id}
        ministryName={ministry.nombre}
      />

      <MinistryFormDrawer
        open={mode === "edit"}
        ministry={ministry}
        onClose={() => navigate(detailPath)}
        onSaved={() => {
          refetch();
          navigate(detailPath, { replace: true });
        }}
      />

      <DeleteMinistryDialog
        open={confirmOpen}
        ministryName={ministry.nombre}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
