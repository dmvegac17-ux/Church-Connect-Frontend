import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useId, useRef, type ReactNode } from "react";

/**
 * Cierra con Escape. La captura va en `window` (fase de burbuja), así que un
 * `ConfirmDialog` abierto encima —que escucha en captura y detiene el
 * evento— siempre se cierra primero.
 */
function useEscape(open: boolean, onEscape: () => void) {
  const handler = useRef(onEscape);
  handler.current = onEscape;

  useEffect(() => {
    if (!open) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) {
        e.preventDefault();
        handler.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
}

/** Lleva el foco al contenedor al abrir y lo devuelve al cerrar. */
function useFocusReturn(open: boolean) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    return () => previous?.focus?.();
  }, [open]);
  return ref;
}

function CloseButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="flex size-10 shrink-0 items-center justify-center rounded-[10px] text-text-secondary hover:bg-hover-icon hover:text-foreground max-md:size-11"
    >
      <X className="size-5" aria-hidden="true" />
    </button>
  );
}

interface DrawerProps {
  open: boolean;
  title: string;
  /** Se invoca con X, Escape o clic fuera; quien lo usa decide si pide confirmación. */
  onClose: () => void;
  children: ReactNode;
  /** Pie fijo: línea de estado + botones. */
  footer?: ReactNode;
}

/** Panel lateral derecho para formularios (usuario, ministerio, notificación). */
export function Drawer({ open, title, onClose, children, footer }: DrawerProps) {
  const titleId = useId();
  const panelRef = useFocusReturn(open);
  useEscape(open, onClose);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[60] flex justify-end bg-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="flex h-full w-[min(500px,100%)] flex-col bg-card shadow-drawer outline-none"
            initial={{ x: 40 }}
            animate={{ x: 0 }}
            exit={{ x: 40 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-divider py-3 pr-3 pl-5">
              <h2 id={titleId} className="text-lg font-extrabold text-foreground">
                {title}
              </h2>
              <CloseButton onClick={onClose} label="Cerrar panel" />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">{children}</div>
            {footer ? (
              <div className="shrink-0 border-t border-divider bg-surface-alt px-5 py-3.5">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

interface ModalProps {
  open: boolean;
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Contenido fijo bajo la cabecera (buscador, barra de tiempo). */
  toolbar?: ReactNode;
  maxWidth?: string;
}

/** Modal centrado con cabecera, cuerpo con scroll y pie fijo. */
export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  toolbar,
  maxWidth = "max-w-[560px]",
}: ModalProps) {
  const titleId = useId();
  const panelRef = useFocusReturn(open);
  useEscape(open, onClose);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[65] flex items-center justify-center bg-overlay p-3 sm:p-5"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            ref={panelRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={`flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl bg-card shadow-modal outline-none ${maxWidth}`}
            initial={{ opacity: 0, scale: 0.97, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 12 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-divider py-3.5 pr-3 pl-5">
              <div className="min-w-0 py-1">
                <h2 id={titleId} className="text-lg font-extrabold text-foreground">
                  {title}
                </h2>
                {subtitle ? (
                  <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
                ) : null}
              </div>
              <CloseButton onClick={onClose} label="Cerrar" />
            </div>
            {toolbar ? (
              <div className="shrink-0 border-b border-divider px-5 py-3">
                {toolbar}
              </div>
            ) : null}
            <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
            {footer ? (
              <div className="shrink-0 border-t border-divider bg-surface-alt px-5 py-3.5">
                {footer}
              </div>
            ) : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
