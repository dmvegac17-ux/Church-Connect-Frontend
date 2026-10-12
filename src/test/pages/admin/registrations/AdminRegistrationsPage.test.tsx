import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { eventService } from "../../../../services/eventService";
import { participationService } from "../../../../services/participationService";
import { registrationService } from "../../../../services/registrationService";
import { scheduleService } from "../../../../services/scheduleService";
import { userService } from "../../../../services/userService";
import { event, inDays, participation, renderApp } from "../../../fixtures";
import type { Event } from "../../../../types/event";
import type { Registration } from "../../../../types/registration";
import type { Schedule } from "../../../../types/schedule";
import type { User } from "../../../../types/user";
import { AdminRegistrationsPage } from "../../../../pages/admin/registrations/AdminRegistrationsPage";

vi.mock("../../../../services/eventService", () => ({
  eventService: { list: vi.fn() },
}));
vi.mock("../../../../services/registrationService", async (original) => ({
  ...(await original<typeof import("../../../../services/registrationService")>()),
  registrationService: {
    listByEvent: vi.fn(),
    enrollPerson: vi.fn(),
    updateNote: vi.fn(),
    remove: vi.fn(),
  },
}));
vi.mock("../../../../services/scheduleService", () => ({
  scheduleService: { list: vi.fn() },
}));
vi.mock("../../../../services/participationService", () => ({
  participationService: { listByEvent: vi.fn() },
}));
vi.mock("../../../../services/userService", () => ({
  userService: { list: vi.fn() },
}));

const events = vi.mocked(eventService);
const registrations = vi.mocked(registrationService);
const schedules = vi.mocked(scheduleService);
const participations = vi.mocked(participationService);
const users = vi.mocked(userService);

/* Datos ficticios, solo para pruebas. */

function person(id: string, nombre: string, apellido: string): User {
  return {
    id,
    nombre,
    apellido,
    correo: `${id}@example.test`,
    telefono: null,
    rol: "MEMBER",
    activo: true,
    fecha_creacion: null,
  };
}

function registration(
  id: string,
  nombre: string,
  overrides: Partial<Registration> = {},
): Registration {
  return {
    id,
    usuario_id: `u-${id}`,
    evento_id: "ev-1",
    fecha_inscripcion: "2026-10-02T15:00:00Z",
    inscrito_por: null,
    nota: null,
    usuario: { id: `u-${id}`, nombre_completo: nombre, correo: `${id}@example.test` },
    inscrito_por_usuario: null,
    cupos_disponibles: null,
    ...overrides,
  };
}

function activity(id: string, actividad: string, responsable: string, uid: string): Schedule {
  return {
    id,
    evento_id: "ev-1",
    actividad,
    hora_inicio: `${inDays(10)}T15:00:00Z`,
    hora_fin: `${inDays(10)}T15:30:00Z`,
    responsable,
    responsable_id: uid,
    descripcion: null,
  };
}

function serve({
  eventos = [event()],
  inscritos = [] as Registration[],
  actividades = [] as Schedule[],
}: { eventos?: Event[]; inscritos?: Registration[]; actividades?: Schedule[] } = {}) {
  events.list.mockResolvedValue({ items: eventos, total: eventos.length });
  registrations.listByEvent.mockResolvedValue({ items: inscritos, total: inscritos.length });
  schedules.list.mockResolvedValue({ items: actividades, total: actividades.length });
}

beforeEach(() => {
  vi.clearAllMocks();
  participations.listByEvent.mockResolvedValue([]);
  users.list.mockResolvedValue({
    items: [
      { ...person("me", "Usuario", "Prueba"), rol: "ADMIN" },
      person("u-a", "Ana", "Prueba"),
      person("u-b", "Beto", "Prueba"),
      person("u-c", "Caro", "Prueba"),
    ],
    total: 4,
  });
});

describe("AdminRegistrationsPage · Por evento", () => {
  it("muestra las cuatro cifras del aforo del evento", async () => {
    serve();
    renderApp(<AdminRegistrationsPage />, "ADMIN");

    expect(
      await screen.findByRole("heading", { name: "Evento de prueba" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/Aforo total/).closest("span")).toHaveTextContent(
      "Aforo total 200",
    );
    expect(screen.getByRole("button", { name: "Público · 150" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: "Participantes · 12" })).toBeInTheDocument();
    expect(screen.getByText(/^Disponibles/).closest("span")).toHaveTextContent(
      "Disponibles 38",
    );
  });

  it("lista el público con quién lo inscribió y su nota", async () => {
    serve({
      inscritos: [
        registration("a", "Ana Prueba", { nota: "Llevará pan" }),
        registration("b", "Beto Prueba", {
          inscrito_por: "me",
          inscrito_por_usuario: {
            id: "me",
            nombre_completo: "Usuario Prueba",
            correo: "me@example.test",
          },
        }),
      ],
    });
    renderApp(<AdminRegistrationsPage />, "ADMIN");

    const filaAna = (await screen.findByText("Ana Prueba")).closest("tr") as HTMLElement;
    expect(within(filaAna).getByText("Él mismo")).toBeInTheDocument();
    expect(within(filaAna).getByText("Llevará pan")).toBeInTheDocument();

    const filaBeto = screen.getByText("Beto Prueba").closest("tr") as HTMLElement;
    expect(within(filaBeto).getByText("Usuario Prueba (Tú)")).toBeInTheDocument();
    expect(within(filaBeto).getByText("—")).toBeInTheDocument();
  });

  it("busca por nombre o correo y explica cuando nadie coincide", async () => {
    const user = userEvent.setup();
    serve({ inscritos: [registration("a", "Ana Prueba"), registration("b", "Beto Prueba")] });
    renderApp(<AdminRegistrationsPage />, "ADMIN");
    await screen.findByText("Ana Prueba");

    const buscador = screen.getByRole("searchbox", { name: "Buscar inscritos" });
    await user.type(buscador, "b@example");
    expect(screen.queryByText("Ana Prueba")).not.toBeInTheDocument();
    expect(screen.getByText("Beto Prueba")).toBeInTheDocument();

    await user.clear(buscador);
    await user.type(buscador, "zzz");
    expect(screen.getByText("Nadie coincide con la búsqueda.")).toBeInTheDocument();
  });

  it("sin inscritos lo dice", async () => {
    serve();
    renderApp(<AdminRegistrationsPage />, "ADMIN");

    expect(await screen.findByText("Aún no hay inscritos.")).toBeInTheDocument();
  });

  it("ordena por columna: ascendente, descendente y sin orden", async () => {
    const user = userEvent.setup();
    serve({
      inscritos: [
        registration("b", "Beto Prueba"),
        registration("c", "Caro Prueba"),
        registration("a", "Ana Prueba"),
      ],
    });
    renderApp(<AdminRegistrationsPage />, "ADMIN");
    await screen.findByText("Ana Prueba");

    const nombres = () =>
      screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => within(row).getAllByRole("cell")[0].textContent ?? "");
    const encabezado = screen.getByRole("columnheader", { name: /Persona/ });
    const ordenar = within(encabezado).getByRole("button");

    expect(encabezado).toHaveAttribute("aria-sort", "none");
    expect(nombres()[0]).toContain("Beto");

    await user.click(ordenar);
    expect(encabezado).toHaveAttribute("aria-sort", "ascending");
    expect(nombres().map((n) => n.slice(2, 6))).toEqual(["Ana ", "Beto", "Caro"]);

    await user.click(ordenar);
    expect(encabezado).toHaveAttribute("aria-sort", "descending");
    expect(nombres()[0]).toContain("Caro");

    await user.click(ordenar);
    expect(encabezado).toHaveAttribute("aria-sort", "none");
    expect(nombres()[0]).toContain("Beto");
  });

  it("pagina de 10 en 10 y permite cambiar las filas por página", async () => {
    const user = userEvent.setup();
    serve({
      inscritos: Array.from({ length: 23 }, (_, i) =>
        registration(`r${i}`, `Persona ${String(i + 1).padStart(2, "0")}`),
      ),
    });
    renderApp(<AdminRegistrationsPage />, "ADMIN");
    await screen.findByText("Persona 01");

    expect(screen.getByText("1–10 de 23")).toBeInTheDocument();
    expect(screen.getByText("Página 1 de 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Primera página" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Última página" }));
    expect(screen.getByText("21–23 de 23")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Página siguiente" })).toBeDisabled();

    // Cambiar el tamaño vuelve a la página 1.
    await user.selectOptions(screen.getByLabelText("Filas por página"), "25");
    expect(screen.getByText("1–23 de 23")).toBeInTheDocument();
    expect(screen.getByText("Página 1 de 1")).toBeInTheDocument();
  });

  it("inscribir persona: deshabilita a quien ya ocupa un lugar y dice por qué", async () => {
    const user = userEvent.setup();
    serve({
      inscritos: [registration("a", "Ana Prueba", { usuario_id: "u-a" })],
      actividades: [activity("s-1", "Alabanza", "Beto Prueba", "u-b")],
    });
    registrations.enrollPerson.mockResolvedValue(
      registration("c", "Caro Prueba", { usuario_id: "u-c", cupos_disponibles: 37 }),
    );
    renderApp(<AdminRegistrationsPage />, "ADMIN");
    await screen.findByText("Ana Prueba");

    await user.click(screen.getByRole("button", { name: "Inscribir persona" }));
    const dialog = screen.getByRole("dialog", { name: "Inscribir persona" });
    expect(
      within(dialog).getByText("Quedan 38 cupos para público en «Evento de prueba»."),
    ).toBeInTheDocument();

    const opciones = await within(dialog).findAllByRole("option");
    // Quien inscribe va primero, con «(Tú)».
    expect(opciones[0]).toHaveTextContent("Usuario Prueba (Tú)");

    const ana = within(dialog).getByRole("option", { name: /Ana Prueba/ });
    expect(ana).toBeDisabled();
    expect(ana).toHaveTextContent("Ya está inscrito");
    const beto = within(dialog).getByRole("option", { name: /Beto Prueba/ });
    expect(beto).toBeDisabled();
    expect(beto).toHaveTextContent("Participa en el evento");

    const inscribir = within(dialog).getByRole("button", { name: "Inscribir" });
    expect(inscribir).toBeDisabled();

    await user.click(within(dialog).getByRole("option", { name: /Caro Prueba/ }));
    await user.type(within(dialog).getByLabelText(/Nota/), "Con acompañante");
    expect(within(dialog).getByText("15/200")).toBeInTheDocument();
    await user.click(inscribir);

    await waitFor(() =>
      expect(registrations.enrollPerson).toHaveBeenCalledWith({
        evento_id: "ev-1",
        usuario_id: "u-c",
        nota: "Con acompañante",
      }),
    );
    expect(
      await screen.findByText("Caro Prueba quedó inscrito. Quedan 37 cupos."),
    ).toBeInTheDocument();
  });

  it.each([
    [event({ aforo: { publico: 188 } }), "No hay cupos disponibles para público."],
    [
      event({ aforo: { participantes: 15, publico: 188 } }),
      "No hay cupos: el evento tiene sobrecupo.",
    ],
    [
      event({
        fecha_inicio: `${inDays(-3)}T15:00:00Z`,
        fecha_fin: `${inDays(-3)}T17:00:00Z`,
        aforo: { inscripciones_cerradas: true },
      }),
      "El evento ya finalizó.",
    ],
  ])("%#: el botón de inscribir se deshabilita y explica por qué", async (evento, motivo) => {
    serve({ eventos: [evento] });
    renderApp(<AdminRegistrationsPage />, "ADMIN");

    expect(await screen.findByText(motivo)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Inscribir persona" })).toBeDisabled();
  });

  it("con sobrecupo muestra el aviso con la causa", async () => {
    serve({ eventos: [event({ aforo: { participantes: 15, publico: 188 } })] });
    renderApp(<AdminRegistrationsPage />, "ADMIN");

    const aviso = await screen.findByRole("alert");
    expect(aviso).toHaveTextContent("Sobrecupo");
    expect(aviso).toHaveTextContent(
      "Hay 203 lugares ocupados y el aforo es de 200.",
    );
    expect(screen.getByText("Sobrecupo: 3")).toBeInTheDocument();
  });

  it("editar modifica solo la nota", async () => {
    const user = userEvent.setup();
    const original = registration("a", "Ana Prueba", { nota: "Llevará pan" });
    serve({ inscritos: [original] });
    registrations.updateNote.mockResolvedValue({ ...original, nota: "Llevará vino" });
    renderApp(<AdminRegistrationsPage />, "ADMIN");

    await user.click(
      await screen.findByRole("button", { name: "Editar nota de Ana Prueba" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Editar inscripción" });
    const nota = within(dialog).getByLabelText(/Nota/);
    expect(nota).toHaveValue("Llevará pan");

    await user.clear(nota);
    await user.type(nota, "Llevará vino");
    await user.click(within(dialog).getByRole("button", { name: "Guardar nota" }));

    await waitFor(() =>
      expect(registrations.updateNote).toHaveBeenCalledWith("a", "Llevará vino"),
    );
    expect(await screen.findByText("Nota actualizada.")).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    // La fila refleja lo que devolvió el servidor, sin recargar la tabla.
    expect(within(screen.getByRole("table")).getByText("Llevará vino")).toBeInTheDocument();
    expect(registrations.listByEvent).toHaveBeenCalledTimes(1);
  });

  it("eliminar confirma nombrando a la persona y la consecuencia", async () => {
    const user = userEvent.setup();
    serve({ inscritos: [registration("a", "Ana Prueba")] });
    registrations.remove.mockResolvedValue();
    renderApp(<AdminRegistrationsPage />, "ADMIN");

    await user.click(
      await screen.findByRole("button", { name: "Eliminar inscripción de Ana Prueba" }),
    );
    const dialog = screen.getByRole("alertdialog", { name: "Eliminar inscripción" });
    expect(
      within(dialog).getByText(
        "Ana Prueba perderá su cupo en «Evento de prueba». El cupo quedará disponible.",
      ),
    ).toBeInTheDocument();

    await user.click(within(dialog).getByRole("button", { name: "Eliminar inscripción" }));

    await waitFor(() => expect(registrations.remove).toHaveBeenCalledWith("a"));
    expect(
      await screen.findByText("Inscripción de Ana Prueba eliminada."),
    ).toBeInTheDocument();
  });

  it("participantes: solo lectura, una fila por persona con sus actividades", async () => {
    const user = userEvent.setup();
    serve({
      actividades: [
        activity("s-1", "Alabanza", "Beto Prueba", "u-b"),
        activity("s-2", "Lectura", "Beto Prueba", "u-b"),
        activity("s-3", "Bienvenida", "Usuario Prueba", "me"),
      ],
    });
    participations.listByEvent.mockResolvedValue([
      participation({
        participante: { id: "u-b", nombre_completo: "Beto Prueba" },
        estado_respuesta: "pendiente",
      }),
    ]);
    renderApp(<AdminRegistrationsPage />, "ADMIN");

    await user.click(await screen.findByRole("button", { name: "Participantes · 12" }));

    expect(screen.getByRole("note")).toHaveTextContent(
      "Los participantes ocupan aforo aunque no se inscriban.",
    );
    const beto = await screen.findByRole("link", {
      name: "Gestionar participación de Beto Prueba",
    });
    expect(beto).toHaveAttribute("href", "/participations");
    expect(beto).toHaveTextContent("Alabanza · Lectura");
    expect(beto).toHaveTextContent("Pendiente");

    const yo = screen.getByRole("link", {
      name: "Gestionar participación de Usuario Prueba",
    });
    expect(yo).toHaveTextContent("Usuario Prueba (Tú)");
    expect(yo).toHaveTextContent("Sin invitación");
    // Aquí no se inscribe ni se edita a nadie.
    expect(screen.queryByRole("button", { name: "Inscribir persona" })).not.toBeInTheDocument();
  });
});

describe("AdminRegistrationsPage · Total de inscritos", () => {
  it("suma por evento y deja abrir los inscritos de cada uno", async () => {
    const user = userEvent.setup();
    serve({
      eventos: [
        event(),
        event({
          id: "ev-2",
          titulo: "Evento pasado",
          capacidad: 90,
          fecha_inicio: `${inDays(-5)}T15:00:00Z`,
          fecha_fin: `${inDays(-5)}T17:00:00Z`,
          aforo: { participantes: 6, publico: 70, inscripciones_cerradas: true },
        }),
      ],
    });
    renderApp(<AdminRegistrationsPage />, "ADMIN");
    await screen.findByRole("heading", { name: "Evento de prueba" });

    await user.click(screen.getByRole("button", { name: "Total de inscritos" }));

    const total = screen.getByText("Total de inscritos", { selector: "dt" });
    expect(total.parentElement).toHaveTextContent("220");
    expect(total.parentElement).toHaveTextContent("en 2 eventos");
    const proximos = screen.getByText("En eventos próximos");
    expect(proximos.parentElement).toHaveTextContent("150");
    expect(proximos.parentElement).toHaveTextContent("1 evento");
    expect(
      screen.getByText("Participantes", { selector: "dt" }).parentElement,
    ).toHaveTextContent("18");

    const tabla = within(
      screen.getByRole("table", { name: "Resumen de inscritos por evento" }),
    );
    const pasado = tabla.getByText("Evento pasado").closest("tr") as HTMLElement;
    expect(within(pasado).getByText("Finalizado")).toBeInTheDocument();
    expect(within(pasado).getByText("14 libres")).toBeInTheDocument();
    // Sin fila de total: la tabla solo lista eventos.
    expect(tabla.getAllByRole("row")).toHaveLength(3);

    await user.click(tabla.getByRole("button", { name: "Ver inscritos de Evento pasado" }));

    expect(
      await screen.findByRole("heading", { name: "Evento pasado" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(registrations.listByEvent).toHaveBeenLastCalledWith(
        "ev-2",
        expect.anything(),
      ),
    );
  });
});
