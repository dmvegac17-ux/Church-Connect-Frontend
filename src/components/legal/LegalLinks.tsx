import { Link } from "react-router-dom";

import { LEGAL_NAMES, LEGAL_PATHS, type LegalDocumentType } from "../../types/legal";

const TYPES: LegalDocumentType[] = ["terminos", "privacidad"];

/**
 * Enlaces a los dos documentos legales, para pies de página. Por defecto
 * abren en otra pestaña, para no sacar a nadie de lo que estaba haciendo.
 */
export function LegalLinks({
  sameTab = false,
  className = "",
}: {
  sameTab?: boolean;
  className?: string;
}) {
  return (
    <nav
      aria-label="Documentos legales"
      className={`flex flex-wrap gap-x-4 gap-y-1 ${className}`}
    >
      {TYPES.map((tipo) => (
        <Link
          key={tipo}
          to={LEGAL_PATHS[tipo]}
          {...(sameTab ? {} : { target: "_blank", rel: "noopener noreferrer" })}
          className="font-semibold hover:text-primary hover:underline"
        >
          {LEGAL_NAMES[tipo]}
        </Link>
      ))}
    </nav>
  );
}
