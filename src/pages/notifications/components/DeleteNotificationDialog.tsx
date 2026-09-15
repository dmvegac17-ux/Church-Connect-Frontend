import { ConfirmDialog } from "../../../components/feedback/ConfirmDialog";

interface DeleteNotificationDialogProps {
  open: boolean;
  notificationTitle: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteNotificationDialog({
  open,
  notificationTitle,
  loading,
  onConfirm,
  onCancel,
}: DeleteNotificationDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      danger
      title="Eliminar notificación"
      description={`¿Seguro que quieres eliminar "${notificationTitle}"? Esta acción no se puede deshacer.`}
      confirmLabel="Eliminar"
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
