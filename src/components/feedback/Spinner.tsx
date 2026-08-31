import { Loader2 } from "lucide-react";

interface SpinnerProps {
  className?: string;
  label?: string;
}

export function Spinner({ className = "size-5", label }: SpinnerProps) {
  return (
    <span role="status" className="inline-flex items-center gap-2">
      <Loader2 className={`animate-spin ${className}`} aria-hidden="true" />
      {label ? <span>{label}</span> : <span className="sr-only">Cargando…</span>}
    </span>
  );
}

export function FullPageSpinner({ label }: { label?: string }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center text-muted-foreground">
      <Spinner className="size-8" label={label} />
    </div>
  );
}
