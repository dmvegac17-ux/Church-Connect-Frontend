import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_TOAST_TITLES,
  ToastContext,
  type ToastContextValue,
  type ToastInput,
  type ToastVariant,
} from "./toast-context";

interface ActiveToast {
  id: number;
  title: string;
  message: string;
  variant: ToastVariant;
  duration: number;
}

const ICONS: Record<ToastVariant, ReactNode> = {
  success: <CheckCircle2 className="size-5" aria-hidden="true" />,
  error: <AlertCircle className="size-5" aria-hidden="true" />,
  info: <Info className="size-5" aria-hidden="true" />,
};

const STYLES: Record<
  ToastVariant,
  { accent: string; iconWrap: string; title: string }
> = {
  success: {
    accent: "border-l-primary",
    iconWrap: "bg-primary/15 text-primary",
    title: "text-primary",
  },
  error: {
    accent: "border-l-destructive",
    iconWrap: "bg-destructive/10 text-destructive",
    title: "text-destructive",
  },
  info: {
    accent: "border-l-accent",
    iconWrap: "bg-muted text-muted-foreground",
    title: "text-foreground",
  },
};

const DEDUPE_WINDOW_MS = 500;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const counter = useRef(0);
  const lastToast = useRef<{ key: string; at: number } | null>(null);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    ({ title, message, variant = "info", duration = 4500 }: ToastInput) => {
      const key = `${variant}|${title ?? ""}|${message}`;
      const now = Date.now();

      // Evita duplicados inmediatos (p. ej. efectos que corren dos veces
      // en React StrictMode).
      if (
        lastToast.current &&
        lastToast.current.key === key &&
        now - lastToast.current.at < DEDUPE_WINDOW_MS
      ) {
        return;
      }
      lastToast.current = { key, at: now };

      const id = ++counter.current;
      setToasts((prev) => [
        ...prev,
        {
          id,
          title: title ?? DEFAULT_TOAST_TITLES[variant],
          message,
          variant,
          duration,
        },
      ]);

      if (duration > 0) {
        window.setTimeout(() => dismiss(id), duration);
      }
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      notify,
      success: (message, title) =>
        notify({ message, title, variant: "success" }),
      error: (message, title) => notify({ message, title, variant: "error" }),
      info: (message, title) => notify({ message, title, variant: "info" }),
    }),
    [notify],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col items-end gap-2 sm:inset-x-auto sm:right-4"
      >
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const style = STYLES[toast.variant];
            return (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, x: 32, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 32, scale: 0.97 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className={`pointer-events-auto flex w-full items-start gap-3 rounded-xl border border-l-4 border-border bg-card p-4 shadow-lg sm:w-96 ${style.accent}`}
                role={toast.variant === "error" ? "alert" : "status"}
              >
                <span
                  className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full ${style.iconWrap}`}
                >
                  {ICONS[toast.variant]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-semibold ${style.title}`}>
                    {toast.title}
                  </p>
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {toast.message}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(toast.id)}
                  aria-label="Cerrar notificación"
                  className="-m-1 shrink-0 rounded p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
