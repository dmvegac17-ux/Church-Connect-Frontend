/**
 * Solo hay dos roles. «Participante» no es un rol: es la situación de quien
 * está asignado a una actividad, y puede ser cualquier usuario activo.
 */
export type UserRole = "ADMIN" | "MEMBER";

export const USER_ROLES: readonly UserRole[] = ["ADMIN", "MEMBER"];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  MEMBER: "Miembro",
};

/**
 * Normaliza el rol que llega de fuera. Un token emitido antes de eliminar el
 * rol Participante todavía puede traerlo: se trata como Miembro.
 */
export function toUserRole(value: unknown): UserRole {
  return value === "ADMIN" ? "ADMIN" : "MEMBER";
}

/** `UserResponse` del backend. Nunca incluye `contrasena`. */
export interface User {
  id: string;
  nombre: string;
  apellido: string | null;
  correo: string;
  telefono: string | null;
  rol: UserRole;
  activo: boolean | null;
  fecha_creacion: string | null;
}

export interface LoginDTO {
  correo: string;
  contrasena: string;
}

export interface RegisterDTO {
  nombre: string;
  apellido: string;
  correo: string;
  contrasena: string;
  telefono?: string;
  /** Ids de las versiones vigentes de los documentos legales que acepta. */
  documentos_aceptados: string[];
}

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
}

/**
 * Alta desde el panel. No lleva aceptación de documentos: quien acepta es la
 * persona, la primera vez que inicia sesión.
 */
export interface CreateUserDTO
  extends Omit<RegisterDTO, "documentos_aceptados"> {
  rol: UserRole;
  activo?: boolean;
}

export interface UpdateUserDTO {
  nombre?: string;
  apellido?: string;
  correo?: string;
  contrasena?: string;
  /** Obligatoria al cambiar la propia contraseña (`400` si falta o no coincide). */
  contrasena_actual?: string;
  telefono?: string;
  rol?: UserRole;
  activo?: boolean;
}

/** Claims del JWT emitido por el backend. */
export interface JwtClaims {
  sub: string;
  rol: UserRole;
  exp: number;
}
