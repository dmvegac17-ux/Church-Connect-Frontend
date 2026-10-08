import { useEffect, useState } from "react";

import { msUntilNextDay, verseForDate } from "../../lib/dailyVerse";

/**
 * Versículo del día para el header: solo la cita y su referencia, en una
 * línea (se recorta con "…" si no cabe; el texto completo queda en `title`).
 * Cambia solo a medianoche aunque la pestaña siga abierta.
 */
export function DailyVerse({ className = "" }: { className?: string }) {
  const [verse, setVerse] = useState(() => verseForDate());

  useEffect(() => {
    // +1 s de margen para caer con seguridad en el día siguiente.
    const timer = setTimeout(
      () => setVerse(verseForDate()),
      msUntilNextDay() + 1000,
    );
    return () => clearTimeout(timer);
  }, [verse]);

  const full = `${verse.text} — ${verse.reference}`;

  return (
    <p className={`truncate text-center text-sm ${className}`} title={full}>
      <span className="italic">{verse.text}</span>
      <span className="font-medium"> — {verse.reference}</span>
    </p>
  );
}
