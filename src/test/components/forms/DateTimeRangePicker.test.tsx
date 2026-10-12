import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import {
  DateTimeRangePicker,
  type DateTimeRangeValue,
} from "../../../components/forms/DateTimeRangePicker";

const DAY = "2030-11-14";

function Harness({
  initial,
  ...props
}: { initial: DateTimeRangeValue } & Partial<
  React.ComponentProps<typeof DateTimeRangePicker>
>) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <DateTimeRangePicker {...props} value={value} onChange={setValue} />
      <pre data-testid="value">{JSON.stringify(value)}</pre>
    </>
  );
}

const current = (): DateTimeRangeValue =>
  JSON.parse(screen.getByTestId("value").textContent ?? "{}");

const range = (startTime: string, endTime: string, endDate = DAY): DateTimeRangeValue => ({
  startDate: DAY,
  startTime,
  endDate,
  endTime,
});

const group = (name: string) => within(screen.getByRole("group", { name }));
const option = (groupName: string, list: "hora" | "minutos", text: string) =>
  within(
    group(groupName).getByRole("combobox", { name: `${groupName}: ${list}` }),
  ).getByRole("option", { name: text }) as HTMLOptionElement;

describe("DateTimeRangePicker", () => {
  it("muestra en 12 h con a. m./p. m. un valor ya guardado", () => {
    render(<Harness initial={range("12:00", "15:30")} />);

    expect(group("Hora de inicio").getByRole("combobox", { name: /hora$/ })).toHaveValue("12");
    expect(group("Hora de inicio").getByRole("button", { name: "p. m." })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(group("Hora de fin").getByRole("combobox", { name: /hora$/ })).toHaveValue("3");
    expect(group("Hora de fin").getByRole("combobox", { name: /minutos$/ })).toHaveValue("30");
    expect(
      screen.getByText("Jue 14 nov 2030, 12:00 p. m. → 3:30 p. m. (3 h 30 min)"),
    ).toBeInTheDocument();
  });

  it("el mismo día bloquea las horas y minutos de fin que no superan el inicio", () => {
    render(<Harness initial={range("11:30", "11:45")} />);

    expect(option("Hora de fin", "hora", "10").disabled).toBe(true);
    expect(option("Hora de fin", "hora", "11").disabled).toBe(false);
    expect(option("Hora de fin", "minutos", "15").disabled).toBe(true);
    expect(option("Hora de fin", "minutos", "30").disabled).toBe(true);
    expect(option("Hora de fin", "minutos", "31").disabled).toBe(false);
    // Pasar a p. m. sigue permitido: 12:00 p. m. es después de 11:30 a. m.
    expect(group("Hora de fin").getByRole("button", { name: "p. m." })).toBeEnabled();
  });

  it("con inicio p. m. el mismo día, el a. m. del fin queda bloqueado", () => {
    render(<Harness initial={range("15:00", "17:00")} />);

    expect(group("Hora de fin").getByRole("button", { name: "a. m." })).toBeDisabled();
    expect(group("Hora de inicio").getByRole("button", { name: "a. m." })).toBeEnabled();
  });

  it("si el fin es otro día, todas sus horas quedan habilitadas", () => {
    render(<Harness initial={range("22:00", "01:00", "2030-11-15")} />);

    expect(group("Hora de fin").getByRole("button", { name: "a. m." })).toBeEnabled();
    expect(option("Hora de fin", "hora", "1").disabled).toBe(false);
    expect(option("Hora de fin", "minutos", "00").disabled).toBe(false);
  });

  it("al mover el inicio más allá del fin, ajusta el fin y lo avisa", async () => {
    const user = userEvent.setup();
    render(<Harness initial={range("10:00", "11:00")} minDurationMinutes={15} />);

    await user.click(group("Hora de inicio").getByRole("button", { name: "p. m." }));

    expect(current()).toEqual(range("22:00", "22:15"));
    expect(screen.getByRole("status")).toHaveTextContent(
      "Ajustamos la hora de fin a 10:15 p. m. porque cambiaste el inicio.",
    );
  });

  it("el calendario del fin bloquea los días anteriores al inicio", async () => {
    const user = userEvent.setup();
    render(<Harness initial={range("10:00", "11:00")} />);

    await user.click(screen.getByLabelText("Fecha de fin"));
    const calendar = screen.getByRole("dialog", { name: "Calendario: Fecha de fin" });

    expect(calendar.querySelector('[data-date="2030-11-13"]')).toBeDisabled();
    expect(calendar.querySelector('[data-date="2030-11-14"]')).toBeEnabled();

    await user.click(calendar.querySelector('[data-date="2030-11-16"]')!);
    expect(current().endDate).toBe("2030-11-16");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("una actividad solo puede caer dentro del horario del evento", async () => {
    const user = userEvent.setup();
    // Evento del 14 nov 3:00 p. m. al 15 nov 8:00 p. m.
    render(
      <Harness
        initial={range("16:00", "17:00")}
        min={`${DAY}T15:00`}
        max="2030-11-15T20:00"
      />,
    );

    // El primer día, nada antes de las 3:00 p. m.
    expect(group("Hora de inicio").getByRole("button", { name: "a. m." })).toBeDisabled();
    expect(option("Hora de inicio", "hora", "2").disabled).toBe(true);
    expect(option("Hora de inicio", "hora", "3").disabled).toBe(false);

    await user.click(screen.getByLabelText("Fecha de inicio"));
    const calendar = screen.getByRole("dialog");
    expect(calendar.querySelector('[data-date="2030-11-13"]')).toBeDisabled();
    expect(calendar.querySelector('[data-date="2030-11-15"]')).toBeEnabled();
    expect(calendar.querySelector('[data-date="2030-11-16"]')).toBeDisabled();
  });

  it("con día fijo (evento de un solo día) no ofrece calendario", () => {
    render(
      <Harness
        initial={{ startDate: "", startTime: "", endDate: "", endTime: "" }}
        fixedDate={DAY}
        min={`${DAY}T09:00`}
        max={`${DAY}T12:00`}
        labels={{ startTime: "Inicio", endTime: "Fin" }}
      />,
    );

    expect(screen.queryByLabelText(/Fecha/)).not.toBeInTheDocument();
    expect(option("Inicio", "hora", "8").disabled).toBe(true);
    expect(option("Inicio", "hora", "9").disabled).toBe(false);
    expect(group("Inicio").getByRole("button", { name: "p. m." })).toBeDisabled();
    // El fin sí puede ser a las 12:00 p. m., la hora en que acaba el evento.
    expect(group("Fin").getByRole("button", { name: "p. m." })).toBeEnabled();
  });
});
