import type { ContactInfoItem, ServiceItem } from "../types";

export const SERVICES_DATA: ServiceItem[] = [
  {
    id: "culto-dominical",
    title: "Culto Dominical",
    schedule: "9:00 AM - 11:00 AM",
    description:
      "Servicio principal con alabanza, predicación y comunión familiar",
    iconType: "culto",
    fullLocation: "Santuario Principal - Av. Central 1234",
    leader: "Pastor David Morales",
  },
  {
    id: "estudio-biblico",
    title: "Estudio Bíblico",
    schedule: "Miércoles 7:00 PM",
    description:
      "Profundizamos en la Palabra de Dios y compartimos en comunidad",
    iconType: "estudio",
    fullLocation: "Salón de Conferencias - Segundo Piso",
    leader: "Ministerio de Discipulado",
  },
  {
    id: "grupos-oracion",
    title: "Grupos de Oración",
    schedule: "Viernes 6:30 PM",
    description:
      "Intercesión y adoración en comunión íntima con Dios",
    iconType: "oracion",
    fullLocation: "Capilla de Oración - Ala Este",
    leader: "Ministerio de Intercesión",
  },
];

export const CONTACT_ITEMS: ContactInfoItem[] = [
  {
    id: "ubicacion",
    title: "Ubicación",
    subtitle: "Próximamente",
    iconType: "location",
    detail: "Av. Central #1234, Ciudad",
  },
  {
    id: "telefono",
    title: "Teléfono",
    subtitle: "Próximamente",
    iconType: "phone",
    detail: "+1 (555) 019-2834",
  },
  {
    id: "email",
    title: "Email",
    subtitle: "Próximamente",
    iconType: "email",
    detail: "contacto@churchconnect.org",
  },
];