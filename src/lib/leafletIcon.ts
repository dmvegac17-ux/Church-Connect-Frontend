import L from "leaflet";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

/**
 * Leaflet calcula las URLs de su ícono por defecto a partir de la ubicación
 * de su propio CSS, lo que no funciona con el bundling de Vite. Se
 * reasignan explícitamente a los assets importados (Vite los resuelve y
 * hashea igual que cualquier otro import de imagen).
 */
export function fixLeafletDefaultIcon(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;

  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  });
}
