import { ChevronDown, ChevronUp, LogOut, Menu, User, X } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { HOME_PATH, MEMBER_NAV, PROFILE_PATH } from "../../config/navigation";
import { useUnreadNotificationsCount } from "../../hooks/useUnreadNotificationsCount";
import { fullNameOf } from "../../lib/people";
import { Avatar } from "../ui/primitives";
import { BrandLogo } from "./BrandLogo";

/**
 * Barra superior de la vista de miembro: logo, navegación horizontal,
 * contador de avisos sin leer y menú de usuario. Por debajo de 920px la
 * navegación pasa a un panel desplegable con ítems de 48px.
 */
export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { count: unreadCount } = useUnreadNotificationsCount();
  const unreadLabel = unreadCount >= 100 ? "99+" : String(unreadCount);

  const menuId = useId();
  const panelId = useId();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const menuContainerRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const fullName = user ? fullNameOf(user) : "Mi cuenta";

  // Navegar a otra vista cierra ambos menús.
  useEffect(() => {
    setMenuOpen(false);
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }
    const onPointerDown = (e: PointerEvent) => {
      if (!menuContainerRef.current?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  const menuItems = () =>
    Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
    );

  const handleMenuKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const items = menuItems();
    const current = items.indexOf(document.activeElement as HTMLElement);
    if (e.key === "ArrowDown") {
      e.preventDefault();
      items[(current + 1) % items.length]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      items[(current - 1 + items.length) % items.length]?.focus();
    } else if (e.key === "Escape") {
      e.preventDefault();
      setMenuOpen(false);
      menuButtonRef.current?.focus();
    } else if (e.key === "Tab") {
      setMenuOpen(false);
    }
  };

  const handleMenuButtonKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setMenuOpen(true);
      requestAnimationFrame(() => menuItems()[0]?.focus());
    } else if (e.key === "Escape") {
      setMenuOpen(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <header className="sticky top-0 z-30 bg-header text-header-foreground">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-5 px-5">
        <Link
          to={HOME_PATH}
          aria-label="Church Connect, ir a inicio"
          className="flex shrink-0 items-center gap-2.5 rounded-[10px] p-1"
        >
          <BrandLogo className="size-[34px]" />
          <span className="text-[17px] font-extrabold tracking-[-0.01em] whitespace-nowrap">
            Church Connect
          </span>
        </Link>

        <nav
          aria-label="Principal"
          className="hidden min-w-0 flex-1 gap-0.5 min-[920px]:flex"
        >
          {MEMBER_NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === HOME_PATH}
              className={({ isActive }) =>
                `flex h-10 items-center gap-2 rounded-[10px] px-3 text-[15px] whitespace-nowrap transition-colors hover:bg-white/[0.12] hover:text-white ${
                  isActive
                    ? "bg-white/[0.16] font-extrabold text-white"
                    : "font-semibold text-[#E3ECE5]"
                }`
              }
            >
              {label}
              {to === "/notifications" && unreadCount > 0 ? (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-secondary px-1.5 text-xs font-extrabold text-primary-hover">
                  <span aria-hidden="true">{unreadLabel}</span>
                  <span className="sr-only">{unreadCount} sin leer</span>
                </span>
              ) : null}
            </NavLink>
          ))}
        </nav>
        <div className="flex-1 min-[920px]:hidden" />

        <div
          ref={menuContainerRef}
          className="relative hidden shrink-0 min-[920px]:block"
        >
          <button
            ref={menuButtonRef}
            type="button"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-controls={menuOpen ? menuId : undefined}
            onClick={() => setMenuOpen((v) => !v)}
            onKeyDown={handleMenuButtonKeyDown}
            className="flex h-[42px] items-center gap-2.5 rounded-full border border-white/35 py-0 pr-2.5 pl-1 text-[15px] font-bold transition-colors hover:bg-white/[0.12]"
          >
            <Avatar name={fullName} className="size-8 text-[13px]" />
            <span className="hidden max-w-[200px] truncate min-[1100px]:inline">
              {fullName}
            </span>
            <span className="sr-only min-[1100px]:hidden">{fullName}</span>
            {menuOpen ? (
              <ChevronUp className="size-5" aria-hidden="true" />
            ) : (
              <ChevronDown className="size-5" aria-hidden="true" />
            )}
          </button>

          {menuOpen ? (
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label="Cuenta"
              onKeyDown={handleMenuKeyDown}
              className="absolute top-[50px] right-0 w-[260px] rounded-[14px] border border-border bg-popover p-2 text-popover-foreground shadow-menu"
            >
              <div className="mb-1.5 border-b border-divider px-3 pt-2.5 pb-3">
                <p className="truncate text-[15px] font-bold" title={fullName}>
                  {fullName}
                </p>
                <p className="truncate text-[13px] text-muted-foreground">
                  {user?.correo}
                </p>
              </div>
              <Link
                to={PROFILE_PATH}
                role="menuitem"
                className="flex h-[42px] w-full items-center gap-2.5 rounded-[10px] px-3 text-[15px] text-foreground hover:bg-accent"
              >
                <User className="size-5 text-primary" aria-hidden="true" />
                Mi perfil
              </Link>
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex h-[42px] w-full items-center gap-2.5 rounded-[10px] px-3 text-left text-[15px] text-destructive hover:bg-destructive-soft"
              >
                <LogOut className="size-5" aria-hidden="true" />
                Cerrar sesión
              </button>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          aria-expanded={mobileOpen}
          aria-controls={mobileOpen ? panelId : undefined}
          className="relative flex size-11 items-center justify-center rounded-xl border border-white/35 min-[920px]:hidden"
        >
          {mobileOpen ? (
            <X className="size-6" aria-hidden="true" />
          ) : (
            <Menu className="size-6" aria-hidden="true" />
          )}
          {unreadCount > 0 && !mobileOpen ? (
            <>
              <span
                aria-hidden="true"
                className="absolute top-1.5 right-1.5 size-2.5 rounded-full border-2 border-header bg-secondary"
              />
              <span className="sr-only">
                , {unreadCount} notificaciones sin leer
              </span>
            </>
          ) : null}
        </button>
      </div>

      {mobileOpen ? (
        <div
          id={panelId}
          className="flex flex-col gap-0.5 border-b border-border bg-card px-4 pt-3 pb-4 text-foreground shadow-[0_12px_24px_rgba(35,38,31,0.10)] min-[920px]:hidden"
        >
          <nav aria-label="Principal" className="flex flex-col gap-0.5">
            {MEMBER_NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === HOME_PATH}
                className={({ isActive }) =>
                  `flex h-12 items-center gap-3 rounded-[10px] px-3 text-base ${
                    isActive
                      ? "bg-primary-soft font-extrabold"
                      : "font-semibold hover:bg-accent"
                  }`
                }
              >
                <Icon className="size-[22px] text-primary" aria-hidden="true" />
                <span className="flex-1">{label}</span>
                {to === "/notifications" && unreadCount > 0 ? (
                  <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-primary px-[7px] text-xs font-extrabold text-primary-foreground">
                    <span aria-hidden="true">{unreadLabel}</span>
                    <span className="sr-only">{unreadCount} sin leer</span>
                  </span>
                ) : null}
              </NavLink>
            ))}
          </nav>
          <div className="my-2 h-px bg-divider" />
          <NavLink
            to={PROFILE_PATH}
            className={({ isActive }) =>
              `flex h-12 items-center gap-3 rounded-[10px] px-3 text-base ${
                isActive ? "bg-primary-soft font-extrabold" : "hover:bg-accent"
              }`
            }
          >
            <User className="size-[22px] text-primary" aria-hidden="true" />
            Mi perfil
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-12 items-center gap-3 rounded-[10px] px-3 text-left text-base text-destructive hover:bg-destructive-soft"
          >
            <LogOut className="size-[22px]" aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      ) : null}
    </header>
  );
}
