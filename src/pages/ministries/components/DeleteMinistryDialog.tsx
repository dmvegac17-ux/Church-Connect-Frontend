import { ConfirmDialog } from "../../../components/feedback/ConfirmDialog";

interface DeleteMinistryDialogProps {
  open: boolean;
  ministryName: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmación para eliminar un ministerio. Advierte del efecto colateral:
 * los usuarios asignados NO se eliminan, quedan sin ministerio
 * (`ministerio_id → NULL`, regla `ON DELETE SET NULL`).
 */
export function DeleteMinistryDialog({
  open,
  ministryName,
  loading,
  onConfirm,
  onCancel,
}: DeleteMinistryDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      danger
      title="Eliminar ministerio"
      description={
        `¿Seguro que quieres eliminar "${ministryName}"? ` +
        "Los usuarios asignados no se eliminan, pero quedarán sin ministerio. " +
        "Esta acción no se puede deshacer."
      }
      confirmLabel="Eliminar"
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
