import { Outlet } from "react-router-dom";

import { Navbar } from "./Navbar";

/**
 * Layout de la vista de miembro (roles MEMBER y PARTICIPANT): barra superior
 * + contenido centrado. Fija aquí los valores propios de este perfil
 * (controles de 44px, tarjetas de 16px) sin tocar estilos globales.
 */
export function AppShell() {
  return (
    <div className="flex min-h-screen flex-col bg-background [--card-radius:16px] [--control-h:44px]">
      <Navbar />
      <main className="mx-auto w-full max-w-[1120px] flex-1 px-5 pt-8 pb-[120px]">
        <Outlet />
      </main>
    </div>
  );
}
