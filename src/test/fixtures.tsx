import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { MemoryRouter } from "react-router-dom";

import { AuthContext, type AuthContextValue } from "../auth/auth-context";
import { ToastProvider } from "../components/feedback/ToastProvider";
import type { Invitation, Participation } from "../types/participation";
import type { UserRole } from "../types/user";

/* Datos ficticios, solo para pruebas. */

/** Fecha `YYYY-MM-DD` a `days` días de hoy. */
export function inDays(days: number): string {
  return new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);
}

export function invitation(overrides: Partial<Invitation> = {}): Invitation {
  const fecha = inDays(10);
  return {
    id: "inv-1",
    estado_respuesta: "pendiente",
    fecha_invitacion: `${inDays(-2)}T15:00:00Z`,
    fecha_limite_respuesta: `${inDays(5)}T04:59:59Z`,
    fecha_respuesta: null,
    fecha_revocacion: null,
    motivo_rechazo: null,
    evento: { id: "ev-1", nombre: "Evento de prueba" },
    actividad: {
      id: "act-1",
      nombre: "Actividad de prueba",
      fecha,
      hora_inicio: `${fecha}T15:00:00Z`,
      hora_fin: `${fecha}T15:30:00Z`,
      lugar: "Salón de prueba",
      descripcion: "Descripción de prueba",
    },
    responsable: { nombre: "Persona Responsable", area: "Área de prueba" },
    ...overrides,
  };
}

export function participation(overrides: Partial<Participation> = {}): Participation {
  const fecha = inDays(10);
  return {
    id: "par-1",
    actividad: {
      id: "act-1",
      nombre: "Actividad de prueba",
      fecha,
      hora_inicio: `${fecha}T15:00:00Z`,
      hora_fin: `${fecha}T15:30:00Z`,
    },
    evento: { id: "ev-1", nombre: "Evento de prueba" },
    participante: { id: "u-1", nombre_completo: "Persona Uno" },
    estado_envio: "enviada",
    fecha_envio: `${inDays(-1)}T15:00:00Z`,
    intentos_envio: 1,
    ultimo_error_envio: null,
    estado_respuesta: "pendiente",
    estado_previo: null,
    fecha_respuesta: null,
    fecha_limite_respuesta: `${inDays(5)}T04:59:59Z`,
    motivo_rechazo: null,
    notificacion_revocacion_estado: null,
    requiere_reasignacion: false,
    acciones_permitidas: ["cancelar"],
    reemplazo: null,
    ...overrides,
  };
}

function authValue(role: UserRole): AuthContextValue {
  return {
    user: {
      id: "me",
      nombre: "Usuario",
      apellido: "Prueba",
      correo: "usuario@example.test",
      telefono: null,
      rol: role,
      activo: true,
      fecha_creacion: null,
    },
    token: "token-de-prueba",
    role,
    isAuthenticated: true,
    isLoading: false,
    login: async () => role,
    register: async () => {
      throw new Error("no usado en pruebas");
    },
    logout: () => {},
    refreshProfile: async () => {},
  };
}

export function renderApp(ui: ReactElement, role: UserRole = "PARTICIPANT") {
  return render(
    <MemoryRouter>
      <AuthContext.Provider value={authValue(role)}>
        <ToastProvider>{ui}</ToastProvider>
      </AuthContext.Provider>
    </MemoryRouter>,
  );
}
