import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
} from "framer-motion";
import {
  BookOpen,
  CalendarDays,
  Check,
  MessagesSquare,
  Music,
  Users,
} from "lucide-react";
import type { ComponentType, PointerEvent, ReactNode } from "react";
import { Link } from "react-router-dom";

import { BrandLogo } from "./BrandLogo";

type IconType = ComponentType<{ className?: string }>;

const FEATURES: { icon: IconType; label: string }[] = [
  { icon: CalendarDays, label: "Acceso a eventos y horarios" },
  { icon: Users, label: "Únete a ministerios" },
  { icon: MessagesSquare, label: "Comunidad en línea" },
  { icon: BookOpen, label: "Recursos espirituales" },
];

/** Tarjeta "de vidrio" que flota suavemente sobre el panel de marca. */
function FloatCard({
  icon: Icon,
  title,
  subtitle,
  className = "",
  delay = 0,
}: {
  icon: IconType;
  title: string;
  subtitle: string;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: [0, -9, 0] }}
      transition={{
        opacity: { duration: 0.5, delay },
        y: { duration: 5, repeat: Infinity, ease: "easeInOut", delay },
      }}
      className={`flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 shadow-xl backdrop-blur-md ${className}`}
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/20">
        <Icon className="size-4" />
      </span>
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold">{title}</p>
        <p className="truncate text-[11px] text-primary-foreground/75">
          {subtitle}
        </p>
      </div>
    </motion.div>
  );
}

/** Panel de marca a pantalla completa con fondo animado y parallax al puntero. */
function BrandPanel() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 70, damping: 18 });
  const sy = useSpring(my, { stiffness: 70, damping: 18 });

  const blobAX = useTransform(sx, (v) => v * 34);
  const blobAY = useTransform(sy, (v) => v * 34);
  const blobBX = useTransform(sx, (v) => v * -44);
  const blobBY = useTransform(sy, (v) => v * -26);
  const cardsX = useTransform(sx, (v) => v * 18);
  const cardsY = useTransform(sy, (v) => v * 18);

  const handleMove = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const resetMove = () => {
    mx.set(0);
    my.set(0);
  };

  return (
    <div
      onPointerMove={handleMove}
      onPointerLeave={resetMove}
      className="relative isolate hidden overflow-hidden bg-gradient-to-br from-primary via-primary to-chart-2 text-primary-foreground lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:justify-center"
    >
      {/* Manchas de luz con parallax */}
      <motion.div
        style={{ x: blobAX, y: blobAY }}
        className="pointer-events-none absolute -left-28 -top-20 size-80 rounded-full bg-white/15 blur-3xl"
      />
      <motion.div
        style={{ x: blobBX, y: blobBY }}
        className="pointer-events-none absolute -bottom-28 -right-20 size-[26rem] rounded-full bg-chart-3/30 blur-3xl"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.14),transparent_46%)]" />
      {/* Retícula sutil */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:46px_46px]" />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col px-12 py-16">
        <div className="flex items-center gap-4">
          <BrandLogo className="size-20" />
          <span className="text-3xl font-semibold tracking-tight">
            Church Connect
          </span>
        </div>

        <h1 className="mt-12 text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
          Conectados con tu fe,
          <br />
          conectados contigo
        </h1>
        <p className="mt-4 max-w-sm text-sm text-primary-foreground/80">
          Vive la comunidad de tu iglesia desde un solo lugar: eventos,
          ministerios, anuncios y recursos espirituales.
        </p>

        <ul className="mt-8 space-y-2.5">
          {FEATURES.map(({ icon: Icon, label }) => (
            <li key={label} className="flex items-center gap-3 text-sm">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/25">
                <Check className="size-3.5" aria-hidden="true" />
              </span>
              <Icon className="size-4 opacity-80" aria-hidden="true" />
              <span>{label}</span>
            </li>
          ))}
        </ul>

        <motion.div
          style={{ x: cardsX, y: cardsY }}
          className="relative mt-14 h-36"
        >
          <FloatCard
            className="absolute left-0 top-0 w-60"
            icon={CalendarDays}
            title="Próximo evento"
            subtitle="Domingo · Servicio 10:00 a.m."
          />
          <FloatCard
            className="absolute left-20 top-16 w-60"
            icon={Music}
            title="Ministerio de alabanza"
            subtitle="Ensayo jueves 7:00 p.m."
            delay={0.9}
          />
        </motion.div>
      </div>
    </div>
  );
}

function TabSwitcher({ active }: { active: "login" | "register" }) {
  const base =
    "flex-1 rounded-xl px-4 py-2.5 text-center text-sm font-medium transition";
  const on = "bg-card text-primary shadow-sm";
  const off = "text-muted-foreground hover:text-foreground";

  return (
    <div className="mb-8 flex gap-1 rounded-2xl bg-muted p-1">
      <Link
        to="/login"
        className={`${base} ${active === "login" ? on : off}`}
        aria-current={active === "login" ? "page" : undefined}
      >
        Iniciar Sesión
      </Link>
      <Link
        to="/register"
        className={`${base} ${active === "register" ? on : off}`}
        aria-current={active === "register" ? "page" : undefined}
      >
        Registrarse
      </Link>
    </div>
  );
}

export function AuthLayout({
  tab,
  children,
  footer,
}: {
  tab: "login" | "register";
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-card lg:grid lg:grid-cols-[1.15fr_1fr] xl:grid-cols-[1.25fr_1fr]">
      <BrandPanel />

      <div className="flex min-h-screen flex-col items-center justify-center px-6 py-12 sm:px-10 lg:px-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <BrandLogo className="size-24 border border-border" />
            <span className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              Church Connect
            </span>
            <span className="mt-1 text-sm text-muted-foreground">
              Conectados con tu fe, conectados contigo
            </span>
          </div>

          <TabSwitcher active={tab} />
          {children}

          {footer ? (
            <p className="mt-6 text-center text-xs text-muted-foreground">
              {footer}
            </p>
          ) : null}
        </motion.div>
      </div>
    </div>
  );
}
