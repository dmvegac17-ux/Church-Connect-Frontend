import { createContext } from "react";

import type { LoginDTO, RegisterDTO, User, UserRole } from "../types/user";

export interface AuthContextValue {
  /** Perfil completo del usuario autenticado (hidratado desde `GET /users/{id}`). */
  user: User | null;
  /** Access token JWT vigente, o `null` si no hay sesión. */
  token: string | null;
  /** Rol tomado del JWT (disponible aunque el perfil aún no haya cargado). */
  role: UserRole | null;
  /** `true` si hay un token válido y no expirado. */
  isAuthenticated: boolean;
  /** `true` mientras se rehidrata la sesión al arrancar la app. */
  isLoading: boolean;
  /**
   * Inicia sesión y devuelve el rol para decidir la redirección.
   * `remember` (default `true`) persiste el token en `localStorage`;
   * si es `false` la sesión vive solo en `sessionStorage` (esta pestaña).
   */
  login: (payload: LoginDTO, remember?: boolean) => Promise<UserRole>;
  /** Registro público (rol `MEMBER`). Devuelve el usuario creado. */
  register: (payload: RegisterDTO) => Promise<User>;
  /** Cierra sesión y limpia el almacenamiento local. */
  logout: () => void;
  /** Vuelve a pedir `GET /users/{id}` para refrescar el perfil en contexto. */
  refreshProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);
