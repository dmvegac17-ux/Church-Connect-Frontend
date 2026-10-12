import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { AdminAnnouncementsPage } from "../../../../pages/admin/announcements/AdminAnnouncementsPage";
import { announcementService } from "../../../../services/announcementService";
import { ApiError } from "../../../../types/api";
import type { Announcement } from "../../../../types/announcement";
import { renderApp } from "../../../fixtures";

vi.mock("../../../../services/announcementService", () => ({
  announcementService: {
    list: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

const service = vi.mocked(announcementService);

/* Datos ficticios, solo para pruebas. */
const existente: Announcement = {
  id: "a-1",
  titulo: "Anuncio existente",
  contenido: "Texto existente",
  imagen_url: "https://storage.test/actual.png",
  publicado_por: { id: "u-1", nombre_completo: "Persona Autora" },
  fecha_publicacion: "2026-10-01T15:00:00Z",
  actualizado_por: { id: "u-2", nombre_completo: "Persona Editora" },
  fecha_actualizacion: "2026-10-05T15:00:00Z",
};

beforeAll(() => {
  // jsdom no implementa las URL de objeto que usa la vista previa.
  URL.createObjectURL = vi.fn(() => "blob:vista-previa");
  URL.revokeObjectURL = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
  service.list.mockResolvedValue({ items: [existente], total: 1 });
});

function png(nombre = "foto.png") {
  return new File([new Uint8Array(100)], nombre, { type: "image/png" });
}

function fileInput(container: HTMLElement): HTMLInputElement {
  return container.querySelector("input[type=file]") as HTMLInputElement;
}

describe("AdminAnnouncementsPage", () => {
  it("muestra quién publicó y quién actualizó", async () => {
    renderApp(<AdminAnnouncementsPage />, "ADMIN");
    const table = within(await screen.findByRole("table"));

    expect(table.getByText(/Publicado por Persona Autora el 1 oct 2026/)).toBeInTheDocument();
    expect(table.getByText(/Actualizado por Persona Editora el 5 oct 2026/)).toBeInTheDocument();
  });

  it("crear: valida campos, rechaza tipos no permitidos y sube con progreso", async () => {
    // Sin filtrar por `accept`: así se prueba lo que pasaría si el navegador
    // dejara pasar (o se arrastrara) un archivo de otro tipo.
    const user = userEvent.setup({ applyAccept: false });
    let reportar: (f: number) => void = () => {};
    let terminar: (a: Announcement) => void = () => {};
    service.create.mockImplementation(
      (_draft, options) =>
        new Promise((resolve) => {
          reportar = options?.onProgress ?? (() => {});
          terminar = resolve;
        }),
    );
    renderApp(<AdminAnnouncementsPage />, "ADMIN");
    await screen.findByRole("table");

    await user.click(screen.getByRole("button", { name: "Nuevo anuncio" }));
    const drawer = screen.getByRole("dialog", { name: "Nuevo anuncio" });

    await user.click(within(drawer).getByRole("button", { name: "Publicar anuncio" }));
    expect(within(drawer).getByText("Escribe el título.")).toBeInTheDocument();
    expect(within(drawer).getByText("Escribe el texto del anuncio.")).toBeInTheDocument();
    expect(service.create).not.toHaveBeenCalled();

    await user.upload(fileInput(drawer), new File(["x"], "a.gif", { type: "image/gif" }));
    expect(within(drawer).getByText(/Formato no permitido/)).toBeInTheDocument();

    await user.upload(fileInput(drawer), png());
    expect(within(drawer).getByRole("img", { name: /Vista previa/ })).toHaveAttribute(
      "src",
      "blob:vista-previa",
    );

    await user.type(within(drawer).getByLabelText(/^Título/), "Nuevo aviso");
    await user.type(within(drawer).getByLabelText(/^Texto/), "Contenido del aviso");
    await user.click(within(drawer).getByRole("button", { name: "Publicar anuncio" }));

    await waitFor(() => expect(service.create).toHaveBeenCalled());
    // El autor no viaja en la petición: lo pone el servidor.
    expect(service.create.mock.calls[0][0]).toEqual({
      titulo: "Nuevo aviso",
      contenido: "Contenido del aviso",
      imagen: expect.any(File),
    });

    reportar(0.4);
    expect(
      await screen.findByRole("progressbar", { name: "Subida de la imagen" }),
    ).toHaveAttribute("aria-valuenow", "40");

    terminar({ ...existente, id: "a-2", titulo: "Nuevo aviso" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Nuevo anuncio" })).not.toBeInTheDocument(),
    );
  });

  it("editar: quitar la imagen envía solo lo que cambió", async () => {
    const user = userEvent.setup();
    service.update.mockResolvedValue({ ...existente, imagen_url: null });
    renderApp(<AdminAnnouncementsPage />, "ADMIN");
    const table = within(await screen.findByRole("table"));

    await user.click(
      table.getByRole("button", { name: "Editar el anuncio «Anuncio existente»" }),
    );
    const drawer = within(screen.getByRole("dialog", { name: "Editar anuncio" }));
    expect(drawer.getByText(/Publicado por Persona Autora/)).toBeInTheDocument();

    await user.click(drawer.getByRole("button", { name: "Quitar imagen" }));
    await user.click(drawer.getByRole("button", { name: "Guardar cambios" }));

    await waitFor(() =>
      expect(service.update).toHaveBeenCalledWith(
        "a-1",
        { quitarImagen: true },
        expect.anything(),
      ),
    );
  });

  it("muestra junto al campo el error de imagen del servidor", async () => {
    const user = userEvent.setup();
    const mensaje = "Formato no permitido. Usa una imagen JPG, PNG o WebP.";
    service.update.mockRejectedValue(
      new ApiError(mensaje, 422, [], {
        statusCode: 422,
        status: "UnprocessableEntity",
        data: { campo: "imagen" },
        success: false,
        message: mensaje,
        errors: null,
        timestamp: "",
        meta: null,
      }),
    );
    renderApp(<AdminAnnouncementsPage />, "ADMIN");
    const table = within(await screen.findByRole("table"));

    await user.click(table.getByRole("button", { name: /Editar el anuncio/ }));
    const dialog = screen.getByRole("dialog", { name: "Editar anuncio" });
    await user.upload(fileInput(dialog), png("b.png"));
    await user.click(within(dialog).getByRole("button", { name: "Guardar cambios" }));

    expect(await within(dialog).findByText(mensaje)).toBeInTheDocument();
    expect(screen.getByRole("dialog", { name: "Editar anuncio" })).toBeInTheDocument();
  });

  it("eliminar pide confirmación", async () => {
    const user = userEvent.setup();
    service.remove.mockResolvedValue();
    renderApp(<AdminAnnouncementsPage />, "ADMIN");
    const table = within(await screen.findByRole("table"));

    await user.click(
      table.getByRole("button", { name: "Eliminar el anuncio «Anuncio existente»" }),
    );
    const dialog = within(screen.getByRole("alertdialog", { name: "Eliminar anuncio" }));
    expect(dialog.getByText(/su imagen se borrará/)).toBeInTheDocument();
    expect(service.remove).not.toHaveBeenCalled();

    await user.click(dialog.getByRole("button", { name: "Eliminar anuncio" }));

    await waitFor(() => expect(service.remove).toHaveBeenCalledWith("a-1"));
  });
});
