import type { ReactNode } from "react";

/*
 * Markdown mínimo para los documentos legales: títulos (#, ##, ###),
 * párrafos, listas con «-» o «1.», **negrilla**, *cursiva* y
 * [enlaces](https://…). Devuelve elementos de React, nunca HTML: lo que se
 * escriba en el documento se muestra como texto, así que no puede colarse
 * un script. Los enlaces solo aceptan direcciones web y de correo.
 */

const INLINE = /(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)\s]+\))/g;
const SAFE_LINK = /^(https?:\/\/|mailto:)/i;

function inline(text: string, keyPrefix: string): ReactNode[] {
  return text.split(INLINE).map((part, i) => {
    const key = `${keyPrefix}-${i}`;
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return <strong key={key}>{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return <em key={key}>{part.slice(1, -1)}</em>;
    }
    const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
    if (link) {
      return SAFE_LINK.test(link[2]) ? (
        <a
          key={key}
          href={link[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-bold text-primary underline"
        >
          {link[1]}
        </a>
      ) : (
        // Un enlace que no es web ni correo se deja como texto.
        link[1]
      );
    }
    return part;
  });
}

/** Líneas seguidas de un mismo párrafo, con su salto conservado. */
function lines(block: string[], keyPrefix: string): ReactNode[] {
  return block.flatMap((line, i) => [
    ...(i > 0 ? [<br key={`${keyPrefix}-br-${i}`} />] : []),
    ...inline(line, `${keyPrefix}-${i}`),
  ]);
}

/** Convierte el texto Markdown de un documento en elementos listos para pintar. */
export function Markdown({ text }: { text: string }) {
  const out: ReactNode[] = [];
  const source = text.replace(/\r\n/g, "\n").split("\n");
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;

  const flush = () => {
    const key = `b-${out.length}`;
    if (paragraph.length > 0) {
      out.push(
        <p key={key} className="leading-[1.7]">
          {lines(paragraph, key)}
        </p>,
      );
      paragraph = [];
    }
    if (list) {
      const Tag = list.ordered ? "ol" : "ul";
      out.push(
        <Tag
          key={key}
          className={`flex flex-col gap-1.5 pl-6 leading-[1.6] ${
            list.ordered ? "list-decimal" : "list-disc"
          }`}
        >
          {list.items.map((item, i) => (
            <li key={i}>{inline(item, `${key}-${i}`)}</li>
          ))}
        </Tag>,
      );
      list = null;
    }
  };

  for (const raw of source) {
    const line = raw.trimEnd();
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);

    if (!line.trim()) {
      flush();
    } else if (heading) {
      flush();
      const level = heading[1].length;
      const Tag = level === 1 ? "h2" : level === 2 ? "h3" : "h4";
      out.push(
        <Tag
          key={`b-${out.length}`}
          className={`font-extrabold text-foreground ${
            level === 1
              ? "mt-3 text-[22px] leading-tight"
              : level === 2
                ? "mt-3 text-lg leading-snug"
                : "mt-1 text-base"
          }`}
        >
          {inline(heading[2], `h-${out.length}`)}
        </Tag>,
      );
    } else if (bullet || numbered) {
      const ordered = Boolean(numbered) && !bullet;
      if (paragraph.length > 0 || (list && list.ordered !== ordered)) {
        flush();
      }
      list = list ?? { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
    } else {
      if (list) {
        flush();
      }
      paragraph.push(line.trim());
    }
  }
  flush();

  return (
    <div className="flex flex-col gap-3 text-[15px] break-words text-text-strong">
      {out}
    </div>
  );
}
