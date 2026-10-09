import {
  Baby,
  BookOpen,
  HandHeart,
  Handshake,
  Mic,
  Music,
  UsersRound,
  type LucideIcon,
} from "lucide-react";

import { normalizeText } from "./people";

/**
 * Icono de un ministerio según su nombre. El backend no guarda un icono,
 * así que se deduce de palabras clave; el resto usa el icono genérico.
 */
const RULES: [RegExp, LucideIcon][] = [
  [/escuela|biblia|estudio|sabatica/, BookOpen],
  [/predica|ensenanza|palabra/, Mic],
  [/alabanza|musica|coro|canto|adoracion/, Music],
  [/oracion|interces/, HandHeart],
  [/diacon|servicio|ujier|bienvenida/, Handshake],
  [/infant|nino|cuna|menores/, Baby],
];

export function ministryIcon(name: string): LucideIcon {
  const normalized = normalizeText(name);
  return RULES.find(([pattern]) => pattern.test(normalized))?.[1] ?? UsersRound;
}

/** "4 integrantes" / "1 integrante". */
export function membersLabel(count: number): string {
  return `${count} ${count === 1 ? "integrante" : "integrantes"}`;
}
