/** Envoltura estándar de todas las respuestas del backend (éxito y error). */
export interface ResponsePayload<T> {
  statusCode: number;
  status: string | null;
  data: T | null;
  success: boolean;
  message: string | null;
  errors: string[] | null;
  timestamp: string;
  meta: Record<string, unknown> | null;
}

/** Metadatos de paginación que devuelve el listado de usuarios. */
export interface ListMeta {
  totalUsers: number;
}

/**
 * Error tipado que lanza el `httpClient` cuando `success === false`
 * (o cuando la respuesta HTTP no es 2xx). Transporta el `message` y la
 * lista `errors` del envelope para renderizarlos en la UI.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly errors: string[];
  readonly payload: ResponsePayload<unknown> | null;

  constructor(
    message: string,
    status: number,
    errors: string[] = [],
    payload: ResponsePayload<unknown> | null = null,
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.errors = errors;
    this.payload = payload;
  }

  /** `true` si el backend rechazó por autenticación (sesión inválida/expirada). */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** `true` si el backend rechazó por permisos insuficientes. */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  /** `true` si el backend rechazó por validación de datos. */
  get isValidation(): boolean {
    return this.status === 422;
  }
}
