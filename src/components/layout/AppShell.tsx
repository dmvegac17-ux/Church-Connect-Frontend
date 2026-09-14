import { Outlet } from "react-router-dom";

import { Navbar } from "./Navbar";

/** Layout de las rutas privadas: navbar con estado de sesión + contenido. */
export function AppShell() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
