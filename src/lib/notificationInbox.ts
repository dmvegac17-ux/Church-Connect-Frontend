import { formatDate, formatTime } from "./format";
import { htmlToPlainText } from "./htmlText";

/*
 * Bandeja de notificaciones: quién firma un aviso, cómo se busca en ella y
 * cómo se abrevia la fecha en la lista.
 */

/** Remitente de los avisos que genera la plataforma (sin firma). */
export const SYSTEM_SENDER = "Church Connect";

/** Cargo con el que firma quien envía un aviso o una invitación. */
export const ADMIN_ROLE = "Administrador de Church Connect";

/** Firma que el backend añade al final de lo que envía un administrador. */
const SIGNATURE = new RegExp(
  `<div>Atte, ([^<]+)</div>(?:<div>${ADMIN_ROLE}</div>)?\\s*$`,
);

/** Nombre de quien envió el aviso, leído de su firma; la plataforma si no tiene. */
export function senderOf(messageHtml: string): string {
  const match = SIGNATURE.exec(messageHtml);
  return (match && htmlToPlainText(match[1])) || SYSTEM_SENDER;
}

/** Texto comparable: sin tildes ni mayúsculas. */
export function searchable(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

/** Fecha corta de la lista: la hora si es de hoy, el día si no. */
export function inboxDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  return date.toDateString() === now.toDateString()
    ? formatTime(iso)
    : formatDate(iso);
}
