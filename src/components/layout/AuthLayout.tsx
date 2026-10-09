import { BookOpen, Calendar, MessagesSquare, UsersRound } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { Link } from "react-router-dom";

import { BrandLogo } from "./BrandLogo";
import { DailyVerse } from "./DailyVerse";

type IconType = ComponentType<{ className?: string }>;

const BENEFITS: { icon: IconType; label: string }[] = [
  { icon: Calendar, label: "Acceso a eventos y horarios" },
  { icon: UsersRound, label: "Únete a ministerios" },
  { icon: MessagesSquare, label: "Comunidad en línea" },
  { icon: BookOpen, label: "Recursos espirituales" },
];

/** Columna de marca: logo, propuesta de valor, beneficios y versículo del día. */
function BrandPanel() {
  return (
    <aside className="flex flex-col justify-center gap-7 bg-primary p-[clamp(28px,6vw,72px)] text-primary-foreground">
      <div className="flex items-center gap-4">
        <BrandLogo className="size-16" />
        <span className="text-[28px] font-extrabold tracking-[-0.01em]">
          Church Connect
        </span>
      </div>

      <div className="flex max-w-[460px] flex-col gap-3.5">
        <h1 className="text-[clamp(30px,3.6vw,42px)] leading-[1.15] font-extrabold tracking-[-0.02em] text-balance">
          Conectados con tu fe, conectados contigo
        </h1>
        <p className="text-[17px] leading-[1.55] text-pretty text-[#E3ECE5]">
          Vive la comunidad de tu iglesia desde un solo lugar: eventos,
          ministerios, anuncios y recursos espirituales.
        </p>
      </div>

      <ul className="flex flex-col gap-3">
        {BENEFITS.map(({ icon: Icon, label }) => (
          <li key={label} className="flex items-center gap-3 text-base">
            <span
              className="flex size-[30px] shrink-0 items-center justify-center rounded-full bg-white/[0.16]"
              aria-hidden="true"
            >
              <Icon className="size-[18px]" />
            </span>
            {label}
          </li>
        ))}
      </ul>

      <DailyVerse
        className="max-w-[460px] border-t border-white/20 pt-5"
        textClassName="text-[15px] leading-normal text-[#E3ECE5]"
        referenceClassName="text-sm"
      />
    </aside>
  );
}

function TabSwitcher({ active }: { active: "login" | "register" }) {
  const base =
    "flex h-11 items-center justify-center rounded-[10px] text-[15px] font-extrabold transition-colors";
  const on = "bg-card text-primary-hover shadow-tab";
  const off = "text-text-secondary hover:text-foreground";

  return (
    <nav
      aria-label="Acceso"
      className="grid grid-cols-2 gap-1 rounded-[14px] bg-hover-icon p-1"
    >
      <Link
        to="/login"
        className={`${base} ${active === "login" ? on : off}`}
        aria-current={active === "login" ? "page" : undefined}
      >
        Iniciar sesión
      </Link>
      <Link
        to="/register"
        className={`${base} ${active === "register" ? on : off}`}
        aria-current={active === "register" ? "page" : undefined}
      >
        Registrarse
      </Link>
    </nav>
  );
}

/**
 * Layout de Acceso: dos columnas que se apilan en móvil. `tab` muestra el
 * selector Iniciar sesión / Registrarse; se omite en la vista de recuperación.
 */
export function AuthLayout({
  tab,
  children,
}: {
  tab?: "login" | "register";
  children: ReactNode;
}) {
  return (
    <div className="grid min-h-screen grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] bg-card [--control-h:46px] [--field-bg:var(--input-auth)]">
      <BrandPanel />

      <main className="flex items-center justify-center px-5 py-[clamp(24px,5vw,64px)]">
        <div className="flex w-full max-w-[460px] flex-col gap-[22px]">
          {tab ? <TabSwitcher active={tab} /> : null}
          {children}
        </div>
      </main>
    </div>
  );
}

/** Título + bajada de cada vista de Acceso. */
export function AuthHeading({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="text-2xl font-extrabold text-foreground">{title}</h2>
      <p className="text-[15px] leading-normal text-muted-foreground">
        {description}
      </p>
    </div>
  );
}
