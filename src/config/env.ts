/**
 * Configuración central de la aplicación.
 * Las variables sensibles llegan por `import.meta.env` (archivo `.env`),
 * nunca hardcodeadas en el código de negocio.
 */

const rawApiUrl = import.meta.env.VITE_BACKEND_BASE_URL?.trim();

// Sin valor de respaldo: una URL fija haría que un build mal configurado
// apunte en silencio a un backend equivocado. Vite incrusta la variable en
// tiempo de build, así que tras definirla hay que reiniciar `npm run dev` o
// volver a desplegar.
if (!rawApiUrl) {
  const message =
    "[config] Falta la variable de entorno VITE_BACKEND_BASE_URL (URL base " +
    "del backend, sin /api/v1). Defínela en el archivo .env o en las " +
    "variables de entorno del hosting y vuelve a construir la aplicación.";
  console.error(message);
  throw new Error(message);
}

/** URL base del backend, sin barra final. */
export const API_BASE_URL = rawApiUrl.replace(/\/+$/, "");

/** Prefijo global de la API REST. */
export const API_PREFIX = "/api/v1";

/** URL completa hasta el prefijo: `<VITE_BACKEND_BASE_URL>/api/v1`. */
export const API_URL = `${API_BASE_URL}${API_PREFIX}`;

/** Clave de `localStorage` donde se persiste el access token. */
export const TOKEN_STORAGE_KEY = "cc_token";

/** Paginación por defecto para el listado de usuarios (contrato: 1–100). */
export const DEFAULT_PAGE_SIZE = 10;
