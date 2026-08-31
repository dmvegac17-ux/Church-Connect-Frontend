import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";

import { FullPageSpinner } from "../components/feedback/Spinner";
import type { UserRole } from "../types/user";
import { useAuth } from "./useAuth";

interface ProtectedRouteProps {
  children: ReactNode;
  /** Si se indica, además de sesión exige este rol exacto. */
  requiredRole?: UserRole;
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, role } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return <FullPageSpinner label="Cargando sesión…" />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (requiredRole && role !== requiredRole) {
    return <Navigate to="/403" replace />;
  }

  return <>{children}</>;
}
