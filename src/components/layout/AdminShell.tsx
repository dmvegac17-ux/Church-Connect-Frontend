import { LogOut, Menu, User, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import {
  ADMIN_NAV_MAIN,
  ADMIN_NAV_MANAGE,
  HOME_PATH,
  PROFILE_PATH,
  type NavItem,
} from "../../config/navigation";
import { fullNameOf } from "../../lib/people";
import { Avatar } from "../ui/primitives";
import { BrandLogo } from "./BrandLogo";

function navItemClass(isActive: boolean, tall: boolean): string {
  return `flex items-center gap-3 rounded-[10px] px-3 transition-colors hover:bg-white/10 hover:text-white ${
    tall ? "h-12 text-base" : "h-[42px] text-[15px]"
  } ${
    isActive
      ? "bg-sidebar-accent font-extrabold text-white"
      : "font-semibold text-[#E3ECE5]"
  }`;
}

function NavItems({ items, tall }: { items: readonly NavItem[]; tall: boolean }) {
  return (
    <>
      {items.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === HOME_PATH}
          className={({ isActive }) => navItemClass(isActive, tall)}
        >
          <Icon
            className={tall ? "size-[22px]" : "size-[21px]"}
            aria-hidden="true"
          />
          {label}
        </NavLink>
      ))}
    </>
  );
}

/**
 * Layout exclusivo del panel de administración: barra lateral fija de 252px
 * que, por debajo de 960px, pasa a una barra superior con un panel
 * deslizable. Los valores propios del perfil (controles de 42px, tarjetas de
 * 14px) viven en este contenedor; no alcanzan a la vista de miembro.
 */
export function AdminShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const panelId = useId();
  const [navOpen, setNavOpen] = useState(false);

  const fullName = user ? fullNameOf(user) : "Administrador";

  // Navegar cierra el panel móvil.
  useEffect(() => {
    setNavOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!navOpen) {
      return;
    }
    // Último en la cadena de Escape: se cierra solo si nada más lo atendió.
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        setNavOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [navOpen]);

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-background [--card-radius:14px] [--control-h:42px]">
      <aside
        aria-label="Panel de administración"
        className="sticky top-0 hidden h-screen w-[252px] shrink-0 flex-col overflow-y-auto bg-sidebar px-3.5 py-[18px] text-sidebar-foreground min-[960px]:flex"
      >
        <Link
          to={HOME_PATH}
          aria-label="Church Connect, ir al inicio"
          className="flex items-center gap-2.5 rounded-[10px] p-1.5"
        >
          <BrandLogo className="size-[34px]" />
          <span className="flex flex-col">
            <span className="text-base font-extrabold">Church Connect</span>
            <span className="text-xs font-bold tracking-[0.04em] text-sidebar-muted">
              ADMINISTRACIÓN
            </span>
          </span>
        </Link>

        <nav aria-label="Principal" className="mt-6 flex flex-1 flex-col gap-0.5">
          <NavItems items={ADMIN_NAV_MAIN} tall={false} />
          <p className="px-3 pt-[18px] pb-1.5 text-xs font-extrabold tracking-[0.06em] text-sidebar-section">
            GESTIÓN
          </p>
          <NavItems items={ADMIN_NAV_MANAGE} tall={false} />
        </nav>

        <div className="flex flex-col gap-0.5 border-t border-sidebar-border pt-3">
          <NavLink
            to={PROFILE_PATH}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-white transition-colors hover:bg-white/10 ${
                isActive ? "bg-sidebar-accent" : ""
              }`
            }
          >
            <Avatar name={fullName} className="size-[34px] text-[13px]" />
            <span className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-extrabold">{fullName}</span>
              <span className="text-xs text-sidebar-muted">
                Administrador · Mi perfil
              </span>
            </span>
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            className="flex h-10 items-center gap-3 rounded-[10px] px-3 text-left text-sm font-bold text-sidebar-danger transition-colors hover:bg-white/[0.08]"
          >
            <LogOut className="size-5" aria-hidden="true" />
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[60px] items-center gap-3 bg-sidebar px-3 text-sidebar-foreground min-[960px]:hidden">
          <button
            type="button"
            onClick={() => setNavOpen(true)}
            aria-label="Abrir menú"
            aria-expanded={navOpen}
            aria-controls={navOpen ? panelId : undefined}
            className="flex size-11 items-center justify-center rounded-[10px] hover:bg-white/10"
          >
            <Menu className="size-6" aria-hidden="true" />
          </button>
          <Link to={HOME_PATH} className="text-base font-extrabold">
            Church Connect
          </Link>
          <span className="text-xs font-extrabold tracking-[0.04em] text-sidebar-muted">
            ADMIN
          </span>
        </header>

        {navOpen ? (
          <div
            className="fixed inset-0 z-[55] bg-overlay min-[960px]:hidden"
            onClick={() => setNavOpen(false)}
          >
            <div
              id={panelId}
              role="dialog"
              aria-modal="true"
              aria-label="Menú de administración"
              onClick={(e) => e.stopPropagation()}
              className="flex h-full w-[280px] max-w-[85%] flex-col gap-0.5 overflow-auto bg-sidebar px-3 py-4 text-sidebar-foreground"
            >
              <div className="flex items-center justify-between px-1.5 pt-1 pb-4">
                <span className="font-extrabold">Menú</span>
                <button
                  type="button"
                  onClick={() => setNavOpen(false)}
                  aria-label="Cerrar menú"
                  className="flex size-11 items-center justify-center rounded-[10px] hover:bg-white/10"
                >
                  <X className="size-[22px]" aria-hidden="true" />
                </button>
              </div>
              <nav aria-label="Principal" className="flex flex-col gap-0.5">
                <NavItems items={ADMIN_NAV_MAIN} tall />
                <NavItems items={ADMIN_NAV_MANAGE} tall />
              </nav>
              <div className="my-2 h-px bg-sidebar-border" />
              <NavLink
                to={PROFILE_PATH}
                className={({ isActive }) => navItemClass(isActive, true)}
              >
                <User className="size-[22px]" aria-hidden="true" />
                Mi perfil
              </NavLink>
              <button
                type="button"
                onClick={handleLogout}
                className="flex h-12 items-center gap-3 rounded-[10px] px-3 text-left text-base text-sidebar-danger hover:bg-white/[0.08]"
              >
                <LogOut className="size-[22px]" aria-hidden="true" />
                Cerrar sesión
              </button>
            </div>
          </div>
        ) : null}

        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-7 pb-[120px] sm:px-7">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
