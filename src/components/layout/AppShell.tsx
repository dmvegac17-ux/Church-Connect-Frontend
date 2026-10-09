import { Outlet, useLocation } from "react-router-dom";

import { Navbar } from "./Navbar";

/** Rutas que aprovechan todo el ancho de pantalla en vez del contenedor centrado por defecto. */
const FULL_WIDTH_ROUTES = new Set(["/notifications"]);

/** Layout de las rutas privadas: navbar con estado de sesión + contenido. */
export function AppShell() {
  const { pathname } = useLocation();
  const isFullWidth = FULL_WIDTH_ROUTES.has(pathname);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main
        className={
          isFullWidth
            ? "px-4 py-8 sm:px-6 lg:px-8"
            : "mx-auto max-w-5xl px-4 py-8"
        }
      >
        <Outlet />
      </main>
    </div>
  );
}
