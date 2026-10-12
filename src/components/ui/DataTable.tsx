import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
} from "lucide-react";
import { useCallback, useMemo, useState, type ReactNode } from "react";

import { TH_CLASS } from "./primitives";

/*
 * Tabla de datos del panel de administración: orden por columna y paginador
 * con tamaño de página. El orden y la página se guardan por tabla mientras
 * dure la sesión de la pestaña.
 */

export const PAGE_SIZES = [10, 25, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 10;

export type SortDirection = "asc" | "desc";

export interface SortState<C extends string> {
  column: C;
  direction: SortDirection;
}

interface StoredTable {
  sort: SortState<string> | null;
  page: number;
  pageSize: number;
}

const STORE = new Map<string, StoredTable>();

/** Solo para pruebas: olvida el estado guardado de todas las tablas. */
export function resetTableStore(): void {
  STORE.clear();
}

type Accessor<T> = (row: T) => string | number | null | undefined;

function compare(a: ReturnType<Accessor<unknown>>, b: ReturnType<Accessor<unknown>>) {
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  }
  return String(a ?? "").localeCompare(String(b ?? ""), "es", {
    numeric: true,
    sensitivity: "base",
  });
}

export interface TableState<T, C extends string> {
  /** Filas de la página actual, ya ordenadas. */
  rows: T[];
  total: number;
  sort: SortState<C> | null;
  /** Ascendente → descendente → sin orden. Vuelve a la página 1. */
  toggleSort: (column: C) => void;
  page: number;
  pageCount: number;
  pageSize: number;
  setPage: (page: number) => void;
  /** Cambiar el tamaño vuelve a la página 1. */
  setPageSize: (size: number) => void;
}

/**
 * Ordena y pagina en el cliente. `key` identifica la tabla para recordar su
 * orden y su paginador; `accessors` define por qué valor ordena cada columna.
 */
export function useTableState<T, C extends string>(
  key: string,
  items: T[],
  accessors: Record<C, Accessor<T>>,
): TableState<T, C> {
  const [state, setState] = useState<StoredTable>(
    () => STORE.get(key) ?? { sort: null, page: 1, pageSize: DEFAULT_PAGE_SIZE },
  );

  const update = useCallback(
    (patch: Partial<StoredTable>) =>
      setState((prev) => {
        const next = { ...prev, ...patch };
        STORE.set(key, next);
        return next;
      }),
    [key],
  );

  const sort = state.sort as SortState<C> | null;

  const sorted = useMemo(() => {
    const accessor = sort ? accessors[sort.column] : undefined;
    if (!sort || !accessor) {
      return items;
    }
    const factor = sort.direction === "desc" ? -1 : 1;
    return [...items].sort((a, b) => compare(accessor(a), accessor(b)) * factor);
    // `accessors` se declara junto a la tabla: su identidad no cambia el orden.
  }, [items, sort?.column, sort?.direction]);

  const total = sorted.length;
  const pageCount = Math.max(1, Math.ceil(total / state.pageSize));
  // Al filtrar puede quedar una página que ya no existe.
  const page = Math.min(state.page, pageCount);
  const start = (page - 1) * state.pageSize;

  return {
    rows: sorted.slice(start, start + state.pageSize),
    total,
    sort,
    toggleSort: (column) => {
      const next: SortState<C> | null =
        !sort || sort.column !== column
          ? { column, direction: "asc" }
          : sort.direction === "asc"
            ? { column, direction: "desc" }
            : null;
      update({ sort: next, page: 1 });
    },
    page,
    pageCount,
    pageSize: state.pageSize,
    setPage: (next) => update({ page: Math.min(Math.max(1, next), pageCount) }),
    setPageSize: (size) => update({ pageSize: size, page: 1 }),
  };
}

/** Encabezado ordenable: botón con flecha (o icono neutro) y `aria-sort`. */
export function SortHeader<C extends string>({
  column,
  table,
  children,
  className = "",
  align = "left",
}: {
  column: C;
  table: Pick<TableState<unknown, C>, "sort" | "toggleSort">;
  children: ReactNode;
  className?: string;
  align?: "left" | "right";
}) {
  const active = table.sort?.column === column ? table.sort.direction : null;
  const Icon = active === "asc" ? ArrowUp : active === "desc" ? ArrowDown : ChevronsUpDown;
  const label = typeof children === "string" ? children.toLowerCase() : "esta columna";

  return (
    <th
      scope="col"
      aria-sort={
        active === "asc" ? "ascending" : active === "desc" ? "descending" : "none"
      }
      className={`${TH_CLASS} ${align === "right" ? "!text-right" : ""} ${className}`}
    >
      <button
        type="button"
        onClick={() => table.toggleSort(column)}
        title={`Ordenar por ${label}`}
        className={`-mx-1.5 -my-1 inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[13px] font-bold hover:bg-muted ${
          active ? "text-foreground" : "text-text-secondary"
        }`}
      >
        {children}
        <Icon
          className={`size-4 ${active ? "text-primary-hover" : "text-icon-neutral"}`}
          aria-hidden="true"
        />
      </button>
    </th>
  );
}

const ARROW_CLASS =
  "inline-flex size-9 items-center justify-center rounded-[9px] border border-input bg-card text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:text-icon-disabled disabled:hover:bg-card max-md:size-11";

/**
 * Paginador de tabla: «Filas por página», rango «1–10 de 150» y primera /
 * anterior / «Página X de Y» / siguiente / última. Se oculta sin filas.
 */
export function TablePager({
  table,
}: {
  table: Pick<
    TableState<unknown, string>,
    "total" | "page" | "pageCount" | "pageSize" | "setPage" | "setPageSize"
  >;
}) {
  const { total, page, pageCount, pageSize, setPage, setPageSize } = table;
  if (total === 0) {
    return null;
  }
  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const isFirst = page <= 1;
  const isLast = page >= pageCount;

  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5 border-t border-divider px-4 py-2.5 text-sm text-text-secondary">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2">
          Filas por página
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="h-[34px] rounded-lg border border-input bg-card px-2 text-sm text-foreground max-md:h-11"
          >
            {PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
        <span aria-live="polite">
          {start}–{end} de {total}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setPage(1)}
          disabled={isFirst}
          aria-label="Primera página"
          title="Primera página"
          className={ARROW_CLASS}
        >
          <ChevronsLeft className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setPage(page - 1)}
          disabled={isFirst}
          aria-label="Página anterior"
          title="Página anterior"
          className={ARROW_CLASS}
        >
          <ChevronLeft className="size-5" aria-hidden="true" />
        </button>
        <span className="px-1.5 whitespace-nowrap">
          Página {page} de {pageCount}
        </span>
        <button
          type="button"
          onClick={() => setPage(page + 1)}
          disabled={isLast}
          aria-label="Página siguiente"
          title="Página siguiente"
          className={ARROW_CLASS}
        >
          <ChevronRight className="size-5" aria-hidden="true" />
        </button>
        <button
          type="button"
          onClick={() => setPage(pageCount)}
          disabled={isLast}
          aria-label="Última página"
          title="Última página"
          className={ARROW_CLASS}
        >
          <ChevronsRight className="size-5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
