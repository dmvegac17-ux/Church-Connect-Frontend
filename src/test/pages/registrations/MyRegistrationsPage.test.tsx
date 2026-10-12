import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { EnrollmentDialog } from "../../../components/registrations/EnrollmentDialog";
import { useEnrollment } from "../../../hooks/useEnrollment";
import { eventService } from "../../../services/eventService";
import { registrationService } from "../../../services/registrationService";
import { memberEvent, renderApp } from "../../fixtures";
import { ApiError } from "../../../types/api";
import type { Event } from "../../../types/event";
import type { Registration } from "../../../types/registration";
import { MyRegistrationsPage } from "../../../pages/registrations/MyRegistrationsPage";

vi.mock("../../../services/eventService", () => ({
  eventService: { list: vi.fn() },
}));
vi.mock("../../../services/registrationService", async (original) => ({
  ...(await original<typeof import("../../../services/registrationService")>()),
  registrationService: { enroll: vi.fn(), remove: vi.fn() },
}));

const events = vi.mocked(eventService);
const registrations = vi.mocked(registrationService);

function serve(items: Event[]) {
  events.list.mockResolvedValue({ items, total: items.length });
}

function conflict(codigo: string): ApiError {
  return new ApiError("No procede", 409, ["No procede"], {
    statusCode: 409,
    status: "Conflict",
    data: { codigo },
    success: false,
    message: "No procede",
    errors: ["No procede"],
    timestamp: "",
    meta: null,
  });
}

function registration(cupos: number): Registration {
  return {
    id: "reg-1",
    usuario_id: "me",
    evento_id: "ev-1",
    fecha_inscripcion: "2026-10-09T15:00:00Z",
    inscrito_por: null,
    nota: null,
    usuario: null,
    inscrito_por_usuario: null,
    cupos_disponibles: cupos,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("MyRegistrationsPage", () => {
  it("lista solo los eventos donde está inscrito, con su fecha y lugar", async () => {
    serve([
      memberEvent(188, 38, { inscrito: true, inscripcion_id: "reg-1" }),
      memberEvent(80, 40, {}, { id: "ev-2", titulo: "Otro evento" }),
    ]);
    renderApp(<MyRegistrationsPage />);

    expect(await screen.findByText("Estás inscrito en 1 evento.")).toBeInTheDocument();
    expect(screen.getByText("Evento de prueba")).toBeInTheDocument();
    expect(screen.getByText("Salón de prueba")).toBeInTheDocument();
    expect(screen.queryByText("Otro evento")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver evento Evento de prueba" })).toHaveAttribute(
      "href",
      "/events/ev-1",
    );
  });

  it("sin inscripciones invita a ver los eventos", async () => {
    serve([memberEvent(188, 38)]);
    renderApp(<MyRegistrationsPage />);

    expect(
      await screen.findByText("Aún no estás inscrito en ningún evento"),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver eventos" })).toHaveAttribute(
      "href",
      "/events",
    );
  });

  it("un evento ya iniciado no se puede cancelar", async () => {
    serve([
      memberEvent(
        188,
        38,
        {
          inscrito: true,
          inscripcion_id: "reg-1",
          inscripciones_cerradas: true,
          cancelacion_cerrada: true,
        },
        {
          fecha_inicio: new Date(Date.now() - 3_600_000).toISOString(),
          fecha_fin: new Date(Date.now() + 3_600_000).toISOString(),
        },
      ),
    ]);
    renderApp(<MyRegistrationsPage />);

    expect(await screen.findByText("Inscripciones cerradas")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Cancelar mi inscripción/ }),
    ).not.toBeInTheDocument();
  });

  it("pasado el plazo para cancelar, sigue inscrito pero sin botón de cancelar", async () => {
    serve([
      memberEvent(188, 38, {
        inscrito: true,
        inscripcion_id: "reg-1",
        cancelacion_cerrada: true,
      }),
    ]);
    renderApp(<MyRegistrationsPage />);

    expect(await screen.findByText(/^Estás inscrito · /)).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /Cancelar mi inscripción/ }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Ver evento/ })).toBeInTheDocument();
  });

  it("cerradas las inscripciones, quien ya está inscrito todavía puede cancelar", async () => {
    serve([
      memberEvent(188, 38, {
        inscrito: true,
        inscripcion_id: "reg-1",
        inscripciones_cerradas: true,
      }),
    ]);
    renderApp(<MyRegistrationsPage />);

    expect(
      await screen.findByRole("button", { name: /Cancelar mi inscripción/ }),
    ).toBeEnabled();
  });

  it("cancelar pide confirmación y libera el cupo", async () => {
    const user = userEvent.setup();
    serve([memberEvent(188, 38, { inscrito: true, inscripcion_id: "reg-1" })]);
    registrations.remove.mockResolvedValue();
    renderApp(<MyRegistrationsPage />);

    await user.click(
      await screen.findByRole("button", {
        name: "Cancelar mi inscripción en Evento de prueba",
      }),
    );
    const dialog = screen.getByRole("alertdialog", { name: "Cancelar inscripción" });
    expect(
      within(dialog).getByText("Liberarás tu cupo y otra persona podrá tomarlo."),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Mantener inscripción" }),
    ).toHaveFocus();

    serve([memberEvent(188, 39)]);
    await user.click(within(dialog).getByRole("button", { name: "Cancelar inscripción" }));

    await waitFor(() => expect(registrations.remove).toHaveBeenCalledWith("reg-1"));
    expect(
      await screen.findByText("Cancelaste tu inscripción. Tu cupo quedó libre."),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("Aún no estás inscrito en ningún evento"),
    ).toBeInTheDocument();
  });
});

/** El mismo flujo que usa el detalle de evento, sin el resto de la página. */
function EnrollHarness({ evento, onChanged }: { evento: Event; onChanged: () => void }) {
  const enrollment = useEnrollment(onChanged);
  return (
    <>
      <button type="button" onClick={() => enrollment.enroll(evento)}>
        Abrir
      </button>
      <EnrollmentDialog
        event={enrollment.event}
        mode={enrollment.mode}
        busy={enrollment.busy}
        error={enrollment.error}
        onSubmit={enrollment.submit}
        onClose={enrollment.close}
      />
    </>
  );
}

describe("Flujo de inscripción", () => {
  it("confirma con nombre, lugar y cupos, y avisa cuántos quedan", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    registrations.enroll.mockResolvedValue(registration(37));
    renderApp(<EnrollHarness evento={memberEvent(188, 38)} onChanged={onChanged} />);

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    const dialog = screen.getByRole("alertdialog", { name: "Confirmar inscripción" });
    expect(within(dialog).getByText("Evento de prueba")).toBeInTheDocument();
    expect(within(dialog).getByText("Salón de prueba")).toBeInTheDocument();
    expect(within(dialog).getByText("Quedan 38 cupos.")).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Inscribirme" }));

    await waitFor(() => expect(registrations.enroll).toHaveBeenCalledWith("ev-1"));
    // El número sale de la respuesta del servidor, no de una resta local.
    expect(
      await screen.findByText("Quedaste inscrito. Quedan 37 cupos."),
    ).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(onChanged).toHaveBeenCalledOnce();
  });

  it("el estado cambia solo cuando el servidor confirma", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    let resolve!: (value: Registration) => void;
    registrations.enroll.mockReturnValue(new Promise((r) => (resolve = r)));
    renderApp(<EnrollHarness evento={memberEvent(188, 38)} onChanged={onChanged} />);

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await user.click(screen.getByRole("button", { name: "Inscribirme" }));

    expect(screen.getByRole("button", { name: /Inscribiendo/ })).toBeDisabled();
    expect(onChanged).not.toHaveBeenCalled();

    resolve(registration(37));
    await waitFor(() => expect(onChanged).toHaveBeenCalledOnce());
  });

  it("si el cupo se agotó mientras confirmaba, lo dice y no inscribe", async () => {
    const user = userEvent.setup();
    const onChanged = vi.fn();
    registrations.enroll.mockRejectedValue(conflict("sin_cupos"));
    renderApp(<EnrollHarness evento={memberEvent(188, 1)} onChanged={onChanged} />);

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await user.click(screen.getByRole("button", { name: "Inscribirme" }));

    const dialog = screen.getByRole("alertdialog");
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Se agotaron los cupos mientras te inscribías. Tu inscripción no se registró.",
    );
    // Solo queda «Entendido»: no se reintenta sobre un cupo que ya no existe.
    expect(within(dialog).queryByRole("button", { name: "Inscribirme" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Quedaste inscrito/)).not.toBeInTheDocument();
    // Se recarga para reflejar que ya no hay cupos.
    expect(onChanged).toHaveBeenCalledOnce();

    await user.click(within(dialog).getByRole("button", { name: "Entendido" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("quien participa en el evento no se inscribe", async () => {
    const user = userEvent.setup();
    registrations.enroll.mockRejectedValue(conflict("es_participante"));
    renderApp(<EnrollHarness evento={memberEvent(188, 38)} onChanged={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Abrir" }));
    await user.click(screen.getByRole("button", { name: "Inscribirme" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /Participas en este evento: ya tienes tu lugar/,
    );
  });
});
