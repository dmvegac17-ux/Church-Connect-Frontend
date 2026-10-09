import { AnimatePresence, motion } from "framer-motion";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  ToastContext,
  type ToastContextValue,
  type ToastInput,
  type ToastVariant,
} from "./toast-context";

interface ActiveToast {
  id: number;
  title?: string;
  message: string;
  variant: ToastVariant;
  actionLabel?: string;
  onAction?: () => void;
}

/** Iconos claros sobre el fondo oscuro del toast (contraste AA). */
const ICONS: Record<ToastVariant, ReactNode> = {
  success: (
    <CircleCheck className="size-5 shrink-0 text-[#9FD0AE]" aria-hidden="true" />
  ),
  error: (
    <CircleAlert className="size-5 shrink-0 text-[#F3C9C0]" aria-hidden="true" />
  ),
  info: <Info className="size-5 shrink-0 text-[#CFE6D5]" aria-hidden="true" />,
};

const DEDUPE_WINDOW_MS = 500;
const DEFAULT_DURATION_MS = 5000;
const ACTION_DURATION_MS = 6000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ActiveToast[]>([]);
  const counter = useRef(0);
  const lastToast = useRef<{ key: string; at: number } | null>(null);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    ({
      title,
      message,
      variant = "info",
      duration,
      actionLabel,
      onAction,
    }: ToastInput) => {
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
        { id, title, message, variant, actionLabel, onAction },
      ]);

      const visibleFor =
        duration ?? (actionLabel ? ACTION_DURATION_MS : DEFAULT_DURATION_MS);
      if (visibleFor > 0) {
        window.setTimeout(() => dismiss(id), visibleFor);
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
      <div className="pointer-events-none fixed inset-x-4 bottom-6 z-[90] flex flex-col items-center gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="pointer-events-auto flex max-w-full items-center gap-2.5 rounded-xl bg-foreground py-2 pr-2 pl-4 text-[15px] text-white shadow-toast sm:max-w-xl"
              role={toast.variant === "error" ? "alert" : "status"}
            >
              {ICONS[toast.variant]}
              <span className="min-w-0 flex-1 py-1.5 leading-snug">
                {toast.title ? (
                  <span className="sr-only">{toast.title}: </span>
                ) : null}
                {toast.message}
              </span>
              {toast.actionLabel && toast.onAction ? (
                <button
                  type="button"
                  onClick={() => {
                    toast.onAction?.();
                    dismiss(toast.id);
                  }}
                  className="h-9 shrink-0 rounded-lg px-2.5 text-sm font-extrabold whitespace-nowrap text-[#CFE6D5] hover:bg-white/10"
                >
                  {toast.actionLabel}
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => dismiss(toast.id)}
                aria-label="Cerrar aviso"
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-white/80 hover:bg-white/10 hover:text-white"
              >
                <X className="size-[18px]" aria-hidden="true" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
