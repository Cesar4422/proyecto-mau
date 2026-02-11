# MySQL: Estructura y datos (dw_manager)

## Si la base está vacía

Desde la carpeta del proyecto (donde está `.env`), con MySQL en marcha:

```bash
cd sql
mysql -u root -p < schema-mysql.sql
mysql -u root -p dw_manager < mysql-fase1-dimensiones.sql
mysql -u root -p dw_manager < mysql-fase2-datos-prueba.sql
mysql -u root -p dw_manager < mysql-fase3-etl.sql
mysql -u root -p dw_manager < seed-usuario-prueba.sql
```

Usuario de prueba: **prueba@test.com** / **prueba123**

Si falta la tabla `etl_log`, créala con el bloque de `CREATE TABLE etl_log` que está en `schema-mysql.sql`. Si a `dim_tiempo` le faltan columnas (`dia`, `es_fin_de_semana`, `semana_del_anio`), añádelas con `ALTER TABLE dim_tiempo ADD COLUMN ...` antes de ejecutar fase1.

## Orden de ejecución (detalle)

Ejecutar en este orden (desde la carpeta `sql/` o con rutas absolutas):

| Orden | Archivo | Qué hace |
|-------|---------|----------|
| 1 | `schema-mysql.sql` | Crea la base `dw_manager`, tablas (usuarios, categorias, productos, ventas, movimientos, pedidos, reglas, dim_*, fact_ventas, etl_log) |
| 2 | `mysql-fase1-dimensiones.sql` | Inserta 5 sucursales, crea procedimiento `poblar_dim_tiempo`, puebla 2024-2025, crea índices |
| 3 | `mysql-fase2-datos-prueba.sql` | Inserta 12 categorías (IDs 1-12), 10 productos de ejemplo, 250 ventas de prueba (2024-2025) |
| 4 | `mysql-fase3-etl.sql` | Carga DW (dim_producto, fact_ventas), crea vistas v_ventas_categoria, v_ventas_sucursal, v_ventas_periodo |
| 5 | `seed-usuario-prueba.sql` | Usuario de prueba: `prueba@test.com` / `prueba123` (rol administrador) |

Opcional (más datos):

- `mysql-datos-masivos-10k.sql`: 15 categorías extra, 500 productos, 10.000 ventas (2023-2024) y ETL. Ejecutar **después** de los pasos 1-4 si quieres volumen grande.
- `mysql-fase4-olap.sql`: Solo consultas OLAP (roll-up, drill-down, slice, dice, KPIs). No inserta datos.

## Cómo ejecutar

Desde terminal (ajusta usuario y si usas contraseña):

```bash
cd "/home/yareth-gm/Documentos/examen data/sql"
mysql -u root -p < schema-mysql.sql
mysql -u root -p dw_manager < mysql-fase1-dimensiones.sql
mysql -u root -p dw_manager < mysql-fase2-datos-prueba.sql
mysql -u root -p dw_manager < mysql-fase3-etl.sql
mysql -u root -p dw_manager < seed-usuario-prueba.sql
```

O con el script (si existe):

```bash
./ejecutar_mysql.sh
```

## Estructura de tablas (resumen)

- **Transaccional:** `usuarios`, `categorias`, `productos`, `ventas`, `movimientos`, `pedidos`, `reglas_asignacion`
- **DW:** `dim_sucursal`, `dim_producto`, `dim_tiempo`, `fact_ventas`, `etl_log`
- **Vistas:** `v_ventas_categoria`, `v_ventas_sucursal`, `v_ventas_periodo`
