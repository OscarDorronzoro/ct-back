# API

## Información general

### URL base

La API está disponible bajo el prefijo `/api`.

En desarrollo:

`http://localhost:3000/api`

### Autenticación

Los endpoints protegidos requieren autenticación mediante un token JWT almacenado en una cookie `HttpOnly`.

El token es generado al iniciar sesión mediante `POST /api/auth/login` y es enviado al cliente mediante una cookie. El navegador incluye automáticamente esta cookie en las solicitudes posteriores a los endpoints protegidos.

El token no se expone mediante JavaScript del lado del cliente.

### Autorización

La API utiliza roles para controlar el acceso a determinadas operaciones.

Los roles disponibles son:

VIEWER: acceso de consulta.
OPERATOR: acceso a operaciones de gestión.
ADMIN: administración de usuarios.

### Formato de respuesta

Las respuestas exitosas utilizan JSON.

## Errores

Los errores utilizan códigos de estado HTTP y una respuesta JSON con información sobre el error.
```json
{
  "error": "Mensaje de error"
}
```

Los datos de entrada (parámetros de ruta, query y body) se validan con zod antes de llegar al controller. Si no son válidos, la respuesta es `400` con el detalle de cada campo:
```json
{
  "error": "VALIDATION_ERROR",
  "message": "body.params.gpsOn: Too big: expected number to be <=3600",
  "issues": [
    { "path": "body.params.gpsOn", "message": "Too big: expected number to be <=3600" }
  ]
}
```

Las reglas que dependen de la base de datos (que exista la entidad, que el polígono sea válido, etc.) responden con su propio código y un detalle opcional:
```json
{
  "error": "INVALID_ZONE",
  "message": "the polygon is not valid (edges must not cross)"
}
```

Los errores del pedido que se detectan antes de llegar a la ruta usan el mismo formato:

| Caso | Status | `error` |
|---|---|---|
| Body JSON mal formado | 400 | `BAD_REQUEST` |
| Body de más de 10 MB | 413 | `PAYLOAD_TOO_LARGE` |
| Archivo más grande que el límite (imagen 5 MB, firmware 4 MB) | 413 | `LIMIT_FILE_SIZE` |
| Archivo en un campo no esperado | 400 | `LIMIT_UNEXPECTED_FILE` |

## Autenticación

### POST /api/auth/login

Autentica un usuario y devuelve un token JWT.

#### Request
```json
{
  "username": "usuario",
  "password": "contraseña"
}
```

#### Response
```json
{
  "id": 1,
  "username": "usuario"
}
```

#### Status
- 200 OK

#### Errores
- 401 Unauthorized: credenciales inválidas.
- 400 Bad Request: datos requeridos ausentes o inválidos.

### GET /api/auth/me

Obtiene información del usuario actualmente autenticado.

#### Autenticación

Requerida.

#### Status
- 200 OK
- 401 Unauthorized: usuario no autenticado.

### POST /api/auth/refresh

Rota el refresh token (cookie `refresh_token`) y emite un access token nuevo (cookie `auth_token`, 15 min).

#### Sesiones

Cada login crea una sesión (un dispositivo). Los refresh tokens de una sesión rotan en cada refresh; la sesión dura mientras se siga usando (cada token vence a los 30 días de emitido) o hasta que se revoca. El access token lleva la sesión en el claim `sid`.

- Se guardan la IP y el user agent de la sesión (al iniciar y en el último uso) y la IP de cada token.
- **Detección de reuso**: si llega un token ya rotado, alguien tiene una copia y se revoca la sesión entera.
- **Refresh concurrente**: un token rotado hace menos de 30 s (otra pestaña refrescó a la vez) responde 200 sin cookies nuevas: el navegador ya tiene las de la otra respuesta.
- Revocar una sesión (logout, admin, cambio de contraseña) no invalida el access token vigente: el dispositivo sale en su próximo refresh (menos de 15 min).

#### Response
```json
{ "message": "Token refreshed" }
```

`{ "message": "Token already refreshed" }` en el caso concurrente.

#### Status
- 200 OK
- 401 Unauthorized: token inválido, vencido, reusado o sesión revocada. Borra las cookies.

### POST /api/auth/logout

Revoca la sesión del refresh token y borra las cookies.

#### Status
- 204 No Content

## Cows

### GET /api/cows

Obtiene el listado de vacas.

#### Response

Devuelve una lista de vacas.

#### Status

- 200 OK

#### Errores

- 500 Internal Server Error: error al obtener las vacas.

### GET /api/cows/:id

Obtiene una vaca por su identificador.

#### Path parameters

- `id`: identificador de la vaca.

#### Response

Devuelve los datos de la vaca solicitada.

#### Status

- 200 OK

#### Errores

- 404 Not Found: la vaca no existe.
- 500 Internal Server Error: error al obtener la vaca.

### POST /api/cows

Crea una nueva vaca.

Permite enviar una imagen asociada a la vaca.

#### Request

Recibe los datos de la nueva vaca. Content-Type: multipart/form-data

#### Response

Devuelve la vaca creada.

#### Status

- 201 Created

#### Errores

- 400 Bad Request: datos inválidos o incompletos.
- 500 Internal Server Error: error al crear la vaca.

### PUT /api/cows/:id

Actualiza una vaca existente.

Permite actualizar la imagen asociada.

#### Path parameters

- `id`: identificador de la vaca. Content-Type: multipart/form-data

#### Request

Recibe los datos a actualizar.

#### Response

Devuelve la vaca actualizada.

#### Status

- 200 OK

#### Errores

- 400 Bad Request: datos inválidos o incompletos.
- 404 Not Found: la vaca no existe.
- 500 Internal Server Error: error al actualizar la vaca.

### DELETE /api/cows/:id

Elimina una vaca.

#### Path parameters

- `id`: identificador de la vaca.

#### Status

- 204 No Content

#### Errores

- 404 Not Found: la vaca no existe.
- 500 Internal Server Error: error al eliminar la vaca.


## Collars

### GET /api/collars

Obtiene el listado de collares.

#### Response

Devuelve una lista de collares.

#### Status

- 200 OK

#### Errores

- 500 Internal Server Error: error al obtener los collares.

### GET /api/collars/:id

Obtiene un collar por su identificador.

#### Path parameters

- `id`: identificador del collar.

#### Response

Devuelve los datos del collar solicitado.

#### Status

- 200 OK

#### Errores

- 404 Not Found: el collar no existe.
- 500 Internal Server Error: error al obtener el collar.

### POST /api/collars

Registra un nuevo collar.

#### Request

Recibe los datos del nuevo collar. Todos los campos son opcionales.

- `code`: identificador usado en LoRa (1..255). Si no se envía, se asigna el primero libre.
- `mac`: MAC del collar (12 dígitos hexadecimales).
- `firmwareVersion`: versión `X.Y.Z` (`v1.0` se normaliza a `1.0.0`). Se actualiza sola cuando el collar informa su firmware.
- `description`.

El collar también se crea automáticamente cuando transmite un mensaje `join` (ver RF).

#### Response

Devuelve el collar creado.

#### Status

- 201 Created

#### Errores

- 400 Bad Request: datos inválidos o incompletos.
- 409 Conflict: `COLLAR_CODE_IN_USE`, `COLLAR_MAC_IN_USE` o `NO_FREE_COLLAR_CODE`.
- 500 Internal Server Error: error al crear el collar.

### PUT /api/collars/:id

Actualiza un collar existente.

#### Path parameters

- `id`: identificador del collar.

#### Request

Recibe los datos a actualizar: `code`, `mac`, `firmwareVersion`, `description` (mismo formato que en POST).

#### Response

Devuelve el collar actualizado. Incluye `params`: la última configuración confirmada por el collar.

#### Status

- 200 OK

#### Errores

- 400 Bad Request: datos inválidos o incompletos.
- 404 Not Found: el collar no existe.
- 500 Internal Server Error: error al actualizar el collar.

### DELETE /api/collars/:id

Elimina un collar.

#### Path parameters

- `id`: identificador del collar.

#### Status

- 204 No Content

#### Errores

- 404 Not Found: el collar no existe.
- 500 Internal Server Error: error al eliminar el collar.


## Positions

### GET /api/positions

Obtiene las posiciones registradas en un rango de fechas.

#### Query parameters

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `dateFrom` | fecha ISO | inicio del día | Inclusive. Debe ser anterior a `dateTo`. |
| `dateTo` | fecha ISO | ahora | Exclusive. |

#### Response

Devuelve una lista de posiciones. Campos calculados por el backend respecto de la posición
anterior del mismo collar:

| Campo | Descripción |
|---|---|
| `distanceToPrevious` | Metros desde la posición anterior. |
| `speed` | km/h, velocidad media desde la posición anterior. `0` si se movió menos de 10 m (el resto es ruido del GPS). `null` si pasaron menos de 30 s (por ejemplo, el mensaje `sleep` que llega justo después de una posición). |
| `heading` | Dirección del desplazamiento, en grados desde el norte (0 a 360). `null` si se movió menos de 10 m o pasaron menos de 30 s. |

La primera posición de cada collar no tiene estos valores.

#### Status

- 200 OK

#### Errores

- 500 Internal Server Error: error al obtener las posiciones.

### GET /api/positions/distance

Distancia recorrida por cada collar en un rango: suma de las distancias entre posiciones
consecutivas dentro del rango. La distancia de la primera posición de cada collar no se cuenta,
porque viene de una posición anterior al rango.

El valor incluye el ruido del GPS: un collar quieto bajo árboles puede sumar alrededor de 1 km
por día.

#### Query parameters

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `dateFrom` | fecha ISO | inicio del día | Inclusive. Debe ser anterior a `dateTo`. |
| `dateTo` | fecha ISO | ahora | Exclusive. |
| `collarId` | entero | todos | Solo ese collar. |

#### Response

```json
[
  { "collarId": 123, "positions": 172, "meters": 2672 }
]
```

Una fila por collar con posiciones en el rango.

#### Status

- 200 OK
- 400 Bad Request: `VALIDATION_ERROR`.

### GET /api/positions/latest

Última posición de cada collar activo (no eliminado), para el mapa en vivo. Un collar que dejó de transmitir sigue apareciendo con su última posición conocida, mientras no supere la antigüedad máxima.

#### Query parameters

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `maxAgeHours` | entero 1..720 | 72 | Antigüedad máxima de la posición. Los collares sin posiciones en esa ventana no se devuelven. |

#### Response

Lista de posiciones (como `GET /api/positions`), una por collar.

#### Status

- 200 OK
- 400 Bad Request: `maxAgeHours` fuera de rango.

### GET /api/positions/:id

Obtiene el detalle de una posición, para mostrarlo al seleccionarla en el mapa.

#### Response

```json
{
  "position": { "id": 80917, "collarId": 128, "cowId": 6, "recordedAt": "...", "accuracy": 5, "signalStrength": 80, "distanceToPrevious": 13.1 },
  "collar": { "id": 128, "code": 128, "description": "...", "firmwareVersion": "1.0.0" },
  "cow": { "id": 6, "alias": "322", "earTag": "322", "imageUrl": null },
  "signal": { "rssi": -97, "snr": 1.75, "hdop": 1, "satellitesCount": null, "messageType": "pos", "integrity": "ok" },
  "battery": { "voltage": 3.83, "percent": 55, "level": "ok", "recordedAt": "..." },
  "state": { "status": "sleeping", "since": "...", "sleepMin": 60, "wakeExpectedAt": "..." }
}
```

- `battery`: lectura del mensaje de la posición o, si no tenía voltaje, la última anterior del collar
  (`recordedAt` indica de cuándo es). `percent` es una estimación según la curva de descarga LiPo y
  `level` (`ok`, `low`, `critical`) usa los umbrales configurados en el collar. `null` si no hay lecturas.
- `state`: estado del collar en el momento de la posición, según los eventos `sleep`/`wake`.
  `status`: `sleeping` o `awake`.
- `cow`, `collar` y `signal` pueden ser `null`.

#### Status

- 200 OK

#### Errores

- 400 Bad Request: id inválido.
- 404 Not Found: la posición no existe.

## Groups

### GET /api/groups

Obtiene el listado de grupos.

#### Response

Devuelve una lista de grupos.

#### Status

- 200 OK

#### Errores

- 500 Internal Server Error: error al obtener los grupos.

### GET /api/groups/:id

Obtiene un grupo por su identificador.

#### Path parameters

- `id`: identificador del grupo.

#### Response

Devuelve los datos del grupo solicitado.

#### Status

- 200 OK

#### Errores

- 404 Not Found: el grupo no existe.
- 500 Internal Server Error: error al obtener el grupo.

### POST /api/groups

Crea un nuevo grupo.

#### Request

Recibe los datos del nuevo grupo.

#### Response

Devuelve el grupo creado.

#### Status

- 201 Created

#### Errores

- 400 Bad Request: datos inválidos o incompletos.
- 500 Internal Server Error: error al crear el grupo.

### PUT /api/groups/:id

Actualiza un grupo existente.

#### Path parameters

- `id`: identificador del grupo.

#### Request

Recibe los datos a actualizar.

#### Response

Devuelve el grupo actualizado.

#### Status

- 200 OK

#### Errores

- 400 Bad Request: datos inválidos o incompletos.
- 404 Not Found: el grupo no existe.
- 500 Internal Server Error: error al actualizar el grupo.

### DELETE /api/groups/:id

Elimina un grupo.

#### Path parameters

- `id`: identificador del grupo.

#### Status

- 204 No Content

#### Errores

- 404 Not Found: el grupo no existe.
- 500 Internal Server Error: error al eliminar el grupo.

## Breeds

### GET /api/breeds

Obtiene el listado de razas.

#### Status
- 200 OK

### GET /api/breeds/:breedId

Obtiene una raza mediante su identificador.

#### Parámetros
breedId: identificador de la raza.

#### Status
- 200 OK

#### Errores
- 401 Unauthorized
- 404 Not Found
- 500 Internal Server Error


### POST /api/breeds

Crea una nueva raza.

#### Status
- 201 Created

#### Errores
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 500 Internal Server Error


### PUT /api/breeds/:breedId

Actualiza una raza existente.

#### Status
- 200 OK

#### Errores
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 500 Internal Server Error


### DELETE /api/breeds/:breedId

Elimina una raza.

#### Status
- 204 No Content

#### Errores
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found
- 500 Internal Server Error

## Search

### GET /api/search

Realiza una búsqueda global sobre los recursos disponibles.

#### Query parameters

- `q`: texto de búsqueda.

#### Response

Devuelve los resultados coincidentes agrupados por tipo de recurso.

#### Status

- 200 OK

#### Errores

- 400 Bad Request: parámetro de búsqueda ausente o inválido.
- 500 Internal Server Error: error al realizar la búsqueda.


## Users

### GET /api/users

Obtiene el listado de usuarios.

#### Autorización

Requiere rol ADMIN.

#### Status
- 200 OK

#### Errores
- 401 Unauthorized
- 403 Forbidden


### GET /api/users/:userId

Obtiene un usuario mediante su identificador.

#### Parámetros
- userId: identificador del usuario.

#### Autorización

Requiere rol ADMIN.

#### Status
- 200 OK

#### Errores
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found


### POST /api/users

Crea un nuevo usuario.

#### Autorización

Requiere rol ADMIN.

#### Status
- 201 Created

#### Errores
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden


### PUT /api/users/:userId

Actualiza un usuario existente. Si cambia la contraseña, se revocan todas las sesiones del usuario salvo la de quien hace el cambio.

#### Parámetros
- userId: identificador del usuario.

#### Autorización

Requiere rol ADMIN.

#### Status
- 200 OK

#### Errores
- 400 Bad Request
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found


### DELETE /api/users/:userId

Elimina un usuario.

#### Parámetros
- userId: identificador del usuario.

#### Autorización

Requiere rol ADMIN.

#### Status
- 204 No Content

#### Errores
- 401 Unauthorized
- 403 Forbidden
- 404 Not Found

### GET /api/users/:userId/sessions

Sesiones activas del usuario (no revocadas y con un token vigente), la más usada recientemente primero.

#### Autorización

Requiere rol ADMIN, sobre usuarios de su mismo rol o inferior.

#### Response
```json
[
  {
    "id": "6f1c2a1e-3b0d-4c4e-9a51-2f7d0b8e9c11",
    "createdAt": "2026-10-13T12:00:00.000Z",
    "lastUsedAt": "2026-10-14T09:30:00.000Z",
    "createdIp": "181.1.2.3",
    "lastIp": "181.1.2.40",
    "userAgent": "Mozilla/5.0 (Linux; Android 14) ... Chrome/130.0 Mobile Safari/537.36",
    "current": false
  }
]
```

- `current`: es la sesión de quien hace el pedido.
- `createdIp`, `lastIp` y `userAgent` pueden ser `null` (sesiones anteriores a este registro).

#### Errores
- 400 Bad Request: `userId` inválido.
- 403 Forbidden
- 404 Not Found: `USER_NOT_FOUND`.

### DELETE /api/users/:userId/sessions/:sessionId

Revoca una sesión. El dispositivo sale en su próximo refresh.

#### Status
- 204 No Content

#### Errores
- 400 Bad Request: `userId` o `sessionId` (uuid) inválido.
- 403 Forbidden
- 404 Not Found: `USER_NOT_FOUND`, `SESSION_NOT_FOUND`.

### DELETE /api/users/:userId/sessions

Revoca todas las sesiones del usuario, salvo la de quien hace el pedido.

#### Response
```json
{ "revoked": 3 }
```

## RF

Estas rutas se utilizan para la comunicación entre los gateways y el backend.

Los gateways se autentican con el encabezado `X-API-Key`. El gateway no es accesible desde
internet: en lugar de que el backend lo llame, recibe los comandos en la respuesta de cada mensaje
que envía.

### POST /api/rf

Recibe un mensaje RF decodificado por un gateway.

#### Autenticación

Autenticación vía api key. Requerida mediante autenticación de gateway.

#### Request

- `collarId`: código LoRa del collar (0 si no tiene, por ejemplo en `join`).
- `latitude`, `longitude`: `-1` indica que no hay posición.
- `recordedAt`: opcional (sin hora NTP en el gateway se usa la hora de recepción).
- `type`: `pos`, `sleep`, `boot`, `diag`, `ack`, `join`, `ota` o `unknown`. Sin `type`: gateway anterior a los tipos de mensaje (posición).
- `integrity`: `ok`, `repaired`, `bad`, `legacy` o `none`.
- `raw`, `seq`, `rssi`, `snr`, `voltage`, `hdop`.
- Campos propios de cada tipo (`sleepMin`, `fw`, `gpsLink`, `ackCmd`, `mac`, `otaResult`, ...): se guardan en `data`.

```json
{"collarId":5,"latitude":-32.968120,"longitude":-61.209550,"rssi":-97,"snr":7.25,"voltage":3.98,"hdop":1.2,"type":"pos","integrity":"ok","raw":"00aed8ea5340a6630aba","len":10,"seq":7,"fresh":true,"recordedAt":"2026-10-10T14:32:05Z"}
```

Los mensajes se procesan de forma asíncrona: las posiciones válidas generan `positions` y el resto
de los tipos generan `events` (sleep, wake, boot, diag, gpsFailure, otaResult, firmwareChanged, join,
batteryLow, batteryCritical, batteryRecovered).

Un mensaje `join` crea el collar (si su `mac` no existe) y encola el comando `assignCode`.

#### Response

```json
{
  "rawRfMessage": 123,
  "status": "queued",
  "invalidReasonId": 0,
  "commands": [
    { "id": 41, "collar": 5, "type": "params", "params": { "gpsOn": 90 } }
  ],
  "cancel": [38]
}
```

- `commands`: comandos pendientes del collar que transmitió (máximo 4 por respuesta). `id` identifica
  la entrega al collar y es el que se usa para informar el resultado. Si no llega resultado en 2 horas,
  el comando se vuelve a entregar: el gateway debe ignorar ids que ya tiene en cola.
- `cancel`: ids que este gateway tiene en cola y fueron cancelados.
- Los collares con firmware viejo (`integrity: legacy` o sin `type`) no reciben comandos.

Formato de cada comando según `type`:

| type | Campos |
|---|---|
| `params` | `params` |
| `resetParams`, `diag`, `reboot`, `otaCancel` | — |
| `zone` | `zone` (0..3), `points`: `[[lat, lon], ...]` |
| `zoneClear` | `zone`: 0..3 o `"all"` |
| `ota` | `version` (código), `size`, `md5`, `sha256`. El binario se descarga de `GET /api/rf/firmwares/:code` |
| `assignCode` | `collar: 0`, `mac`, `code` |

#### Status
202 Accepted

#### Errores
400 Bad Request: `VALIDATION_ERROR`, con el campo que falla en `issues`. El mensaje no se guarda.
401 Unauthorized

### POST /api/rf/commands/results

Informa el resultado de los comandos entregados al gateway.

#### Autenticación

Autenticación vía api key. Requerida mediante autenticación de gateway.

#### Request

```json
{ "results": [{ "id": 41, "result": "ok" }, { "id": 38, "result": "canceled" }] }
```

`result`: `ok`, `duplicate`, `badParams`, `unsupported`, `noAnswer` o `canceled`. Los ids desconocidos
o ya terminados se ignoran.

#### Response

```json
{ "updated": 2 }
```

#### Status
200 OK

#### Errores
400 Bad Request
401 Unauthorized

### GET /api/rf/firmwares/:code

Descarga el binario de un firmware, para que el gateway lo sirva a los collares por WiFi.

#### Autenticación

Autenticación vía api key. Requerida mediante autenticación de gateway.

#### Response

`application/octet-stream`, con los encabezados `X-Firmware-Code`, `X-Firmware-Version`,
`X-Firmware-MD5` y `X-Firmware-SHA256`.

#### Status
200 OK

#### Errores
401 Unauthorized
404 Not Found

### GET /api/rf

Obtiene los mensajes RF recibidos en un rango de fechas.

#### Autenticación

Requerida mediante autenticación de usuario.

#### Query parameters

| Parámetro | Tipo | Default | Descripción |
|---|---|---|---|
| `dateFrom` | fecha ISO | hace 3 horas | Inclusive. Debe ser anterior a `dateTo`. |
| `dateTo` | fecha ISO | ahora | Exclusive. |

#### Status
200 OK

#### Errores
400 Bad Request: `VALIDATION_ERROR` (fecha inválida o `dateFrom` posterior a `dateTo`)
401 Unauthorized

## Commands

Comandos para los collares. Se entregan al gateway en la respuesta al próximo mensaje de cada collar,
por lo que su ejecución puede demorar varios minutos.

Un comando tiene un destino (`target`) y genera una entrega por collar (`targets`), con su estado:
`pending` (no entregado al gateway), `delivered` (en cola del gateway) o `done` (con `result`).

### GET /api/commands

Obtiene los últimos comandos, con un resumen de sus entregas: `targets`, `pending`, `delivered`,
`succeeded`, `failed` y `canceled`.

#### Query parameters

- `collarId`: solo comandos de ese collar (el resumen es de ese collar).
- `limit`: cantidad máxima (por defecto 100, máximo 500).

#### Status

- 200 OK

### GET /api/commands/:id

Obtiene un comando con el detalle de sus entregas por collar.

#### Status

- 200 OK

#### Errores

- 404 Not Found: el comando no existe.

### POST /api/commands

Crea un comando. Requiere rol OPERATOR.

#### Request

- `type`: `params`, `resetParams`, `diag`, `reboot`, `zone`, `zoneClear`, `ota` u `otaCancel`.
- `target`: `"all"` (los collares activos en este momento) o `{ "collarIds": [123, 128] }`.
- Campos según el tipo:

| type | Campos |
|---|---|
| `params` | `params`: parámetros a cambiar, con sus rangos (ver tabla) |
| `zone` | `zone` (lugar 0..3 en el collar), `zoneId`. La zona debe tener 3..16 vértices, a menos de 36 km del primero |
| `zoneClear` | `zone`: 0..3 o `"all"` |
| `ota` | `version`: `X.Y.Z`. Si se omite, la última subida |

```json
{ "type": "params", "target": { "collarIds": [129] }, "params": { "gpsOn": 90, "dayTime": 39600 } }

{ "type": "ota", "target": "all" }
```

Parámetros (enteros; las horas son segundos desde las 00:00 UTC):

| Nombre | Unidad | Rango | Fábrica |
|---|---|---|---|
| `dayTime` | s UTC | 0..86399 | 39600 |
| `nightTime` | s UTC | 0..86399 | 0 |
| `gpsOn` | s | 10..3600 | 60 |
| `gpsOff` | s | 10..86400 | 60 |
| `sendPeriod` | s | 30..86400 | 120 |
| `txHold` | s | 60..86400 | 360 |
| `minDistance` | m | 0..10000 | 20 |
| `diagPeriod` | min | 10..10080 | 360 |
| `nightMaxSleep` | min | 5..127 | 60 |
| `buzzer` | 0/1 | 0..1 | 1 |
| `zoneExitMargin` | m | 0..200 | 10 |
| `zoneExitFixes` | — | 1..60 | 5 |
| `outsideSendPeriod` | s | 10..3600 | 60 |
| `outsideGpsMin` | min | 0..240 | 10 |
| `buzzerMaxSec` | s | 0..600 | 60 |
| `zoneWatchMax` | s | 30..1800 | 180 |
| `batteryLow` | mV | 3000..4200 | 3500 |
| `batteryCritical` | mV | 2900..4000 (< `batteryLow`) | 3300 |
| `outsideDayTime` | s UTC | 0..86399 | 32400 |
| `outsideNightTime` | s UTC | 0..86399 | 7200 |

Cuando el collar confirma un cambio de parámetros, se actualiza `params` del collar.

#### Response

Devuelve el comando creado con sus entregas.

#### Status

- 202 Accepted

#### Errores

- 400 Bad Request: `VALIDATION_ERROR` (forma del pedido), o `INVALID_COMMAND` si la zona no entra en el collar (vértices, distancia).
- 403 Forbidden
- 404 Not Found: `COLLAR_NOT_FOUND`, `ZONE_NOT_FOUND` o `FIRMWARE_NOT_FOUND`.

### POST /api/commands/:id/cancel

Cancela las entregas no terminadas de un comando. Las que todavía no se entregaron se cancelan en el
momento; las que están en cola de un gateway se cancelan cuando el gateway lo confirma.

Cancelar una zona a medio enviar deja la zona sin guardar en el collar: conviene volver a enviarla.

#### Status

- 200 OK

#### Errores

- 403 Forbidden
- 404 Not Found: `COMMAND_NOT_FOUND`.
- 409 Conflict: `COMMAND_FINISHED`, no quedan entregas por cancelar.

## Firmwares

Versiones de firmware de los collares, para la actualización por OTA.

Cada firmware tiene un `code` (1..255), el número que el collar informa por LoRa y que define cuál es
el más nuevo, y una `version` `X.Y.Z` para mostrar.

### GET /api/firmwares

Obtiene los firmwares, del más nuevo al más viejo.

#### Status

- 200 OK

### GET /api/firmwares/:id

Obtiene un firmware.

#### Status

- 200 OK

#### Errores

- 404 Not Found

### POST /api/firmwares

Sube un firmware. Requiere rol OPERATOR.

#### Request

`multipart/form-data`:

- `file`: binario `.bin` del collar (máximo 4 MB).
- `code`: código compilado en el firmware (1..255).
- `version`: `X.Y.Z`.
- `notes`: opcional.

#### Status

- 201 Created

#### Errores

- 400 Bad Request: `VALIDATION_ERROR` (code, version), o `INVALID_FIRMWARE` si el archivo no es una imagen ESP.
- 403 Forbidden
- 409 Conflict: `FIRMWARE_CODE_IN_USE` o `FIRMWARE_VERSION_IN_USE`.

### DELETE /api/firmwares/:id

Elimina un firmware: deja de ofrecerse como el más nuevo. El binario se conserva mientras algún
comando OTA sin terminar lo use; después lo borra la limpieza semanal. Su código y su versión no
pueden volver a usarse. Requiere rol OPERATOR.

#### Status

- 204 No Content

#### Errores

- 403 Forbidden
- 404 Not Found

## Zones

Zonas del campo (polígonos), independientes de los collares. Para cargar una zona en un collar se
usa un comando `zone`.

Los vértices se expresan como `[[latitud, longitud], ...]`, sin repetir el primero.

### GET /api/zones

Obtiene las zonas.

#### Query parameters

- `zoneTypeId`: filtra por tipo.

#### Status

- 200 OK

### GET /api/zones/types

Obtiene los tipos de zona: `general`, `potrero`, `corral`, `tambo`, `aguada`, `exclusion`.

#### Status

- 200 OK

### GET /api/zones/:id

Obtiene una zona.

#### Status

- 200 OK

#### Errores

- 404 Not Found

### POST /api/zones

Crea una zona. Requiere rol OPERATOR.

#### Request

```json
{
  "name": "Potrero norte",
  "zoneTypeId": 2,
  "description": "opcional",
  "points": [[-32.96764, -61.21000], [-32.96800, -61.20900], [-32.96900, -61.21100]]
}
```

Entre 3 y 500 vértices, sin bordes que se crucen.

#### Status

- 201 Created

#### Errores

- 400 Bad Request: `VALIDATION_ERROR` (forma de los datos), o `INVALID_ZONE` si el tipo no existe o el polígono no es válido.
- 403 Forbidden

### PUT /api/zones/:id

Actualiza una zona (los campos enviados). Requiere rol OPERATOR.

Los collares que ya tienen la zona cargada no se actualizan: hay que volver a enviarla con un comando.

#### Status

- 200 OK

#### Errores

- 400 Bad Request
- 403 Forbidden
- 404 Not Found

### DELETE /api/zones/:id

Elimina una zona. Requiere rol OPERATOR.

#### Status

- 204 No Content

#### Errores

- 403 Forbidden
- 404 Not Found
