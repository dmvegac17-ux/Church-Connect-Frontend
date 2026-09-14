import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { FullPageSpinner } from "../../components/feedback/Spinner";
import { useToast } from "../../components/feedback/useToast";
import { Card, PageHeader } from "../../components/layout/Page";
import { useMinistry } from "../../hooks/useMinistry";
import { parseValidationErrors } from "../../lib/formErrors";
import { ministryService } from "../../services/ministryService";
import { ApiError } from "../../types/api";
import type { UpdateMinistryDTO } from "../../types/ministry";
import {
  MinistryForm,
  type MinistryFormValues,
} from "./components/MinistryForm";

export function MinistryEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const toast = useToast();
  const { ministry, isLoading, error: loadError } = useMinistry(id);

  const [error, setError] = useState<unknown>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return <FullPageSpinner label="Cargando ministerio…" />;
  }

  if (loadError || !ministry || !id) {
    return (
      <div>
        <PageHeader title="Editar ministerio" backTo="/ministries" />
        <ErrorAlert
          error={loadError ?? new Error("No se pudo cargar el ministerio.")}
        />
      </div>
    );
  }

  const initial: MinistryFormValues = {
    nombre: ministry.nombre,
    descripcion: ministry.descripcion ?? "",
  };

  const handleSubmit = async (values: MinistryFormValues) => {
    setError(null);
    setFieldErrors({});

    const payload: UpdateMinistryDTO = {};
    const nombre = values.nombre.trim();
    const descripcion = values.descripcion.trim();

    if (nombre !== ministry.nombre) {
      payload.nombre = nombre;
    }
    // `descripcion` vaciada => null (la limpia); si cambió => nuevo texto.
    const nextDescripcion = descripcion === "" ? null : descripcion;
    if (nextDescripcion !== (ministry.descripcion ?? null)) {
      payload.descripcion = nextDescripcion;
    }

    if (Object.keys(payload).length === 0) {
      toast.info("No hay cambios por guardar.", "Sin cambios");
      return;
    }

    setSubmitting(true);
    try {
      const updated = await ministryService.update(id, payload);
      toast.success("Los cambios se guardaron correctamente.", "Ministerio actualizado");
      navigate(`/ministries/${updated.id}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.isValidation) {
        setFieldErrors(parseValidationErrors(err).fieldErrors);
      }
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={`Editar: ${ministry.nombre}`}
        backTo={`/ministries/${ministry.id}`}
      />

      <Card className="max-w-2xl">
        {error ? (
          <div className="mb-4">
            <ErrorAlert error={error} onClose={() => setError(null)} />
          </div>
        ) : null}

        <MinistryForm
          initial={initial}
          submitting={submitting}
          submitLabel="Guardar cambios"
          serverErrors={fieldErrors}
          onSubmit={handleSubmit}
          onCancel={() => navigate(`/ministries/${ministry.id}`)}
        />
      </Card>
    </div>
  );
}
