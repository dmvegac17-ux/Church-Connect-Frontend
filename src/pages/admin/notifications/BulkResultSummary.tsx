import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import type { ReactNode } from "react";

import type { BulkNotificationResult } from "../../../types/notification";

interface BulkResultSummaryProps {
  result: BulkNotificationResult;
}

const STATUS_META: Record<
  BulkNotificationResult["status"],
  { box: string; icon: ReactNode; title: string }
> = {
  201: {
    box: "bg-success-soft text-success-foreground",
    icon: <CheckCircle2 className="size-5 shrink-0" aria-hidden="true" />,
    title: "Envío completado",
  },
  207: {
    box: "bg-warning-soft text-warning-foreground",
    icon: <AlertTriangle className="size-5 shrink-0" aria-hidden="true" />,
    title: "Envío parcial",
  },
  500: {
    box: "bg-destructive-soft text-destructive-hover",
    icon: <XCircle className="size-5 shrink-0" aria-hidden="true" />,
    title: "El envío falló",
  },
};

/** Renderiza `data`/`errors`/`meta` de `POST /notificaciones/masivo` (201/207/500). */
export function BulkResultSummary({ result }: BulkResultSummaryProps) {
  const { meta, errors } = result;
  const { box, icon, title } = STATUS_META[result.status];

  return (
    <div
      role="status"
      aria-live="polite"
      className={`flex gap-2.5 rounded-xl px-3.5 py-3 text-sm ${box}`}
    >
      {icon}
      <div className="min-w-0 flex-1">
        <p className="font-extrabold">{title}</p>
        <p className="mt-0.5">
          {meta.exitosas} de {meta.total} notificaciones enviadas
          {meta.fallidas > 0 ? `, ${meta.fallidas} fallaron` : ""}.
        </p>

        {errors && errors.length > 0 ? (
          <ul className="mt-2 list-disc space-y-0.5 pl-5">
            {errors.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
