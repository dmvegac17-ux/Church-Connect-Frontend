import { RefreshCw } from "lucide-react";
import { useState } from "react";

import { requestRefresh } from "../../lib/refresh";
import { Button } from "../forms/Button";

/**
 * «Actualizar» de una pantalla: va junto a su título y trae lo último de lo
 * que se está viendo, sin perder filtros ni lo escrito. El icono gira un
 * momento para confirmar el clic.
 */
export function RefreshButton() {
  const [spinning, setSpinning] = useState(false);

  return (
    <Button
      variant="secondary"
      title="Volver a consultar los datos de esta pantalla"
      onClick={() => {
        requestRefresh();
        setSpinning(true);
        window.setTimeout(() => setSpinning(false), 700);
      }}
    >
      <RefreshCw
        className={`size-[18px] shrink-0 ${spinning ? "animate-spin" : ""}`}
        aria-hidden="true"
      />
      Actualizar
    </Button>
  );
}
