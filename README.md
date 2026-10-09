# Church Connect — Frontend

SPA en **React 19 + Vite + TypeScript + TailwindCSS v4** que consume la API REST
del backend `Church-Connect-backend` (FastAPI). Implementa el flujo de
**registro**, **inicio de sesión** y **gestión de usuarios (CRUD)** con control
de acceso por roles (`ADMIN`, `PARTICIPANT`, `MEMBER`).

## Requisitos

- Node.js 20+
- Backend corriendo en `http://localhost:8000` (con `CORSMiddleware` habilitado
  para el origen del frontend — ya configurado vía `CORS_ORIGINS` en el backend).

## Puesta en marcha

```bash
npm install
cp .env.example .env   # ajusta VITE_BACKEND_BASE_URL si el backend no está en :8000
npm run dev            # http://localhost:5173
```

Scripts:

| Script | Descripción |
|---|---|
| `npm run dev` | Servidor de desarrollo (Vite) |
| `npm run build` | Type-check (`tsc -b`) + build de producción |
| `npm run preview` | Sirve el build de `dist/` |
| `npm run typecheck` | Solo verificación de tipos |

## Configuración

Toda variable sensible se lee de `.env` (`import.meta.env`):

| Variable | Ejemplo (local) | Descripción |
|---|---|---|
| `VITE_BACKEND_BASE_URL` | `http://localhost:8000` | URL base del backend (sin `/api/v1`, sin barra final). Obligatoria: si falta, la app no arranca y registra el error en la consola |

## Diseño

Paleta de la iglesia (verde + tonos tierra) definida como *design tokens* en
[`src/index.css`](src/index.css): `:root` (claro) y `.dark` (oscuro, vía la
variante `dark` de Tailwind v4). Los componentes usan **solo clases semánticas**
(`bg-primary`, `text-foreground`, `border-border`, `bg-card`,
`bg-input-background`, `text-destructive`, `ring-ring`…), nunca colores crudos.
Las pantallas de `/login` y `/register` reproducen el diseño de dos paneles
(marca a la izquierda, formulario con selector de pestañas a la derecha).

> Los botones de Google/Facebook y "¿Olvidaste tu contraseña?" son de la maqueta:
> el backend aún no expone OAuth ni recuperación, así que informan
> "disponible próximamente". "Recordarme" alterna `localStorage` (persistente)
> vs `sessionStorage` (solo la pestaña actual).

## Arquitectura

```
src/
├── config/env.ts          Constantes y lectura de VITE_BACKEND_BASE_URL
├── lib/
│   ├── httpClient.ts       fetch wrapper: base URL, Bearer, desempaca ResponsePayload, ApiError
│   ├── formErrors.ts       Mapea errores 422 ("body.campo: msg") a cada input
│   ├── validators.ts       Validaciones de cliente + foco al primer error
│   └── format.ts           Formato de fechas
├── types/
│   ├── api.ts              ResponsePayload<T>, ApiError
│   └── user.ts             User, UserRole, *DTO, TokenResponse, JwtClaims
├── services/
│   ├── authService.ts      register(), login()      → /auth/*
│   └── userService.ts      list/getById/create/update/remove → /users
├── auth/
│   ├── AuthContext.tsx     Sesión: user, token, role, isAuthenticated, login/register/logout
│   ├── useAuth.ts          Hook de consumo
│   ├── jwt.ts              decodeJwt(), isExpired()
│   └── ProtectedRoute.tsx  Guarda por autenticación y por rol (requiredRole)
├── hooks/
│   ├── useUsers.ts         Listado + paginación server-side (meta.totalUsers) + refetch
│   └── useUser.ts          Detalle por id
├── pages/
│   ├── auth/               LoginPage, RegisterPage
│   ├── profile/            ProfilePage (datos propios + cambio de contraseña)
│   └── users/              UsersListPage, UserCreatePage, UserDetailPage, UserEditPage (solo ADMIN)
├── components/
│   ├── forms/              TextField, PasswordField, RoleSelect, ActiveSwitch, Button
│   ├── feedback/           Alert/ErrorAlert, ToastProvider, ConfirmDialog, Spinner
│   ├── layout/             AppShell, Navbar, AuthLayout, Page (header/card)
│   └── users/              Badges (rol / activo)
├── router.tsx             Rutas públicas (/login, /register) y privadas
└── main.tsx               BrowserRouter → AuthProvider → App
```

## Reglas de negocio implementadas

- **Sesión**: token JWT en `localStorage` (clave `cc_token`). Al montar la app se
  rehidrata y se valida `exp`. Un token expirado o cualquier respuesta `401`
  cierra la sesión y redirige a `/login`.
- **Redirección tras login**: `ADMIN → /users`, resto `→ /profile` (o a la ruta
  que se intentaba abrir).
- **Guardas**: rutas privadas exigen sesión; `/users/*` exige rol `ADMIN`
  (si no, `/403`).
- **Perfil propio**: edita `nombre`/`apellido`/`correo`/`telefono`; la contraseña
  se cambia en una sección aparte enviando solo `contrasena` en el `PUT`.
- **CRUD ADMIN**: crear (con `rol` y `activo`), editar (incl. `rol`/`activo`),
  eliminar (con modal de confirmación). La contraseña de otro usuario no se puede
  editar (campo oculto; el backend responde `403`).
- **Errores**: `ErrorAlert` renderiza `message` + lista `errors` del envelope;
  los `422` se mapean campo por campo.
