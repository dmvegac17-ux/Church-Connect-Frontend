import { ConfirmDialog } from "../../../components/feedback/ConfirmDialog";

interface DeleteEventDialogProps {
  open: boolean;
  eventTitle: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmación para eliminar un evento. El backend rechaza con `409` si el
 * evento todavía tiene cronogramas asociados (hay que eliminarlos primero).
 */
export function DeleteEventDialog({
  open,
  eventTitle,
  loading,
  onConfirm,
  onCancel,
}: DeleteEventDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      danger
      title="Eliminar evento"
      description={
        `¿Seguro que quieres eliminar "${eventTitle}"? ` +
        "Si el evento tiene cronogramas asociados, primero debes eliminarlos. " +
        "Esta acción no se puede deshacer."
      }
      confirmLabel="Eliminar"
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
