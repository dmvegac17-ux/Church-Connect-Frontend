import {
  ChevronLeft,
  ChevronRight,
  HeartHandshake,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { FullPageSpinner } from "../../components/feedback/Spinner";
import { useToast } from "../../components/feedback/useToast";
import { Button } from "../../components/forms/Button";
import { Card, PageHeader } from "../../components/layout/Page";
import { useMinistries } from "../../hooks/useMinistries";
import { ministryService } from "../../services/ministryService";
import { ApiError } from "../../types/api";
import type { Ministry } from "../../types/ministry";
import { DeleteMinistryDialog } from "./components/DeleteMinistryDialog";

export function MinistriesListPage() {
  const { role } = useAuth();
  const isAdmin = role === "ADMIN";
  const toast = useToast();
  const navigate = useNavigate();
  const {
    ministries,
    total,
    isLoading,
    error,
    page,
    pageCount,
    pageSize,
    setPage,
    refetch,
  } = useMinistries();

  const [target, setTarget] = useState<Ministry | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<unknown>(null);

  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  const confirmDelete = async () => {
    if (!target) {
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await ministryService.remove(target.id);
      toast.success(
        `El ministerio "${target.nombre}" fue eliminado.`,
        "Ministerio eliminado",
      );
      setTarget(null);
      refetch();
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        refetch();
        setTarget(null);
      } else {
        setDeleteError(err);
      }
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Ministerios"
        description={`${total} ministerio${total === 1 ? "" : "s"} registrado${
          total === 1 ? "" : "s"
        }.`}
        actions={
          isAdmin ? (
            <Button onClick={() => navigate("/ministries/nuevo")}>
              <Plus className="size-4" aria-hidden="true" />
              Nuevo ministerio
            </Button>
          ) : undefined
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

      {isLoading ? (
        <FullPageSpinner label="Cargando ministerios…" />
      ) : ministries.length === 0 ? (
        <Card className="text-center text-sm text-muted-foreground">
          Todavía no hay ministerios registrados.
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ministries.map((m) => (
              <div
                key={m.id}
                className="group relative flex flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md"
              >
                {isAdmin ? (
                  <div className="absolute right-3 top-3 flex gap-1 opacity-0 transition group-hover:opacity-100 focus-within:opacity-100">
                    <Link
                      to={`/ministries/${m.id}/editar`}
                      className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-primary"
                      aria-label={`Editar ${m.nombre}`}
                    >
                      <Pencil className="size-4" aria-hidden="true" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => setTarget(m)}
                      className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label={`Eliminar ${m.nombre}`}
                    >
                      <Trash2 className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                ) : null}

                <span className="inline-flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <HeartHandshake className="size-5" aria-hidden="true" />
                </span>

                <Link
                  to={`/ministries/${m.id}`}
                  className="mt-3 text-base font-medium text-foreground hover:text-primary hover:underline"
                >
                  {m.nombre}
                </Link>
                <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                  {m.descripcion?.trim() || "Sin descripción."}
                </p>

                <Link
                  to={`/ministries/${m.id}`}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Ver detalle
                  <ChevronRight className="size-4" aria-hidden="true" />
                </Link>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
            <span>
              {rangeStart}–{rangeEnd} de {total}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
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
                disabled={page >= pageCount}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 hover:bg-muted disabled:opacity-40"
              >
                Siguiente
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      )}

      <DeleteMinistryDialog
        open={target !== null}
        ministryName={target?.nombre ?? ""}
        loading={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setTarget(null)}
      />
    </div>
  );
}
