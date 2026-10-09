import type { ReactNode } from "react";
import { Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./auth/ProtectedRoute";
import { useAuth } from "./auth/useAuth";
import { AdminShell } from "./components/layout/AdminShell";
import { AppShell } from "./components/layout/AppShell";
import { ForbiddenPage } from "./pages/ForbiddenPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { AdminHomePage } from "./pages/admin/AdminHomePage";
import { AdminEventDetailPage } from "./pages/admin/events/AdminEventDetailPage";
import { AdminEventsPage } from "./pages/admin/events/AdminEventsPage";
import { AdminMinistriesPage } from "./pages/admin/ministries/AdminMinistriesPage";
import { AdminMinistryDetailPage } from "./pages/admin/ministries/AdminMinistryDetailPage";
import { AdminNotificationsPage } from "./pages/admin/notifications/AdminNotificationsPage";
import { AdminSchedulesPage } from "./pages/admin/schedules/AdminSchedulesPage";
import { AdminUsersPage } from "./pages/admin/users/AdminUsersPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { EventCreatePage } from "./pages/events/EventCreatePage";
import { EventDetailPage } from "./pages/events/EventDetailPage";
import { EventEditPage } from "./pages/events/EventEditPage";
import { EventsListPage } from "./pages/events/EventsListPage";
import { HomePage } from "./pages/home/HomePage";
import { MinistriesListPage } from "./pages/ministries/MinistriesListPage";
import { MinistryDetailPage } from "./pages/ministries/MinistryDetailPage";
import { NotificationDetailPage } from "./pages/notifications/NotificationDetailPage";
import { NotificationsListPage } from "./pages/notifications/NotificationsListPage";
import { ProfilePage } from "./pages/profile/ProfilePage";
import { SchedulesListPage } from "./pages/schedules/SchedulesListPage";
import { UserDetailPage } from "./pages/users/UserDetailPage";

/**
 * Cada perfil tiene su propio layout: el panel de administración (barra
 * lateral) para ADMIN y la vista de miembro (barra superior) para el resto.
 */
function RoleShell() {
  const { role } = useAuth();
  return role === "ADMIN" ? <AdminShell /> : <AppShell />;
}

/**
 * Misma ruta, pantalla distinta según el perfil. Es solo presentación: la
 * autorización real la aplica el backend y `ProtectedRoute` en las rutas
 * exclusivas de ADMIN.
 */
function ByRole({ admin, member }: { admin: ReactNode; member: ReactNode }) {
  const { role } = useAuth();
  return <>{role === "ADMIN" ? admin : member}</>;
}

function AdminOnly({ children }: { children: ReactNode }) {
  return <ProtectedRoute requiredRole="ADMIN">{children}</ProtectedRoute>;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Privadas (con el layout del perfil) */}
      <Route
        element={
          <ProtectedRoute>
            <RoleShell />
          </ProtectedRoute>
        }
      >
        {/* Inicio: el que corresponda al rol. */}
        <Route
          path="/"
          element={<ByRole admin={<AdminHomePage />} member={<HomePage />} />}
        />

        <Route path="/profile" element={<ProfilePage />} />

        {/* Usuarios: solo ADMIN. Crear y editar abren el panel lateral sobre
            el listado, conservando sus rutas. */}
        <Route
          path="/users"
          element={
            <AdminOnly>
              <AdminUsersPage />
            </AdminOnly>
          }
        />
        <Route
          path="/users/new"
          element={
            <AdminOnly>
              <AdminUsersPage mode="create" />
            </AdminOnly>
          }
        />
        <Route
          path="/users/:id"
          element={
            <AdminOnly>
              <UserDetailPage />
            </AdminOnly>
          }
        />
        <Route
          path="/users/:id/edit"
          element={
            <AdminOnly>
              <AdminUsersPage mode="edit" />
            </AdminOnly>
          }
        />

        {/* Eventos: lectura para cualquier sesión; escritura solo ADMIN.
            La ruta literal "nuevo" va antes de ":id". */}
        <Route
          path="/events"
          element={
            <ByRole admin={<AdminEventsPage />} member={<EventsListPage />} />
          }
        />
        <Route
          path="/events/nuevo"
          element={
            <AdminOnly>
              <EventCreatePage />
            </AdminOnly>
          }
        />
        <Route
          path="/events/:id"
          element={
            <ByRole
              admin={<AdminEventDetailPage />}
              member={<EventDetailPage />}
            />
          }
        />
        <Route
          path="/events/:id/editar"
          element={
            <AdminOnly>
              <EventEditPage />
            </AdminOnly>
          }
        />

        {/* Ministerios: lectura para cualquier sesión; escritura solo ADMIN.
            La ruta literal "nuevo" va antes de ":id". */}
        <Route
          path="/ministries"
          element={
            <ByRole
              admin={<AdminMinistriesPage />}
              member={<MinistriesListPage />}
            />
          }
        />
        <Route
          path="/ministries/nuevo"
          element={
            <AdminOnly>
              <AdminMinistriesPage mode="create" />
            </AdminOnly>
          }
        />
        <Route
          path="/ministries/:id"
          element={
            <ByRole
              admin={<AdminMinistryDetailPage />}
              member={<MinistryDetailPage />}
            />
          }
        />
        <Route
          path="/ministries/:id/editar"
          element={
            <AdminOnly>
              <AdminMinistryDetailPage mode="edit" />
            </AdminOnly>
          }
        />

        {/* Cronogramas: lectura para cualquier sesión; escritura solo ADMIN.
            Crear y editar abren el modal de cronograma sobre el listado. */}
        <Route
          path="/schedules"
          element={
            <ByRole
              admin={<AdminSchedulesPage />}
              member={<SchedulesListPage />}
            />
          }
        />
        <Route
          path="/schedules/nuevo"
          element={
            <AdminOnly>
              <AdminSchedulesPage mode="create" />
            </AdminOnly>
          }
        />
        <Route
          path="/schedules/:id/editar"
          element={
            <AdminOnly>
              <AdminSchedulesPage mode="edit" />
            </AdminOnly>
          }
        />

        {/* Notificaciones: cada sesión ve su propia bandeja; envío, edición
            y eliminación solo ADMIN. */}
        <Route
          path="/notifications"
          element={
            <ByRole
              admin={<AdminNotificationsPage />}
              member={<NotificationsListPage />}
            />
          }
        />
        <Route
          path="/notifications/:id"
          element={
            <ByRole
              admin={<AdminNotificationsPage />}
              member={<NotificationDetailPage />}
            />
          }
        />
        <Route
          path="/notifications/:id/editar"
          element={
            <AdminOnly>
              <AdminNotificationsPage mode="edit" />
            </AdminOnly>
          }
        />

        <Route path="/403" element={<ForbiddenPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
