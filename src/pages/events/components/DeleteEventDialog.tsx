import { ConfirmDialog } from "../../../components/feedback/ConfirmDialog";
import { activitiesLabel } from "../../../lib/eventDates";

interface DeleteEventDialogProps {
  open: boolean;
  eventTitle: string;
  /** Actividades del cronograma que se eliminarán junto con el evento. */
  activityCount: number;
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
  activityCount,
  loading,
  onConfirm,
  onCancel,
}: DeleteEventDialogProps) {
  const schedulePart =
    activityCount > 0
      ? `También se eliminará su cronograma (${activitiesLabel(activityCount)})`
      : "También se eliminarán";

  return (
    <ConfirmDialog
      open={open}
      danger
      title="Eliminar evento"
      description={
        `Vas a eliminar «${eventTitle}». ${schedulePart}` +
        `${activityCount > 0 ? " y" : ""} los registros de asistencia, ` +
        "inscripción y confirmación asociados. Esta acción no se puede deshacer."
      }
      confirmLabel="Eliminar evento"
      loadingLabel="Eliminando…"
      loading={loading}
      onConfirm={onConfirm}
      onCancel={onCancel}
    />
  );
}
