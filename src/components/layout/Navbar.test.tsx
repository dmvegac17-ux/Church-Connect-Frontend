import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { participationService } from "../../services/participationService";
import { renderApp } from "../../test/fixtures";
import { Navbar } from "./Navbar";

vi.mock("../../services/participationService", () => ({
  participationService: { listOwn: vi.fn() },
}));
vi.mock("../../services/notificationService", () => ({
  notificationService: { list: vi.fn().mockResolvedValue({ items: [], total: 0 }) },
}));

const service = vi.mocked(participationService);

beforeEach(() => {
  vi.clearAllMocks();
  service.listOwn.mockResolvedValue({
    conteos: { pendientes: 2, respondidas: 0, todas: 2 },
    items: [],
  });
});

describe("Navbar: opción de participaciones según el rol", () => {
  it("el miembro conserva su menú y no consulta invitaciones", async () => {
    renderApp(<Navbar />, "MEMBER");

    expect(screen.getByRole("link", { name: "Eventos" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Cronogramas" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Eventos/ })).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Abrir menú" }));
    expect(screen.queryByRole("link", { name: /Participaciones/ })).not.toBeInTheDocument();
    expect(service.listOwn).not.toHaveBeenCalled();
  });

  it("el participante ve «Confirmar participaciones» con sus pendientes", async () => {
    const user = userEvent.setup();
    renderApp(<Navbar />, "PARTICIPANT");

    const eventos = screen.getByRole("button", { name: /^Eventos/ });
    await waitFor(() =>
      expect(eventos).toHaveTextContent("2 participaciones pendientes"),
    );

    await user.click(eventos);
    const item = screen.getByRole("menuitem", { name: /Confirmar participaciones/ });
    expect(item).toHaveAttribute("href", "/participations");
    expect(screen.getByRole("menuitem", { name: /Todos los eventos/ })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: /Cronogramas/ })).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Abrir menú" }));
    expect(screen.getByRole("link", { name: /Participaciones/ })).toHaveAttribute(
      "href",
      "/participations",
    );
  });
});
