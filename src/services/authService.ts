import { httpClient } from "../lib/httpClient";
import { ApiError } from "../types/api";
import type { LoginDTO, RegisterDTO, TokenResponse, User } from "../types/user";

/** `POST /auth/register` — registro público (crea siempre un `MEMBER`). */
async function register(payload: RegisterDTO): Promise<User> {
  const { data } = await httpClient.post<User>("/auth/register", payload, {
    auth: false,
  });
  return data;
}

/** `POST /auth/login` — devuelve el access token JWT. */
async function login(payload: LoginDTO): Promise<TokenResponse> {
  const { data } = await httpClient.post<TokenResponse>(
    "/auth/login",
    payload,
    { auth: false },
  );
  return data;
}

/**
 * `POST /auth/refresh` — cambia el token vigente por uno con la expiración
 * completa. `401` si ya venció o el usuario fue desactivado.
 */
async function refresh(): Promise<TokenResponse> {
  const { data } = await httpClient.post<TokenResponse>("/auth/refresh");
  return data;
}

/**
 * `POST /auth/olvide-contrasena` — pide el enlace para restablecer la
 * contraseña. La respuesta es siempre el mismo mensaje, exista o no la
 * cuenta. `429` si se pidió demasiadas veces desde este dispositivo.
 */
async function requestPasswordReset(correo: string): Promise<string> {
  await httpClient.post<null>(
    "/auth/olvide-contrasena",
    { correo },
    { auth: false },
  );
  return RESET_REQUESTED_MESSAGE;
}

/** `GET /auth/restablecer-contrasena/validar` — `400` si el enlace ya no sirve. */
async function validateResetLink(token: string): Promise<void> {
  await httpClient.get<null>("/auth/restablecer-contrasena/validar", {
    // Cada comprobación va al servidor: un enlace puede vencer en cualquier momento.
    query: { token, _: Date.now() },
    auth: false,
  });
}

/** `POST /auth/restablecer-contrasena` — cambia la contraseña con el enlace del correo. */
async function resetPassword(token: string, contrasena: string): Promise<void> {
  await httpClient.post<null>(
    "/auth/restablecer-contrasena",
    { token, contrasena },
    { auth: false },
  );
}

/** El mismo texto para cualquier correo: no revela si la cuenta existe. */
export const RESET_REQUESTED_MESSAGE =
  "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña. Vence en 15 minutos.";

const LINK_CODES = ["enlace_invalido", "enlace_vencido", "enlace_usado"];

/**
 * Si el error dice que el enlace no sirve (venció, ya se usó o no existe),
 * devuelve el mensaje para mostrar; `null` si es otro tipo de error.
 */
export function resetLinkProblem(error: unknown): string | null {
  if (!(error instanceof ApiError) || error.status !== 400) {
    return null;
  }
  const data = error.payload?.data as { codigo?: string } | null | undefined;
  return data?.codigo && LINK_CODES.includes(data.codigo) ? error.message : null;
}

export const authService = {
  register,
  login,
  refresh,
  requestPasswordReset,
  validateResetLink,
  resetPassword,
};
