import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { wallToIso } from "../../../lib/dateTimeRange";
import { ScheduleModal } from "../../../pages/events/components/ScheduleModal";
import { eventService } from "../../../services/eventService";
import { participationService } from "../../../services/participationService";
import { registrationService } from "../../../services/registrationService";
import { scheduleService } from "../../../services/scheduleService";
import { userService } from "../../../services/userService";
import type { Schedule } from "../../../types/schedule";
import { event, participation, renderApp } from "../../fixtures";

vi.mock("../../../services/scheduleService", () => ({
  scheduleService: { list: vi.fn(), history: vi.fn() },
}));
vi.mock("../../../services/participationService", () => ({
  participationService: { listByEvent: vi.fn() },
}));
vi.mock("../../../services/eventService", () => ({
  eventService: { getVersion: vi.fn() },
}));
vi.mock("../../../services/registrationService", () => ({
  registrationService: { listByEvent: vi.fn() },
}));
vi.mock("../../../services/userService", () => ({
  userService: { list: vi.fn() },
}));

// Evento del 10 de enero de 2030, de 9:00 a. m. a 1:00 p. m. (hora de Colombia).
const EVENT = event({
  id: "ev-1",
  fecha_inicio: wallToIso("2030-01-10T09:00"),
  fecha_fin: wallToIso("2030-01-10T13:00"),
});

function activity(id: string, nombre: string, start: string, end: string): Schedule {
  return {
    id,
    evento_id: "ev-1",
    actividad: nombre,
    hora_inicio: wallToIso(`2030-01-10T${start}`),
    hora_fin: wallToIso(`2030-01-10T${end}`),
    responsable: "Ana Prueba",
    descripcion: null,
  };
}

const ACTIVITIES = [
  activity("act-1", "Alabanza", "09:00", "09:30"),
  activity("act-2", "Estudio", "10:00", "11:00"),
];

async function open() {
  renderApp(
    <ScheduleModal open event={EVENT} onClose={vi.fn()} onSaved={vi.fn()} />,
    "ADMIN",
  );
  await screen.findByRole("region", { name: "Actividad 1" });
}

const row = (n: number) => screen.getByRole("region", { name: `Actividad ${n}` });

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(scheduleService.list).mockResolvedValue({
    items: ACTIVITIES,
    total: ACTIVITIES.length,
  });
  vi.mocked(participationService.listByEvent).mockResolvedValue([
    participation({
      id: "par-1",
      estado_respuesta: "aceptada",
      actividad: { ...participation().actividad, id: "act-1" },
    }),
    participation({
      id: "par-2",
      estado_respuesta: "pendiente",
      por_reconfirmar: true,
      actividad: { ...participation().actividad, id: "act-2" },
    }),
  ]);
  vi.mocked(eventService.getVersion).mockResolvedValue(1);
  vi.mocked(registrationService.listByEvent).mockResolvedValue({ items: [], total: 0 });
  vi.mocked(userService.list).mockResolvedValue({ items: [], total: 0 });
});

describe("ScheduleModal: actividades contraíbles", () => {
  it("las guardadas empiezan contraídas, con su línea resumen y su estado", async () => {
    await open();

    const first = within(row(1));
    expect(first.getByRole("button", { name: /1\. Alabanza/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(first.getByText("9:00 a. m. – 9:30 a. m. · Ana Prueba")).toBeInTheDocument();
    expect(first.getByText("Confirmado")).toBeInTheDocument();
    expect(within(row(2)).getByText("Por reconfirmar")).toBeInTheDocument();
    // Contraída no muestra sus campos.
    expect(first.queryByLabelText(/Título/)).not.toBeInTheDocument();
  });

  it("«Expandir todas» y «Contraer todas» actúan sobre todo el cronograma", async () => {
    const user = userEvent.setup();
    await open();

    await user.click(screen.getByRole("button", { name: "Expandir todas" }));
    expect(within(row(1)).getByLabelText(/Título/)).toHaveValue("Alabanza");
    expect(within(row(2)).getByLabelText(/Título/)).toHaveValue("Estudio");

    await user.click(screen.getByRole("button", { name: "Contraer todas" }));
    expect(within(row(1)).queryByLabelText(/Título/)).not.toBeInTheDocument();
  });

  it("marca la actividad con cambios sin guardar y despliega la que tiene errores", async () => {
    const user = userEvent.setup();
    await open();

    await user.click(within(row(1)).getByRole("button", { name: /1\. Alabanza/ }));
    const title = within(row(1)).getByLabelText(/Título/);
    await user.type(title, " inicial");
    expect(within(row(1)).getByText("Sin guardar")).toBeInTheDocument();
    expect(within(row(2)).queryByText("Sin guardar")).not.toBeInTheDocument();

    // Sin título hay un error: aunque se pida contraer, sigue a la vista.
    await user.clear(title);
    await user.click(screen.getByRole("button", { name: "Contraer todas" }));
    expect(within(row(1)).getByLabelText(/Título/)).toBeInTheDocument();
    expect(within(row(2)).queryByLabelText(/Título/)).not.toBeInTheDocument();
  });

  it("una actividad nueva aparece desplegada y marcada como nueva", async () => {
    const user = userEvent.setup();
    await open();

    await user.click(screen.getByRole("button", { name: "Agregar actividad" }));

    const added = within(row(3));
    expect(added.getByText("Nueva")).toBeInTheDocument();
    expect(added.getByLabelText(/Título/)).toHaveValue("");
  });

  it("el historial se carga al desplegarlo", async () => {
    const user = userEvent.setup();
    vi.mocked(scheduleService.history).mockResolvedValue([
      {
        id: "c-1",
        actividad_id: "act-1",
        actividad: "Alabanza",
        tipo: "editada",
        antes: { hora_inicio: wallToIso("2030-01-10T09:30") },
        despues: { hora_inicio: wallToIso("2030-01-10T09:00") },
        autor_nombre: "Marta Ruiz",
        fecha: wallToIso("2030-01-05T15:40"),
      },
    ]);
    await open();
    expect(scheduleService.history).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: /Historial de cambios/ }));

    expect(await screen.findByText("Marta Ruiz")).toBeInTheDocument();
    expect(screen.getByText("Inicio: 10 ene 9:30 a. m. → 10 ene 9:00 a. m.")).toBeInTheDocument();
    expect(scheduleService.history).toHaveBeenCalledWith("ev-1", expect.anything());
  });
});
