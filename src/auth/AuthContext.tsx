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
  clearHttpCache,
  setTokenProvider,
  setUnauthorizedHandler,
} from "../lib/httpClient";
import { authService } from "../services/authService";
import { userService } from "../services/userService";
import { ApiError } from "../types/api";
import {
  toUserRole,
  type JwtClaims,
  type LoginDTO,
  type RegisterDTO,
  type User,
} from "../types/user";
import { AuthContext, type AuthContextValue } from "./auth-context";
import { IdleWarningDialog } from "./IdleWarningDialog";
import { readValidClaims } from "./jwt";
import {
  markActivity,
  REFRESH_MARGIN_MS,
  rememberIdleLogout,
  resetActivity,
  useIdleSession,
} from "./useIdleSession";

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

/** `true` si la sesión se guardó para sobrevivir al cierre del navegador. */
function isRemembered(): boolean {
  try {
    return localStorage.getItem(TOKEN_STORAGE_KEY) !== null;
  } catch {
    return false;
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
  // Una sesión de solo esta pestaña no sigue los cierres de las demás.
  const isRememberedSession = useRef(false);
  isRememberedSession.current = token !== null && isRemembered();

  const clearSession = useCallback(() => {
    // Lo leído en esta sesión no debe quedar en memoria para la siguiente.
    clearHttpCache();
    resetActivity();
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

      // Iniciar sesión es usar la plataforma: el conteo de inactividad
      // empieza aquí, no en lo que hubiera quedado de una sesión anterior.
      resetActivity();
      markActivity();
      writeStoredToken(access_token, remember);
      tokenRef.current = access_token;
      setToken(access_token);
      setClaims(nextClaims);
      await hydrateProfile(nextClaims.sub);

      return nextClaims.rol;
    },
    [hydrateProfile],
  );

  /* ── Sesión por uso ─────────────────────────────────────────────────── */

  // Adopta un token nuevo sin tocar el perfil ya cargado.
  const adoptToken = useCallback((nextToken: string): boolean => {
    const nextClaims = readValidClaims(nextToken);
    if (!nextClaims) {
      return false;
    }
    tokenRef.current = nextToken;
    setToken(nextToken);
    setClaims(nextClaims);
    return true;
  }, []);

  // Mientras la persona usa la plataforma, el token se renueva antes de
  // vencer. Si la renovación falla por red se reintenta en la siguiente
  // revisión; un `401` cierra la sesión por el manejador de la capa HTTP.
  const refreshing = useRef(false);
  const refreshSession = useCallback(async () => {
    if (refreshing.current) {
      return;
    }
    // Se decide con el token en uso ahora mismo, no con el del último
    // render: si otra revisión ya lo renovó, no hace falta pedir otro.
    const current = tokenRef.current ? readValidClaims(tokenRef.current) : null;
    if (!current || current.exp * 1000 - Date.now() > REFRESH_MARGIN_MS) {
      return;
    }
    refreshing.current = true;
    try {
      const { access_token } = await authService.refresh();
      // Solo si la sesión sigue abierta: pudo cerrarse mientras se renovaba.
      if (tokenRef.current !== null && adoptToken(access_token)) {
        writeStoredToken(access_token, isRemembered());
      }
    } catch {
      // Sin conexión o sesión ya inválida: no hay nada que adoptar.
    } finally {
      refreshing.current = false;
    }
  }, [adoptToken]);

  const closeForInactivity = useCallback(() => {
    rememberIdleLogout();
    clearSession();
  }, [clearSession]);

  const idle = useIdleSession({
    active: claims !== null,
    expiresAt: claims ? claims.exp * 1000 : null,
    onIdle: closeForInactivity,
    onRefresh: () => void refreshSession(),
  });

  // Otra pestaña renovó el token o cerró la sesión: esta la sigue, para no
  // quedarse con un token que vence ni abierta después de un cierre.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== TOKEN_STORAGE_KEY || e.storageArea !== localStorage) {
        return;
      }
      if (e.newValue === null) {
        if (tokenRef.current !== null && isRememberedSession.current) {
          clearSession();
        }
      } else if (tokenRef.current !== null && e.newValue !== tokenRef.current) {
        adoptToken(e.newValue);
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [adoptToken, clearSession]);

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
      // del usuario, que pudo cambiar después de emitirse el token.
      role: claims ? toUserRole(user?.rol ?? claims.rol) : null,
      isAuthenticated: token !== null && claims !== null,
      isLoading,
      login,
      register,
      logout: clearSession,
      refreshProfile,
    }),
    [user, token, claims, isLoading, login, register, clearSession, refreshProfile],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <IdleWarningDialog
        secondsLeft={idle.warningSecondsLeft}
        onStay={idle.staySignedIn}
        onLogout={clearSession}
      />
    </AuthContext.Provider>
  );
}
