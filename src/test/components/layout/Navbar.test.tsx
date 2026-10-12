import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { participationService } from "../../../services/participationService";
import { renderApp } from "../../fixtures";
import { Navbar } from "../../../components/layout/Navbar";

vi.mock("../../../services/participationService", () => ({
  participationService: { listOwn: vi.fn() },
}));
vi.mock("../../../services/notificationService", () => ({
  notificationService: {
    list: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    unreadCount: vi.fn().mockResolvedValue(0),
  },
}));

const service = vi.mocked(participationService);

function pending(count: number) {
  service.listOwn.mockResolvedValue({
    conteos: { pendientes: count, respondidas: 0, todas: count },
    items: [],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  pending(2);
});

describe("Navbar: desplegable «Eventos» del miembro", () => {
  it("agrupa eventos, inscripciones, cronogramas y participaciones", async () => {
    const user = userEvent.setup();
    renderApp(<Navbar />, "MEMBER");

    // Fuera del desplegable solo quedan Inicio, Ministerios y Notificaciones.
    expect(screen.getByRole("link", { name: "Ministerios" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Cronogramas" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Eventos/ }));

    const expected: [RegExp, string][] = [
      [/Todos los eventos/, "/events"],
      [/Cronogramas/, "/schedules"],
      [/Mis inscripciones/, "/registrations"],
      [/Mis participaciones/, "/participations"],
    ];
    const items = screen.getAllByRole("menuitem");
    expect(items).toHaveLength(expected.length);
    expected.forEach(([name, href], i) => {
      expect(items[i]).toHaveAccessibleName(name);
      expect(items[i]).toHaveAttribute("href", href);
    });
  });

  it("cualquier miembro ve sus invitaciones pendientes, sin depender de un rol", async () => {
    const user = userEvent.setup();
    renderApp(<Navbar />, "MEMBER");

    const eventos = screen.getByRole("button", { name: /^Eventos/ });
    await waitFor(() =>
      expect(eventos).toHaveTextContent("2 participaciones pendientes"),
    );

    await user.click(eventos);
    expect(
      screen.getByRole("menuitem", { name: /Mis participaciones/ }),
    ).toHaveTextContent("2 pendientes");
  });

  it("oculta el contador cuando no hay invitaciones pendientes", async () => {
    const user = userEvent.setup();
    pending(0);
    renderApp(<Navbar />, "MEMBER");

    await waitFor(() => expect(service.listOwn).toHaveBeenCalled());
    const eventos = screen.getByRole("button", { name: /^Eventos/ });
    expect(eventos).not.toHaveTextContent(/pendientes/);

    await user.click(eventos);
    expect(
      screen.getByRole("menuitem", { name: /Mis participaciones/ }),
    ).not.toHaveTextContent(/pendientes/);
  });

  it("se abre con el teclado y Escape devuelve el foco al botón", async () => {
    const user = userEvent.setup();
    renderApp(<Navbar />, "MEMBER");
    const eventos = screen.getByRole("button", { name: /^Eventos/ });

    eventos.focus();
    await user.keyboard("{ArrowDown}");
    await waitFor(() =>
      expect(screen.getByRole("menuitem", { name: /Todos los eventos/ })).toHaveFocus(),
    );

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(eventos).toHaveFocus();
  });

  it("en móvil lista todo, con «Mis inscripciones» y «Mis participaciones»", async () => {
    const user = userEvent.setup();
    renderApp(<Navbar />, "MEMBER");

    await user.click(screen.getByRole("button", { name: "Abrir menú" }));

    expect(screen.getByRole("link", { name: "Mis inscripciones" })).toHaveAttribute(
      "href",
      "/registrations",
    );
    await waitFor(() =>
      expect(
        screen.getByRole("link", { name: /^Mis participaciones/ }),
      ).toHaveTextContent("2 pendientes"),
    );
  });
});
