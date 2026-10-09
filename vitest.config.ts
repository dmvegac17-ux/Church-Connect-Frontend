import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Configuración aparte de `vite.config.ts`: las pruebas no necesitan Tailwind.
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    env: {
      // Valor ficticio: los servicios se simulan, nunca se llama a la red.
      VITE_BACKEND_BASE_URL: "http://backend.test",
    },
  },
});
