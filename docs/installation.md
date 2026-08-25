# Instalación

## Requisitos

Para ejecutar el proyecto localmente se requiere:

- Node.js
- npm
- PostgreSQL
- PostGIS
- Git

La versión de Node.js utilizada durante el desarrollo es **24.13.0**.

## Backend

### Obtener el código

Clonar el repositorio:

```bash
git clone https://github.com/OscarDorronzoro/ct-back.git
```

### Instalación
Instalar dependencias:
```bash
cd ct-back && npm install
```

Copiar el archivo de configuración:
```bash
cp .env.example .env
```
Editar .env y configurar las variables de conexión a PostgreSQL (DB_*) según corresponda.

Por ejemplo:
```text
DB_HOST=localhost
DB_PORT=5432
DB_NAME=cattle_tracker
DB_USER=app_user
DB_PASSWORD=password
```

### Configuración de la base de datos
Dar permisos de ejecución:
```bash
chmod u+x scripts/setup_db.sh
```

Ejeecutar script:
```bash
./scripts/setup_db.sh
```
> El script crea la base de datos y el usuario configurados, y restaura el esquema inicial.

### Ejecución en desarrollo
```bash
npm start
```

## Frontend

### Obtener el código

Clonar el repositorio:

```bash
git clone https://github.com/OscarDorronzoro/ct-front.git
```

### Instalación
Instalar dependencias:
```bash
cd ct-front && npm install
```

### Ejecución en desarrollo
```bash
npm start
```
