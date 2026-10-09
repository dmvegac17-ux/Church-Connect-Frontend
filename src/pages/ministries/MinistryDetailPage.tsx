import { SearchX } from "lucide-react";
import { Link, useParams } from "react-router-dom";

import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { FullPageSpinner, Spinner } from "../../components/feedback/Spinner";
import { buttonClass } from "../../components/forms/Button";
import { Card, CardHeader } from "../../components/layout/Page";
import {
  Avatar,
  Breadcrumb,
  EmptyState,
  Pager,
} from "../../components/ui/primitives";
import { useMinistry } from "../../hooks/useMinistry";
import { useMinistryMembers } from "../../hooks/useMinistryMembers";
import { membersLabel, ministryIcon } from "../../lib/ministryIcon";
import { fullNameOf } from "../../lib/people";
import { ApiError } from "../../types/api";

/** Detalle de ministerio (vista de miembro): descripción e integrantes. */
export function MinistryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { ministry, isLoading, error } = useMinistry(id);
  const members = useMinistryMembers(id);

  if (isLoading) {
    return <FullPageSpinner label="Cargando ministerio…" />;
  }

  if (error || !ministry || !id) {
    const notFound = error instanceof ApiError && error.status === 404;
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumb to="/ministries" label="Ministerios" />
        {notFound ? (
          <EmptyState
            bordered
            icon={SearchX}
            title="Este ministerio no existe o fue eliminado"
            action={
              <Link to="/ministries" className={buttonClass("secondary")}>
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

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumb to="/ministries" label="Ministerios" current={ministry.nombre} />

      <div className="flex items-center gap-4">
        <span
          className="flex size-14 shrink-0 items-center justify-center rounded-[14px] bg-primary-soft text-primary"
          aria-hidden="true"
        >
          <Icon className="size-[30px]" />
        </span>
        <h1 className="text-[28px] leading-tight font-extrabold tracking-[-0.015em] break-words">
          {ministry.nombre}
        </h1>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,320px),1fr))] items-start gap-5">
        <Card as="section" className="flex flex-col gap-2.5 p-6">
          <h2 className="text-[17px] font-extrabold">Acerca del ministerio</h2>
          <p className="text-base leading-[1.6] text-pretty whitespace-pre-line text-text-strong">
            {ministry.descripcion?.trim() || "Sin descripción."}
          </p>
        </Card>

        <Card as="section" className="overflow-hidden">
          <CardHeader
            title="Integrantes"
            aside={
              <span className="text-sm text-muted-foreground">
                {members.isLoading ? "" : membersLabel(members.total)}
              </span>
            }
          />
          {members.error ? (
            <div className="p-5">
              <ErrorAlert error={members.error} />
            </div>
          ) : members.isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              <Spinner label="Cargando integrantes…" />
            </div>
          ) : members.members.length === 0 ? (
            <p className="px-5 py-8 text-center text-[15px] text-muted-foreground">
              Este ministerio todavía no tiene integrantes.
            </p>
          ) : (
            <ul>
              {members.members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center gap-3 border-t border-divider-soft px-6 py-3 first:border-t-0"
                >
                  <Avatar name={fullNameOf(m)} />
                  <span className="min-w-0 flex-1 text-[15px] font-bold break-words">
                    {fullNameOf(m)}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <Pager
            page={members.page}
            pageCount={members.pageCount}
            total={members.total}
            pageSize={members.pageSize}
            onChange={members.setPage}
            noun="integrantes"
          />
        </Card>
      </div>
    </div>
  );
}
