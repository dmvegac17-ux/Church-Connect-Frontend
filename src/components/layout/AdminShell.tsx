import {
  LogOut,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  User,
  X,
} from "lucide-react";
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
  MY_PARTICIPATIONS_PATH,
  PROFILE_PATH,
  type NavItem,
} from "../../config/navigation";
import { usePendingInvitationsCount } from "../../hooks/usePendingInvitationsCount";
import { fullNameOf } from "../../lib/people";
import { Avatar } from "../ui/primitives";
import { BrandLogo } from "./BrandLogo";

/** Preferencia de cada persona: barra completa o solo iconos. */
const COLLAPSED_KEY = "cc-admin-sidebar-collapsed";

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === "1";
  } catch {
    return false;
  }
}

function writeCollapsed(collapsed: boolean): void {
  try {
    localStorage.setItem(COLLAPSED_KEY, collapsed ? "1" : "0");
  } catch {
    // Sin almacenamiento la preferencia dura lo que la sesión.
  }
}

function navItemClass(isActive: boolean, tall: boolean, collapsed = false): string {
  return `relative flex items-center gap-3 rounded-[10px] transition-colors hover:bg-white/10 hover:text-white ${
    collapsed ? "justify-center px-0" : "px-3"
  } ${tall ? "h-12 text-base" : "h-[42px] text-[15px]"} ${
    isActive
      ? "bg-sidebar-accent font-extrabold text-white"
      : "font-semibold text-[#E3ECE5]"
  }`;
}

/** Línea que separa grupos de la barra lateral. */
function NavDivider() {
  return <div role="separator" className="my-1.5 h-px shrink-0 bg-sidebar-border" />;
}

function NavItems({
  items,
  tall,
  pendingCount = 0,
  collapsed = false,
}: {
  items: readonly NavItem[];
  tall: boolean;
  /** Invitaciones propias sin responder: contador de «Mis participaciones». */
  pendingCount?: number;
  /** Solo iconos: el nombre queda como texto accesible y como `title`. */
  collapsed?: boolean;
}) {
  return (
    <>
      {items.map(({ to, label, icon: Icon }) => {
        const pending = to === MY_PARTICIPATIONS_PATH ? pendingCount : 0;
        return (
          <NavLink
            key={to}
            to={to}
            end={to === HOME_PATH}
            title={collapsed ? label : undefined}
            className={({ isActive }) => navItemClass(isActive, tall, collapsed)}
          >
            <Icon
              className={`shrink-0 ${tall ? "size-[22px]" : "size-[21px]"}`}
              aria-hidden="true"
            />
            <span className={collapsed ? "sr-only" : "flex-1"}>{label}</span>
            {pending > 0 ? (
              collapsed ? (
                // Sin espacio para el número: un punto avisa que hay pendientes.
                <span className="absolute top-1.5 right-2.5 size-2.5 rounded-full border-2 border-sidebar bg-secondary">
                  <span className="sr-only">{pending} invitaciones pendientes</span>
                </span>
              ) : (
                <span className="flex h-[22px] min-w-[22px] items-center justify-center rounded-full bg-secondary px-[7px] text-xs font-extrabold text-primary-hover">
                  <span aria-hidden="true">{pending >= 100 ? "99+" : pending}</span>
                  <span className="sr-only">{pending} invitaciones pendientes</span>
                </span>
              )
            ) : null}
          </NavLink>
        );
      })}
    </>
  );
}

/**
 * Layout exclusivo del panel de administración: barra lateral fija de 252px
 * (o de 68px, solo iconos, si la persona la contrae) que, por debajo de
 * 960px, pasa a una barra superior con un panel deslizable. Los valores
 * propios del perfil (controles de 42px, tarjetas de 14px) viven en este
 * contenedor; no alcanzan a la vista de miembro.
 */
export function AdminShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const panelId = useId();
  const [navOpen, setNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const pendingCount = usePendingInvitationsCount(true);

  const toggleCollapsed = () =>
    setCollapsed((current) => {
      writeCollapsed(!current);
      return !current;
    });

  // «Inicio» va solo; debajo, lo propio de quien administra.
  const [homeItem, ...ownItems] = ADMIN_NAV_MAIN;

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
        className={`sticky top-0 hidden h-screen shrink-0 flex-col overflow-x-hidden overflow-y-auto bg-sidebar py-[18px] text-sidebar-foreground transition-[width] duration-200 min-[960px]:flex ${
          collapsed ? "w-[68px] px-2" : "w-[252px] px-3.5"
        }`}
      >
        <div
          className={`flex items-center gap-1 ${collapsed ? "flex-col gap-2" : ""}`}
        >
          <Link
            to={HOME_PATH}
            aria-label="Church Connect, ir al inicio"
            title={collapsed ? "Church Connect" : undefined}
            className={`flex min-w-0 items-center gap-2.5 rounded-[10px] p-1.5 ${
              collapsed ? "" : "flex-1"
            }`}
          >
            <BrandLogo className="size-[34px]" />
            {collapsed ? null : (
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-base font-extrabold">
                  Church Connect
                </span>
                <span className="text-xs font-bold tracking-[0.04em] text-sidebar-muted">
                  ADMINISTRACIÓN
                </span>
              </span>
            )}
          </Link>
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expandir el menú" : "Contraer el menú"}
            title={collapsed ? "Expandir el menú" : "Contraer el menú"}
            className="flex size-9 shrink-0 items-center justify-center rounded-[10px] text-sidebar-muted transition-colors hover:bg-white/10 hover:text-white"
          >
            {collapsed ? (
              <PanelLeftOpen className="size-5" aria-hidden="true" />
            ) : (
              <PanelLeftClose className="size-5" aria-hidden="true" />
            )}
          </button>
        </div>

        <nav aria-label="Principal" className="mt-5 flex flex-1 flex-col gap-0.5">
          <NavItems items={[homeItem]} tall={false} collapsed={collapsed} />
          <NavDivider />
          <NavItems
            items={ownItems}
            tall={false}
            pendingCount={pendingCount}
            collapsed={collapsed}
          />
          {collapsed ? (
            // Sin espacio para el rótulo «GESTIÓN»: la línea separa el grupo.
            <NavDivider />
          ) : (
            <p className="px-3 pt-[18px] pb-1.5 text-xs font-extrabold tracking-[0.06em] text-sidebar-section">
              GESTIÓN
            </p>
          )}
          <NavItems items={ADMIN_NAV_MANAGE} tall={false} collapsed={collapsed} />
        </nav>

        <div className="flex flex-col gap-0.5 border-t border-sidebar-border pt-3">
          <NavLink
            to={PROFILE_PATH}
            title={collapsed ? `${fullName} · Mi perfil` : undefined}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-[10px] py-2 text-white transition-colors hover:bg-white/10 ${
                collapsed ? "justify-center px-0" : "px-2.5"
              } ${isActive ? "bg-sidebar-accent" : ""}`
            }
          >
            <Avatar name={fullName} className="size-[34px] text-[13px]" />
            <span className={collapsed ? "sr-only" : "flex min-w-0 flex-col"}>
              <span className="truncate text-sm font-extrabold">{fullName}</span>
              <span className="text-xs text-sidebar-muted">
                Administrador · Mi perfil
              </span>
            </span>
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            title={collapsed ? "Cerrar sesión" : undefined}
            className={`flex h-10 items-center gap-3 rounded-[10px] text-left text-sm font-bold text-sidebar-danger transition-colors hover:bg-white/[0.08] ${
              collapsed ? "justify-center px-0" : "px-3"
            }`}
          >
            <LogOut className="size-5 shrink-0" aria-hidden="true" />
            <span className={collapsed ? "sr-only" : ""}>Cerrar sesión</span>
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
                <NavItems items={[homeItem]} tall />
                <NavDivider />
                <NavItems items={ownItems} tall pendingCount={pendingCount} />
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
