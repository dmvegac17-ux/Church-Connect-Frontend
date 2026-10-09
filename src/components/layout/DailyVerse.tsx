import { useEffect, useState } from "react";

import { msUntilNextDay, verseForDate } from "../../lib/dailyVerse";

/**
 * Versículo del día como cita: texto en cursiva y referencia debajo.
 * Cambia solo a medianoche aunque la pestaña siga abierta. Los colores los
 * pone quien lo usa (panel verde de Acceso, tarjeta del Inicio).
 */
export function DailyVerse({
  className = "",
  textClassName = "",
  referenceClassName = "",
}: {
  className?: string;
  textClassName?: string;
  referenceClassName?: string;
}) {
  const [verse, setVerse] = useState(() => verseForDate());

  useEffect(() => {
    // +1 s de margen para caer con seguridad en el día siguiente.
    const timer = setTimeout(
      () => setVerse(verseForDate()),
      msUntilNextDay() + 1000,
    );
    return () => clearTimeout(timer);
  }, [verse]);

  return (
    <figure className={className}>
      <blockquote className={`italic ${textClassName}`}>
        “{verse.text.replace(/^[“"]|[”"]$/g, "")}”
      </blockquote>
      <figcaption className={`mt-1.5 font-extrabold ${referenceClassName}`}>
        {verse.reference}
      </figcaption>
    </figure>
  );
}
