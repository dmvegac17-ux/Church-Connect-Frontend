import { ConfirmDialog } from "../../../components/feedback/ConfirmDialog";

interface DeleteEventDialogProps {
  open: boolean;
  eventTitle: string;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Confirmación para eliminar un evento. El backend elimina en cascada su
 * cronograma, asistencias, inscripciones y confirmaciones por correo.
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
        "También se eliminará su cronograma y los registros de asistencia, " +
        "inscripción y confirmación asociados. Esta acción no se puede deshacer."
      }
      confirmLabel="Eliminar"
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
