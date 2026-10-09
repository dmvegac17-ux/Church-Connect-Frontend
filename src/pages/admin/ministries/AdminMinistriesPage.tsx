import { Plus, UsersRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { FullPageSpinner } from "../../../components/feedback/Spinner";
import { buttonClass } from "../../../components/forms/Button";
import { PageHeader } from "../../../components/layout/Page";
import { EmptyState } from "../../../components/ui/primitives";
import { useFullList } from "../../../hooks/useFullList";
import { useMinistryMemberCounts } from "../../../hooks/useMinistryMemberCounts";
import { ministryService } from "../../../services/ministryService";
import { MinistryCard } from "../../ministries/components/MinistryCard";
import { MinistryFormDrawer } from "./MinistryFormDrawer";

/**
 * Ministerios (panel de administración): mismas tarjetas que ve el miembro,
 * más la creación en el panel lateral (`/ministries/nuevo`).
 */
export function AdminMinistriesPage({ mode }: { mode?: "create" }) {
  const navigate = useNavigate();
  const { items, isLoading, error } = useFullList(ministryService.list);
  const counts = useMinistryMemberCounts(items.map((m) => m.id));

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Ministerios"
        description={`Organiza los ministerios y sus miembros.${
          isLoading
            ? ""
            : ` ${items.length} ${items.length === 1 ? "ministerio" : "ministerios"}.`
        }`}
        actions={
          <Link to="/ministries/nuevo" className={buttonClass("primary")}>
            <Plus className="size-5" aria-hidden="true" />
            Nuevo ministerio
          </Link>
        }
      />

      {error ? <ErrorAlert error={error} /> : null}

      {isLoading ? (
        <FullPageSpinner label="Cargando ministerios…" />
      ) : items.length === 0 ? (
        <EmptyState
          bordered
          icon={UsersRound}
          title="Todavía no hay ministerios"
          description="Crea el primero para empezar a asignar miembros."
          action={
            <Link to="/ministries/nuevo" className={buttonClass("primary", "sm")}>
              <Plus className="size-[18px]" aria-hidden="true" />
              Nuevo ministerio
            </Link>
          }
        />
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-4">
          {items.map((m) => (
            <li key={m.id}>
              <MinistryCard ministry={m} memberCount={counts[m.id]} />
            </li>
          ))}
        </ul>
      )}

      <MinistryFormDrawer
        open={mode === "create"}
        ministry={null}
        onClose={() => navigate("/ministries")}
        onSaved={(saved) => navigate(`/ministries/${saved.id}`, { replace: true })}
      />
    </div>
  );
}
