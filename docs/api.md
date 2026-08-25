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

Renueva la sesión mediante el token de autenticación existente.

#### Autenticación

Requerida.

#### Status
- 200 OK
- 401 Unauthorized: token inválido o sesión no válida.

### POST /api/auth/logout

Finaliza la sesión del usuario.

#### Autenticación

Requerida.

#### Status
- 200 OK
- 401 Unauthorized: usuario no autenticado.


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

Recibe los datos del nuevo collar.

#### Response

Devuelve el collar creado.

#### Status

- 201 Created

#### Errores

- 400 Bad Request: datos inválidos o incompletos.
- 500 Internal Server Error: error al crear el collar.

### PUT /api/collars/:id

Actualiza un collar existente.

#### Path parameters

- `id`: identificador del collar.

#### Request

Recibe los datos a actualizar.

#### Response

Devuelve el collar actualizado.

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

Obtiene las posiciones registradas.

#### Query parameters

Los parámetros disponibles permiten filtrar las posiciones según los criterios soportados por la API.

#### Response

Devuelve una lista de posiciones.

#### Status

- 200 OK

#### Errores

- 500 Internal Server Error: error al obtener las posiciones.

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

Actualiza un usuario existente.

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

## RF

Esta ruta se utiliza para la comunicación entre los gateways y el backend.

### POST /api/rf

Recibe mensajes RF enviados por un gateway.

A diferencia de los endpoints utilizados por la aplicación web, este endpoint utiliza un mecanismo de autenticación específico para gateways.

#### Autenticación

Autenticación vía api key. Requerida mediante autenticación de gateway.

#### Status
202 Accepted

#### Errores
400 Bad Request
401 Unauthorized


### GET /api/rf

Obtiene los mensajes RF recibidos.

#### Autenticación

Requerida mediante autenticación de usuario.

#### Status
200 OK

#### Errores
401 Unauthorized
