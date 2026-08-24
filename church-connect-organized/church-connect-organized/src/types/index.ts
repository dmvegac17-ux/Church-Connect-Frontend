export type EventCategory =
  | "Todos"
  | "Culto"
  | "Juventud"
  | "Música"
  | "Comunidad"
  | "Oración"
  | "Estudio";

export interface ChurchEvent {
  id: string;
  title: string;
  category: Exclude<EventCategory, "Todos">;
  description: string;
  date: string;
  isoDate?: string;
  time: string;
  location: string;
  address?: string;
  leader?: string;
  capacity?: number;
  tags?: string[];
  attendeesCount?: number;
  highlighted?: boolean;
}

export interface CategoryInfo {
  name: EventCategory;
  label: string;
  badgeBgClass?: string;
  badgeTextClass?: string;
  badgeBorderClass?: string;
}

export interface ServiceItem {
  id: string;
  title: string;
  schedule: string;
  description: string;
  iconType: "culto" | "estudio" | "oracion";
  fullLocation?: string;
  leader?: string;
}

export interface ContactInfoItem {
  id: string;
  title: string;
  subtitle: string;
  iconType: "location" | "phone" | "email";
  detail: string;
  actionText?: string;
}

export type AuthTab = "login" | "register";

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  ministry?: string;
  role: "member" | "leader" | "volunteer" | "pastor";
  joinedAt: string;
}