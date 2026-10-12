import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SchedulesListPage } from "../../../pages/schedules/SchedulesListPage";
import { eventService } from "../../../services/eventService";
import { scheduleService } from "../../../services/scheduleService";
import type { Schedule } from "../../../types/schedule";
import { event, inDays, renderApp } from "../../fixtures";

vi.mock("../../../services/eventService", () => ({
  eventService: { list: vi.fn() },
}));
vi.mock("../../../services/scheduleService", () => ({
  scheduleService: { list: vi.fn() },
}));

function activity(id: string, eventoId: string, nombre: string, inicio: string): Schedule {
  return {
    id,
    evento_id: eventoId,
    actividad: nombre,
    hora_inicio: inicio,
    hora_fin: new Date(new Date(inicio).getTime() + 30 * 60000).toISOString(),
    responsable: "Por asignar",
    descripcion: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("SchedulesListPage", () => {
  it("agrupa las actividades por evento, cada uno con las suyas", async () => {
    const retiro = event({ id: "ev-retiro", titulo: "Retiro", fecha_inicio: inDays(9), fecha_fin: inDays(9) });
    const culto = event({ id: "ev-culto", titulo: "Culto", fecha_inicio: inDays(2), fecha_fin: inDays(2) });
    vi.mocked(eventService.list).mockResolvedValue({ items: [retiro, culto], total: 2 });
    const items = [
      activity("a1", "ev-retiro", "Fogata", inDays(9)),
      activity("a2", "ev-culto", "Alabanza", inDays(2)),
      activity("a3", "ev-retiro", "Caminata", inDays(9)),
    ];
    vi.mocked(scheduleService.list).mockResolvedValue({ items, total: items.length });
    renderApp(<SchedulesListPage />);

    const culto$ = await screen.findByRole("region", { name: "Cronograma de Culto" });
    const retiro$ = screen.getByRole("region", { name: "Cronograma de Retiro" });

    // El evento más próximo va primero.
    expect(screen.getAllByRole("region").map((r) => r.getAttribute("aria-label"))).toEqual([
      "Cronograma de Culto",
      "Cronograma de Retiro",
    ]);
    expect(within(culto$).getByText("Alabanza")).toBeInTheDocument();
    expect(within(culto$).queryByText("Fogata")).not.toBeInTheDocument();
    expect(within(retiro$).getByText("Fogata")).toBeInTheDocument();
    expect(within(retiro$).getByText("Caminata")).toBeInTheDocument();
    expect(within(retiro$).getByRole("link", { name: "Retiro" })).toHaveAttribute(
      "href",
      "/events/ev-retiro",
    );
    expect(screen.getByText("3 actividades en 2 eventos")).toBeInTheDocument();
  });
});
