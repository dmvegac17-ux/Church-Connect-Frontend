import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { TOKEN_STORAGE_KEY } from "../config/env";
import {
  setTokenProvider,
  setUnauthorizedHandler,
} from "../lib/httpClient";
import { authService } from "../services/authService";
import { userService } from "../services/userService";
import { ApiError } from "../types/api";
import type {
  JwtClaims,
  LoginDTO,
  RegisterDTO,
  User,
} from "../types/user";
import { AuthContext, type AuthContextValue } from "./auth-context";
import { readValidClaims } from "./jwt";

function readStoredToken(): string | null {
  try {
    return (
      localStorage.getItem(TOKEN_STORAGE_KEY) ??
      sessionStorage.getItem(TOKEN_STORAGE_KEY)
    );
  } catch {
    return null;
  }
}

/**
 * Persiste (o limpia) el token. `remember`:
 *  - `true`  → `localStorage` (sobrevive al cierre del navegador)
 *  - `false` → `sessionStorage` (solo esta pestaña)
 *  - `null`  → limpia ambos almacenes
 */
function writeStoredToken(token: string | null, remember: boolean = true): void {
  try {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    sessionStorage.removeItem(TOKEN_STORAGE_KEY);
    if (token) {
      const store = remember ? localStorage : sessionStorage;
      store.setItem(TOKEN_STORAGE_KEY, token);
    }
  } catch {
    /* almacenamiento no disponible: la sesión vivirá solo en memoria */
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [claims, setClaims] = useState<JwtClaims | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // El httpClient lee el token vía este ref para no quedar con closures viejos.
  const tokenRef = useRef<string | null>(null);
  tokenRef.current = token;

  const clearSession = useCallback(() => {
    writeStoredToken(null);
    setToken(null);
    setClaims(null);
    setUser(null);
  }, []);

  // Registra los puentes con la capa HTTP una sola vez.
  useEffect(() => {
    setTokenProvider(() => tokenRef.current);
    setUnauthorizedHandler(() => {
      // Cualquier 401 del backend cierra la sesión.
      clearSession();
    });
  }, [clearSession]);

  const hydrateProfile = useCallback(async (userId: string) => {
    try {
      const profile = await userService.getById(userId);
      setUser(profile);
    } catch (error) {
      // El perfil es "opcional" para la sesión: si falla (p. ej. 403 por
      // reglas de rol) mantenemos la sesión con los datos del JWT.
      if (error instanceof ApiError && error.isUnauthorized) {
        throw error;
      }
      setUser(null);
    }
  }, []);

  // Rehidratación al montar la app.
  useEffect(() => {
    const stored = readStoredToken();
    const validClaims = stored ? readValidClaims(stored) : null;

    if (!stored || !validClaims) {
      if (stored) {
        writeStoredToken(null);
      }
      setIsLoading(false);
      return;
    }

    setToken(stored);
    setClaims(validClaims);
    tokenRef.current = stored;

    void hydrateProfile(validClaims.sub)
      .catch(() => clearSession())
      .finally(() => setIsLoading(false));
  }, [hydrateProfile, clearSession]);

  // Cierre automático al llegar la expiración del token durante la sesión.
  useEffect(() => {
    if (!claims) {
      return;
    }
    const msLeft = claims.exp * 1000 - Date.now();
    if (msLeft <= 0) {
      clearSession();
      return;
    }
    const timer = window.setTimeout(clearSession, msLeft);
    return () => window.clearTimeout(timer);
  }, [claims, clearSession]);

  const login = useCallback<AuthContextValue["login"]>(
    async (payload: LoginDTO, remember: boolean = true) => {
      const { access_token } = await authService.login(payload);
      const nextClaims = readValidClaims(access_token);

      if (!nextClaims) {
        throw new ApiError(
          "El servidor devolvió un token inválido o expirado.",
          500,
        );
      }

      writeStoredToken(access_token, remember);
      tokenRef.current = access_token;
      setToken(access_token);
      setClaims(nextClaims);
      await hydrateProfile(nextClaims.sub);

      return nextClaims.rol;
    },
    [hydrateProfile],
  );

  const register = useCallback<AuthContextValue["register"]>(
    (payload: RegisterDTO) => authService.register(payload),
    [],
  );

  const refreshProfile = useCallback(async () => {
    if (claims) {
      await hydrateProfile(claims.sub);
    }
  }, [claims, hydrateProfile]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      // El perfil manda sobre el JWT: el backend autoriza con el rol actual
      // del usuario, que pudo cambiar después de emitirse el token (p. ej.
      // un miembro que pasa a participante al recibir una invitación).
      role: claims ? (user?.rol ?? claims.rol) : null,
      isAuthenticated: token !== null && claims !== null,
      isLoading,
      login,
      register,
      logout: clearSession,
      refreshProfile,
    }),
    [user, token, claims, isLoading, login, register, clearSession, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
