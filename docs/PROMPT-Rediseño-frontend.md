# Handoff: Rediseño de Church Connect (Acceso, Miembro y Administrador)

## Resumen
Rediseño UX/UI completo de Church Connect para implementarlo en el repositorio `Church-Connect-Frontend` (React 19 + TypeScript + Vite + Tailwind v4 + react-router-dom 7 + react-leaflet + lucide-react).

La aplicación tiene **dos roles: Administrador y Miembro**. «Participante» **no es un rol**: es la situación de quien está asignado a una actividad de un evento, y puede ser cualquier usuario activo, incluido un administrador.

## Sobre los archivos de diseño
Los `.dc.html` son **prototipos de referencia en HTML**: muestran el aspecto y el comportamiento esperados, pero no son código de producción. La tarea es **recrearlos en el repositorio existente** con sus componentes, hooks, servicios y patrones. Para verlos, abre cada archivo en el navegador; `support.js` debe estar en la misma carpeta. Los datos de los prototipos son de ejemplo.

- `Church Connect Acceso.dc.html`: inicio de sesión, registro y recuperación de contraseña.
- `Church Connect Miembro.dc.html`: vista de miembro, que incluye confirmar participaciones, inscripciones e inicio configurable.
- `Church Connect Admin.dc.html`: panel de administración.

**Fidelidad:** alta. Colores, tipografía, espaciados, estados y textos son definitivos.

## Reglas de implementación
- No modificar contratos de API, `services/*`, `types/*` ni la autorización del backend sin acordarlo. Lo que requiere backend está en la lista «Requiere backend».
- No cambiar rutas existentes. Las secciones nuevas se agregan como rutas nuevas.
- Reutilizar `TextField`, `TextArea`, `PasswordField`, `Button`, `Checkbox`, `ActiveSwitch`, `RoleSelect`, `RichTextEditor`, `ConfirmDialog`, `ToastProvider`, `Spinner`, `ErrorAlert`, `EventLocationMap`, `EventLocationPicker`, `AddressAutocomplete`, `ScheduleTimeline` y `ResponsiblePicker`: se ajusta su estilo, no se duplican.
- El panel de administración va en su propio layout (`AdminShell`, con barra lateral). `AppShell` queda para miembros. No usar selectores globales nuevos.
- Accesibilidad WCAG 2.2 AA:
  - foco visible;
  - `aria-label` en los botones que solo tienen icono;
  - `aria-invalid` y `role="alert"` en los errores;
  - `aria-sort` en los encabezados de tabla ordenables;
  - objetivos táctiles de 44 px o más en móvil;
  - no comunicar estados solo con color.

---

## Tokens

### Colores
| Uso | Hex |
|---|---|
| Primario / enlaces / foco | `#3E6B4F` · hover `#2F5540` |
| Barra lateral del administrador | `#2F5540` |
| Primario suave | `#EEF3EE` · selección `#F3F7F2` · borde `#CFE0D3` |
| Fondo / superficie | `#F8F7F3` / `#FFFFFF` |
| Arena (avatares, rol Miembro) | `#F1EADF` / texto `#5E4E37` |
| Cabecera de tabla y pie de formulario | `#FBFAF7` |
| Contenedor de tabs | `#EFEAE1` |
| Bordes | tarjeta `#E6E1D8` · input `#DDD6CA` · botón secundario `#D3CCBF` · divisor `#EFEAE1` / `#F2EEE7` |
| Texto | principal `#23261F` · secundario `#4C5047` / `#3A3D35` · auxiliar `#5F6259` |
| Éxito / Aceptada / rol Administrador | `#E3EEE5` / `#2B5A3E` · icono `#2F7D4F` |
| Información / No leída / autoasignación | `#E4EEF6` / `#2A5C82` · borde `#C9DCEC` |
| Aviso / Pendiente / pocos cupos / lleno | `#FBF0D9` / `#7A5410` (texto en caja de aviso `#5E4210`) · borde `#F0DDB4` · barra `#A8741A` |
| Error / Rechazada / agotado / sobrecupo | `#A3372A` · hover `#862C21` · fondo `#FBE9E5` / `#FBEDEA` · borde `#E7C3BC` / `#F4DCD6` |
| Neutro (Vencida, Cancelada, Revocada, Finalizado, Autoasignada) | `#EFEAE1` / `#55594F` |
| Barra de aforo | participantes `#2F5540` · público `#8DB59A` · disponible `#EFEAE1` · tramo excedido rayado `rgba(163,55,42,.85/.35)` |
| Botón deshabilitado | `#ECE7DE` / `#7C7E76`, `cursor:not-allowed` |
| Toast | `#23261F` · icono `#9FD0AE` · acción `#CFE6D5` |

> Eliminados: la insignia y el color del rol Participante.

### Tipografía y forma
- **Nunito Sans** (400/600/700/800). Los iconos del prototipo son Material Symbols; en el repositorio, usar el equivalente de lucide-react.
- Tamaños:
  - H1 de página: 28/800. H1 de detalle: 26.
  - H2: 17/800.
  - Cuerpo: 15, con line-height de 1.5 a 1.6.
  - Etiqueta: 14/700. Auxiliar: 13. Badge: 12/700.
- Radios:
  - input y botón: 10;
  - tarjeta: 14 en el panel admin y 16 en la vista de miembro;
  - modal: 16;
  - pastilla: completamente redondeada.
- Densidad:
  - admin: controles de 42 px, botones de icono de 38 px y filas de tabla de unos 56 px;
  - miembro: controles de 44 px;
  - Acceso: controles de 46 a 48 px.
- Foco: `outline 3px #8DB59A`, y en los inputs `border #3E6B4F` + `outline 3px #CFE0D3`.

---

## Componentes base
- **Botones:**
  - primario, secundario y destructivo secundario (blanco con borde rojo);
  - el rojo sólido solo se usa dentro de una confirmación;
  - mientras carga, el texto cambia («Guardando…») y el botón se deshabilita;
  - los deshabilitados van acompañados de un texto que explica qué falta.
- **Campo:**
  - etiqueta arriba, error de 13 px en rojo y contador `n/máx`;
  - «(opcional)» con peso 400.
- **Badge de estado:** icono + texto.
- **Tabs segmentadas:** con conteo, por ejemplo «Pendientes · 2».
- **Toast:** con acción opcional («Deshacer», «Ver participaciones»).
- **ConfirmDialog:** nombra el elemento y las consecuencias. Puede llevar una acción alternativa («Desactivar en su lugar»).
- **Drawer lateral:** `min(500px,100%)` para formularios cortos (usuario, ministerio, notificación).
- **Tabla de datos** (todas las tablas admin):
  - **Ordenamiento:** al hacer clic en el encabezado alterna ascendente → descendente → sin orden. Lleva un icono de flecha (o neutro) y `aria-sort`. Los textos se comparan con `localeCompare('es', {numeric:true, sensitivity:'base'})`. Al ordenar, la tabla vuelve a la página 1.
  - **Paginador:**
    - «Filas por página» con 10, 25, 50 o 100 (10 por defecto);
    - texto «1–10 de 150»;
    - botones de primera, anterior, siguiente y última página, más «Página X de Y»;
    - cambiar el tamaño de página vuelve a la página 1.
  - El orden y el paginador se guardan por tabla.
  - Aplica a: Usuarios, Eventos, Cronogramas, Participaciones, Inscritos (público) y Resumen de inscripciones.

## Validaciones (en `lib/validators.ts`)
- **Nombre y apellido:**
  - de 2 a 50 caracteres, solo letras (incluye tildes, ü y ñ) con espacios simples;
  - mientras se escribe, se eliminan números y símbolos.
- **Correo:** obligatorio, máximo 100 caracteres, en formato `^[^\s@]+@[^\s@]+\.[^\s@]{2,}$`.
- **Teléfono (opcional):** `^\+?\d{7,15}$`. Mientras se escribe, solo se aceptan dígitos y un `+` al inicio.
- **Contraseña:** de 8 a 20 caracteres, y la confirmación debe coincidir. Cada campo tiene su propio botón para mostrar u ocultar.
- **Evento:**
  - título hasta 150, descripción hasta 2000, lugar hasta 200;
  - capacidad: entero mayor que 0;
  - el fin debe ser posterior al inicio;
  - al editar, el aforo no puede ser menor que los lugares ocupados: «Hay {n} lugares ocupados. El aforo no puede ser menor.».
- **Días para confirmar:**
  - entero de 1 a 30, y como máximo los días que faltan para el evento menos uno: «El evento empieza en {d} días. El plazo máximo es de {m} días.»;
  - la fecha límite resultante se muestra debajo del campo.
- **Envío de formularios:** los botones de enviar o guardar se habilitan solo con todos los obligatorios válidos y, en edición, si hay cambios.

---

## Pantallas

### A. Acceso (`LoginPage`, `RegisterPage`, `AuthLayout`)
- **Diseño:** dos columnas que se apilan en móvil. Panel verde de marca con logo, título, cuatro beneficios y versículo. A la derecha, el formulario con un ancho máximo de 460 px.
- **Tabs** «Iniciar sesión» / «Registrarse».
- **Iniciar sesión:**
  - correo y contraseña, «Recordarme» y «¿Olvidaste tu contraseña?»;
  - si falla, error general arriba del formulario;
  - si funciona, **redirige directamente a `/`**, el Inicio que corresponda al rol.
- **Registro:**
  - nombre, apellido, correo, teléfono, contraseña y confirmación;
  - requisitos de la contraseña marcados en vivo;
  - aceptación de los términos;
  - si funciona, entra directamente como miembro.
- **Recuperar contraseña:** campo de correo y confirmación «Revisa tu correo».

### B. Vista de miembro (`AppShell`, `Navbar`)
- **Barra superior:**
  - Inicio · **Eventos (menú desplegable)** · Ministerios · Notificaciones, más la campana y el menú de usuario;
  - el desplegable de Eventos se abre al pasar el mouse, con clic o con teclado, y contiene **Todos los eventos · Mis inscripciones · Cronogramas · Confirmar participaciones**, cada uno con icono y una descripción breve;
  - el contador de invitaciones pendientes aparece en «Eventos» y en «Confirmar participaciones», y se oculta cuando es 0;
  - por debajo de 880 px, menú hamburguesa.
- **Inicio configurable:**
  - botón «Personalizar inicio» y enlace «Editar» en la sección Accesos rápidos;
  - el modal tiene interruptores para Versículo del día, Próximo evento, Avisos sin leer y Accesos rápidos;
  - los accesos rápidos se eligen entre Eventos, Mis inscripciones, Cronogramas, Confirmar participaciones, Ministerios, Notificaciones y Mi perfil, con un **máximo de 6**, y se ordenan con flechas;
  - acciones Restablecer, Cancelar y Guardar (Guardar solo se habilita si hay cambios);
  - el prototipo guarda la configuración en `localStorage` (`cc-home-config`); en producción conviene guardarla en el perfil;
  - si todas las secciones quedan ocultas, aparece un estado vacío con acceso a «Personalizar inicio».
- **Eventos:** tabs Próximos / Pasados / Todos, buscador y tarjetas.
  - Cada tarjeta lleva el **chip de cupos** y una barra: «Quedan {disp} de {cupo} cupos».
  - Niveles del chip: disponible; pocos cupos (10 % o menos); agotado. Siempre con icono y texto.
  - **El miembro nunca ve el aforo total, el número de participantes ni la lista de inscritos.**
- **Detalle del evento:** bloque «Inscripción» con cinco estados:
  1. Puede inscribirse → «Inscribirme».
  2. Ya inscrito → «Estás inscrito» + «Cancelar mi inscripción».
  3. Es participante → aviso «Participas en este evento. Ya tienes tu lugar, no necesitas inscribirte.» y «Ver mis participaciones». Si antes estaba inscrito, se muestra la línea «Tu inscripción se reemplazó porque ahora participas en el evento.», que se puede cerrar.
  4. Agotado → botón deshabilitado «Cupos agotados».
  5. Iniciado o finalizado → «Inscripciones cerradas».
- **Flujo de inscripción:**
  - confirmación con nombre, fecha, lugar y cupos restantes;
  - si funciona: «Quedaste inscrito. Quedan {n} cupos.», y el estado cambia en el mismo lugar;
  - si el cupo se agotó mientras confirmaba: «Se agotaron los cupos mientras te inscribías.»;
  - para cancelar, confirmación con «Liberarás tu cupo y otra persona podrá tomarlo.».
- **Mis inscripciones:** lista con fecha, lugar, «Ver evento» y «Cancelar mi inscripción», y estado vacío con «Ver eventos».
- **Confirmar participaciones:**
  - tabs Pendientes / Respondidas / Todas;
  - cada tarjeta muestra el evento, la actividad, la fecha, el horario, el lugar, la descripción, el responsable, la fecha de recepción y el plazo (resaltado si faltan 3 días o menos);
  - estados: Pendiente, Aceptada, Rechazada, Vencida y Cancelada;
  - «Aceptar participación» pide confirmación; «No puedo participar» abre una ventana con un motivo opcional de hasta 255 caracteres;
  - **la interfaz se actualiza solo cuando el servidor confirma la respuesta**; si falla, aparece un error y la invitación sigue pendiente;
  - estados de la página: cargando (esqueleto), vacío («Aún no tienes invitaciones. Cuando te asignen a una actividad, la verás aquí para confirmar.») y error con «Reintentar».
- **Notificaciones:**
  - las no leídas se resaltan y se marcan como leídas al abrirlas;
  - el miembro puede **eliminar sus propias notificaciones** desde la papelera o desde el detalle, con «Deshacer» durante 6 s.
- **Ministerios, Cronogramas y Mi perfil:** según los prototipos.

### C. Panel de administración (`AdminShell`)
- **Barra lateral:**
  - arriba: Inicio y **Mis participaciones** (icono `event_available`, con el contador de pendientes propias);
  - sección GESTIÓN: Usuarios, Eventos, **Inscripciones**, Cronogramas, **Participaciones** (supervisión) y Ministerios;
  - abajo: Notificaciones y la tarjeta del usuario con Cerrar sesión;
  - por debajo de 960 px se convierte en barra superior con panel deslizable.
- **Inicio:**
  - accesos rápidos;
  - «Requiere atención»: eventos sin cronograma, avisos sin leer y usuarios inactivos;
  - próximos eventos;
  - pastillas Usuarios, Eventos próximos, Ministerios e **Inscritos en eventos próximos**.
- **Usuarios:**
  - el rol solo puede ser Administrador o Miembro, igual que el filtro;
  - búsqueda y filtros de rol y estado;
  - no se puede eliminar la propia cuenta ni cambiar el propio rol;
  - eliminar ofrece «Desactivar en su lugar».
- **Eventos:** la tabla incluye la columna **Ocupación** («162 / 200»), con «N disponibles», «Lleno» o «Sobrecupo: N» debajo.
  - **Detalle — Aforo:**
    - cuatro cifras: Aforo total, Participantes, Público inscrito y Disponibles;
    - barra apilada con leyenda y una marca donde está el aforo;
    - **sobrecupo:** «Sobrecupo: N», el tramo que excede el aforo rayado en rojo y un aviso con la causa;
    - **lleno:** aviso que indica que los miembros lo ven como «Cupos agotados».
  - Debajo, la tarjeta «Inscritos» con «Gestionar inscritos», que lleva a Inscripciones con ese evento seleccionado.
  - **Eventos finalizados:** el cronograma queda en solo lectura (candado deshabilitado y texto «Evento finalizado») y no se puede crear, editar ni asignar.
  - **Formulario:** secciones Información, Fecha y hora y Lugar y mapa, con barra de acciones fija abajo.
    - La hora se elige con dos selectores, hora y minutos (00–59).
    - Si el evento termina el mismo día, se deshabilitan las horas de fin iguales o anteriores al inicio.
    - El campo de aforo muestra los lugares ocupados.
- **Inscripciones:** dos vistas.
  - **Por evento:**
    - título con el bloque de fecha, el nombre, la fecha, el horario y el estado del evento, más el selector «Cambiar evento»;
    - franja con las cuatro cifras;
    - tabs **Público** y **Participantes**.
  - **Público:**
    - tabla con persona (avatar y correo), fecha de inscripción, quién inscribió («Él mismo» o el administrador), nota y acciones;
    - búsqueda, orden y paginación;
    - «Inscribir persona» abre un modal con buscador. Quien ya está inscrito o participa aparece deshabilitado, con el motivo. Hay campo de nota opcional (hasta 200);
    - si no hay cupos, el botón se deshabilita y explica por qué;
    - «Editar» modifica la nota;
    - «Eliminar» confirma con «{nombre} perderá su cupo en «{evento}». El cupo quedará disponible.»;
    - estado vacío: «Aún no hay inscritos.».
  - **Participantes:**
    - lista de solo lectura con nombre, actividades y estado de la invitación;
    - cada fila enlaza a Participaciones;
    - nota visible: «Los participantes ocupan aforo aunque no se inscriban.».
  - **Total de inscritos:**
    - cifras de total de inscritos, inscritos en eventos próximos y participantes;
    - **tabla de resumen** por evento con Evento, Fecha (y estado), Aforo, Participantes, Público, Disponibles y «Ver inscritos»;
    - con paginador y orden, **sin fila de total**.
- **Cronogramas (modal único para crear y editar):**
  - **Barra de tiempo:** muestra el tiempo asignado frente al disponible.
  - **Horas:** solo se habilitan las que están dentro del horario del evento; el fin debe ser posterior al inicio.
  - **Responsable:**
    - lista propia con buscador y scroll (máximo 220 px de alto), con todos los usuarios activos (miembros, administradores y el propio usuario);
    - cada opción muestra el avatar, el nombre, una **insignia de rol** y el correo;
    - el usuario actual aparece **fijado al inicio con «(Tú)»**.
  - **«Registrar participante nuevo»:** abre el drawer de usuario con el rol **Miembro** ya seleccionado. Al registrar, la persona queda asignada a la actividad, la lista se actualiza y el foco pasa a «Días para confirmar».
  - **Al elegir un responsable nuevo** aparece el campo «Días para confirmar», y la invitación se envía al guardar.
  - **Al elegirse a uno mismo:** se oculta el campo de días, aparece el aviso «Quedarás asignado de inmediato. No se envía invitación.» y la actividad queda **aceptada** al guardar.
  - **Avisos al asignar:**
    - si el evento está lleno: «El evento está lleno. Si continúas quedará con sobrecupo de N.» (se permite continuar);
    - si la persona ya está inscrita: «{nombre} está inscrito como público. Su inscripción se reemplazará por la participación.» Al guardar, la inscripción se elimina.
  - **Responsable que ya recibió invitación:** se muestra una etiqueta «Estado: …».
    - Pendiente o con error de envío: **bloqueado**. Acciones «Reenviar invitación» y «Cancelar invitación».
    - Aceptada: **bloqueado**. Acción «Revocar aceptación».
    - Vencida o cancelada: «Cambiar responsable» o «Volver a invitar a {nombre}».
    - Rechazada o revocada: «Cambiar responsable».
  - Eliminar una actividad con una invitación pendiente o aceptada pide confirmación, y la invitación se cancela.
- **Participaciones (supervisión):**
  - **Aviso superior:** muestra cuántas actividades están por reasignar y cuántas invitaciones tuvieron error de envío.
  - **Filtros:** Todas, Pendientes, Aceptadas, Por reasignar y Error de envío, más búsqueda.
  - **Columnas:** Actividad, Participante (con «(Tú)» en las propias), Envío (Enviada, **Autoasignada** en tono neutro o Error), Respuesta (estado, fecha, motivo, plazo, «Reasignada a…» y «Pendiente de asignación») y Acciones.
  - **Pendiente de asignación:** las rechazadas, vencidas, revocadas y canceladas, solo cuando faltan al menos 2 días para el evento.
  - **Reasignar:**
    - actúa sobre la actividad existente: muestra al asignado actual y el motivo;
    - se elige al nuevo participante (incluido uno mismo) y los días para confirmar.
  - **Revocar y cambiar** (solo en las aceptadas): lleva un aviso de que la persona perderá la asignación.
    - Si la asignación es propia, el título es «Dejar esta actividad y asignar a otra persona» y no aparece el aviso de notificación.
  - **Botones según el caso:**
    - Reenviar solo con error de envío;
    - Cancelar solo en las pendientes;
    - las autoasignadas solo tienen «Revocar y cambiar».
- **Mis participaciones:**
  - las mismas tarjetas que ve el miembro, con la densidad del panel, y tabs Pendientes / Respondidas;
  - cada tarjeta indica «Invitado por {nombre} el {fecha}» o, si es una autoasignación, «Te asignaste el {fecha}» (sin plazo);
  - mismo estado vacío que en la vista de miembro.
- **Ministerios:**
  - agregar miembros en lote;
  - **quitar a un miembro pide confirmación** y después ofrece «Deshacer».
- **Notificaciones:**
  - bandeja con la lista y el lector;
  - filtros Todas / No leídas / Leídas, filtro por destinatario y búsqueda en una sola fila;
  - el redactor tiene estilo de correo (Para con chips y casillas, Asunto y cuerpo con el editor enriquecido).

---

## Reglas de aforo
| Dato | Cálculo |
|---|---|
| Participantes | personas distintas asignadas a actividades del evento |
| Cupo para público | aforo total − participantes |
| Disponibles | cupo para público − público inscrito |
| Sobrecupo | participantes + público > aforo total |

## Requiere backend
1. **Invitaciones:**
   - modelo con estados `pendiente | aceptada | rechazada | vencida | cancelada | revocada` y campos de envío de correo (`enviada | error | autoasignada`), fecha límite, motivo e «invitado por»;
   - endpoints para listar las propias, listar todas (admin), aceptar, rechazar, reenviar, cancelar, revocar, reasignar y autoasignar.
2. **Roles:** migrar los usuarios con rol Participante a Miembro y eliminar ese rol. Un miembro o administrador puede ser asignado a actividades.
3. **Inscripciones:**
   - modelo (usuario, evento, fecha, inscrito por, nota);
   - endpoints para inscribirse, cancelar, inscribir como administrador, editar la nota y eliminar;
   - validación atómica del cupo, para devolver el error de «agotado» si se ocupa mientras alguien confirma;
   - al asignar a una persona como participante, su inscripción se elimina.
4. **Aforo:** que el backend devuelva participantes, público y disponibles por evento. No permitir un aforo menor que lo ocupado.
5. **Notificaciones:** permitir que un miembro elimine las propias.
6. **Otros:**
   - endpoint de recuperación de contraseña;
   - búsqueda, orden y paginación de las tablas en el servidor;
   - guardar la configuración del inicio en el perfil;
   - validar nombre y teléfono en el servidor.

## Orden sugerido
1. Tokens, Nunito Sans y validadores.
2. Componentes base, incluida la tabla con orden y paginador.
3. Acceso.
4. `AdminShell` y las rutas nuevas (Inscripciones, Mis participaciones, Participaciones).
5. Pantallas del administrador: Usuarios → Eventos y Aforo → Cronograma (modal) → Participaciones → Inscripciones → Mis participaciones → Ministerios → Notificaciones → Inicio.
6. Vista de miembro: Navbar con el desplegable → Inicio configurable → Eventos e inscripción → Mis inscripciones → Confirmar participaciones → Notificaciones → Perfil.
7. Verificación: `npm run typecheck`, `npm run build`, navegación con teclado, contraste y pruebas en 375, 768, 1280 y 1440 px.
