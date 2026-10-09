import {
  Bell,
  Calendar,
  Home,
  LayoutDashboard,
  ListChecks,
  User,
  Users,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

/** Un destino de navegación (una vista por recurso del backend). */
export interface NavItem {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const HOME_PATH = "/";
export const PROFILE_PATH = "/profile";

const EVENTS: NavItem = {
  to: "/events",
  label: "Eventos",
  description: "Consulta los eventos, su sede y su cronograma.",
  icon: Calendar,
};
const SCHEDULES: NavItem = {
  to: "/schedules",
  label: "Cronogramas",
  description: "Revisa las actividades programadas de cada evento.",
  icon: ListChecks,
};
const MINISTRIES: NavItem = {
  to: "/ministries",
  label: "Ministerios",
  description: "Conoce los ministerios y sus integrantes.",
  icon: UsersRound,
};
const NOTIFICATIONS: NavItem = {
  to: "/notifications",
  label: "Notificaciones",
  description: "Lee los avisos que te han enviado.",
  icon: Bell,
};

/** Barra superior de la vista de miembro (y participante). */
export const MEMBER_NAV: readonly NavItem[] = [
  { to: HOME_PATH, label: "Inicio", description: "Resumen del día.", icon: Home },
  EVENTS,
  SCHEDULES,
  MINISTRIES,
  NOTIFICATIONS,
];

/** Accesos rápidos del Inicio de miembro. */
export const MEMBER_QUICK_LINKS: readonly NavItem[] = [
  EVENTS,
  SCHEDULES,
  MINISTRIES,
  NOTIFICATIONS,
  {
    to: PROFILE_PATH,
    label: "Mi perfil",
    description: "Revisa y actualiza tus datos personales.",
    icon: User,
  },
];

/** Barra lateral del panel de administración: Inicio + sección "GESTIÓN". */
export const ADMIN_NAV_MAIN: readonly NavItem[] = [
  {
    to: HOME_PATH,
    label: "Inicio",
    description: "Pendientes y accesos rápidos.",
    icon: LayoutDashboard,
  },
];

export const ADMIN_NAV_MANAGE: readonly NavItem[] = [
  {
    to: "/users",
    label: "Usuarios",
    description: "Administra las cuentas, roles y estados.",
    icon: Users,
  },
  EVENTS,
  SCHEDULES,
  MINISTRIES,
  NOTIFICATIONS,
];
