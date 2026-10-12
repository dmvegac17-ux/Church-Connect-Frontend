/**
 * Contratos de los documentos legales (`/api/v1/legal/*`): Términos y
 * condiciones y Política de privacidad, y la constancia de quién los aceptó.
 */

export type LegalDocumentType = "terminos" | "privacidad";

/** Dirección pública de cada documento. */
export const LEGAL_PATHS: Record<LegalDocumentType, string> = {
  terminos: "/terminos",
  privacidad: "/privacidad",
};

export const LEGAL_NAMES: Record<LegalDocumentType, string> = {
  terminos: "Términos y condiciones",
  privacidad: "Política de privacidad",
};

/** La versión publicada de un documento, como la ve cualquiera. */
export interface LegalDocument {
  id: string;
  tipo: LegalDocumentType;
  /** «mayor.menor», p. ej. `1.0`. */
  version: string;
  titulo: string;
  /** Markdown. */
  contenido: string;
  /** ISO datetime; `null` en un borrador. */
  publicado_en: string | null;
}

export interface PendingDocument {
  id: string;
  tipo: LegalDocumentType;
  version: string;
  titulo: string;
}

export interface AdminLegalDocument extends LegalDocument {
  estado: "borrador" | "publicado" | "archivado";
  requiere_reaceptacion: boolean;
  creado_en: string;
  actualizado_en: string;
}

export interface OwnAcceptance {
  id: string;
  documento_id: string;
  tipo: LegalDocumentType;
  titulo: string;
  version: string;
  /** ISO datetime. */
  aceptado_en: string;
}

export interface PersonAcceptances {
  usuario_id: string;
  nombre_completo: string;
  correo: string;
  /** Por tipo: la aceptación vigente, o `null` si está pendiente. */
  aceptaciones: Partial<
    Record<LegalDocumentType, { version: string; aceptado_en: string } | null>
  >;
  al_dia: boolean;
}

export interface AcceptanceSummary {
  documentos: Partial<Record<LegalDocumentType, { version: string; titulo: string }>>;
  total: number;
  al_dia: number;
  personas: PersonAcceptances[];
}
