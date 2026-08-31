import { createContext } from "react";

export type ToastVariant = "success" | "error" | "info";

export interface ToastInput {
  /** Título corto en negrita. Si se omite se usa uno por defecto según el tipo. */
  title?: string;
  /** Cuerpo del mensaje. */
  message: string;
  variant?: ToastVariant;
  /** Milisegundos visibles. `0` = permanece hasta cerrarlo. */
  duration?: number;
}

export interface ToastContextValue {
  notify: (toast: ToastInput) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export const DEFAULT_TOAST_TITLES: Record<ToastVariant, string> = {
  success: "Operación exitosa",
  error: "Ocurrió un error",
  info: "Información",
};
