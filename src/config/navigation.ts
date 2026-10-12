import {
  Bell,
  Calendar,
  CalendarCheck,
  Home,
  LayoutDashboard,
  ListChecks,
  Megaphone,
  Scale,
  Ticket,
  TicketCheck,
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
/** Miembro: sus participaciones e invitaciones. Administrador: supervisar todas. */
export const PARTICIPATIONS_PATH = "/participations";
/** Miembro: sus inscripciones. Administrador: gestión de inscritos. */
export const REGISTRATIONS_PATH = "/registrations";
/** Solo administrador: las actividades en las que participa él mismo. */
export const MY_PARTICIPATIONS_PATH = "/my-participations";
/** Solo administrador: los eventos donde él mismo reservó su cupo. */
export const MY_REGISTRATIONS_PATH = "/my-registrations";
export const ANNOUNCEMENTS_PATH = "/announcements";

const EVENTS: NavItem = {
  to: "/events",
  label: "Eventos",
  description: "Consulta los eventos, su sede y su cronograma.",
  icon: Calendar,
};
const MY_REGISTRATIONS: NavItem = {
  to: REGISTRATIONS_PATH,
  label: "Mis inscripciones",
  description: "Eventos en los que reservaste tu cupo.",
  icon: Ticket,
};
const SCHEDULES: NavItem = {
  to: "/schedules",
  label: "Cronogramas",
  description: "Revisa las actividades programadas de cada evento.",
  icon: ListChecks,
};
/** Cualquier usuario puede ser asignado a una actividad: no depende del rol. */
const OWN_PARTICIPATIONS: NavItem = {
  to: PARTICIPATIONS_PATH,
  label: "Mis participaciones",
  description: "Actividades en las que participas y tus invitaciones.",
  icon: UserCheck,
};
const MINISTRIES: NavItem = {
  to: "/ministries",
  label: "Ministerios",
  description: "Conoce los ministerios y sus integrantes.",
  icon: UsersRound,
};
/** Cartelera: avisos generales para todos. Distinto de las notificaciones,
 * que van dirigidas a personas concretas. */
const ANNOUNCEMENTS: NavItem = {
  to: ANNOUNCEMENTS_PATH,
  label: "Anuncios",
  description: "Avisos generales de la iglesia.",
  icon: Megaphone,
};
const NOTIFICATIONS: NavItem = {
  to: "/notifications",
  label: "Notificaciones",
  description: "Lee los avisos que te han enviado.",
  icon: Bell,
};
const PROFILE: NavItem = {
  to: PROFILE_PATH,
  label: "Mi perfil",
  description: "Actualiza tus datos y tu contraseña.",
  icon: User,
};

/** Desplegable «Eventos» de la barra superior del miembro. */
export const MEMBER_EVENT_MENU: readonly NavItem[] = [
  {
    ...EVENTS,
    label: "Todos los eventos",
    description: "Calendario, lugar y detalle de cada evento",
  },
  { ...SCHEDULES, description: "Actividades programadas por evento" },
  {
    ...MY_REGISTRATIONS,
    description: "Eventos en los que reservaste tu cupo",
  },
  {
    ...OWN_PARTICIPATIONS,
    description: "Lo que debes confirmar y lo ya confirmado",
  },
];

/** Barra superior del miembro: los enlaces que van fuera del desplegable. */
export const MEMBER_NAV: readonly NavItem[] = [
  { to: HOME_PATH, label: "Inicio", description: "Resumen del día.", icon: Home },
  ANNOUNCEMENTS,
  MINISTRIES,
  NOTIFICATIONS,
];

/** Navegación del miembro en móvil: todo en una sola lista. */
export const MEMBER_MOBILE_NAV: readonly NavItem[] = [
  { to: HOME_PATH, label: "Inicio", description: "Resumen del día.", icon: Home },
  EVENTS,
  SCHEDULES,
  MY_REGISTRATIONS,
  OWN_PARTICIPATIONS,
  ANNOUNCEMENTS,
  MINISTRIES,
  NOTIFICATIONS,
];

export type QuickLinkKey =
  | "eventos"
  | "inscripciones"
  | "cronogramas"
  | "participaciones"
  | "ministerios"
  | "anuncios"
  | "notificaciones"
  | "perfil";

/** Catálogo de accesos rápidos que el miembro puede poner en su Inicio. */
export const QUICK_LINK_CATALOG: readonly (NavItem & { key: QuickLinkKey })[] = [
  { key: "eventos", ...EVENTS },
  { key: "inscripciones", ...MY_REGISTRATIONS },
  { key: "cronogramas", ...SCHEDULES },
  { key: "participaciones", ...OWN_PARTICIPATIONS },
  { key: "ministerios", ...MINISTRIES },
  { key: "anuncios", ...ANNOUNCEMENTS },
  { key: "notificaciones", ...NOTIFICATIONS },
  { key: "perfil", ...PROFILE },
];

/** Barra lateral del panel de administración: lo propio y la sección «GESTIÓN». */
export const ADMIN_NAV_MAIN: readonly NavItem[] = [
  {
    to: HOME_PATH,
    label: "Inicio",
    description: "Pendientes y accesos rápidos.",
    icon: LayoutDashboard,
  },
  {
    to: MY_PARTICIPATIONS_PATH,
    label: "Mis participaciones",
    description: "Actividades en las que participas tú.",
    icon: CalendarCheck,
  },
  {
    // Lo propio va arriba; «Inscripciones», en GESTIÓN, es la de todos.
    to: MY_REGISTRATIONS_PATH,
    label: "Mis inscripciones",
    description: "Eventos en los que reservaste tu cupo.",
    icon: TicketCheck,
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
  {
    to: REGISTRATIONS_PATH,
    label: "Inscripciones",
    description: "Público inscrito y participantes de cada evento.",
    icon: Ticket,
  },
  SCHEDULES,
  {
    to: PARTICIPATIONS_PATH,
    label: "Participaciones",
    description: "Supervisa las invitaciones y sus respuestas.",
    icon: UserCheck,
  },
  MINISTRIES,
  NOTIFICATIONS,
  ANNOUNCEMENTS,
  {
    to: "/legal-documents",
    label: "Documentos legales",
    description: "Términos, privacidad y quién los ha aceptado.",
    icon: Scale,
  },
];
