# Testing

Tests unitarios con [Vitest](https://vitest.dev/), en backend y frontend. Cada test está junto al
archivo que prueba (`x.test.ts` en el backend, `x.test.js` / `x.test.jsx` en el frontend).

Los tests unitarios prueban la lógica que no depende de la base ni de servicios externos:
validaciones, cálculos y componentes. Los de integración del backend (más abajo) prueban la API, el
SQL y los jobs contra una base real.

## Ejecutar

| Comando | Qué hace |
|---|---|
| `npm test` | Corre los tests unitarios una vez (en el frontend, solo los de lógica: los rápidos). |
| `npm run test:watch` | Los vuelve a correr al guardar. En el backend, `npm start` ya lo incluye. |
| `npm run test:ui` | Frontend: los tests de componentes y hooks, sobre un DOM simulado. |
| `npm run test:all` | Frontend: los dos grupos (lo que corre antes de versionar). |
| `npm run test:e2e` | Frontend: los tests end-to-end en Chromium contra el backend real (necesita Docker y `../backend`). |
| `npm run test:coverage` | Cobertura (solo backend). |
| `npm run test:integration` | Tests de integración del backend (necesita Docker). |

En el backend, `npm run release` corre lint, typecheck y tests antes de versionar, y se detiene si
alguno falla.

## Backend

TypeScript, entorno Node. En `src/`:

| Archivo | Qué prueba |
|---|---|
| `shared/validation/common` | Schemas zod comunes: ids, listas de ids de formularios multipart, campos opcionales vacíos, rangos de fechas, versión de firmware. |
| `shared/middleware/validate` | El middleware de validación: guarda lo validado en `req.validated` y responde 400 con todos los campos inválidos. |
| `shared/middleware/errorHandler` | Status y cuerpo de cada tipo de error: `AppError`, multer (413), errores 4xx de Express, 500 sin detalles. |
| `shared/utils/positionHelper` | Distancia (haversine) y rumbo entre dos posiciones. |
| `shared/utils/escapeLike` | Escapado de comodines `%` y `_` en búsquedas `LIKE`. |
| `modules/identity/permission.util` | Matriz de permisos: todos los roles definidos, admin con todo, unión de varios roles, permisos extra por tipo de comando. |
| `modules/identity/authorize.middleware` | 403 sin el permiso, `authorizeAny` y error al arrancar si una ruta pide un permiso inexistente. |
| `modules/identity/user.validator` | Roles de un usuario: default, sin repetir, rechazo de roles desconocidos y de la lista vacía. |
| `modules/livestock/cowPermission.util` | Permiso que pide cada campo del formulario de vaca: el collar aparte del resto. |
| `modules/identity/requestInfo.util` | IP y user agent que se guardan en la sesión: IPv4 dentro de IPv6, valores inválidos, caracteres de control. |
| `modules/livestock/cow.validator` | Formulario de vaca: campos vacíos, quitar collar o categoría, sexo, grupos, imagen, fecha. |
| `modules/devices/collar.validator` | Alta de collar: MAC, versión de firmware, código LoRa. |
| `modules/devices/command.validator` | Comandos a collares: parámetros y sus rangos, campos de cada tipo de comando, destinatarios. |
| `modules/devices/battery.util` | Porcentaje de batería según el voltaje y nivel (ok, bajo, crítico). |
| `modules/devices/firmwareVersion.util` | Normalización de versiones de firmware a `X.Y.Z`. |
| `modules/monitoring/zone.validator` | Polígonos de zonas: vértice de cierre, mínimo de vértices, coordenadas fuera de rango. |
| `modules/health/health.util` | Fin del retiro de una aplicación (también en tratamientos de varios días) y resumen de la historia: retiro vigente, último peso, refuerzos pendientes y vencidos, sin contar los anulados. |
| `modules/health/health.validator` | Eventos sanitarios de cada tipo: campos vacíos, refuerzo posterior a la vacunación, revisación con algún dato, condición corporal, fechas futuras; productos. |
| `modules/analytics/track.util` | Limpieza del recorrido para el dw: paradas con ruido del GPS sin distancia, saltos aislados, caminatas, huecos largos, minutos en movimiento y descanso por día, visitas a zonas con el borde ruidoso. |
| `modules/analytics/explorer` | Explorador: catálogo según permisos, joins solo de las dimensiones usadas, valores como parámetros (no en el SQL), orden y límite; validación de la consulta. |
| `modules/livestock/categoryRules.util` | Categoría por edad y castración: cortes de 12 y 24 meses, nunca retrocede, vaquillona → vaca manual, cambio de secuencia al castrar o anular. |
| `modules/environment/ndvi.util` | NDVI satelital: rangos a pedir (un año la primera vez, en tramos de 90 días; luego 15 días hacia atrás), imágenes con al menos la mitad de la zona despejada, días sin imagen. |
| `shared/utils/runInOrder` | Pasos asincrónicos uno después del otro, en orden. |
| `modules/telemetry/zoneEvents.util` | Eventos de zona de una vaca: salida del campo (solo si hay zonas generales) y regreso, entrada y salida de una zona de exclusión, cada uno con dos posiciones seguidas (no con una); estado de la vaca desde sus últimos eventos. |
| `modules/notifications/eventMessage.util` | Texto de cada notificación: vaca, collar, zona y hora del campo. |
| `modules/notifications/notification.validator` | Suscripción del navegador a las notificaciones: endpoint https y claves base64url. |
| `modules/environment/weather.util` | Sync del clima: cuántos días pedir, conversión de la respuesta de Open-Meteo, descarte del pronóstico. |

## Integración (backend)

Prueban la API y los jobs contra una base real: PostgreSQL 18 con PostGIS (la versión de producción) en
Docker. Cada corrida levanta un contenedor nuevo con los datos en memoria, carga `db_restore/schema.sql`
(producción, v1.0.0), `db_restore/reference-data.sql` y `db_restore/deploy.sql`, y lo borra al terminar.
Así también comprueban que `deploy.sql` aplica sobre el schema de producción.

- **Requisitos:** Docker. La primera vez descarga la imagen `postgis/postgis:18-3.6`.
- **Comando:** `npm run test:integration` (no forma parte de `npm test`).
- **Usuario de la app:** `ctapp`, solo con los permisos que le dan los scripts: un `GRANT` faltante
  en `deploy.sql` falla acá.
- **Requests:** a la app de Express con `supertest`, sin abrir un puerto.
- **Jobs:** se llaman directamente (procesar mensajes, entregar notificaciones), sin esperar al cron.
- **Servicios externos:** el envío de notificaciones (Web Push) es un mock: se verifica qué se mandaría.
- **Aislamiento:** cada test empieza con las tablas vacías, menos los datos de referencia. Los archivos
  corren uno después del otro.

En `test/integration/`:

| Archivo | Qué prueba |
|---|---|
| `sessions` | Login (cookies, `/me` con permisos, mismo error para usuario o contraseña incorrectos, tokens viejos con rol numérico); refresh con rotación, dos pestañas a la vez, reuso de un token rotado (cierra la sesión entera), token vencido; logout; sesiones de un usuario (cerrar una, cerrar todas menos la propia); permisos de cada rol en la API y unión de varios roles; el último administrador, también con dos administradores quitándose el rol o borrándose a la vez. |
| `gateway` | Recepción con la clave del gateway (también revocado) y mensajes inválidos; posiciones con su vaca y la zona más chica que las contiene; motivos de mensajes inválidos (repetido, movimiento imposible, fuera del área, collar desconocido); eventos de sueño y despertar, niveles de batería con histéresis; salida y regreso al campo y entrada y salida de una zona de exclusión con dos posiciones seguidas, también entre lotes; notificaciones (una vez, con la vaca y el mapa, sin los regresos ni los eventos viejos, nada después de cerrar sesión, dispositivo dado de baja por el servicio, prueba); códigos distintos para collares creados a la vez. |

## Frontend

Dos grupos, en el mismo `vitest.config.js` (proyectos de Vitest):

- **Lógica** (`*.test.js`, `npm test`): funciones puras en Node, sin DOM. Son la mayoría de las reglas
  y corren en un par de segundos.
- **Componentes y hooks** (`*.ui.test.jsx` / `*.ui.test.js`, `npm run test:ui`): con Testing Library
  sobre happy-dom (un DOM simulado). El nombre del archivo decide el grupo y el entorno.

En `src/`:

### Lógica

| Archivo | Qué prueba |
|---|---|
| `shared/api/apiClient` | Cliente HTTP: validación de la respuesta con su esquema, renovación de la sesión al vencer el token (una sola vez, compartida), cuándo se cierra la sesión y cuándo no (servidor caído, sin red), mensajes de error traducidos (nunca el código del backend) y `errorMessage`. |
| `shared/lib/format/formatNumber` | Números con separadores de Argentina, decimales exactos, abreviados y sin valor. |
| `shared/lib/date/dateRange` | Rangos del historial: "Hoy" (mínimo 6 h), rangos móviles y fijos, desplazamiento, textos. |
| `shared/lib/date/dateHelper` | Tiempo transcurrido ("hace 5 min"). |
| `shared/lib/geo/geo` | Distancias, áreas de polígonos, rumbo como punto cardinal y formatos. |
| `widgets/map/lib/mapPoints` | Mapa: agrupación por collar, colores estables, recorridos y pesos del mapa de calor. |
| `entities/zone/model/zoneStyles` | Color de cada tipo de zona y conversión de zonas a GeoJSON. |
| `entities/health-event/model/eventDisplay` | Cómo se muestra cada evento (título y datos según el tipo). |
| `features/draw-zone/lib/drawGuide` | Guía del dibujo con mira (pantallas táctiles): lados dibujados, el siguiente, el de cierre y los vértices. |
| `features/push-notifications/lib/serverKey` | Clave del servidor (base64url) en bytes para suscribir el navegador. |
| `entities/cow/model/cow` | Nombre para mostrar y edad de la vaca. |
| `widgets/explorer/model/explorer` | Explorador: fechas de los períodos, armado de los gráficos (fecha en el eje, la otra dimensión como series, demasiadas series), escalas de los ejes, formatos y CSV. |
| `entities/viewer/model/permissions` | Permisos del usuario (`can`). |
| `widgets/navigation/model/navItems` | Opciones del menú que ve cada usuario según sus permisos. |
| `entities/collar/model/collar` | Nombre para mostrar del collar. |
| `shared/lib/user-agent/userAgent` | Descripción del dispositivo de cada sesión. |

### Componentes y hooks

| Archivo | Qué prueba |
|---|---|
| `app/routes/ProtectedRoute` | Rutas privadas: muestra la página con sesión, manda al login sin sesión y ofrece reintentar si no se pudo verificar. |
| `pages/login/ui/LoginPage` | Redirección después del login a la página pedida, o al mapa si ya hay sesión. |
| `pages/settings/cows/form/ui/CowFormPage` | Qué envía el formulario de vaca: sin cambios, quitar collar, imagen y grupos, sexo y categoría, y qué campos puede cambiar cada rol (veterinario sin collar, técnico solo el collar). |
| `pages/settings/cows/detail/ui/CowDetailPage` | Ficha de la vaca: datos, resumen sanitario y eventos; sin historia para quien no puede leerla; anular un evento con motivo. |
| `pages/settings/cows/new-event/ui/HealthEventFormPage` | Registro de un evento: productos según el tipo, solo los campos del tipo y números, producto obligatorio. |
| `shared/ui/form/SelectField` | Select accesible: combobox con el nombre de su etiqueta (o `ariaLabel`), la opción elegida como contenido, obligatorio, lista de opciones asociada. |
| `shared/ui/form/FormField` | Label asociado al input y botón para mostrar la contraseña. |
| `shared/ui/form/ImageField` | Imagen actual, quitarla, reemplazarla y rechazo de archivos grandes o que no son imágenes. |
| `shared/ui/form/MultiSelectField` | Agregar y quitar selecciones; con la lista vacía, agregar muestra un segundo selector. |
| `shared/ui/entity-list-page/EntityListPage` | Pantalla de listado: búsqueda, botón de agregar según permiso, confirmación antes de eliminar y panel lateral (mapa). |
| `shared/lib/form/useEntityForm` | Formularios: alta vacía, carga de lo que se edita, validación, guardado y mensajes de error (de la API o del formulario). |
| `shared/lib/click-outside/useClickOutside` | Cierre de menús al tocar afuera, y nada mientras está cerrado. |
| `shared/ui/form/CheckboxGroupField` | Marcar y desmarcar opciones (los roles de un usuario), en orden, y opciones deshabilitadas. |
| `features/select-history-range/ui/RangePicker` | Selector de rango del historial: presets, rango personalizado, períodos anterior y siguiente. |
| `shared/lib/polling/usePolling` | Recarga periódica: pausa con la página oculta, recarga al volver, datos viejos (`stale`), errores. |
| `shared/lib/list/useEntityList` | Listados: carga, error y borrado con confirmación. |
| `shared/lib/list/useListSearch` | Búsqueda en listados: sin acentos ni mayúsculas, varios campos, máximo 8 resultados. |
| `widgets/explorer/ui/Explorer` | Explorador: consulta por defecto, gráfico y tabla, cambio de datos, números sin agrupar, rol sin datos para consultar. |

## End-to-end (frontend)

La app construida, en Chromium (Playwright), contra el backend real de `../backend` y una base
PostgreSQL 18 + PostGIS en Docker con el schema de producción, los datos de referencia y `deploy.sql`.
`e2e/global-setup.ts` levanta todo y lo borra al terminar:

- **Base:** un contenedor con los datos en memoria (nada en el disco).
- **Backend:** `../backend` tal cual, con solo el job de procesar mensajes (`JOBS`). No escribe nada
  en `../backend`: logs, imágenes y firmware van a una carpeta temporal.
- **App:** `vite build` y `vite preview` en https (las cookies son `secure`), con la API por su proxy,
  como en producción.

- **Requisitos:** Docker, `../backend` con sus dependencias y el navegador de Playwright
  (`npx playwright install chromium`, una vez; queda en `~/.cache/ms-playwright`).
- **Comando:** `npm run test:e2e` (~1 minuto). Un test que falla deja su traza en `e2e-results/`
  (`npx playwright show-trace <archivo>`) y el reporte en `e2e-report/`.
- **Datos:** cada test empieza con la base vacía y un administrador; prepara lo que necesita por la
  API y prueba por la pantalla solo el flujo que le toca.
- **Mapa:** los mosaicos satelitales se reemplazan por una imagen vacía (sin internet).

En `e2e/`:

| Archivo | Qué prueba |
|---|---|
| `sessions` | Login y vuelta a la página pedida, contraseña incorrecta, cerrar sesión desde el menú; un usuario de consulta ve los datos sin forma de cambiarlos; una página que el rol no puede usar lo devuelve al mapa; el administrador ve los usuarios. |
| `cows` | Alta de una vaca con collar, categoría y grupo, y su ficha; edición desde la ficha; borrado con confirmación; un error del backend mostrado en castellano (código de collar repetido). |
| `health` | Vacunación con su retiro en el resumen y anulación con motivo (el retiro deja de contar); castración solo para machos. |
| `zones` | Dibujo de una zona con el mouse; en un teléfono (táctil emulado), con la mira: mover el mapa, agregar cada punto, cerrar. |
| `map` | Mensajes del gateway procesados por el backend: buscar la vaca en el mapa en vivo abre su posición; el enlace de una notificación abre el mapa en la vaca. |

