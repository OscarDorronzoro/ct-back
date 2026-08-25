# Propuesta TP DSW

## Grupo
### Integrantes
* 44697 - Dorronzoro, Oscar

### Repositorios
* [frontend app](https://github.com/OscarDorronzoro/ct-front)
* [backend app](https://github.com/OscarDorronzoro/ct-back)

## Tema
### Descripción
Sistema de seguimiento y monitoreo de ganado mediante collares inteligentes.
Permite registrar animales y collares, gestionar sus asignaciones y visualizar
las posiciones obtenidas sobre un mapa.

### Modelo
![imagen del modelo](diagrams/der.png)

## Alcance Funcional 

### Alcance Mínimo

Regularidad:
| Req Detalle | |
|---|---|
| CRUD simple | 1. CRUD Grupo |
| CRUD dependiente | 1. CRUD Vaca, dependiente grupo |
| Listado + detalle | 1. Listado de vacas filtrado por caravana => detalle CRUD Vaca |
| CUU/Epic | 1. Asignar un collar a una vaca |


Adicionales para Aprobación
| Req Detalle | |
|---|---|
| CRUD | 1. CRUD Grupo<br>2. CRUD Vaca<br>3. CRUD Raza<br>4. CRUD Collar<br>4. CRUD Usuario |
| CUU/Epic | 1. Asignar un collar a una vaca<br>2. Consultar el seguimiento de una vaca |


### Alcance Adicional Voluntario

| Req Detalle | |
|---|---|
| Listados | 1. Listado de posiciones de una vaca filtrado por rango de fechas<br>2. Listado de vacas pertenecientes a un grupo<br>3. Historial de asignaciones de collares de una vaca |
| CUU/Epic | 1. Consultar el recorrido de una vaca sobre un mapa<br>2. Gestionar grupos de vacas<br>3. Consultar el estado y última posición de los collares |
| Otros | 1. Recepción y procesamiento automático de posiciones provenientes de collares (LoRa)<br>2. Autenticación y revocación de gateways LoRa<br>3. Búsqueda unificada de vacas y collares |
