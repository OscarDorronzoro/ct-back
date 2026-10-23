# Testing

Tests unitarios con [Vitest](https://vitest.dev/), en backend y frontend. Cada test está junto al
archivo que prueba (`x.test.ts` en el backend, `x.test.js` / `x.test.jsx` en el frontend).

Prueban la lógica que no depende de la base ni de servicios externos: validaciones, cálculos y
componentes. Los repositorios (SQL), los services con base de datos y la integración con el
gateway no tienen tests automáticos.

## Ejecutar

| Comando | Qué hace |
|---|---|
| `npm test` | Corre todos los tests una vez. |
| `npm run test:watch` | Los vuelve a correr al guardar. En el backend, `npm start` ya lo incluye. |
| `npm run test:coverage` | Cobertura (solo backend). |

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
| `modules/environment/weather.util` | Sync del clima: cuántos días pedir, conversión de la respuesta de Open-Meteo, descarte del pronóstico. |

## Frontend

Componentes con Testing Library sobre jsdom (los archivos que lo necesitan lo indican con
`// @vitest-environment jsdom`). En `src/`:

| Archivo | Qué prueba |
|---|---|
| `services/apiClient` | Cliente HTTP: renovación de la sesión al vencer el token (una sola vez, compartida), cuándo se cierra la sesión y cuándo no (servidor caído, sin red), mensajes de error. |
| `components/auth/ProtectedRoute` | Rutas privadas: muestra la página con sesión, manda al login sin sesión y ofrece reintentar si no se pudo verificar. |
| `pages/LoginPage` | Redirección después del login a la página pedida, o al mapa si ya hay sesión. |
| `pages/CowFormPage` | Qué envía el formulario de vaca: sin cambios, quitar collar, imagen y grupos, sexo y categoría, y qué campos puede cambiar cada rol (veterinario sin collar, técnico solo el collar). |
| `pages/CowDetailPage` | Ficha de la vaca: datos, resumen sanitario y eventos; sin historia para quien no puede leerla; anular un evento con motivo. |
| `pages/HealthEventFormPage` | Registro de un evento: productos según el tipo, solo los campos del tipo y números, producto obligatorio. |
| `components/form/FormField` | Label asociado al input y botón para mostrar la contraseña. |
| `components/form/ImageField` | Imagen actual, quitarla, reemplazarla y rechazo de archivos grandes o que no son imágenes. |
| `components/form/MultiSelectField` | Agregar y quitar selecciones. |
| `components/form/CheckboxGroupField` | Marcar y desmarcar opciones (los roles de un usuario), en orden, y opciones deshabilitadas. |
| `components/history/RangePicker` | Selector de rango del historial: presets, rango personalizado, períodos anterior y siguiente. |
| `hooks/usePolling` | Recarga periódica: pausa con la página oculta, recarga al volver, datos viejos (`stale`), errores. |
| `hooks/useEntityList` | Listados: carga, error y borrado con confirmación. |
| `hooks/useListSearch` | Búsqueda en listados: sin acentos ni mayúsculas, varios campos, máximo 8 resultados. |
| `utils/dateRange` | Rangos del historial: "Hoy" (mínimo 6 h), rangos móviles y fijos, desplazamiento, textos. |
| `utils/dateHelper` | Tiempo transcurrido ("hace 5 min"). |
| `utils/geo` | Distancias, áreas de polígonos, rumbo como punto cardinal y formatos. |
| `utils/mapPoints` | Mapa: agrupación por collar, colores estables, recorridos y pesos del mapa de calor. |
| `utils/zoneStyles` | Color de cada tipo de zona y conversión de zonas a GeoJSON. |
| `utils/health` | Cómo se muestra cada evento (título y datos según el tipo) y la edad de la vaca. |
| `utils/permissions` | Permisos del usuario (`can`) y opciones del menú que ve cada uno. |
| `utils/labels` | Nombres para mostrar de collares y vacas. |
| `utils/userAgent` | Descripción del dispositivo de cada sesión. |
