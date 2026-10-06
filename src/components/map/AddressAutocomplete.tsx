import { MapPin } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import {
  searchAddressSuggestions,
  type AddressSuggestion,
} from "../../lib/geocoding";
import { TextField } from "../forms/TextField";

interface AddressAutocompleteProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  /** Se eligió una sugerencia de la lista (trae coordenadas). */
  onSelect: (suggestion: AddressSuggestion) => void;
  onBlur?: () => void;
  /** Prioriza sugerencias cercanas a este punto. */
  bias?: { lat: number; lon: number } | null;
  maxLength?: number;
  error?: string;
  hint?: string;
}

const MIN_CHARS = 3;
const DEBOUNCE_MS = 350;

/**
 * Campo de dirección con sugerencias mientras se escribe. Sigue siendo
 * texto libre: elegir una sugerencia es opcional y solo añade coordenadas.
 */
export function AddressAutocomplete({
  label,
  name,
  value,
  onChange,
  onSelect,
  onBlur,
  bias,
  maxLength,
  error,
  hint,
}: AddressAutocompleteProps) {
  const listId = useId();
  // Solo lo que el usuario teclea dispara búsquedas (no el valor inicial al
  // editar, ni el texto que se rellena al elegir una sugerencia).
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const biasRef = useRef(bias);
  biasRef.current = bias;

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < MIN_CHARS) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const results = await searchAddressSuggestions(trimmed, {
          signal: controller.signal,
          bias: biasRef.current,
        });
        setSuggestions(results);
        setActiveIndex(-1);
        setLoading(false);
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  const select = (suggestion: AddressSuggestion) => {
    setQuery("");
    setSuggestions([]);
    setOpen(false);
    onSelect(suggestion);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!open || suggestions.length === 0) {
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    } else if (e.key === "Enter" && activeIndex >= 0) {
      // Evita enviar el formulario al confirmar una sugerencia.
      e.preventDefault();
      select(suggestions[activeIndex]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const searched = query.trim().length >= MIN_CHARS;
  const showList = open && searched;

  return (
    <div className="relative">
      <TextField
        label={label}
        name={name}
        value={value}
        maxLength={maxLength}
        error={error}
        hint={showList ? undefined : hint}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          showList && activeIndex >= 0 ? `${listId}-${activeIndex}` : undefined
        }
        onChange={(e) => {
          onChange(e.target.value);
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          onBlur?.();
        }}
        onKeyDown={handleKeyDown}
      />
      {showList ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-[1100] mt-1 max-h-64 overflow-auto rounded-lg border border-border bg-card py-1 shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === activeIndex}
              // `mousedown` + preventDefault: se elige sin que el input pierda el foco.
              onMouseDown={(e) => {
                e.preventDefault();
                select(suggestion);
              }}
              onMouseEnter={() => setActiveIndex(index)}
              className={`flex cursor-pointer items-start gap-2 px-3 py-2 text-sm text-foreground ${
                index === activeIndex ? "bg-primary/10" : ""
              }`}
            >
              <MapPin
                className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <span>{suggestion.displayName}</span>
            </li>
          ))}
          {suggestions.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted-foreground">
              {loading
                ? "Buscando direcciones…"
                : "Sin sugerencias. Puedes dejar la dirección como la escribiste y marcar el punto en el mapa."}
            </li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
