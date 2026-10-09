import { ChevronDown, LogOut, Menu } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { HOME_PATH, modulesFor } from "../../config/navigation";
import { useUnreadNotificationsCount } from "../../hooks/useUnreadNotificationsCount";
import { ROLE_LABELS } from "../../types/user";
import { BrandLogo } from "./BrandLogo";
import { DailyVerse } from "./DailyVerse";

const ITEM_CLASS =
  "flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium outline-none transition focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring/40 active:bg-secondary";

/**
 * Header de una sola línea, fijo arriba y de borde a borde: logo (enlace al
 * inicio) a la izquierda, versículo del día al centro y, a la derecha, un
 * botón de menú desplegable con todos los módulos disponibles para el rol y
 * la opción de cerrar sesión.
 */
export function Navbar() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { count: unreadCount } = useUnreadNotificationsCount();
  const unreadLabel = unreadCount >= 100 ? "99+" : String(unreadCount);

  const menuId = useId();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  /** Qué opción enfocar al abrir (solo cuando se abre con teclado). */
  const focusOnOpen = useRef<"first" | "last" | null>(null);

  const modules = modulesFor(role);
  const fullName = user ? `${user.nombre} ${user.apellido ?? ""}`.trim() : "—";

  const menuItems = () =>
    Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );

  // Navegar a otra vista cierra el menú.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const items = menuItems();
    if (focusOnOpen.current === "first") {
      items[0]?.focus();
    } else if (focusOnOpen.current === "last") {
      items[items.length - 1]?.focus();
    }
    focusOnOpen.current = null;

    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const openWithFocus = (target: "first" | "last") => {
    focusOnOpen.current = target;
    setOpen(true);
  };

  const closeAndRestoreFocus = () => {
    setOpen(false);
    buttonRef.current?.focus();
  };

  const handleButtonKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const target = e.key === "ArrowDown" ? "first" : "last";
      if (open) {
        const items = menuItems();
        (target === "first" ? items[0] : items[items.length - 1])?.focus();
      } else {
        openWithFocus(target);
      }
    } else if (e.key === "Escape" && open) {
      setOpen(false);
    }
  };

  const handleMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = menuItems();
    const current = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(current + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(current - 1 + items.length) % items.length]?.focus();
    } else if (e.key === "Home") {
      e.preventDefault();
      items[0]?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      items[items.length - 1]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      closeAndRestoreFocus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  const handleLogout = () => {
    setOpen(false);
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-40 bg-header text-header-foreground shadow-sm">
      <div className="flex h-14 items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          to={HOME_PATH}
          aria-label="Church Connect, ir al inicio"
          className="inline-flex items-center gap-3 rounded-full py-1 pr-3 pl-1 text-base font-medium whitespace-nowrap outline-none transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white"
        >
          <BrandLogo />
          Church Connect
        </Link>

        <DailyVerse className="hidden min-w-0 flex-1 sm:block" />

        <div ref={containerRef} className="relative shrink-0">
          <button
            ref={buttonRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={open}
            aria-controls={open ? menuId : undefined}
            onClick={(e) => {
              if (open) {
                setOpen(false);
              } else if (e.detail === 0) {
                // Activado con Enter/Espacio: el foco entra al menú.
                openWithFocus("first");
              } else {
                setOpen(true);
              }
            }}
            onKeyDown={handleButtonKeyDown}
            className={`inline-flex items-center gap-2 rounded-lg border border-white/40 px-3 py-1.5 text-sm font-medium outline-none transition hover:bg-white/15 focus-visible:ring-2 focus-visible:ring-white active:bg-white/25 ${
              open ? "bg-white/15" : ""
            }`}
          >
            <span className="relative inline-flex">
              <Menu className="size-4" aria-hidden="true" />
              {unreadCount > 0 ? (
                <span
                  aria-hidden="true"
                  className="absolute -right-1 -top-1 size-2 rounded-full bg-destructive ring-2 ring-header"
                />
              ) : null}
            </span>
            <span className="hidden max-w-[160px] truncate lg:inline">
              {fullName}
            </span>
            <span className="lg:hidden">Menú</span>
            <span className="sr-only">
              {" "}
              — abrir menú de navegación
              {unreadCount > 0 ? `, ${unreadCount} notificaciones sin leer` : ""}
            </span>
            <ChevronDown
              className={`size-4 transition-transform ${open ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
          </button>

          {open ? (
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label="Navegación principal"
              onKeyDown={handleMenuKeyDown}
              className="absolute right-0 top-full mt-2 max-h-[calc(100vh-5rem)] w-64 max-w-[calc(100vw-2rem)] overflow-y-auto rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
            >
              <div className="px-3 py-2">
                <p className="truncate text-sm font-medium text-foreground" title={fullName}>
                  {fullName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {role ? ROLE_LABELS[role] : ""}
                </p>
              </div>
              <div role="separator" className="my-1 border-t border-border" />

              <nav aria-label="Módulos">
                {modules.map(({ to, label, icon: Icon }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={to === HOME_PATH}
                    role="menuitem"
                    tabIndex={-1}
                    onClick={() => setOpen(false)}
                    className={({ isActive }) =>
                      `${ITEM_CLASS} ${
                        isActive
                          ? "bg-secondary text-secondary-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`
                    }
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    <span className="flex-1">{label}</span>
                    {to === "/notifications" && unreadCount > 0 ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold leading-none text-destructive-foreground">
                        <span aria-hidden="true">{unreadLabel}</span>
                        <span className="sr-only">{unreadCount} sin leer</span>
                      </span>
                    ) : null}
                  </NavLink>
                ))}
              </nav>

              <div role="separator" className="my-1 border-t border-border" />
              <button
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={handleLogout}
                className={`${ITEM_CLASS} text-destructive hover:bg-destructive/10`}
              >
                <LogOut className="size-4 shrink-0" aria-hidden="true" />
                Cerrar sesión
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
