import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { FullPageSpinner } from "../../components/feedback/Spinner";
import { useToast } from "../../components/feedback/useToast";
import { Button } from "../../components/forms/Button";
import { Card, PageHeader } from "../../components/layout/Page";
import { useMinistry } from "../../hooks/useMinistry";
import { ministryService } from "../../services/ministryService";
import { ApiError } from "../../types/api";
import { DeleteMinistryDialog } from "./components/DeleteMinistryDialog";
import { MinistryMembersList } from "./components/MinistryMembersList";

export function MinistryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { role } = useAuth();
  const isAdmin = role === "ADMIN";
  const { ministry, isLoading, error } = useMinistry(id);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);

  if (isLoading) {
    return <FullPageSpinner label="Cargando ministerio…" />;
  }

  if (error || !ministry || !id) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div>
        <PageHeader title="Ministerio" backTo="/ministries" />
        {notFound ? (
          <Card className="text-center">
            <p className="text-sm text-muted-foreground">
              El ministerio que buscas no existe o fue eliminado.
            </p>
            <Link
              to="/ministries"
              className="mt-3 inline-block text-sm font-medium text-primary hover:underline"
            >
              Volver al listado
            </Link>
          </Card>
        ) : (
          <ErrorAlert
            error={error ?? new Error("No se pudo cargar el ministerio.")}
          />
        )}
      </div>
    );
  }

  const confirmDelete = async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      await ministryService.remove(ministry.id);
      toast.success(
        `El ministerio "${ministry.nombre}" fue eliminado.`,
        "Ministerio eliminado",
      );
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
    <div className="space-y-6">
      <PageHeader
        title={ministry.nombre}
        backTo="/ministries"
        actions={
          isAdmin ? (
            <>
              <Button
                variant="secondary"
                onClick={() => navigate(`/ministries/${ministry.id}/editar`)}
              >
                <Pencil className="size-4" aria-hidden="true" />
                Editar
              </Button>
              <Button variant="danger" onClick={() => setConfirmOpen(true)}>
                <Trash2 className="size-4" aria-hidden="true" />
                Eliminar
              </Button>
            </>
          ) : undefined
        }
      />

      {deleteError ? (
        <ErrorAlert error={deleteError} onClose={() => setDeleteError(null)} />
      ) : null}

      <Card className="max-w-2xl">
        <h2 className="text-sm font-medium text-muted-foreground">Descripción</h2>
        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
          {ministry.descripcion?.trim() || "Sin descripción."}
        </p>
      </Card>

      <MinistryMembersList ministryId={ministry.id} canManage={isAdmin} />

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
