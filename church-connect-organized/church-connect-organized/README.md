# Church Connect

Proyecto frontend organizado a partir del código entregado.

## Estructura

- `src/components/layout` → navegación y pie de página.
- `src/components/home` → portada, servicios y contacto.
- `src/components/events` → eventos, filtros, tarjetas y modal.
- `src/components/modals` → modales de contacto/asistencia.
- `src/components/auth` → componentes de autenticación que venían en el código original.
- `src/data` → información editable de servicios, contactos y eventos.
- `src/types` → interfaces y tipos TypeScript.
- `src/styles` → estilos globales.
- `src/App.tsx` → composición principal.
- `src/main.tsx` → punto de entrada.

## Ejecutar

```bash
npm install
npm run dev
```

Luego abre la dirección local que muestre Vite.

## Build

```bash
npm run build
```

Los datos originales se conservaron como base; la principal modificación fue separar responsabilidades y eliminar la mezcla de varios archivos dentro de un único `index.html`.
