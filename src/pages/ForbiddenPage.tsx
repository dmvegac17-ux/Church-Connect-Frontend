import { ShieldAlert } from "lucide-react";
import { Link } from "react-router-dom";

export function ForbiddenPage() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <ShieldAlert className="size-12 text-destructive" aria-hidden="true" />
      <h1 className="mt-4 text-2xl font-medium text-foreground">
        403 · Acceso denegado
      </h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        No tienes permisos para ver esta sección. Si crees que es un error,
        contacta a un administrador.
      </p>
      <Link
        to="/profile"
        className="mt-6 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Ir a mi perfil
      </Link>
    </div>
  );
}
