import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { participationService } from "../../../services/participationService";
import { invitation, renderApp } from "../../fixtures";
import { ApiError } from "../../../types/api";
import type { Invitation } from "../../../types/participation";
import { InvitationCard, ParticipationsPage } from "../../../pages/participations/ParticipationsPage";

vi.mock("../../../services/participationService", () => ({
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

  it("por reconfirmar: dice qué cambió respecto de lo confirmado", () => {
    const base = invitation();
    renderApp(
      <InvitationCard
        invitation={invitation({
          por_reconfirmar: true,
          cambio: {
            antes: {
              actividad: "Ensayo general",
              // Una hora antes de como quedó.
              hora_inicio: base.actividad.hora_inicio.replace("T15:", "T14:"),
              hora_fin: base.actividad.hora_fin.replace("T15:", "T14:"),
            },
          },
        })}
        onAccept={noop}
        onReject={noop}
      />,
    );

    expect(screen.getByText("Por reconfirmar")).toBeInTheDocument();
    const note = screen.getByRole("note");
    expect(note).toHaveTextContent("Esta actividad cambió después de que la confirmaste.");
    // 14:00Z y 15:00Z son las 9:00 y las 10:00 a. m. en Colombia.
    expect(note).toHaveTextContent(/Horario: .*9:00 a\. m\. – 9:30 a\. m\. → .*10:00 a\. m\. – 10:30 a\. m\./);
    expect(note).toHaveTextContent("Nombre: Ensayo general → Actividad de prueba");
    expect(screen.getByRole("button", { name: /Aceptar participación en/ })).toHaveTextContent(
      "Confirmar de nuevo",
    );
  });

  it("pendiente: muestra el plazo y las dos acciones", () => {
    renderApp(<InvitationCard invitation={invitation()} onAccept={noop} onReject={noop} />);

    expect(screen.getByText("Pendiente de respuesta")).toBeInTheDocument();
    expect(screen.getByText(/Responde antes del/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Aceptar participación en/ })).toBeEnabled();
    expect(screen.getByRole("button", { name: /Rechazar participación en/ })).toBeEnabled();
    // Desde la tarjeta se llega al evento.
    expect(screen.getByRole("link", { name: invitation().evento.nombre })).toHaveAttribute(
      "href",
      `/events/${invitation().evento.id}`,
    );
    // Quien invita, identificado como administrador y sin su ministerio.
    expect(screen.getByText("Persona Responsable")).toBeInTheDocument();
    expect(screen.getByText(/Te invitó/)).toHaveTextContent(
      "Te invitó Persona Responsable, administrador de Church Connect",
    );
    expect(screen.queryByText(/Área de prueba/)).not.toBeInTheDocument();
    expect(screen.getByText("Salón de prueba")).toBeInTheDocument();
  });

  it("resalta el plazo cuando faltan tres días o menos", () => {
    const urgente = invitation({
      fecha_limite_respuesta: new Date(Date.now() + 86_400_000).toISOString(),
    });
    renderApp(<InvitationCard invitation={urgente} onAccept={noop} onReject={noop} />);

    expect(screen.getByText("Responde antes de mañana").className).toContain(
      "font-extrabold",
    );
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
  it("muestra los conteos por pestaña y empieza en «Por confirmar»", async () => {
    serve([
      invitation(),
      invitation({ id: "inv-2", estado_respuesta: "aceptada" }),
    ]);
    renderApp(<ParticipationsPage />);

    expect(await screen.findByText(/Tienes 1 invitación pendiente/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Por confirmar · 1" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Confirmadas · 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Todas · 2" })).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(1);
  });

  it("muestra el estado vacío de la pestaña", async () => {
    const user = userEvent.setup();
    serve([invitation({ estado_respuesta: "aceptada" })]);
    renderApp(<ParticipationsPage />);

    // Sin pendientes se abre en «Confirmadas», con la participación a la vista.
    expect(await screen.findByRole("button", { name: "Confirmadas · 1" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getAllByRole("article")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: "Por confirmar · 0" }));
    expect(screen.getByText("No tienes invitaciones pendientes")).toBeInTheDocument();
  });

  it("sin ninguna invitación explica qué aparecerá ahí", async () => {
    serve([]);
    renderApp(<ParticipationsPage />);

    expect(await screen.findByText("Aún no tienes invitaciones")).toBeInTheDocument();
    expect(
      screen.getByText("Cuando te asignen a una actividad, la verás aquí para confirmar."),
    ).toBeInTheDocument();
  });

  describe("Mis participaciones (administrador)", () => {
    it("usa su título, dos pestañas y dice quién lo invitó", async () => {
      serve([invitation()]);
      renderApp(<ParticipationsPage variant="admin" />, "ADMIN");

      expect(
        await screen.findByRole("heading", { name: "Mis participaciones" }),
      ).toBeInTheDocument();
      expect(screen.getByText(/Tienes 1 invitación pendiente\./)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Por confirmar · 1" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Confirmadas · 0" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Todas · 1" })).toBeInTheDocument();
      expect(
        screen.getByText(/^Invitado por Persona Responsable \(administrador\) el /),
      ).toBeInTheDocument();
    });

    it("la autoasignación no pide respuesta ni muestra plazo", async () => {
      serve([
        invitation({
          estado_respuesta: "aceptada",
          autoasignada: true,
          fecha_limite_respuesta: null,
          fecha_respuesta: "2026-10-04T15:00:00Z",
        }),
      ]);
      renderApp(<ParticipationsPage variant="admin" />, "ADMIN");

      // Sin nada por responder se abre en «Todas»: la asignación propia se
      // ve al entrar, sin buscarla en otra pestaña.
      expect(
        await screen.findByRole("button", { name: "Confirmadas · 1" }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(screen.getAllByRole("article")).toHaveLength(1);

      expect(screen.getByText(/^Te asignaste el 4 oct 2026/)).toBeInTheDocument();
      expect(
        // 2026-10-04T15:00Z son las 10:00 a. m. en Colombia.
        screen.getByText(
          /^Te asignaste esta actividad el domingo 4 de octubre a las 10:00\sa\.\sm\.: no requiere respuesta\.$/,
        ),
      ).toBeInTheDocument();
      expect(screen.queryByText(/Responde antes/)).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Aceptar/ })).not.toBeInTheDocument();
    });
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
    expect(screen.getByRole("button", { name: "Por confirmar · 0" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmadas · 1" })).toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: "Por confirmar · 0" })).toBeInTheDocument();
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
    expect(screen.getByRole("button", { name: "Todas · 1" })).toBeInTheDocument();
  });
});

describe("ParticipationsPage: filtros por rechazadas y vencidas", () => {
  it("cada pestaña muestra solo las suyas, con su contador", async () => {
    const user = userEvent.setup();
    serve([
      invitation({ id: "a", estado_respuesta: "aceptada" }),
      invitation({ id: "b", estado_respuesta: "rechazada" }),
      invitation({ id: "c", estado_respuesta: "vencida" }),
      invitation({ id: "d", estado_respuesta: "vencida" }),
    ]);
    renderApp(<ParticipationsPage />);

    await user.click(await screen.findByRole("button", { name: "Rechazadas · 1" }));
    expect(screen.getAllByRole("article")).toHaveLength(1);
    expect(screen.getByText(/Indicaste que no podrás participar/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Vencidas · 2" }));
    expect(screen.getAllByRole("article")).toHaveLength(2);

    expect(screen.getByRole("button", { name: "Todas · 4" })).toBeInTheDocument();
  });

  it("sin rechazadas ni vencidas lo dice", async () => {
    const user = userEvent.setup();
    serve([invitation({ estado_respuesta: "aceptada" })]);
    renderApp(<ParticipationsPage />);

    await user.click(await screen.findByRole("button", { name: "Rechazadas · 0" }));
    expect(screen.getByText("No has rechazado ninguna invitación")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Vencidas · 0" }));
    expect(screen.getByText("No se te ha vencido ninguna invitación")).toBeInTheDocument();
  });
});
