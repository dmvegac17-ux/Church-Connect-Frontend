import { CircleAlert, CircleCheck, Info, TriangleAlert, X } from "lucide-react";
import type { ReactNode } from "react";

import { ApiError } from "../../types/api";

type Variant = "error" | "success" | "info" | "warning";

const STYLES: Record<Variant, { box: string; icon: ReactNode }> = {
  error: {
    box: "bg-destructive-soft text-destructive-hover",
    icon: <CircleAlert className="size-5 shrink-0" aria-hidden="true" />,
  },
  success: {
    box: "bg-success-soft text-success-foreground",
    icon: <CircleCheck className="size-5 shrink-0" aria-hidden="true" />,
  },
  info: {
    box: "bg-info-soft text-info-foreground",
    icon: <Info className="size-5 shrink-0" aria-hidden="true" />,
  },
  warning: {
    box: "bg-warning-soft text-warning-foreground",
    icon: <TriangleAlert className="size-5 shrink-0" aria-hidden="true" />,
  },
};

interface AlertProps {
  variant?: Variant;
  title?: string;
  message: string;
  /** Lista de detalles (`errors` del envelope). */
  details?: string[];
  onClose?: () => void;
}

export function Alert({
  variant = "info",
  title,
  message,
  details,
  onClose,
}: AlertProps) {
  const style = STYLES[variant];

  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      className={`flex items-start gap-2.5 rounded-xl px-3.5 py-3 text-sm leading-snug ${style.box}`}
    >
      {style.icon}
      <div className="min-w-0 flex-1">
        {title ? <p className="font-extrabold">{title}</p> : null}
        <p className={title ? "mt-0.5" : ""}>{message}</p>
        {details && details.length > 0 ? (
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        ) : null}
      </div>
      {onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar aviso"
          className="-m-1.5 flex size-8 shrink-0 items-center justify-center rounded-lg hover:bg-black/5"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

/**
 * Renderiza cualquier error atrapado. Si es un `ApiError`, muestra `message`
 * y la lista `errors` del `ResponsePayload`; si no, un texto genérico.
 */
export function ErrorAlert({
  error,
  onClose,
}: {
  error: unknown;
  onClose?: () => void;
}) {
  if (!error) {
    return null;
  }

  if (error instanceof ApiError) {
    const details = error.errors.filter((d) => d && d !== error.message);
    return (
      <Alert
        variant="error"
        message={error.message}
        details={details}
        onClose={onClose}
      />
    );
  }

  const message =
    error instanceof Error ? error.message : "Ocurrió un error inesperado.";

  return <Alert variant="error" message={message} onClose={onClose} />;
}
