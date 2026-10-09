import {
  Bell,
  Calendar,
  Home,
  LayoutDashboard,
  ListChecks,
  User,
  UserCheck,
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

export const PARTICIPATIONS_PATH = "/participations";

/** Solo rol participante: confirmar sus invitaciones a actividades. */
const OWN_PARTICIPATIONS: NavItem = {
  to: PARTICIPATIONS_PATH,
  label: "Participaciones",
  description: "Acepta o rechaza las actividades a las que te invitaron.",
  icon: UserCheck,
};

/**
 * Menú "Eventos" del participante: agrupa eventos, cronogramas y sus
 * invitaciones. El miembro conserva los enlaces sueltos de siempre.
 */
export const PARTICIPANT_EVENT_MENU: readonly NavItem[] = [
  {
    ...EVENTS,
    label: "Todos los eventos",
    description: "Calendario, lugar y detalle de cada evento",
  },
  { ...SCHEDULES, description: "Actividades programadas por evento" },
  {
    ...OWN_PARTICIPATIONS,
    label: "Confirmar participaciones",
    description: "Acepta o rechaza tus invitaciones",
  },
];

/** Navegación del participante en móvil: la del miembro más sus invitaciones. */
export const PARTICIPANT_NAV: readonly NavItem[] = [
  { to: HOME_PATH, label: "Inicio", description: "Resumen del día.", icon: Home },
  EVENTS,
  SCHEDULES,
  OWN_PARTICIPATIONS,
  MINISTRIES,
  NOTIFICATIONS,
];

/** Acceso rápido extra del Inicio del participante. */
export const PARTICIPANT_QUICK_LINK: NavItem = {
  ...OWN_PARTICIPATIONS,
  label: "Confirmar participaciones",
};

/** Barra superior de la vista de miembro. */
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
  {
    to: PARTICIPATIONS_PATH,
    label: "Participaciones",
    description: "Supervisa las invitaciones y sus respuestas.",
    icon: UserCheck,
  },
  MINISTRIES,
  NOTIFICATIONS,
];
