/** Extrae el texto plano de un HTML (validación de "obligatorio" y vistas previas). */
export function htmlToPlainText(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? "").replace(/\s+/g, " ").trim();
}

/**
 * Vista previa en una línea: como `htmlToPlainText`, pero separando los
 * bloques (saltos de línea, párrafos) para que no se peguen las palabras.
 */
export function htmlToPreview(html: string): string {
  return htmlToPlainText(html.replace(/<(br|\/div|\/p)[^>]*>/gi, " $&"));
}
