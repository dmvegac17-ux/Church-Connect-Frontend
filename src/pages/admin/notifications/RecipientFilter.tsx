import { Circle, CircleDot, Square, SquareCheck, UserSearch, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { fullNameOf, matchesPerson } from "../../../lib/people";
import type { User } from "../../../types/user";

export type RecipientScope = "all" | "mine" | "others";

export interface RecipientFilterValue {
  scope: RecipientScope;
  /** Usuarios específicos; si hay alguno, manda sobre `scope`. */
  userIds: string[];
}

export const NO_RECIPIENT_FILTER: RecipientFilterValue = {
  scope: "all",
  userIds: [],
};

const SCOPE_LABELS: Record<RecipientScope, string> = {
  all: "Todos los usuarios",
  mine: "Solo las mías",
  others: "De otros usuarios",
};

/** Cuántos usuarios se listan como máximo (los de más envíos primero). */
const MAX_USERS = 30;

interface RecipientFilterProps {
  value: RecipientFilterValue;
  onChange: (value: RecipientFilterValue) => void;
  users: User[];
  currentUserId: string | undefined;
  /** Notificaciones enviadas a cada usuario (id → cantidad). */
  sentCounts: Map<string, number>;
}

/**
 * Filtro de la bandeja por destinatario: tres opciones rápidas y una lista
 * de usuarios específicos con buscador. El menú se muestra por encima del
 * lector, sin cortarse.
 */
export function RecipientFilter({
  value,
  onChange,
  users,
  currentUserId,
  sentCounts,
}: RecipientFilterProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        e.preventDefault();
        setOpen(false);
        setQuery("");
        inputRef.current?.blur();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const nameOf = (id: string) => {
    const user = users.find((u) => u.id === id);
    return user ? fullNameOf(user) : "Usuario";
  };

  const names = value.userIds.map(nameOf);
  const summary = names.length
    ? names.length <= 2
      ? `Enviadas a ${names.join(" y ")}`
      : `Enviadas a ${names[0]} y ${names.length - 1} más`
    : value.scope === "all"
      ? "Destinatario: todos"
      : SCOPE_LABELS[value.scope];
  const active = value.userIds.length > 0 || value.scope !== "all";

  const count = (id: string) => sentCounts.get(id) ?? 0;
  const list = users
    .filter((u) => matchesPerson(u, query))
    .sort((a, b) => count(b.id) - count(a.id))
    .slice(0, MAX_USERS);

  const toggleUser = (id: string) =>
    onChange({
      scope: "all",
      userIds: value.userIds.includes(id)
        ? value.userIds.filter((x) => x !== id)
        : [...value.userIds, id],
    });

  return (
    <div ref={containerRef} className="relative min-w-0 flex-[1_1_220px]">
      <UserSearch
        className={`pointer-events-none absolute top-1/2 left-[11px] size-5 -translate-y-1/2 ${
          active ? "text-primary" : "text-icon-muted"
        }`}
        aria-hidden="true"
      />
      <input
        ref={inputRef}
        type="search"
        role="combobox"
        aria-label="Filtrar por destinatario"
        aria-expanded={open}
        aria-haspopup="listbox"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={summary}
        className={`h-10 w-full rounded-[10px] border pr-9 pl-[38px] text-sm text-foreground focus-visible:border-primary focus-visible:outline-primary-soft-border focus-visible:outline-offset-0 ${
          active
            ? "border-[#9DB8A4] bg-primary-selected placeholder:font-bold placeholder:text-success-foreground"
            : "border-input bg-card placeholder:text-muted-foreground"
        }`}
      />
      {active ? (
        <button
          type="button"
          onClick={() => {
            onChange(NO_RECIPIENT_FILTER);
            setQuery("");
          }}
          aria-label="Quitar filtro de destinatario"
          title="Quitar filtro"
          className="absolute top-1 right-1 flex size-8 items-center justify-center rounded-lg text-success-foreground hover:bg-primary-soft"
        >
          <X className="size-[18px]" aria-hidden="true" />
        </button>
      ) : null}

      {open ? (
        <div
          role="listbox"
          aria-label="Destinatarios"
          className="absolute top-full right-0 left-0 z-10 mt-1 max-h-[300px] min-w-[260px] overflow-auto rounded-xl border border-input bg-card shadow-[0_12px_28px_rgba(35,38,31,0.16)]"
        >
          {(Object.keys(SCOPE_LABELS) as RecipientScope[]).map((scope) => {
            const selected = value.userIds.length === 0 && value.scope === scope;
            const Icon = selected ? CircleDot : Circle;
            return (
              <button
                key={scope}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange({ scope, userIds: [] });
                  setQuery("");
                  setOpen(false);
                }}
                className="flex min-h-[42px] w-full items-center gap-2.5 border-b border-divider-soft bg-card px-3 py-2 text-left text-sm text-foreground hover:bg-surface-alt"
              >
                <Icon
                  className={`size-5 shrink-0 ${
                    selected ? "text-primary" : "text-[#8A8C83]"
                  }`}
                  aria-hidden="true"
                />
                <span className={selected ? "font-extrabold" : "font-semibold"}>
                  {SCOPE_LABELS[scope]}
                </span>
              </button>
            );
          })}
          <p className="px-3 pt-2 pb-1 text-xs font-extrabold tracking-[0.05em] text-muted-foreground">
            USUARIOS ESPECÍFICOS
          </p>
          {list.map((u) => {
            const selected = value.userIds.includes(u.id);
            const Icon = selected ? SquareCheck : Square;
            const c = count(u.id);
            return (
              <button
                key={u.id}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => toggleUser(u.id)}
                className="flex w-full items-center gap-2.5 border-b border-divider-soft bg-card px-3 py-2 text-left last:border-b-0 hover:bg-surface-alt"
              >
                <Icon
                  className={`size-[22px] shrink-0 ${
                    selected ? "text-primary" : "text-[#8A8C83]"
                  }`}
                  aria-hidden="true"
                />
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="text-sm font-bold text-foreground">
                    {fullNameOf(u)}
                    {u.id === currentUserId ? " (tú)" : ""}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {u.correo}
                  </span>
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {c ? `${c} ${c === 1 ? "enviada" : "enviadas"}` : "Sin envíos"}
                </span>
              </button>
            );
          })}
          {list.length === 0 ? (
            <p className="p-3.5 text-center text-sm text-muted-foreground">
              Ningún usuario coincide.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
