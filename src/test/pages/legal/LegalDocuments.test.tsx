import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AcceptanceGate } from "../../../components/legal/AcceptanceGate";
import { Markdown } from "../../../lib/markdown";
import { AdminLegalPage } from "../../../pages/admin/legal/AdminLegalPage";
import { RegisterPage } from "../../../pages/auth/RegisterPage";
import { LegalDocumentPage } from "../../../pages/legal/LegalDocumentPage";
import { legalService } from "../../../services/legalService";
import type {
  AcceptanceSummary,
  AdminLegalDocument,
  LegalDocument,
} from "../../../types/legal";
import { renderApp } from "../../fixtures";

vi.mock("../../../services/legalService", async (original) => ({
  ...(await original<typeof import("../../../services/legalService")>()),
  legalService: {
    current: vi.fn(),
    byType: vi.fn(),
    pending: vi.fn(),
    accept: vi.fn(),
    versions: vi.fn(),
    createDraft: vi.fn(),
    saveDraft: vi.fn(),
    discardDraft: vi.fn(),
    publish: vi.fn(),
    acceptances: vi.fn(),
    acceptancesOf: vi.fn(),
  },
}));
vi.mock("../../../components/layout/DailyVerse", () => ({ DailyVerse: () => null }));

const service = vi.mocked(legalService);

const TERMS: LegalDocument = {
  id: "doc-terminos",
  tipo: "terminos",
  version: "1.0",
  titulo: "Términos y condiciones",
  contenido: "## 1. Tu cuenta\n\nEs **personal**.\n\n- No la prestes\n- Cuida tu contraseña",
  publicado_en: "2030-01-10T15:00:00Z",
};
const PRIVACY: LegalDocument = {
  ...TERMS,
  id: "doc-privacidad",
  tipo: "privacidad",
  titulo: "Política de privacidad",
};

function admin(doc: LegalDocument, overrides: Partial<AdminLegalDocument> = {}): AdminLegalDocument {
  return {
    ...doc,
    estado: "publicado",
    requiere_reaceptacion: true,
    creado_en: "2030-01-10T15:00:00Z",
    actualizado_en: "2030-01-10T15:00:00Z",
    ...overrides,
  };
}

const SUMMARY: AcceptanceSummary = {
  documentos: {
    terminos: { version: "1.0", titulo: TERMS.titulo },
    privacidad: { version: "1.0", titulo: PRIVACY.titulo },
  },
  total: 2,
  al_dia: 1,
  personas: [
    {
      usuario_id: "u-1",
      nombre_completo: "Ana Gómez",
      correo: "ana@example.com",
      aceptaciones: {
        terminos: { version: "1.0", aceptado_en: "2030-01-11T15:00:00Z" },
        privacidad: { version: "1.0", aceptado_en: "2030-01-11T15:00:00Z" },
      },
      al_dia: true,
    },
    {
      usuario_id: "u-2",
      nombre_completo: "Beto Ramírez",
      correo: "beto@example.com",
      aceptaciones: { terminos: null, privacidad: null },
      al_dia: false,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
  service.current.mockResolvedValue([TERMS, PRIVACY]);
});

describe("Markdown", () => {
  it("pinta títulos, listas, negrilla y enlaces seguros", () => {
    render(
      <Markdown text={"# Título\n\nTexto con **negrilla** y [un enlace](https://ejemplo.org).\n\n1. Uno\n2. Dos"} />,
    );

    expect(screen.getByRole("heading", { name: "Título" })).toBeInTheDocument();
    expect(screen.getByText("negrilla").tagName).toBe("STRONG");
    expect(screen.getByRole("link", { name: "un enlace" })).toHaveAttribute(
      "href",
      "https://ejemplo.org",
    );
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Uno", "Dos"]);
  });

  it("lo que parezca código se muestra como texto, nunca se ejecuta", () => {
    const { container } = render(
      <Markdown text={'<script>alert(1)</script> <img src=x onerror=alert(1)> [clic](javascript:alert(1))'} />,
    );

    expect(container.querySelector("script")).toBeNull();
    expect(container.querySelector("img")).toBeNull();
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(container.textContent).toContain("<script>alert(1)</script>");
  });
});

describe("Página pública de un documento", () => {
  it("muestra la versión vigente con su número y su fecha, sin sesión", async () => {
    service.byType.mockResolvedValue(TERMS);
    renderApp(<LegalDocumentPage tipo="terminos" />);

    expect(
      await screen.findByRole("heading", { level: 1, name: "Términos y condiciones" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Versión 1\.0 · Vigente desde el/)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "1. Tu cuenta" })).toBeInTheDocument();
    expect(service.byType).toHaveBeenCalledWith("terminos", expect.anything());
    // Desde el pie se llega al otro documento.
    expect(screen.getByRole("link", { name: "Política de privacidad" })).toHaveAttribute(
      "href",
      "/privacidad",
    );
  });

  it("si aún no está publicado lo dice", async () => {
    service.byType.mockRejectedValue(new Error("404"));
    renderApp(<LegalDocumentPage tipo="privacidad" />);

    expect(
      await screen.findByText(/Este documento todavía no está disponible/),
    ).toBeInTheDocument();
  });
});

describe("Registro", () => {
  it("la casilla enlaza a los dos documentos, en otra pestaña", async () => {
    renderApp(<RegisterPage />);

    const terminos = await screen.findByRole("link", { name: "términos y condiciones" });
    expect(terminos).toHaveAttribute("href", "/terminos");
    expect(terminos).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("link", { name: "política de privacidad" })).toHaveAttribute(
      "href",
      "/privacidad",
    );
    await waitFor(() => expect(service.current).toHaveBeenCalled());
  });
});

describe("Paso obligatorio de aceptación", () => {
  it("sin nada pendiente deja pasar a la aplicación", async () => {
    service.pending.mockResolvedValue([]);
    renderApp(<AcceptanceGate><p>La aplicación</p></AcceptanceGate>);

    expect(await screen.findByText("La aplicación")).toBeInTheDocument();
  });

  it("con documentos pendientes no muestra la aplicación hasta aceptar", async () => {
    const user = userEvent.setup();
    service.pending.mockResolvedValue([
      { id: TERMS.id, tipo: "terminos", version: "2.0", titulo: TERMS.titulo },
      { id: PRIVACY.id, tipo: "privacidad", version: "1.0", titulo: PRIVACY.titulo },
    ]);
    service.accept.mockResolvedValue(undefined);
    renderApp(<AcceptanceGate><p>La aplicación</p></AcceptanceGate>);

    expect(await screen.findByRole("heading", { name: "Antes de continuar" })).toBeInTheDocument();
    expect(screen.queryByText("La aplicación")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Términos y condiciones/ })).toHaveAttribute(
      "href",
      "/terminos",
    );
    expect(screen.getByText("Versión 2.0")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cerrar sesión" })).toBeInTheDocument();

    // Sin marcar la casilla no se puede continuar.
    const aceptar = screen.getByRole("button", { name: "Aceptar y continuar" });
    expect(aceptar).toBeDisabled();
    await user.click(screen.getByRole("checkbox"));
    await user.click(aceptar);

    expect(service.accept).toHaveBeenCalledWith([TERMS.id, PRIVACY.id]);
    expect(await screen.findByText("La aplicación")).toBeInTheDocument();
  });
});

describe("Documentos legales del administrador", () => {
  beforeEach(() => {
    service.versions.mockResolvedValue([
      admin(TERMS),
      admin(PRIVACY, { version: "1.1" }),
      admin(PRIVACY, { id: "doc-priv-viejo", estado: "archivado" }),
    ]);
    service.acceptances.mockResolvedValue(SUMMARY);
  });

  it("muestra la versión vigente, el historial y quién está pendiente", async () => {
    const user = userEvent.setup();
    renderApp(<AdminLegalPage />, "ADMIN");

    const privacidad = within(await screen.findByRole("region", { name: "Política de privacidad" }));
    expect(privacidad.getByText("Versión 1.1")).toBeInTheDocument();
    await user.click(privacidad.getByRole("button", { name: /Versiones anteriores \(1\)/ }));
    expect(privacidad.getByText(/Versión 1\.0 · publicada el/)).toBeInTheDocument();

    const aceptaciones = within(screen.getByRole("region", { name: "Aceptaciones" }));
    expect(aceptaciones.getByText(/1 de 2 personas están al día · 1 pendientes/)).toBeInTheDocument();
    expect(aceptaciones.getByRole("button", { name: /Beto Ramírez/ })).toHaveTextContent(
      "Términos: pendiente",
    );
  });

  it("crea un borrador, lo previsualiza y lo publica como corrección menor", async () => {
    const user = userEvent.setup();
    const draft = admin(TERMS, { id: "borrador-1", estado: "borrador", version: "2.0" });
    service.createDraft.mockResolvedValue(draft);
    service.saveDraft.mockImplementation(async (_id, dto) => ({ ...draft, ...dto }));
    service.publish.mockResolvedValue(admin(TERMS, { id: "borrador-1", version: "1.1" }));
    renderApp(<AdminLegalPage />, "ADMIN");

    const terminos = within(await screen.findByRole("region", { name: "Términos y condiciones" }));
    await user.click(terminos.getByRole("button", { name: "Crear nueva versión" }));

    // El editor parte del texto vigente y la vista previa lo muestra ya formateado.
    const contenido = await screen.findByLabelText(/Contenido/);
    expect(contenido).toHaveValue(TERMS.contenido);
    const vista = within(screen.getByRole("region", { name: "Vista previa" }));
    expect(vista.getByRole("heading", { name: "1. Tu cuenta" })).toBeInTheDocument();

    await user.type(contenido, "\n\n## 2. Nuevo apartado");
    expect(vista.getByRole("heading", { name: "2. Nuevo apartado" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Publicar…" }));
    const dialog = within(screen.getByRole("dialog"));
    // Por defecto, el cambio importante, con su advertencia.
    expect(dialog.getByRole("radio", { name: /Cambio importante/ })).toBeChecked();
    expect(dialog.getByRole("alert")).toHaveTextContent(
      /las 2 personas con cuenta no podrán usar la aplicación hasta aceptar/,
    );

    await user.click(dialog.getByRole("radio", { name: /Corrección menor/ }));
    expect(dialog.getByRole("alert")).toHaveTextContent(/sin pedir una nueva aceptación/);
    await user.click(dialog.getByRole("button", { name: "Publicar" }));

    // Se guarda lo que está en pantalla y se publica sin exigir aceptar.
    await waitFor(() => expect(service.publish).toHaveBeenCalledWith("borrador-1", false));
    expect(service.saveDraft).toHaveBeenCalledWith(
      "borrador-1",
      expect.objectContaining({ contenido: `${TERMS.contenido}\n\n## 2. Nuevo apartado` }),
    );
  });
});
