import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { wallToIso } from "../../../../lib/dateTimeRange";
import {
  byDay,
  filterGroups,
  splitGroups,
  statusSummary,
  type ActivityStatus,
  type GroupedActivity,
  type ScheduleGroup,
} from "../../../../lib/scheduleGroups";
import { AdminSchedulesPage } from "../../../../pages/admin/schedules/AdminSchedulesPage";
import { eventService } from "../../../../services/eventService";
import { scheduleService } from "../../../../services/scheduleService";
import { renderApp } from "../../../fixtures";

vi.mock("../../../../services/scheduleService", () => ({
  scheduleService: { grouped: vi.fn(), remove: vi.fn() },
}));
vi.mock("../../../../services/eventService", () => ({
  eventService: { list: vi.fn() },
}));
// El modal tiene sus propias pruebas.
vi.mock("../../../../pages/events/components/ScheduleModal", () => ({
  ScheduleModal: () => null,
}));

/** Hora de pared de Colombia a `days` días de hoy. */
function day(days: number, time: string): string {
  const date = new Date(Date.now() + days * 86_400_000 - 5 * 3_600_000);
  return wallToIso(`${date.toISOString().slice(0, 10)}T${time}`);
}

function activity(
  id: string,
  nombre: string,
  days: number,
  start: string,
  end: string,
  estado: ActivityStatus,
  responsable = "Ana Prueba",
): GroupedActivity {
  return {
    id,
    evento_id: "",
    actividad: nombre,
    hora_inicio: day(days, start),
    hora_fin: day(days, end),
    responsable,
    responsable_id: estado === "sin_asignar" ? null : "u-1",
    descripcion: null,
    estado,
  };
}

function group(
  id: string,
  titulo: string,
  days: number,
  actividades: GroupedActivity[],
  durationDays = 0,
): ScheduleGroup {
  return {
    evento: {
      id,
      titulo,
      fecha_inicio: day(days, "08:00"),
      fecha_fin: day(days + durationDays, "20:00"),
      lugar: "Templo",
    },
    actividades: actividades.map((a) => ({ ...a, evento_id: id })),
  };
}

const GROUPS = [
  group("ev-retiro", "Retiro", 9, [
    activity("a1", "Fogata", 9, "18:00", "19:00", "confirmado"),
    activity("a2", "Caminata", 10, "09:00", "10:00", "pendiente", "Beto Prueba"),
  ], 1),
  group("ev-culto", "Culto", 2, [
    activity("a3", "Alabanza", 2, "09:00", "09:30", "confirmado"),
    activity("a4", "Estudio", 2, "10:00", "11:00", "por_reconfirmar", "Beto Prueba"),
    activity("a5", "Ofrenda", 2, "11:00", "11:15", "sin_asignar", "Por asignar"),
  ]),
  group("ev-vigilia", "Vigilia", 20, []),
  group("ev-viejo", "Campaña", -30, [
    activity("a6", "Cierre", -30, "09:00", "10:00", "confirmado"),
  ]),
];

const section = (titulo: string) =>
  within(screen.getByRole("region", { name: `Cronograma de ${titulo}` }));
const regions = () =>
  screen
    .getAllByRole("region")
    .map((r) => r.getAttribute("aria-label"))
    .filter((name) => name?.startsWith("Cronograma de "));

async function open() {
  renderApp(<AdminSchedulesPage />, "ADMIN");
  await screen.findByRole("region", { name: "Cronograma de Culto" });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(scheduleService.grouped).mockResolvedValue(GROUPS);
  vi.mocked(eventService.list).mockResolvedValue({ items: [], total: 0 });
});

describe("scheduleGroups", () => {
  it("resume los estados de un evento", () => {
    expect(statusSummary(GROUPS[1].actividades)).toBe(
      "3 actividades · 1 confirmada · 1 por reconfirmar · 1 sin asignar",
    );
    expect(statusSummary([])).toBe("Sin actividades");
  });

  it("separa próximos (del más cercano) y pasados", () => {
    const { upcoming, past } = splitGroups(GROUPS);

    expect(upcoming.map((g) => g.evento.titulo)).toEqual(["Culto", "Retiro", "Vigilia"]);
    expect(past.map((g) => g.evento.titulo)).toEqual(["Campaña"]);
  });

  it("subagrupa por día los eventos de varios días", () => {
    expect(byDay(GROUPS[0].actividades).map((d) => d.items.map((a) => a.actividad))).toEqual([
      ["Fogata"],
      ["Caminata"],
    ]);
  });

  it("combina filtros y esconde los eventos sin coincidencias", () => {
    const none = { q: "", eventoId: "", estado: "" as const, responsable: "" };

    // Sin filtros se conservan también los eventos vacíos.
    expect(filterGroups(GROUPS, none)).toHaveLength(4);

    const beto = filterGroups(GROUPS, { ...none, responsable: "Beto Prueba" });
    expect(beto.map((g) => [g.evento.titulo, g.actividades.map((a) => a.actividad)])).toEqual([
      ["Retiro", ["Caminata"]],
      ["Culto", ["Estudio"]],
    ]);

    const both = filterGroups(GROUPS, {
      ...none,
      responsable: "Beto Prueba",
      estado: "por_reconfirmar",
    });
    expect(both.map((g) => g.evento.titulo)).toEqual(["Culto"]);

    // Buscar por el nombre del evento trae todas sus actividades; sin tildes.
    expect(filterGroups(GROUPS, { ...none, q: "campana" })[0].actividades).toHaveLength(1);
    expect(filterGroups(GROUPS, { ...none, q: "fogata" }).map((g) => g.evento.titulo)).toEqual([
      "Retiro",
    ]);
  });
});

describe("AdminSchedulesPage", () => {
  it("agrupa por evento, con los próximos primero y el más cercano desplegado", async () => {
    await open();

    expect(regions()).toEqual([
      "Cronograma de Culto",
      "Cronograma de Retiro",
      "Cronograma de Vigilia",
    ]);
    const culto = section("Culto");
    expect(culto.getByRole("button", { name: /^Culto/ })).toHaveAttribute("aria-expanded", "true");
    expect(
      culto.getByText("3 actividades · 1 confirmada · 1 por reconfirmar · 1 sin asignar"),
    ).toBeInTheDocument();
    expect(culto.getByText("Requiere atención")).toBeInTheDocument();
    expect(culto.getByText("Alabanza")).toBeInTheDocument();
    expect(culto.getByText(/9:00 a\. m\. – 9:30 a\. m\. · Ana Prueba/)).toBeInTheDocument();

    // Los demás, contraídos: se ve su resumen, no sus actividades.
    const retiro = section("Retiro");
    expect(retiro.getByRole("button", { name: /^Retiro/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(retiro.queryByText("Fogata")).not.toBeInTheDocument();
    expect(retiro.queryByText("Requiere atención")).not.toBeInTheDocument();
  });

  it("un evento de varios días se subagrupa por día y uno vacío invita a agregar", async () => {
    const user = userEvent.setup();
    await open();

    await user.click(screen.getByRole("button", { name: "Expandir todos" }));

    expect(section("Retiro").getAllByRole("heading", { level: 3 })).toHaveLength(2);
    const vigilia = section("Vigilia");
    expect(vigilia.getByText("Este evento aún no tiene actividades.")).toBeInTheDocument();
    expect(vigilia.getByRole("link", { name: "Agregar actividad" })).toHaveAttribute(
      "href",
      "/schedules/nuevo?evento_id=ev-vigilia",
    );
  });

  it("los pasados van en su pestaña y son de solo lectura", async () => {
    const user = userEvent.setup();
    await open();

    await user.click(screen.getByRole("button", { name: /^Pasados/ }));

    expect(regions()).toEqual(["Cronograma de Campaña"]);
    const viejo = section("Campaña");
    expect(viejo.getByText("Finalizado")).toBeInTheDocument();
    await user.click(viejo.getByRole("button", { name: /^Campaña/ }));
    expect(viejo.getByText("Cierre")).toBeInTheDocument();
    expect(viejo.queryByRole("link", { name: /Editar/ })).not.toBeInTheDocument();
    expect(viejo.queryByRole("button", { name: /Eliminar/ })).not.toBeInTheDocument();
  });

  it("los filtros se combinan y despliegan lo que coincide", async () => {
    const user = userEvent.setup();
    await open();

    await user.selectOptions(screen.getByLabelText("Responsable"), "Beto Prueba");
    expect(regions()).toEqual(["Cronograma de Culto", "Cronograma de Retiro"]);
    expect(section("Retiro").getByText("Caminata")).toBeInTheDocument();
    expect(section("Culto").queryByText("Alabanza")).not.toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Estado"), "por_reconfirmar");
    expect(regions()).toEqual(["Cronograma de Culto"]);

    await user.type(screen.getByRole("searchbox"), "zzz");
    expect(screen.getByText("Ninguna actividad coincide con los filtros")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Quitar filtros" }));
    expect(regions()).toHaveLength(3);
  });

  it("eliminar confirma nombrando al responsable y su estado", async () => {
    const user = userEvent.setup();
    vi.mocked(scheduleService.remove).mockResolvedValue(undefined);
    await open();

    await user.click(section("Culto").getByRole("button", { name: "Eliminar Estudio" }));

    const dialog = within(screen.getByRole("alertdialog"));
    expect(
      dialog.getByText(/Su responsable, Beto Prueba \(por reconfirmar\), recibirá un aviso/),
    ).toBeInTheDocument();
    await user.click(dialog.getByRole("button", { name: "Eliminar actividad" }));
    expect(scheduleService.remove).toHaveBeenCalledWith("a4");
  });
});
