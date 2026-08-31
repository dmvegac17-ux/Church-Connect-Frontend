import { httpClient } from "../lib/httpClient";
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

export const authService = { register, login };
