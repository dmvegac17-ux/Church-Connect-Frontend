import "@testing-library/jest-dom/vitest";

import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

import { resetActivity } from "../auth/useIdleSession";
import { resetTableStore } from "../components/ui/DataTable";

afterEach(() => {
  cleanup();
  // El orden y el paginador se guardan por tabla: cada prueba parte de cero.
  resetTableStore();
  localStorage.clear();
  // La última actividad también vive en memoria: cada prueba parte sin uso previo.
  resetActivity();
});
