import { Megaphone } from "lucide-react";
import { useEffect, useState } from "react";

import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { Button } from "../../components/forms/Button";
import { Card, PageHeader } from "../../components/layout/Page";
import { EmptyState } from "../../components/ui/primitives";
import { announcementService } from "../../services/announcementService";
import type { Announcement } from "../../types/announcement";
import { AnnouncementCard } from "./components/AnnouncementCard";

/** Tarjetas por tanda: tres filas de tres en escritorio. */
export const ANNOUNCEMENTS_BATCH = 9;

/** Anuncios (vista de miembro): cartelera con carga progresiva. */
export function AnnouncementsPage() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    announcementService
      .list({ limit: ANNOUNCEMENTS_BATCH, offset: 0, signal: controller.signal })
      .then((result) => {
        setItems(result.items);
        setTotal(result.total);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) {
          return;
        }
        setError(err);
        setLoading(false);
      });

    return () => controller.abort();
  }, [reloadKey]);

  const loadMore = async () => {
    setLoadingMore(true);
    setError(null);
    try {
      const result = await announcementService.list({
        limit: ANNOUNCEMENTS_BATCH,
        offset: items.length,
      });
      // Sin duplicados si alguien publicó mientras tanto.
      setItems((prev) => [
        ...prev,
        ...result.items.filter((a) => !prev.some((p) => p.id === a.id)),
      ]);
      setTotal(result.total);
    } catch (err) {
      setError(err);
    } finally {
      setLoadingMore(false);
    }
  };

  const remaining = Math.max(0, total - items.length);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Anuncios"
        description="Avisos generales de la iglesia."
      />

      {error && !loading ? (
        <div className="flex flex-col items-start gap-3">
          <ErrorAlert error={error} />
          {items.length === 0 ? (
            <Button variant="secondary" onClick={() => setReloadKey((k) => k + 1)}>
              Reintentar
            </Button>
          ) : null}
        </div>
      ) : null}

      {loading ? (
        <ul
          role="status"
          aria-label="Cargando anuncios"
          className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4"
        >
          {[0, 1, 2].map((k) => (
            <li key={k}>
              <Card className="overflow-hidden">
                <div className="aspect-[16/9] w-full bg-muted" />
                <div className="flex flex-col gap-2.5 p-5">
                  <div className="h-3 w-[40%] rounded-md bg-muted" />
                  <div className="h-[18px] w-[70%] rounded-md bg-muted" />
                  <div className="h-3 w-full rounded-md bg-accent" />
                  <div className="h-3 w-[85%] rounded-md bg-accent" />
                </div>
              </Card>
            </li>
          ))}
        </ul>
      ) : items.length === 0 && !error ? (
        <EmptyState
          bordered
          icon={Megaphone}
          title="Aún no hay anuncios"
          description="Cuando la iglesia publique un aviso aparecerá aquí."
        />
      ) : (
        <>
          <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4">
            {items.map((a) => (
              <li key={a.id}>
                <AnnouncementCard announcement={a} />
              </li>
            ))}
          </ul>
          {remaining > 0 ? (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                onClick={() => void loadMore()}
                loading={loadingMore}
                loadingLabel="Cargando…"
              >
                Ver más anuncios ({remaining})
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
