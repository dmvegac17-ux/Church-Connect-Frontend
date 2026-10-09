import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { HOME_PATH, modulesFor } from "../../config/navigation";
import { ROLE_LABELS } from "../../types/user";

function greeting(date: Date): string {
  const hour = date.getHours();
  if (hour < 12) {
    return "Buenos días";
  }
  return hour < 19 ? "Buenas tardes" : "Buenas noches";
}

/** Pantalla de inicio tras iniciar sesión: bienvenida + accesos a cada módulo. */
export function HomePage() {
  const { user, role } = useAuth();
  const now = new Date();
  const modules = modulesFor(role).filter((module) => module.to !== HOME_PATH);
  const today = new Intl.DateTimeFormat("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(now);

  return (
    <div className="space-y-8">
      <section
        aria-labelledby="home-welcome"
        className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8"
      >
        <p className="text-sm text-muted-foreground first-letter:uppercase">
          {today}
        </p>
        <h1 id="home-welcome" className="mt-1 text-2xl font-medium text-foreground">
          {greeting(now)}
          {user ? `, ${user.nombre}` : ""}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Te damos la bienvenida a Church Connect. Desde aquí puedes entrar a
          cada sección de la plataforma.
        </p>
        {role ? (
          <span className="mt-4 inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground">
            {ROLE_LABELS[role]}
          </span>
        ) : null}
      </section>

      <section aria-labelledby="home-modules">
        <h2 id="home-modules" className="text-lg font-medium text-foreground">
          Secciones
        </h2>
        <ul className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(({ to, label, description, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-sm outline-none transition hover:border-primary/50 hover:shadow-md focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/40 active:bg-muted"
              >
                <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="mt-4 text-base font-medium text-foreground">
                  {label}
                </span>
                <span className="mt-1 flex-1 text-sm text-muted-foreground">
                  {description}
                </span>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
                  Abrir
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
