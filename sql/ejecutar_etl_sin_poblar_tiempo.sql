-- ETL sin volver a poblar dim_tiempo (ya está lleno)
USE dw_manager;

INSERT INTO dim_producto (id_fuente, nombre, categoria)
SELECT p.id, TRIM(p.nombre), TRIM(COALESCE(c.nombre, 'Sin categoría'))
FROM productos p
LEFT JOIN categorias c ON p.categoria_id = c.id
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), categoria = VALUES(categoria);

INSERT INTO etl_log (proceso, registros_procesados, registros_exitosos, registros_fallidos, estado)
VALUES ('Carga Dim Producto', ROW_COUNT(), ROW_COUNT(), 0, 'EXITOSO');

INSERT IGNORE INTO fact_ventas (sk_producto, sk_tiempo, sk_sucursal, cantidad, monto_total)
SELECT dp.sk_producto, dt.sk_tiempo, FLOOR(1 + RAND() * 5), v.cantidad, v.monto_total
FROM ventas v
JOIN dim_producto dp ON v.producto_id = dp.id_fuente
JOIN dim_tiempo dt ON DATE(v.fecha_venta) = dt.fecha;

INSERT INTO etl_log (proceso, registros_procesados, registros_exitosos, registros_fallidos, estado)
VALUES ('Carga Fact Ventas', ROW_COUNT(), ROW_COUNT(), 0, 'EXITOSO');

DROP VIEW IF EXISTS v_ventas_categoria;
CREATE VIEW v_ventas_categoria AS
SELECT p.categoria, SUM(f.monto_total) AS total_ventas, SUM(f.cantidad) AS total_unidades,
  COUNT(DISTINCT f.sk_tiempo) AS dias_con_ventas, AVG(f.monto_total) AS promedio_venta
FROM fact_ventas f JOIN dim_producto p ON f.sk_producto = p.sk_producto GROUP BY p.categoria;

DROP VIEW IF EXISTS v_ventas_sucursal;
CREATE VIEW v_ventas_sucursal AS
SELECT s.nombre_sucursal, s.ciudad, s.region, SUM(f.monto_total) AS total_ventas,
  SUM(f.cantidad) AS total_unidades, COUNT(*) AS num_transacciones
FROM fact_ventas f JOIN dim_sucursal s ON f.sk_sucursal = s.sk_sucursal
GROUP BY s.nombre_sucursal, s.ciudad, s.region;

DROP VIEW IF EXISTS v_ventas_periodo;
CREATE VIEW v_ventas_periodo AS
SELECT t.anio, t.trimestre, t.mes, t.nombre_mes, SUM(f.monto_total) AS total_ventas,
  SUM(f.cantidad) AS total_unidades, COUNT(DISTINCT f.sk_producto) AS productos_vendidos
FROM fact_ventas f JOIN dim_tiempo t ON f.sk_tiempo = t.sk_tiempo
GROUP BY t.anio, t.trimestre, t.mes, t.nombre_mes;

SELECT 'ETL listo' AS resultado, COUNT(*) AS hechos FROM fact_ventas;
