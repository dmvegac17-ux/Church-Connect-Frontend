import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { eventService } from "../../../../services/eventService";
import { participationService } from "../../../../services/participationService";
import { event, participation, renderApp } from "../../../fixtures";
import type { Participation, ParticipationList } from "../../../../types/participation";
import { AdminParticipationsPage } from "../../../../pages/admin/participations/AdminParticipationsPage";
import { daysError } from "../../../../pages/admin/participations/ReassignDialog";

vi.mock("../../../../services/participationService", () => ({
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

vi.mock("../../../../services/eventService", () => ({
  eventService: { getById: vi.fn() },
}));

const service = vi.mocked(participationService);
const events = vi.mocked(eventService);

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
  events.getById.mockResolvedValue(event());
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
        "2 actividades necesitan una nueva asignación. El correo electrónico de 1 invitación no se pudo enviar; la persona sí la recibió como notificación en la aplicación.",
      ),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Ver" }));

    // El filtro se aplica en memoria: no hay otra petición.
    expect(screen.getByRole("button", { name: /^Por reasignar/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(service.list).toHaveBeenCalledTimes(1);
  });

  it("sin alertas no hay banner", async () => {
    serve([participation()]);
    renderApp(<AdminParticipationsPage />, "ADMIN");

    await table();
    expect(screen.queryByRole("button", { name: "Ver" })).not.toBeInTheDocument();
  });

  it("filtrar y buscar no hacen más peticiones: todo se resuelve en memoria", async () => {
    const user = userEvent.setup();
    serve([
      participation({
        id: "a",
        estado_respuesta: "pendiente",
        participante: { id: "1", nombre_completo: "José Pérez" },
      }),
      participation({
        id: "b",
        estado_respuesta: "aceptada",
        participante: { id: "2", nombre_completo: "Marta Ruiz" },
      }),
      participation({
        id: "c",
        estado_respuesta: "aceptada",
        estado_envio: "error",
        participante: { id: "3", nombre_completo: "Josefa Mora" },
      }),
    ]);
    renderApp(<AdminParticipationsPage />, "ADMIN");
    const rows = async () => (await table()).getAllByRole("row").length - 1;

    // Los contadores de las pestañas salen de lo cargado.
    expect(await rows()).toBe(3);
    expect(screen.getByRole("button", { name: "Pendientes · 1" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Aceptadas · 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Error de envío · 1" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Aceptadas · 2" }));
    expect(await rows()).toBe(2);

    // La búsqueda ignora tildes y se combina con el filtro.
    await user.type(screen.getByRole("searchbox", { name: "Buscar participaciones" }), "jose");
    expect(await rows()).toBe(1);
    expect((await table()).getByText("Josefa Mora")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Todas · 2" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /^Error de envío/ }));
    expect(await rows()).toBe(1);

    // Cuatro cambios de filtro y búsqueda, una sola petición: la de la carga.
    expect(service.list).toHaveBeenCalledTimes(1);
    expect(service.list).toHaveBeenCalledWith(expect.objectContaining({ filtro: "todas" }));
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
      autoasignada: false,
      motivo_rechazo: null,
      dias_hasta_evento: 10,
      dias_para_confirmar_max: 9,
    });
    service.eligible.mockResolvedValue([
      { id: "u-2", nombre_completo: "Persona Dos", correo: "dos@example.test", rol: "MEMBER", cruce_horario: false, inscrito: false, participa: false },
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

describe("El administrador como participante", () => {
  // `renderApp` autentica al usuario con id «me».
  const propia = () =>
    participation({
      participante: { id: "me", nombre_completo: "Usuario Prueba" },
      estado_envio: "autoasignada",
      estado_respuesta: "aceptada",
      fecha_envio: null,
      fecha_respuesta: "2026-10-04T15:00:00Z",
      fecha_limite_respuesta: null,
      acciones_permitidas: ["revocar_y_cambiar"],
    });

  const rechazada = () =>
    participation({
      estado_respuesta: "rechazada",
      requiere_reasignacion: true,
      acciones_permitidas: ["reasignar"],
    });

  const persona = (
    id: string,
    nombre: string,
    extra: { inscrito?: boolean; participa?: boolean; rol?: "ADMIN" | "MEMBER" } = {},
  ) => ({
    id,
    nombre_completo: nombre,
    correo: `${id}@example.test`,
    rol: extra.rol ?? ("MEMBER" as const),
    cruce_horario: false,
    inscrito: extra.inscrito ?? false,
    participa: extra.participa ?? false,
  });

  it("marca las propias con «(Tú)» y la autoasignación en tono neutro", async () => {
    serve([propia()]);
    renderApp(<AdminParticipationsPage />, "ADMIN");
    const t = await table();

    expect(t.getByText("Usuario Prueba (Tú)")).toBeInTheDocument();
    expect(t.getByText("Autoasignada")).toBeInTheDocument();
    expect(t.getByText(/Autoasignada el 4 oct 2026/)).toBeInTheDocument();
    expect(t.queryByText(/Enviada/)).not.toBeInTheDocument();
    // Solo se puede revocar y cambiar: no hay nada que reenviar ni cancelar.
    expect(t.getByRole("button", { name: /Revocar confirmación/ })).toBeInTheDocument();
    expect(t.queryByRole("button", { name: /Reenviar/ })).not.toBeInTheDocument();
    expect(t.queryByRole("button", { name: /Cancelar invitación/ })).not.toBeInTheDocument();
  });

  it("dejar la actividad propia no avisa de ninguna notificación", async () => {
    const user = userEvent.setup();
    const row = propia();
    serve([row]);
    service.reassignmentInfo.mockResolvedValue({
      modo: "revocar",
      actividad: row.actividad,
      evento: row.evento,
      asignado_actual: row.participante,
      motivo_liberacion: "aceptada",
      autoasignada: true,
      motivo_rechazo: null,
      dias_hasta_evento: 10,
      dias_para_confirmar_max: 9,
    });
    service.eligible.mockResolvedValue([]);
    renderApp(<AdminParticipationsPage />, "ADMIN");
    const t = await table();

    await user.click(t.getByRole("button", { name: /Revocar confirmación/ }));
    const dialog = await screen.findByRole("dialog", {
      name: "Dejar esta actividad y asignar a otra persona",
    });

    expect(await within(dialog).findByText("Usuario Prueba (Tú)")).toBeInTheDocument();
    expect(within(dialog).getByText("Te asignaste esta actividad")).toBeInTheDocument();
    expect(within(dialog).queryByText(/se le notificará/)).not.toBeInTheDocument();
  });

  it("reasignarse: sin días para confirmar y con «Asignarme»", async () => {
    const user = userEvent.setup();
    const row = rechazada();
    serve([row]);
    service.reassignmentInfo.mockResolvedValue({
      modo: "reasignar",
      actividad: row.actividad,
      evento: row.evento,
      asignado_actual: row.participante,
      motivo_liberacion: "rechazo",
      autoasignada: false,
      motivo_rechazo: null,
      dias_hasta_evento: 10,
      dias_para_confirmar_max: 9,
    });
    service.eligible.mockResolvedValue([
      persona("u-2", "Persona Dos", { inscrito: true }),
      persona("me", "Usuario Prueba", { rol: "ADMIN" }),
    ]);
    service.reassign.mockResolvedValue({
      original: { ...row, estado_respuesta: "reasignada" },
      nueva: participation({
        id: "par-2",
        participante: { id: "me", nombre_completo: "Usuario Prueba" },
        estado_envio: "autoasignada",
        estado_respuesta: "aceptada",
      }),
    });
    renderApp(<AdminParticipationsPage />, "ADMIN");
    const t = await table();

    await user.click(t.getByRole("button", { name: "Reasignar Actividad de prueba" }));
    const dialog = await screen.findByRole("dialog", { name: "Reasignar actividad" });
    const select = await within(dialog).findByLabelText("Nuevo participante");

    // Uno mismo va primero, con «(Tú)», el rol y el correo.
    const options = within(select).getAllByRole("option");
    expect(options[1]).toHaveTextContent(
      "Usuario Prueba (Tú) · Administrador · me@example.test",
    );

    // Otra persona inscrita como público: se avisa del reemplazo.
    await user.selectOptions(select, "u-2");
    expect(
      within(dialog).getByText(
        "Persona Dos está inscrito como público. Su inscripción se reemplazará por la participación.",
      ),
    ).toBeInTheDocument();
    expect(within(dialog).getByLabelText("Días para confirmar")).toBeInTheDocument();

    await user.selectOptions(select, "me");
    expect(within(dialog).queryByLabelText("Días para confirmar")).not.toBeInTheDocument();
    expect(
      within(dialog).getByText("Quedarás asignado de inmediato. No se envía invitación."),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Asignarme" }));

    await waitFor(() =>
      expect(service.reassign).toHaveBeenCalledWith(row.id, { participante_id: "me" }),
    );
    expect(await screen.findByText("Te asignaste «Actividad de prueba».")).toBeInTheDocument();
  });

  it("avisa del sobrecupo cuando el evento ya está lleno", async () => {
    const user = userEvent.setup();
    const row = rechazada();
    serve([row]);
    // Aforo 200 con 12 participantes y 188 de público: lleno.
    events.getById.mockResolvedValue(event({ aforo: { publico: 188 } }));
    service.reassignmentInfo.mockResolvedValue({
      modo: "reasignar",
      actividad: row.actividad,
      evento: row.evento,
      asignado_actual: row.participante,
      motivo_liberacion: "rechazo",
      autoasignada: false,
      motivo_rechazo: null,
      dias_hasta_evento: 10,
      dias_para_confirmar_max: 9,
    });
    service.eligible.mockResolvedValue([
      persona("u-2", "Persona Dos"),
      persona("u-3", "Persona Tres", { participa: true }),
    ]);
    renderApp(<AdminParticipationsPage />, "ADMIN");
    const t = await table();

    await user.click(t.getByRole("button", { name: "Reasignar Actividad de prueba" }));
    const dialog = await screen.findByRole("dialog", { name: "Reasignar actividad" });
    const select = await within(dialog).findByLabelText("Nuevo participante");

    await user.selectOptions(select, "u-2");
    expect(
      await within(dialog).findByText(
        "El evento está lleno. Si continúas quedará con sobrecupo de 1.",
      ),
    ).toBeInTheDocument();

    // Quien ya participa en otra actividad no ocupa un lugar más.
    await user.selectOptions(select, "u-3");
    expect(within(dialog).queryByText(/sobrecupo/)).not.toBeInTheDocument();
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

describe("AdminParticipationsPage: datos al día al cambiar de pestaña", () => {
  it("vuelve a consultar en segundo plano solo si lo cargado ya es viejo", async () => {
    const user = userEvent.setup();
    const now = vi.spyOn(Date, "now");
    const start = 1_800_000_000_000;
    now.mockReturnValue(start);
    serve([participation({ id: "a", estado_respuesta: "pendiente" })]);
    renderApp(<AdminParticipationsPage />, "ADMIN");
    await table();
    expect(service.list).toHaveBeenCalledTimes(1);

    // Recién cargado: cambiar de pestaña no pide nada.
    await user.click(screen.getByRole("button", { name: /^Pendientes/ }));
    await user.click(screen.getByRole("button", { name: /^Aceptadas/ }));
    expect(service.list).toHaveBeenCalledTimes(1);

    // Medio minuto después, otra persona ya confirmó: el cambio de pestaña
    // muestra lo cargado y lo actualiza sin indicador de carga.
    now.mockReturnValue(start + 30_000);
    serve([participation({ id: "a", estado_respuesta: "aceptada" })]);
    await user.click(screen.getByRole("button", { name: /^Todas/ }));

    await waitFor(() => expect(service.list).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("button", { name: "Aceptadas · 1" })).toBeInTheDocument();
    expect(screen.queryByText("Cargando participaciones…")).not.toBeInTheDocument();

    // Y con eso recién traído, el siguiente cambio vuelve a no pedir nada.
    await user.click(screen.getByRole("button", { name: /^Pendientes/ }));
    expect(service.list).toHaveBeenCalledTimes(2);

    now.mockRestore();
  });
});

describe("AdminParticipationsPage: filtro por evento", () => {
  it("muestra solo las invitaciones de ese evento y ajusta los contadores", async () => {
    const user = userEvent.setup();
    const en = (id: string, eventoId: string, evento: string, estado: "pendiente" | "aceptada") =>
      participation({
        id,
        estado_respuesta: estado,
        evento: { id: eventoId, nombre: evento },
      });
    serve([
      en("a", "ev-1", "Retiro de jóvenes", "pendiente"),
      en("b", "ev-1", "Retiro de jóvenes", "aceptada"),
      en("c", "ev-2", "Culto dominical", "aceptada"),
    ]);
    renderApp(<AdminParticipationsPage />, "ADMIN");
    const rows = async () => (await table()).getAllByRole("row").length - 1;
    expect(await rows()).toBe(3);

    // Solo se ofrecen los eventos que tienen invitaciones.
    const filtro = screen.getByLabelText("Evento");
    expect(within(filtro).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Todos los eventos",
      "Retiro de jóvenes",
      "Culto dominical",
    ]);

    await user.selectOptions(filtro, "ev-1");
    expect(await rows()).toBe(2);
    expect(screen.getByRole("button", { name: "Todas · 2" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Pendientes · 1" })).toBeInTheDocument();

    // Se combina con las pestañas de estado, sin pedir nada al servidor.
    await user.click(screen.getByRole("button", { name: "Aceptadas · 1" }));
    expect(await rows()).toBe(1);

    await user.selectOptions(filtro, "");
    expect(screen.getByRole("button", { name: "Aceptadas · 2" })).toBeInTheDocument();
    expect(service.list).toHaveBeenCalledTimes(1);
  });
});

describe("AdminParticipationsPage: invitaciones vencidas", () => {
  it("la pestaña «Vencidas» reúne las que nadie confirmó a tiempo", async () => {
    const user = userEvent.setup();
    serve([
      participation({ id: "a", estado_respuesta: "pendiente" }),
      participation({
        id: "b",
        estado_respuesta: "vencida",
        participante: { id: "2", nombre_completo: "Beto Vencido" },
      }),
      // Venció y ya se le dio a otra persona: sigue contando como vencida.
      participation({
        id: "c",
        estado_respuesta: "reasignada",
        estado_previo: "vencida",
        participante: { id: "3", nombre_completo: "Caro Reemplazada" },
      }),
      participation({
        id: "d",
        estado_respuesta: "reasignada",
        estado_previo: "rechazada",
        participante: { id: "4", nombre_completo: "Dani Rechazó" },
      }),
    ]);
    renderApp(<AdminParticipationsPage />, "ADMIN");

    await user.click(await screen.findByRole("button", { name: "Vencidas · 2" }));

    const rows = await table();
    expect(rows.getAllByRole("row")).toHaveLength(3);
    expect(rows.getByText("Beto Vencido")).toBeInTheDocument();
    expect(rows.getByText("Caro Reemplazada")).toBeInTheDocument();
    expect(rows.queryByText("Dani Rechazó")).not.toBeInTheDocument();
    expect(service.list).toHaveBeenCalledTimes(1);
  });
});
