export type UserRole = "ADMIN" | "PARTICIPANT" | "MEMBER";

export const USER_ROLES: readonly UserRole[] = [
  "ADMIN",
  "PARTICIPANT",
  "MEMBER",
];

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrador",
  PARTICIPANT: "Participante",
  MEMBER: "Miembro",
};

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
}

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
}

export interface CreateUserDTO extends RegisterDTO {
  rol: UserRole;
  activo?: boolean;
}

export interface UpdateUserDTO {
  nombre?: string;
  apellido?: string;
  correo?: string;
  contrasena?: string;
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
