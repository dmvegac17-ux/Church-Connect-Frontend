import { ConfirmDialog } from "../../../components/feedback/ConfirmDialog";

interface DeleteScheduleDialogProps {
  open: boolean;
  activityName: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteScheduleDialog({
  open,
  activityName,
  loading,
  onConfirm,
  onCancel,
}: DeleteScheduleDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      danger
      title="Eliminar cronograma"
      description={`¿Seguro que quieres eliminar "${activityName}"? Esta acción no se puede deshacer.`}
      confirmLabel="Eliminar"
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
