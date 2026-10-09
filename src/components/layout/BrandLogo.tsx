import logoUrl from "../../assets/logo.png";

/**
 * Isotipo "CC" de Church Connect dentro de un círculo blanco con una sombra
 * suave, para que se lea igual sobre el header verde y sobre fondos claros.
 * El dibujo ocupa el 68 % del círculo, así nunca toca el borde.
 * Decorativo: el nombre de la marca va siempre como texto al lado.
 */
export function BrandLogo({ className = "size-9" }: { className?: string }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.1)] ${className}`}
    >
      <img
        src={logoUrl}
        alt=""
        aria-hidden="true"
        className="size-[68%] object-contain"
      />
    </span>
  );
}
