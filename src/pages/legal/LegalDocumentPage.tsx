import { FileX } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { Spinner } from "../../components/feedback/Spinner";
import { BrandLogo } from "../../components/layout/BrandLogo";
import { LegalLinks } from "../../components/legal/LegalLinks";
import { formatDate } from "../../lib/format";
import { Markdown } from "../../lib/markdown";
import { legalService } from "../../services/legalService";
import {
  LEGAL_NAMES,
  type LegalDocument,
  type LegalDocumentType,
} from "../../types/legal";

/**
 * Página pública de un documento legal (`/terminos`, `/privacidad`): la
 * versión vigente, con su número y su fecha. Se lee sin iniciar sesión.
 */
export function LegalDocumentPage({ tipo }: { tipo: LegalDocumentType }) {
  const [document_, setDocument] = useState<LegalDocument | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">("loading");

  useEffect(() => {
    const controller = new AbortController();
    setStatus("loading");
    legalService
      .byType(tipo, controller.signal)
      .then((result) => {
        setDocument(result);
        setStatus("ready");
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setStatus("missing");
        }
      });
    return () => controller.abort();
  }, [tipo]);

  useEffect(() => {
    document.title = `${LEGAL_NAMES[tipo]} · Church Connect`;
  }, [tipo]);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="bg-linear-to-br from-primary to-primary-hover text-primary-foreground">
        <div className="mx-auto flex w-full max-w-[820px] items-center gap-3 px-5 py-4">
          <Link to="/login" className="flex items-center gap-3" aria-label="Church Connect: ir al inicio">
            <BrandLogo className="size-11 shrink-0" />
            <span className="flex flex-col">
              <span className="text-xl leading-tight font-extrabold tracking-[-0.01em]">
                Church Connect
              </span>
              <span className="text-sm text-[#E3ECE5]">Conectados con tu fe</span>
            </span>
          </Link>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[820px] flex-1 px-5 py-7">
        {status === "loading" ? (
          <div className="py-16 text-center text-muted-foreground">
            <Spinner label="Cargando documento…" />
          </div>
        ) : status === "missing" || !document_ ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-button-border bg-card px-6 py-12 text-center">
            <FileX className="size-9 text-icon-muted" aria-hidden="true" />
            <h1 className="text-xl font-extrabold">{LEGAL_NAMES[tipo]}</h1>
            <p className="text-[15px] text-muted-foreground">
              Este documento todavía no está disponible. Inténtalo más tarde.
            </p>
          </div>
        ) : (
          <article className="flex flex-col gap-5 rounded-2xl border border-border bg-card px-5 py-6 sm:px-8 sm:py-8">
            <header className="flex flex-col gap-1.5 border-b border-divider pb-4">
              <h1 className="text-[26px] leading-tight font-extrabold tracking-[-0.015em]">
                {document_.titulo}
              </h1>
              <p className="text-sm text-muted-foreground">
                Versión {document_.version}
                {document_.publicado_en
                  ? ` · Vigente desde el ${formatDate(document_.publicado_en)}`
                  : ""}
              </p>
            </header>
            <Markdown text={document_.contenido} />
          </article>
        )}
      </main>

      <footer className="border-t border-divider bg-card">
        <div className="mx-auto flex w-full max-w-[820px] flex-wrap items-center justify-between gap-x-4 gap-y-2 px-5 py-4 text-sm text-muted-foreground">
          <LegalLinks sameTab />
          <Link to="/login" className="font-bold text-primary hover:underline">
            Ir a iniciar sesión
          </Link>
        </div>
      </footer>
    </div>
  );
}
