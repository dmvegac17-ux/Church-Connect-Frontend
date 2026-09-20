import DOMPurify from "dompurify";

/**
 * Formato enriquecido permitido en el mensaje de una notificación: negrilla,
 * resaltado (vía `style`/`font` heredados de `document.execCommand`) y tipo
 * de letra. Cualquier otra etiqueta o atributo (`script`, `on*`, `iframe`,
 * enlaces, etc.) se elimina.
 */
const ALLOWED_TAGS = [
  "b",
  "strong",
  "i",
  "em",
  "u",
  "span",
  "font",
  "br",
  "div",
  "p",
];
const ALLOWED_ATTR = ["style", "color", "face"];

/** Sanitiza el HTML del mensaje antes de guardarlo o de renderizarlo. */
export function sanitizeNotificationHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS, ALLOWED_ATTR });
}
