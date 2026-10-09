import { UsersRound } from "lucide-react";

import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { FullPageSpinner } from "../../components/feedback/Spinner";
import { PageHeader } from "../../components/layout/Page";
import { EmptyState } from "../../components/ui/primitives";
import { useFullList } from "../../hooks/useFullList";
import { useMinistryMemberCounts } from "../../hooks/useMinistryMemberCounts";
import { ministryService } from "../../services/ministryService";
import { MinistryCard } from "./components/MinistryCard";

/** Ministerios (vista de miembro): solo lectura. */
export function MinistriesListPage() {
  const { items, isLoading, error } = useFullList(ministryService.list);
  const counts = useMinistryMemberCounts(items.map((m) => m.id));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Ministerios"
        description={`Conoce los ministerios de la iglesia y a sus integrantes.${
          isLoading
            ? ""
            : ` ${items.length} ${items.length === 1 ? "ministerio" : "ministerios"}.`
        }`}
      />

      {error ? <ErrorAlert error={error} /> : null}

      {isLoading ? (
        <FullPageSpinner label="Cargando ministerios…" />
      ) : items.length === 0 ? (
        <EmptyState
          bordered
          icon={UsersRound}
          title="Todavía no hay ministerios"
          description="Cuando se registren ministerios aparecerán aquí."
        />
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4">
          {items.map((m) => (
            <li key={m.id}>
              <MinistryCard ministry={m} memberCount={counts[m.id]} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
