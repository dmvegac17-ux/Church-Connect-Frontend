import { BookOpen, Calendar, MessagesSquare, UsersRound } from "lucide-react";
import type { ComponentType, ReactNode } from "react";
import { Link } from "react-router-dom";

import { LegalLinks } from "../legal/LegalLinks";
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
    <aside className="hidden flex-col justify-center gap-7 bg-primary p-[clamp(28px,6vw,72px)] text-primary-foreground min-[840px]:flex">
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

/**
 * Marca en celular (cuando las dos columnas ya no caben): un encabezado
 * corto con el degradado de la app, para que el formulario quede a la vista
 * sin desplazarse. El panel completo se reserva para pantallas anchas.
 */
function MobileBrand() {
  return (
    <header className="flex items-center gap-3 bg-linear-to-br from-primary to-primary-hover px-5 py-4 text-primary-foreground min-[840px]:hidden">
      <BrandLogo className="size-11 shrink-0" />
      <div className="flex min-w-0 flex-col">
        <span className="text-xl leading-tight font-extrabold tracking-[-0.01em]">
          Church Connect
        </span>
        <span className="text-sm text-[#E3ECE5]">Conectados con tu fe</span>
      </div>
    </header>
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
 * Layout de Acceso: dos columnas en pantallas anchas; en celular, un
 * encabezado compacto y el formulario. `tab` muestra el
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
    <div className="grid min-h-screen grid-cols-1 bg-card [--control-h:46px] [--field-bg:var(--input-auth)] max-[839px]:grid-rows-[auto_1fr] min-[840px]:grid-cols-2">
      <MobileBrand />
      <BrandPanel />

      <main className="flex items-start justify-center px-5 py-[clamp(20px,5vw,64px)] min-[840px]:items-center">
        <div className="flex w-full max-w-[460px] flex-col gap-[22px]">
          {tab ? <TabSwitcher active={tab} /> : null}
          {children}
          {/* En celular el versículo va después del formulario, en pequeño. */}
          <DailyVerse
            className="border-t border-divider pt-4 min-[840px]:hidden"
            textClassName="text-sm leading-normal text-muted-foreground"
            referenceClassName="text-[13px] text-text-secondary"
          />
          <LegalLinks className="justify-center text-[13px] text-muted-foreground" />
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
