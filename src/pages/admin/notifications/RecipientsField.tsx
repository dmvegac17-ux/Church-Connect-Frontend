import { ChevronDown, ChevronUp, Square, SquareCheck, UsersRound } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";

import { Button } from "../../../components/forms/Button";
import { FieldError } from "../../../components/forms/fieldStyles";
import { fullNameOf, matchesPerson } from "../../../lib/people";
import type { User } from "../../../types/user";

interface RecipientsFieldProps {
  users: User[];
  loading: boolean;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  error?: string;
}

const QUICK_CLASS =
  "min-h-8 rounded px-0.5 text-[13px] font-bold text-primary hover:underline disabled:cursor-not-allowed disabled:!text-disabled-foreground disabled:no-underline";

/** Cuántos nombres se escriben antes de resumir con "y N más". */
const NAMES_SHOWN = 2;

/**
 * Campo "Destinatarios" del redactor: un selector que resume a quién se
 * envía ("Ana, Luis y 4 más"), los accesos rápidos siempre a la vista
 * ("Todos los activos", "Todos", "Limpiar") y, al abrirlo, un panel con
 * buscador y la lista con casillas para elegir uno por uno.
 */
export function RecipientsField({
  users,
  loading,
  selectedIds,
  onChange,
  error,
}: RecipientsFieldProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const close = (returnFocus: boolean) => {
    setOpen(false);
    setQuery("");
    if (returnFocus) {
      triggerRef.current?.focus();
    }
  };

  useEffect(() => {
    if (!open) {
      return;
    }
    searchRef.current?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    // La lista de destinatarios se cierra antes que el redactor.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        e.preventDefault();
        setOpen(false);
        setQuery("");
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const selected = new Set(selectedIds);
  const chosen = users.filter((u) => selected.has(u.id));
  const matches = users.filter((u) => matchesPerson(u, query));
  const count = chosen.length;

  const names = chosen.slice(0, NAMES_SHOWN).map(fullNameOf).join(", ");
  const extra = count > NAMES_SHOWN ? ` y ${count - NAMES_SHOWN} más` : "";

  const toggle = (userId: string) =>
    onChange(
      selected.has(userId)
        ? selectedIds.filter((x) => x !== userId)
        : [...selectedIds, userId],
    );

  return (
    <section
      ref={containerRef}
      className="flex flex-col gap-2.5 rounded-2xl border border-border bg-surface-alt p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h3
          id={`${id}-label`}
          className="flex items-center gap-2 text-base font-extrabold text-foreground"
        >
          <UsersRound className="size-5 text-primary" aria-hidden="true" />
          Destinatarios
          <span className="text-destructive" aria-hidden="true">
            *
          </span>
          <span className="sr-only">(obligatorio)</span>
        </h3>
        {/* Accesos rápidos siempre a la vista, como enlaces sencillos. */}
        <div className="flex flex-wrap gap-x-3">
          <button
            type="button"
            className={QUICK_CLASS}
            onClick={() =>
              onChange(users.filter((u) => u.activo !== false).map((u) => u.id))
            }
          >
            Todos los activos
          </button>
          <button
            type="button"
            className={QUICK_CLASS}
            onClick={() => onChange(users.map((u) => u.id))}
          >
            Todos
          </button>
          <button
            type="button"
            className={`${QUICK_CLASS} !text-text-secondary`}
            onClick={() => onChange([])}
            disabled={count === 0}
          >
            Limpiar
          </button>
        </div>
      </div>

      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${id}-panel` : undefined}
        aria-labelledby={`${id}-label ${id}-summary`}
        aria-invalid={error ? true : undefined}
        disabled={loading && users.length === 0}
        onClick={() => (open ? close(false) : setOpen(true))}
        className={`flex min-h-[52px] w-full items-center justify-between gap-3 rounded-xl border bg-input-auth px-4 py-2.5 text-left text-[15px] transition-colors focus-visible:border-primary focus-visible:outline-primary-soft-border focus-visible:outline-offset-0 disabled:cursor-not-allowed ${
          error
            ? "border-destructive"
            : open
              ? "border-primary outline-[3px] outline-primary-soft-border outline-solid"
              : "border-input"
        }`}
      >
        {/* Si no cabe, se recortan los nombres; "y N más" siempre queda a la vista. */}
        <span id={`${id}-summary`} className="flex min-w-0 flex-1">
          {count === 0 ? (
            <span className="truncate text-muted-foreground">
              {loading ? "Cargando usuarios…" : "Elige destinatarios"}
            </span>
          ) : (
            <>
              <span className="truncate text-foreground">{names}</span>
              {extra ? (
                <span className="shrink-0 whitespace-pre text-foreground">
                  {extra}
                </span>
              ) : null}
            </>
          )}
        </span>
        {open ? (
          <ChevronUp className="size-5 shrink-0 text-text-secondary" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-5 shrink-0 text-text-secondary" aria-hidden="true" />
        )}
      </button>
      {error ? <FieldError>{error}</FieldError> : null}

      {open ? (
        <div
          id={`${id}-panel`}
          className="overflow-hidden rounded-xl border border-border bg-card"
        >
          <div className="border-b border-divider p-3">
            <input
              ref={searchRef}
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar persona"
              aria-label="Buscar persona por nombre o correo"
              className="h-11 w-full rounded-[10px] border border-input bg-card px-3 text-[15px] placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-primary-soft-border focus-visible:outline-offset-0"
            />
          </div>

          <ul
            role="listbox"
            aria-multiselectable="true"
            aria-labelledby={`${id}-label`}
            className="max-h-[260px] overflow-y-auto"
          >
            {matches.length === 0 ? (
              <li className="px-4 py-5 text-center text-sm text-muted-foreground">
                {loading ? "Cargando usuarios…" : "Ninguna persona coincide."}
              </li>
            ) : (
              matches.map((u) => {
                const isSelected = selected.has(u.id);
                return (
                  <li
                    key={u.id}
                    role="option"
                    aria-selected={isSelected}
                    className="border-t border-divider-soft first:border-t-0"
                  >
                    {/* Al seleccionar se marca solo la casilla; el nombre no se resalta. */}
                    <button
                      type="button"
                      onClick={() => toggle(u.id)}
                      className="flex min-h-[60px] w-full items-center gap-3.5 px-4 py-2 text-left hover:bg-surface-alt"
                    >
                      {isSelected ? (
                        <SquareCheck
                          className="size-6 shrink-0 text-primary"
                          aria-hidden="true"
                        />
                      ) : (
                        <Square
                          className="size-6 shrink-0 text-icon-muted"
                          aria-hidden="true"
                        />
                      )}
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="truncate text-[15px] font-extrabold text-foreground">
                          {fullNameOf(u)}
                          {u.activo === false ? (
                            <span className="font-normal text-muted-foreground">
                              {" "}
                              · Inactivo
                            </span>
                          ) : null}
                        </span>
                        <span className="truncate text-[13px] text-muted-foreground">
                          {u.correo}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })
            )}
          </ul>

          <div className="flex items-center justify-between gap-3 border-t border-divider p-3">
            <span className="text-sm text-muted-foreground" role="status">
              {count} {count === 1 ? "seleccionado" : "seleccionados"}
            </span>
            <Button size="sm" onClick={() => close(true)}>
              Listo
            </Button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
