import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { participationService } from "../../services/participationService";
import { invitation, renderApp } from "../../test/fixtures";
import { ApiError } from "../../types/api";
import type { Invitation } from "../../types/participation";
import { InvitationCard, ParticipationsPage } from "./ParticipationsPage";

vi.mock("../../services/participationService", () => ({
  participationService: {
    listOwn: vi.fn(),
    accept: vi.fn(),
    reject: vi.fn(),
  },
}));

const service = vi.mocked(participationService);

function serve(items: Invitation[]) {
  const pendientes = items.filter((i) => i.estado_respuesta === "pendiente").length;
  service.listOwn.mockResolvedValue({
    conteos: { pendientes, respondidas: items.length - pendientes, todas: items.length },
    items,
  });
}

function conflict(estado: string) {
  return new ApiError("Conflicto", 409, [], {
    statusCode: 409,
    status: "Conflict",
    data: { estado_actual: estado },
    success: false,
    message: "Conflicto",
    errors: null,
    timestamp: "",
    meta: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("InvitationCard", () => {
  const noop = () => {};

  it("pendiente: muestra el plazo y las dos acciones", () => {
    renderApp(<InvitationCard invitation={invitation()} onAccept={noop} onReject={noop} />);

    expect(screen.getByText("Pendiente de respuesta")).toBeInTheDocument();
    expect(screen.getByText(/Responde antes del/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Aceptar participación en/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Rechazar participación en/ })).toBeEnabled();
    expect(screen.getByText("Persona Responsable · Área de prueba")).toBeInTheDocument();
    expect(screen.getByText("Salón de prueba")).toBeInTheDocument();
  });

  it("resalta el plazo cuando faltan dos días o menos", () => {
    const urgente = invitation({
      fecha_limite_respuesta: new Date(Date.now() + 86_400_000).toISOString(),
    });
    renderApp(<InvitationCard invitation={urgente} onAccept={noop} onReject={noop} />);

    expect(screen.getByText("Responde hoy o mañana").className).toContain("font-extrabold");
  });

  it.each([
    ["aceptada", "Aceptada", /Confirmaste tu participación/],
    ["rechazada", "Rechazada", /no podrás participar/],
    ["vencida", "Vencida", /El plazo para responder terminó/],
    ["cancelada", "Cancelada", /canceló esta invitación/],
    ["revocada", "Revocada", /otra persona/],
  ] as const)("%s: sin botones y con su explicación", (estado, etiqueta, texto) => {
    renderApp(
      <InvitationCard
        invitation={invitation({
          estado_respuesta: estado,
          fecha_respuesta: "2026-10-02T15:00:00Z",
          motivo_rechazo: estado === "rechazada" ? "Motivo de prueba" : null,
        })}
        onAccept={noop}
        onReject={noop}
      />,
    );

    expect(screen.getByText(etiqueta)).toBeInTheDocument();
    expect(screen.getByText(texto)).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    if (estado === "rechazada") {
      expect(screen.getByText("Motivo: Motivo de prueba")).toBeInTheDocument();
    }
  });
});

describe("ParticipationsPage", () => {
  it("muestra los conteos por pestaña y empieza en Pendientes", async () => {
    serve([
      invitation(),
      invitation({ id: "inv-2", estado_respuesta: "aceptada" }),
    ]);
    renderApp(<ParticipationsPage />);

    expect(await screen.findByText(/Tienes 1 invitación pendiente/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pendientes · 1" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Respondidas · 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Todas · 2" })).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });

  it("muestra el estado vacío de la pestaña", async () => {
    serve([]);
    renderApp(<ParticipationsPage />);

    expect(await screen.findByText("No tienes invitaciones pendientes")).toBeInTheDocument();
  });

  it("si la carga falla ofrece reintentar", async () => {
    service.listOwn.mockRejectedValueOnce(new ApiError("sin red", 0));
    renderApp(<ParticipationsPage />);

    expect(await screen.findByText("No pudimos cargar tus invitaciones")).toBeInTheDocument();

    serve([invitation()]);
    await userEvent.click(screen.getByRole("button", { name: "Reintentar" }));

    expect(await screen.findByText("Actividad de prueba")).toBeInTheDocument();
  });

  it("rechazar: contador del motivo, límite de 255 y cierre con Volver", async () => {
    const user = userEvent.setup();
    serve([invitation()]);
    renderApp(<ParticipationsPage />);

    await user.click(await screen.findByRole("button", { name: /Rechazar participación en/ }));
    const dialog = screen.getByRole("alertdialog", { name: "Rechazar participación" });
    const motivo = within(dialog).getByLabelText(/Motivo/);

    expect(within(dialog).getByText("0/255")).toBeInTheDocument();
    expect(motivo).toHaveAttribute("maxlength", "255");

    await user.type(motivo, "Estaré de viaje");
    expect(within(dialog).getByText("15/255")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Volver" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(service.reject).not.toHaveBeenCalled();
  });

  it("el diálogo se cierra con Escape", async () => {
    const user = userEvent.setup();
    serve([invitation()]);
    renderApp(<ParticipationsPage />);

    await user.click(await screen.findByRole("button", { name: /Aceptar participación en/ }));
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("aceptar actualiza la tarjeta solo tras la respuesta del servidor", async () => {
    const user = userEvent.setup();
    serve([invitation()]);
    let resolve: (value: Invitation) => void = () => {};
    service.accept.mockReturnValue(new Promise((r) => (resolve = r)));
    renderApp(<ParticipationsPage />);

    await user.click(await screen.findByRole("button", { name: /Aceptar participación en/ }));
    await user.click(screen.getByRole("button", { name: "Sí, participaré" }));

    // En curso: botón ocupado y la tarjeta sigue pendiente.
    expect(screen.getByRole("button", { name: /Confirmando/ })).toBeDisabled();
    expect(screen.getByText("Pendiente de respuesta")).toBeInTheDocument();

    resolve(invitation({ estado_respuesta: "aceptada", fecha_respuesta: "2026-10-09T15:00:00Z" }));

    expect(await screen.findByText(/Confirmaste tu participación en «/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pendientes · 0" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Respondidas · 1" })).toBeInTheDocument();
  });

  it("409: refresca la tarjeta con el estado actual y lo explica", async () => {
    const user = userEvent.setup();
    serve([invitation()]);
    service.accept.mockRejectedValue(conflict("vencida"));
    renderApp(<ParticipationsPage />);

    await user.click(await screen.findByRole("button", { name: /Aceptar participación en/ }));
    serve([invitation({ estado_respuesta: "vencida" })]);
    await user.click(screen.getByRole("button", { name: "Sí, participaré" }));

    expect(await screen.findByText(/Esta invitación ya venció/)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Pendientes · 0" })).toBeInTheDocument();
    expect(service.listOwn).toHaveBeenCalledTimes(2);
  });

  it("error de red: conserva el estado y permite reintentar", async () => {
    const user = userEvent.setup();
    serve([invitation()]);
    service.reject.mockRejectedValueOnce(new ApiError("sin red", 0));
    renderApp(<ParticipationsPage />);

    await user.click(await screen.findByRole("button", { name: /Rechazar participación en/ }));
    await user.click(screen.getByRole("button", { name: "No podré participar" }));

    expect(await screen.findByText(/Tu invitación sigue pendiente/)).toBeInTheDocument();
    expect(screen.getByText("Pendiente de respuesta")).toBeInTheDocument();

    service.reject.mockResolvedValueOnce(invitation({ estado_respuesta: "rechazada" }));
    await user.click(screen.getByRole("button", { name: "Reintentar" }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(service.reject).toHaveBeenCalledTimes(2);
    expect(screen.getByRole("button", { name: "Respondidas · 1" })).toBeInTheDocument();
  });
});
