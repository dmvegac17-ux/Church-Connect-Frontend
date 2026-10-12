import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { excerpt, imageError, updatedLine } from "../../../lib/announcements";
import { AnnouncementsPage } from "../../../pages/announcements/AnnouncementsPage";
import { announcementService } from "../../../services/announcementService";
import type { Announcement } from "../../../types/announcement";
import { renderApp } from "../../fixtures";

vi.mock("../../../services/announcementService", () => ({
  announcementService: { list: vi.fn() },
}));

const service = vi.mocked(announcementService);

/* Datos ficticios, solo para pruebas. */
function anuncio(n: number, overrides: Partial<Announcement> = {}): Announcement {
  return {
    id: `a-${n}`,
    titulo: `Anuncio ${n}`,
    contenido: `Texto del anuncio ${n}`,
    imagen_url: null,
    publicado_por: { id: "u-1", nombre_completo: "Persona Admin" },
    fecha_publicacion: "2026-10-12T15:00:00Z",
    actualizado_por: null,
    fecha_actualizacion: null,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AnnouncementsPage (miembro)", () => {
  it("muestra el estado vacío", async () => {
    service.list.mockResolvedValue({ items: [], total: 0 });
    renderApp(<AnnouncementsPage />);

    expect(await screen.findByText("Aún no hay anuncios")).toBeInTheDocument();
  });

  it("muestra la carga y luego las tarjetas con autor y enlace al detalle", async () => {
    service.list.mockResolvedValue({
      items: [anuncio(1, { imagen_url: "https://storage.test/a.png" }), anuncio(2)],
      total: 2,
    });
    renderApp(<AnnouncementsPage />);

    expect(screen.getByRole("status", { name: "Cargando anuncios" })).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Anuncio 1" })).toBeInTheDocument();
    expect(screen.getAllByText(/Persona Admin/)).toHaveLength(2);
    expect(screen.getByRole("link", { name: /Anuncio 2/ })).toHaveAttribute(
      "href",
      "/announcements/a-2",
    );
    expect(screen.queryByRole("button", { name: /Ver más/ })).not.toBeInTheDocument();
  });

  it("carga más anuncios por tandas", async () => {
    const user = userEvent.setup();
    service.list
      .mockResolvedValueOnce({ items: [anuncio(1), anuncio(2)], total: 3 })
      .mockResolvedValueOnce({ items: [anuncio(3)], total: 3 });
    renderApp(<AnnouncementsPage />);

    await user.click(await screen.findByRole("button", { name: "Ver más anuncios (1)" }));

    expect(await screen.findByRole("heading", { name: "Anuncio 3" })).toBeInTheDocument();
    expect(service.list).toHaveBeenLastCalledWith(expect.objectContaining({ offset: 2 }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Ver más/ })).not.toBeInTheDocument(),
    );
  });

  it("si falla la carga ofrece reintentar", async () => {
    const user = userEvent.setup();
    service.list.mockRejectedValueOnce(new Error("sin red"));
    renderApp(<AnnouncementsPage />);

    service.list.mockResolvedValue({ items: [anuncio(1)], total: 1 });
    await user.click(await screen.findByRole("button", { name: "Reintentar" }));

    expect(await screen.findByRole("heading", { name: "Anuncio 1" })).toBeInTheDocument();
  });
});

describe("utilidades de anuncios", () => {
  it("valida tipo y tamaño de la imagen antes de enviar", () => {
    const png = new File([new Uint8Array(10)], "a.png", { type: "image/png" });
    const gif = new File([new Uint8Array(10)], "a.gif", { type: "image/gif" });
    const grande = new File([new Uint8Array(5 * 1024 * 1024 + 1)], "g.jpg", {
      type: "image/jpeg",
    });

    expect(imageError(png)).toBeNull();
    expect(imageError(gif)).toMatch(/JPG, PNG o WebP/);
    expect(imageError(grande)).toMatch(/5 MB/);
  });

  it("recorta el extracto sin partir palabras", () => {
    expect(excerpt("uno dos tres cuatro", 10)).toBe("uno dos…");
    expect(excerpt("corto", 10)).toBe("corto");
  });

  it("solo muestra la última actualización si la hubo", () => {
    expect(updatedLine(anuncio(1))).toBeNull();
    expect(
      updatedLine(
        anuncio(1, {
          actualizado_por: { id: "u-2", nombre_completo: "Persona Editora" },
          fecha_actualizacion: "2026-10-12T20:00:00Z",
        }),
      ),
    ).toMatch(/^Última actualización por Persona Editora el 12 oct 2026/);
  });
});
