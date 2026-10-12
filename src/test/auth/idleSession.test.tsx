import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthProvider } from "../../auth/AuthContext";
import { useAuth } from "../../auth/useAuth";
import {
  consumeIdleLogout,
  IDLE_LIMIT_MS,
  IDLE_WARNING_MS,
  REFRESH_MARGIN_MS,
  resetActivity,
} from "../../auth/useIdleSession";
import { TOKEN_STORAGE_KEY } from "../../config/env";
import { authService } from "../../services/authService";
import { userService } from "../../services/userService";

vi.mock("../../services/authService", () => ({
  authService: { login: vi.fn(), register: vi.fn(), refresh: vi.fn() },
}));
vi.mock("../../services/userService", () => ({
  userService: { getById: vi.fn() },
}));

const auth = vi.mocked(authService);
const users = vi.mocked(userService);

const MINUTE = 60_000;
/** Vigencia del token que emite el backend. */
const TOKEN_LIFETIME = 30 * MINUTE;

/** JWT ficticio (sin firma válida): el cliente solo lee `sub`, `rol` y `exp`. */
function tokenExpiringIn(ms: number): string {
  const encode = (value: object) =>
    btoa(JSON.stringify(value)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const exp = Math.floor((Date.now() + ms) / 1000);
  return `${encode({ alg: "HS256" })}.${encode({ sub: "me", rol: "MEMBER", exp })}.firma`;
}

function Status() {
  const { isAuthenticated, isLoading } = useAuth();
  return <p>{isLoading ? "cargando" : isAuthenticated ? "con sesión" : "sin sesión"}</p>;
}

/** Abre la app con una sesión ya guardada (como al volver a la pestaña). */
async function openWithSession() {
  localStorage.setItem(TOKEN_STORAGE_KEY, tokenExpiringIn(TOKEN_LIFETIME));
  render(
    <AuthProvider>
      <Status />
    </AuthProvider>,
  );
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
  expect(screen.getByText("con sesión")).toBeInTheDocument();
}

async function wait(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

function useThePlatform() {
  act(() => {
    window.dispatchEvent(new Event("pointerdown"));
  });
}

/** Deja pasar `ms` con una interacción cada 5 minutos: la persona sigue ahí. */
async function keepUsingFor(ms: number) {
  for (let left = ms; left > 0; left -= 5 * MINUTE) {
    useThePlatform();
    await wait(Math.min(left, 5 * MINUTE));
  }
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  sessionStorage.clear();
  resetActivity();
  users.getById.mockResolvedValue({
    id: "me",
    nombre: "Usuario",
    apellido: "Prueba",
    correo: "usuario@example.test",
    telefono: null,
    rol: "MEMBER",
    activo: true,
    fecha_creacion: null,
  });
  auth.refresh.mockImplementation(async () => ({
    access_token: tokenExpiringIn(TOKEN_LIFETIME),
    token_type: "bearer",
  }));
});

afterEach(() => {
  // Se desmonta y se vacían los temporizadores simulados antes de volver a
  // los reales: una animación a medias dejaría colgada la de la prueba siguiente.
  cleanup();
  act(() => {
    vi.runOnlyPendingTimers();
  });
  vi.useRealTimers();
});

describe("Aviso antes de cerrar por inactividad", () => {
  const SECOND = 1000;
  const warning = () => screen.queryByRole("alertdialog", { name: "¿Sigues ahí?" });

  /** Deja la sesión justo en el momento en que aparece el aviso. */
  async function reachWarning() {
    await openWithSession();
    useThePlatform();
    await wait(IDLE_LIMIT_MS - 30 * SECOND);
    expect(warning()).not.toBeInTheDocument();
    await wait(30 * SECOND);
    expect(warning()).toBeInTheDocument();
  }

  it("a los 15 minutos avisa con una cuenta regresiva, sin cerrar todavía", async () => {
    await reachWarning();

    expect(screen.getByText("con sesión")).toBeInTheDocument();
    expect(screen.getByRole("timer")).toHaveTextContent("30 segundos");
    expect(screen.getByRole("button", { name: "Seguir conectado" })).toHaveFocus();

    await wait(10 * SECOND);
    expect(screen.getByRole("timer")).toHaveTextContent("20 segundos");

    await wait(19 * SECOND);
    expect(screen.getByRole("timer")).toHaveTextContent("1 segundo");
    expect(screen.getByText("con sesión")).toBeInTheDocument();
  });

  it("sin respuesta, cierra la sesión al terminar la cuenta", async () => {
    await reachWarning();

    await wait(IDLE_WARNING_MS);

    expect(screen.getByText("sin sesión")).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    expect(consumeIdleLogout()).toBe(true);
    await wait(SECOND);
    expect(warning()).not.toBeInTheDocument();
  });

  it("«Seguir conectado» cancela el cierre y reinicia los 15 minutos", async () => {
    await reachWarning();
    await wait(20 * SECOND);

    fireEvent.click(screen.getByRole("button", { name: "Seguir conectado" }));
    await wait(SECOND);
    expect(warning()).not.toBeInTheDocument();

    // Pasado el momento en que se habría cerrado, sigue abierta.
    await wait(IDLE_WARNING_MS);
    expect(screen.getByText("con sesión")).toBeInTheDocument();

    // Y el aviso vuelve solo tras otros 15 minutos completos sin uso.
    await wait(IDLE_LIMIT_MS - IDLE_WARNING_MS - 2 * SECOND - 30 * SECOND);
    expect(warning()).not.toBeInTheDocument();
    await wait(MINUTE);
    expect(warning()).toBeInTheDocument();
  });

  it("«Cerrar sesión» confirma el cierre sin esperar", async () => {
    await reachWarning();

    fireEvent.click(screen.getByRole("button", { name: "Cerrar sesión" }));
    await wait(SECOND);

    expect(screen.getByText("sin sesión")).toBeInTheDocument();
    expect(warning()).not.toBeInTheDocument();
    // La cerró la persona: no se le explica como inactividad.
    expect(consumeIdleLogout()).toBe(false);
  });

  it("Escape cancela el cierre", async () => {
    await reachWarning();

    fireEvent.keyDown(window, { key: "Escape" });
    await wait(SECOND);

    expect(warning()).not.toBeInTheDocument();
    expect(screen.getByText("con sesión")).toBeInTheDocument();
  });

  it("mover el mouse o teclear detrás del aviso no lo descarta: hay que responder", async () => {
    await reachWarning();

    useThePlatform();
    act(() => {
      window.dispatchEvent(new Event("keydown"));
    });
    await wait(5 * SECOND);
    expect(warning()).toBeInTheDocument();

    await wait(IDLE_WARNING_MS);
    expect(screen.getByText("sin sesión")).toBeInTheDocument();
  });

  it("si la persona sigue trabajando en otra pestaña, el aviso se retira", async () => {
    await reachWarning();

    localStorage.setItem("cc_last_activity", String(Date.now()));
    // Lo detecta en la siguiente revisión (cada segundo)…
    await wait(SECOND);
    // …y el aviso se desvanece.
    await wait(SECOND);

    expect(warning()).not.toBeInTheDocument();
    expect(screen.getByText("con sesión")).toBeInTheDocument();
  });

  it("mientras se usa la plataforma nunca aparece", async () => {
    await openWithSession();

    await keepUsingFor(60 * MINUTE);

    expect(warning()).not.toBeInTheDocument();
  });
});

describe("Sesión por uso", () => {
  it("se cierra sola tras 15 minutos sin usar la plataforma", async () => {
    await openWithSession();
    useThePlatform();

    await wait(IDLE_LIMIT_MS - MINUTE);
    expect(screen.getByText("con sesión")).toBeInTheDocument();

    await wait(2 * MINUTE);
    expect(screen.getByText("sin sesión")).toBeInTheDocument();
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).toBeNull();
    // La pantalla de acceso podrá explicar por qué se cerró.
    expect(consumeIdleLogout()).toBe(true);
  });

  it("sin uso no se renueva: la inactividad cierra antes de que venza el token", async () => {
    await openWithSession();
    useThePlatform();

    await wait(IDLE_LIMIT_MS + MINUTE);

    expect(auth.refresh).not.toHaveBeenCalled();
    expect(screen.getByText("sin sesión")).toBeInTheDocument();
  });

  it("mientras se usa sigue abierta más allá de los 30 minutos del token", async () => {
    await openWithSession();

    // Hora y media de uso, con una interacción cada 5 minutos.
    await keepUsingFor(90 * MINUTE);

    expect(screen.getByText("con sesión")).toBeInTheDocument();
    expect(auth.refresh.mock.calls.length).toBeGreaterThanOrEqual(3);
    // El token guardado es el renovado, no el original.
    expect(localStorage.getItem(TOKEN_STORAGE_KEY)).not.toBeNull();
    expect(consumeIdleLogout()).toBe(false);
  });

  it("renueva solo cuando al token le queda poco, no en cada interacción", async () => {
    await openWithSession();

    await keepUsingFor(TOKEN_LIFETIME - REFRESH_MARGIN_MS - 2 * MINUTE);
    expect(auth.refresh).not.toHaveBeenCalled();

    await keepUsingFor(3 * MINUTE);
    expect(auth.refresh).toHaveBeenCalledTimes(1);

    // Con el token recién renovado no vuelve a pedir otro enseguida.
    await keepUsingFor(5 * MINUTE);
    expect(auth.refresh).toHaveBeenCalledTimes(1);
  });

  it("las consultas automáticas no cuentan como uso", async () => {
    await openWithSession();
    useThePlatform();

    // Solo pasa el tiempo (sondeos, temporizadores): nadie toca nada.
    await wait(IDLE_LIMIT_MS + MINUTE);

    expect(screen.getByText("sin sesión")).toBeInTheDocument();
  });

  it("una sesión guardada que lleva más de 15 minutos sin uso no se reabre", async () => {
    // Usó la plataforma, cerró la pestaña y volvió 20 minutos después.
    localStorage.setItem("cc_last_activity", String(Date.now() - 20 * MINUTE));
    localStorage.setItem(TOKEN_STORAGE_KEY, tokenExpiringIn(10 * MINUTE));

    render(
      <AuthProvider>
        <Status />
      </AuthProvider>,
    );
    await wait(0);

    expect(screen.getByText("sin sesión")).toBeInTheDocument();
    expect(consumeIdleLogout()).toBe(true);
  });

  it("usar otra pestaña mantiene viva esta", async () => {
    await openWithSession();
    useThePlatform();

    await wait(IDLE_LIMIT_MS - MINUTE);
    // La otra pestaña anota su actividad en el almacenamiento compartido.
    localStorage.setItem("cc_last_activity", String(Date.now()));
    await wait(2 * MINUTE);

    expect(screen.getByText("con sesión")).toBeInTheDocument();
  });

  it("si la renovación falla por red, la sesión sigue y se reintenta", async () => {
    await openWithSession();
    auth.refresh.mockRejectedValueOnce(new Error("sin conexión"));

    await keepUsingFor(TOKEN_LIFETIME - REFRESH_MARGIN_MS - MINUTE);
    expect(auth.refresh).not.toHaveBeenCalled();

    // Primer intento falla; el siguiente (unos segundos después) lo logra.
    await keepUsingFor(2 * MINUTE);
    expect(auth.refresh.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("con sesión")).toBeInTheDocument();

    // Ya renovado, sigue abierta más allá del vencimiento original.
    const calls = auth.refresh.mock.calls.length;
    await keepUsingFor(15 * MINUTE);
    expect(auth.refresh).toHaveBeenCalledTimes(calls);
    expect(screen.getByText("con sesión")).toBeInTheDocument();
  });
});
