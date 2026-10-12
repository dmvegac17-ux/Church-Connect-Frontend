import { QUICK_LINK_CATALOG, type QuickLinkKey } from "../config/navigation";

/* Inicio configurable del miembro: qué secciones ve y qué accesos rápidos tiene. */

export type HomeSection = "verse" | "next" | "unread" | "quick";

export interface HomeConfig {
  verse: boolean;
  next: boolean;
  unread: boolean;
  quick: boolean;
  /** Accesos rápidos elegidos, en el orden en que se muestran. */
  keys: QuickLinkKey[];
}

export const HOME_SECTIONS: readonly {
  key: HomeSection;
  label: string;
  description: string;
}[] = [
  { key: "verse", label: "Versículo del día", description: "Cita bíblica junto al saludo." },
  {
    key: "next",
    label: "Próximo evento",
    description: "El evento más cercano con su fecha y lugar.",
  },
  {
    key: "unread",
    label: "Avisos sin leer",
    description: "Las últimas notificaciones pendientes.",
  },
  {
    key: "quick",
    label: "Accesos rápidos",
    description: "Atajos a las secciones que más usas.",
  },
];

export const QUICK_LINKS_MAX = 6;

export const HOME_DEFAULT: HomeConfig = {
  verse: true,
  next: true,
  unread: true,
  quick: true,
  keys: ["eventos", "inscripciones", "participaciones", "ministerios", "notificaciones"],
};

const STORAGE_KEY = "cc-home-config";
const VALID_KEYS = new Set<string>(QUICK_LINK_CATALOG.map((item) => item.key));

function storageKey(userId: string): string {
  return `${STORAGE_KEY}:${userId}`;
}

export function cloneHomeConfig(config: HomeConfig): HomeConfig {
  return { ...config, keys: [...config.keys] };
}

export function sameHomeConfig(a: HomeConfig, b: HomeConfig): boolean {
  return (
    a.verse === b.verse &&
    a.next === b.next &&
    a.unread === b.unread &&
    a.quick === b.quick &&
    a.keys.length === b.keys.length &&
    a.keys.every((key, i) => key === b.keys[i])
  );
}

/** Lee la configuración guardada; ante cualquier dato inválido, la de fábrica. */
export function loadHomeConfig(userId: string): HomeConfig {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(storageKey(userId)) ?? "null");
    if (!raw || typeof raw !== "object" || !Array.isArray((raw as HomeConfig).keys)) {
      return cloneHomeConfig(HOME_DEFAULT);
    }
    const stored = raw as Partial<HomeConfig>;
    const keys = (stored.keys ?? [])
      .filter((key, i, all) => VALID_KEYS.has(key) && all.indexOf(key) === i)
      .slice(0, QUICK_LINKS_MAX);

    return {
      verse: stored.verse ?? true,
      next: stored.next ?? true,
      unread: stored.unread ?? true,
      quick: stored.quick ?? true,
      keys,
    };
  } catch {
    return cloneHomeConfig(HOME_DEFAULT);
  }
}

export function saveHomeConfig(userId: string, config: HomeConfig): void {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(config));
  } catch {
    // Sin almacenamiento disponible la configuración dura lo que la sesión.
  }
}
