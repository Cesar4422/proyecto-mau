#!/bin/bash
# Ejecuta en orden la estructura y datos MySQL para dw_manager.
# Uso: ./ejecutar_mysql.sh [usuario]   (por defecto: root)
# Ejemplo con contraseña: mysql -u root -p  (te pedirá la contraseña)

set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
USER="${1:-root}"
DB="dw_manager"

echo "=== 1. Schema (base + tablas) ==="
mysql -u "$USER" -p < "$DIR/schema-mysql.sql"

echo "=== 2. Fase 1: Dimensiones (sucursales, dim_tiempo) ==="
mysql -u "$USER" -p "$DB" < "$DIR/mysql-fase1-dimensiones.sql"

echo "=== 3. Fase 2: Datos de prueba (categorías, productos, ventas) ==="
mysql -u "$USER" -p "$DB" < "$DIR/mysql-fase2-datos-prueba.sql"

echo "=== 4. Fase 3: ETL (carga DW, vistas) ==="
mysql -u "$USER" -p "$DB" < "$DIR/mysql-fase3-etl.sql"

echo "=== 5. Usuario de prueba ==="
mysql -u "$USER" -p "$DB" < "$DIR/seed-usuario-prueba.sql"

echo ""
echo "Listo. Base: $DB | Usuario prueba: prueba@test.com / prueba123"
echo "Opcional: mysql ... dw_manager < mysql-datos-masivos-10k.sql  (10k ventas)"
