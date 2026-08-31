import { Navigate, Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./auth/ProtectedRoute";
import { useAuth } from "./auth/useAuth";
import { FullPageSpinner } from "./components/feedback/Spinner";
import { AppShell } from "./components/layout/AppShell";
import { ForbiddenPage } from "./pages/ForbiddenPage";
import { NotFoundPage } from "./pages/NotFoundPage";
import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";
import { ProfilePage } from "./pages/profile/ProfilePage";
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

        <Route path="/403" element={<ForbiddenPage />} />
      </Route>

      <Route path="/" element={<IndexRedirect />} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
