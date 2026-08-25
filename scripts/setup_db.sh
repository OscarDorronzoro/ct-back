#!/usr/bin/env bash

set -e

# Ir al directorio raíz del proyecto
cd "$(dirname "$0")/.."

# Cargar variables de entorno
if [ ! -f .env ]; then
    echo "Error: no se encontró el archivo .env"
    echo "Copie .env.example a .env y configure las variables necesarias."
    exit 1
fi

set -a
source .env
set +a

# Valores por defecto
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-cattle_tracker}"
DB_USER="${DB_USER:-app_user}"

echo "Configurando PostgreSQL..."
echo "  Host: $DB_HOST"
echo "  Puerto: $DB_PORT"
echo "  Base de datos: $DB_NAME"
echo "  Usuario: $DB_USER"
echo

# Verificar conexión al servidor PostgreSQL
if ! pg_isready -h "$DB_HOST" -p "$DB_PORT" > /dev/null 2>&1; then
    echo "Error: PostgreSQL no está disponible en $DB_HOST:$DB_PORT"
    exit 1
fi

# Crear usuario si no existe
if ! sudo -u postgres psql -tAc \
    "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then

    echo "Creando usuario '$DB_USER'..."

    sudo -u postgres psql \
    -v db_user="$DB_USER" \
    -v db_password="$DB_PASSWORD" \
    -c 'CREATE ROLE :"db_user" WITH LOGIN PASSWORD :'\'"db_password"\'';'
else
    echo "El usuario '$DB_USER' ya existe."
fi

# Crear base de datos si no existe
if ! sudo -u postgres psql -tAc \
    "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | grep -q 1; then

    echo "Creando base de datos '$DB_NAME'..."

    sudo -u postgres createdb \
        -O "$DB_USER" \
        "$DB_NAME"
else
    echo "La base de datos '$DB_NAME' ya existe."
fi

# Restaurar esquema
echo
echo "Restaurando esquema..."

sudo -u postgres psql \
    -d "$DB_NAME" \
    -f database/schema.sql

echo
echo "Base de datos configurada correctamente."
