import { sanitizeNotificationHtml } from "./sanitizeHtml";

/**
 * Borrador de la notificación que se está redactando. Se guarda en este
 * navegador (`localStorage`), separado por usuario, para que lo escrito siga
 * ahí al volver a Notificaciones. No se sincroniza entre dispositivos.
 */
export interface NotificationDraft {
  recipients: string[];
  titulo: string;
  /** HTML del editor. */
  mensaje: string;
}

const KEY_PREFIX = "cc_notification_draft:";

export const EMPTY_DRAFT: NotificationDraft = {
  recipients: [],
  titulo: "",
  mensaje: "",
};

function keyFor(userId: string | undefined): string {
  return `${KEY_PREFIX}${userId ?? "anon"}`;
}

export function loadDraft(userId: string | undefined): NotificationDraft | null {
  try {
    const raw = localStorage.getItem(keyFor(userId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as Partial<NotificationDraft>;
    return {
      recipients: Array.isArray(parsed.recipients)
        ? parsed.recipients.filter((id): id is string => typeof id === "string")
        : [],
      titulo: typeof parsed.titulo === "string" ? parsed.titulo : "",
      // Lo guardado vuelve a pasar por el saneador antes de entrar al editor.
      mensaje:
        typeof parsed.mensaje === "string"
          ? sanitizeNotificationHtml(parsed.mensaje)
          : "",
    };
  } catch {
    return null;
  }
}

export function saveDraft(
  userId: string | undefined,
  draft: NotificationDraft,
): void {
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify(draft));
  } catch {
    /* almacenamiento no disponible: el borrador vive solo en esta pantalla */
  }
}

export function clearDraft(userId: string | undefined): void {
  try {
    localStorage.removeItem(keyFor(userId));
  } catch {
    /* nada que limpiar */
  }
}
