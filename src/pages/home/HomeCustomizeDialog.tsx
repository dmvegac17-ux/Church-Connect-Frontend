import { ArrowDown, ArrowUp, Square, SquareCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "../../components/forms/Button";
import { Modal } from "../../components/ui/Overlay";
import { QUICK_LINK_CATALOG, type QuickLinkKey } from "../../config/navigation";
import {
  cloneHomeConfig,
  HOME_DEFAULT,
  HOME_SECTIONS,
  QUICK_LINKS_MAX,
  sameHomeConfig,
  type HomeConfig,
  type HomeSection,
} from "../../lib/homeConfig";

const ARROW_CLASS =
  "flex size-9 items-center justify-center rounded-lg text-text-secondary hover:bg-hover-icon disabled:cursor-not-allowed disabled:text-icon-disabled disabled:hover:bg-transparent max-md:size-11";

interface HomeCustomizeDialogProps {
  open: boolean;
  /** Configuración vigente: el borrador parte de aquí al abrir. */
  config: HomeConfig;
  onSave: (config: HomeConfig) => void;
  onClose: () => void;
}

/**
 * «Personalizar inicio»: interruptores por sección y selección ordenada de
 * accesos rápidos (máximo 6). Nada cambia hasta pulsar Guardar.
 */
export function HomeCustomizeDialog({
  open,
  config,
  onSave,
  onClose,
}: HomeCustomizeDialogProps) {
  const [draft, setDraft] = useState<HomeConfig>(() => cloneHomeConfig(config));

  useEffect(() => {
    if (open) {
      setDraft(cloneHomeConfig(config));
    }
  }, [open, config]);

  const selected = draft.keys;
  const full = selected.length >= QUICK_LINKS_MAX;
  const changed = !sameHomeConfig(draft, config);

  const toggleSection = (key: HomeSection) =>
    setDraft((prev) => ({ ...prev, [key]: !prev[key] }));

  const toggleLink = (key: QuickLinkKey) =>
    setDraft((prev) => ({
      ...prev,
      keys: prev.keys.includes(key)
        ? prev.keys.filter((k) => k !== key)
        : [...prev.keys, key],
    }));

  const move = (key: QuickLinkKey, direction: -1 | 1) =>
    setDraft((prev) => {
      const keys = [...prev.keys];
      const from = keys.indexOf(key);
      const to = from + direction;
      if (to < 0 || to >= keys.length) {
        return prev;
      }
      [keys[from], keys[to]] = [keys[to], keys[from]];
      return { ...prev, keys };
    });

  // Los marcados van primero y en su orden; debajo, el resto del catálogo.
  const items = [
    ...selected.flatMap((key) => QUICK_LINK_CATALOG.filter((q) => q.key === key)),
    ...QUICK_LINK_CATALOG.filter((q) => !selected.includes(q.key)),
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Personalizar inicio"
      subtitle="Elige qué ver en tu inicio y qué atajos tener a mano."
      footer={
        <div className="flex flex-wrap justify-between gap-2.5">
          <button
            type="button"
            onClick={() => setDraft(cloneHomeConfig(HOME_DEFAULT))}
            className="h-11 rounded-lg px-3 text-[15px] font-bold text-primary hover:underline"
          >
            Restablecer
          </button>
          <div className="flex gap-2.5">
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={() => onSave(cloneHomeConfig(draft))} disabled={!changed}>
              Guardar
            </Button>
          </div>
        </div>
      }
    >
      <div className="flex flex-col gap-[22px] px-6 py-[18px]">
        <section className="flex flex-col gap-1">
          <h3 className="mb-1.5 text-[15px] font-extrabold">Secciones</h3>
          {HOME_SECTIONS.map(({ key, label, description }) => {
            const on = draft[key];
            return (
              <div
                key={key}
                className="flex items-center gap-3.5 border-t border-divider-soft py-2.5"
              >
                <span className="flex flex-1 flex-col">
                  <span className="text-[15px] font-bold">{label}</span>
                  <span className="text-[13px] text-muted-foreground">{description}</span>
                </span>
                <span className="min-w-12 text-right text-[13px] text-text-secondary">
                  {on ? "Visible" : "Oculto"}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={label}
                  onClick={() => toggleSection(key)}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${
                    on ? "bg-primary" : "bg-[#C9C3B7]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 size-6 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,0.2)] transition-[left] ${
                      on ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            );
          })}
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-[15px] font-extrabold">Accesos rápidos</h3>
            {draft.quick ? (
              <span className="text-[13px] text-muted-foreground">
                {selected.length} de {QUICK_LINKS_MAX} seleccionados
              </span>
            ) : null}
          </div>

          {draft.quick ? (
            <>
              <span className="text-[13px] text-muted-foreground">
                Marca los que quieras mostrar y ordénalos con las flechas.
              </span>
              <ul className="overflow-hidden rounded-xl border border-border">
                {items.map(({ key, label, icon: Icon }, index) => {
                  const on = selected.includes(key);
                  const position = selected.indexOf(key);
                  const disabled = !on && full;
                  const Box = on ? SquareCheck : Square;
                  return (
                    <li
                      key={key}
                      className={`flex items-center gap-2 py-1.5 pr-2 pl-1 ${
                        index > 0 ? "border-t border-divider-soft" : ""
                      } ${on ? "bg-[#F7FAF6]" : "bg-card"}`}
                    >
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        aria-disabled={disabled}
                        onClick={disabled ? undefined : () => toggleLink(key)}
                        className={`flex min-h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 text-left ${
                          disabled ? "cursor-not-allowed" : "cursor-pointer"
                        }`}
                      >
                        <Box
                          className={`size-[22px] shrink-0 ${
                            on
                              ? "text-primary"
                              : disabled
                                ? "text-[#C9C6BD]"
                                : "text-icon-neutral"
                          }`}
                          aria-hidden="true"
                        />
                        <span
                          aria-hidden="true"
                          className="flex size-8 shrink-0 items-center justify-center rounded-[9px] bg-primary-soft text-primary"
                        >
                          <Icon className="size-[18px]" />
                        </span>
                        <span
                          className={`text-[15px] font-bold ${
                            disabled ? "text-icon-neutral" : "text-foreground"
                          }`}
                        >
                          {label}
                        </span>
                      </button>
                      {on ? (
                        <>
                          <span
                            aria-hidden="true"
                            className="min-w-4 text-center text-xs font-extrabold text-primary"
                          >
                            {position + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => move(key, -1)}
                            disabled={position <= 0}
                            aria-label={`Subir ${label}`}
                            className={ARROW_CLASS}
                          >
                            <ArrowUp className="size-5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => move(key, 1)}
                            disabled={position === selected.length - 1}
                            aria-label={`Bajar ${label}`}
                            className={ARROW_CLASS}
                          >
                            <ArrowDown className="size-5" aria-hidden="true" />
                          </button>
                        </>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
              {full ? (
                <span className="text-[13px] font-bold text-warning-foreground">
                  Puedes tener hasta {QUICK_LINKS_MAX} accesos. Quita uno para agregar otro.
                </span>
              ) : null}
              {selected.length === 0 ? (
                <span className="text-[13px] font-bold text-warning-foreground">
                  Sin accesos marcados, la sección no se mostrará.
                </span>
              ) : null}
            </>
          ) : (
            <p className="rounded-[10px] bg-background px-3.5 py-3 text-sm text-text-secondary">
              Los accesos rápidos están ocultos. Actívalos en «Secciones» para elegirlos.
            </p>
          )}
        </section>
      </div>
    </Modal>
  );
}
