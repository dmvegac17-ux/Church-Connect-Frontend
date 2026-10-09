import { useEffect, useId, useState, type FormEvent } from "react";

import { ConfirmDialog } from "../../../components/feedback/ConfirmDialog";
import { ErrorAlert } from "../../../components/feedback/ErrorAlert";
import { useToast } from "../../../components/feedback/useToast";
import { ActiveSwitch } from "../../../components/forms/ActiveSwitch";
import { Button } from "../../../components/forms/Button";
import { PasswordField } from "../../../components/forms/PasswordField";
import { RoleSelect } from "../../../components/forms/RoleSelect";
import { TextField } from "../../../components/forms/TextField";
import { FormStatus } from "../../../components/ui/FormStatus";
import { Drawer } from "../../../components/ui/Overlay";
import { useTouched } from "../../../hooks/useTouched";
import { parseValidationErrors } from "../../../lib/formErrors";
import { fullNameOf } from "../../../lib/people";
import {
  compactErrors,
  DUPLICATE_EMAIL_MESSAGE,
  emailError,
  PASSWORD_MAX_LENGTH,
  passwordLengthError,
  PERSON_NAME_MAX,
  personNameError,
  PHONE_MAX,
  PHONE_PLACEHOLDER,
  phoneError,
  sanitizeEmail,
  sanitizePersonName,
  sanitizePhone,
} from "../../../lib/validators";
import { userService } from "../../../services/userService";
import { ApiError } from "../../../types/api";
import type {
  CreateUserDTO,
  UpdateUserDTO,
  User,
  UserRole,
} from "../../../types/user";

interface FormValues {
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  contrasena: string;
  rol: UserRole;
  activo: boolean;
}

type TextKey = "nombre" | "apellido" | "correo" | "telefono" | "contrasena";

const EMPTY: FormValues = {
  nombre: "",
  apellido: "",
  correo: "",
  telefono: "",
  contrasena: "",
  rol: "MEMBER",
  activo: true,
};

function valuesOf(user: User): FormValues {
  return {
    nombre: user.nombre,
    apellido: user.apellido ?? "",
    correo: user.correo,
    telefono: user.telefono ?? "",
    contrasena: "",
    rol: user.rol,
    activo: user.activo ?? true,
  };
}

interface UserFormDrawerProps {
  open: boolean;
  /** `null` = crear; un usuario = editar. */
  user: User | null;
  /** La propia cuenta no puede cambiar su rol ni su estado. */
  isSelf: boolean;
  onClose: () => void;
  onSaved: (saved: User) => void;
}

/** Panel lateral para crear o editar un usuario. */
export function UserFormDrawer({
  open,
  user,
  isSelf,
  onClose,
  onSaved,
}: UserFormDrawerProps) {
  const toast = useToast();
  const formId = useId();
  const isEdit = user !== null;
  const [initial, setInitial] = useState<FormValues>(EMPTY);
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [serverErrors, setServerErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<unknown>(null);
  const [submitting, setSubmitting] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const fields = useTouched<TextKey>();
  const { reset } = fields;

  // Cada apertura parte de los datos guardados (o de un formulario vacío).
  useEffect(() => {
    if (!open) {
      return;
    }
    const next = user ? valuesOf(user) : EMPTY;
    setInitial(next);
    setValues(next);
    setServerErrors({});
    setError(null);
    setConfirmDiscard(false);
    reset();
  }, [open, user, reset]);

  const set = <K extends keyof FormValues>(name: K, value: FormValues[K]) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setServerErrors((prev) => {
      if (!(name in prev)) {
        return prev;
      }
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const passwordError = isEdit
    ? values.contrasena
      ? passwordLengthError(values.contrasena)
      : undefined
    : values.contrasena
      ? passwordLengthError(values.contrasena)
      : "Ingresa una contraseña de 8 a 20 caracteres.";

  const errors: Record<TextKey, string | undefined> = {
    nombre: personNameError(values.nombre, "nombre") ?? serverErrors.nombre,
    apellido:
      personNameError(values.apellido, "apellido") ?? serverErrors.apellido,
    correo: emailError(values.correo) ?? serverErrors.correo,
    telefono: phoneError(values.telefono) ?? serverErrors.telefono,
    contrasena: passwordError ?? serverErrors.contrasena,
  };
  const errorCount = Object.keys(compactErrors(errors)).length;

  const changed = (key: keyof FormValues) =>
    typeof values[key] === "string"
      ? (values[key] as string).trim() !== (initial[key] as string).trim()
      : values[key] !== initial[key];
  const dirty = (Object.keys(values) as (keyof FormValues)[]).some(changed);
  const canSubmit = errorCount === 0 && (dirty || !isEdit);

  // En edición el error aparece en cuanto el valor difiere del guardado.
  const shown = (key: TextKey) =>
    isEdit && changed(key) ? errors[key] : fields.visible(errors, key);

  const requestClose = () => {
    if (submitting) {
      return;
    }
    if (dirty) {
      setConfirmDiscard(true);
    } else {
      onClose();
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    fields.setSubmitted(true);
    if (!canSubmit) {
      return;
    }

    setSubmitting(true);
    try {
      let saved: User;
      if (user) {
        const payload: UpdateUserDTO = {};
        if (changed("nombre")) payload.nombre = values.nombre.trim();
        if (changed("apellido")) payload.apellido = values.apellido.trim();
        if (changed("correo")) payload.correo = values.correo.trim();
        if (changed("telefono")) payload.telefono = values.telefono.trim();
        if (changed("rol")) payload.rol = values.rol;
        if (changed("activo")) payload.activo = values.activo;
        if (values.contrasena) payload.contrasena = values.contrasena;
        saved = await userService.update(user.id, payload);
        toast.success(`Los cambios de ${fullNameOf(saved)} se guardaron.`);
      } else {
        const payload: CreateUserDTO = {
          nombre: values.nombre.trim(),
          apellido: values.apellido.trim(),
          correo: values.correo.trim(),
          contrasena: values.contrasena,
          rol: values.rol,
          activo: values.activo,
          ...(values.telefono.trim()
            ? { telefono: values.telefono.trim() }
            : {}),
        };
        saved = await userService.create(payload);
        toast.success(`${fullNameOf(saved)} fue agregado.`);
      }
      onSaved(saved);
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setServerErrors({ correo: DUPLICATE_EMAIL_MESSAGE });
      } else if (err instanceof ApiError && err.isValidation) {
        setServerErrors(parseValidationErrors(err).fieldErrors);
        setError(err);
      } else {
        setError(err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Drawer
        open={open}
        title={isEdit ? "Editar usuario" : "Nuevo usuario"}
        onClose={requestClose}
        footer={
          <div className="flex flex-col gap-3">
            <FormStatus
              saving={submitting}
              submitted={fields.submitted}
              errorCount={errorCount}
              dirty={dirty}
            />
            <div className="flex justify-end gap-2.5">
              <Button
                variant="secondary"
                onClick={requestClose}
                disabled={submitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form={formId}
                loading={submitting}
                loadingLabel="Guardando…"
                disabled={!canSubmit}
              >
                {isEdit ? "Guardar cambios" : "Crear usuario"}
              </Button>
            </div>
          </div>
        }
      >
        <form
          id={formId}
          onSubmit={handleSubmit}
          noValidate
          className="flex flex-col gap-4"
        >
          {error ? (
            <ErrorAlert error={error} onClose={() => setError(null)} />
          ) : null}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField
              label="Nombre"
              name="nombre"
              required
              hideCounter
              maxLength={PERSON_NAME_MAX}
              value={values.nombre}
              onChange={(e) => set("nombre", sanitizePersonName(e.target.value))}
              onBlur={() => fields.touch("nombre")}
              error={shown("nombre")}
            />
            <TextField
              label="Apellido"
              name="apellido"
              required
              hideCounter
              maxLength={PERSON_NAME_MAX}
              value={values.apellido}
              onChange={(e) =>
                set("apellido", sanitizePersonName(e.target.value))
              }
              onBlur={() => fields.touch("apellido")}
              error={shown("apellido")}
            />
          </div>
          <TextField
            label="Correo"
            name="correo"
            type="email"
            autoComplete="off"
            required
            hideCounter
            value={values.correo}
            onChange={(e) => set("correo", sanitizeEmail(e.target.value))}
            onBlur={() => fields.touch("correo")}
            error={shown("correo")}
          />
          <TextField
            label="Teléfono"
            optional
            name="telefono"
            type="tel"
            inputMode="tel"
            placeholder={PHONE_PLACEHOLDER}
            hideCounter
            maxLength={PHONE_MAX}
            value={values.telefono}
            onChange={(e) => set("telefono", sanitizePhone(e.target.value))}
            onBlur={() => fields.touch("telefono")}
            error={shown("telefono")}
          />
          <PasswordField
            label={isEdit ? "Nueva contraseña" : "Contraseña"}
            optional={isEdit}
            name="contrasena"
            autoComplete="new-password"
            required={!isEdit}
            maxLength={PASSWORD_MAX_LENGTH}
            value={values.contrasena}
            onChange={(e) => set("contrasena", e.target.value)}
            onBlur={() => fields.touch("contrasena")}
            error={shown("contrasena")}
            hint={
              isEdit
                ? "Entre 8 y 20 caracteres. Déjala vacía para no cambiarla."
                : "Entre 8 y 20 caracteres."
            }
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <RoleSelect
              value={values.rol}
              onChange={(r) => set("rol", r)}
              error={serverErrors.rol}
              disabled={isSelf}
              hint={isSelf ? "No puedes cambiar tu propio rol." : undefined}
            />
            <ActiveSwitch
              checked={values.activo}
              onChange={(v) => set("activo", v)}
              disabled={isSelf}
              hint={isSelf ? "No puedes desactivar tu propia cuenta." : undefined}
            />
          </div>
        </form>
      </Drawer>

      <ConfirmDialog
        open={confirmDiscard}
        title="¿Descartar los cambios?"
        description="Los cambios que hiciste en este formulario no se guardarán."
        confirmLabel="Descartar"
        cancelLabel="Seguir editando"
        danger
        onConfirm={() => {
          setConfirmDiscard(false);
          onClose();
        }}
        onCancel={() => setConfirmDiscard(false)}
      />
    </>
  );
}
