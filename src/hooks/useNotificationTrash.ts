import { useCallback, useSyncExternalStore } from "react";
import { useNavigate } from "react-router-dom";

import { useToast } from "../components/feedback/useToast";
import { NOTIFICATIONS_CHANGED_EVENT } from "../lib/notificationEvents";
import { notificationService } from "../services/notificationService";

/*
 * Papelera con «Deshacer»: la notificación desaparece de la vista al
 * instante y se elimina en el servidor a los 6 s, salvo que se deshaga.
 * El estado vive fuera de React para que sobreviva al cambio de pantalla
 * (se puede eliminar desde el detalle y deshacer desde la lista).
 */

const UNDO_MS = 6000;

const timers = new Map<string, number>();
const listeners = new Set<() => void>();
let snapshot: ReadonlySet<string> = new Set();

function publish(): void {
  snapshot = new Set(timers.keys());
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): ReadonlySet<string> {
  return snapshot;
}

export interface NotificationTrash {
  /** Ids ocultos a la espera de eliminarse: no se muestran en la bandeja. */
  pending: ReadonlySet<string>;
  /** Oculta la notificación y la elimina al vencer el plazo de «Deshacer». */
  trash: (id: string, options?: { returnTo?: string }) => void;
}

/**
 * `onSettled` se llama cuando el servidor confirma la eliminación o cuando
 * falla (para recargar la lista y que la notificación reaparezca).
 */
export function useNotificationTrash(onSettled?: () => void): NotificationTrash {
  const toast = useToast();
  const navigate = useNavigate();
  const pending = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const trash = useCallback(
    (id: string, options?: { returnTo?: string }) => {
      if (timers.has(id)) {
        return;
      }

      const timer = window.setTimeout(() => {
        notificationService
          .remove(id)
          .catch(() => {
            toast.error("No se pudo eliminar la notificación. Sigue en tu bandeja.");
          })
          .finally(() => {
            timers.delete(id);
            publish();
            window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
            onSettled?.();
          });
      }, UNDO_MS);

      timers.set(id, timer);
      publish();

      toast.notify({
        message: "Notificación eliminada.",
        variant: "success",
        duration: UNDO_MS,
        actionLabel: "Deshacer",
        onAction: () => {
          window.clearTimeout(timer);
          timers.delete(id);
          publish();
          if (options?.returnTo) {
            navigate(options.returnTo);
          }
        },
      });
    },
    [toast, navigate, onSettled],
  );

  return { pending, trash };
}
