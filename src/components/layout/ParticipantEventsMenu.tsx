import { ChevronDown, ChevronUp } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { NavLink, useLocation } from "react-router-dom";

import { PARTICIPANT_EVENT_MENU, PARTICIPATIONS_PATH } from "../../config/navigation";

/**
 * Menú "Eventos" de la barra superior del participante: eventos, cronogramas
 * y la confirmación de sus invitaciones, con el número de pendientes.
 */
export function ParticipantEventsMenu({ pendingCount }: { pendingCount: number }) {
  const { pathname } = useLocation();
  const menuId = useId();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const openedByHover = useRef(false);

  const active = PARTICIPANT_EVENT_MENU.some(
    ({ to }) => pathname === to || pathname.startsWith(`${to}/`),
  );
  const pendingLabel = pendingCount >= 100 ? "99+" : String(pendingCount);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const items = () =>
    Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );

  const onButtonKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => items()[0]?.focus());
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const onMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const list = items();
    const current = list.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      list[(current + 1) % list.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      list[(current - 1 + list.length) % list.length]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      buttonRef.current?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className="relative"
      onMouseEnter={() => {
        openedByHover.current = !open;
        setOpen(true);
      }}
      onMouseLeave={() => {
        openedByHover.current = false;
        setOpen(false);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => {
          // El clic que sigue al hover no debe cerrar lo que el hover abrió.
          if (openedByHover.current) {
            openedByHover.current = false;
            return;
          }
          setOpen((v) => !v);
        }}
        onKeyDown={onButtonKeyDown}
        className={`flex h-10 items-center gap-1.5 rounded-[10px] pr-2 pl-3 text-[15px] whitespace-nowrap transition-colors hover:bg-white/[0.12] hover:text-white ${
          active
            ? "bg-white/[0.16] font-extrabold text-white"
            : "font-semibold text-[#E3ECE5]"
        }`}
      >
        Eventos
        {pendingCount > 0 ? (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-xs font-extrabold text-primary-hover">
            <span aria-hidden="true">{pendingLabel}</span>
            <span className="sr-only">
              {pendingCount} participaciones pendientes
            </span>
          </span>
        ) : null}
        {open ? (
          <ChevronUp className="size-5" aria-hidden="true" />
        ) : (
          <ChevronDown className="size-5" aria-hidden="true" />
        )}
      </button>

      {open ? (
        // El relleno superior une botón y panel para no perder el hover.
        <div className="absolute top-full left-0 z-40 pt-2">
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="Eventos"
            onKeyDown={onMenuKeyDown}
            className="flex w-80 flex-col gap-0.5 rounded-[14px] border border-border bg-popover p-1.5 text-popover-foreground shadow-menu"
          >
            {PARTICIPANT_EVENT_MENU.map(({ to, label, description, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                role="menuitem"
                className={({ isActive }) =>
                  `flex items-start gap-3 rounded-[10px] px-3 py-2.5 text-foreground hover:bg-accent ${
                    isActive ? "bg-primary-soft" : ""
                  }`
                }
              >
                <span
                  aria-hidden="true"
                  className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-primary-soft text-primary"
                >
                  <Icon className="size-[19px]" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-[15px] font-bold">{label}</span>
                  <span className="text-[13px] leading-snug text-muted-foreground">
                    {description}
                  </span>
                </span>
                {to === PARTICIPATIONS_PATH && pendingCount > 0 ? (
                  <span className="flex h-[22px] min-w-[22px] shrink-0 items-center justify-center rounded-full bg-primary px-[7px] text-xs font-extrabold text-primary-foreground">
                    <span aria-hidden="true">{pendingLabel}</span>
                    <span className="sr-only">{pendingCount} pendientes</span>
                  </span>
                ) : null}
              </NavLink>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
