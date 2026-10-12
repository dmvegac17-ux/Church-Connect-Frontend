import { Megaphone, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { ConfirmDialog } from "../../../components/feedback/ConfirmDialog";
import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { Spinner } from "../../../components/feedback/Spinner";
import { useToast } from "../../../components/feedback/useToast";
import { Button } from "../../../components/forms/Button";
import { Card, PageHeader } from "../../../components/layout/Page";
import {
  EmptyState,
  IconButton,
  Pager,
  TD_CLASS,
  TH_CLASS,
  TR_CLASS,
} from "../../../components/ui/primitives";
import {
  announcementDateTime,
  authorName,
  excerpt,
} from "../../../lib/announcements";
import { announcementService } from "../../../services/announcementService";
import { ApiError } from "../../../types/api";
import type { Announcement } from "../../../types/announcement";
import { AnnouncementImage } from "../../announcements/components/AnnouncementCard";
import { AnnouncementFormDrawer } from "./AnnouncementFormDrawer";

const PAGE_SIZE = 10;

/** Anuncios (panel de administración): listado paginado y gestión. */
export function AdminAnnouncementsPage() {
  const toast = useToast();
  const [page, setPage] = useState(1);
  const [reloadKey, setReloadKey] = useState(0);
  const [items, setItems] = useState<Announcement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  // `undefined` = cerrado; `null` = crear; un anuncio = editar.
  const [editing, setEditing] = useState<Announcement | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    announcementService
      .list({
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        signal: controller.signal,
      })
      .then((result) => {
        setItems(result.items);
        setTotal(result.total);
        setLoading(false);
        // Si se borró lo último de una página, se vuelve a la anterior.
        if (result.items.length === 0 && page > 1) {
          setPage(page - 1);
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(err);
        setLoading(false);
      });

    return () => controller.abort();
  }, [page, reloadKey]);

  const refetch = () => setReloadKey((k) => k + 1);

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    setDeleting(true);
    try {
      await announcementService.remove(deleteTarget.id);
      toast.success(`Anuncio «${deleteTarget.titulo}» eliminado.`);
    } catch (err) {
      if (!(err instanceof ApiError && err.status === 404)) {
        toast.error(
          err instanceof ApiError ? err.message : "No se pudo eliminar el anuncio.",
        );
      }
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
      refetch();
    }
  };

  const newButton = (
    <Button onClick={() => setEditing(null)}>
      <Plus className="size-5" aria-hidden="true" />
      Nuevo anuncio
    </Button>
  );

  const actions = (a: Announcement) => (
    <div className="flex items-center gap-0.5 md:justify-end">
      <IconButton
        icon={Pencil}
        label={`Editar el anuncio «${a.titulo}»`}
        onClick={() => setEditing(a)}
      />
      <IconButton
        icon={Trash2}
        danger
        label={`Eliminar el anuncio «${a.titulo}»`}
        onClick={() => setDeleteTarget(a)}
      />
    </div>
  );

  const meta = (a: Announcement) => (
    <div className="flex flex-col gap-0.5 text-[13px] text-muted-foreground">
      <span>
        Publicado por {authorName(a)} el {announcementDateTime(a.fecha_publicacion)}
      </span>
      {a.fecha_actualizacion ? (
        <span>
          Actualizado por {a.actualizado_por?.nombre_completo ?? "Usuario eliminado"} el{" "}
          {announcementDateTime(a.fecha_actualizacion)}
        </span>
      ) : null}
    </div>
  );

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Anuncios"
        description={`Avisos generales para toda la iglesia.${
          loading ? "" : ` ${total} ${total === 1 ? "anuncio" : "anuncios"}.`
        }`}
        actions={newButton}
      />

      {error ? <ErrorAlert error={error} /> : null}

      {loading && items.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground">
          <Spinner label="Cargando anuncios…" />
        </Card>
      ) : items.length === 0 && !error ? (
        <EmptyState
          bordered
          icon={Megaphone}
          title="Aún no hay anuncios"
          description="Publica el primero para que lo vean todos los miembros."
          action={newButton}
        />
      ) : (
        <Card as="section" className="overflow-hidden" >
          <div aria-busy={loading} className={loading ? "opacity-60" : ""}>
            <table className="hidden w-full border-collapse text-sm md:table">
              <thead>
                <tr className="bg-surface-alt">
                  <th scope="col" className={TH_CLASS}>
                    Anuncio
                  </th>
                  <th scope="col" className={TH_CLASS}>
                    Publicación
                  </th>
                  <th scope="col" className={`${TH_CLASS} !text-right`}>
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => (
                  <tr key={a.id} className={TR_CLASS}>
                    <td className={`${TD_CLASS} py-3`}>
                      <div className="flex items-center gap-3">
                        <AnnouncementImage
                          announcement={a}
                          rounded="rounded-lg"
                          className="h-12 w-[72px] shrink-0"
                        />
                        <div className="min-w-0">
                          <Link
                            to={`/announcements/${a.id}`}
                            className="text-[15px] font-extrabold break-words text-foreground hover:underline"
                          >
                            {a.titulo}
                          </Link>
                          <p className="text-[13px] text-muted-foreground">
                            {excerpt(a.contenido, 90)}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className={`${TD_CLASS} py-3`}>{meta(a)}</td>
                    <td className={`${TD_CLASS} py-3`}>{actions(a)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <ul className="md:hidden">
              {items.map((a) => (
                <li
                  key={a.id}
                  className="flex gap-3 border-t border-divider-soft px-4 py-4 first:border-t-0"
                >
                  <AnnouncementImage
                    announcement={a}
                    rounded="rounded-lg"
                    className="h-14 w-16 shrink-0"
                  />
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <Link
                      to={`/announcements/${a.id}`}
                      className="text-[15px] font-extrabold break-words text-foreground"
                    >
                      {a.titulo}
                    </Link>
                    {meta(a)}
                    {actions(a)}
                  </div>
                </li>
              ))}
            </ul>

            <Pager
              page={page}
              pageCount={Math.max(1, Math.ceil(total / PAGE_SIZE))}
              total={total}
              pageSize={PAGE_SIZE}
              onChange={setPage}
              disabled={loading}
              noun="anuncios"
            />
          </div>
        </Card>
      )}

      <AnnouncementFormDrawer
        open={editing !== undefined}
        announcement={editing ?? null}
        onClose={() => setEditing(undefined)}
        onSaved={() => {
          setEditing(undefined);
          // Lo recién publicado aparece primero.
          if (page !== 1) {
            setPage(1);
          } else {
            refetch();
          }
        }}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        danger
        title="Eliminar anuncio"
        description={
          deleteTarget
            ? `«${deleteTarget.titulo}» dejará de verse para todos y su imagen se borrará. Esta acción no se puede deshacer.`
            : undefined
        }
        confirmLabel="Eliminar anuncio"
        cancelLabel="Volver"
        loading={deleting}
        loadingLabel="Eliminando…"
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
