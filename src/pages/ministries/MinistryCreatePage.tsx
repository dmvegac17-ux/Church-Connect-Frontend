import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { useToast } from "../../components/feedback/useToast";
import { Card, PageHeader } from "../../components/layout/Page";
import { parseValidationErrors } from "../../lib/formErrors";
import { ministryService } from "../../services/ministryService";
import { ApiError } from "../../types/api";
import type { CreateMinistryDTO } from "../../types/ministry";
import {
  MinistryForm,
  type MinistryFormValues,
} from "./components/MinistryForm";

export function MinistryCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [error, setError] = useState<unknown>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (values: MinistryFormValues) => {
    setError(null);
    setFieldErrors({});

    const descripcion = values.descripcion.trim();
    const payload: CreateMinistryDTO = {
      nombre: values.nombre.trim(),
      ...(descripcion ? { descripcion } : {}),
    };

    setSubmitting(true);
    try {
      const created = await ministryService.create(payload);
      toast.success(
        `El ministerio "${created.nombre}" fue creado.`,
        "Ministerio creado",
      );
      navigate(`/ministries/${created.id}`, { replace: true });
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
      <PageHeader title="Nuevo ministerio" backTo="/ministries" />

      <Card className="max-w-2xl">
        {error ? (
          <div className="mb-4">
            <ErrorAlert error={error} onClose={() => setError(null)} />
          </div>
        ) : null}

        <MinistryForm
          submitting={submitting}
          submitLabel="Crear ministerio"
          serverErrors={fieldErrors}
          onSubmit={handleSubmit}
          onCancel={() => navigate("/ministries")}
        />
      </Card>
    </div>
  );
}
