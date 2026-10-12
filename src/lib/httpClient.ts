import { API_URL } from "../config/env";
import { ApiError, type ListMeta, type ResponsePayload } from "../types/api";

/**
 * Capa HTTP única de la aplicación. Todos los `services/*` pasan por aquí.
 *
 * Responsabilidades:
 *  - Anteponer la URL base (`<VITE_BACKEND_BASE_URL>/api/v1`).
 *  - Adjuntar el header `Authorization: Bearer <token>` cuando hay sesión.
 *  - Desempacar `data` del `ResponsePayload`.
 *  - Ante `success: false` o HTTP != 2xx, lanzar un `ApiError` tipado
 *    con `message` + `errors` para mostrarlo en la UI.
 *  - Notificar a la capa de sesión cuando el backend responde `401`.
 *  - Reutilizar las lecturas recientes (ver «Caché de lecturas» más abajo).
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

/* ── Caché de lecturas ───────────────────────────────────────────────────
 *
 * Varias pantallas piden lo mismo (eventos, usuarios, notificaciones…) y la
 * barra de navegación repite consultas que la página también hace. Para no
 * ir al backend cada vez:
 *
 *  - Un `GET` idéntico que ya está en curso se comparte: una sola petición.
 *  - Su respuesta se reutiliza durante `CACHE_TTL_MS`.
 *  - Cualquier escritura (`POST`, `PUT`, `PATCH`, `DELETE`) vacía la caché,
 *    así que después de guardar algo siempre se lee del servidor.
 *
 * La clave incluye el token: lo que ve un usuario nunca se sirve a otro.
 * Los errores no se guardan.
 */

/** Menor que el sondeo más frecuente (30 s): cada sondeo llega al servidor. */
export const CACHE_TTL_MS = 25_000;
/** Tope de entradas: al superarlo se descartan las más antiguas. */
const CACHE_MAX_ENTRIES = 200;

interface CacheEntry {
  promise: Promise<ApiResult<unknown>>;
  /** Momento en que llegó la respuesta; `null` mientras está en curso. */
  settledAt: number | null;
}

const cache = new Map<string, CacheEntry>();

/** Vacía la caché de lecturas (también al cerrar o cambiar de sesión). */
export function clearHttpCache(): void {
  cache.clear();
}

function abortError(): DOMException {
  return new DOMException("La petición fue cancelada.", "AbortError");
}

/**
 * Entrega el resultado compartido respetando la cancelación de quien lo
 * pidió: abortar deja de esperar, pero no corta la petición que otros
 * componentes (o el siguiente montaje) todavía pueden aprovechar.
 */
function withSignal<T>(promise: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) {
    return promise;
  }
  if (signal.aborted) {
    return Promise.reject(abortError());
  }
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(abortError());
    signal.addEventListener("abort", onAbort, { once: true });
    promise.then(resolve, reject).finally(() => {
      signal.removeEventListener("abort", onAbort);
    });
  });
}

function cachedGet<T>(
  path: string,
  options: RequestOptions = {},
): Promise<ApiResult<T>> {
  const { signal, ...shared } = options;
  const auth = shared.auth ?? true;
  const key = `${auth ? (getToken() ?? "") : ""}|${buildUrl(path, shared.query)}`;
  const now = Date.now();

  const hit = cache.get(key);
  if (hit && (hit.settledAt === null || now - hit.settledAt < CACHE_TTL_MS)) {
    return withSignal(hit.promise as Promise<ApiResult<T>>, signal);
  }

  const entry: CacheEntry = {
    // Sin `signal`: la petición compartida no depende de un solo componente.
    promise: request<T>("GET", path, shared),
    settledAt: null,
  };
  // Reinsertar la clave la deja como la más reciente.
  cache.delete(key);
  cache.set(key, entry);
  if (cache.size > CACHE_MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) {
      cache.delete(oldest);
    }
  }

  entry.promise.then(
    () => {
      entry.settledAt = Date.now();
    },
    () => {
      // Un error no se reutiliza: el siguiente intento va al servidor.
      if (cache.get(key) === entry) {
        cache.delete(key);
      }
    },
  );

  return withSignal(entry.promise as Promise<ApiResult<T>>, signal);
}

/**
 * Toda escritura invalida las lecturas guardadas, antes y después: lo que
 * se lea a partir de aquí refleja el cambio, haya terminado bien o con un
 * error que también cambió el estado en el servidor.
 */
async function mutate<R>(run: () => Promise<R>): Promise<R> {
  clearHttpCache();
  try {
    return await run();
  } finally {
    clearHttpCache();
  }
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

  // Documentos legales por aceptar: el backend niega todo lo demás. Se avisa
  // para que la aplicación muestre el paso de aceptación.
  if (
    response.status === 403 &&
    (payload?.data as { codigo?: string } | null | undefined)?.codigo ===
      "aceptacion_pendiente"
  ) {
    window.dispatchEvent(new Event("legal:acceptance-pending"));
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

/** Statuses donde el envío masivo trae un `ResponsePayload` de dominio válido, no un error de transporte. */
const RAW_STATUSES = new Set([201, 207, 500]);

/** Resultado crudo de `postRaw`: el status HTTP real junto al envelope ya desempacado. */
export interface RawResult<T> {
  status: number;
  data: T | null;
  errors: string[] | null;
  meta: Record<string, unknown> | null;
}

/**
 * `POST` especial para endpoints cuya respuesta de negocio puede llegar en
 * `201`, `207` o `500` con un `ResponsePayload` igualmente válido en los
 * tres casos (ej. envío masivo de notificaciones, donde `500` significa
 * "cero éxitos" y no un error real de servidor). No lanza `ApiError` para
 * esos tres statuses si el cuerpo es parseable; para cualquier otro status
 * (400/401/403/422) o un `500` sin envelope, sigue lanzando `ApiError` como
 * el resto del cliente.
 */
async function postRaw<T>(
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<RawResult<T>> {
  const { query, auth = true, signal } = options;

  const headers: Record<string, string> = {
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  if (auth) {
    const token = getToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  let response: Response;

  try {
    response = await fetch(buildUrl(path, query), {
      method: "POST",
      headers,
      body: JSON.stringify(body),
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

  if (RAW_STATUSES.has(response.status) && payload) {
    return {
      status: response.status,
      data: payload.data,
      errors: payload.errors,
      meta: payload.meta,
    };
  }

  const message =
    payload?.message ??
    (response.status === 401
      ? "Tu sesión expiró. Inicia sesión de nuevo."
      : "Ocurrió un error al procesar la solicitud.");
  throw new ApiError(message, response.status, payload?.errors ?? [], payload);
}

export const httpClient = {
  get: <T>(path: string, options?: RequestOptions) => cachedGet<T>(path, options),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    mutate(() => request<T>("POST", path, { ...options, body })),
  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    mutate(() => request<T>("PUT", path, { ...options, body })),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    mutate(() => request<T>("PATCH", path, { ...options, body })),
  delete: <T>(path: string, options?: RequestOptions) =>
    mutate(() => request<T>("DELETE", path, options)),
  postRaw: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    mutate(() => postRaw<T>(path, body, options)),
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
