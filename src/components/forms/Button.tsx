import type { ButtonHTMLAttributes } from "react";

import { Spinner } from "../feedback/Spinner";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANTS: Record<Variant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/50",
  secondary:
    "border border-border bg-card text-foreground hover:bg-muted focus-visible:ring-ring/40",
  danger:
    "bg-destructive text-destructive-foreground hover:bg-destructive/90 focus-visible:ring-destructive/50",
  ghost:
    "text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/40",
};

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  loading = false,
  disabled,
  className = "",
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-60 ${VARIANTS[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner className="size-4" /> : null}
      {children}
    </button>
  );
}
