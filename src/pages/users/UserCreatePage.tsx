import { useRef, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { ErrorAlert } from "../../components/feedback/ErrorAlert";
import { useToast } from "../../components/feedback/useToast";
import { ActiveSwitch } from "../../components/forms/ActiveSwitch";
import { Button } from "../../components/forms/Button";
import { PasswordField } from "../../components/forms/PasswordField";
import { RoleSelect } from "../../components/forms/RoleSelect";
import { TextField } from "../../components/forms/TextField";
import { Card, PageHeader } from "../../components/layout/Page";
import { parseValidationErrors } from "../../lib/formErrors";
import {
  focusFirstError,
  isEmail,
  passwordLengthError,
  required,
} from "../../lib/validators";
import { userService } from "../../services/userService";
import { ApiError } from "../../types/api";
import type { CreateUserDTO, UserRole } from "../../types/user";

export function UserCreatePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const formRef = useRef<HTMLFormElement>(null);

  const [values, setValues] = useState({
    nombre: "",
    apellido: "",
    correo: "",
    telefono: "",
    contrasena: "",
  });
  const [rol, setRol] = useState<UserRole>("MEMBER");
  const [activo, setActivo] = useState(true);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);

  const set = (name: keyof typeof values, value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const errors: Record<string, string> = {};
    if (!required(values.nombre)) errors.nombre = "El nombre es obligatorio.";
    if (!required(values.apellido))
      errors.apellido = "El apellido es obligatorio.";
    if (!required(values.correo)) {
      errors.correo = "El correo es obligatorio.";
    } else if (!isEmail(values.correo)) {
      errors.correo = "Ingresa un correo válido.";
    }
    const passwordError = passwordLengthError(values.contrasena);
    if (passwordError) errors.contrasena = passwordError;
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      requestAnimationFrame(() => focusFirstError(formRef.current));
      return;
    }

    const payload: CreateUserDTO = {
      nombre: values.nombre.trim(),
      apellido: values.apellido.trim(),
      correo: values.correo.trim(),
      contrasena: values.contrasena,
      rol,
      activo,
      ...(values.telefono.trim()
        ? { telefono: values.telefono.trim() }
        : {}),
    };

    setSubmitting(true);
    try {
      const created = await userService.create(payload);
      toast.success(
        `${created.nombre} ${created.apellido ?? ""}`.trim() +
          " fue agregado correctamente.",
        "Usuario creado",
      );
      navigate(`/users/${created.id}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setFieldErrors({ correo: err.message });
      } else if (err instanceof ApiError && err.isValidation) {
        setFieldErrors(parseValidationErrors(err).fieldErrors);
      }
      setError(err);
      requestAnimationFrame(() => focusFirstError(formRef.current));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Nuevo usuario" backTo="/users" />

      <Card className="max-w-2xl">
        {error ? (
          <div className="mb-4">
            <ErrorAlert error={error} onClose={() => setError(null)} />
          </div>
        ) : null}

        <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Nombre"
              name="nombre"
              required
              value={values.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              error={fieldErrors.nombre}
            />
            <TextField
              label="Apellido"
              name="apellido"
              required
              value={values.apellido}
              onChange={(e) => set("apellido", e.target.value)}
              error={fieldErrors.apellido}
            />
          </div>
          <TextField
            label="Correo"
            name="correo"
            type="email"
            required
            value={values.correo}
            onChange={(e) => set("correo", e.target.value)}
            error={fieldErrors.correo}
          />
          <TextField
            label="Teléfono"
            name="telefono"
            type="tel"
            hint="Opcional"
            value={values.telefono}
            onChange={(e) => set("telefono", e.target.value)}
            error={fieldErrors.telefono}
          />
          <PasswordField
            label="Contraseña"
            name="contrasena"
            autoComplete="new-password"
            required
            value={values.contrasena}
            onChange={(e) => set("contrasena", e.target.value)}
            error={fieldErrors.contrasena}
            hint="Entre 8 y 20 caracteres"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <RoleSelect value={rol} onChange={setRol} error={fieldErrors.rol} />
            <div className="flex items-end">
              <ActiveSwitch checked={activo} onChange={setActivo} />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate("/users")}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              Crear usuario
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
