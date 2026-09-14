import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./auth/ProtectedRoute";
import { useAuth } from "./auth/useAuth";
import { FullPageSpinner } from "./components/feedback/Spinner";
import { AppShell } from "./components/layout/AppShell";
import { ForbiddenPage } from "./pages/ForbiddenPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { EventCreatePage } from "./pages/events/EventCreatePage";
import { EventDetailPage } from "./pages/events/EventDetailPage";
import { EventEditPage } from "./pages/events/EventEditPage";
import { EventsListPage } from "./pages/events/EventsListPage";
import { MinistriesListPage } from "./pages/ministries/MinistriesListPage";
import { MinistryCreatePage } from "./pages/ministries/MinistryCreatePage";
import { MinistryDetailPage } from "./pages/ministries/MinistryDetailPage";
import { MinistryEditPage } from "./pages/ministries/MinistryEditPage";
import { ProfilePage } from "./pages/profile/ProfilePage";
import { ScheduleCreatePage } from "./pages/schedules/ScheduleCreatePage";
import { ScheduleEditPage } from "./pages/schedules/ScheduleEditPage";
import { SchedulesListPage } from "./pages/schedules/SchedulesListPage";
import { UserCreatePage } from "./pages/users/UserCreatePage";
import { UserDetailPage } from "./pages/users/UserDetailPage";
import { UserEditPage } from "./pages/users/UserEditPage";
import { UsersListPage } from "./pages/users/UsersListPage";

function IndexRedirect() {
  const { isAuthenticated, isLoading, role } = useAuth();
  if (isLoading) {
    return <FullPageSpinner />;
  }
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={role === "ADMIN" ? "/users" : "/profile"} replace />;
}

export function AppRoutes() {
  return (
    <Routes>
      {/* Públicas */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Privadas (con layout) */}
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/profile" element={<ProfilePage />} />

        <Route
          path="/users"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <UsersListPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/new"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <UserCreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/:id"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <UserDetailPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/users/:id/edit"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <UserEditPage />
            </ProtectedRoute>
          }
        />

        {/* Eventos: lectura para cualquier sesión; escritura solo ADMIN.
            La ruta literal "nuevo" va antes de ":id". */}
        <Route path="/events" element={<EventsListPage />} />
        <Route
          path="/events/nuevo"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <EventCreatePage />
            </ProtectedRoute>
          }
        />
        <Route path="/events/:id" element={<EventDetailPage />} />
        <Route
          path="/events/:id/editar"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <EventEditPage />
            </ProtectedRoute>
          }
        />

        {/* Ministerios: lectura para cualquier sesión; escritura solo ADMIN.
            La ruta literal "nuevo" va antes de ":id". */}
        <Route path="/ministries" element={<MinistriesListPage />} />
        <Route
          path="/ministries/nuevo"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <MinistryCreatePage />
            </ProtectedRoute>
          }
        />
        <Route path="/ministries/:id" element={<MinistryDetailPage />} />
        <Route
          path="/ministries/:id/editar"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <MinistryEditPage />
            </ProtectedRoute>
          }
        />

        {/* Cronogramas: lectura para cualquier sesión; escritura solo ADMIN.
            La ruta literal "nuevo" va antes de ":id". */}
        <Route path="/schedules" element={<SchedulesListPage />} />
        <Route
          path="/schedules/nuevo"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <ScheduleCreatePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/schedules/:id/editar"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <ScheduleEditPage />
            </ProtectedRoute>
          }
        />

        <Route path="/403" element={<ForbiddenPage />} />
      </Route>

      <Route path="/" element={<IndexRedirect />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
