/** Extrae el texto plano de un HTML (validación de "obligatorio" y vistas previas). */
export function htmlToPlainText(html: string): string {
  const div = document.createElement("div");
  div.innerHTML = html;
  return (div.textContent ?? "").replace(/\s+/g, " ").trim();
}
