import { SearchX } from "lucide-react";

import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { FullPageSpinner } from "../../components/feedback/Spinner";
import { Button } from "../../components/forms/Button";
import { PageHeader } from "../../components/layout/Page";
import {
  EmptyState,
  SearchInput,
  SegmentedTabs,
} from "../../components/ui/primitives";
import { useEventFilters } from "../../hooks/useEventFilters";
import { useFullList } from "../../hooks/useFullList";
import { eventService } from "../../services/eventService";
import { EventCard } from "./components/EventCard";

/** Eventos (vista de miembro): solo lectura, con tabs y buscador. */
export function EventsListPage() {
  const { items, isLoading, error } = useFullList(eventService.list);
  const filters = useEventFilters(items);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Eventos"
        description="Consulta la fecha, la sede y el cronograma de cada evento."
      />

      {error ? <ErrorAlert error={error} /> : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SegmentedTabs
          label="Filtrar eventos"
          tabs={filters.tabs}
          value={filters.tab}
          onChange={filters.setTab}
        />
        <SearchInput
          label="Buscar eventos"
          placeholder="Buscar por nombre o lugar"
          value={filters.query}
          onChange={filters.setQuery}
          className="max-w-[340px] min-w-[220px] flex-1"
        />
      </div>

      {isLoading ? (
        <FullPageSpinner label="Cargando eventos…" />
      ) : filters.visible.length === 0 ? (
        <EmptyState
          bordered
          icon={SearchX}
          title={
            filters.query.trim()
              ? `No hay eventos que coincidan con «${filters.query.trim()}»`
              : "No hay eventos en esta vista"
          }
          description={
            filters.total > 0
              ? "Prueba con otro término o cambia el filtro."
              : "Cuando se publiquen eventos aparecerán aquí."
          }
          action={
            filters.total > 0 ? (
              <Button variant="secondary" onClick={filters.clear}>
                Ver todos los eventos
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,440px),1fr))] gap-4">
          {filters.visible.map((ev) => (
            <li key={ev.id}>
              <EventCard event={ev} />
            </li>
          ))}
        </ul>
      )}

      {!isLoading && filters.total > 0 ? (
        <p className="text-sm text-muted-foreground" role="status">
          Mostrando {filters.visible.length} de {filters.total} eventos
        </p>
      ) : null}
    </div>
  );
}
