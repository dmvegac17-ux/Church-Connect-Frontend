import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { NotificationDetailPage } from "../../../pages/notifications/NotificationDetailPage";
import { NotificationsListPage } from "../../../pages/notifications/NotificationsListPage";
import { notificationService } from "../../../services/notificationService";
import type { Notification } from "../../../types/notification";
import { renderApp } from "../../fixtures";

vi.mock("../../../services/notificationService", () => ({
  MARK_BATCH_MAX: 500,
  notificationService: {
    list: vi.fn(),
    getById: vi.fn(),
    update: vi.fn(),
    markRead: vi.fn(),

    markAllRead: vi.fn(),
    remove: vi.fn(),
  },
}));
const navigate = vi.fn();
vi.mock("react-router-dom", async (original) => ({
  ...(await original<typeof import("react-router-dom")>()),
  useParams: () => ({ id: "n-2" }),
  useNavigate: () => navigate,
}));

const service = vi.mocked(notificationService);

function notification(i: number, overrides: Partial<Notification> = {}): Notification {
  return {
    id: `n-${i}`,
    titulo: `Aviso ${i}`,
    mensaje: `<div>Contenido ${i}</div>`,
    usuario_id: "me",
    leida: true,
    // De la más reciente (1) a la más antigua.
    fecha_envio: new Date(Date.UTC(2026, 0, 28 - i, 15)).toISOString(),
    ...overrides,
  };
}

function serve(items: Notification[]) {
  service.list.mockResolvedValue({ items, total: items.length });
}

const titles = () =>
  screen.getAllByRole("link").map((link) => within(link).getByText(/^(Aviso|Reunión)/).textContent);

beforeEach(() => {
  vi.clearAllMocks();
  service.update.mockImplementation(async (id, dto) => ({
    ...notification(1),
    id,
    ...dto,
  }));
});

describe("Bandeja de notificaciones", () => {
  it("busca por asunto, contenido o remitente, sin distinguir tildes", async () => {
    const user = userEvent.setup();
    serve([
      notification(1, { titulo: "Reunión de jóvenes" }),
      notification(2, { mensaje: "<div>Trae tu biblia</div><div>Atte, Marta Ruiz</div>" }),
      notification(3),
    ]);
    renderApp(<NotificationsListPage />);
    const search = await screen.findByRole("searchbox", { name: "Buscar notificaciones" });

    await user.type(search, "reunion");
    expect(titles()).toEqual(["Reunión de jóvenes"]);

    await user.clear(search);
    await user.type(search, "marta");
    expect(titles()).toEqual(["Aviso 2"]);
    expect(screen.getByText("Marta Ruiz")).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "zzz");
    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
  });

  it("filtra por leídas y no leídas, y ordena", async () => {
    const user = userEvent.setup();
    serve([notification(1, { leida: false }), notification(2), notification(3)]);
    renderApp(<NotificationsListPage />);
    await screen.findByText("Aviso 1");

    await user.click(screen.getByRole("button", { name: /^No leídas/ }));
    expect(titles()).toEqual(["Aviso 1"]);

    await user.click(screen.getByRole("button", { name: /^Leídas/ }));
    expect(titles()).toEqual(["Aviso 2", "Aviso 3"]);

    await user.selectOptions(screen.getByLabelText("Orden"), "oldest");
    expect(titles()).toEqual(["Aviso 3", "Aviso 2"]);
  });

  it("pagina y permite cambiar las filas por página", async () => {
    const user = userEvent.setup();
    serve(Array.from({ length: 23 }, (_, i) => notification(i + 1)));
    renderApp(<NotificationsListPage />);
    await screen.findByText("Aviso 1");

    expect(titles()).toHaveLength(10);
    expect(screen.getByText(/1–10 de 23/)).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Filas por página"), "25");
    expect(titles()).toHaveLength(23);
  });

  it("marca una notificación leída como no leída, y al revés", async () => {
    const user = userEvent.setup();
    serve([notification(1), notification(2)]);
    renderApp(<NotificationsListPage />);

    await user.click(
      await screen.findByRole("button", { name: "Marcar como no leída: Aviso 1" }),
    );

    expect(service.markRead).toHaveBeenCalledWith(["n-1"], false);
    expect(screen.getByText("1 sin leer de 2 notificaciones.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Marcar como leída: Aviso 1" }));
    expect(service.markRead).toHaveBeenLastCalledWith(["n-1"], true);
  });

  it("marca varias seleccionadas a la vez, solo las que cambian", async () => {
    const user = userEvent.setup();
    serve([notification(1), notification(2, { leida: false }), notification(3)]);
    renderApp(<NotificationsListPage />);
    await screen.findByText("Aviso 1");

    await user.click(screen.getByLabelText("Seleccionar esta página"));
    expect(screen.getByText("3 seleccionadas")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Marcar como no leídas" }));

    // Una sola petición con las que cambian, no una por notificación.
    await waitFor(() => expect(service.markRead).toHaveBeenCalledTimes(1));
    expect(service.markRead).toHaveBeenCalledWith(["n-1", "n-3"], false);
    expect(service.update).not.toHaveBeenCalled();
    expect(screen.getByText("3 sin leer de 3 notificaciones.")).toBeInTheDocument();
  });

  it("«Marcar todas como leídas» no envía ids: una sola petición", async () => {
    const user = userEvent.setup();
    serve(Array.from({ length: 12 }, (_, i) => notification(i + 1, { leida: false })));
    renderApp(<NotificationsListPage />);

    await user.click(
      await screen.findByRole("button", { name: "Marcar todas como leídas" }),
    );

    expect(service.markAllRead).toHaveBeenCalledTimes(1);
    expect(service.markRead).not.toHaveBeenCalled();
    expect(screen.getByText("12 notificaciones, todas leídas.")).toBeInTheDocument();
  });
});

describe("Lector de una notificación", () => {
  it("muestra el aviso como un correo y su posición en la bandeja", async () => {
    const aviso = notification(2, {
      mensaje:
        "<div>Trae tu biblia</div><div><br></div><div>Atte, Marta Ruiz</div>" +
        "<div>Administrador de Church Connect</div>",
    });
    serve([notification(1), aviso, notification(3)]);
    service.getById.mockResolvedValue(aviso);
    renderApp(<NotificationDetailPage />);

    expect(await screen.findByRole("heading", { name: "Aviso 2" })).toBeInTheDocument();
    expect(screen.getByText("Marta Ruiz")).toBeInTheDocument();
    expect(screen.getByText("Administrador de Church Connect · para mí")).toBeInTheDocument();
    expect(await screen.findByText("2 de 3")).toBeInTheDocument();
  });

  it("«Marcar como no leída» la deja pendiente y vuelve a la bandeja", async () => {
    const user = userEvent.setup();
    serve([notification(2)]);
    service.getById.mockResolvedValue(notification(2));
    renderApp(<NotificationDetailPage />);

    await user.click(await screen.findByRole("button", { name: "Marcar como no leída" }));

    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/notifications"));
    expect(service.update).toHaveBeenCalledWith("n-2", { leida: false });
  });
});

describe("Formato del aviso de cambio", () => {
  it("conserva lo anterior tachado en rojo y lo nuevo en verde", async () => {
    const { sanitizeNotificationHtml } = await import("../../../lib/sanitizeHtml");
    const html =
      '<div><b>Horario:</b> <span style="color:#b42318;text-decoration:line-through;">' +
      '<s>16 oct 5:01 a. m. – 6:00 a. m.</s></span> → ' +
      '<b><span style="color:#1a7f37;">16 oct 8:01 a. m. – 9:30 a. m.</span></b></div>';

    const safe = sanitizeNotificationHtml(html);

    expect(safe).toContain("<s>16 oct 5:01 a. m. – 6:00 a. m.</s>");
    expect(safe).toMatch(/color:\s*#b42318/);
    expect(safe).toMatch(/line-through/);
    expect(safe).toMatch(/color:\s*#1a7f37/);
  });
});

describe("Bandeja: selección entre páginas", () => {
  it("conserva lo seleccionado al cambiar de página y aplica la acción a todo", async () => {
    const user = userEvent.setup();
    serve(Array.from({ length: 15 }, (_, i) => notification(i + 1)));
    renderApp(<NotificationsListPage />);
    await screen.findByText("Aviso 1");

    // Las 10 de la primera página…
    await user.click(screen.getByLabelText("Seleccionar esta página"));
    expect(screen.getByText("10 seleccionadas")).toBeInTheDocument();

    // …y dos de la segunda.
    await user.click(screen.getByRole("button", { name: "Página siguiente" }));
    await user.click(screen.getByLabelText("Seleccionar: Aviso 11"));
    await user.click(screen.getByLabelText("Seleccionar: Aviso 12"));
    expect(screen.getByText("12 seleccionadas (2 en esta página)")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Marcar como no leídas" }));

    await waitFor(() => expect(service.markRead).toHaveBeenCalledTimes(1));
    expect(service.markRead.mock.calls[0][0]).toHaveLength(12);
    expect(screen.getByText("12 sin leer de 15 notificaciones.")).toBeInTheDocument();
  });

  it("«Limpiar selección» la vacía", async () => {
    const user = userEvent.setup();
    serve([notification(1), notification(2)]);
    renderApp(<NotificationsListPage />);
    await screen.findByText("Aviso 1");

    await user.click(screen.getByLabelText("Seleccionar: Aviso 1"));
    await user.click(screen.getByRole("button", { name: "Limpiar selección" }));

    expect(screen.getByLabelText("Seleccionar esta página")).not.toBeChecked();
    expect(screen.queryByText(/seleccionada/)).not.toBeInTheDocument();
  });

  it("no deja pasar de 500 seleccionadas y lo avisa", async () => {
    const user = userEvent.setup();
    serve(Array.from({ length: 503 }, (_, i) => notification(i + 1)));
    renderApp(<NotificationsListPage />);
    await screen.findByText("Aviso 1");

    // Seis páginas de 100: las cinco primeras completan el tope.
    await user.selectOptions(screen.getByLabelText("Filas por página"), "100");
    for (let page = 1; page <= 5; page++) {
      await user.click(screen.getByLabelText(/^(Seleccionar esta página|\d+ seleccionadas)/));
      await user.click(screen.getByRole("button", { name: "Página siguiente" }));
    }
    expect(screen.getByText("500 seleccionadas (0 en esta página)")).toBeInTheDocument();

    await user.click(screen.getByLabelText("Seleccionar: Aviso 501"));

    expect(
      screen.getByText(/Puedes seleccionar como máximo 500 notificaciones a la vez/),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Seleccionar: Aviso 501")).not.toBeChecked();
    expect(screen.getByText("500 seleccionadas (0 en esta página)")).toBeInTheDocument();
  }, 60_000);
});
