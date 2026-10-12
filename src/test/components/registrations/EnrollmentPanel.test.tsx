import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { memberEvent, renderApp } from "../../fixtures";
import { CapacityChip } from "../../../components/registrations/CapacityBits";
import { EnrollmentPanel } from "../../../components/registrations/EnrollmentPanel";

function panel(evento: ReturnType<typeof memberEvent>) {
  const onEnroll = vi.fn();
  const onCancel = vi.fn();
  renderApp(
    <EnrollmentPanel event={evento} userId="me" onEnroll={onEnroll} onCancel={onCancel} />,
  );
  return {
    onEnroll,
    onCancel,
    region: within(screen.getByRole("region", { name: "Inscripción" })),
  };
}

describe("EnrollmentPanel: los cinco estados del bloque «Inscripción»", () => {
  it("puede inscribirse: muestra los cupos y el botón", async () => {
    const { region, onEnroll } = panel(memberEvent(188, 38));

    expect(region.getByText("Quedan 38 de 188 cupos")).toBeInTheDocument();
    expect(region.getByText("Disponible")).toBeInTheDocument();
    expect(region.getByRole("progressbar", { name: "Cupos ocupados" })).toHaveAttribute(
      "aria-valuenow",
      "150",
    );

    await userEvent.click(region.getByRole("button", { name: "Inscribirme" }));
    expect(onEnroll).toHaveBeenCalledOnce();
  });

  it("ya inscrito: lo dice y ofrece cancelar", async () => {
    const { region, onCancel } = panel(
      memberEvent(188, 38, { inscrito: true, inscripcion_id: "reg-1" }),
    );

    expect(region.getByText("Estás inscrito")).toBeInTheDocument();
    expect(region.queryByRole("button", { name: "Inscribirme" })).not.toBeInTheDocument();

    await userEvent.click(
      region.getByRole("button", { name: "Cancelar mi inscripción en Evento de prueba" }),
    );
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("es participante: no se inscribe y enlaza a sus participaciones", () => {
    const { region } = panel(memberEvent(188, 38, { participa: true }));

    expect(region.getByRole("note")).toHaveTextContent(
      "Participas en este evento. Ya tienes tu lugar, no necesitas inscribirte.",
    );
    expect(region.getByRole("link", { name: /Ver mis participaciones/ })).toHaveAttribute(
      "href",
      "/participations",
    );
    expect(region.queryByRole("button", { name: "Inscribirme" })).not.toBeInTheDocument();
    expect(region.queryByText(/se reemplazó/)).not.toBeInTheDocument();
  });

  it("su inscripción fue reemplazada: lo explica una vez y se puede cerrar", async () => {
    const evento = memberEvent(188, 38, {
      participa: true,
      inscripcion_reemplazada: true,
    });
    const aviso =
      "Tu inscripción se reemplazó porque ahora participas en el evento.";
    const render = () =>
      renderApp(
        <EnrollmentPanel event={evento} userId="me" onEnroll={vi.fn()} onCancel={vi.fn()} />,
      );

    const first = render();
    expect(screen.getByText(aviso)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Cerrar aviso" }));
    expect(screen.queryByText(aviso)).not.toBeInTheDocument();
    first.unmount();

    // Al volver al evento ya no reaparece.
    render();
    expect(screen.getByRole("note")).toBeInTheDocument();
    expect(screen.queryByText(aviso)).not.toBeInTheDocument();
  });

  it("agotado: botón deshabilitado con su texto", () => {
    const { region } = panel(memberEvent(188, 0));

    expect(region.getByText("No quedan cupos (188 de 188 ocupados)")).toBeInTheDocument();
    expect(region.getByText("Agotado")).toBeInTheDocument();
    expect(region.getByRole("button", { name: "Cupos agotados" })).toBeDisabled();
  });

  it("iniciado o finalizado: inscripciones cerradas, sin cupos ni botón", () => {
    const { region } = panel(
      memberEvent(
        188,
        38,
        { inscripciones_cerradas: true, cancelacion_cerrada: true, inscrito: true },
        // Empezó hace una hora.
        {
          fecha_inicio: new Date(Date.now() - 3_600_000).toISOString(),
          fecha_fin: new Date(Date.now() + 3_600_000).toISOString(),
        },
      ),
    );

    expect(region.getByText("Inscripciones cerradas")).toBeInTheDocument();
    expect(region.queryByRole("progressbar")).not.toBeInTheDocument();
    expect(region.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("EnrollmentPanel: fecha límite de inscripción y plazo para cancelar", () => {
  const limite = "2030-03-05T23:59:00Z";
  const cancelar = "2030-03-08T15:00:00Z";
  const conLimites = {
    fecha_inicio: "2030-03-10T15:00:00Z",
    fecha_fin: "2030-03-10T17:00:00Z",
    fecha_limite_inscripcion: limite,
    dias_limite_cancelacion: 2,
    fecha_limite_cancelacion: cancelar,
  };

  it("antes de inscribirse dice hasta cuándo se inscribe y hasta cuándo se cancela", () => {
    const { region } = panel(memberEvent(188, 38, {}, conLimites));

    expect(region.getByRole("button", { name: "Inscribirme" })).toBeEnabled();
    expect(region.getByText(/^Inscripciones hasta el 05 de mar de 2030/)).toBeInTheDocument();
    expect(region.getByText(/^Podrás cancelar hasta el 08 de mar de 2030/)).toBeInTheDocument();
  });

  it("pasada la fecha límite ya no ofrece inscribirse y explica cuándo cerró", () => {
    const { region } = panel(
      memberEvent(188, 38, { inscripciones_cerradas: true }, conLimites),
    );

    expect(region.getByText("Inscripciones cerradas")).toBeInTheDocument();
    expect(
      region.getByText(/^El plazo para inscribirse terminó el 05 de mar de 2030/),
    ).toBeInTheDocument();
    expect(region.queryByRole("button", { name: "Inscribirme" })).not.toBeInTheDocument();
  });

  it("quien ya estaba inscrito lo sigue viendo y puede cancelar dentro del plazo", () => {
    const { region } = panel(
      memberEvent(
        188,
        38,
        { inscrito: true, inscripcion_id: "reg-1", inscripciones_cerradas: true },
        conLimites,
      ),
    );

    // Cerrar inscripciones no le quita la suya ni el derecho a cancelar.
    expect(region.getByText("Estás inscrito")).toBeInTheDocument();
    expect(
      region.getByRole("button", { name: /Cancelar mi inscripción/ }),
    ).toBeEnabled();
    expect(region.getByText(/^Puedes cancelar hasta el 08 de mar de 2030/)).toBeInTheDocument();
    expect(region.queryByText("Inscripciones cerradas")).not.toBeInTheDocument();
  });

  it("pasado el plazo ya no hay botón de cancelar y se explica por qué", () => {
    const { region } = panel(
      memberEvent(
        188,
        38,
        { inscrito: true, inscripcion_id: "reg-1", cancelacion_cerrada: true },
        conLimites,
      ),
    );

    expect(region.getByText("Estás inscrito")).toBeInTheDocument();
    expect(
      region.queryByRole("button", { name: /Cancelar mi inscripción/ }),
    ).not.toBeInTheDocument();
    expect(
      region.getByText(/^El plazo para cancelar terminó el 08 de mar de 2030/),
    ).toBeInTheDocument();
    expect(region.getByText(/avisa a un administrador/)).toBeInTheDocument();
  });

  it("avisa antes de inscribirse si ya no se podrá cancelar", () => {
    const { region } = panel(
      memberEvent(188, 38, { cancelacion_cerrada: true }, conLimites),
    );

    expect(region.getByRole("button", { name: "Inscribirme" })).toBeEnabled();
    expect(
      region.getByText("Si te inscribes ya no podrás cancelar: el plazo terminó."),
    ).toBeInTheDocument();
  });

  it("sin límites propios no menciona ningún plazo", () => {
    const { region } = panel(memberEvent(188, 38));

    expect(region.queryByText(/hasta el/)).not.toBeInTheDocument();
  });
});

describe("CapacityChip: el chip de la tarjeta de evento", () => {
  it.each([
    [memberEvent(188, 38), "Quedan 38 de 188 cupos"],
    [memberEvent(56, 4), "Pocos cupos · quedan 4 de 56"],
    [memberEvent(116, 0), "Cupos agotados"],
    [
      memberEvent(188, 38, { inscrito: true }),
      "Estás inscrito · Quedan 38 de 188 cupos",
    ],
    [memberEvent(77, 37, { participa: true }), "Participas en este evento"],
    [memberEvent(84, 14, { inscripciones_cerradas: true }), "Inscripciones cerradas"],
    // Cerraron por fecha límite, pero su inscripción sigue en pie.
    [
      memberEvent(84, 14, { inscripciones_cerradas: true, inscrito: true }),
      "Estás inscrito · Quedan 14 de 84 cupos",
    ],
  ])("%#: muestra el texto del estado", (evento, texto) => {
    renderApp(<CapacityChip event={evento} />);

    expect(screen.getByText(texto)).toBeInTheDocument();
  });

  it("nunca muestra el aforo total ni los participantes", () => {
    // Aforo real 200 con 12 participantes: el miembro solo recibe 188.
    renderApp(<CapacityChip event={memberEvent(188, 38)} />);

    expect(screen.queryByText(/200/)).not.toBeInTheDocument();
    expect(screen.queryByText(/participantes/i)).not.toBeInTheDocument();
  });
});
