import { forwardRef, type ButtonHTMLAttributes } from "react";

import { Spinner } from "../feedback/Spinner";

type Variant =
  | "primary"
  | "secondary"
  | "danger"
  | "dangerOutline"
  | "soft"
  | "ghost";
type Size = "md" | "sm";

const VARIANTS: Record<Variant, string> = {
  primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
  secondary:
    "border border-button-border bg-card text-foreground hover:bg-accent",
  /** Rojo sólido: solo dentro del diálogo de confirmación. */
  danger:
    "bg-destructive text-destructive-foreground hover:bg-destructive-hover",
  dangerOutline:
    "border border-destructive-border bg-card text-destructive hover:bg-destructive-soft",
  soft: "border border-primary bg-primary-soft font-extrabold text-primary-hover hover:bg-primary-selected",
  ghost: "text-text-secondary hover:bg-hover-icon hover:text-foreground",
};

const SIZES: Record<Size, string> = {
  md: "h-[var(--control-h)] px-4 text-[15px]",
  sm: "h-10 px-3.5 text-sm",
};

/** Mismos colores para cualquier variante deshabilitada. */
const DISABLED =
  "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-disabled disabled:text-disabled-foreground";

/** Clases de botón reutilizables en un `<Link>` que debe verse como botón. */
export function buttonClass(
  variant: Variant = "primary",
  size: Size = "md",
  extra = "",
): string {
  return `inline-flex items-center justify-center gap-2 rounded-[10px] font-bold whitespace-nowrap transition-colors ${SIZES[size]} ${VARIANTS[variant]} ${DISABLED} ${extra}`;
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  /** Texto mientras `loading` (p. ej. "Guardando…"). */
  loadingLabel?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    loading = false,
    loadingLabel,
    disabled,
    className = "",
    type = "button",
    children,
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass(variant, size, className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner className="size-4" /> : null}
      {loading && loadingLabel ? loadingLabel : children}
    </button>
  );
});
