import { useCallback, useState } from "react";

/**
 * Controla cuándo se muestra el error de cada campo: al salir de él (blur)
 * o después de intentar enviar. Los errores se calculan fuera, a partir de
 * los valores; este hook solo decide su visibilidad.
 */
export function useTouched<K extends string>() {
  const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);

  const touch = useCallback((field: K) => {
    setTouched((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  }, []);

  const reset = useCallback(() => {
    setTouched({});
    setSubmitted(false);
  }, []);

  /** Error visible del campo, o `undefined` si todavía no toca mostrarlo. */
  const visible = (
    errors: Partial<Record<K, string | undefined>>,
    field: K,
  ): string | undefined =>
    touched[field] || submitted ? errors[field] : undefined;

  return { touch, visible, submitted, setSubmitted, reset };
}
