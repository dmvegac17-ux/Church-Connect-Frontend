import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LoginPage } from "../../../pages/auth/LoginPage";
import { ResetPasswordPage } from "../../../pages/auth/ResetPasswordPage";
import { authService } from "../../../services/authService";
import { ApiError } from "../../../types/api";
import { renderApp } from "../../fixtures";

vi.mock("../../../services/authService", async (original) => ({
  ...(await original<typeof import("../../../services/authService")>()),
  authService: {
    requestPasswordReset: vi.fn(),
    validateResetLink: vi.fn(),
    resetPassword: vi.fn(),
  },
}));
// El versículo del día no interviene en estas pruebas.
vi.mock("../../../components/layout/DailyVerse", () => ({ DailyVerse: () => null }));

const navigate = vi.fn();
let search = "token=un-token-de-prueba";
vi.mock("react-router-dom", async (original) => ({
  ...(await original<typeof import("react-router-dom")>()),
  useNavigate: () => navigate,
  useSearchParams: () => [new URLSearchParams(search)],
}));

const service = vi.mocked(authService);

function linkError(codigo: string, message: string): ApiError {
  return new ApiError(message, 400, [message], {
    statusCode: 400,
    status: "BadRequest",
    data: { codigo },
    success: false,
    message,
    errors: [message],
    timestamp: "",
    meta: null,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  search = "token=un-token-de-prueba";
  service.validateResetLink.mockResolvedValue(undefined);
  service.resetPassword.mockResolvedValue(undefined);
});

describe("Inicio de sesión", () => {
  it("ya no ofrece Google ni Facebook, y sí el encabezado compacto de la marca", () => {
    renderApp(<LoginPage />);

    expect(screen.queryByRole("button", { name: /Google/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Facebook/ })).not.toBeInTheDocument();
    expect(screen.queryByText(/o continúa con/)).not.toBeInTheDocument();
    // El encabezado de celular: nombre y eslogan corto.
    expect(screen.getByText("Conectados con tu fe")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Iniciar sesión" })).toBeInTheDocument();
  });

  it("«¿Olvidaste tu contraseña?» pide el enlace y responde siempre lo mismo", async () => {
    const user = userEvent.setup();
    service.requestPasswordReset.mockResolvedValue(
      "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Vence en 15 minutos.",
    );
    renderApp(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
    await user.type(screen.getByLabelText(/Correo electrónico/), "ana@iglesia.org");
    await user.click(screen.getByRole("button", { name: "Enviar enlace" }));

    expect(service.requestPasswordReset).toHaveBeenCalledWith("ana@iglesia.org");
    expect(await screen.findByText("Revisa tu correo")).toBeInTheDocument();
    expect(screen.getByText(/Si el correo está registrado, recibirás un enlace/)).toBeInTheDocument();
  });

  it("si se pidió demasiadas veces, muestra el aviso del servidor", async () => {
    const user = userEvent.setup();
    service.requestPasswordReset.mockRejectedValue(
      new ApiError("Demasiadas solicitudes desde este dispositivo. Inténtalo de nuevo más tarde.", 429),
    );
    renderApp(<LoginPage />);

    await user.click(screen.getByRole("button", { name: "¿Olvidaste tu contraseña?" }));
    await user.type(screen.getByLabelText(/Correo electrónico/), "ana@iglesia.org");
    await user.click(screen.getByRole("button", { name: "Enviar enlace" }));

    expect(await screen.findByText(/Demasiadas solicitudes/)).toBeInTheDocument();
    expect(screen.queryByText("Revisa tu correo")).not.toBeInTheDocument();
  });
});

describe("Restablecer contraseña", () => {
  it("con un enlace válido cambia la contraseña y lleva a iniciar sesión", async () => {
    const user = userEvent.setup();
    renderApp(<ResetPasswordPage />);
    const submit = await screen.findByRole("button", { name: "Cambiar contraseña" });
    expect(service.validateResetLink).toHaveBeenCalledWith("un-token-de-prueba");

    // No coinciden: no se puede enviar.
    await user.type(screen.getByLabelText(/^Nueva contraseña/), "clave-nueva-22");
    await user.type(screen.getByLabelText(/^Confirmar contraseña/), "clave-nueva-23");
    expect(submit).toBeDisabled();

    await user.clear(screen.getByLabelText(/^Confirmar contraseña/));
    await user.type(screen.getByLabelText(/^Confirmar contraseña/), "clave-nueva-22");
    await user.click(submit);

    expect(service.resetPassword).toHaveBeenCalledWith("un-token-de-prueba", "clave-nueva-22");
    expect(await screen.findByText("Tu contraseña se cambió")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ir a iniciar sesión" })).toHaveAttribute(
      "href",
      "/login",
    );
  });

  it("una contraseña que no cumple las reglas no se puede enviar", async () => {
    const user = userEvent.setup();
    renderApp(<ResetPasswordPage />);
    const submit = await screen.findByRole("button", { name: "Cambiar contraseña" });

    await user.type(screen.getByLabelText(/^Nueva contraseña/), "corta");
    await user.type(screen.getByLabelText(/^Confirmar contraseña/), "corta");

    expect(submit).toBeDisabled();
    expect(service.resetPassword).not.toHaveBeenCalled();
  });

  it("un enlace vencido lo dice y ofrece pedir otro, sin mostrar el formulario", async () => {
    service.validateResetLink.mockRejectedValue(
      linkError("enlace_vencido", "El enlace ya venció. Solicita uno nuevo."),
    );
    renderApp(<ResetPasswordPage />);

    expect(await screen.findByText("Este enlace ya no sirve")).toBeInTheDocument();
    expect(screen.getByText("El enlace ya venció. Solicita uno nuevo.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Solicitar un enlace nuevo" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^Nueva contraseña/)).not.toBeInTheDocument();
  });

  it("si el enlace se usa mientras se escribe, lo explica al enviar", async () => {
    const user = userEvent.setup();
    service.resetPassword.mockRejectedValue(
      linkError("enlace_usado", "Este enlace ya se usó o fue reemplazado por uno más reciente. Solicita uno nuevo."),
    );
    renderApp(<ResetPasswordPage />);
    const submit = await screen.findByRole("button", { name: "Cambiar contraseña" });

    await user.type(screen.getByLabelText(/^Nueva contraseña/), "clave-nueva-22");
    await user.type(screen.getByLabelText(/^Confirmar contraseña/), "clave-nueva-22");
    await user.click(submit);

    expect(await screen.findByText("Este enlace ya no sirve")).toBeInTheDocument();
    expect(screen.getByText(/ya se usó o fue reemplazado/)).toBeInTheDocument();
  });

  it("sin token en la dirección no intenta nada y lo explica", async () => {
    search = "";
    renderApp(<ResetPasswordPage />);

    expect(await screen.findByText("Este enlace ya no sirve")).toBeInTheDocument();
    expect(service.validateResetLink).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.queryByText("Comprobando el enlace…")).not.toBeInTheDocument());
  });
});
