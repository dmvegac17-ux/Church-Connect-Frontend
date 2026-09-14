import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-center">
      <h1 className="text-3xl font-medium text-foreground">404</h1>
      <p className="mt-2 text-sm text-muted-foreground">Página no encontrada.</p>
      <Link
        to="/"
        className="mt-6 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Volver al inicio
      </Link>
    </div>
  );
}
