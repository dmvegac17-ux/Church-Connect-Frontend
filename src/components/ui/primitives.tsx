import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Search,
  type LucideIcon,
} from "lucide-react";
import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from "react";
import { Link } from "react-router-dom";

import { initialsOf } from "../../lib/people";

/* Piezas visuales compartidas por la vista de miembro y el panel de administración. */

/** Avatar de iniciales. `tone="primary"` para la cabecera del perfil. */
export function Avatar({
  name,
  className = "size-9 text-[13px]",
  tone = "sand",
}: {
  name: string;
  className?: string;
  tone?: "sand" | "primary";
}) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-extrabold ${
        tone === "primary"
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground"
      } ${className}`}
    >
      {initialsOf(name)}
    </span>
  );
}

export type PillTone =
  | "success"
  | "info"
  | "warning"
  | "sand"
  | "neutral"
  | "danger";

const PILL_TONES: Record<PillTone, string> = {
  success: "bg-success-soft text-success-foreground",
  info: "bg-info-soft text-info-foreground",
  warning: "bg-warning-soft text-warning-foreground",
  sand: "bg-secondary text-secondary-foreground",
  neutral: "bg-muted text-text-secondary",
  danger: "bg-destructive-soft text-destructive",
};

/** Pastilla de estado: siempre lleva texto (y, opcionalmente, punto o icono). */
export function Pill({
  tone = "neutral",
  icon: Icon,
  dot,
  children,
  className = "",
}: {
  tone?: PillTone;
  icon?: LucideIcon;
  /** Punto de color a la izquierda (Activo / Inactivo). */
  dot?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex h-[26px] items-center gap-1.5 rounded-full px-2.5 text-xs font-bold whitespace-nowrap ${PILL_TONES[tone]} ${className}`}
    >
      {dot ? (
        <span className={`size-[7px] rounded-full ${dot}`} aria-hidden="true" />
      ) : null}
      {Icon ? <Icon className="size-[15px]" aria-hidden="true" /> : null}
      {children}
    </span>
  );
}

const ICON_BUTTON_BASE =
  "inline-flex size-[38px] shrink-0 items-center justify-center rounded-[9px] transition-colors max-md:size-11";

function iconButtonClass(danger: boolean, disabled: boolean): string {
  if (disabled) {
    return `${ICON_BUTTON_BASE} cursor-not-allowed text-icon-disabled`;
  }
  return `${ICON_BUTTON_BASE} ${
    danger
      ? "text-destructive hover:bg-destructive-soft"
      : "text-text-secondary hover:bg-hover-icon hover:text-foreground"
  }`;
}

interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "aria-label" | "title"> {
  icon: LucideIcon;
  /** Obligatorio: es el nombre accesible y el `title` del botón. */
  label: string;
  danger?: boolean;
}

/** Botón de solo icono (38×38; 44×44 en móvil). */
export function IconButton({
  icon: Icon,
  label,
  danger = false,
  disabled,
  type = "button",
  ...props
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      disabled={disabled}
      className={iconButtonClass(danger, Boolean(disabled))}
      {...props}
    >
      <Icon className="size-5" aria-hidden="true" />
    </button>
  );
}

/** Igual que `IconButton`, pero navega. */
export function IconLink({
  icon: Icon,
  label,
  to,
  state,
}: {
  icon: LucideIcon;
  label: string;
  to: string;
  state?: unknown;
}) {
  return (
    <Link
      to={to}
      state={state}
      aria-label={label}
      title={label}
      className={iconButtonClass(false, false)}
    >
      <Icon className="size-5" aria-hidden="true" />
    </Link>
  );
}

interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "onChange"> {
  /** Etiqueta accesible (el campo no muestra etiqueta visible). */
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon?: LucideIcon;
}

export function SearchInput({
  label,
  value,
  onChange,
  icon: Icon = Search,
  className = "",
  ...props
}: SearchInputProps) {
  return (
    <label className={`relative block min-w-0 ${className}`}>
      <span className="sr-only">{label}</span>
      <Icon
        className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 text-icon-muted"
        aria-hidden="true"
      />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-[var(--control-h)] w-full rounded-[10px] border border-input bg-card pr-3 pl-10 text-[15px] text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-primary-soft-border focus-visible:outline-offset-0"
        {...props}
      />
    </label>
  );
}

export interface SegmentedTab<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/** Tabs segmentadas con conteo ("Próximos · 3"). */
export function SegmentedTabs<T extends string>({
  label,
  tabs,
  value,
  onChange,
  className = "",
}: {
  /** Nombre accesible del grupo. */
  label: string;
  tabs: SegmentedTab<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className={`flex flex-wrap gap-1 rounded-xl bg-muted p-1 ${className}`}
    >
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(tab.value)}
            className={`h-[34px] rounded-[9px] px-3 text-sm font-bold whitespace-nowrap transition-colors max-md:h-10 ${
              selected
                ? "bg-card text-foreground shadow-tab"
                : "text-text-secondary hover:text-foreground"
            }`}
          >
            {tab.label}
            {tab.count !== undefined ? ` · ${tab.count}` : ""}
          </button>
        );
      })}
    </div>
  );
}

/** Estado vacío: icono en cuadro suave, título, texto y acción opcional. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  tone = "primary",
  bordered = false,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
  tone?: "primary" | "warning" | "sand";
  /** Tarjeta propia con borde punteado (cuando no va dentro de otra tarjeta). */
  bordered?: boolean;
}) {
  const tones = {
    primary: "bg-primary-soft text-primary",
    warning: "bg-warning-soft text-warning-foreground",
    sand: "bg-accent text-secondary-foreground",
  };
  return (
    <div
      className={`flex flex-col items-center gap-2 px-5 py-11 text-center ${
        bordered ? "rounded-2xl border border-dashed border-button-border bg-card" : ""
      }`}
    >
      <span
        className={`flex size-[46px] items-center justify-center rounded-xl ${tones[tone]}`}
        aria-hidden="true"
      >
        <Icon className="size-6" />
      </span>
      <p className="text-base font-extrabold text-foreground">{title}</p>
      {description ? (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-1">{action}</div> : null}
    </div>
  );
}

/** Paginación compacta: rango a la izquierda, anterior / siguiente a la derecha. */
export function Pager({
  page,
  pageCount,
  total,
  pageSize,
  onChange,
  disabled = false,
  noun = "resultados",
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
  disabled?: boolean;
  noun?: string;
}) {
  if (total <= pageSize) {
    return null;
  }
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const arrow =
    "inline-flex size-[38px] items-center justify-center rounded-[9px] border border-input bg-card text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:text-icon-disabled disabled:hover:bg-card max-md:size-11";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider px-4 py-3 text-sm text-text-secondary">
      <span>
        {start}–{end} de {total} {noun}
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(page - 1)}
          disabled={disabled || page <= 1}
          aria-label="Página anterior"
          className={arrow}
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <span>
          Página {page} de {pageCount}
        </span>
        <button
          type="button"
          onClick={() => onChange(page + 1)}
          disabled={disabled || page >= pageCount}
          aria-label="Página siguiente"
          className={arrow}
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

/** Ruta de regreso: "← Eventos / Nombre del evento". */
export function Breadcrumb({
  to,
  label,
  current,
  actions,
}: {
  to: string;
  label: string;
  current?: string;
  actions?: ReactNode;
}) {
  return (
    <nav
      aria-label="Ruta"
      className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
    >
      <Link
        to={to}
        className="inline-flex min-h-8 items-center gap-1 rounded-lg px-1 py-1.5 font-bold text-primary hover:underline"
      >
        <ArrowLeft className="size-[18px]" aria-hidden="true" />
        {label}
      </Link>
      {current ? (
        <>
          <span aria-hidden="true">/</span>
          <span className="min-w-0 truncate">{current}</span>
        </>
      ) : null}
      {actions ? <div className="ml-auto flex gap-2">{actions}</div> : null}
    </nav>
  );
}

/** Dato con icono (Fecha, Horario, Lugar, Capacidad). */
export function Fact({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <span
        className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-primary-soft text-primary"
        aria-hidden="true"
      >
        <Icon className="size-5" />
      </span>
      <div className="min-w-0">
        <dt className="text-[13px] text-muted-foreground">{label}</dt>
        <dd className="text-[15px] font-bold text-foreground">{children}</dd>
      </div>
    </div>
  );
}

/** Clases de encabezado y celda de tabla, comunes a todos los listados. */
export const TH_CLASS =
  "border-b border-border px-4 py-3 text-left text-[13px] font-bold text-text-secondary";
export const TD_CLASS = "px-4 py-2.5 align-middle";
export const TR_CLASS = "border-t border-divider-soft hover:bg-surface-alt";
