import { ToastProvider } from "./components/feedback/ToastProvider";
import { AppRoutes } from "./router";

export function App() {
  return (
    <ToastProvider>
      <AppRoutes />
    </ToastProvider>
  );
}
