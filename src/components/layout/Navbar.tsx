import {
  Bell,
  CalendarClock,
  CalendarDays,
  Church,
  HeartHandshake,
  LogOut,
  Users,
} from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { useUnreadNotificationsCount } from "../../hooks/useUnreadNotificationsCount";
import { ROLE_LABELS } from "../../types/user";

export function Navbar() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const { count: unreadCount } = useUnreadNotificationsCount();
  const unreadLabel = unreadCount >= 100 ? "99+" : String(unreadCount);

  const fullName = user ? `${user.nombre} ${user.apellido ?? ""}`.trim() : "—";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition ${
      isActive
        ? "bg-secondary text-secondary-foreground"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    }`;

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-2 text-base font-medium text-primary">
            <Church className="size-5" aria-hidden="true" />
            Church Connect
          </span>
          <nav className="flex items-center gap-1">
            {role === "ADMIN" ? (
              <NavLink to="/users" className={linkClass}>
                <Users className="size-4" aria-hidden="true" />
                Usuarios
              </NavLink>
            ) : null}
            <NavLink to="/events" className={linkClass}>
              <CalendarDays className="size-4" aria-hidden="true" />
              Eventos
            </NavLink>
            <NavLink to="/ministries" className={linkClass}>
              <HeartHandshake className="size-4" aria-hidden="true" />
              Ministerios
            </NavLink>
            <NavLink to="/schedules" className={linkClass}>
              <CalendarClock className="size-4" aria-hidden="true" />
              Cronogramas
            </NavLink>
            <NavLink to="/notifications" className={linkClass}>
              <span className="relative inline-flex">
                <Bell className="size-4" aria-hidden="true" />
                {unreadCount > 0 ? (
                  <span
                    aria-hidden="true"
                    className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold leading-none text-destructive-foreground"
                  >
                    {unreadLabel}
                  </span>
                ) : null}
              </span>
              Notificaciones
              {unreadCount > 0 ? (
                <span className="sr-only">, {unreadCount} sin leer</span>
              ) : null}
            </NavLink>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <NavLink
            to="/profile"
            className="hidden rounded-md px-2 py-1 text-right transition hover:bg-muted sm:block"
            title="Ver mi perfil"
          >
            <p
              className="max-w-[180px] truncate text-sm font-medium text-foreground"
              title={fullName}
            >
              {fullName}
            </p>
            <p className="text-xs text-muted-foreground">
              {role ? ROLE_LABELS[role] : ""}
            </p>
          </NavLink>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <LogOut className="size-4" aria-hidden="true" />
            Salir
          </button>
        </div>
      </div>
    </header>
  );
}
