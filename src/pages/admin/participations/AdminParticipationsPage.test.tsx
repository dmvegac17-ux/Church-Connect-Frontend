import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { participationService } from "../../../services/participationService";
import { participation, renderApp } from "../../../test/fixtures";
import type { Participation, ParticipationList } from "../../../types/participation";
import { AdminParticipationsPage } from "./AdminParticipationsPage";
import { daysError } from "./ReassignDialog";

vi.mock("../../../services/participationService", () => ({
  participationService: {
    list: vi.fn(),
    cancel: vi.fn(),
    resend: vi.fn(),
    reassignmentInfo: vi.fn(),
    eligible: vi.fn(),
    reassign: vi.fn(),
    revoke: vi.fn(),
  },
}));

const service = vi.mocked(participationService);

function serve(items: Participation[], alertas = { actividades_por_reasignar: 0, invitaciones_error_envio: 0 }) {
  const result: ParticipationList = {
    conteos: {
      todas: items.length,
      pendientes: items.filter((i) => i.estado_respuesta === "pendiente").length,
      aceptadas: items.filter((i) => i.estado_respuesta === "aceptada").length,
      por_reasignar: alertas.actividades_por_reasignar,
      error_envio: alertas.invitaciones_error_envio,
    },
    alertas,
    items,
    total: items.length,
  };
  service.list.mockResolvedValue(result);
}

/** La tabla de escritorio (la lista móvil repite las mismas filas). */
async function table() {
  return within(await screen.findByRole("table"));
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("AdminParticipationsPage", () => {
  it("pinta solo las acciones que autoriza el backend", async () => {
    serve([
      participation({ id: "a", participante: { id: "1", nombre_completo: "Persona Pendiente" } }),
      participation({
        id: "b",
        participante: { id: "2", nombre_completo: "Persona Error" },
        estado_envio: "error",
        fecha_envio: null,
        acciones_permitidas: ["reenviar", "cancelar"],
      }),
      participation({
        id: "c",
        participante: { id: "3", nombre_completo: "Persona Rechazo" },
        estado_respuesta: "rechazada",
        motivo_rechazo: "Motivo de prueba",
        requiere_reasignacion: true,
        acciones_permitidas: ["reasignar"],
      }),
      participation({
        id: "d",
        participante: { id: "4", nombre_completo: "Persona Aceptó" },
        estado_respuesta: "aceptada",
        acciones_permitidas: ["revocar_y_cambiar"],
      }),
      participation({
        id: "e",
        participante: { id: "5", nombre_completo: "Persona Historial" },
        estado_respuesta: "reasignada",
        estado_previo: "vencida",
        acciones_permitidas: [],
        reemplazo: {
          participante: { id: "6", nombre_completo: "Persona Nueva" },
          fecha_limite_respuesta: null,
        },
      }),
    ]);
    renderApp(<AdminParticipationsPage />, "ADMIN");
    const t = await table();
    const row = (name: string) => within(t.getByText(name).closest("tr") as HTMLElement);

    expect(row("Persona Pendiente").getAllByRole("button")).toHaveLength(1);
    expect(
      row("Persona Pendiente").getByRole("button", {
        name: "Cancelar invitación a Persona Pendiente",
      }),
    ).toBeInTheDocument();

    expect(row("Persona Error").getByText("Error de envío")).toBeInTheDocument();
    expect(row("Persona Error").getByText("Pendiente")).toBeInTheDocument();
    expect(row("Persona Error").getByRole("button", { name: /Reenviar/ })).toBeInTheDocument();

    expect(row("Persona Rechazo").getByText("Pendiente de asignación")).toBeInTheDocument();
    expect(row("Persona Rechazo").getByText("«Motivo de prueba»")).toBeInTheDocument();
    expect(row("Persona Rechazo").getByRole("button", { name: /Reasignar/ })).toBeInTheDocument();

    expect(row("Persona Aceptó").getByRole("button", { name: /Revocar confirmación/ })).toBeInTheDocument();

    expect(row("Persona Historial").getByText("Reasignada a Persona Nueva")).toBeInTheDocument();
    expect(row("Persona Historial").queryByRole("button")).not.toBeInTheDocument();
  });

  it("el banner resume las alertas y «Ver» aplica el filtro", async () => {
    const user = userEvent.setup();
    serve([participation()], { actividades_por_reasignar: 2, invitaciones_error_envio: 1 });
    renderApp(<AdminParticipationsPage />, "ADMIN");

    expect(
      await screen.findByText(
        "2 actividades necesitan una nueva asignación y 1 invitación no se pudo enviar.",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ver" }));

    await waitFor(() =>
      expect(service.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ filtro: "por_reasignar", pagina: 1 }),
      ),
    );
  });

  it("sin alertas no hay banner", async () => {
    serve([participation()]);
    renderApp(<AdminParticipationsPage />, "ADMIN");

    await table();
    expect(screen.queryByRole("button", { name: "Ver" })).not.toBeInTheDocument();
  });

  it("la búsqueda va al servidor tras una pausa", async () => {
    const user = userEvent.setup();
    serve([participation()]);
    renderApp(<AdminParticipationsPage />, "ADMIN");
    await table();

    await user.type(screen.getByRole("searchbox", { name: "Buscar participaciones" }), "alabanza");

    await waitFor(() =>
      expect(service.list).toHaveBeenLastCalledWith(expect.objectContaining({ q: "alabanza" })),
    );
    // Una sola petición para todo lo escrito, no una por tecla.
    expect(service.list).toHaveBeenCalledTimes(2);
  });

  it("cancelar pide confirmación con el texto del diseño", async () => {
    const user = userEvent.setup();
    const row = participation();
    serve([row]);
    service.cancel.mockResolvedValue({ ...row, estado_respuesta: "cancelada" });
    renderApp(<AdminParticipationsPage />, "ADMIN");
    const t = await table();

    await user.click(t.getByRole("button", { name: "Cancelar invitación a Persona Uno" }));
    const dialog = screen.getByRole("alertdialog", { name: "Cancelar invitación" });

    expect(
      within(dialog).getByText(
        "Persona Uno ya no podrá responder la invitación a «Actividad de prueba». La actividad quedará sin asignar.",
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Volver" })).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Cancelar invitación" }));

    await waitFor(() => expect(service.cancel).toHaveBeenCalledWith(row.id));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("revocar: avisa de la notificación y valida el plazo antes de enviar", async () => {
    const user = userEvent.setup();
    const row = participation({
      estado_respuesta: "aceptada",
      acciones_permitidas: ["revocar_y_cambiar"],
    });
    serve([row]);
    service.reassignmentInfo.mockResolvedValue({
      modo: "revocar",
      actividad: row.actividad,
      evento: row.evento,
      asignado_actual: row.participante,
      motivo_liberacion: "aceptada",
      motivo_rechazo: null,
      dias_hasta_evento: 10,
      dias_para_confirmar_max: 9,
    });
    service.eligible.mockResolvedValue([
      { id: "u-2", nombre_completo: "Persona Dos", correo: "dos@example.test", rol: "PARTICIPANT", cruce_horario: false },
    ]);
    service.revoke.mockResolvedValue({
      original: { ...row, estado_respuesta: "revocada" },
      nueva: participation({ id: "par-2", participante: { id: "u-2", nombre_completo: "Persona Dos" } }),
    });
    renderApp(<AdminParticipationsPage />, "ADMIN");
    const t = await table();

    await user.click(t.getByRole("button", { name: /Revocar confirmación/ }));
    const dialog = await screen.findByRole("dialog", {
      name: "Revocar confirmación y cambiar participante",
    });

    expect(await within(dialog).findByText(/se le notificará que ya no está asignado/)).toBeInTheDocument();
    expect(within(dialog).getByText("Confirmó su participación")).toBeInTheDocument();

    const enviar = within(dialog).getByRole("button", { name: "Revocar y enviar invitación" });
    const dias = within(dialog).getByLabelText("Días para confirmar");

    // Solo enteros: las letras y los decimales no entran.
    await user.type(dias, "1a.5");
    expect(dias).toHaveValue("15");
    expect(within(dialog).getByText(/El plazo máximo es de 9 días/)).toBeInTheDocument();
    expect(enviar).toBeDisabled();

    await user.clear(dias);
    await user.type(dias, "3");
    expect(within(dialog).getByText(/Deberá responder antes del/)).toBeInTheDocument();

    // Falta elegir a la persona: se avisa junto al campo y no se envía.
    await user.click(enviar);
    expect(within(dialog).getByText("Elige a quién asignar la actividad.")).toBeInTheDocument();
    expect(service.revoke).not.toHaveBeenCalled();

    await user.selectOptions(within(dialog).getByLabelText("Nuevo participante"), "u-2");
    await user.click(enviar);

    await waitFor(() =>
      expect(service.revoke).toHaveBeenCalledWith(row.id, {
        participante_id: "u-2",
        dias_para_confirmar: 3,
      }),
    );
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });
});

describe("daysError", () => {
  it.each([
    ["", 10, 9, /entre 1 y 9/],
    ["0", 10, 9, /entre 1 y 30/],
    ["31", 40, 30, /entre 1 y 30/],
    ["2.5", 10, 9, /solo números enteros/],
    ["diez", 10, 9, /solo números enteros/],
    ["10", 10, 9, /plazo máximo es de 9 días/],
    ["1", 1, 0, /no queda tiempo/],
  ])("%j con %i días hasta el evento → error", (value, toEvent, max, message) => {
    expect(daysError(value, toEvent, max)).toMatch(message);
  });

  it("acepta el límite exacto", () => {
    expect(daysError("9", 10, 9)).toBeUndefined();
    expect(daysError("1", 2, 1)).toBeUndefined();
  });
});
