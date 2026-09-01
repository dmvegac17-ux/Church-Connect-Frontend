import { API_URL } from "../config/env";
import { ApiError, type ListMeta, type ResponsePayload } from "../types/api";

/**
 * Capa HTTP única de la aplicación. Todos los `services/*` pasan por aquí.
 *
 * Responsabilidades:
 *  - Anteponer la URL base (`http://localhost:8000/api/v1`).
 *  - Adjuntar el header `Authorization: Bearer <token>` cuando hay sesión.
 *  - Desempacar `data` del `ResponsePayload`.
 *  - Ante `success: false` o HTTP != 2xx, lanzar un `ApiError` tipado
 *    con `message` + `errors` para mostrarlo en la UI.
 *  - Notificar a la capa de sesión cuando el backend responde `401`.
 */

type TokenProvider = () => string | null;
type UnauthorizedHandler = () => void;

let getToken: TokenProvider = () => null;
let onUnauthorized: UnauthorizedHandler = () => {};

/** Registra el proveedor del token (lo llama `AuthProvider` al montar). */
export function setTokenProvider(provider: TokenProvider): void {
  getToken = provider;
}

/** Registra el callback que se dispara ante un `401` (cierre de sesión). */
export function setUnauthorizedHandler(handler: UnauthorizedHandler): void {
  onUnauthorized = handler;
}

export interface RequestOptions {
  /** Parámetros de query. Los `undefined`/`null` se omiten. */
  query?: Record<string, string | number | boolean | undefined | null>;
  /** Cuerpo JSON. Se serializa automáticamente. */
  body?: unknown;
  /** `false` para no enviar el header Authorization (endpoints públicos). */
  auth?: boolean;
  signal?: AbortSignal;
}

/** Resultado de una petición: los datos ya desempacados más el `meta` crudo. */
export interface ApiResult<T> {
  data: T;
  meta: Record<string, unknown> | null;
}

function buildUrl(
  path: string,
  query?: RequestOptions["query"],
): string {
  const url = new URL(`${API_URL}${path}`);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

async function request<T>(
  method: string,
  path: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const { query, body, auth = true, signal } = options;

  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (auth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path, query), {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === "AbortError") {
      throw cause;
    }
    throw new ApiError(
      "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
      0,
    );
  }

  // 204 sin cuerpo.
  const text = await response.text();
  let payload: ResponsePayload<T> | null = null;

  if (text) {
    try {
      payload = JSON.parse(text) as ResponsePayload<T>;
    } catch {
      payload = null;
    }
  }

  if (response.status === 401) {
    onUnauthorized();
  }

  const success = payload?.success ?? response.ok;

  if (!success) {
    const message =
      payload?.message ??
      (response.status === 401
        ? "Tu sesión expiró. Inicia sesión de nuevo."
        : "Ocurrió un error al procesar la solicitud.");
    throw new ApiError(
      message,
      response.status,
      payload?.errors ?? [],
      payload,
    );
  }

  return {
    data: (payload ? payload.data : null) as T,
    meta: payload?.meta ?? null,
  };
}

export const httpClient = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>("GET", path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("POST", path, { ...options, body }),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PUT", path, { ...options, body }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>("PATCH", path, { ...options, body }),
  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>("DELETE", path, options),
};

/** Helper para leer `meta.totalUsers` de forma segura. */
export function readListMeta(meta: Record<string, unknown> | null): ListMeta {
  return { totalUsers: readMetaTotal(meta, "totalUsers") };
}

/**
 * Lee un contador total del `meta` del envelope de forma segura.
 * Ej.: `readMetaTotal(meta, "totalMinistries")`, `readMetaTotal(meta, "totalMembers")`.
 * Si la clave no existe o no es numérica, devuelve `0`.
 */
export function readMetaTotal(
  meta: Record<string, unknown> | null,
  key: string,
): number {
  const total = meta?.[key];
  return typeof total === "number" ? total : 0;
}
