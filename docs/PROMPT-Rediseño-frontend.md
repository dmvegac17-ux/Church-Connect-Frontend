# Handoff: Rediseño integral de Church Connect (miembro, admin y acceso)

## Resumen
Rediseño UX/UI de toda la aplicación Church Connect, que abarca tres áreas:
1. **Acceso:** inicio de sesión, registro y recuperación de contraseña.
2. **Vista de miembro:** inicio, eventos, cronogramas, ministerios, notificaciones y perfil.
3. **Panel de administración:** inicio con pendientes y CRUD de usuarios, eventos, cronogramas, ministerios y notificaciones.

El objetivo es mejorar la claridad, la navegación y la prevención de errores sin cambiar la lógica de negocio, los contratos de API ni los permisos.

## Sobre los archivos de diseño
Los archivos `.dc.html` de esta carpeta son **referencias de diseño hechas en HTML**: prototipos que muestran el aspecto y el comportamiento esperados. **No son código de producción para copiar.** La tarea es **recrear estos diseños en el repositorio existente `Church-Connect-Frontend`**, que usa React 19, TypeScript, Vite, Tailwind v4, react-router-dom 7, react-leaflet, lucide-react y framer-motion. Hay que seguir sus patrones, componentes, hooks y servicios.

Para verlos, abre cualquier `.dc.html` en un navegador; necesita `support.js` en la misma carpeta. Cada prototipo tiene abajo a la derecha un botón **Guía**, con el diagnóstico y las decisiones, y enlaces entre las tres vistas.

## Fidelidad
**Alta fidelidad.** Los colores, la tipografía, los espaciados, los radios, los estados y los textos son los definitivos. Hay que recrearlos fielmente con Tailwind y los componentes existentes del repositorio.

## Reglas de implementación (obligatorias)
- **No modificar** `src/services/*`, `src/types/*`, `src/auth/*` (salvo lo indicado), los contratos de API, las reglas de permisos ni la autorización del backend.
- **No cambiar las rutas** de `src/router.tsx`. Los formularios que en el diseño aparecen como panel lateral (usuario, ministerio, notificación) pueden convivir con las rutas actuales `/users/new`, `/users/:id/edit`, etc. Por ejemplo, la ruta puede abrir el panel sobre el listado, o el panel puede usarse desde el listado mientras la ruta sigue funcionando como página.
- **Reutilizar** `TextField`, `TextArea`, `PasswordField`, `Button`, `Checkbox`, `ActiveSwitch`, `RoleSelect`, `RichTextEditor`, `ConfirmDialog`, `ToastProvider/useToast`, `Spinner`, `ErrorAlert`, `EventLocationMap`, `EventLocationPicker`, `AddressAutocomplete` y `ScheduleTimeline`. Ajustar su estilo; no duplicarlos.
- **Aislar el panel de administración:** necesita su propio layout (`AdminShell`) con barra lateral, y `AppShell` sigue sirviendo a los miembros. Los estilos del admin no pueden afectar la vista de miembro: nada de selectores globales nuevos.
- Separar los cambios visuales de los que requieren lógica nueva (ver «Requiere backend o lógica»).
- Accesibilidad WCAG 2.2 AA:
  - foco visible, `aria-label` en los botones que solo tienen icono, `aria-invalid` en los campos con error y `role="alert"` en los mensajes;
  - objetivos táctiles de al menos 44 px en móvil;
  - no transmitir información solo con color.

---

## Tokens de diseño

### Colores
Los valores derivan de la paleta actual (`--primary #4a7c59`, `--background #faf8f5`, etc.), ajustados para cumplir el contraste AA. Se recomienda actualizar las variables de `src/index.css` a estos valores y mantener los nombres de las variables.

| Uso | Hex |
|---|---|
| Primario (botones, enlaces, foco) | `#3E6B4F` |
| Primario hover / barra lateral admin | `#2F5540` |
| Primario suave (fondos de icono, chips) | `#EEF3EE` · selección `#F3F7F2` · borde suave `#CFE0D3` |
| Fondo de página | `#F8F7F3` |
| Superficie (tarjetas, tablas) | `#FFFFFF` |
| Arena (avatares, rol Miembro) | `#F1EADF` · texto `#5E4E37` |
| Fondo de input en Acceso | `#F6F2EC` |
| Fondo de cabecera de tabla / pie de formulario | `#FBFAF7` |
| Segmentado / tabs (contenedor) | `#EFEAE1` |
| Hover secundario | `#F4F0E8` · `#F1EDE5` |
| Borde de tarjeta | `#E6E1D8` · divisor interno `#EFEAE1` / `#F2EEE7` |
| Borde de input | `#DDD6CA` · borde de botón secundario `#D3CCBF` |
| Texto principal | `#23261F` |
| Texto secundario | `#4C5047` · `#3A3D35` |
| Texto auxiliar (≥ 5:1 sobre blanco) | `#5F6259` |
| Iconos atenuados | `#6B6E65` · deshabilitado `#B9B6AD` |
| Éxito | `#2F7D4F` · fondo `#E3EEE5` · texto `#2B5A3E` |
| Información / rol Participante / No leída | fondo `#E4EEF6` · texto `#2A5C82` |
| Aviso / sin cronograma / cambios sin guardar | fondo `#FBF0D9` · texto `#7A5410` |
| Error / destructivo | `#A3372A` · hover `#862C21` · fondo `#FBEDEA` / `#FBE9E5` · borde `#E7C3BC` |
| Rol Administrador | fondo `#E3EEE5` · texto `#2B5A3E` |
| Botón deshabilitado | fondo `#ECE7DE` · texto `#7C7E76` · `cursor: not-allowed` |
| Toast | fondo `#23261F` · texto `#fff` · icono `#9FD0AE` · acción `#CFE6D5` |
| Overlay de modal | `rgba(35,38,31,0.45)` |

### Tipografía
- Familia: **Nunito Sans** (Google Fonts, pesos 400/600/700/800) para toda la aplicación.
- Iconos: el prototipo usa Material Symbols Rounded. **En el repositorio se usa `lucide-react`:** emplear su equivalente más cercano (ver «Iconos»).
- Escala:
  - H1 de página: 28px / 800 / letter-spacing −0.015em. El H1 de detalle mide 26px.
  - Título de Acceso: `clamp(30px, 3.6vw, 42px)` / 800.
  - H2 de sección: 17px / 800. El H2 dentro de un formulario mide 16px / 800.
  - Cuerpo: 15px / 400, line-height 1.5–1.6. Párrafo largo: 16px / 1.7.
  - Etiqueta de campo: 14px / 700. En el modal de cronograma mide 13px / 700.
  - Auxiliar y ayuda: 13px, color `#5F6259`. Badge: 12px / 700.
  - Encabezado de sección de la barra lateral («GESTIÓN»): 12px / 800, tracking 0.06em, color `#A9C2AF`.

### Espaciado, radios y sombras
- Escala de espaciado: 4 · 6 · 8 · 10 · 12 · 14 · 16 · 20 · 22 · 24 · 28 px. Padding de página: 28px en escritorio. Ancho máximo del contenido admin: 1200px.
- Radios:
  - botón pequeño o icono: 8–9px;
  - input y botón: 10px;
  - tarjeta o sección: 14px (16px en miembro);
  - modal: 16px;
  - badge o pastilla: 11–14px (completamente redondeado).
- Sombras:
  - tarjeta en hover: `0 4px 14px rgba(35,38,31,0.06)`;
  - tab seleccionada: `0 1px 3px rgba(35,38,31,0.12)`;
  - modal: `0 24px 48px rgba(35,38,31,0.22)`;
  - panel lateral: `-12px 0 32px rgba(35,38,31,0.16)`;
  - toast: `0 12px 32px rgba(35,38,31,0.25)`.
- Foco:
  - general: `outline: 3px solid #8DB59A; outline-offset: 2px`;
  - inputs: `border-color #3E6B4F` + `outline 3px solid #CFE0D3`, offset 0.

### Alturas de controles
- Inputs y botones: 42px en admin, 44px en miembro y 46–48px en Acceso.
- Botón de solo icono en tablas: 38×38. Fila de tabla: ~56px.

---

## Componentes base (definir una vez y reutilizar)
- **Botón primario:**
  - fondo `#3E6B4F`, texto blanco, 15px / 700, radio 10px; hover `#2F5540`;
  - deshabilitado con los colores de «Botón deshabilitado»;
  - variante de carga: el texto cambia («Guardando…», «Ingresando…») y el botón queda deshabilitado.
- **Botón secundario:** blanco, borde `#D3CCBF`, texto `#23261F`; hover `#F4F0E8`.
- **Botón destructivo secundario:** blanco, borde `#E7C3BC`, texto `#A3372A`; hover `#FBEDEA`. El rojo sólido (`#A3372A`) solo aparece dentro del diálogo de confirmación.
- **Botón de icono:** 38×38, transparente; hover `#F1EDE5`, y `#FBEDEA` si es para eliminar. Siempre lleva `aria-label` y `title`.
- **Campo:**
  - etiqueta arriba (14/700), input con borde `#DDD6CA`;
  - con error, borde `#A3372A` y mensaje de 13px en rojo con `role="alert"`;
  - el contador `n/máx` va a la derecha de la etiqueta;
  - «(opcional)» se muestra con peso 400 y color `#5F6259`.
- **Badge de estado:** pastilla de 26px de alto con punto de 7px (Activo/Inactivo) o icono de 15px.
- **Tabs segmentadas:**
  - contenedor `#EFEAE1` con padding 4 y radio 12;
  - tab de 34px; la seleccionada lleva fondo blanco y sombra;
  - la etiqueta incluye el conteo: «Próximos · 3»;
  - usan `aria-pressed` o `role="tab"` y hacen `flex-wrap`.
- **Estados vacíos:** icono de 46px en un cuadrado redondeado de color suave, título de 16px / 800, texto auxiliar y, si aplica, una acción.
- **Toast:** abajo y centrado, con `role="status"`, icono check, mensaje, acción opcional («Deshacer», «Crear cronograma») y botón de cerrar. Dura 5 segundos (6 si tiene «Deshacer»).
- **Diálogo de confirmación** (`ConfirmDialog`):
  - icono de advertencia, título y texto que nombra el elemento y las consecuencias;
  - botones «Cancelar» y acción roja;
  - opcionalmente, una acción alternativa como «Desactivar en su lugar».
- **Panel lateral (drawer):**
  - ancho `min(500px, 100%)`, cabecera con título y botón X;
  - cuerpo con scroll; pie fijo con una línea de estado y los botones Cancelar / Acción.
- **Barra de estado del formulario** (en el pie): icono más texto según el estado:
  - «Completa o corrige los campos obligatorios para continuar.» (aviso);
  - «Tienes cambios sin guardar.» (aviso);
  - «Sin cambios por guardar.»;
  - «Revisa los N campos marcados.» (error).

---

## Validaciones globales (miembro, admin y acceso)
Centralizarlas en `src/lib/validators.ts`, ampliando lo que ya existe:

| Campo | Regla | Saneado mientras se escribe |
|---|---|---|
| Nombre / Apellido (personas) | Obligatorio, 2–50 caracteres, solo letras (incluye acentos, ü y ñ) con espacios simples: `^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+( [A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+)*$` | Se eliminan números y caracteres especiales; se colapsan los espacios dobles; máximo 50 |
| Correo | Obligatorio, máximo 100, `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$` | Se eliminan los espacios; máximo 100 |
| Teléfono (opcional) | Si se llena: `^\+?\d{7,15}$` | Solo dígitos y un `+` al inicio; máximo 16 caracteres. Placeholder `+573001234567` |
| Contraseña | 8–20 caracteres; confirmación igual | `maxlength=20`; requisitos marcados en vivo |
| Título de evento | Obligatorio, máximo 150 | — |
| Descripción de evento | Obligatoria, máximo 2000 | — |
| Lugar | Obligatorio, máximo 200 · Dirección opcional, máximo 255 | — |
| Capacidad | Entero > 0 | — |
| Nombre de ministerio | Obligatorio, máximo 255 · Descripción opcional, máximo 255 | — |
| Notificación | Al menos un destinatario, título obligatorio (máximo 200), mensaje obligatorio (máximo 2000) | — |
| Actividad de cronograma | Título obligatorio (máximo 150), inicio y fin dentro del horario del evento, fin > inicio, responsable obligatorio | — |

**Botones:** todos los de enviar, crear, guardar y registrar quedan **deshabilitados** hasta que todos los campos obligatorios sean válidos y, en edición, hasta que haya cambios. Los errores por campo aparecen al salir del campo (blur) o cuando el valor cambia respecto del guardado.

Mensajes exactos:
- «Ingresa tu nombre.» / «Ingresa el nombre.»
- «Debe tener al menos 2 letras.»
- «Usa solo letras, sin números ni caracteres especiales.»
- «Ingresa el correo.»
- «Escribe un correo válido, por ejemplo nombre@dominio.com.»
- «Máximo 100 caracteres.»
- «Usa solo números (7 a 15) y, si quieres, el indicativo con + al inicio.»
- «Ya existe un usuario con este correo.»

---

## Pantallas

### A. Acceso (`/login`, `/register`) → `LoginPage.tsx`, `RegisterPage.tsx`, `AuthLayout.tsx`, `SocialButtons.tsx`
- **Layout:** grid de 2 columnas, `repeat(auto-fit, minmax(min(100%,420px),1fr))`; en móvil las columnas se apilan.
- **Columna izquierda** (fondo `#3E6B4F`, texto blanco, padding `clamp(28px,6vw,72px)`):
  - logo (`BrandLogo`, círculo blanco de 64px) y «Church Connect» en 28/800;
  - título «Conectados con tu fe, conectados contigo»;
  - párrafo de 17px, color `#E3ECE5`;
  - cuatro beneficios con icono en un círculo `rgba(255,255,255,0.16)`: «Acceso a eventos y horarios», «Únete a ministerios», «Comunidad en línea» y «Recursos espirituales»;
  - versículo (`DailyVerse`) en cursiva, separado por un borde superior `rgba(255,255,255,0.2)`.
- **Columna derecha:** formulario de 460px de ancho máximo, centrado.
  - Tabs «Iniciar sesión» / «Registrarse» (contenedor `#F1EDE5`, tab de 44px). Cada tab navega a su ruta.
  - **Iniciar sesión:**
    - correo con icono de sobre y contraseña con icono de candado y botón de mostrar/ocultar;
    - «Recordarme» (checkbox) y «¿Olvidaste tu contraseña?»;
    - botón «Iniciar sesión» de 48px, que se deshabilita si los campos no son válidos;
    - separador «o continúa con» y botones Google / Facebook;
    - si las credenciales fallan, aviso arriba del formulario: «El correo o la contraseña no son correctos. Revisa los datos e inténtalo de nuevo.»;
    - **con éxito, redirige directamente a `/`** (el Inicio que corresponda al rol), sin pantalla intermedia.
  - **Registrarse:**
    - Nombre y Apellido en 2 columnas, Correo, Teléfono (opcional), Contraseña y Confirmar contraseña (**cada uno con su propio botón de mostrar/ocultar**);
    - lista de requisitos en vivo: «Entre 8 y 20 caracteres» y «Las contraseñas coinciden»;
    - checkbox «Acepto los términos y condiciones y la política de privacidad»;
    - botón «Crear cuenta» y nota «Al registrarte, aceptas recibir comunicaciones de nuestra iglesia»;
    - **con éxito, entra directamente a `/` como miembro.**
  - **Recuperar contraseña:**
    - vista dentro de Acceso: «Volver a iniciar sesión», campo de correo y «Enviar enlace»;
    - al enviar se confirma con «Revisa tu correo». Es solo UI: requiere un endpoint (ver «Requiere backend o lógica»).

### B. Vista de miembro → `AppShell.tsx`, `Navbar.tsx`, `config/navigation.ts`
- **Barra superior verde** (`--header`): logo, navegación horizontal (Inicio · Eventos · Cronogramas · Ministerios · Notificaciones), campana con contador de no leídas (`useUnreadNotificationsCount`) y menú de usuario (Mi perfil · Cerrar sesión).
  - El ítem activo lleva `aria-current="page"`.
  - En móvil, menú hamburguesa con un panel desplegable de ítems de 48px.
- **Inicio** (`HomePage.tsx`): saludo según la hora («Buenos días / Buenas tardes / Buenas noches») con la fecha larga. Debajo, una tarjeta del próximo evento con su fecha relativa y la sección «Avisos sin leer», con «Ver todas».
- **Eventos** (`EventsListPage.tsx`, `EventDetailPage.tsx`):
  - tabs Próximos / Pasados / Todos con conteo, buscador por nombre o lugar y tarjetas con un bloque de fecha (mes en 11px/800 y día en 19px/800);
  - el detalle incluye ruta de regreso, descripción, datos (fecha, horario, capacidad), lugar con mapa (`EventLocationMap`), «Abrir en Google Maps» y cronograma (`ScheduleTimeline`).
- **Eventos de varios días:**
  - el bloque de fecha muestra el rango (p. ej. «14–16 OCT»);
  - el detalle muestra «Del martes 14 al jueves 16 de octubre de 2026», con el horario de inicio y de fin por separado.
- **Cronogramas** (`SchedulesListPage.tsx`): selector de evento y actividades ordenadas por fecha y hora, con su horario y responsable.
- **Ministerios** (`MinistriesListPage.tsx`, `MinistryDetailPage.tsx`): grid `auto-fill minmax(280px,1fr)` con icono, nombre, descripción en 2 líneas y número de integrantes. El detalle muestra la descripción completa y la lista de integrantes.
- **Notificaciones** (`NotificationsListPage.tsx`, `NotificationDetailPage.tsx`):
  - tabs Todas / No leídas; las no leídas se resaltan con fondo `#F7FAF6`, título en 800 y un punto con el texto «Nueva»;
  - al abrir una notificación se marca como leída;
  - el detalle conserva los saltos de línea (`white-space: pre-line`);
  - **nuevo:** el miembro puede eliminar sus propias notificaciones desde la papelera de cada fila (44×44, hover rojo) o desde el botón «Eliminar» del detalle. No pide confirmación: muestra el toast «Notificación eliminada.» con **Deshacer** (6 s). Requiere backend (ver abajo);
  - si no queda ninguna notificación, se muestra el estado vacío «No tienes notificaciones».
- **Mi perfil** (`ProfilePage.tsx`):
  - formulario de datos (Nombre, Apellido, Correo, Teléfono) con línea de estado, «Descartar» y «Guardar cambios» (deshabilitado si no hay cambios o hay errores);
  - bloque de contraseña con requisitos en vivo y «Actualizar contraseña».

### C. Panel de administración → nuevo `AdminShell` y las páginas de `pages/users`, `events`, `schedules`, `ministries` y `notifications`
- **Barra lateral fija** de 252px, fondo `#2F5540`, altura 100vh y `position: sticky`:
  - logo con el texto «ADMINISTRACIÓN»;
  - navegación: Inicio; sección «GESTIÓN» con Usuarios, Eventos, Cronogramas, Ministerios y Notificaciones;
  - ítems de 42px con icono de 21px; el activo lleva fondo `rgba(255,255,255,0.14)` y peso 800;
  - abajo, la tarjeta del usuario (avatar arena, nombre, «Administrador · Mi perfil») y «Cerrar sesión» en `#F3C9C0`;
  - por debajo de 960px se convierte en una barra superior de 60px con hamburguesa y un panel deslizable de 280px.
- **Inicio admin:**
  - saludo, fecha y accesos rápidos: Nuevo usuario, Nuevo evento, Enviar notificación y Nuevo ministerio;
  - tarjeta **«Requiere atención»**, una fila por pendiente con su acción:
    - eventos próximos sin cronograma → «Crear cronograma»;
    - N notificaciones sin leer → «Ver»;
    - N usuarios inactivos → «Revisar»;
    - si no hay pendientes, muestra «Todo está al día»;
  - tarjeta «Próximos eventos» con el estado del cronograma de cada uno y pastillas de conteo (Usuarios, Eventos próximos, Ministerios) que enlazan a cada sección.
- **Usuarios:**
  - tabla con columnas Usuario (avatar, nombre, correo y «(tú)»), Rol (badge de color), Estado, Creado y Acciones (editar / eliminar);
  - búsqueda por nombre o correo en **todos** los usuarios, filtros Rol y Estado, «Limpiar filtros» y paginación de 8 por página;
  - la propia cuenta no puede eliminarse: la papelera aparece deshabilitada y su `aria-label` lo explica;
  - eliminar abre la confirmación con la alternativa «Desactivar en su lugar»;
  - el formulario (en panel lateral) tiene Nombre, Apellido, Correo, Teléfono, Contraseña (en edición: «Nueva contraseña (opcional)»), Rol y el interruptor Activo/Inactivo. No se puede cambiar el propio rol ni el propio estado.
- **Eventos:**
  - tabla con Evento (bloque de fecha, nombre, horario y estado), Lugar, Capacidad, Cronograma (badge «N actividades» o «Sin cronograma» en color de aviso) y Acciones (cronograma, editar, eliminar);
  - tabs con conteo y buscador;
  - el detalle va en dos columnas: información con mapa y el cronograma con el botón «Crear/Editar cronograma».
  - **Formulario de evento** (página, máximo 860px):
    - sección «Información»: Título, Descripción y Capacidad;
    - sección «Fecha y hora»: fecha y hora de inicio y fin en grid;
    - sección «Lugar y mapa»: Lugar, Dirección con autocompletado, `EventLocationPicker` y un «Coordenadas manuales» plegable;
    - barra de acciones fija abajo (sticky) con la línea de estado, Cancelar y Crear/Guardar.
  - **Reglas de fecha y hora del evento:**
    - al elegir la fecha de inicio, la de fin no puede ser anterior;
    - si el evento termina el mismo día, en la hora de fin se **deshabilitan** las horas iguales o menores a la de inicio;
    - la hora se elige con selectores de hora y de minutos (cualquier minuto 00–59, no solo intervalos), alineados en la misma fila.
  - Al crear un evento aparece el toast «Evento «X» creado.» con la acción **«Crear cronograma»**.
- **Modal de cronograma** (un solo componente para crear y editar, usado desde Eventos, el detalle de evento, Cronogramas e Inicio):
  - **Cabecera:** «Cronograma de «Evento»», la fecha y el horario. Si se abre desde «Nuevo cronograma», incluye un selector de evento.
  - **Barra de tiempo:** «Tiempo asignado: X» / «Disponible: Y», con una barra de 8px que se vuelve roja si se excede.
  - **Cada actividad es una tarjeta** con «Actividad N», botones subir / bajar / eliminar y un campo Título.
    - **Inicio y Fin:** selectores de hora y de minutos. **Solo se habilitan las horas y minutos dentro del horario del evento**; el fin solo admite valores posteriores al inicio, y si el inicio cambia y el fin queda antes, el fin se borra. Debajo va la ayuda «Solo se habilitan horas dentro del horario del evento: 06:00 a. m. – 11:00 a. m.».
    - **Responsable:** lista desplegable propia con buscador (nombre o correo) y **scroll** (máximo 220px de alto). Muestra los usuarios activos con avatar, nombre, rol y correo, y un check en el elegido.
    - Al lado va el botón visible **«Registrar participante nuevo»** (fondo `#EEF3EE`, borde `#3E6B4F`, texto `#2F5540`, 800, icono person_add). Abre un mini formulario dentro de la tarjeta, con fondo `#F3F7F2` y borde `#CFE0D3`:
      - campos Nombre, Apellido y **Correo (obligatorio)**, con las mismas validaciones;
      - «Registrar participante» queda deshabilitado mientras haya errores;
      - al registrarlo, crea el usuario con el rol **Participante** y lo asigna como responsable;
      - si el correo ya existe, avisa con «elígelo de la lista».
    - Descripción opcional, en un bloque plegable.
  - «+ Agregar actividad»: borde punteado; la nueva actividad empieza en la hora de fin de la anterior.
  - «Guardar cronograma» se habilita solo si hay cambios, todas las actividades son válidas y no se excede el tiempo. Cerrar con cambios pide confirmación para descartarlos.
- **Cronogramas (lista admin):** tabla con Actividad, Evento (enlace y fecha), Horario, Responsable (nombre del usuario) y Acciones (editar en el modal, eliminar actividad con confirmación). Filtro por evento y estado vacío con «Crear cronograma».
- **Ministerios:**
  - grid de tarjetas igual al de miembro;
  - el detalle tiene Editar y Eliminar (con confirmación), Descripción y Miembros (avatar, correo, rol, «Quitar»);
  - **quitar un miembro pide confirmación** («¿Quitar a X de Ministerio?») y luego muestra el toast con «Deshacer»;
  - «Agregar miembros» abre un modal con buscador y selección múltiple; el botón dice «Asignar N personas».
- **Notificaciones (admin):**
  - vista tipo bandeja: lista a la izquierda y lector a la derecha en escritorio; en pantallas estrechas, uno a la vez;
  - una sola fila de filtros: tabs Todas / No leídas / Leídas, filtro por destinatario (búsqueda de usuario específico; el menú se muestra por encima del lector, sin cortarse) y búsqueda de texto;
  - el lector muestra el título, «Para: Nombre <correo>», la fecha, el estado, el cuerpo con saltos de línea, y Editar / Eliminar.
  - **Redactar** (estilo correo / Gmail): ventana con los campos «Para» (chips de destinatarios y lista con casillas; al seleccionar se marca solo la casilla, sin resaltar el nombre; accesos rápidos «Todos los activos», «Todos» y «Limpiar»), «Asunto» y el cuerpo con `RichTextEditor`.
    - El botón «Enviar» se habilita solo cuando hay al menos un destinatario, asunto y mensaje. Toast: «Notificación enviada a N personas.».
  - Editar una notificación enviada: el destinatario queda bloqueado y se pueden cambiar el título, el mensaje y el estado leída/no leída.
- **Mi perfil (admin):** el mismo formulario de datos que el de miembro, con las mismas validaciones.

---

## Interacciones y comportamiento
- **Escape** cierra, en este orden: confirmación → modal de asignar → lista de destinatarios → modal de cronograma → panel lateral → menú móvil.
- **Confirmación** para las acciones destructivas que no se pueden deshacer: eliminar usuario, evento (indica cuántas actividades se borran con él), ministerio, notificación (admin), actividad de cronograma, quitar miembro de un ministerio y descartar cambios.
- **Deshacer** con toast para las acciones reversibles: quitar un miembro y eliminar una notificación propia (miembro).
- **Cargando:** el botón muestra el texto en curso y queda deshabilitado; los listados usan el `Spinner` existente o un esqueleto.
- **Cambios sin guardar:** al cerrar un panel lateral, un formulario o el modal con cambios, se pide confirmación.
- **Responsive:**
  - el admin pasa a barra superior por debajo de 960px;
  - las tablas usan `overflow-x: auto` con `min-width` de 720–760px;
  - los grids usan `auto-fit`/`auto-fill` con `minmax(min(100%, X), 1fr)`;
  - los botones y tabs hacen wrap y no cortan el texto (`white-space: nowrap` en las etiquetas).

## Estado
Se reutilizan los hooks existentes (`useUsers`, `useEvents`, `useSchedules`, `useMinistries`, `useMinistryMembers`, `useNotifications`, `useUnreadNotificationsCount`, `useUserOptions`, `useEventOptions`, etc.). Estado local nuevo por pantalla:
- Filtros: `query`, `roleFilter`, `statusFilter`, `page`, `eventTab`, `notifTab`, `recipientFilter`.
- Formularios: `values`, `initialValues` (para calcular `dirty`), `touched`, `submitted` y `errors` (derivados de los validadores).
- Modal de cronograma: `rows[]`, `openPickerRowId`, `pickerQuery` y `newParticipant` ({ rowId, nombre, apellido, correo }).
- Toast con acción opcional (ampliar `ToastProvider` para aceptar `{ message, actionLabel, onAction, duration }`).

## Requiere backend o lógica (separado de lo visual)
1. **Eliminar notificaciones propias (miembro):** según `router.tsx`, eliminar es solo para ADMIN. Hace falta un endpoint como `DELETE /notifications/:id` que el destinatario pueda usar, o un borrado lógico.
2. **Registrar participante desde el cronograma:** usa la creación de usuario existente con rol Participante. Hay que confirmar si el backend exige contraseña. Si la exige, generarla en el servidor o enviar una invitación.
3. **Búsqueda de usuarios en el servidor**, no solo en la página actual.
4. **Recuperar contraseña:** hace falta un endpoint para enviar el enlace.
5. **Validación de nombres y teléfonos también en el backend**, con las mismas expresiones.
6. **Opcionales:** evitar el solapamiento de actividades del cronograma, agrupar las notificaciones enviadas juntas, borrado recuperable de eventos y ministerios, y revisar los usuarios duplicados (p. ej. «Diana Campos Cifuentes» con dos correos).

## Iconos (Material Symbols → lucide-react)
| Material | lucide |
|---|---|
| space_dashboard | LayoutDashboard |
| group | Users |
| calendar_month / calendar_today / event | Calendar |
| list_alt | ListChecks |
| diversity_3 | UsersRound |
| notifications | Bell |
| person / person_add / person_remove | User / UserPlus / UserMinus |
| logout | LogOut |
| search | Search |
| edit | Pencil |
| delete | Trash2 |
| edit_calendar | CalendarCog |
| event_busy | CalendarX |
| event_available | CalendarCheck |
| warning | TriangleAlert |
| check_circle | CircleCheck |
| error | CircleAlert |
| info | Info |
| schedule | Clock |
| location_on | MapPin |
| open_in_new | ExternalLink |
| arrow_back | ArrowLeft |
| arrow_upward / arrow_downward | ArrowUp / ArrowDown |
| chevron_left / chevron_right | ChevronLeft / ChevronRight |
| expand_more / expand_less | ChevronDown / ChevronUp |
| close | X |
| menu | Menu |
| send | Send |
| mail | Mail |
| lock | Lock |
| visibility / visibility_off | Eye / EyeOff |
| check_box / check_box_outline_blank | SquareCheck / Square |
| done_all | CheckCheck |
| mark_email_unread | MailWarning |
| person_off | UserX |
| menu_book | BookOpen |
| record_voice_over | Mic |
| music_note | Music |
| volunteer_activism | HandHeart |
| handshake | Handshake |
| child_care | Baby |
| waving_hand | Hand |

## Recursos
- Logo: `src/assets/logo.png` (existente). En el prototipo aparece como un círculo con la letra «C».
- El mapa (Leaflet) y el editor de texto enriquecido figuran como marcadores en los prototipos: usar los componentes existentes.
- Los datos de los prototipos (usuarios, eventos, ministerios) son de ejemplo.

## Orden sugerido de implementación
1. Tokens en `index.css`, Nunito Sans y validadores en `lib/validators.ts`.
2. Componentes base: Button, campos, badges, tabs, estado vacío, toast con acción y ConfirmDialog.
3. Acceso (Login, Register y redirección directa).
4. `AdminShell` y las rutas admin dentro de él.
5. Pantallas admin, en este orden: Usuarios → Eventos (lista, detalle, formulario) → modal de Cronograma → Cronogramas → Ministerios → Notificaciones → Inicio admin.
6. Vista de miembro: Navbar, Inicio, Eventos, Cronogramas, Ministerios, Notificaciones (más la eliminación propia, una vez que el backend la permita) y Perfil.
7. Verificación: `npm run typecheck`, `npm run build`, navegación solo con teclado, contraste y prueba en 375, 768, 1280 y 1440 px.

## Archivos de esta carpeta
- `Church Connect Acceso.dc.html`: inicio de sesión, registro y recuperación.
- `Church Connect Miembro.dc.html`: vista de miembro y su guía.
- `Church Connect Admin.dc.html`: panel de administración y su guía.
- `support.js`: runtime necesario para abrir los prototipos en el navegador; no forma parte de la implementación.
