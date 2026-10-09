import { Check, ChevronDown, ChevronUp, Search, UserPlus } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";

import { Alert } from "../../../components/feedback/ErrorAlert";
import { Button } from "../../../components/forms/Button";
import { FieldError } from "../../../components/forms/fieldStyles";
import { TextField } from "../../../components/forms/TextField";
import { Avatar } from "../../../components/ui/primitives";
import { fullNameOf, matchesPerson } from "../../../lib/people";
import {
  compactErrors,
  emailError,
  PERSON_NAME_MAX,
  personNameError,
  sanitizeEmail,
  sanitizePersonName,
} from "../../../lib/validators";
import { userService } from "../../../services/userService";
import { ApiError } from "../../../types/api";
import { ROLE_LABELS, type User } from "../../../types/user";

interface ResponsiblePickerProps {
  /** Nombre del responsable tal como se guarda en la actividad. */
  value: string;
  /** `user` es la cuenta elegida: permite enviarle la invitación al guardar. */
  onChange: (name: string, user: User) => void;
  /** Usuarios activos disponibles. */
  users: User[];
  loading: boolean;
  error?: string;
  /** Se invoca con el usuario recién registrado para sumarlo a la lista. */
  onUserCreated: (user: User) => void;
  onBlur?: () => void;
}

/**
 * El backend exige una contraseña al crear un usuario. Al registrar un
 * participante desde el cronograma se genera una provisional que nadie
 * conoce: la cuenta queda creada, pero no puede iniciar sesión hasta que un
 * administrador le asigne una contraseña desde Usuarios.
 */
function provisionalPassword(): string {
  const alphabet =
    "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  const bytes = new Uint32Array(18);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

/**
 * Responsable de una actividad: lista desplegable con buscador y scroll
 * sobre los usuarios activos, más el registro rápido de un participante nuevo.
 */
export function ResponsiblePicker({
  value,
  onChange,
  users,
  loading,
  error,
  onUserCreated,
  onBlur,
}: ResponsiblePickerProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [showNew, setShowNew] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    searchRef.current?.focus();
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
        onBlur?.();
      }
    };
    // La lista se cierra antes que el modal que la contiene.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopImmediatePropagation();
        e.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open, onBlur]);

  const matches = users.filter((u) => matchesPerson(u, query));

  const pick = (user: User) => {
    onChange(fullNameOf(user), user);
    setOpen(false);
    setQuery("");
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span id={`${id}-label`} className="text-[13px] font-bold text-foreground">
        Responsable
      </span>
      <div className="flex flex-wrap items-start gap-2">
        <div ref={containerRef} className="relative min-w-[200px] flex-1">
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            aria-labelledby={`${id}-label ${id}-value`}
            aria-invalid={error ? true : undefined}
            onClick={() => setOpen((v) => !v)}
            className={`flex h-[var(--control-h)] w-full items-center justify-between gap-2 rounded-[10px] border bg-card px-3 text-left text-[15px] focus-visible:border-primary focus-visible:outline-primary-soft-border focus-visible:outline-offset-0 ${
              error ? "border-destructive" : "border-input"
            }`}
          >
            <span
              id={`${id}-value`}
              className={`truncate ${value ? "text-foreground" : "text-muted-foreground"}`}
            >
              {value || (loading ? "Cargando usuarios…" : "Elige un responsable")}
            </span>
            {open ? (
              <ChevronUp className="size-5 shrink-0 text-icon-muted" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-5 shrink-0 text-icon-muted" aria-hidden="true" />
            )}
          </button>

          {open ? (
            <div className="absolute top-full right-0 left-0 z-20 mt-1 overflow-hidden rounded-xl border border-border bg-card shadow-menu">
              <div className="relative border-b border-divider p-2">
                <Search
                  className="pointer-events-none absolute top-1/2 left-5 size-[18px] -translate-y-1/2 text-icon-muted"
                  aria-hidden="true"
                />
                <input
                  ref={searchRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar por nombre o correo"
                  aria-label="Buscar responsable por nombre o correo"
                  className="h-10 w-full rounded-lg border border-input bg-card pr-3 pl-9 text-sm focus-visible:border-primary focus-visible:outline-primary-soft-border focus-visible:outline-offset-0"
                />
              </div>
              <ul
                role="listbox"
                aria-labelledby={`${id}-label`}
                className="max-h-[220px] overflow-y-auto py-1"
              >
                {matches.length === 0 ? (
                  <li className="px-3 py-4 text-center text-sm text-muted-foreground">
                    {loading
                      ? "Cargando usuarios…"
                      : "Ningún usuario activo coincide. Puedes registrar un participante nuevo."}
                  </li>
                ) : (
                  matches.map((u) => {
                    const name = fullNameOf(u);
                    const selected = name === value;
                    return (
                      <li key={u.id} role="option" aria-selected={selected}>
                        <button
                          type="button"
                          onClick={() => pick(u)}
                          className={`flex min-h-11 w-full items-center gap-2.5 px-3 py-1.5 text-left hover:bg-accent ${
                            selected ? "bg-primary-selected" : ""
                          }`}
                        >
                          <Avatar name={name} className="size-8 text-xs" />
                          <span className="flex min-w-0 flex-1 flex-col">
                            <span className="truncate text-sm font-bold text-foreground">
                              {name}
                              <span className="font-normal text-muted-foreground">
                                {" "}
                                · {ROLE_LABELS[u.rol]}
                              </span>
                            </span>
                            <span className="truncate text-[13px] text-muted-foreground">
                              {u.correo}
                            </span>
                          </span>
                          {selected ? (
                            <Check
                              className="size-5 shrink-0 text-primary"
                              aria-hidden="true"
                            />
                          ) : null}
                        </button>
                      </li>
                    );
                  })
                )}
              </ul>
            </div>
          ) : null}
        </div>

        <Button
          variant="soft"
          aria-expanded={showNew}
          onClick={() => setShowNew((v) => !v)}
          className="!text-sm"
        >
          <UserPlus className="size-[18px]" aria-hidden="true" />
          Registrar participante nuevo
        </Button>
      </div>
      {error ? <FieldError>{error}</FieldError> : null}

      {showNew ? (
        <NewParticipantForm
          existing={users}
          onCancel={() => setShowNew(false)}
          onCreated={(user) => {
            onUserCreated(user);
            onChange(fullNameOf(user), user);
            setShowNew(false);
          }}
        />
      ) : null}
    </div>
  );
}

function NewParticipantForm({
  existing,
  onCancel,
  onCreated,
}: {
  existing: User[];
  onCancel: () => void;
  onCreated: (user: User) => void;
}) {
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [correo, setCorreo] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [duplicate, setDuplicate] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  const alreadyListed = existing.some(
    (u) => u.correo.toLowerCase() === correo.trim().toLowerCase(),
  );
  const errors = {
    nombre: personNameError(nombre, "nombre"),
    apellido: personNameError(apellido, "apellido"),
    correo:
      emailError(correo) ??
      (alreadyListed || duplicate
        ? "Ya existe un usuario con este correo: elígelo de la lista."
        : undefined),
  };
  const valid = Object.keys(compactErrors(errors)).length === 0;
  const shown = (key: keyof typeof errors) =>
    touched[key] || (key === "correo" && (alreadyListed || duplicate))
      ? errors[key]
      : undefined;
  const touch = (key: string) => setTouched((prev) => ({ ...prev, [key]: true }));

  // Va dentro del modal, que no es un <form>: se envía con el botón o con Enter.
  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!valid || submitting) {
      return;
    }
    setSubmitting(true);
    setFailure(null);
    try {
      const created = await userService.create({
        nombre: nombre.trim(),
        apellido: apellido.trim(),
        correo: correo.trim(),
        contrasena: provisionalPassword(),
        rol: "PARTICIPANT",
        activo: true,
      });
      onCreated(created);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setDuplicate(true);
      } else {
        setFailure(
          err instanceof ApiError
            ? err.message
            : "No se pudo registrar al participante. Inténtalo de nuevo.",
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="group"
      aria-label="Registrar participante nuevo"
      onKeyDown={(e) => {
        if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT") {
          void submit();
        }
      }}
      className="mt-1 flex flex-col gap-3 rounded-xl border border-primary-soft-border bg-primary-selected p-3.5"
    >
      <p className="text-[13px] leading-snug text-text-secondary">
        Se creará su cuenta con el rol <strong>Participante</strong> y quedará
        como responsable. Para que pueda iniciar sesión y confirmar su
        participación, asígnale después una contraseña desde Usuarios.
      </p>
      {failure ? <Alert variant="error" message={failure} /> : null}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField
          label="Nombre"
          hideCounter
          maxLength={PERSON_NAME_MAX}
          value={nombre}
          onChange={(e) => setNombre(sanitizePersonName(e.target.value))}
          onBlur={() => touch("nombre")}
          error={shown("nombre")}
        />
        <TextField
          label="Apellido"
          hideCounter
          maxLength={PERSON_NAME_MAX}
          value={apellido}
          onChange={(e) => setApellido(sanitizePersonName(e.target.value))}
          onBlur={() => touch("apellido")}
          error={shown("apellido")}
        />
        <div className="sm:col-span-2">
          <TextField
            label="Correo"
            type="email"
            autoComplete="off"
            hideCounter
            value={correo}
            onChange={(e) => {
              setCorreo(sanitizeEmail(e.target.value));
              setDuplicate(false);
            }}
            onBlur={() => touch("correo")}
            error={shown("correo")}
          />
        </div>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="secondary" size="sm" onClick={onCancel} disabled={submitting}>
          Cancelar
        </Button>
        <Button
          size="sm"
          onClick={() => void submit()}
          loading={submitting}
          loadingLabel="Registrando…"
          disabled={!valid}
        >
          Registrar participante
        </Button>
      </div>
    </div>
  );
}
