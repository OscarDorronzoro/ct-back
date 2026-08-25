# Deploy

## Estado actual
El sistema se encuentra desplegado y disponible en:

- Aplicación: [https://dorgesga.com](https://dorgesga.com)
- API: [https://dorgesga.com/api](https://dorgesga.com/api)

## Infraestructura

La aplicación se encuentra desplegada en una instancia AWS EC2.

## Backend

El backend se ejecuta como una aplicación Node.js, administrada mediante PM2.

El acceso externo a la API se realiza mediante Nginx, que funciona como reverse proxy.

## Frontend

El frontend se construye como una aplicación React + Vite.

La versión compilada (dist) es servida por Nginx.

## Base de datos

La aplicación utiliza PostgreSQL con la extensión PostGIS.

La base de datos se encuentra alojada en la misma infraestructura que la aplicación

## Variables de entorno

Las variables de configuración sensibles se gestionan mediante variables de entorno y no se incluyen en el repositorio.

Para la configuración local puede consultarse el archivo .env.example.

## HTTPS

El acceso al sistema se realiza mediante HTTPS.

Los certificados TLS son gestionados mediante Let's Encrypt.

## DNS

El dominio del sistema se administra mediante Cloudflare, utilizado para la gestión de DNS.

## Procedimiento de deploy

El procedimiento de actualización consiste en:

- Actualizar el código fuente traspilado para el backend en el servidor.
- Instalar nuevas dependencias de ser necesario.
- Reiniciar el backend mediante PM2.
- Generar build del frontend y actualizar dist en el servidor.
- Verificar el funcionamiento de la aplicación.

## Rollback

Ante un problema durante un deploy, se puede volver a una versión anterior del código mediante el historial de Git y reiniciar los servicios correspondientes.

