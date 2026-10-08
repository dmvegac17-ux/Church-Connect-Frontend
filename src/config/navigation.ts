import {
  Bell,
  CalendarDays,
  ClipboardList,
  HeartHandshake,
  Home,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

import type { UserRole } from "../types/user";

/** Un módulo navegable de la plataforma (una vista por recurso del backend). */
export interface NavModule {
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  /** Si se indica, solo ese rol ve el módulo (mismo criterio que `ProtectedRoute`). */
  requiredRole?: UserRole;
}

export const HOME_PATH = "/";

/**
 * Fuente única de los módulos integrados: la usan el menú del header y las
 * tarjetas de la pantalla de inicio. Al integrar un módulo nuevo, se añade aquí.
 */
export const NAV_MODULES: readonly NavModule[] = [
  {
    to: HOME_PATH,
    label: "Inicio",
    description: "Pantalla de bienvenida.",
    icon: Home,
  },
  {
    to: "/users",
    label: "Usuarios",
    description: "Administra las cuentas, roles y estados.",
    icon: Users,
    requiredRole: "ADMIN",
  },
  {
    to: "/events",
    label: "Eventos",
    description: "Consulta los eventos, su sede y su cronograma.",
    icon: CalendarDays,
  },
  {
    to: "/schedules",
    label: "Cronogramas",
    description: "Revisa las actividades programadas de cada evento.",
    icon: ClipboardList,
  },
  {
    to: "/ministries",
    label: "Ministerios",
    description: "Conoce los ministerios y sus integrantes.",
    icon: HeartHandshake,
  },
  {
    to: "/notifications",
    label: "Notificaciones",
    description: "Lee los avisos que te han enviado.",
    icon: Bell,
  },
  {
    to: "/profile",
    label: "Mi perfil",
    description: "Revisa y actualiza tus datos personales.",
    icon: UserRound,
  },
];

/** Módulos que el rol dado puede abrir. */
export function modulesFor(role: UserRole | null): NavModule[] {
  return NAV_MODULES.filter(
    (module) => !module.requiredRole || module.requiredRole === role,
  );
}
