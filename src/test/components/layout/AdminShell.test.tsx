import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AdminShell } from "../../../components/layout/AdminShell";
import { participationService } from "../../../services/participationService";
import { renderApp } from "../../fixtures";

vi.mock("../../../services/participationService", () => ({
  participationService: { listOwn: vi.fn() },
}));

const service = vi.mocked(participationService);

beforeEach(() => {
  vi.clearAllMocks();
  service.listOwn.mockResolvedValue({
    conteos: { pendientes: 3, respondidas: 0, todas: 3 },
    items: [],
  });
});

describe("AdminShell: lo propio del administrador", () => {
  it("ofrece «Mis participaciones» y «Mis inscripciones» antes de GESTIÓN", () => {
    renderApp(<AdminShell />, "ADMIN");
    const nav = within(screen.getByRole("complementary", { name: "Panel de administración" }));

    const labels = nav.getAllByRole("link").map((link) => link.textContent ?? "");
    const mine = labels.findIndex((label) => label.startsWith("Mis inscripciones"));
    const manage = labels.findIndex((label) => label === "Usuarios");

    expect(nav.getByRole("link", { name: /^Mis inscripciones/ })).toHaveAttribute(
      "href",
      "/my-registrations",
    );
    expect(nav.getByRole("link", { name: /^Mis participaciones/ })).toHaveAttribute(
      "href",
      "/my-participations",
    );
    expect(mine).toBeGreaterThan(-1);
    expect(mine).toBeLessThan(manage);
  });

  it("no se confunde con «Inscripciones», que es la gestión de todos", () => {
    renderApp(<AdminShell />, "ADMIN");
    const nav = within(screen.getByRole("complementary", { name: "Panel de administración" }));

    expect(nav.getByRole("link", { name: "Inscripciones" })).toHaveAttribute(
      "href",
      "/registrations",
    );
  });

  it("el contador de pendientes va solo en «Mis participaciones»", async () => {
    renderApp(<AdminShell />, "ADMIN");
    const nav = within(screen.getByRole("complementary", { name: "Panel de administración" }));

    await waitFor(() =>
      expect(nav.getByRole("link", { name: /^Mis participaciones/ })).toHaveTextContent(
        "3 invitaciones pendientes",
      ),
    );
    expect(nav.getByRole("link", { name: /^Mis inscripciones/ })).not.toHaveTextContent(
      /pendientes/,
    );
  });
});

describe("AdminShell: separador y menú contraíble", () => {
  const sidebar = () =>
    screen.getByRole("complementary", { name: "Panel de administración" });

  it("una línea separa «Inicio» de lo propio del administrador", () => {
    renderApp(<AdminShell />, "ADMIN");
    const nav = within(sidebar()).getByRole("navigation", { name: "Principal" });

    // En orden: Inicio, separador, Mis participaciones.
    const children = Array.from(nav.children);
    const inicio = children.findIndex((el) => el.textContent === "Inicio");
    expect(children[inicio + 1]).toHaveAttribute("role", "separator");
    expect(children[inicio + 2]).toHaveTextContent("Mis participaciones");
  });

  it("empieza expandido, con los nombres visibles", () => {
    renderApp(<AdminShell />, "ADMIN");

    expect(
      within(sidebar()).getByRole("button", { name: "Contraer el menú" }),
    ).toHaveAttribute("aria-expanded", "true");
    expect(within(sidebar()).getByText("GESTIÓN")).toBeInTheDocument();
    expect(within(sidebar()).getByText("Usuarios")).not.toHaveClass("sr-only");
  });

  it("al contraerlo deja solo los iconos, sin perder los nombres accesibles", async () => {
    const user = userEvent.setup();
    renderApp(<AdminShell />, "ADMIN");

    await user.click(within(sidebar()).getByRole("button", { name: "Contraer el menú" }));

    const expandir = within(sidebar()).getByRole("button", { name: "Expandir el menú" });
    expect(expandir).toHaveAttribute("aria-expanded", "false");
    expect(within(sidebar()).queryByText("GESTIÓN")).not.toBeInTheDocument();
    expect(within(sidebar()).queryByText("ADMINISTRACIÓN")).not.toBeInTheDocument();

    // El texto ya no se ve, pero cada enlace conserva su nombre y un `title`.
    const usuarios = within(sidebar()).getByRole("link", { name: "Usuarios" });
    expect(usuarios).toHaveAttribute("href", "/users");
    expect(usuarios).toHaveAttribute("title", "Usuarios");
    expect(within(usuarios).getByText("Usuarios")).toHaveClass("sr-only");
    expect(
      within(sidebar()).getByRole("button", { name: "Cerrar sesión" }),
    ).toHaveAttribute("title", "Cerrar sesión");

    await user.click(expandir);
    expect(within(sidebar()).getByText("GESTIÓN")).toBeInTheDocument();
    expect(within(sidebar()).getByText("Usuarios")).not.toHaveClass("sr-only");
  });

  it("contraído sigue avisando de las invitaciones pendientes", async () => {
    const user = userEvent.setup();
    renderApp(<AdminShell />, "ADMIN");
    await user.click(within(sidebar()).getByRole("button", { name: "Contraer el menú" }));

    await waitFor(() =>
      expect(
        within(sidebar()).getByRole("link", { name: /^Mis participaciones/ }),
      ).toHaveTextContent("3 invitaciones pendientes"),
    );
  });

  it("recuerda la preferencia la próxima vez que se abre", async () => {
    const user = userEvent.setup();
    const first = renderApp(<AdminShell />, "ADMIN");
    await user.click(within(sidebar()).getByRole("button", { name: "Contraer el menú" }));
    first.unmount();

    renderApp(<AdminShell />, "ADMIN");

    expect(
      within(sidebar()).getByRole("button", { name: "Expandir el menú" }),
    ).toBeInTheDocument();
  });
});
