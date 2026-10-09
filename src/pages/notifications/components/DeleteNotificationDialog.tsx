import { ConfirmDialog } from "../../../components/feedback/ConfirmDialog";

interface DeleteNotificationDialogProps {
  open: boolean;
  notificationTitle: string;
  /** A quién se le envió: deja de verla en su bandeja. */
  recipientName: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteNotificationDialog({
  open,
  notificationTitle,
  recipientName,
  loading,
  onConfirm,
  onCancel,
}: DeleteNotificationDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      danger
      title="Eliminar notificación"
      description={`Vas a eliminar «${notificationTitle}», enviada a ${recipientName}. Dejará de verla en su bandeja y esta acción no se puede deshacer.`}
      confirmLabel="Eliminar notificación"
      loadingLabel="Eliminando…"
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
