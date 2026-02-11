-- ============================================
-- FASE 3: ETL - Transaccional → Data Warehouse (MySQL)
-- Equivalente al script PostgreSQL Fase 2
-- ============================================
USE dw_manager;

-- 3.1 Cargar dimensión producto (INSERT con ON DUPLICATE KEY UPDATE por id_fuente UNIQUE)
-- ============================================
INSERT INTO dim_producto (id_fuente, nombre, categoria)
SELECT
  p.id,
  TRIM(p.nombre),
  TRIM(COALESCE(c.nombre, 'Sin categoría'))
FROM productos p
LEFT JOIN categorias c ON p.categoria_id = c.id
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), categoria = VALUES(categoria);

INSERT INTO etl_log (proceso, registros_procesados, registros_exitosos, registros_fallidos, estado)
VALUES ('Carga Dim Producto', ROW_COUNT(), ROW_COUNT(), 0, 'EXITOSO');

-- 3.2 Dimensión tiempo (ya poblada en fase1 con INSERT rápido 2024-2025)
-- Si añades ventas con fechas fuera de ese rango, ejecuta: CALL poblar_dim_tiempo('aaaa-mm-dd', 'aaaa-mm-dd');

-- 3.3 Cargar tabla de hechos (incremental; ignora duplicados por UNIQUE)
-- ============================================
INSERT IGNORE INTO fact_ventas (sk_producto, sk_tiempo, sk_sucursal, cantidad, monto_total)
SELECT
  dp.sk_producto,
  dt.sk_tiempo,
  (FLOOR(1 + RAND() * 5)) AS sk_sucursal,
  v.cantidad,
  v.monto_total
FROM ventas v
JOIN dim_producto dp ON v.producto_id = dp.id_fuente
JOIN dim_tiempo dt ON DATE(v.fecha_venta) = dt.fecha;

INSERT INTO etl_log (proceso, registros_procesados, registros_exitosos, registros_fallidos, estado)
VALUES ('Carga Fact Ventas', ROW_COUNT(), ROW_COUNT(), 0, 'EXITOSO');

-- 3.4 Vistas (MySQL no tiene MATERIALIZED VIEW; usamos VIEW normales)
-- ============================================
DROP VIEW IF EXISTS v_ventas_categoria;
CREATE VIEW v_ventas_categoria AS
SELECT
  p.categoria,
  SUM(f.monto_total) AS total_ventas,
  SUM(f.cantidad) AS total_unidades,
  COUNT(DISTINCT f.sk_tiempo) AS dias_con_ventas,
  AVG(f.monto_total) AS promedio_venta
FROM fact_ventas f
JOIN dim_producto p ON f.sk_producto = p.sk_producto
GROUP BY p.categoria;

DROP VIEW IF EXISTS v_ventas_sucursal;
CREATE VIEW v_ventas_sucursal AS
SELECT
  s.nombre_sucursal,
  s.ciudad,
  s.region,
  SUM(f.monto_total) AS total_ventas,
  SUM(f.cantidad) AS total_unidades,
  COUNT(*) AS num_transacciones
FROM fact_ventas f
JOIN dim_sucursal s ON f.sk_sucursal = s.sk_sucursal
GROUP BY s.nombre_sucursal, s.ciudad, s.region;

DROP VIEW IF EXISTS v_ventas_periodo;
CREATE VIEW v_ventas_periodo AS
SELECT
  t.anio,
  t.trimestre,
  t.mes,
  t.nombre_mes,
  SUM(f.monto_total) AS total_ventas,
  SUM(f.cantidad) AS total_unidades,
  COUNT(DISTINCT f.sk_producto) AS productos_vendidos
FROM fact_ventas f
JOIN dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
GROUP BY t.anio, t.trimestre, t.mes, t.nombre_mes;

-- 3.5 Procedimiento "refrescar" (en MySQL las VIEWs ya están siempre actualizadas; aquí solo registramos)
-- ============================================
DELIMITER $$

DROP PROCEDURE IF EXISTS refrescar_vistas_materializadas$$

CREATE PROCEDURE refrescar_vistas_materializadas()
BEGIN
  INSERT INTO etl_log (proceso, registros_procesados, registros_exitosos, registros_fallidos, estado)
  VALUES ('Refresco vistas', 0, 0, 0, 'OK (vistas siempre actualizadas)');
END$$

DELIMITER ;

-- 3.6 Verificación
-- ============================================
SELECT proceso, registros_exitosos, fecha_ejecucion, estado
FROM etl_log
ORDER BY fecha_ejecucion DESC
LIMIT 10;

SELECT 'Productos en DW' AS tabla, COUNT(*) AS registros FROM dim_producto
UNION ALL SELECT 'Fechas en DW', COUNT(*) FROM dim_tiempo
UNION ALL SELECT 'Sucursales en DW', COUNT(*) FROM dim_sucursal
UNION ALL SELECT 'Hechos de Ventas', COUNT(*) FROM fact_ventas;
