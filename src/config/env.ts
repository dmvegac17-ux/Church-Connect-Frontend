/**
 * Configuración central de la aplicación.
 * Las variables sensibles llegan por `import.meta.env` (archivo `.env`),
 * nunca hardcodeadas en el código de negocio.
 */

const rawApiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

/** URL base del backend, sin barra final. */
export const API_BASE_URL = rawApiUrl.replace(/\/+$/, "");

/** Prefijo global de la API REST. */
export const API_PREFIX = "/api/v1";

/** URL completa hasta el prefijo: `http://localhost:8000/api/v1`. */
export const API_URL = `${API_BASE_URL}${API_PREFIX}`;

/** Clave de `localStorage` donde se persiste el access token. */
export const TOKEN_STORAGE_KEY = "cc_token";

/** Paginación por defecto para el listado de usuarios (contrato: 1–100). */
export const DEFAULT_PAGE_SIZE = 10;
