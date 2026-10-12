import { screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { occupancyOf } from "../../../lib/capacity";
import { wallToIso } from "../../../lib/dateTimeRange";
import {
  EventForm,
  type EventFormValues,
} from "../../../pages/events/components/EventForm";
import { event, renderApp } from "../../fixtures";

// El mapa y las sugerencias de dirección no intervienen en estas pruebas.
vi.mock("../../../components/map/EventLocationPicker", () => ({
  EventLocationPicker: () => null,
}));
vi.mock("../../../lib/geocoding", async (original) => ({
  ...(await original<typeof import("../../../lib/geocoding")>()),
  geocodeAddress: vi.fn().mockResolvedValue(null),
  searchAddressSuggestions: vi.fn().mockResolvedValue([]),
}));

const INITIAL: EventFormValues = {
  titulo: "Evento de prueba",
  descripcion: "Descripción de prueba",
  lugar: "Salón de prueba",
  direccion: "",
  latitud: "",
  longitud: "",
  fechaInicio: "2030-01-10",
  horaInicio: "10:00",
  fechaFin: "2030-01-10",
  horaFin: "12:00",
  capacidad: "200",
  limiteInscripcion: "",
  diasCancelacion: "",
};

/** Fecha local `YYYY-MM-DD` a `days` días de hoy. */
function localDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Abre el calendario de un campo y lleva la vista hasta el día pedido. */
async function findDay(user: UserEvent, label: RegExp, iso: string): Promise<HTMLElement> {
  // Si quedó abierto el de una consulta anterior, se cierra primero.
  if (screen.queryByRole("dialog")) {
    await user.keyboard("{Escape}");
  }
  await user.click(screen.getByRole("button", { name: label }));
  const calendar = screen.getByRole("dialog");
  const day = () => calendar.querySelector<HTMLElement>(`[data-date="${iso}"]`);
  for (let i = 0; i < 24 && !day(); i++) {
    const shown = calendar.querySelector<HTMLElement>("[data-date]")!.dataset.date!;
    await user.click(
      within(calendar).getByRole("button", {
        name: iso < shown ? "Mes anterior" : "Mes siguiente",
      }),
    );
  }
  return day()!;
}

/** Abre el formulario de edición, como al recargar la página del evento. */
function openEdit(overrides: Partial<EventFormValues> = {}) {
  renderApp(
    <EventForm
      initial={{ ...INITIAL, ...overrides }}
      submitting={false}
      submitLabel="Guardar cambios"
      // Aforo 200 con 12 participantes y 150 inscritos: 162 ocupados.
      occupancy={occupancyOf(event())}
      onSubmit={vi.fn()}
      onCancel={vi.fn()}
    />,
    "ADMIN",
  );
  return screen.getByLabelText(/Capacidad/);
}

describe("EventForm: límites del aforo", () => {
  it("avisa del máximo mientras se escribe, sin salir del campo", async () => {
    const user = userEvent.setup();
    const capacidad = openEdit();

    await user.clear(capacidad);
    await user.type(capacidad, "10000001");

    // El foco sigue en el campo: no hizo falta perderlo para ver el error.
    expect(capacidad).toHaveFocus();
    expect(screen.getByText("El máximo es 10.000.000.")).toBeInTheDocument();
    expect(capacidad).toHaveAttribute("aria-invalid", "true");
  });

  it("el máximo exacto es válido y el aviso desaparece al corregir", async () => {
    const user = userEvent.setup();
    const capacidad = openEdit();

    await user.clear(capacidad);
    await user.type(capacidad, "10000001");
    expect(screen.getByText("El máximo es 10.000.000.")).toBeInTheDocument();

    await user.clear(capacidad);
    await user.type(capacidad, "10000000");
    expect(screen.queryByText(/El máximo es/)).not.toBeInTheDocument();
    expect(capacidad).not.toHaveAttribute("aria-invalid");
  });

  it("no deja escribir más dígitos de los que tiene el máximo ni otros caracteres", async () => {
    const user = userEvent.setup();
    const capacidad = openEdit();

    await user.clear(capacidad);
    await user.type(capacidad, "123456789012");

    expect(capacidad).toHaveValue(12345678);
  });

  it("avisa también mientras se escribe si baja de los lugares ocupados", async () => {
    const user = userEvent.setup();
    const capacidad = openEdit();

    await user.clear(capacidad);
    await user.type(capacidad, "100");

    expect(capacidad).toHaveFocus();
    expect(
      screen.getByText("Hay 162 lugares ocupados. El aforo no puede ser menor."),
    ).toBeInTheDocument();
  });

  it("al abrir, sin tocar nada, no muestra errores", () => {
    const capacidad = openEdit();

    expect(capacidad).not.toHaveAttribute("aria-invalid");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});

describe("EventForm: límites de inscripción", () => {
  it("la fecha límite no puede ser posterior al inicio del evento", async () => {
    const user = userEvent.setup();
    openEdit();
    const limite = screen.getByLabelText(/Fecha límite para inscribirse/);

    // El evento empieza el 10 de enero de 2030.
    await user.type(limite, "2030-01-11");
    expect(
      screen.getByText("No puede ser posterior al inicio del evento."),
    ).toBeInTheDocument();

    await user.clear(limite);
    await user.type(limite, "2030-01-08");
    expect(
      screen.queryByText("No puede ser posterior al inicio del evento."),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("El público podrá inscribirse hasta el final de ese día."),
    ).toBeInTheDocument();
  });

  it("los días para cancelar muestran hasta cuándo se podrá", async () => {
    const user = userEvent.setup();
    openEdit();
    const dias = screen.getByLabelText(/Días límite para cancelar/);

    expect(
      screen.getByText(/^Sin días, se puede cancelar hasta que el evento empiece\./),
    ).toBeInTheDocument();

    // Dos días antes del 10 de enero a las 10:00.
    await user.type(dias, "2");
    expect(screen.getByText(/^Se podrá cancelar hasta el 08 de ene de 2030/)).toBeInTheDocument();
  });

  it("los días solo admiten dígitos y un máximo de 365", async () => {
    const user = userEvent.setup();
    openEdit();
    const dias = screen.getByLabelText(/Días límite para cancelar/);

    await user.type(dias, "3a.6-6");
    expect(dias).toHaveValue("366");
    expect(screen.getByText("El máximo es 365 días.")).toBeInTheDocument();

    await user.clear(dias);
    await user.type(dias, "365");
    expect(screen.queryByText("El máximo es 365 días.")).not.toBeInTheDocument();
  });

  it("aclara que los límites son para el público", () => {
    openEdit();

    expect(
      screen.getByText(/Un administrador puede inscribir o retirar a alguien/),
    ).toBeInTheDocument();
  });
});

describe("EventForm: los límites van de hoy al día del evento", () => {
  /** Un evento dentro de 5 días. */
  const enCincoDias = () => ({ fechaInicio: localDate(5), fechaFin: localDate(5) });

  it("la fecha límite solo ofrece desde hoy hasta el día del evento", () => {
    openEdit(enCincoDias());
    const limite = screen.getByLabelText(/Fecha límite para inscribirse/);

    expect(limite).toHaveAttribute("min", localDate(0));
    expect(limite).toHaveAttribute("max", localDate(5));
  });

  it("una fecha límite anterior a hoy no se acepta; hoy sí", async () => {
    const user = userEvent.setup();
    openEdit(enCincoDias());
    const limite = screen.getByLabelText(/Fecha límite para inscribirse/);

    await user.type(limite, localDate(-1));
    expect(screen.getByText("No puede ser anterior a hoy.")).toBeInTheDocument();

    await user.clear(limite);
    await user.type(limite, localDate(0));
    expect(screen.queryByText("No puede ser anterior a hoy.")).not.toBeInTheDocument();
  });

  it("los días para cancelar no pueden superar los que faltan para el evento", async () => {
    const user = userEvent.setup();
    openEdit(enCincoDias());
    const dias = screen.getByLabelText(/Días límite para cancelar/);

    expect(
      screen.getByText(/Entre 0 y 5: los días que faltan para el evento\./),
    ).toBeInTheDocument();

    await user.type(dias, "6");
    expect(screen.getByText("El evento es en 5 días: el máximo es 5.")).toBeInTheDocument();

    await user.clear(dias);
    await user.type(dias, "5");
    expect(screen.queryByText(/el máximo es 5/)).not.toBeInTheDocument();
  });

  it("con el evento mañana solo cabe un día, y hoy ninguno", async () => {
    const user = userEvent.setup();
    openEdit({ fechaInicio: localDate(1), fechaFin: localDate(1) });

    await user.type(screen.getByLabelText(/Días límite para cancelar/), "2");

    expect(screen.getByText("El evento es mañana: el máximo es 1.")).toBeInTheDocument();
  });

  it("no exige tocar una fecha límite que ya venció en un evento guardado", async () => {
    const user = userEvent.setup();
    // Las inscripciones cerraron hace 3 días; se entra a corregir otra cosa.
    openEdit({ ...enCincoDias(), limiteInscripcion: localDate(-3) });

    await user.type(screen.getByLabelText(/Título/), " (actualizado)");

    expect(screen.queryByText("No puede ser anterior a hoy.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeEnabled();
  });

  it("tampoco unos días ya guardados que hoy no cabrían, salvo que se mueva el evento", async () => {
    const user = userEvent.setup();
    // Se fijaron 8 días cuando faltaba más; hoy faltan 5.
    openEdit({ ...enCincoDias(), diasCancelacion: "8" });

    await user.type(screen.getByLabelText(/Título/), " (actualizado)");
    expect(screen.queryByText(/el máximo es/)).not.toBeInTheDocument();

    // Al acercar el evento, los días tienen que volver a caber.
    await user.click(await findDay(user, /Fecha de inicio/, localDate(3)));
    expect(screen.getByText("El evento es en 3 días: el máximo es 3.")).toBeInTheDocument();
  });
});

describe("EventForm: el evento se programa de hoy en adelante", () => {
  it("el calendario bloquea los días pasados y, en el fin, los anteriores al inicio", async () => {
    const user = userEvent.setup();
    openEdit({ fechaInicio: localDate(5), fechaFin: localDate(5) });

    expect(await findDay(user, /Fecha de inicio/, localDate(-1))).toBeDisabled();
    expect(await findDay(user, /Fecha de inicio/, localDate(0))).toBeEnabled();
    expect(await findDay(user, /Fecha de fin/, localDate(4))).toBeDisabled();
    expect(await findDay(user, /Fecha de fin/, localDate(5))).toBeEnabled();
  });

  it("al mover el inicio después del fin, el fin se ajusta y se avisa", async () => {
    const user = userEvent.setup();
    // De 10:00 a. m. a 12:00 p. m. dentro de 5 días.
    openEdit({ fechaInicio: localDate(5), fechaFin: localDate(5) });

    await user.click(
      within(screen.getByRole("group", { name: "Hora de inicio" })).getByRole("button", {
        name: "p. m.",
      }),
    );

    expect(
      screen.getByText("Ajustamos la hora de fin a 10:01 p. m. porque cambiaste el inicio."),
    ).toBeInTheDocument();
    expect(screen.queryByText("Debe ser posterior a la hora de inicio.")).not.toBeInTheDocument();
  });

  it("un evento en curso conserva su fecha de inicio pasada", async () => {
    const user = userEvent.setup();
    openEdit({ fechaInicio: localDate(-2), fechaFin: localDate(3) });

    await user.type(screen.getByLabelText(/Título/), " (actualizado)");

    expect(screen.queryByText("No puede ser anterior a hoy.")).not.toBeInTheDocument();
    expect(await findDay(user, /Fecha de fin/, localDate(-1))).toBeDisabled();
  });
});

describe("EventForm: cambiar el horario de un evento con cronograma", () => {
  // El evento de prueba va el 10 de enero de 2030, de 10:00 a. m. a 12:00 p. m.
  const SCHEDULES = [
    {
      id: "act-1",
      evento_id: "ev-1",
      actividad: "Alabanza",
      hora_inicio: wallToIso("2030-01-10T10:00"),
      hora_fin: wallToIso("2030-01-10T10:30"),
      responsable: "Por asignar",
      descripcion: null,
    },
  ];

  function open() {
    const onSubmit = vi.fn();
    renderApp(
      <EventForm
        initial={INITIAL}
        submitting={false}
        submitLabel="Guardar cambios"
        schedules={SCHEDULES}
        onSubmit={onSubmit}
        onCancel={vi.fn()}
      />,
      "ADMIN",
    );
    return onSubmit;
  }

  const startPeriod = (name: string) =>
    within(screen.getByRole("group", { name: "Hora de inicio" })).getByRole("button", { name });

  it("ampliar el rango no muestra nada del cronograma", async () => {
    const user = userEvent.setup();
    const onSubmit = open();

    // El fin pasa de 12:00 p. m. a 1:00 p. m.
    await user.selectOptions(
      within(screen.getByRole("group", { name: "Hora de fin" })).getByRole("combobox", {
        name: "Hora de fin: hora",
      }),
      "1",
    );

    expect(screen.queryByText(/El cronograma tiene/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.anything(), []);
  });

  it("mover el evento muestra cómo quedan las actividades y exige resolver las que no caben", async () => {
    const user = userEvent.setup();
    const onSubmit = open();

    // El inicio pasa a las 10:00 p. m.; el fin se ajusta a las 10:01 p. m.
    await user.click(startPeriod("p. m."));

    expect(screen.getByText(/El cronograma tiene 1 actividad/)).toBeInTheDocument();
    expect(
      screen.getByRole("checkbox", { name: "Mover las actividades con el evento (12 h después)" }),
    ).toBeChecked();
    // Movida con el evento duraría hasta las 10:30 p. m.: no cabe.
    expect(
      screen.getByText("Falta decidir qué hacer con 1 actividad que queda fuera del evento."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeDisabled();

    await user.selectOptions(
      screen.getByRole("combobox", { name: "Qué hacer con Alabanza" }),
      "remove",
    );
    expect(screen.getByText("→ se eliminará")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));
    expect(onSubmit).toHaveBeenCalledWith(expect.anything(), [{ id: "act-1", eliminar: true }]);
  });

  it("ajustarla al evento envía su horario nuevo", async () => {
    const user = userEvent.setup();
    const onSubmit = open();

    await user.click(startPeriod("p. m."));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Qué hacer con Alabanza" }),
      "fit",
    );
    await user.click(screen.getByRole("button", { name: "Guardar cambios" }));

    // Recortada al evento: de 10:00 p. m. a 10:01 p. m.
    expect(onSubmit).toHaveBeenCalledWith(expect.anything(), [
      {
        id: "act-1",
        hora_inicio: wallToIso("2030-01-10T22:00"),
        hora_fin: wallToIso("2030-01-10T22:01"),
      },
    ]);
  });
});
