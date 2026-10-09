import { createContext } from "react";

export type ToastVariant = "success" | "error" | "info";

export interface ToastInput {
  /** Texto adicional solo para lectores de pantalla (el diseño muestra una línea). */
  title?: string;
  /** Mensaje visible. */
  message: string;
  variant?: ToastVariant;
  /** Milisegundos visibles. `0` = permanece hasta cerrarlo. Por defecto 5 s (6 s con acción). */
  duration?: number;
  /** Acción opcional dentro del toast (p. ej. "Deshacer", "Crear cronograma"). */
  actionLabel?: string;
  onAction?: () => void;
}

export interface ToastContextValue {
  notify: (toast: ToastInput) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);
